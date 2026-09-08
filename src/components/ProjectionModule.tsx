import React, { useState } from 'react';
import type { CurrencyMode } from './Navbar';

interface MonthData {
  month: string;
  tns: number;
  budget: number;
  fee: number;
  tnsVenta?: number;
  precioVenta?: number;
}

const ANNO_CALENDARIO: MonthData[] = [
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

const ANNO_COSECHA: MonthData[] = [
  { month: 'Oct 2023', tns: 158.1, budget: 73895.25, fee: 0.47 },
  { month: 'Nov 2023', tns: 249.3, budget: 93787.20, fee: 0.38 },
  { month: 'Dic 2023', tns: 374.9, budget: 157949.69, fee: 0.42 },
  { month: 'Ene 2026', tns: 412.2, budget: 162514.50, fee: 0.39 },
  { month: 'Feb 2026', tns: 527.2, budget: 170793.86, fee: 0.35 },
  { month: 'Mar 2026', tns: 261.1, budget: 133069.97, fee: 0.51 },
  { month: 'Abr 2026', tns: 84.5, budget: 79805.43, fee: 0.94 },
  { month: 'May 2026', tns: 139.2, budget: 101237.66, fee: 0.73 },
  { month: 'Jun 2026', tns: 212.6, budget: 105544.51, fee: 0.50 },
  { month: 'Jul 2026', tns: 191.3, budget: 96047.12, fee: 0.50 },
  { month: 'Ago 2026', tns: 67.5, budget: 75054.98, fee: 1.11 },
  { month: 'Sep 2026', tns: 80.0, budget: 118823.60, fee: 1.49 },
];

const ANNO_2024_CALENDARIO: MonthData[] = [
  { month: 'Ene 2026', tns: 412.2, budget: 135804.74, fee: 0.33 },
  { month: 'Feb 2026', tns: 350.0, budget: 233823.79, fee: 0.67 },
  { month: 'Mar 2026', tns: 400.0, budget: 173056.58, fee: 0.43 },
  { month: 'Abr 2026', tns: 50.0, budget: 75903.63, fee: 1.52 },
  { month: 'May 2026', tns: 160.0, budget: 100560.33, fee: 0.63 },
  { month: 'Jun 2026', tns: 250.0, budget: 147038.59, fee: 0.59 },
];

const ANNO_2024_COSECHA: MonthData[] = [
  { month: 'Ene 2026', tns: 650.0, budget: 149947.34, fee: 0.23 },
  { month: 'Feb 2026', tns: 250.0, budget: 261318.60, fee: 1.05 },
  { month: 'Mar 2026', tns: 200.0, budget: 134633.43, fee: 0.67 },
  { month: 'Abr 2026', tns: 200.0, budget: 139166.68, fee: 0.68 },
  { month: 'May 2026', tns: 150.0, budget: 101977.20, fee: 0.68 },
  { month: 'Jun 2026', tns: 250.0, budget: 139134.00, fee: 0.56 },
];

const BUDGET_COMPARATIVO = [
  { month: 'Ene 2026', tns: 3200, fee_est: 0.00, ppto: 0, fletes: 33193, otrosCostos: 20125, impuestos: 24500, costoFijo: 0 },
  { month: 'Feb 2026', tns: 250, fee_est: 0.23, ppto: 134000, fletes: 34975, otrosCostos: 8981, impuestos: 100244, costoFijo: 0 },
  { month: 'Mar 2026', tns: 200, fee_est: 1.05, ppto: 134633, fletes: 33856, otrosCostos: 6192, impuestos: 43725, costoFijo: 0 },
  { month: 'Abr 2026', tns: 200, fee_est: 0.67, ppto: 133166, fletes: 24008, otrosCostos: 7179, impuestos: 46576, costoFijo: 0 },
  { month: 'May 2026', tns: 150, fee_est: 0.67, ppto: 101977, fletes: 16005, otrosCostos: 3656, impuestos: 29828, costoFijo: 0 },
  { month: 'Jun 2026', tns: 250, fee_est: 0.68, ppto: 139134, fletes: 20369, otrosCostos: 8911, impuestos: 32365, costoFijo: 0 },
  { month: 'Jul 2026', tns: 250, fee_est: 0.56, ppto: 137541, fletes: 19518, otrosCostos: 7741, impuestos: 37609, costoFijo: 0 },
  { month: 'Ago 2026', tns: 250, fee_est: 0.55, ppto: 126434, fletes: 18218, otrosCostos: 8973, impuestos: 43600, costoFijo: 0 },
  { month: 'Sep 2026', tns: 100, fee_est: 0.51, ppto: 154761, fletes: 24994, otrosCostos: 3591, impuestos: 46718, costoFijo: 0 },
];

interface ProjectionModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

type ViewMode = 'calendario' | 'cosecha' | 'comparativo';

const fmt = (v: number, sym = '$') => `${sym}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ProjectionModule: React.FC<ProjectionModuleProps> = ({ currency, bcvRate }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('calendario');
  const [anno, setAnno] = useState<'2026' | '2024'>('2026');

  const convert = (usd: number) => {
    if (currency === 'VES') return usd * bcvRate;
    if (currency === 'EUR') return usd * 0.92;
    return usd;
  };

  const currSym = currency === 'VES' ? 'Bs. ' : currency === 'EUR' ? '€ ' : '$ ';

  const currentData = viewMode === 'cosecha'
    ? (anno === '2026' ? ANNO_COSECHA : ANNO_2024_COSECHA)
    : (anno === '2026' ? ANNO_CALENDARIO : ANNO_2024_CALENDARIO);

  const totalTns = currentData.reduce((a, m) => a + m.tns, 0);
  const totalBudget = currentData.reduce((a, m) => a + m.budget, 0);
  const avgFee = totalBudget / (totalTns * 1000);

  const renderAnnoTable = (data: MonthData[], title: string, subtitle: string) => {
    let acum = 0;
    const tnsTotal = data.reduce((a, m) => a + m.tns, 0);
    const budgetTotal = data.reduce((a, m) => a + m.budget, 0);
    const feeMedia = budgetTotal / (tnsTotal * 1000);

    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="bg-[#1e3a5f] text-white px-4 py-2 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
            <span className="text-slate-400 text-[11px] ml-2">{subtitle}</span>
          </div>
          <div className="flex gap-3 text-[11px] font-mono-num">
            <span className="text-slate-300">TM Anual: <span className="text-amber-300 font-bold">{tnsTotal.toFixed(1)}</span></span>
            <span className="text-slate-300">FEE Med: <span className="text-amber-300 font-bold">${feeMedia.toFixed(2)}</span></span>
            <span className="text-slate-300">Total: <span className="text-emerald-400 font-bold">{currSym}{convert(budgetTotal).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse font-mono-num">
            <thead>
              <tr className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2 px-3 text-left font-sans">Mes</th>
                <th className="py-2 px-3 text-right">Toneladas</th>
                <th className="py-2 px-3 text-right">Presupuesto Est.</th>
                <th className="py-2 px-3 text-right">FEE ($/KG)</th>
                <th className="py-2 px-3 text-right">Acumulado</th>
                <th className="py-2 px-3 text-center">% Acum</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, idx) => {
                acum += m.budget;
                const pct = (acum / budgetTotal) * 100;
                const isCurrentMonth = m.month.startsWith('Ago');
                return (
                  <tr key={m.month + idx} className={`border-b transition-colors ${
                    isCurrentMonth ? 'bg-amber-50 border-amber-200' : 'border-slate-100 hover:bg-slate-50'
                  }`}>
                    <td className={`py-2 px-3 font-sans font-semibold ${isCurrentMonth ? 'text-amber-800' : 'text-slate-800'}`}>
                      {m.month}
                      {isCurrentMonth && <span className="ml-1.5 text-[9px] bg-amber-200 text-amber-800 px-1 py-0.5 rounded font-bold">HOY</span>}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-900 font-bold">{m.tns.toFixed(1)}</td>
                    <td className={`py-2 px-3 text-right font-bold ${isCurrentMonth ? 'text-amber-700' : 'text-[#8B5A2B]'}`}>
                      {currSym}{convert(m.budget).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700">${m.fee.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {currSym}{convert(acum).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#8B5A2B] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8B5A2B]">trending_up</span>
            Proyección Anual 2026
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Toneladas • Presupuesto Estimado • FEE por mes • Acumulado
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            {(['2026', '2024'] as const).map(a => (
              <button key={a} onClick={() => setAnno(a)}
                className={`px-3 py-1.5 rounded-md transition-all ${anno === a ? 'bg-[#8B5A2B] text-white shadow-xs' : 'text-slate-600'}`}>
                Año {a}
              </button>
            ))}
          </div>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            {([
              { key: 'calendario', label: 'Año Calendario' },
              { key: 'cosecha', label: 'Año Cosecha' },
              { key: 'comparativo', label: 'Ppto. Comparativo' },
            ] as { key: ViewMode; label: string }[]).map(v => (
              <button key={v.key} onClick={() => setViewMode(v.key)}
                className={`px-3 py-1.5 rounded-md transition-all ${viewMode === v.key ? 'bg-[#8B5A2B] text-white shadow-xs' : 'text-slate-600'}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toneladas Anuales', value: `${totalTns.toFixed(1)} TM`, color: 'text-[#8B5A2B]' },
          { label: 'Presupuesto Total', value: `${currSym}${convert(totalBudget).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-slate-900' },
          { label: 'FEE Promedio', value: `$${avgFee.toFixed(2)}/KG`, color: 'text-emerald-700' },
          { label: 'Ppto. Mensual Prom.', value: `${currSym}${convert(totalBudget / currentData.length).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-slate-700' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{k.label}</span>
            <div className={`text-lg font-bold font-mono-num mt-1 ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Content based on view */}
      {viewMode === 'comparativo' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="bg-[#1e3a5f] text-white px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wider">PRESUPUESTO COMPARATIVO — AÑO 2026</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse font-mono-num">
              <thead>
                <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-left font-sans font-semibold">Mes</th>
                  <th className="py-2.5 px-2 text-right font-semibold">TNS Est.</th>
                  <th className="py-2.5 px-2 text-right font-semibold">FEE ($)</th>
                  <th className="py-2.5 px-2 text-right font-semibold">Ppto. Mensual</th>
                  <th className="py-2.5 px-2 text-right font-semibold bg-blue-900/40">Fletes</th>
                  <th className="py-2.5 px-2 text-right font-semibold bg-purple-900/40">Otros Costos</th>
                  <th className="py-2.5 px-2 text-right font-semibold bg-amber-900/40">Impuestos</th>
                </tr>
              </thead>
              <tbody>
                {BUDGET_COMPARATIVO.map(m => {
                  const isCurrentMonth = m.month.startsWith('Ago');
                  return (
                    <tr key={m.month} className={`border-b transition-colors ${isCurrentMonth ? 'bg-amber-50 border-amber-200' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <td className={`py-2 px-3 font-sans font-semibold ${isCurrentMonth ? 'text-amber-800' : 'text-slate-800'}`}>{m.month}</td>
                      <td className="py-2 px-2 text-right font-bold">{m.tns.toFixed(0)}</td>
                      <td className="py-2 px-2 text-right">${m.fee_est.toFixed(2)}</td>
                      <td className={`py-2 px-2 text-right font-bold ${isCurrentMonth ? 'text-amber-700' : 'text-[#8B5A2B]'}`}>
                        {currSym}{convert(m.ppto).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-2 text-right text-blue-800 bg-blue-50/40">
                        {currSym}{convert(m.fletes).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-2 text-right text-purple-800 bg-purple-50/40">
                        {currSym}{convert(m.otrosCostos).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-2 text-right text-amber-800 bg-amber-50/40">
                        {currSym}{convert(m.impuestos).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {renderAnnoTable(
            currentData,
            viewMode === 'cosecha' ? `AÑO COSECHA 2023-${anno.slice(2)}` : `AÑO CALENDARIO ${anno}`,
            `${totalTns.toFixed(1)} TM Anuales • Presupuesto ${currSym}${convert(totalBudget).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          )}
        </div>
      )}
    </div>
  );
};
