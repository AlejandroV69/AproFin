import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { CurrencyMode } from './Navbar';
import { getYtdReportByMonth } from '../lib/services/expensesService';
import type { VYtdReport } from '../lib/types';

interface YtdExpensesModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

const MONTHS_KEYS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

export const YtdExpensesModule: React.FC<YtdExpensesModuleProps> = ({ currency, bcvRate }) => {
  const [viewMode, setViewMode] = useState<'Real' | 'Presupuesto' | 'Variacion'>('Real');
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [data, setData] = useState<VYtdReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // Load all months up to current for the selected year
      const rows = await getYtdReportByMonth(selectedYear, CURRENT_MONTH);
      setData(rows);
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatMoney = (usd: number) => {
    if (currency === 'VES') {
      return `Bs. ${(usd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === 'EUR') {
      return `€ ${(usd * 0.92).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$ ${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Build a pivot: account_code → month_index → VYtdReport row
  const pivot = useMemo(() => {
    const map: Record<string, Record<number, VYtdReport>> = {};
    data.forEach(row => {
      if (!map[row.account_code]) map[row.account_code] = {};
      map[row.account_code][row.fiscal_month] = row;
    });
    return map;
  }, [data]);

  const accountCodes = useMemo(() => Object.keys(pivot), [pivot]);

  // Global YTD totals (sum of all accounts' actual_accumulated_ytd from the last month loaded)
  const grandTotalYtdReal = useMemo(() => {
    return accountCodes.reduce((acc, code) => {
      const months = Object.values(pivot[code]);
      const latestMonth = months.reduce((a, b) => (a.fiscal_month > b.fiscal_month ? a : b), months[0]);
      return acc + (latestMonth?.actual_accumulated_ytd ?? 0);
    }, 0);
  }, [accountCodes, pivot]);

  const grandTotalYtdBudget = useMemo(() => {
    return accountCodes.reduce((acc, code) => {
      const months = Object.values(pivot[code]);
      const latestMonth = months.reduce((a, b) => (a.fiscal_month > b.fiscal_month ? a : b), months[0]);
      return acc + (latestMonth?.budget_accumulated_ytd ?? 0);
    }, 0);
  }, [accountCodes, pivot]);

  const grandVariancePct = grandTotalYtdBudget > 0
    ? ((grandTotalYtdReal - grandTotalYtdBudget) / grandTotalYtdBudget) * 100
    : 0;

  // Column totals per month
  const monthTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    data.forEach(row => {
      const idx = row.fiscal_month;
      const val = viewMode === 'Real'
        ? row.actual_usd
        : viewMode === 'Presupuesto'
        ? row.budget_usd
        : row.variance_usd;
      totals[idx] = (totals[idx] ?? 0) + val;
    });
    return totals;
  }, [data, viewMode]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Estructura de Gastos YTD</h2>
          <p className="text-xs text-slate-500">Matriz Financiera Consolidada — {selectedYear}</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
          >
            {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <div className="flex bg-slate-100 p-0.5 rounded-lg font-semibold text-xs border border-slate-200">
            {(['Real', 'Presupuesto', 'Variacion'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md transition-all ${viewMode === mode ? 'bg-[#5C3A21] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {mode === 'Real' ? 'Ejecutado Real' : mode === 'Variacion' ? 'Variación $' : mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {loadError}
        </div>
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-2/3 mb-3" />
              <div className="h-6 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CUENTAS CON DATOS YTD</span>
            <div className="text-xl font-bold font-mono-num text-slate-900 mt-1">{accountCodes.length}</div>
            <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">Cuentas activas en {selectedYear}</span>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">EJECUTADO REAL YTD</span>
            <div className="text-xl font-bold font-mono-num text-[#5C3A21] mt-1">{formatMoney(grandTotalYtdReal)}</div>
            <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">Acumulado hasta mes {CURRENT_MONTH}</span>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PRESUPUESTO ACUMULADO YTD</span>
            <div className="text-xl font-bold font-mono-num text-slate-900 mt-1">{formatMoney(grandTotalYtdBudget)}</div>
            <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">Presupuesto FY{selectedYear}</span>
          </div>

          <div className={`bg-white rounded-xl p-4 border shadow-xs ${grandVariancePct <= 0 ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">DESVIACIÓN GLOBAL</span>
            <div className={`text-xl font-bold font-mono-num mt-1 flex items-center space-x-1 ${grandVariancePct <= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              <span>{grandVariancePct.toFixed(2)}%</span>
              <span className="text-xs font-bold">{grandVariancePct <= 0 ? '(Ahorro YTD)' : '(Sobreejecutado)'}</span>
            </div>
            <span className="text-[11px] text-slate-600 font-mono-num mt-1 block">
              Real: {formatMoney(grandTotalYtdReal)} vs Ppto: {formatMoney(grandTotalYtdBudget)}
            </span>
          </div>
        </div>
      )}

      {/* Matrix Table */}
      {!isLoading && data.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          <span className="material-symbols-outlined text-[32px] block mb-2">bar_chart</span>
          No hay datos de presupuesto registrados para {selectedYear}.
          <br />
          <span className="text-xs">Carga presupuesto desde el módulo de importación.</span>
        </div>
      ) : !isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Matriz Financiera YTD — {selectedYear}</span>
            <span className="text-[11px] text-slate-500">Cifras en {currency}</span>
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
                      className={`py-2.5 px-2 text-right ${idx < CURRENT_MONTH ? 'text-slate-900 bg-slate-200/50' : 'text-slate-400'}`}
                    >
                      {m}
                    </th>
                  ))}
                  <th className="py-2.5 px-2.5 text-right bg-slate-200 text-slate-900 font-extrabold w-28">Total YTD</th>
                  <th className="py-2.5 px-2.5 text-right bg-amber-100 text-amber-900 font-extrabold w-24">% Desv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accountCodes.map((code) => {
                  const accountRows = pivot[code];
                  const months = Object.values(accountRows);
                  const latest = months.reduce((a, b) => (a.fiscal_month > b.fiscal_month ? a : b), months[0]);
                  const accountName = latest?.account_name ?? code;
                  const rowRealTotal = latest?.actual_accumulated_ytd ?? 0;
                  const rowBudgetTotal = latest?.budget_accumulated_ytd ?? 0;
                  const rowVariancePct = rowBudgetTotal > 0 ? ((rowRealTotal - rowBudgetTotal) / rowBudgetTotal) * 100 : 0;

                  return (
                    <tr key={code} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-2.5 font-bold text-slate-600">{code}</td>
                      <td className="py-2 px-2.5 font-sans font-medium text-slate-900">{accountName}</td>
                      {MONTHS_KEYS.map((_, idx) => {
                        const monthNum = idx + 1;
                        const row = accountRows[monthNum];
                        let cellVal = 0;
                        if (row) {
                          if (viewMode === 'Real') cellVal = row.actual_usd;
                          else if (viewMode === 'Presupuesto') cellVal = row.budget_usd;
                          else cellVal = row.variance_usd;
                        }

                        return (
                          <td
                            key={monthNum}
                            className={`py-2 px-2 text-right ${
                              !row
                                ? 'text-slate-300'
                                : cellVal < 0
                                ? 'text-emerald-700 font-bold'
                                : cellVal > 0 && viewMode === 'Variacion'
                                ? 'text-red-600 font-bold'
                                : 'text-slate-800'
                            }`}
                          >
                            {!row ? '-' : cellVal.toLocaleString()}
                          </td>
                        );
                      })}
                      <td className="py-2 px-2.5 text-right font-bold bg-slate-50 text-[#5C3A21]">
                        {viewMode === 'Presupuesto' ? formatMoney(rowBudgetTotal) : formatMoney(rowRealTotal)}
                      </td>
                      <td className={`py-2 px-2.5 text-right font-bold ${rowVariancePct < 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {rowVariancePct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}

                {/* Total row */}
                <tr className="bg-[#5C3A21] text-white font-bold text-xs border-t-2 border-slate-400">
                  <td colSpan={2} className="py-2.5 px-2.5 font-sans uppercase tracking-wider">TOTAL CONSOLIDADO YTD</td>
                  {MONTHS_KEYS.map((_, idx) => (
                    <td key={idx} className="py-2.5 px-2 text-right">
                      {monthTotals[idx + 1] ? Math.round(monthTotals[idx + 1]).toLocaleString() : '-'}
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
      ) : null}
    </div>
  );
};
