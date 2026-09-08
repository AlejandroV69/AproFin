import React, { useState, useMemo } from 'react';
import type { CurrencyMode } from './Navbar';

interface YtdAccountRow {
  code: string;
  description: string;
  category: 'Directos Operativos' | 'Logística & Fletes' | 'Planta & Secado' | 'Administrativos';
  budgetMonthly: number; // Presupuesto mensual base
  monthsReal: { [key: string]: number }; // Ene..Dic real values
}

const MONTHS_KEYS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const INITIAL_YTD_ROWS: YtdAccountRow[] = [
  {
    code: '6.1.01',
    description: 'Compras Cacao Corriente (CAC200)',
    category: 'Directos Operativos',
    budgetMonthly: 18000,
    monthsReal: { Ene: 17500, Feb: 18200, Mar: 19500, Abr: 16800, May: 17900, Jun: 21000, Jul: 18400, Ago: 19100, Sep: 16500, Oct: 0, Nov: 0, Dic: 0 },
  },
  {
    code: '6.1.02',
    description: 'Compras Cacao Fino (CAC201)',
    category: 'Directos Operativos',
    budgetMonthly: 35000,
    monthsReal: { Ene: 34200, Feb: 36100, Mar: 38000, Abr: 32500, May: 34800, Jun: 41200, Jul: 36000, Ago: 37500, Sep: 32000, Oct: 0, Nov: 0, Dic: 0 },
  },
  {
    code: '6.1.03',
    description: 'Fletes y Transporte Cacao Barlovento/Sucre',
    category: 'Logística & Fletes',
    budgetMonthly: 4800,
    monthsReal: { Ene: 4500, Feb: 4900, Mar: 5200, Abr: 4400, May: 4700, Jun: 5800, Jul: 4900, Ago: 5100, Sep: 4400, Oct: 0, Nov: 0, Dic: 0 },
  },
  {
    code: '6.1.04',
    description: 'Nómina Directa Cuadrillas y Fermentación',
    category: 'Planta & Secado',
    budgetMonthly: 11000,
    monthsReal: { Ene: 11000, Feb: 11000, Mar: 11500, Abr: 11000, May: 11000, Jun: 12200, Jul: 11000, Ago: 11000, Sep: 9800, Oct: 0, Nov: 0, Dic: 0 },
  },
  {
    code: '6.1.05',
    description: 'Operación Secaderos Térmicos y Combustible',
    category: 'Planta & Secado',
    budgetMonthly: 5500,
    monthsReal: { Ene: 5200, Feb: 5800, Mar: 6100, Abr: 5100, May: 5400, Jun: 6500, Jul: 5600, Ago: 5700, Sep: 4900, Oct: 0, Nov: 0, Dic: 0 },
  },
  {
    code: '6.1.06',
    description: 'Empaques, Sacos de Yute & Control Calidad',
    category: 'Logística & Fletes',
    budgetMonthly: 3200,
    monthsReal: { Ene: 3100, Feb: 3300, Mar: 3600, Abr: 2900, May: 3100, Jun: 3900, Jul: 3200, Ago: 3400, Sep: 2800, Oct: 0, Nov: 0, Dic: 0 },
  },
  {
    code: '6.1.07',
    description: 'Gastos Administrativos, TI & Legales',
    category: 'Administrativos',
    budgetMonthly: 2800,
    monthsReal: { Ene: 2700, Feb: 2850, Mar: 2900, Abr: 2750, May: 2800, Jun: 3100, Jul: 2850, Ago: 2900, Sep: 2400, Oct: 0, Nov: 0, Dic: 0 },
  },
];

interface YtdExpensesModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

export const YtdExpensesModule: React.FC<YtdExpensesModuleProps> = ({ currency, bcvRate }) => {
  const [viewMode, setViewMode] = useState<'Real' | 'Presupuesto' | 'Variacion'>('Real');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const formatMoney = (usd: number) => {
    if (currency === 'VES') {
      return `Bs. ${(usd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === 'EUR') {
      return `€ ${(usd * 0.92).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$ ${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Header Metrics
  const estimatedTonsYtd = 450.0; // 450 TM Est. Ene-Sep
  const realTonsYtd = 438.5; // 438.5 TM Real
  const estimatedFeePerTonUsd = 125.0; // $125/TM
  const annualConsolidatedBudgetUsd = 963600; // $963.6k

  const filteredRows = useMemo(() => {
    if (activeCategory === 'ALL') return INITIAL_YTD_ROWS;
    return INITIAL_YTD_ROWS.filter((r) => r.category === activeCategory);
  }, [activeCategory]);

  // Compute column totals Ene..Dic
  const monthTotals = useMemo(() => {
    const totals: { [key: string]: number } = {};
    MONTHS_KEYS.forEach((m) => {
      totals[m] = filteredRows.reduce((acc, row) => {
        if (viewMode === 'Real') return acc + (row.monthsReal[m] || 0);
        if (viewMode === 'Presupuesto') return acc + row.budgetMonthly;
        // Variacion
        const real = row.monthsReal[m] || 0;
        return acc + (real > 0 ? real - row.budgetMonthly : 0);
      }, 0);
    });
    return totals;
  }, [filteredRows, viewMode]);

  // Total YTD (Ene-Sep active months)
  const activeMonthsCount = 9; // Ene-Sep
  const grandTotalYtdReal = useMemo(() => {
    return filteredRows.reduce((acc, row) => {
      const sumReal = MONTHS_KEYS.slice(0, activeMonthsCount).reduce((a, m) => a + (row.monthsReal[m] || 0), 0);
      return acc + sumReal;
    }, 0);
  }, [filteredRows]);

  const grandTotalYtdBudget = useMemo(() => {
    return filteredRows.reduce((acc, row) => acc + row.budgetMonthly * activeMonthsCount, 0);
  }, [filteredRows]);

  const grandVariancePct = grandTotalYtdBudget > 0 ? ((grandTotalYtdReal - grandTotalYtdBudget) / grandTotalYtdBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#5C3A21]">table_chart</span>
            <span>Módulo 4: Estructura de Gastos YTD</span>
          </h2>
          <p className="text-xs text-slate-500">
            Matriz Financiera de doble entrada (Enero - Diciembre 2026) vs. Presupuesto Consolidado.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex bg-slate-200 p-1 rounded-xl font-semibold text-xs border border-slate-300">
          <button
            onClick={() => setViewMode('Real')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'Real' ? 'bg-[#5C3A21] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            [Ejecutado Real]
          </button>
          <button
            onClick={() => setViewMode('Presupuesto')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'Presupuesto' ? 'bg-[#5C3A21] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            [Presupuesto Base]
          </button>
          <button
            onClick={() => setViewMode('Variacion')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'Variacion' ? 'bg-[#5C3A21] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            [Variación $]
          </button>
        </div>
      </div>

      {/* Key Operational Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            TONELADAS (EST. VS REALES YTD)
          </span>
          <div className="text-xl font-bold font-mono-num text-slate-900 mt-1 flex items-baseline space-x-2">
            <span>{realTonsYtd.toFixed(1)} TM</span>
            <span className="text-xs font-normal text-slate-500">/ {estimatedTonsYtd.toFixed(1)} TM Est.</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${(realTonsYtd / estimatedTonsYtd) * 100}%` }}
            ></div>
          </div>
          <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">
            Cumplimiento del {((realTonsYtd / estimatedTonsYtd) * 100).toFixed(1)}%
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            FEE ESTIMADO POR TONELADA
          </span>
          <div className="text-xl font-bold font-mono-num text-emerald-700 mt-1">
            ${estimatedFeePerTonUsd.toFixed(2)} <span className="text-xs font-normal text-slate-500">/ TM</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            Total FEE Acumulado: {formatMoney(realTonsYtd * estimatedFeePerTonUsd)}
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            PRESUPUESTO ANUAL CONSOLIDADO
          </span>
          <div className="text-xl font-bold font-mono-num text-[#5C3A21] mt-1">
            {formatMoney(annualConsolidatedBudgetUsd)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">
            Aprobación Directorio FY2026
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-200 bg-amber-50/40 shadow-xs">
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
            DESVIACIÓN GLOBAL PRESUPUESTARIA
          </span>
          <div className="text-xl font-bold font-mono-num text-emerald-700 mt-1 flex items-center space-x-1">
            <span>{grandVariancePct.toFixed(2)}%</span>
            <span className="text-xs font-bold text-emerald-600">(Ahorro YTD)</span>
          </div>
          <span className="text-[11px] text-slate-600 font-mono-num mt-1 block">
            Ejecutado: {formatMoney(grandTotalYtdReal)} vs Ppto: {formatMoney(grandTotalYtdBudget)}
          </span>
        </div>
      </div>

      {/* Double-entry Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#5C3A21]">matrix</span>
            <h3 className="text-sm font-bold text-slate-900">
              Matriz Financiera YTD — Modo Actual: <span className="text-[#5C3A21] underline">[{viewMode}]</span>
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Categoría:</span>
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
            >
              <option value="ALL">Todas las Categorías</option>
              <option value="Directos Operativos">Directos Operativos</option>
              <option value="Logística & Fletes">Logística & Fletes</option>
              <option value="Planta & Secado">Planta & Secado</option>
              <option value="Administrativos">Administrativos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono-num text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase">
                <th className="py-2.5 px-2.5 w-20">Código</th>
                <th className="py-2.5 px-2.5 font-sans w-52">Descripción</th>
                {MONTHS_KEYS.map((m, idx) => (
                  <th
                    key={m}
                    className={`py-2.5 px-2 text-right ${
                      idx < activeMonthsCount ? 'text-slate-900 bg-slate-200/50' : 'text-slate-400'
                    }`}
                  >
                    {m}
                  </th>
                ))}
                <th className="py-2.5 px-2.5 text-right bg-slate-200 text-slate-900 font-extrabold w-28">Total YTD</th>
                <th className="py-2.5 px-2.5 text-right bg-amber-100 text-amber-900 font-extrabold w-24">% Desv.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const rowRealTotal = MONTHS_KEYS.slice(0, activeMonthsCount).reduce((a, m) => a + (row.monthsReal[m] || 0), 0);
                const rowBudgetTotal = row.budgetMonthly * activeMonthsCount;
                const rowVariancePct = rowBudgetTotal > 0 ? ((rowRealTotal - rowBudgetTotal) / rowBudgetTotal) * 100 : 0;

                return (
                  <tr key={row.code} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-2.5 font-bold text-slate-600">{row.code}</td>
                    <td className="py-2 px-2.5 font-sans font-medium text-slate-900">{row.description}</td>
                    {MONTHS_KEYS.map((m, idx) => {
                      let cellVal = 0;
                      if (viewMode === 'Real') cellVal = row.monthsReal[m] || 0;
                      if (viewMode === 'Presupuesto') cellVal = row.budgetMonthly;
                      if (viewMode === 'Variacion') {
                        const r = row.monthsReal[m] || 0;
                        cellVal = r > 0 ? r - row.budgetMonthly : 0;
                      }

                      return (
                        <td
                          key={m}
                          className={`py-2 px-2 text-right ${
                            idx >= activeMonthsCount
                              ? 'text-slate-300'
                              : cellVal < 0
                              ? 'text-emerald-700 font-bold'
                              : cellVal > 0 && viewMode === 'Variacion'
                              ? 'text-red-600 font-bold'
                              : 'text-slate-800'
                          }`}
                        >
                          {cellVal === 0 ? '-' : cellVal.toLocaleString()}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2.5 text-right font-bold bg-slate-50 text-[#5C3A21]">
                      {viewMode === 'Presupuesto'
                        ? formatMoney(rowBudgetTotal)
                        : formatMoney(rowRealTotal)}
                    </td>
                    <td className={`py-2 px-2.5 text-right font-bold ${rowVariancePct < 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {rowVariancePct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}

              {/* CONSOLIDATED MATRIX TOTAL ROW */}
              <tr className="bg-[#5C3A21] text-white font-bold text-xs border-t-2 border-slate-400">
                <td colSpan={2} className="py-2.5 px-2.5 font-sans uppercase tracking-wider">TOTAL CONSOLIDADO YTD</td>
                {MONTHS_KEYS.map((m) => (
                  <td key={m} className="py-2.5 px-2 text-right">
                    {monthTotals[m] ? Math.round(monthTotals[m]).toLocaleString() : '-'}
                  </td>
                ))}
                <td className="py-2.5 px-2.5 text-right font-extrabold text-amber-300 bg-[#432A18]">
                  {formatMoney(grandTotalYtdReal)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-extrabold text-amber-300 bg-[#432A18]">
                  {grandVariancePct.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
