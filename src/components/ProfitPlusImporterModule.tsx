import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { CurrencyMode } from './Navbar';
import { createImportBatch, saveBalanceEntries, getRecentBatches } from '../lib/services/importerService';
import { getCurrentUser } from '../lib/auth';
import type { ImportBatch } from '../lib/types';

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

// Columnas que puede usar Profit Plus (variantes de nombre)
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

function parseRows(rawData: Record<string, any>[], bcvRate: number): AccountEntry[] {
  return rawData
    .filter(row => {
      const code = String(pick(row, COL.code)).trim();
      return code.length > 0 && code !== 'undefined';
    })
    .map(row => {
      const code    = String(pick(row, COL.code)).trim();
      const name    = String(pick(row, COL.name) || '').trim();
      const initial = Number(pick(row, COL.initial)) || 0;
      const debit   = Number(pick(row, COL.debit))   || 0;
      const credit  = Number(pick(row, COL.credit))  || 0;
      const final   = Number(pick(row, COL.final))   || (initial + debit - credit);
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

  // Período del lote
  const now = new Date();
  const [fiscalYear, setFiscalYear]   = useState<number>(now.getFullYear());
  const [fiscalMonth, setFiscalMonth] = useState<number>(now.getMonth() + 1);
  const [weekNumber, setWeekNumber]   = useState<number | ''>('');

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
        const raw  = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

        if (!raw || raw.length === 0) {
          setParseError('La hoja de Excel está vacía o no tiene el formato correcto.');
          return;
        }

        const parsed = parseRows(raw, bcvRate);
        if (parsed.length === 0) {
          setParseError('No se encontraron cuentas válidas. Verifica que el Excel tenga columnas: Código, Nombre, Débito, Crédito.');
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
          week_number: weekNumber === '' ? undefined : weekNumber,
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
            <span>Módulo 1: Importador de Balances Profit Plus</span>
          </h2>
          <p className="text-xs text-slate-500">
            Importa el Balance de Comprobación directamente desde Excel y sincroniza con la base de datos.
          </p>
        </div>
        <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center space-x-1">
          <span className="material-symbols-outlined text-[16px]">table_view</span>
          <span>Solo Excel — .xlsx / .xls / .csv</span>
        </span>
      </div>

      {/* ── Período selector ─────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#5C3A21]">event</span>
          Período del Lote de Importación
        </p>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Año Fiscal</label>
            <select
              value={fiscalYear}
              onChange={e => setFiscalYear(Number(e.target.value))}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Mes</label>
            <select
              value={fiscalMonth}
              onChange={e => setFiscalMonth(Number(e.target.value))}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Semana (opcional)</label>
            <select
              value={weekNumber}
              onChange={e => setWeekNumber(e.target.value === '' ? '' : Number(e.target.value))}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
            >
              <option value="">— Mes completo —</option>
              {[1, 2, 3, 4, 5].map(w => <option key={w} value={w}>Semana {w}</option>)}
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
              <span className="text-xs text-slate-500 font-mono-num">{entries.length} cuentas · {MONTH_NAMES[fiscalMonth - 1]} {fiscalYear}{weekNumber ? ` · Sem ${weekNumber}` : ''}</span>
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
            {recentBatches.map(batch => (
              <div key={batch.id} className="px-4 py-3 flex items-center justify-between text-xs font-mono-num">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-900">{batch.file_name}</span>
                  <span className="text-slate-500">{MONTH_NAMES[(batch.fiscal_month ?? 1) - 1]} {batch.fiscal_year}{batch.week_number ? ` · Sem ${batch.week_number}` : ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">Bs. {Number(batch.total_debit).toLocaleString('es-VE', { maximumFractionDigits: 0 })}</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-sans border ${
                    batch.is_balanced
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {batch.is_balanced ? 'Cuadrado' : 'Desbalanceado'}
                  </span>
                  <span className="text-slate-400">{new Date(batch.created_at).toLocaleDateString('es-VE')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
