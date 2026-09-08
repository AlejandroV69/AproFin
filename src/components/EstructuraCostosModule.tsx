import React, { useState, useMemo } from 'react';
import type { CurrencyMode } from './Navbar';

// ─── Data Types ───────────────────────────────────────────────────────────────
interface MonthlyData {
  ene: number; feb: number; mar: number; abr: number;
  may: number; jun: number; jul: number; ago: number;
  sep: number; oct: number; nov: number; dic: number;
}

interface CostLine {
  id: string;
  nombre: string;
  nivel: 0 | 1 | 2;
  fy2025: number;
  meses: MonthlyData;
  fy2026?: number; // if override needed
}

// ─── Static Data — Estructura de Costos Aprocao (Nestlé Venezuela, S.A.) ─────
const COSTO_VARIABLE: CostLine[] = [
  {
    id: 'fletes', nombre: 'Fletes', nivel: 1, fy2025: 225987,
    meses: { ene: 20500, feb: 36707, mar: 40302, abr: 0, may: 15137, jun: 20192,
              jul: 14241, ago: 14413, sep: 14928, oct: 15832, nov: 31893, dic: 23082 },
  },
  {
    id: 'otrosCostos', nombre: 'Otros gastos variables', nivel: 1, fy2025: 15468,
    meses: { ene: 4010, feb: 2600, mar: 4016, abr: 0, may: 1209, jun: 4427,
              jul: 3016, ago: 2261, sep: 3016, oct: 5615, nov: 8777, dic: 15090 },
  },
  {
    id: 'impuestos', nombre: 'Impuestos', nivel: 1, fy2025: 538243,
    meses: { ene: 57740, feb: 58727, mar: 25388, abr: 13769, may: 18248, jun: 29234,
              jul: 21444, ago: 11093, sep: 17828, oct: 22771, nov: 42180, dic: 30548 },
  },
];

const COSTO_FIJO: CostLine[] = [
  {
    id: 'masaSalarial', nombre: 'Masa Salarial', nivel: 1, fy2025: 228829,
    meses: { ene: 30247, feb: 14766, mar: 19429, abr: 24957, may: 22123, jun: 21181,
              jul: 21530, ago: 20535, sep: 42772, oct: 21320, nov: 21321, dic: 49919 },
  },
  {
    id: 'gastosViajes', nombre: 'Gastos de Viajes', nivel: 1, fy2025: 36636,
    meses: { ene: 1980, feb: 6377, mar: 4179, abr: 8136, may: 1767, jun: 3177,
              jul: 3146, ago: 3197, sep: 3744, oct: 1146, nov: 3102, dic: 3103 },
  },
  {
    id: 'serviciosTerceros', nombre: 'Servicios de Terceros', nivel: 1, fy2025: 117489,
    meses: { ene: 10282, feb: 11510, mar: 5791, abr: 10431, may: 14989, jun: 6624,
              jul: 10610, ago: 11879, sep: 13625, oct: 5279, nov: 9483, dic: 13285 },
  },
  {
    id: 'bolsaSalarial', nombre: 'Comisiones Bolsa Salarial', nivel: 1, fy2025: 1151,
    meses: { ene: 0, feb: 0, mar: 0, abr: 0, may: 0, jun: 0,
              jul: 0, ago: 0, sep: 0, oct: 0, nov: 0, dic: 0 },
  },
  {
    id: 'infraestructura', nombre: 'Gastos de Infraestructura', nivel: 1, fy2025: 148086,
    meses: { ene: 20789, feb: 22965, mar: 19570, abr: 20223, may: 18688, jun: 16269,
              jul: 16519, ago: 9870, sep: 16349, oct: 18874, nov: 16963, dic: 18848 },
  },
  {
    id: 'gastosBancarios', nombre: 'Gastos Bancarios', nivel: 1, fy2025: 109257,
    meses: { ene: 13161, feb: 9654, mar: 4317, abr: 3389, may: 1392, jun: 4310,
              jul: 2938, ago: 1808, sep: 6702, oct: 7005, nov: 11178, dic: 7095 },
  },
];

// Operational metrics (toneladas, FEE, valorización)
const OPERACIONES = {
  ton: { fy2025: 2666, meses: { ene: 413, feb: 527, mar: 261, abr: 133, may: 212, jun: 190, jul: 68, ago: 68, sep: 800, oct: 200, nov: 400, dic: 200 } },
  valorizacionKUSD: { fy2025: 21845, meses: { ene: 2805, feb: 2556, mar: 995, abr: 302, may: 615, jun: 948, jul: 872, ago: 558, sep: 1148, oct: 1931, nov: 1951, dic: 570 } },
  feeMensualUsdKg: { fy2025: 0.57, meses: { ene: 0.39, feb: 0.50, mar: 0.51, abr: 1.05, may: 0.50, jun: 0.50, jul: 1.50, ago: 1.11, sep: 0.41, oct: 1.40, nov: 0.52, dic: 0.41 } },
  impuestoNns: { fy2025: 2, meses: { ene: 2, feb: 2, mar: 2, abr: 3, may: 4, jun: 8, jul: 8, ago: 8, sep: 5, oct: 3, nov: 3, dic: 5 } },
  ppromHabaWise: { fy2025: 8.12, meses: { ene: 0.80, feb: 4.85, mar: 5.13, abr: 4.52, may: 5.58, jun: 4.52, jul: 4.48, ago: 4.40, sep: 4.29, oct: 4.63, nov: 4.29, dic: 4.50 } },
  ppromHabaWfse: { fy2025: 8.69, meses: { ene: 7.19, feb: 7.19, mar: 5.13, abr: 4.52, may: 5.06, jun: 4.52, jul: 5.11, ago: 5.28, sep: 4.81, oct: 4.63, nov: 4.63, dic: 4.84 } },
  feeCHabaTotal: { fy2025: 7, meses: { ene: 7, feb: 5, mar: 6, abr: 12, may: 21, jun: 14, jul: 10, ago: 10, sep: 18, oct: 26, nov: 11, dic: 7 } },
};

const OPERACIONES_ESPECIALES = [
  { id: 'interDivisas', nombre: 'Intermediación / Retiro de Divisas' },
  { id: 'restructuring', nombre: 'Restructuring' },
  { id: 'diferenciales', nombre: 'Diferenciales cambiarios' },
  { id: 'galpones', nombre: 'Reparación Galpones' },
  { id: 'divisaTerceros', nombre: 'Operaciones de Divisa a terceros' },
];

const MESES_KEYS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;
const MESES_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const CURRENT_MONTH_IDX = 7; // August (0-indexed)

type MesKey = typeof MESES_KEYS[number];

const sumMes = (d: MonthlyData) => MESES_KEYS.reduce((a, k) => a + d[k], 0);
const ytd = (d: MonthlyData, thru = CURRENT_MONTH_IDX) => MESES_KEYS.slice(0, thru + 1).reduce((a, k) => a + d[k], 0);
const ytg = (d: MonthlyData, from = CURRENT_MONTH_IDX + 1) => MESES_KEYS.slice(from).reduce((a, k) => a + d[k], 0);

interface EstructuraCostosProps {
  currency: CurrencyMode;
  bcvRate: number;
}

const fmtN = (v: number, dec = 0) =>
  v === 0 ? '–' : v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`;

export const EstructuraCostosModule: React.FC<EstructuraCostosProps> = ({ currency, bcvRate }) => {
  const [visibleRange, setVisibleRange] = useState<'all' | 'ytd' | 'ytg'>('all');
  const [showPct, setShowPct] = useState(true);
  const [highlightMonth, setHighlightMonth] = useState<number>(CURRENT_MONTH_IDX);

  // Which month columns to show
  const visibleMeses = useMemo(() => {
    if (visibleRange === 'ytd') return MESES_KEYS.slice(0, CURRENT_MONTH_IDX + 1);
    if (visibleRange === 'ytg') return MESES_KEYS.slice(CURRENT_MONTH_IDX + 1);
    return MESES_KEYS;
  }, [visibleRange]);

  const convert = (usd: number) => {
    if (currency === 'VES') return usd * bcvRate;
    if (currency === 'EUR') return usd * 0.92;
    return usd;
  };

  // Totals
  const cvLines = COSTO_VARIABLE;
  const cfLines = COSTO_FIJO;

  const totalCV = useMemo(() => ({
    fy2025: cvLines.reduce((a, l) => a + l.fy2025, 0),
    meses: MESES_KEYS.reduce((acc, k) => ({ ...acc, [k]: cvLines.reduce((a, l) => a + l.meses[k], 0) }), {} as MonthlyData),
  }), []);

  const totalCF = useMemo(() => ({
    fy2025: cfLines.reduce((a, l) => a + l.fy2025, 0),
    meses: MESES_KEYS.reduce((acc, k) => ({ ...acc, [k]: cfLines.reduce((a, l) => a + l.meses[k], 0) }), {} as MonthlyData),
  }), []);

  const totalCostos = useMemo(() => ({
    fy2025: totalCV.fy2025 + totalCF.fy2025,
    meses: MESES_KEYS.reduce((acc, k) => ({ ...acc, [k]: totalCV.meses[k] + totalCF.meses[k] }), {} as MonthlyData),
  }), []);

  const renderRow = (
    line: { id: string; nombre: string; nivel: number; fy2025: number; meses: MonthlyData },
    isTotal = false,
    isSuperTotal = false,
  ) => {
    const fy2026Est = sumMes(line.meses);
    const ytdVal = ytd(line.meses);
    const ytgVal = ytg(line.meses);
    const varVs = fy2026Est - line.fy2025;
    const varPct = line.fy2025 !== 0 ? (varVs / line.fy2025) * 100 : 0;
    const totalForPct = isSuperTotal ? 1 : totalCostos.fy2025;
    const pct2025 = totalForPct > 0 ? (line.fy2025 / totalForPct) * 100 : 0;
    const pct2026 = totalForPct > 0 ? (fy2026Est / (sumMes(totalCostos.meses))) * 100 : 0;

    const bg = isSuperTotal
      ? 'bg-[#1e3a5f] text-white'
      : isTotal
      ? 'bg-slate-700 text-white'
      : line.nivel === 0
      ? 'bg-slate-100 text-slate-900'
      : 'hover:bg-slate-50 text-slate-800';

    return (
      <tr key={line.id} className={`border-b border-slate-200 ${bg} transition-colors`}>
        {/* Nombre */}
        <td className={`py-1.5 px-3 text-[11px] sticky left-0 z-10 font-sans ${
          isSuperTotal ? 'font-bold text-white bg-[#1e3a5f]' :
          isTotal ? 'font-bold text-white bg-slate-700' :
          'bg-white'
        } ${line.nivel === 1 ? 'pl-5' : ''}`}>
          {line.nombre}
        </td>

        {/* FY 2025 */}
        <td className={`py-1.5 px-2 text-right text-[11px] font-mono-num ${isSuperTotal || isTotal ? 'font-bold text-amber-300' : 'text-slate-700'}`}>
          {fmtN(convert(line.fy2025))}
        </td>

        {/* Monthly columns */}
        {visibleMeses.map((k, idx) => {
          const val = line.meses[k];
          const realIdx = MESES_KEYS.indexOf(k);
          const isHL = realIdx === highlightMonth;
          return (
            <td
              key={k}
              className={`py-1.5 px-2 text-right text-[11px] font-mono-num cursor-pointer transition-colors
                ${isHL ? 'bg-amber-100/70' : ''}
                ${isSuperTotal || isTotal ? 'font-bold' : ''}
                ${val === 0 ? 'text-slate-400' : isSuperTotal ? 'text-amber-200' : isTotal ? 'text-white' : 'text-slate-800'}
              `}
              onClick={() => setHighlightMonth(realIdx)}
            >
              {val === 0 ? '–' : fmtN(convert(val))}
            </td>
          );
        })}

        {/* YTD 2026 */}
        <td className={`py-1.5 px-2 text-right text-[11px] font-mono-num font-semibold border-l border-slate-300 ${isSuperTotal || isTotal ? 'text-amber-200' : 'text-[#8B5A2B]'}`}>
          {fmtN(convert(ytdVal))}
        </td>

        {/* YTG 2026 */}
        <td className={`py-1.5 px-2 text-right text-[11px] font-mono-num ${isSuperTotal || isTotal ? 'text-slate-300' : 'text-slate-600'}`}>
          {fmtN(convert(ytgVal))}
        </td>

        {/* FY 2026 */}
        <td className={`py-1.5 px-2 text-right text-[11px] font-mono-num font-bold border-l border-slate-300 ${isSuperTotal || isTotal ? 'text-amber-300' : 'text-slate-900'}`}>
          {fmtN(convert(fy2026Est))}
        </td>

        {/* Var vs FY 2026 */}
        <td className={`py-1.5 px-2 text-right text-[11px] font-mono-num font-semibold ${varVs < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
          {varVs !== 0 ? fmtPct(varPct) : '–'}
        </td>

        {/* % Partic. FY 2025 */}
        {showPct && (
          <td className={`py-1.5 px-2 text-right text-[11px] font-mono-num ${isSuperTotal ? 'text-white' : 'text-slate-500'}`}>
            {pct2025 > 0 ? `${pct2025.toFixed(0)}%` : '–'}
          </td>
        )}

        {/* % Partic. FY 2026 */}
        {showPct && (
          <td className={`py-1.5 px-2 text-right text-[11px] font-mono-num ${isSuperTotal ? 'text-white' : 'text-slate-500'}`}>
            {pct2026 > 0 ? `${pct2026.toFixed(0)}%` : '–'}
          </td>
        )}
      </tr>
    );
  };

  const renderMetricRow = (
    label: string,
    data: { meses: Record<string, number>; fy2025: number },
    dec = 0,
    colorFn?: (v: number) => string,
  ) => {
    const fy2026est = MESES_KEYS.reduce((a, k) => a + (data.meses[k] || 0), 0) / 12 *
      (CURRENT_MONTH_IDX < 11 ? 1 : 1); // rough average for non-totals
    return (
      <tr key={label} className="border-b border-slate-200 hover:bg-slate-50">
        <td className="py-1.5 px-3 text-[11px] font-sans font-semibold text-slate-700 bg-white sticky left-0 z-10">{label}</td>
        <td className="py-1.5 px-2 text-right text-[11px] font-mono-num text-slate-700">{fmtN(data.fy2025, dec)}</td>
        {visibleMeses.map(k => {
          const val = data.meses[k] ?? 0;
          const realIdx = MESES_KEYS.indexOf(k);
          const isHL = realIdx === highlightMonth;
          return (
            <td key={k} onClick={() => setHighlightMonth(realIdx)}
              className={`py-1.5 px-2 text-right text-[11px] font-mono-num cursor-pointer ${isHL ? 'bg-amber-100/70' : ''} ${colorFn ? colorFn(val) : 'text-slate-800'}`}>
              {val === 0 ? '–' : fmtN(val, dec)}
            </td>
          );
        })}
        <td className="py-1.5 px-2 text-right text-[11px] font-mono-num text-[#8B5A2B] font-semibold border-l border-slate-300">
          {fmtN(MESES_KEYS.slice(0, CURRENT_MONTH_IDX + 1).reduce((a, k) => a + (data.meses[k] ?? 0), 0) / (CURRENT_MONTH_IDX + 1), dec)}
        </td>
        <td className="py-1.5 px-2 text-right text-[11px] font-mono-num text-slate-500">
          {fmtN(MESES_KEYS.slice(CURRENT_MONTH_IDX + 1).reduce((a, k) => a + (data.meses[k] ?? 0), 0) / (12 - CURRENT_MONTH_IDX - 1), dec)}
        </td>
        <td className="py-1.5 px-2 text-right text-[11px] font-mono-num text-slate-800 border-l border-slate-300 font-bold">
          {fmtN(MESES_KEYS.reduce((a, k) => a + (data.meses[k] ?? 0), 0) / 12, dec)}
        </td>
        <td />{showPct && <td />}{showPct && <td />}
      </tr>
    );
  };

  const cvTon = MESES_KEYS.reduce((acc, k) => ({
    ...acc,
    [k]: OPERACIONES.ton.meses[k] > 0 ? Math.round(totalCV.meses[k] / OPERACIONES.ton.meses[k]) : 0
  }), {} as Record<string, number>);

  const cfTon = MESES_KEYS.reduce((acc, k) => ({
    ...acc,
    [k]: OPERACIONES.ton.meses[k] > 0 ? Math.round(totalCF.meses[k] / OPERACIONES.ton.meses[k]) : 0
  }), {} as Record<string, number>);

  const ctTon = MESES_KEYS.reduce((acc, k) => ({
    ...acc,
    [k]: OPERACIONES.ton.meses[k] > 0 ? Math.round(totalCostos.meses[k] / OPERACIONES.ton.meses[k]) : 0
  }), {} as Record<string, number>);

  // ── Column header ──
  const colHeaders = [
    <th key="nombre" className="py-2.5 px-3 text-left text-[10px] font-bold uppercase tracking-wider sticky left-0 z-20 bg-slate-800 min-w-[200px]">Tipo de Gasto</th>,
    <th key="fy2025" className="py-2.5 px-2 text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">FY 2025</th>,
    ...visibleMeses.map(k => {
      const idx = MESES_KEYS.indexOf(k);
      return (
        <th key={k} onClick={() => setHighlightMonth(idx)}
          className={`py-2.5 px-2 text-right text-[10px] font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap transition-colors ${
            idx === highlightMonth ? 'bg-amber-700/80 text-amber-100' : ''
          } ${idx <= CURRENT_MONTH_IDX ? '' : 'text-slate-400'}`}>
          {MESES_LABELS[idx].slice(0, 3)}
        </th>
      );
    }),
    <th key="ytd" className="py-2.5 px-2 text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border-l border-slate-600 text-amber-400">YTD 2026</th>,
    <th key="ytg" className="py-2.5 px-2 text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap text-slate-400">YTG 2026</th>,
    <th key="fy2026" className="py-2.5 px-2 text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border-l border-slate-600">FY 2026</th>,
    <th key="var" className="py-2.5 px-2 text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Var vs 25</th>,
    ...(showPct ? [
      <th key="pct25" className="py-2.5 px-2 text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap text-slate-400">% FY25</th>,
      <th key="pct26" className="py-2.5 px-2 text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap text-slate-400">% FY26</th>,
    ] : []),
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Nestlé Venezuela, S.A.</div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8B5A2B]">factory</span>
            Estructura de Costos Aprocao
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            FY 2025 vs FY 2026 • Valores expresados en USD • YTD: Ene–Ago | YTG: Sep–Dic
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Range Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            {([
              { key: 'all', label: 'Todo el año' },
              { key: 'ytd', label: 'YTD (Ene–Ago)' },
              { key: 'ytg', label: 'YTG (Sep–Dic)' },
            ] as const).map(v => (
              <button key={v.key} onClick={() => setVisibleRange(v.key)}
                className={`px-3 py-1.5 rounded-md transition-all ${visibleRange === v.key ? 'bg-[#8B5A2B] text-white shadow-xs' : 'text-slate-600'}`}>
                {v.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowPct(!showPct)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${showPct ? 'bg-[#8B5A2B] text-white border-[#8B5A2B]' : 'bg-white text-slate-700 border-slate-200'}`}>
            % Participación
          </button>
        </div>
      </div>

      {/* KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Costo Total FY 2026 Est.', value: `$${(sumMes(totalCostos.meses) / 1000).toFixed(0)}K`, sub: `FY 2025: $${(totalCostos.fy2025 / 1000).toFixed(0)}K`, color: 'text-slate-900' },
          { label: 'YTD Ago (8 meses)', value: `$${(ytd(totalCostos.meses) / 1000).toFixed(0)}K`, sub: `${((ytd(totalCostos.meses) / sumMes(totalCostos.meses)) * 100).toFixed(0)}% del FY`, color: 'text-[#8B5A2B]' },
          { label: 'Costo Variable / FY 2026', value: `$${(sumMes(totalCV.meses) / 1000).toFixed(0)}K`, sub: `${((sumMes(totalCV.meses) / sumMes(totalCostos.meses)) * 100).toFixed(0)}% del total`, color: 'text-blue-800' },
          { label: 'Costo Fijo / FY 2026', value: `$${(sumMes(totalCF.meses) / 1000).toFixed(0)}K`, sub: `${((sumMes(totalCF.meses) / sumMes(totalCostos.meses)) * 100).toFixed(0)}% del total`, color: 'text-slate-700' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{k.label}</span>
            <div className={`text-lg font-bold font-mono-num mt-1 ${k.color}`}>{k.value}</div>
            <span className="text-[11px] text-slate-500 font-mono-num">{k.sub}</span>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Column group labels */}
            <thead>
              <tr className="bg-slate-900 text-white">
                <th colSpan={2} className="py-1.5 px-3 text-[10px] font-bold text-left sticky left-0 bg-slate-900 z-20 uppercase tracking-wider border-r border-slate-700">
                  CUENTAS DE COSTOS Y GASTOS
                </th>
                <th colSpan={visibleMeses.length} className="py-1.5 px-2 text-center text-[10px] font-bold uppercase tracking-wider border-r border-slate-700">
                  2026
                </th>
                <th colSpan={3} className="py-1.5 px-2 text-center text-[10px] font-bold uppercase tracking-wider border-r border-slate-700">
                  ANÁLISIS ANUAL
                </th>
                <th colSpan={showPct ? 3 : 1} className="py-1.5 px-2 text-center text-[10px] font-bold uppercase tracking-wider">
                  VARIACIÓN
                </th>
              </tr>
              <tr className="bg-slate-800 text-white">{colHeaders}</tr>
            </thead>

            <tbody>
              {/* COSTO VARIABLE */}
              <tr className="bg-blue-900 text-white">
                <td colSpan={2 + visibleMeses.length + 3 + (showPct ? 2 : 0) + 1}
                  className="py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider sticky left-0 bg-blue-900 z-10">
                  COSTO VARIABLE
                </td>
              </tr>
              {cvLines.map(l => renderRow(l))}
              {renderRow({ ...totalCV, id: 'totalCV', nombre: 'Total Costo Variable', nivel: 0 } as any, true)}

              {/* COSTO FIJO */}
              <tr className="bg-slate-900 text-white border-t-2 border-[#8B5A2B]">
                <td colSpan={2 + visibleMeses.length + 3 + (showPct ? 2 : 0) + 1}
                  className="py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider sticky left-0 bg-slate-900 z-10">
                  COSTO FIJO
                </td>
              </tr>
              {cfLines.map(l => renderRow(l))}
              {renderRow({ ...totalCF, id: 'totalCF', nombre: 'Total Costo Fijo', nivel: 0 } as any, true)}

              {/* COSTO TOTAL */}
              {renderRow({ ...totalCostos, id: 'costoTotal', nombre: 'Costo Total', nivel: 0 } as any, false, true)}

              {/* OPERATIONAL SECTION */}
              <tr className="bg-[#8B5A2B] text-white border-t-2 border-amber-400">
                <td colSpan={2 + visibleMeses.length + 3 + (showPct ? 2 : 0) + 1}
                  className="py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider sticky left-0 bg-[#8B5A2B] z-10">
                  INDICADORES OPERACIONALES
                </td>
              </tr>
              {renderMetricRow('TON', OPERACIONES.ton, 0)}
              {renderMetricRow('Valorización habas KUSD', OPERACIONES.valorizacionKUSD, 0)}
              {renderMetricRow('Fee mensual (USD/Kg)', OPERACIONES.feeMensualUsdKg, 2,
                (v) => v >= 1.0 ? 'text-emerald-700 font-bold' : v >= 0.5 ? 'text-amber-700' : 'text-slate-700')}
              {renderMetricRow('Impuesto / NNS (%)', OPERACIONES.impuestoNns, 0)}
              {renderMetricRow('P. Prom. haba wise ($)', OPERACIONES.ppromHabaWise, 2)}
              {renderMetricRow('P. Prom. haba wfse ($)', OPERACIONES.ppromHabaWfse, 2)}
              {renderMetricRow('Fee / C. Haba Total (%)', OPERACIONES.feeCHabaTotal, 0,
                (v) => v >= 15 ? 'text-emerald-700 font-bold' : 'text-slate-700')}

              {/* COST / TON Section */}
              <tr className="bg-slate-700 text-white border-t border-slate-600">
                <td colSpan={2 + visibleMeses.length + 3 + (showPct ? 2 : 0) + 1}
                  className="py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider sticky left-0 bg-slate-700 z-10">
                  COSTO / TONELADA
                </td>
              </tr>
              {renderMetricRow('CV x TON ($)', { meses: cvTon, fy2025: 334 }, 0, (v) => v > 400 ? 'text-red-600' : 'text-emerald-700')}
              {renderMetricRow('CF x TON ($)', { meses: cfTon, fy2025: 240 }, 0)}
              {renderMetricRow('CT x TON ($)', { meses: ctTon, fy2025: 574 }, 0)}

              {/* SPECIAL OPERATIONS */}
              <tr className="bg-slate-100 border-t border-slate-300">
                <td colSpan={2 + visibleMeses.length + 3 + (showPct ? 2 : 0) + 1}
                  className="py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-700 sticky left-0 bg-slate-100 z-10">
                  OPERACIONES ESPECIALES
                </td>
              </tr>
              {OPERACIONES_ESPECIALES.map(op => (
                <tr key={op.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-1.5 px-5 text-[11px] text-slate-600 font-sans bg-white sticky left-0 z-10">{op.nombre}</td>
                  <td className="py-1.5 px-2 text-right text-[11px] font-mono-num text-slate-400">0</td>
                  {visibleMeses.map(k => <td key={k} className="py-1.5 px-2 text-right text-[11px] font-mono-num text-slate-300">–</td>)}
                  <td className="py-1.5 px-2 text-right text-[11px] border-l border-slate-200 text-slate-300">–</td>
                  <td className="py-1.5 px-2 text-right text-[11px] text-slate-300">–</td>
                  <td className="py-1.5 px-2 text-right text-[11px] font-bold text-red-500 border-l border-slate-200">#DIV/0!</td>
                  <td className="py-1.5 px-2 text-right text-[11px] text-red-400">#DIV/0!</td>
                  {showPct && <td /> }{showPct && <td />}
                </tr>
              ))}

              {/* Movilizaciones */}
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="py-1.5 px-3 text-[11px] font-semibold text-slate-700 font-sans bg-slate-50 sticky left-0 z-10">Movilizaciones de Cacao (Tons)</td>
                <td className="py-1.5 px-2 text-right text-[11px] font-mono-num text-slate-600">0</td>
                {visibleMeses.map(k => {
                  const idx = MESES_KEYS.indexOf(k);
                  const val = [0, 241, 482, 500, 0, 180, 100, 168, 146, 0, 0, 0][idx] || 0;
                  return <td key={k} className="py-1.5 px-2 text-right text-[11px] font-mono-num text-slate-700">{val || '–'}</td>;
                })}
                <td className="py-1.5 px-2 border-l border-slate-200 text-right text-[11px] font-mono-num text-[#8B5A2B] font-bold">
                  {[241, 482, 500, 0, 180, 100, 168, 146].reduce((a, v) => a + v, 0)}
                </td>
                <td className="py-1.5 px-2 text-right text-[11px] text-slate-500">0</td>
                <td className="py-1.5 px-2 text-right text-[11px] font-bold border-l border-slate-200">
                  {[241, 482, 500, 0, 180, 100, 168, 146].reduce((a, v) => a + v, 0)}
                </td>
                <td />{showPct && <td />}{showPct && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
