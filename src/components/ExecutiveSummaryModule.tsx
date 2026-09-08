import React, { useState } from 'react';
import type { CurrencyMode } from './Navbar';

interface BudgetLine {
  tipo: string;
  presupInicialUsd: number;
  presupActualUsd: number;
  ejecutadoUsd: number;
  relevant?: boolean;
  highlight?: boolean;
}

interface BudgetGroup {
  name: string;
  color: string;
  bgColor: string;
  lines: BudgetLine[];
}

// ── Data matching Resumen Excel exactly ──────────────────────────────────────
const MONTHS = ['Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const SELECTED_MONTH = 'Ago';

const ESTIMACION_COMPRA = { kg_inicial: 250, kg_actual: 100, kg_ejecutado: 68 };
const FEE_ESTIMADO = { inicial: 0.50, actual: 0.99, ejecutado: 1.10 };

const COSTO_VARIABLE_GROUPS: BudgetGroup[] = [
  {
    name: 'Costo Variable',
    color: 'text-blue-800',
    bgColor: 'bg-blue-50',
    lines: [
      { tipo: 'Fletes', presupInicialUsd: 18218, presupActualUsd: 18218, ejecutadoUsd: 14413, relevant: true },
      { tipo: 'Otros gastos variables', presupInicialUsd: 8973, presupActualUsd: 4358, ejecutadoUsd: 2261, relevant: false },
      { tipo: 'Impuestos', presupInicialUsd: 43602, presupActualUsd: 20586, ejecutadoUsd: 11093, relevant: true },
      { tipo: 'Total Costo Variable', presupInicialUsd: 70793, presupActualUsd: 43162, ejecutadoUsd: 27767, highlight: true },
    ],
  },
];

const COSTO_FIJO_GROUPS: BudgetGroup[] = [
  {
    name: 'Costo Fijo',
    color: 'text-slate-800',
    bgColor: 'bg-slate-50',
    lines: [
      { tipo: 'Masa Salarial', presupInicialUsd: 21010, presupActualUsd: 21320, ejecutadoUsd: 20534, relevant: false },
      { tipo: 'Gastos de Viajes', presupInicialUsd: 3097, presupActualUsd: 3097, ejecutadoUsd: 3197, relevant: false },
      { tipo: 'Servicios de Terceros', presupInicialUsd: 7415, presupActualUsd: 9422, ejecutadoUsd: 11879, relevant: false },
      { tipo: 'Gastos de Infraestructura', presupInicialUsd: 12965, presupActualUsd: 16172, ejecutadoUsd: 9870, relevant: false },
      { tipo: 'Gastos Financieros', presupInicialUsd: 10840, presupActualUsd: 5526, ejecutadoUsd: 1808, relevant: false },
      { tipo: 'Total Costo Fijo', presupInicialUsd: 55327, presupActualUsd: 55537, ejecutadoUsd: 47288, highlight: true },
    ],
  },
];

const GRAND_TOTAL: BudgetLine = {
  tipo: 'Costo Total', presupInicialUsd: 126120, presupActualUsd: 98699, ejecutadoUsd: 75055, highlight: true,
};

// ── Annual Projection Data ────────────────────────────────────────────────────
const MONTHLY_PROJECTION = [
  { month: 'Ene 2026', tns: 412.2, budget: 162514.50, fee: 0.39 },
  { month: 'Feb 2026', tns: 527.2, budget: 333308.36, fee: 0.35 },
  { month: 'Mar 2026', tns: 261.1, budget: 133069.97, fee: 0.51 },
  { month: 'Abr 2026', tns: 84.5, budget: 54163.38, fee: 0.94 },
  { month: 'May 2026', tns: 139.2, budget: 101237.66, fee: 0.73 },
  { month: 'Jun 2026', tns: 212.6, budget: 105544.51, fee: 0.50 },
  { month: 'Jul 2026', tns: 191.3, budget: 96047.12, fee: 0.50 },
  { month: 'Ago 2026', tns: 67.5, budget: 75054.98, fee: 1.11 },
  { month: 'Sep 2026', tns: 80.0, budget: 118823.60, fee: 1.49 },
  { month: 'Oct 2026', tns: 200.0, budget: 103416.31, fee: 0.52 },
  { month: 'Nov 2026', tns: 450.0, budget: 154124.27, fee: 0.34 },
  { month: 'Dic 2026', tns: 150.0, budget: 148802.72, fee: 0.99 },
];

interface ExecutiveSummaryModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

const delta = (actual: number, initial: number) => actual - initial;
const deltaPct = (actual: number, initial: number) => initial !== 0 ? ((actual - initial) / initial) * 100 : 0;

const fmtUsd = (v: number) => v === 0 ? '$0' : `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const ExecutiveSummaryModule: React.FC<ExecutiveSummaryModuleProps> = ({ currency, bcvRate }) => {
  const [selectedMonth, setSelectedMonth] = useState(SELECTED_MONTH);

  const convert = (usd: number) => {
    if (currency === 'VES') return `Bs. ${(usd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    if (currency === 'EUR') return `€ ${(usd * 0.92).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return fmtUsd(usd);
  };

  const totalAnnualTns = MONTHLY_PROJECTION.reduce((a, m) => a + m.tns, 0);
  const totalAnnualBudget = MONTHLY_PROJECTION.reduce((a, m) => a + m.budget, 0);

  const variantBadge = (val: number) => (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded font-mono-num font-bold text-[11px] ${
      val < 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    }`}>
      {val < 0 ? <span className="material-symbols-outlined text-[14px]">arrow_downward</span> : <span className="material-symbols-outlined text-[14px]">arrow_upward</span>}
      {Math.abs(val).toFixed(1)}%
    </span>
  );

  const renderBudgetTable = (group: BudgetGroup) => (
    <div key={group.name} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className={`px-4 py-2 border-b border-slate-200 ${group.bgColor} flex items-center gap-2`}>
        <span className={`text-xs font-bold uppercase tracking-wider ${group.color}`}>{group.name}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse font-mono-num">
          <thead>
            <tr className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-2 px-4 text-left font-sans font-bold">Tipo de Gasto</th>
              <th className="py-2 px-3 text-right">Ppto. Inicial</th>
              <th className="py-2 px-3 text-right bg-blue-50">Ppto. Actual</th>
              <th className="py-2 px-3 text-right bg-slate-200">Ejecutado</th>
              <th className="py-2 px-3 text-right">Δ $</th>
              <th className="py-2 px-3 text-center">Δ %</th>
            </tr>
          </thead>
          <tbody>
            {group.lines.map(line => {
              const d$ = delta(line.ejecutadoUsd, line.presupActualUsd);
              const dPct = deltaPct(line.ejecutadoUsd, line.presupActualUsd);
              return (
                <tr key={line.tipo} className={`border-b transition-colors ${
                  line.highlight
                    ? 'bg-slate-800 text-white font-bold'
                    : 'hover:bg-slate-50'
                }`}>
                  <td className={`py-2 px-4 font-sans font-semibold ${line.highlight ? 'text-white' : 'text-slate-800'}`}>
                    {line.tipo}
                  </td>
                  <td className={`py-2 px-3 text-right ${line.highlight ? 'text-amber-300' : 'text-slate-700'}`}>
                    {convert(line.presupInicialUsd)}
                  </td>
                  <td className={`py-2 px-3 text-right bg-blue-50/60 ${line.highlight ? 'bg-blue-900/20 text-white' : 'text-slate-800'}`}>
                    {convert(line.presupActualUsd)}
                  </td>
                  <td className={`py-2 px-3 text-right bg-slate-100/60 ${line.highlight ? 'bg-slate-900 text-white' : 'text-slate-900'}`}>
                    {convert(line.ejecutadoUsd)}
                  </td>
                  <td className={`py-2 px-3 text-right ${d$ < 0 ? (line.highlight ? 'text-red-300' : 'text-red-600') : (line.highlight ? 'text-emerald-300' : 'text-emerald-700')}`}>
                    {d$ < 0 ? `-${fmtUsd(Math.abs(d$))}` : `+${fmtUsd(d$)}`}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {!line.highlight && variantBadge(dPct)}
                    {line.highlight && (
                      <span className={`text-[11px] font-bold ${dPct < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                        {dPct.toFixed(0)}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8B5A2B]">summarize</span>
            Resumen Ejecutivo de Variaciones
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ppto. Inicial vs Ppto. Actual vs Ejecutado • Análisis de Δ$ y Δ% por Categoría
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Mes:</span>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            {MONTHS.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1.5 rounded-md transition-all ${selectedMonth === m ? 'bg-[#8B5A2B] text-white shadow-xs' : 'text-slate-600'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preliminary Badge */}
      <div className="flex items-center gap-2">
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">pending_actions</span>
          PRELIMINAR – {selectedMonth} 2026
        </span>
        <span className="text-xs text-slate-500">Agropecuaria Aprocao, C.A. • Presupuesto Año 2026</span>
      </div>

      {/* Estimation Block */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="bg-[#1e3a5f] text-white px-4 py-2">
          <span className="text-xs font-bold uppercase tracking-wider">Estimación de Compras & FEE</span>
        </div>
        <table className="w-full text-xs border-collapse font-mono-num">
          <thead>
            <tr className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-2 px-4 text-left font-sans">Indicador</th>
              <th className="py-2 px-3 text-right">Ppto. Inicial</th>
              <th className="py-2 px-3 text-right bg-blue-50">Ppto. Actual</th>
              <th className="py-2 px-3 text-right bg-slate-200">Ejecutado</th>
              <th className="py-2 px-3 text-right">Δ</th>
              <th className="py-2 px-3 text-center">Δ %</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2.5 px-4 font-sans font-semibold text-slate-800">Estimación de Compra</td>
              <td className="py-2.5 px-3 text-right font-bold text-slate-900">{ESTIMACION_COMPRA.kg_inicial} Tns.</td>
              <td className="py-2.5 px-3 text-right font-bold text-slate-900 bg-blue-50/60">{ESTIMACION_COMPRA.kg_actual} Tns.</td>
              <td className="py-2.5 px-3 text-right font-bold text-slate-900 bg-slate-100/60">{ESTIMACION_COMPRA.kg_ejecutado} Tns.</td>
              <td className="py-2.5 px-3 text-right text-red-600 font-bold">-{ESTIMACION_COMPRA.kg_inicial - ESTIMACION_COMPRA.kg_ejecutado} Tns.</td>
              <td className="py-2.5 px-3 text-center">{variantBadge(deltaPct(ESTIMACION_COMPRA.kg_ejecutado, ESTIMACION_COMPRA.kg_inicial))}</td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2.5 px-4 font-sans font-semibold text-slate-800">FEE Estimado ($/KG)</td>
              <td className="py-2.5 px-3 text-right text-slate-700">${FEE_ESTIMADO.inicial.toFixed(2)}</td>
              <td className="py-2.5 px-3 text-right text-slate-700 bg-blue-50/60">${FEE_ESTIMADO.actual.toFixed(2)}</td>
              <td className="py-2.5 px-3 text-right font-bold text-[#8B5A2B] bg-slate-100/60">${FEE_ESTIMADO.ejecutado.toFixed(2)}</td>
              <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">+${(FEE_ESTIMADO.ejecutado - FEE_ESTIMADO.actual).toFixed(2)}</td>
              <td className="py-2.5 px-3 text-center">{variantBadge(deltaPct(FEE_ESTIMADO.ejecutado, FEE_ESTIMADO.actual))}</td>
            </tr>
            <tr className="bg-slate-800 text-white border-b">
              <td className="py-2.5 px-4 font-bold font-sans text-xs uppercase">PRESUPUESTO MENSUAL</td>
              <td className="py-2.5 px-3 text-right font-mono-num font-bold text-amber-300">{convert(126120)}</td>
              <td className="py-2.5 px-3 text-right font-mono-num font-bold text-amber-300 bg-blue-900/20">{convert(98699)}</td>
              <td className="py-2.5 px-3 text-right font-mono-num font-bold text-amber-300 bg-slate-900">{convert(75055)}</td>
              <td className="py-2.5 px-3 text-right text-red-300 font-bold">-{convert(23644)}</td>
              <td className="py-2.5 px-3 text-center text-red-300 font-bold">-24.0%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Cost Variable and Fixed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {COSTO_VARIABLE_GROUPS.map(g => renderBudgetTable(g))}
        {COSTO_FIJO_GROUPS.map(g => renderBudgetTable(g))}
      </div>

      {/* Grand Total Row */}
      <div className="bg-[#8B5A2B] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-sm">COSTO TOTAL</span>
          <span className="bg-white/20 text-white text-xs font-mono-num px-2 py-0.5 rounded">
            Ppto.Inicial: {convert(GRAND_TOTAL.presupInicialUsd)}
          </span>
          <span className="bg-white/20 text-white text-xs font-mono-num px-2 py-0.5 rounded">
            Ppto.Actual: {convert(GRAND_TOTAL.presupActualUsd)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-amber-200 font-bold text-lg font-mono-num">
            Ejecutado: {convert(GRAND_TOTAL.ejecutadoUsd)}
          </span>
          <span className="bg-red-900/60 text-red-200 font-bold text-sm font-mono-num px-3 py-1 rounded-lg border border-red-700">
            -{convert(delta(GRAND_TOTAL.ejecutadoUsd, GRAND_TOTAL.presupActualUsd) * -1)} (-24%)
          </span>
        </div>
      </div>

      {/* Annual Projection Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="bg-[#0F172A] text-white px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider">PROYECCIÓN ANUAL 2026 — AÑO CALENDARIO</span>
          <div className="flex items-center gap-2 text-[11px] font-mono-num text-slate-400">
            <span>Total: {totalAnnualTns.toFixed(1)} TM</span>
            <span>|</span>
            <span>Presup. Total: {convert(totalAnnualBudget)}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse font-mono-num">
            <thead>
              <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                <th className="py-2 px-3 font-semibold text-left font-sans">Mes</th>
                <th className="py-2 px-3 text-right font-semibold">Toneladas</th>
                <th className="py-2 px-3 text-right font-semibold">Presupuesto Est.</th>
                <th className="py-2 px-3 text-right font-semibold">FEE Est. ($/KG)</th>
                <th className="py-2 px-3 text-right font-semibold">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {MONTHLY_PROJECTION.map((m, idx) => {
                const acum = MONTHLY_PROJECTION.slice(0, idx + 1).reduce((a, x) => a + x.budget, 0);
                const isCurrentMonth = m.month.startsWith('Ago');
                return (
                  <tr key={m.month} className={`border-b transition-colors ${
                    isCurrentMonth ? 'bg-amber-50 border-amber-200' : 'border-slate-100 hover:bg-slate-50'
                  }`}>
                    <td className={`py-2 px-3 font-sans font-semibold ${isCurrentMonth ? 'text-amber-800' : 'text-slate-800'}`}>
                      {m.month} {isCurrentMonth && <span className="ml-1 text-[10px] bg-amber-200 text-amber-800 px-1 py-0.5 rounded font-bold">ACTUAL</span>}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-900 font-bold">{m.tns.toFixed(1)}</td>
                    <td className={`py-2 px-3 text-right font-bold ${isCurrentMonth ? 'text-amber-800' : 'text-[#8B5A2B]'}`}>
                      {convert(m.budget)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700">${m.fee.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{convert(acum)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#8B5A2B] text-white font-bold">
                <td className="py-2.5 px-3 font-sans text-xs uppercase">TOTAL AÑO</td>
                <td className="py-2.5 px-3 text-right">{totalAnnualTns.toFixed(1)} TM</td>
                <td className="py-2.5 px-3 text-right text-amber-200">{convert(totalAnnualBudget)}</td>
                <td className="py-2.5 px-3 text-right text-amber-200">
                  ${(totalAnnualBudget / (totalAnnualTns * 1000)).toFixed(2)}/KG
                </td>
                <td className="py-2.5 px-3 text-right text-amber-200">{convert(totalAnnualBudget)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
