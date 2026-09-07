import React from 'react';
import type { CurrencyMode } from './Navbar';

interface YtdExpensesModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

const MONTHLY_YTD_DATA = [
  { month: 'Ene', spent: 18500, budget: 20000 },
  { month: 'Feb', spent: 19200, budget: 20000 },
  { month: 'Mar', spent: 21000, budget: 20000 },
  { month: 'Abr', spent: 17800, budget: 20000 },
  { month: 'May', spent: 19500, budget: 20000 },
  { month: 'Jun', spent: 22400, budget: 20000 },
  { month: 'Jul', spent: 18900, budget: 20000 },
  { month: 'Ago', spent: 20100, budget: 20000 },
  { month: 'Sep', spent: 16160, budget: 20000 },
];

const DEPARTMENT_YTD = [
  { name: 'Operaciones Agrícolas & Báscula', spentUsd: 68500, share: '39.5%', status: 'Saludable' },
  { name: 'Logística & Fletes Cacaoteros', spentUsd: 42300, share: '24.4%', status: 'Saludable' },
  { name: 'Mantenimiento & Secaderos Térmicos', spentUsd: 28400, share: '16.4%', status: 'Atención' },
  { name: 'Administración, TI & Control', spentUsd: 22100, share: '12.7%', status: 'Saludable' },
  { name: 'Impuestos & Tasas Municipales', spentUsd: 12260, share: '7.0%', status: 'Saludable' },
];

export const YtdExpensesModule: React.FC<YtdExpensesModuleProps> = ({ currency, bcvRate }) => {
  const totalYtdSpentUsd = 173560;
  const totalYtdBudgetUsd = 180000;
  const totalCacaoKgYtd = 413200; // 413.2 TM
  const costPerKgUsd = totalYtdSpentUsd / totalCacaoKgYtd; // $0.42 / KG

  const formatMoney = (usd: number) => {
    if (currency === 'VES') {
      return `Bs. ${(usd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === 'EUR') {
      return `€ ${(usd * 0.92).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$ ${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const maxMonthlyVal = Math.max(...MONTHLY_YTD_DATA.map((d) => Math.max(d.spent, d.budget)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#8B5A2B]">analytics</span>
            <span>Módulo 4: Estructura de Gastos YTD</span>
          </h2>
          <p className="text-xs text-slate-500">
            Análisis consolidado Year-To-Date (Enero - Septiembre 2026), eficiencia de costo por KG y variaciones.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center space-x-1">
            <span className="material-symbols-outlined text-[16px]">trending_down</span>
            <span>-3.6% Ahorro Presupuestario YTD</span>
          </span>
        </div>
      </div>

      {/* Metric Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            EJECUTADO ACUMULADO YTD
          </span>
          <div className="text-xl font-bold font-mono-num text-slate-900 mt-1">
            {formatMoney(totalYtdSpentUsd)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">
            De {formatMoney(totalYtdBudgetUsd)} Presupuestados
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            COSTO OPERATIVO POR KG
          </span>
          <div className="text-xl font-bold font-mono-num text-[#8B5A2B] mt-1">
            {formatMoney(costPerKgUsd)} / KG
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            Meta Operativa: &lt; $0.45 / KG
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            CACAO PROCESADO TOTAL
          </span>
          <div className="text-xl font-bold font-mono-num text-slate-900 mt-1">
            413.2 <span className="text-xs font-semibold text-slate-500">TM</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">
            413,200 KG Cacao Beneficiado
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-[#8B5A2B]/5 border-[#8B5A2B]/20 bg-[#8B5A2B]/5">
          <span className="text-[10px] font-bold text-[#8B5A2B] uppercase tracking-wider block">
            RETORNO FINANCIERO YTD
          </span>
          <div className="text-xl font-bold font-mono-num text-[#8B5A2B] mt-1">
            2.84x ROI
          </div>
          <span className="text-[11px] text-[#8B5A2B] font-semibold mt-1 block">
            Eficiencia Agro-Industrial
          </span>
        </div>
      </div>

      {/* YTD Chart & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Comparative Bar Visual */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span className="material-symbols-outlined text-[#8B5A2B]">bar_chart</span>
              <span>Comparativo Mensual: Ejecutado vs Presupuesto (Ene - Sep)</span>
            </h3>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded-xs bg-[#8B5A2B]"></span>
                <span className="text-slate-600">Ejecutado</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded-xs bg-slate-200"></span>
                <span className="text-slate-600">Presupuesto</span>
              </div>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-200">
            {MONTHLY_YTD_DATA.map((d) => {
              const spentHeightPct = Math.round((d.spent / maxMonthlyVal) * 100);
              const budgetHeightPct = Math.round((d.budget / maxMonthlyVal) * 100);

              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] p-1.5 rounded shadow-md z-10 font-mono-num whitespace-nowrap">
                    <span>{d.month}: ${d.spent.toLocaleString()}</span>
                  </div>

                  <div className="w-full flex justify-center items-end gap-1 h-full">
                    {/* Spent Bar */}
                    <div
                      className="w-1/2 bg-[#8B5A2B] rounded-t-xs transition-all hover:bg-[#6F4315]"
                      style={{ height: `${spentHeightPct}%` }}
                    ></div>
                    {/* Budget Bar */}
                    <div
                      className="w-1/2 bg-slate-200 rounded-t-xs transition-all"
                      style={{ height: `${budgetHeightPct}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 font-mono-num">{d.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Share Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#8B5A2B]">pie_chart</span>
            <span>Distribución de Costos por Departamento</span>
          </h3>

          <div className="space-y-3">
            {DEPARTMENT_YTD.map((dept) => (
              <div key={dept.name} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800">{dept.name}</span>
                  <span className="font-bold font-mono-num text-[#8B5A2B]">{dept.share}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono-num">
                  <span>Monto: {formatMoney(dept.spentUsd)}</span>
                  <span className={dept.status === 'Saludable' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {dept.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
