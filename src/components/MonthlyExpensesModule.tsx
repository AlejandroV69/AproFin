import React, { useState, useMemo } from 'react';
import type { CurrencyMode } from './Navbar';

interface WeeklyCostAccount {
  code: string;
  description: string;
  group: 'Costos Variables' | 'Costos Fijos y Planta';
  sem1: number;
  sem2: number;
  sem3: number;
  sem4: number;
  sem5: number;
}

const MONTHLY_WEEKLY_COSTS: WeeklyCostAccount[] = [
  // Grupo 1: Costos Variables
  { code: '6.1.01.01', description: 'Fletes de Cacao (Barlovento -> Planta)', group: 'Costos Variables', sem1: 1450, sem2: 1620, sem3: 1800, sem4: 1550, sem5: 980 },
  { code: '6.1.01.02', description: 'Fletes en General & Traslados Especiales', group: 'Costos Variables', sem1: 850, sem2: 920, sem3: 1100, sem4: 780, sem5: 450 },
  { code: '6.1.01.03', description: 'Traslado & Manejo Sacos Vacíos', group: 'Costos Variables', sem1: 320, sem2: 400, sem3: 450, sem4: 380, sem5: 210 },
  { code: '6.1.01.04', description: 'Control de Calidad, Análisis Humedad & Prueba Corte', group: 'Costos Variables', sem1: 540, sem2: 600, sem3: 580, sem4: 620, sem5: 390 },

  // Grupo 2: Costos Fijos y de Planta
  { code: '6.1.02.01', description: 'Mano de Obra Directa (Fermentación & Patio)', group: 'Costos Fijos y Planta', sem1: 2800, sem2: 2800, sem3: 2950, sem4: 2800, sem5: 1400 },
  { code: '6.1.02.02', description: 'Operación Secadores Térmicos & Túneles', group: 'Costos Fijos y Planta', sem1: 1250, sem2: 1380, sem3: 1420, sem4: 1300, sem5: 720 },
  { code: '6.1.02.03', description: 'Servicios de Planta, Gasoil & Combustible', group: 'Costos Fijos y Planta', sem1: 920, sem2: 1050, sem3: 1120, sem4: 980, sem5: 550 },
  { code: '6.1.02.04', description: 'Mantenimiento Preventivo & Repuestos Planta', group: 'Costos Fijos y Planta', sem1: 620, sem2: 740, sem3: 480, sem4: 890, sem5: 310 },
];

interface MonthlyExpensesModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

export const MonthlyExpensesModule: React.FC<MonthlyExpensesModuleProps> = ({ currency, bcvRate }) => {
  const [activeWeek, setActiveWeek] = useState<number>(3); // Sem 3 active week
  const [selectedMonth, setSelectedMonth] = useState<string>('Septiembre 2026');

  const formatMoney = (usd: number) => {
    if (currency === 'VES') {
      return `Bs. ${(usd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === 'EUR') {
      return `€ ${(usd * 0.92).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$ ${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const variablesList = useMemo(() => MONTHLY_WEEKLY_COSTS.filter(c => c.group === 'Costos Variables'), []);
  const fijosList = useMemo(() => MONTHLY_WEEKLY_COSTS.filter(c => c.group === 'Costos Fijos y Planta'), []);

  // Compute totals for group
  const calcGroupTotals = (items: WeeklyCostAccount[]) => {
    const sem1 = items.reduce((a, b) => a + b.sem1, 0);
    const sem2 = items.reduce((a, b) => a + b.sem2, 0);
    const sem3 = items.reduce((a, b) => a + b.sem3, 0);
    const sem4 = items.reduce((a, b) => a + b.sem4, 0);
    const sem5 = items.reduce((a, b) => a + b.sem5, 0);
    const total = sem1 + sem2 + sem3 + sem4 + sem5;
    return { sem1, sem2, sem3, sem4, sem5, total };
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#5C3A21]">calendar_view_week</span>
            <span>Módulo 3: Gastado Dentro del Mes</span>
          </h2>
          <p className="text-xs text-slate-500">
            Matriz Semanal de Costos Devengados y Ejecución Presupuestaria Operativa.
          </p>
        </div>

        {/* Month Selector & Active Week Controls */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
          >
            <option value="Septiembre 2026">Septiembre 2026</option>
            <option value="Agosto 2026">Agosto 2026</option>
            <option value="Julio 2026">Julio 2026</option>
          </select>

          <div className="flex items-center space-x-1 bg-slate-200 p-1 rounded-lg text-xs font-semibold">
            <span className="px-2 text-slate-600 text-[11px]">Semana Activa:</span>
            {[1, 2, 3, 4, 5].map((w) => (
              <button
                key={w}
                onClick={() => setActiveWeek(w)}
                className={`px-2.5 py-1 rounded transition-all font-mono-num ${
                  activeWeek === w
                    ? 'bg-[#5C3A21] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-300'
                }`}
              >
                Sem {w}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            TOTAL COSTOS VARIABLES (MES)
          </span>
          <div className="text-xl font-bold font-mono-num text-slate-900 mt-1">
            {formatMoney(varTotals.total)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">
            Fletes, Sacos & Análisis de Calidad
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            TOTAL COSTOS FIJOS Y PLANTA
          </span>
          <div className="text-xl font-bold font-mono-num text-[#5C3A21] mt-1">
            {formatMoney(fijosTotals.total)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">
            Nómina, Secaderos & Combustibles
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
            TOTAL GASTADO MES EN CURSO
          </span>
          <div className="text-xl font-bold font-mono-num text-emerald-700 mt-1">
            {formatMoney(grandTotal.total)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            Ejecutado Sem 3 Activa: {formatMoney(grandTotal.sem3)}
          </span>
        </div>
      </div>

      {/* Dense Spreadsheet Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <span className="material-symbols-outlined text-[#5C3A21]">grid_on</span>
            <span>Matriz Semanal de Costos Devengados ({selectedMonth})</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono-num">Todas las cifras en {currency}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono-num text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-300">
                <th className="py-3 px-3 w-28">Código Cuenta</th>
                <th className="py-3 px-3 font-sans">Descripción de la Cuenta</th>
                <th className={`py-3 px-3 text-right w-32 ${activeWeek === 1 ? 'bg-amber-100/80 text-amber-900 font-extrabold border-x border-amber-300' : ''}`}>Sem 1</th>
                <th className={`py-3 px-3 text-right w-32 ${activeWeek === 2 ? 'bg-amber-100/80 text-amber-900 font-extrabold border-x border-amber-300' : ''}`}>Sem 2</th>
                <th className={`py-3 px-3 text-right w-32 ${activeWeek === 3 ? 'bg-amber-100/80 text-amber-900 font-extrabold border-x border-amber-300' : ''}`}>Sem 3 (Activa)</th>
                <th className={`py-3 px-3 text-right w-32 ${activeWeek === 4 ? 'bg-amber-100/80 text-amber-900 font-extrabold border-x border-amber-300' : ''}`}>Sem 4</th>
                <th className={`py-3 px-3 text-right w-32 ${activeWeek === 5 ? 'bg-amber-100/80 text-amber-900 font-extrabold border-x border-amber-300' : ''}`}>Sem 5</th>
                <th className="py-3 px-3 text-right w-36 font-bold bg-slate-200/60 text-slate-900">Total Acum. Mes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* GRUPO 1 HEADER */}
              <tr className="bg-slate-50 font-sans font-bold text-slate-800 text-[11px]">
                <td colSpan={8} className="py-2 px-3 bg-slate-100/60">
                  GRUPO 1: COSTOS VARIABLES OPERATIVOS
                </td>
              </tr>
              {variablesList.map((item) => {
                const totalRow = item.sem1 + item.sem2 + item.sem3 + item.sem4 + item.sem5;
                return (
                  <tr key={item.code} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-600">{item.code}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{item.description}</td>
                    <td className={`py-2.5 px-3 text-right ${activeWeek === 1 ? 'bg-amber-50/80 font-bold border-x border-amber-200 text-amber-900' : 'text-slate-700'}`}>{formatMoney(item.sem1)}</td>
                    <td className={`py-2.5 px-3 text-right ${activeWeek === 2 ? 'bg-amber-50/80 font-bold border-x border-amber-200 text-amber-900' : 'text-slate-700'}`}>{formatMoney(item.sem2)}</td>
                    <td className={`py-2.5 px-3 text-right ${activeWeek === 3 ? 'bg-amber-50/80 font-bold border-x border-amber-200 text-amber-900' : 'text-slate-700'}`}>{formatMoney(item.sem3)}</td>
                    <td className={`py-2.5 px-3 text-right ${activeWeek === 4 ? 'bg-amber-50/80 font-bold border-x border-amber-200 text-amber-900' : 'text-slate-700'}`}>{formatMoney(item.sem4)}</td>
                    <td className={`py-2.5 px-3 text-right ${activeWeek === 5 ? 'bg-amber-50/80 font-bold border-x border-amber-200 text-amber-900' : 'text-slate-700'}`}>{formatMoney(item.sem5)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#5C3A21] bg-slate-50">{formatMoney(totalRow)}</td>
                  </tr>
                );
              })}
              {/* SUBTOTAL GRUPO 1 */}
              <tr className="bg-slate-100 font-bold text-slate-900 text-xs border-t-2 border-slate-300">
                <td colSpan={2} className="py-2 px-3 font-sans">SUBTOTAL COSTOS VARIABLES</td>
                <td className={`py-2 px-3 text-right ${activeWeek === 1 ? 'bg-amber-100/60' : ''}`}>{formatMoney(varTotals.sem1)}</td>
                <td className={`py-2 px-3 text-right ${activeWeek === 2 ? 'bg-amber-100/60' : ''}`}>{formatMoney(varTotals.sem2)}</td>
                <td className={`py-2 px-3 text-right ${activeWeek === 3 ? 'bg-amber-100/60' : ''}`}>{formatMoney(varTotals.sem3)}</td>
                <td className={`py-2 px-3 text-right ${activeWeek === 4 ? 'bg-amber-100/60' : ''}`}>{formatMoney(varTotals.sem4)}</td>
                <td className={`py-2 px-3 text-right ${activeWeek === 5 ? 'bg-amber-100/60' : ''}`}>{formatMoney(varTotals.sem5)}</td>
                <td className="py-2 px-3 text-right font-bold text-[#5C3A21] bg-slate-200/50">{formatMoney(varTotals.total)}</td>
              </tr>

              {/* GRUPO 2 HEADER */}
              <tr className="bg-slate-50 font-sans font-bold text-slate-800 text-[11px]">
                <td colSpan={8} className="py-2 px-3 bg-slate-100/60">
                  GRUPO 2: COSTOS FIJOS Y DE PLANTA
                </td>
              </tr>
              {fijosList.map((item) => {
                const totalRow = item.sem1 + item.sem2 + item.sem3 + item.sem4 + item.sem5;
                return (
                  <tr key={item.code} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-600">{item.code}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{item.description}</td>
                    <td className={`py-2.5 px-3 text-right ${activeWeek === 1 ? 'bg-amber-50/80 font-bold border-x border-amber-200 text-amber-900' : 'text-slate-700'}`}>{formatMoney(item.sem1)}</td>
                    <td className={`py-2.5 px-3 text-right ${activeWeek === 2 ? 'bg-amber-50/80 font-bold border-x border-amber-200 text-amber-900' : 'text-slate-700'}`}>{formatMoney(item.sem2)}</td>
                    <td className={`py-2.5 px-3 text-right ${activeWeek === 3 ? 'bg-amber-50/80 font-bold border-x border-amber-200 text-amber-900' : 'text-slate-700'}`}>{formatMoney(item.sem3)}</td>
                    <td className={`py-2.5 px-3 text-right ${activeWeek === 4 ? 'bg-amber-50/80 font-bold border-x border-amber-200 text-amber-900' : 'text-slate-700'}`}>{formatMoney(item.sem4)}</td>
                    <td className={`py-2.5 px-3 text-right ${activeWeek === 5 ? 'bg-amber-50/80 font-bold border-x border-amber-200 text-amber-900' : 'text-slate-700'}`}>{formatMoney(item.sem5)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#5C3A21] bg-slate-50">{formatMoney(totalRow)}</td>
                  </tr>
                );
              })}
              {/* SUBTOTAL GRUPO 2 */}
              <tr className="bg-slate-100 font-bold text-slate-900 text-xs border-t-2 border-slate-300">
                <td colSpan={2} className="py-2 px-3 font-sans">SUBTOTAL COSTOS FIJOS Y PLANTA</td>
                <td className={`py-2 px-3 text-right ${activeWeek === 1 ? 'bg-amber-100/60' : ''}`}>{formatMoney(fijosTotals.sem1)}</td>
                <td className={`py-2 px-3 text-right ${activeWeek === 2 ? 'bg-amber-100/60' : ''}`}>{formatMoney(fijosTotals.sem2)}</td>
                <td className={`py-2 px-3 text-right ${activeWeek === 3 ? 'bg-amber-100/60' : ''}`}>{formatMoney(fijosTotals.sem3)}</td>
                <td className={`py-2 px-3 text-right ${activeWeek === 4 ? 'bg-amber-100/60' : ''}`}>{formatMoney(fijosTotals.sem4)}</td>
                <td className={`py-2 px-3 text-right ${activeWeek === 5 ? 'bg-amber-100/60' : ''}`}>{formatMoney(fijosTotals.sem5)}</td>
                <td className="py-2 px-3 text-right font-bold text-[#5C3A21] bg-slate-200/50">{formatMoney(fijosTotals.total)}</td>
              </tr>

              {/* GRAND TOTAL */}
              <tr className="bg-[#5C3A21] text-white font-bold text-xs">
                <td colSpan={2} className="py-3 px-3 font-sans tracking-wide">TOTAL CONSOLIDADO MES ({selectedMonth})</td>
                <td className="py-3 px-3 text-right">{formatMoney(grandTotal.sem1)}</td>
                <td className="py-3 px-3 text-right">{formatMoney(grandTotal.sem2)}</td>
                <td className="py-3 px-3 text-right font-extrabold underline">{formatMoney(grandTotal.sem3)}</td>
                <td className="py-3 px-3 text-right">{formatMoney(grandTotal.sem4)}</td>
                <td className="py-3 px-3 text-right">{formatMoney(grandTotal.sem5)}</td>
                <td className="py-3 px-3 text-right font-extrabold text-amber-300 text-sm bg-[#432A18]">{formatMoney(grandTotal.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
