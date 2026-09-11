import React, { useState, useMemo, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import type { CurrencyMode } from './Navbar';
import { getPurchases, getSales, savePurchases, saveSales } from '../lib/services/cacaoService';
import type { PurchaseInput, SaleInput } from '../lib/services/cacaoService';
import type { CacaoPurchase, CacaoSale } from '../lib/types';

// ─────────────────────────────────────────────────────────────
// Helpers de parseo
// ─────────────────────────────────────────────────────────────

/** Convierte fecha DD/MM/YYYY o serial de Excel → YYYY-MM-DD */
const parseExcelDate = (val: any): string => {
  if (!val) return new Date().toISOString().split('T')[0];
  if (typeof val === 'number') {
    // Serial de Excel (días desde 1900-01-01)
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + val * 86400000);
    return d.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return str;
};

/** Calcula la semana ISO del año (1-53) para una fecha YYYY-MM-DD */
const getISOWeek = (dateStr: string): number => {
  const d = new Date(dateStr + 'T12:00:00');
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

/** Convierte un valor de celda (string europeo o número) a number */
const toNum = (val: any): number => {
  if (typeof val === 'number') return val;
  const str = String(val ?? '').trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
};

/** Detecta si una celda es un código de artículo (CAC200, CAC201, etc.) */
const isCacaoCode = (val: any): boolean =>
  /^CAC\d{3}/i.test(String(val ?? '').trim());

/** Detecta si una celda es un número de documento (5-10 dígitos numéricos) */
const isDocNumber = (val: any): boolean =>
  /^\d{5,10}$/.test(String(val ?? '').trim());

/** Detecta filas de Sub-Totales para ignorarlas */
const isSubtotalRow = (row: any[]): boolean =>
  row.some(cell => String(cell ?? '').trim().toLowerCase().startsWith('sub-total'));

// ─────────────────────────────────────────────────────────────
// Tipo unificado para previsualización
// ─────────────────────────────────────────────────────────────
interface ParsedRow {
  docNumber: string;
  lineNumber: number;
  issueDate: string;
  weekNumber: number;
  entityCode: string;   // proveedor o cliente
  salesmanCode: string; // solo ventas
  warehouseCode: string;
  articleCode: string;
  quantityKg: number;
  unitPriceBs: number;
  netAmountBs: number;
  unitPriceUsd: number;
  netAmountUsd: number;
}

// ─────────────────────────────────────────────────────────────
// Parser 1: Compras_Por_Articulo
// Formato: Número(0) Reng(1) Emisión(2) Proveedor(3) Almacén(4)
//          Cantidad(5) Unid(6) Costo Unita(7) Desc%(8) Neto(9)
// ─────────────────────────────────────────────────────────────
function parsePurchasesExcel(ws: XLSX.WorkSheet, bcvRate: number): ParsedRow[] | null {
  const rawAoA: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const rows: ParsedRow[] = [];
  let currentArticle = 'CAC200';

  for (const row of rawAoA) {
    if (!Array.isArray(row) || row.length < 5) continue;
    if (isSubtotalRow(row)) continue;

    if (isCacaoCode(row[0])) {
      // Fila de sección: "CAC200", "CAC201", etc.
      currentArticle = String(row[0]).trim().substring(0, 6).toUpperCase();
      continue;
    }
    if (!isDocNumber(row[0])) continue;

    const issueDate = parseExcelDate(row[2]);
    rows.push({
      docNumber:    String(row[0]).trim(),
      lineNumber:   Number(row[1] ?? 1),
      issueDate,
      weekNumber:   getISOWeek(issueDate),
      entityCode:   String(row[3] ?? '').trim(),
      salesmanCode: '',
      warehouseCode: String(row[4] ?? '').trim(),
      articleCode:  currentArticle,
      quantityKg:   toNum(row[5]),
      unitPriceBs:  toNum(row[7]),
      netAmountBs:  toNum(row[9]),
      unitPriceUsd: toNum(row[7]) / (bcvRate || 1),
      netAmountUsd: toNum(row[9]) / (bcvRate || 1),
    });
  }

  return rows.length > 0 ? rows : null;
}

// ─────────────────────────────────────────────────────────────
// Parser 2: Ventas_Por_Articulo
// Formato: Número(0) Reng(1) Emisión(2) Cliente(3) Vendedor(4)
//          Almacén(5) Cantidad(6) Unid(7) Precio Unitario(8) Desc%(9) Neto(10)
// ─────────────────────────────────────────────────────────────
function parseSalesExcel(ws: XLSX.WorkSheet, bcvRate: number): ParsedRow[] | null {
  const rawAoA: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const rows: ParsedRow[] = [];
  let currentArticle = 'CAC200';

  for (const row of rawAoA) {
    if (!Array.isArray(row) || row.length < 6) continue;
    if (isSubtotalRow(row)) continue;

    if (isCacaoCode(row[0])) {
      currentArticle = String(row[0]).trim().substring(0, 6).toUpperCase();
      continue;
    }
    if (!isDocNumber(row[0])) continue;

    const issueDate = parseExcelDate(row[2]);
    rows.push({
      docNumber:    String(row[0]).trim(),
      lineNumber:   Number(row[1] ?? 1),
      issueDate,
      weekNumber:   getISOWeek(issueDate),
      entityCode:   String(row[3] ?? '').trim(),
      salesmanCode: String(row[4] ?? '').trim(),
      warehouseCode: String(row[5] ?? '').trim(),
      articleCode:  currentArticle,
      quantityKg:   toNum(row[6]),
      unitPriceBs:  toNum(row[8]),
      netAmountBs:  toNum(row[10]),
      unitPriceUsd: toNum(row[8]) / (bcvRate || 1),
      netAmountUsd: toNum(row[10]) / (bcvRate || 1),
    });
  }

  return rows.length > 0 ? rows : null;
}

// ─────────────────────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────────────────────
type ImportStep = 'idle' | 'preview' | 'saving' | 'saved' | 'error';

interface CacaoTradeModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

export const CacaoTradeModule: React.FC<CacaoTradeModuleProps> = ({ currency, bcvRate }) => {
  const [tradeType, setTradeType] = useState<'Compras' | 'Ventas'>('Compras');
  const [codeFilter, setCodeFilter] = useState<'ALL' | 'CAC200' | 'CAC201'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [compras, setCompras]   = useState<CacaoPurchase[]>([]);
  const [ventas, setVentas]     = useState<CacaoSale[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  // Estado del flujo de importación
  const [importStep, setImportStep]     = useState<ImportStep>('idle');
  const [parsedRows, setParsedRows]     = useState<ParsedRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError]   = useState<string | null>(null);
  const [saveError, setSaveError]       = useState<string | null>(null);

  // ── Carga de datos ────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [purchasesData, salesData] = await Promise.all([
        getPurchases({ year: new Date().getFullYear() }),
        getSales({ year: new Date().getFullYear() }),
      ]);
      setCompras(purchasesData);
      setVentas(salesData);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Parsear Excel ─────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setImportError('Formato no soportado. Usa archivos .xlsx, .xls o .csv');
      setImportStep('error');
      return;
    }
    setImportError(null);
    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];

        const parsed = tradeType === 'Compras'
          ? parsePurchasesExcel(ws, bcvRate)
          : parseSalesExcel(ws, bcvRate);

        if (!parsed || parsed.length === 0) {
          setImportError(
            'No se encontraron registros válidos. Verifica que el archivo sea el reporte ' +
            `${tradeType}_Por_Articulo exportado desde el sistema.`
          );
          setImportStep('error');
          return;
        }

        setParsedRows(parsed);
        setImportStep('preview');
      } catch (err: any) {
        setImportError(`Error al leer el archivo: ${err.message}`);
        setImportStep('error');
      }
    };
    reader.readAsBinaryString(file);
  }, [bcvRate, tradeType]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── Guardar en Supabase ───────────────────────────────────
  const handleSaveImport = async () => {
    if (parsedRows.length === 0) return;
    setImportStep('saving');
    setSaveError(null);
    try {
      if (tradeType === 'Compras') {
        const rows: PurchaseInput[] = parsedRows.map(r => ({
          doc_number:    r.docNumber,
          line_number:   r.lineNumber,
          issue_date:    r.issueDate,
          week_number:   r.weekNumber,
          supplier_code: r.entityCode,
          warehouse_code: r.warehouseCode,
          article_code:  r.articleCode,
          quantity_kg:   r.quantityKg,
          unit_cost_bs:  r.unitPriceBs,
          net_amount_bs: r.netAmountBs,
          unit_cost_usd: r.unitPriceUsd,
          net_amount_usd: r.netAmountUsd,
        }));
        await savePurchases(rows);
      } else {
        const rows: SaleInput[] = parsedRows.map(r => ({
          doc_number:    r.docNumber,
          line_number:   r.lineNumber,
          issue_date:    r.issueDate,
          week_number:   r.weekNumber,
          customer_code: r.entityCode,
          salesman_code: r.salesmanCode || undefined,
          warehouse_code: r.warehouseCode,
          article_code:  r.articleCode,
          quantity_kg:   r.quantityKg,
          unit_price_bs: r.unitPriceBs,
          net_amount_bs: r.netAmountBs,
          unit_price_usd: r.unitPriceUsd,
          net_amount_usd: r.netAmountUsd,
        }));
        await saveSales(rows);
      }
      setImportStep('saved');
      await loadData();
    } catch (err: any) {
      setSaveError(err.message);
      setImportStep('error');
    }
  };

  const handleCancelImport = () => {
    setImportStep('idle');
    setParsedRows([]);
    setImportFileName('');
    setImportError(null);
  };

  // ── Adaptador para la tabla ───────────────────────────────
  const activeRecords = useMemo(() => {
    if (tradeType === 'Compras') {
      return compras.map(c => ({
        id: c.id,
        docNumber: c.doc_number,
        date: c.issue_date,
        entityName: c.supplier_code,
        articleCode: c.article_code ?? 'CAC200',
        articleName: c.article_code === 'CAC201' ? 'Cacao Fino Grado 1' : 'Cacao Corriente',
        warehouse: c.warehouse_code,
        weightKg: c.quantity_kg,
        unitCostUsd: c.unit_cost_usd ?? (c.unit_cost_bs / bcvRate),
        subtotalUsd: c.net_amount_usd ?? (c.net_amount_bs / bcvRate),
        week: `Sem ${c.week_number}`,
      }));
    }
    return ventas.map(v => ({
      id: v.id,
      docNumber: v.doc_number,
      date: v.issue_date,
      entityName: v.customer_code,
      articleCode: v.article_code ?? 'CAC200',
      articleName: v.article_code === 'CAC201' ? 'Cacao Fino Grado 1' : 'Cacao Corriente',
      warehouse: v.warehouse_code,
      weightKg: v.quantity_kg,
      unitCostUsd: v.unit_price_usd ?? (v.unit_price_bs / bcvRate),
      subtotalUsd: v.net_amount_usd ?? (v.net_amount_bs / bcvRate),
      week: `Sem ${v.week_number}`,
    }));
  }, [tradeType, compras, ventas, bcvRate]);

  const formatMoney = (usd: number) => {
    if (currency === 'VES') return `Bs. ${(usd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (currency === 'EUR') return `€ ${(usd * 0.92).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `$ ${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredRecords = useMemo(() =>
    activeRecords.filter(rec => {
      const matchCode = codeFilter === 'ALL' || rec.articleCode === codeFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        rec.entityName.toLowerCase().includes(q) ||
        rec.docNumber.toLowerCase().includes(q) ||
        rec.warehouse.toLowerCase().includes(q);
      return matchCode && matchSearch;
    }),
  [activeRecords, codeFilter, searchQuery]);

  // ── Agregados para KPIs ───────────────────────────────────
  const totalComprasKg  = useMemo(() => compras.reduce((a, c) => a + c.quantity_kg, 0), [compras]);
  const estimatedKg     = 80000;
  const totalComprasUsd = useMemo(() => compras.reduce((a, c) => a + (c.net_amount_usd ?? c.net_amount_bs / bcvRate), 0), [compras, bcvRate]);
  const avgCostUsd      = totalComprasKg > 0 ? totalComprasUsd / totalComprasKg : 0;

  const totalVentasKg   = useMemo(() => ventas.reduce((a, v) => a + v.quantity_kg, 0), [ventas]);
  const totalVentasUsd  = useMemo(() => ventas.reduce((a, v) => a + (v.net_amount_usd ?? v.net_amount_bs / bcvRate), 0), [ventas, bcvRate]);
  const avgPriceUsd     = totalVentasKg > 0 ? totalVentasUsd / totalVentasKg : 0;
  const marginPerKgUsd  = avgPriceUsd - avgCostUsd;
  const feeUsd          = marginPerKgUsd * totalVentasKg;

  // ── Resumen para preview ──────────────────────────────────
  const previewArticles = useMemo(() => Array.from(new Set(parsedRows.map(r => r.articleCode))), [parsedRows]);
  const previewTotalKg  = useMemo(() => parsedRows.reduce((a, r) => a + r.quantityKg, 0), [parsedRows]);
  const previewTotalBs  = useMemo(() => parsedRows.reduce((a, r) => a + r.netAmountBs, 0), [parsedRows]);

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#5C3A21]">scale</span>
            <span>Compras y Ventas de Cacao</span>
          </h2>
          <p className="text-xs text-slate-500">
            Ingesta masiva desde Reportes de Sistema (Artículos{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">CAC200</code> /{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">CAC201</code>).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl font-semibold text-xs border border-slate-300/60">
          {(['Compras', 'Ventas'] as const).map(type => (
            <button
              key={type}
              onClick={() => { setTradeType(type); handleCancelImport(); }}
              className={`px-4 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                tradeType === type ? 'bg-[#5C3A21] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {type === 'Compras' ? 'shopping_cart' : 'point_of_sale'}
              </span>
              <span>{type} de Grano</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Kilos Comprados vs Estimados
          </span>
          <div className="text-xl font-bold font-mono-num text-slate-900 mt-1">
            {(totalComprasKg / 1000).toFixed(2)}{' '}
            <span className="text-xs font-semibold text-slate-500">TM</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalComprasKg / estimatedKg) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">
            {totalComprasKg.toLocaleString()} KG de {estimatedKg.toLocaleString()} KG Est.
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Costo Prom. Ponderado Compra
          </span>
          <div className="text-xl font-bold font-mono-num text-emerald-700 mt-1">
            ${avgCostUsd.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-500">/ KG</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">
            {formatMoney(avgCostUsd)} / KG en Tasa BCV
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Precio Prom. Ponderado Venta
          </span>
          <div className="text-xl font-bold font-mono-num text-[#5C3A21] mt-1">
            ${avgPriceUsd.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-500">/ KG</span>
          </div>
          <span className="text-[11px] text-[#5C3A21] font-semibold mt-1 block">
            Contratos Nestlé / Exportación
          </span>
        </div>

        <div className="bg-amber-50/40 rounded-xl p-4 border border-amber-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            Margen Efectivo Preliminar
          </span>
          <div className="text-xl font-bold font-mono-num text-amber-900 mt-1">
            {formatMoney(feeUsd)}
          </div>
          <span className="text-[11px] text-amber-700 font-medium mt-1 block">
            Diferencial por KG: +${marginPerKgUsd.toFixed(2)} / KG
          </span>
        </div>
      </div>

      {/* ── Sección de Importación ─────────────────────────── */}
      {importStep === 'preview' ? (
        /* Vista Previa */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Cabecera del preview */}
          <div className="bg-emerald-50 border-b border-emerald-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[22px]">task_alt</span>
              <div>
                <p className="text-sm font-bold text-emerald-800">
                  {parsedRows.length} registros listos para importar
                </p>
                <p className="text-xs text-emerald-600 font-mono">
                  {importFileName}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {previewArticles.map(code => (
                <span key={code} className="bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  {code}
                </span>
              ))}
              <span className="bg-slate-100 border border-slate-200 text-slate-700 font-mono-num px-2 py-0.5 rounded">
                {previewTotalKg.toLocaleString('es-VE')} KG
              </span>
              <span className="bg-slate-100 border border-slate-200 text-slate-700 font-mono-num px-2 py-0.5 rounded">
                Bs. {previewTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Tabla de preview */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono-num">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2 px-3">Doc.</th>
                  <th className="py-2 px-3">Fecha</th>
                  <th className="py-2 px-3">Sem.</th>
                  <th className="py-2 px-3">{tradeType === 'Compras' ? 'Proveedor' : 'Cliente'}</th>
                  {tradeType === 'Ventas' && <th className="py-2 px-3">Vendedor</th>}
                  <th className="py-2 px-3">Artículo</th>
                  <th className="py-2 px-3">Almacén</th>
                  <th className="py-2 px-3 text-right">KG</th>
                  <th className="py-2 px-3 text-right">P. Unit. Bs</th>
                  <th className="py-2 px-3 text-right">Neto Bs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRows.slice(0, 15).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 font-bold text-slate-800">{row.docNumber}</td>
                    <td className="py-1.5 px-3 text-slate-500">{row.issueDate}</td>
                    <td className="py-1.5 px-3 text-slate-400">S{row.weekNumber}</td>
                    <td className="py-1.5 px-3 text-slate-700">{row.entityCode}</td>
                    {tradeType === 'Ventas' && (
                      <td className="py-1.5 px-3 text-slate-500">{row.salesmanCode}</td>
                    )}
                    <td className="py-1.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        row.articleCode !== 'CAC200'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {row.articleCode}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-slate-500">{row.warehouseCode}</td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-800">
                      {row.quantityKg.toLocaleString('es-VE')}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-500">
                      {row.unitPriceBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-[#5C3A21]">
                      {row.netAmountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 15 && (
              <p className="text-center text-xs text-slate-400 py-2 border-t border-slate-100">
                ... y {parsedRows.length - 15} registros más
              </p>
            )}
          </div>

          {/* Acciones del preview */}
          <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50/50">
            <button
              onClick={handleCancelImport}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveImport}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#5C3A21] hover:bg-[#432A18] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">cloud_upload</span>
              Confirmar Importación
            </button>
          </div>
        </div>

      ) : importStep === 'saving' ? (
        /* Guardando */
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-xs">
          <div className="w-10 h-10 border-[3px] border-[#5C3A21] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700 mt-4">
            Guardando {parsedRows.length} registros en Supabase...
          </p>
        </div>

      ) : importStep === 'saved' ? (
        /* Éxito */
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-600 text-[24px]">check_circle</span>
            <div>
              <p className="text-sm font-bold text-emerald-800">¡Importación exitosa!</p>
              <p className="text-xs text-emerald-600">
                {parsedRows.length} registros de {tradeType.toLowerCase()} guardados en la base de datos.
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelImport}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Importar otro
          </button>
        </div>

      ) : (
        /* Dropzone */
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative bg-white border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragOver ? 'border-[#5C3A21] bg-[#5C3A21]/5' : 'border-slate-300 hover:border-[#8B5A2B]'
          }`}
        >
          <input
            id="cacao-file-input"
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
                Arrastra tu reporte de {tradeType} de Cacao aquí
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

          {importStep === 'error' && importError && (
            <div className="mt-4 text-xs text-red-600 font-semibold flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {importError}
            </div>
          )}
        </div>
      )}

      {/* ── Tabla de Registros ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <span className="material-symbols-outlined text-slate-600">table_rows</span>
              <span>Libro de Ingesta Operativa ({tradeType})</span>
            </h3>
            <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              {(['ALL', 'CAC200', 'CAC201'] as const).map(code => (
                <button
                  key={code}
                  onClick={() => setCodeFilter(code)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    codeFilter === code ? 'bg-[#5C3A21] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {code === 'ALL' ? 'Todos' : code === 'CAC200' ? 'CAC200 (Corriente)' : 'CAC201 (Fino)'}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Buscar por doc, cliente o almacén..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5C3A21] w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 font-mono-num">
                <th className="py-2.5 px-3">Semana</th>
                <th className="py-2.5 px-3">Nro. Documento</th>
                <th className="py-2.5 px-3">Fecha Emisión</th>
                <th className="py-2.5 px-3">{tradeType === 'Compras' ? 'Proveedor' : 'Cliente'}</th>
                <th className="py-2.5 px-3">Código / Rubro</th>
                <th className="py-2.5 px-3">Almacén</th>
                <th className="py-2.5 px-3 text-right">Cantidad (KG)</th>
                <th className="py-2.5 px-3 text-right">Costo/Precio Unit.</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono-num text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10">
                    <div className="w-6 h-6 border-2 border-[#5C3A21] border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400 font-sans">
                    No hay registros coincidentes para {tradeType}.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-500">{item.week}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{item.docNumber}</td>
                    <td className="py-2 px-3 text-slate-500">{item.date}</td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-900">{item.entityName}</td>
                    <td className="py-2 px-3 font-sans">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.articleCode !== 'CAC200'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {item.articleCode} - {item.articleName}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{item.warehouse}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {item.weightKg.toLocaleString('es-VE')} KG
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      ${item.unitCostUsd.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-[#5C3A21]">
                      {formatMoney(item.subtotalUsd)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Error de guardado ─────────────────────────────── */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-sm text-red-700">
          <span className="material-symbols-outlined text-red-500 text-[20px]">error</span>
          <span>Error al guardar en Supabase: <span className="font-mono text-xs">{saveError}</span></span>
        </div>
      )}
    </div>
  );
};
