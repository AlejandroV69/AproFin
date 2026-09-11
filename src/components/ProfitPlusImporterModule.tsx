import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { CurrencyMode } from './Navbar';
import { createImportBatch, saveBalanceEntries, getRecentBatches, getBatchEntries } from '../lib/services/importerService';
import { getCurrentUser } from '../lib/auth';
import type { ImportBatch, ProfitBalance } from '../lib/types';

// ─────────────────────────────────────────────────────────
// Tipos internos de previsualización
// ─────────────────────────────────────────────────────────
interface AccountEntry {
  code: string;
  name: string;
  initialBalance: number;
  debitVes: number;
  creditVes: number;
  finalBalance: number;
  netUsd: number;
  status: 'Válido' | 'Revisar';
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/** Normaliza texto quitando tildes, espacios extra y convirtiendo a minúsculas */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toNum(v: any): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  // Manejar formato venezolano con coma decimal: "1.234,56" -> 1234.56
  const s = String(v).replace(/\./g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

/** Detecta si una fila es de totales/agrupación (debe ser excluida) */
function isTotalRow(cellText: string): boolean {
  const n = normalize(cellText);
  return (
    n.startsWith('total') ||
    n.startsWith('subtotal') ||
    n === '' ||
    n === 'undefined'
  );
}

/** Determina si un string parece un código contable (ej: "11102.003", "1.1.1.01") */
function looksLikeAccountCode(s: string): boolean {
  return /^\d[\d.]+$/.test(s.trim());
}

// ─────────────────────────────────────────────────────────
// Parser 1: Estado de Situación Financiera (formato Profit Plus real)
// ─────────────────────────────────────────────────────────
function parseFinancialStatement(
  worksheet: any,
  XLSX: any,
  bcvRate: number
): AccountEntry[] | null {
  // raw: true para obtener números reales de Excel (no strings formateados)
  const rawAoA: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (!rawAoA || rawAoA.length === 0) return null;

  // ── DEBUG: imprimir primeras 10 filas en consola para diagnóstico ──
  console.group('[AproFin] Profit Plus parser — primeras 10 filas:');
  rawAoA.slice(0, 10).forEach((row, i) => {
    console.log(`Fila ${i}:`, row);
  });
  console.groupEnd();

  // ── 1. Encontrar la fila de encabezados ─────────────────
  let headerRowIdx = -1;
  let colCuenta    = -1;  // Columna con código (bajo "Cuenta Contable")
  let colNombre    = -1;  // Columna con nombre (colCuenta+1 por celda combinada)
  let colSaldo     = -1;  // Columna "Saldo Inicial"
  let colFinal     = -1;  // Columna "Saldo a la fecha" (puede estar en fila anterior)

  for (let i = 0; i < Math.min(rawAoA.length, 25); i++) {
    const row = rawAoA[i];
    if (!row || row.length === 0) continue;

    const rowNorm = row.map((c: any) => normalize(String(c ?? '')));

    // Buscar fila que contenga "Cuenta Contable"
    const cuentaIdx = rowNorm.findIndex(
      (c: string) => c.includes('cuenta contable') || c === 'cuenta'
    );
    if (cuentaIdx === -1) continue;

    // Encontrada — esta es la fila de encabezados
    headerRowIdx = i;
    colCuenta    = cuentaIdx;

    // "Saldo Inicial" o cualquier "saldo..." que NO sea "saldo a la fecha"
    colSaldo = rowNorm.findIndex(
      (c: string) => c.startsWith('saldo') && !c.includes('a la fecha')
    );

    // "Saldo a la fecha" — buscar primero en esta fila, luego en filas anteriores
    colFinal = rowNorm.findIndex((c: string) => c.startsWith('saldo a la fecha'));
    if (colFinal === -1) {
      for (let j = Math.max(0, i - 5); j < i; j++) {
        const prevRow = rawAoA[j];
        if (!prevRow) continue;
        const prevNorm = prevRow.map((c: any) => normalize(String(c ?? '')));
        const fi = prevNorm.findIndex((c: string) => c.startsWith('saldo a la fecha'));
        if (fi !== -1) { colFinal = fi; break; }
      }
    }

    // Columna de nombre: col siguiente si está vacía en el header (celda combinada)
    const nextIdx = cuentaIdx + 1;
    if (nextIdx < rowNorm.length) {
      const nextNorm = rowNorm[nextIdx];
      if (nextNorm === '' || nextNorm === 'nombre' || nextNorm === 'descripcion') {
        colNombre = nextIdx;
      }
    }

    console.log('[AproFin] Header encontrado en fila', i, { colCuenta, colNombre, colSaldo, colFinal, headerRow: row });
    break;
  }

  if (headerRowIdx === -1) {
    console.warn('[AproFin] No se encontró fila de encabezados en el Excel.');
    return null;
  }

  // ── 2. Auto-detectar columna de código en filas de datos ────────────────
  // (el merged header "Cuenta Contable" puede estar en col 0 pero los datos
  // reales podrían estar en col 0, 1, 2... dependiendo de la versión de Profit Plus)
  let detectedCodeCol = colCuenta; // default: col 0
  let detectedNameCol = colNombre; // default: col 1

  const saldoCeiling = colSaldo >= 0 ? colSaldo : 7; // límite máximo de búsqueda

  for (let i = headerRowIdx + 1; i < Math.min(rawAoA.length, headerRowIdx + 60); i++) {
    const row = rawAoA[i];
    if (!row) continue;
    // Buscar en las columnas 0 hasta saldoCeiling-1 cuál tiene un código contable
    for (let c = 0; c < saldoCeiling; c++) {
      const val = String(row[c] ?? '').trim();
      if (looksLikeAccountCode(val) && val.includes('.')) {
        // Encontrado un código válido con punto (ej: "11102.003")
        detectedCodeCol = c;
        // La columna de nombre: siguiente col no vacía
        for (let n = c + 1; n < saldoCeiling; n++) {
          const nameVal = String(row[n] ?? '').trim();
          if (nameVal !== '' && !looksLikeAccountCode(nameVal)) {
            detectedNameCol = n;
            break;
          }
        }
        break;
      }
    }
    if (detectedCodeCol !== colCuenta) break; // ya encontró columnas reales
  }

  // ── 3. Procesar filas de datos ────────────────────────────
  const entries: AccountEntry[] = [];

  for (let i = headerRowIdx + 1; i < rawAoA.length; i++) {
    const row = rawAoA[i];
    if (!row || row.every((c: any) => c === '' || c === null || c === undefined)) continue;

    const cellCode = String(row[detectedCodeCol] ?? '').trim();
    const cellName = detectedNameCol >= 0 ? String(row[detectedNameCol] ?? '').trim() : '';

    let code = '';
    let name = '';

    if (looksLikeAccountCode(cellCode) && cellCode.includes('.') && cellName !== '') {
      // Código con punto (cuenta hoja) y nombre en col adyacente
      code = cellCode; name = cellName;
    } else if (looksLikeAccountCode(cellCode) && cellCode.includes('.')) {
      // Código con punto pero nombre vacío → intentar col siguiente
      const nextName = String(row[detectedCodeCol + 1] ?? '').trim();
      if (nextName !== '') { code = cellCode; name = nextName; }
      else continue;
    } else {
      // Intentar split "11102.003  BANCO BANESCO" en una sola celda
      const spaceMatch = cellCode.match(/^([\d.]+\.[\d]+)\s+(.+)$/);
      if (spaceMatch) {
        code = spaceMatch[1].trim(); name = spaceMatch[2].trim();
      } else {
        continue; // No tiene código válido con punto
      }
    }

    if (!looksLikeAccountCode(code) || !code.includes('.')) continue;
    if (isTotalRow(name)) continue;

    const initialBalance = colSaldo >= 0 ? toNum(row[colSaldo]) : 0;
    const finalBalance   = colFinal >= 0 && colFinal !== colSaldo
      ? toNum(row[colFinal])
      : initialBalance;

    entries.push({
      code, name, initialBalance,
      debitVes:  0,
      creditVes: 0,
      finalBalance,
      netUsd: finalBalance / (bcvRate || 1),
      status: 'Válido',
    });
  }

  return entries.length > 0 ? entries : null;
}


// ─────────────────────────────────────────────────────────
// Parser 2: Balance de Comprobación clásico (columnas fijas)
// ─────────────────────────────────────────────────────────
const COL = {
  code:    ['Codigo', 'Código', 'CODIGO', 'CÓDIGO', 'Cod', 'CÓD', 'Account Code'],
  name:    ['Cuenta', 'Nombre', 'CUENTA', 'NOMBRE', 'Description', 'Account Name'],
  initial: ['Saldo Inicial', 'SaldoInicial', 'Inicial', 'Initial Balance'],
  debit:   ['Debito', 'Débito', 'DEBITO', 'DÉBITO', 'Debe', 'Debit'],
  credit:  ['Credito', 'Crédito', 'CREDITO', 'CRÉDITO', 'Haber', 'Credit'],
  final:   ['Saldo Final', 'SaldoFinal', 'Final', 'Final Balance', 'Saldo'],
};

function pick(row: Record<string, any>, keys: string[]): number | string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return '';
}

function parseTrialBalance(rawData: Record<string, any>[], bcvRate: number): AccountEntry[] {
  return rawData
    .filter(row => {
      const code = String(pick(row, COL.code)).trim();
      return code.length > 0 && code !== 'undefined' && looksLikeAccountCode(code);
    })
    .map(row => {
      const code    = String(pick(row, COL.code)).trim();
      const name    = String(pick(row, COL.name) || '').trim();
      const initial = toNum(pick(row, COL.initial));
      const debit   = toNum(pick(row, COL.debit));
      const credit  = toNum(pick(row, COL.credit));
      const final   = toNum(pick(row, COL.final)) || (initial + debit - credit);
      const netUsd  = (debit - credit) / bcvRate;
      const status: AccountEntry['status'] =
        debit < 0 || credit < 0 ? 'Revisar' : 'Válido';

      return { code, name, initialBalance: initial, debitVes: debit, creditVes: credit, finalBalance: final, netUsd, status };
    });
}

// ─────────────────────────────────────────────────────────
// Estado del flujo de importación
// ─────────────────────────────────────────────────────────
type FlowStep = 'idle' | 'preview' | 'saving' | 'saved' | 'error';

interface ProfitPlusImporterModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

export const ProfitPlusImporterModule: React.FC<ProfitPlusImporterModuleProps> = ({ currency, bcvRate }) => {
  const [step, setStep]         = useState<FlowStep>('idle');
  const [entries, setEntries]   = useState<AccountEntry[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [savedBatch, setSavedBatch] = useState<ImportBatch | null>(null);
  const [recentBatches, setRecentBatches] = useState<ImportBatch[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Estado para desplegar cuentas de un lote importado
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<ProfitBalance[]>([]);
  const [isLoadingBatch, setIsLoadingBatch]   = useState<boolean>(false);

  const handleToggleExpandBatch = async (batchId: string) => {
    if (expandedBatchId === batchId) {
      setExpandedBatchId(null);
      setExpandedEntries([]);
      return;
    }

    setExpandedBatchId(batchId);
    setIsLoadingBatch(true);
    try {
      const batchRows = await getBatchEntries(batchId);
      setExpandedEntries(batchRows);
    } catch (err) {
      console.error('Error al cargar cuentas del lote:', err);
      setExpandedEntries([]);
    } finally {
      setIsLoadingBatch(false);
    }
  };

  // Período del lote — selecciones manuales mediante desplegables
  const now = new Date();
  const [fiscalYear, setFiscalYear]   = useState<number>(now.getFullYear());
  const [fiscalMonth, setFiscalMonth] = useState<number>(now.getMonth() + 1);
  const [weekOfMonth, setWeekOfMonth] = useState<number | ''>(1); // 1-5 o ''

  /** Calcula la semana ISO del año (1-52) */
  const getISOWeek = (d: Date): number => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  /** Mapea (Año, Mes, Semana del Mes 1-5) a Semana ISO del Año (1-52) */
  const weekOfMonthToISOWeek = (year: number, month: number, wom: number): number => {
    const firstDayOfWeek = (wom - 1) * 7 + 1;
    return getISOWeek(new Date(year, month - 1, firstDayOfWeek));
  };

  // Semana del año (1-52) — estado directo seleccionable por el usuario
  const [isoWeekOfYear, setIsoWeekOfYear] = useState<number | ''>(
    weekOfMonthToISOWeek(now.getFullYear(), now.getMonth() + 1, 1)
  );

  // Al cambiar Año, Mes o Semana del mes, recalcular la Semana del año si no fue ajustada manualmente
  const handleWeekOfMonthChange = (wom: number | '') => {
    setWeekOfMonth(wom);
    if (wom !== '') {
      setIsoWeekOfYear(weekOfMonthToISOWeek(fiscalYear, fiscalMonth, wom));
    } else {
      setIsoWeekOfYear('');
    }
  };

  const handleMonthChange = (month: number) => {
    setFiscalMonth(month);
    if (weekOfMonth !== '') {
      setIsoWeekOfYear(weekOfMonthToISOWeek(fiscalYear, month, weekOfMonth));
    }
  };

  const handleYearChange = (year: number) => {
    setFiscalYear(year);
    if (weekOfMonth !== '') {
      setIsoWeekOfYear(weekOfMonthToISOWeek(year, fiscalMonth, weekOfMonth));
    }
  };

  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  useEffect(() => {
    getRecentBatches(5).then(setRecentBatches).catch(() => {});
  }, [savedBatch]);

  // ─── Parsear Excel ───────────────────────────────────
  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setParseError('Formato no soportado. Usa archivos .xlsx, .xls o .csv');
      return;
    }

    setParseError(null);
    setFileName(file.name);
    setStep('idle');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb   = XLSX.read(bstr, { type: 'binary' });
        const ws   = wb.Sheets[wb.SheetNames[0]];

        // ── Intento 1: Estado de Situación Financiera (formato real Profit Plus) ──
        let parsed = parseFinancialStatement(ws, XLSX, bcvRate);

        // ── Intento 2: Balance de Comprobación clásico (columnas fijas) ──
        if (!parsed || parsed.length === 0) {
          const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
          if (raw && raw.length > 0) {
            parsed = parseTrialBalance(raw, bcvRate);
          }
        }

        if (!parsed || parsed.length === 0) {
          setParseError(
            'No se encontraron cuentas contables válidas. ' +
            'El archivo debe ser un Estado de Situación Financiera o Balance de Comprobación exportado desde Profit Plus.'
          );
          return;
        }

        setEntries(parsed);
        setStep('preview');
      } catch (err: any) {
        setParseError(`Error al leer el archivo: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  }, [bcvRate]);


  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ─── Guardar en Supabase ─────────────────────────────
  const handleIntegrate = async () => {
    if (entries.length === 0) return;
    setStep('saving');
    setSaveError(null);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('No hay sesión activa. Recarga la página.');

      const totalDebit  = entries.reduce((s, e) => s + e.debitVes, 0);
      const totalCredit = entries.reduce((s, e) => s + e.creditVes, 0);

      const batch = await createImportBatch(
        {
          source_type: 'PROFIT_BALANCE',
          file_name:   fileName,
          fiscal_year: fiscalYear,
          fiscal_month: fiscalMonth,
          week_number: isoWeekOfYear ?? undefined,
          total_debit:  totalDebit,
          total_credit: totalCredit,
        },
        user.id
      );

      await saveBalanceEntries(
        batch.id,
        entries.map(e => ({
          account_code:     e.code || undefined,
          account_name_raw: e.name,
          initial_balance:  e.initialBalance,
          debit:            e.debitVes,
          credit:           e.creditVes,
          final_balance:    e.finalBalance,
        }))
      );

      setSavedBatch(batch);
      setStep('saved');
    } catch (err: any) {
      setSaveError(err.message);
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('idle');
    setEntries([]);
    setFileName('');
    setParseError(null);
    setSaveError(null);
    setSavedBatch(null);
  };

  // ─── Derivados ───────────────────────────────────────
  const totalDebitVes  = entries.reduce((s, e) => s + e.debitVes, 0);
  const totalCreditVes = entries.reduce((s, e) => s + e.creditVes, 0);
  const isBalanced     = Math.abs(totalDebitVes - totalCreditVes) < 0.01;
  const invalidCount   = entries.filter(e => e.status === 'Revisar').length;

  const formatMoney = (usd: number) => {
    if (currency === 'VES') return `Bs. ${(usd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
    if (currency === 'EUR') return `€ ${(usd * 0.92).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`;
    return `$ ${usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  // ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#5C3A21]">upload_file</span>
            <span>Gastos Pagados y Balances Contables</span>
          </h2>
          <p className="text-xs text-slate-500">
            Importa el Balance de Comprobación directamente desde Excel y sincroniza con la base de datos.
          </p>
        </div>
      </div>

      {/* ── Período del lote ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#5C3A21]">event</span>
          Período del Balance
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {/* Desplegable Año */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Año</label>
            <select
              value={fiscalYear}
              onChange={e => handleYearChange(Number(e.target.value))}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
            >
              {[2024, 2025, 2026, 2027].map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Desplegable Mes */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Mes</label>
            <select
              value={fiscalMonth}
              onChange={e => handleMonthChange(Number(e.target.value))}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>

          {/* Desplegable Semana del Mes (1-5) */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Semana del Mes</label>
            <select
              value={weekOfMonth}
              onChange={e => handleWeekOfMonthChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
            >
              <option value="">— Sin semana —</option>
              {[1, 2, 3, 4, 5].map(w => (
                <option key={w} value={w}>Semana {w}</option>
              ))}
            </select>
          </div>

          {/* Desplegable Semana del Año (1-52) */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-[#5C3A21] uppercase font-bold">Semana del Año</label>
            <select
              value={isoWeekOfYear}
              onChange={e => setIsoWeekOfYear(e.target.value === '' ? '' : Number(e.target.value))}
              className="text-xs bg-[#5C3A21]/5 border border-[#5C3A21]/30 rounded-lg px-2.5 py-1.5 font-bold text-[#5C3A21] focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
            >
              <option value="">— Sin semana —</option>
              {Array.from({ length: 53 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>Semana {w} del año</option>
              ))}
            </select>
          </div>
        </div>
      </div>


      {/* ── Dropzone ─────────────────────────────────── */}
      {step === 'idle' || step === 'error' ? (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative bg-white rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            isDragOver ? 'border-[#5C3A21] bg-[#5C3A21]/5' : 'border-slate-300 hover:border-[#8B5A2B]'
          }`}
        >
          <input
            id="excel-file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="space-y-3 pointer-events-none">
            <div className="w-14 h-14 rounded-2xl bg-[#8B5A2B]/10 text-[#8B5A2B] mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">
                Arrastra tu Balance de Comprobación aquí
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Formatos soportados: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono-num text-slate-700">.xlsx</code>{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded font-mono-num text-slate-700">.xls</code>{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded font-mono-num text-slate-700">.csv</code>
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-[#5C3A21] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xs pointer-events-auto cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">file_open</span>
              Seleccionar Archivo Excel
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Error de parseo ───────────────────────────── */}
      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 flex items-start gap-2">
          <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">error</span>
          <div>
            <p className="font-bold">Error al procesar el archivo</p>
            <p>{parseError}</p>
          </div>
        </div>
      )}

      {/* ── Error de guardado ─────────────────────────── */}
      {step === 'error' && saveError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 flex items-start gap-2">
          <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">cloud_off</span>
          <div>
            <p className="font-bold">Error al guardar en Supabase</p>
            <p>{saveError}</p>
          </div>
        </div>
      )}

      {/* ── Éxito ────────────────────────────────────── */}
      {step === 'saved' && savedBatch && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-emerald-600 text-[28px]">check_circle</span>
            <div>
              <p className="text-sm font-bold text-emerald-800">¡Importación completada exitosamente!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Lote <code className="font-mono-num bg-emerald-100 px-1 rounded">{savedBatch.id.slice(0, 8)}…</code> creado.{' '}
                {entries.length} cuentas guardadas en Supabase.{' '}
                {savedBatch.is_balanced ? '✅ Balance cuadrado.' : '⚠️ Balance desbalanceado, revisar.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex-shrink-0 text-xs font-bold text-emerald-700 hover:text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Nueva importación
          </button>
        </div>
      )}

      {/* ── Previsualización ─────────────────────────── */}
      {(step === 'preview' || step === 'saving' || step === 'saved') && entries.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 font-mono-num text-xs">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-sans font-bold block">ARCHIVO</span>
                <span className="text-slate-800 font-bold text-sm truncate max-w-48 block">{fileName}</span>
              </div>
              <span className="text-slate-200">|</span>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-sans font-bold block">TOTAL DÉBITOS (VES)</span>
                <span className="text-slate-900 font-bold text-sm">Bs. {totalDebitVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
              </div>
              <span className="text-slate-200">|</span>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-sans font-bold block">EQUIVALENTE USD (BCV)</span>
                <span className="text-[#8B5A2B] font-bold text-sm">{formatMoney(totalDebitVes / bcvRate)}</span>
              </div>
              <span className="text-slate-200">|</span>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-sans font-bold block">CUENTAS</span>
                <span className="text-slate-800 font-bold text-sm">{entries.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Balance status badge */}
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center space-x-1 font-sans ${
                isBalanced
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <span className="material-symbols-outlined text-[18px]">{isBalanced ? 'verified' : 'warning'}</span>
                <span>{isBalanced ? 'Balance Cuadrado' : `Desbalanceado Bs. ${Math.abs(totalDebitVes - totalCreditVes).toLocaleString('es-VE', { maximumFractionDigits: 0 })}`}</span>
              </span>

              {invalidCount > 0 && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-amber-50 text-amber-700 border-amber-200 font-sans flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">flag</span>
                  {invalidCount} a revisar
                </span>
              )}

              {/* Reset button */}
              {step !== 'saving' && step !== 'saved' && (
                <button
                  onClick={handleReset}
                  className="h-9 px-3 border border-slate-300 text-slate-600 hover:text-slate-900 font-sans text-xs font-bold rounded-lg flex items-center gap-1 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  Cancelar
                </button>
              )}

              {/* Integrate button */}
              {step === 'preview' && (
                <button
                  id="integrate-btn"
                  onClick={handleIntegrate}
                  className="h-9 px-4 bg-[#8B5A2B] hover:bg-[#6F4315] text-white font-sans text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                  <span>Integrar a APRONFIN</span>
                </button>
              )}

              {step === 'saving' && (
                <span className="h-9 px-4 bg-[#8B5A2B]/60 text-white font-sans text-xs font-bold rounded-lg flex items-center space-x-1.5">
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  <span>Guardando…</span>
                </span>
              )}
            </div>
          </div>

          {/* Preview table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">Previsualización — Mapeo Contable</h3>
              <span className="text-xs text-slate-500 font-mono-num">{entries.length} cuentas · {MONTH_NAMES[fiscalMonth - 1]} {fiscalYear}{weekOfMonth !== '' ? ` · Sem ${weekOfMonth} del mes (Sem ${isoWeekOfYear} del año)` : ''}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 font-mono-num">
                    <th className="py-2.5 px-3">Código Cuenta</th>
                    <th className="py-2.5 px-3">Nombre de Cuenta Contable</th>
                    <th className="py-2.5 px-3 text-right">Saldo Inicial</th>
                    <th className="py-2.5 px-3 text-right">Débitos VES</th>
                    <th className="py-2.5 px-3 text-right">Créditos VES</th>
                    <th className="py-2.5 px-3 text-right">Saldo Final</th>
                    <th className="py-2.5 px-3 text-right">Neto USD (BCV)</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-mono-num text-slate-800">
                  {entries.map((item, idx) => (
                    <tr key={`${item.code}-${idx}`} className={`hover:bg-slate-50 transition-colors ${item.status === 'Revisar' ? 'bg-amber-50/50' : ''}`}>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.code}</td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-900 max-w-xs truncate">{item.name}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        Bs. {item.initialBalance.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        Bs. {item.debitVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        Bs. {item.creditVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        Bs. {item.finalBalance.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#8B5A2B]">{formatMoney(item.netUsd)}</td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'Válido'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-xs font-mono-num border-t-2 border-slate-300">
                    <td colSpan={3} className="py-2.5 px-3 font-sans text-slate-700">TOTALES</td>
                    <td className="py-2.5 px-3 text-right text-slate-900">
                      Bs. {totalDebitVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900">
                      Bs. {totalCreditVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2} className="py-2.5 px-3 text-right text-[#8B5A2B]">
                      {formatMoney(totalDebitVes / bcvRate)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-sans ${isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {isBalanced ? 'OK' : 'ERROR'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Historial de lotes recientes ─────────────── */}
      {recentBatches.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-slate-500">history</span>
              Historial de Importaciones Recientes
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentBatches.map(batch => {
              const isExpanded = expandedBatchId === batch.id;
              return (
                <div key={batch.id} className="transition-colors">
                  <div className="px-4 py-3 flex items-center justify-between text-xs font-mono-num hover:bg-slate-50/70">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px] text-[#8B5A2B]">description</span>
                      <span className="font-bold text-slate-900">{batch.file_name}</span>
                      <span className="text-slate-500 font-sans">
                        {MONTH_NAMES[(batch.fiscal_month ?? 1) - 1]} {batch.fiscal_year}
                        {batch.week_number ? ` · Sem ${batch.week_number}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">
                        Bs. {Number(batch.total_debit).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                      </span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-sans border ${
                        batch.is_balanced
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {batch.is_balanced ? 'Cuadrado' : 'Desbalanceado'}
                      </span>
                      <span className="text-slate-400">{new Date(batch.created_at).toLocaleDateString('es-VE')}</span>

                      <button
                        onClick={() => handleToggleExpandBatch(batch.id)}
                        className={`px-3 py-1 rounded-lg border text-[11px] font-sans font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          isExpanded
                            ? 'bg-[#8B5A2B] text-white border-[#8B5A2B]'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-[#8B5A2B] hover:text-[#8B5A2B]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {isExpanded ? 'unfold_less' : 'unfold_more'}
                        </span>
                        <span>{isExpanded ? 'Ocultar Cuentas' : 'Desplegar Cuentas'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Vista desplegada con el desglose de cuentas del lote */}
                  {isExpanded && (
                    <div className="bg-slate-50/90 p-4 border-t border-b border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-[#8B5A2B]">table_view</span>
                          <h4 className="text-xs font-bold text-slate-800 font-sans">
                            Cuentas Contables Registradas ({batch.file_name})
                          </h4>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono-num font-semibold">
                          {isLoadingBatch ? 'Cargando...' : `${expandedEntries.length} cuentas en base de datos`}
                        </span>
                      </div>

                      {isLoadingBatch ? (
                        <div className="text-center py-6">
                          <div className="w-5 h-5 border-2 border-[#8B5A2B] border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-xs text-slate-500 mt-2 font-sans">Cargando desglose de cuentas del lote...</p>
                        </div>
                      ) : expandedEntries.length === 0 ? (
                        <p className="text-center py-4 text-xs text-slate-400 font-sans">
                          No se encontraron detalles de cuentas registradas para este lote.
                        </p>
                      ) : (
                        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <table className="w-full text-left border-collapse text-xs font-mono-num">
                            <thead>
                              <tr className="bg-slate-100/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                <th className="py-2 px-3">Código Cuenta</th>
                                <th className="py-2 px-3">Nombre de Cuenta Contable</th>
                                <th className="py-2 px-3 text-right">Saldo Inicial</th>
                                <th className="py-2 px-3 text-right">Débitos VES</th>
                                <th className="py-2 px-3 text-right">Créditos VES</th>
                                <th className="py-2 px-3 text-right">Saldo Final</th>
                                <th className="py-2 px-3 text-right">Neto USD (BCV)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {expandedEntries.map((e) => (
                                <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2 px-3 font-bold text-slate-900">{e.account_code ?? '-'}</td>
                                  <td className="py-2 px-3 text-slate-800 font-sans font-medium">{e.account_name_raw}</td>
                                  <td className="py-2 px-3 text-right text-slate-500">
                                    Bs. {Number(e.initial_balance ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                                    Bs. {Number(e.debit).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-600">
                                    Bs. {Number(e.credit).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 px-3 text-right font-bold text-[#8B5A2B]">
                                    Bs. {Number(e.final_balance).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 px-3 text-right font-bold text-slate-700">
                                    {formatMoney(Number(e.final_balance) / bcvRate)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
