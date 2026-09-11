import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { CurrencyMode } from './Navbar';
import { getWeeklyExpenses } from '../lib/services/expensesService';
import type { WeeklyExpense } from '../lib/types';

interface MonthlyExpensesModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MonthlyExpensesModule: React.FC<MonthlyExpensesModuleProps> = ({ currency, bcvRate }) => {
  const [activeWeek, setActiveWeek] = useState<number>(3);
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState<number>(CURRENT_MONTH);
  const [data, setData] = useState<WeeklyExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await getWeeklyExpenses(selectedYear, selectedMonth);
      setData(rows);
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedMonth]);

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

  const variablesList = useMemo(() => data.filter(r => r.expense_category === 'COSTO_VARIABLE'), [data]);
  const fijosList = useMemo(() => data.filter(r => r.expense_category === 'COSTO_FIJO'), [data]);

  const calcGroupTotals = (items: WeeklyExpense[]) => {
    const sem1 = items.reduce((a, b) => a + b.week_1, 0);
    const sem2 = items.reduce((a, b) => a + b.week_2, 0);
    const sem3 = items.reduce((a, b) => a + b.week_3, 0);
    const sem4 = items.reduce((a, b) => a + b.week_4, 0);
    const sem5 = items.reduce((a, b) => a + b.week_5, 0);
    return { sem1, sem2, sem3, sem4, sem5, total: sem1 + sem2 + sem3 + sem4 + sem5 };
  };

  const varTotals = calcGroupTotals(variablesList);
  const fijosTotals = calcGroupTotals(fijosList);
  const grandTotal = {
    sem1: varTotals.sem1 + fijosTotals.sem1,
    sem2: varTotals.sem2 + fijosTotals.sem2,
    sem3: varTotals.sem3 + fijosTotals.sem3,
    sem4: varTotals.sem4 + fijosTotals.sem4,
    sem5: varTotals.sem5 + fijosTotals.sem5,
    total: varTotals.total + fijosTotals.total,
  };

  const activeWeekValue = [grandTotal.sem1, grandTotal.sem2, grandTotal.sem3, grandTotal.sem4, grandTotal.sem5][activeWeek - 1];

  const weekThClass = (w: number) =>
    `py-3 px-4 text-right min-w-[160px] ${activeWeek === w ? 'bg-amber-100/80 text-amber-900 font-extrabold border-x border-amber-300' : ''}`;

  const weekTdClass = (w: number) =>
    `py-2.5 px-4 text-right min-w-[160px] ${activeWeek === w ? 'bg-amber-50/80 font-bold border-x border-amber-200 text-amber-900' : 'text-slate-700'}`;

  const renderRows = (items: WeeklyExpense[]) =>
    items.map((item) => (
      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
        <td className="py-2.5 px-4 font-semibold text-slate-600">{item.account_code ?? '—'}</td>
        <td className="py-2.5 px-4 font-sans font-medium text-slate-900">{item.account_name || item.expense_category}</td>
        <td className={weekTdClass(1)}>{formatMoney(item.week_1)}</td>
        <td className={weekTdClass(2)}>{formatMoney(item.week_2)}</td>
        <td className={weekTdClass(3)}>{formatMoney(item.week_3)}</td>
        <td className={weekTdClass(4)}>{formatMoney(item.week_4)}</td>
        <td className={weekTdClass(5)}>{formatMoney(item.week_5)}</td>
        <td className="py-2.5 px-4 text-right font-bold text-[#5C3A21] bg-slate-50">{formatMoney(item.total_month)}</td>
      </tr>
    ));

  const renderSubtotal = (totals: ReturnType<typeof calcGroupTotals>, label: string) => (
    <tr className="bg-slate-100 font-bold text-slate-900 text-xs border-t-2 border-slate-300">
      <td colSpan={2} className="py-2.5 px-4 font-sans">{label}</td>
      {[totals.sem1, totals.sem2, totals.sem3, totals.sem4, totals.sem5].map((v, i) => (
        <td key={i} className={`py-2.5 px-4 text-right ${activeWeek === i + 1 ? 'bg-amber-100/60' : ''}`}>{formatMoney(v)}</td>
      ))}
      <td className="py-2.5 px-4 text-right font-bold text-[#5C3A21] bg-slate-200/50">{formatMoney(totals.total)}</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#5C3A21]">calendar_view_week</span>
            <span>Gastos Mensuales y Matriz Semanal</span>
          </h2>
          <p className="text-xs text-slate-500">Matriz Semanal de Costos Devengados y Ejecución Presupuestaria Operativa.</p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name} {selectedYear}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
          >
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <div className="flex items-center space-x-1 bg-slate-200 p-1 rounded-lg text-xs font-semibold">
            <span className="px-2 text-slate-600 text-[11px]">Semana Activa:</span>
            {[1, 2, 3, 4, 5].map((w) => (
              <button
                key={w}
                onClick={() => setActiveWeek(w)}
                className={`px-2.5 py-1 rounded transition-all font-mono-num ${activeWeek === w ? 'bg-[#5C3A21] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300'}`}
              >
                Sem {w}
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

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-2/3 mb-3" />
              <div className="h-6 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-2 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          <span className="material-symbols-outlined text-[32px] block mb-2">inbox</span>
          No hay gastos registrados para {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
          <br />
          <span className="text-xs">Importa datos desde el Módulo 1.</span>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">TOTAL COSTOS VARIABLES (MES)</span>
              <div className="text-xl font-bold font-mono-num text-slate-900 mt-1">{formatMoney(varTotals.total)}</div>
              <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">Fletes, Sacos &amp; Análisis de Calidad</span>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">TOTAL COSTOS FIJOS Y PLANTA</span>
              <div className="text-xl font-bold font-mono-num text-[#5C3A21] mt-1">{formatMoney(fijosTotals.total)}</div>
              <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">Nómina, Secaderos &amp; Combustibles</span>
            </div>
            <div className="bg-white rounded-xl p-4 border border-emerald-200 bg-emerald-50/40 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">TOTAL GASTADO MES EN CURSO</span>
              <div className="text-xl font-bold font-mono-num text-emerald-700 mt-1">{formatMoney(grandTotal.total)}</div>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
                Ejecutado Sem {activeWeek} Activa: {formatMoney(activeWeekValue)}
              </span>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <span className="material-symbols-outlined text-[#5C3A21]">grid_on</span>
                <span>Matriz Semanal — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono-num">Cifras en {currency}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono-num text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-100/90 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-300">
                    <th className="py-3 px-4 min-w-[140px]">Código</th>
                    <th className="py-3 px-4 min-w-[280px] font-sans">Descripción</th>
                    <th className={weekThClass(1)}>Sem 1</th>
                    <th className={weekThClass(2)}>Sem 2</th>
                    <th className={weekThClass(3)}>Sem 3 (Activa)</th>
                    <th className={weekThClass(4)}>Sem 4</th>
                    <th className={weekThClass(5)}>Sem 5</th>
                    <th className="py-3 px-4 text-right min-w-[200px] font-bold bg-slate-200/60 text-slate-900">Total Acum. Mes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-slate-100/60 font-sans font-bold text-slate-800 text-[11px]">
                    <td colSpan={8} className="py-2.5 px-4">GRUPO 1: COSTOS VARIABLES OPERATIVOS</td>
                  </tr>
                  {renderRows(variablesList)}
                  {renderSubtotal(varTotals, 'SUBTOTAL COSTOS VARIABLES')}

                  <tr className="bg-slate-100/60 font-sans font-bold text-slate-800 text-[11px]">
                    <td colSpan={8} className="py-2.5 px-4">GRUPO 2: COSTOS FIJOS Y DE PLANTA</td>
                  </tr>
                  {renderRows(fijosList)}
                  {renderSubtotal(fijosTotals, 'SUBTOTAL COSTOS FIJOS Y PLANTA')}

                  <tr className="bg-[#5C3A21] text-white font-bold text-xs">
                    <td colSpan={2} className="py-3.5 px-4 font-sans tracking-wide">TOTAL CONSOLIDADO MES</td>
                    {[grandTotal.sem1, grandTotal.sem2, grandTotal.sem3, grandTotal.sem4, grandTotal.sem5].map((v, i) => (
                      <td key={i} className={`py-3.5 px-4 text-right ${activeWeek === i + 1 ? 'bg-[#4A2E1A] font-extrabold text-amber-200' : ''}`}>
                        {formatMoney(v)}
                      </td>
                    ))}
                    <td className="py-3.5 px-4 text-right font-extrabold text-amber-300 text-sm bg-[#382214]">{formatMoney(grandTotal.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
