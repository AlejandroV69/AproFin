import React, { useState, useMemo } from 'react';
import type { CurrencyMode } from './Navbar';

// ─── Type Definitions ───────────────────────────────────────────────────────
interface CostRow {
  id: string;
  name: string;
  level: 0 | 1 | 2; // 0=section header, 1=group header, 2=detail row
  color?: string;
  sem32: number; sem33: number; sem34: number; sem35: number; sem52: number;
}

// ─── Budget Data (exact match to Presupuesto Ejecutado Excel) ────────────────
const BUDGET_ROWS: CostRow[] = [
  { id: 'cv', name: 'COSTOS VARIABLES', level: 0, color: '#1e3a5f', sem32: 26953446, sem33: 4561988, sem34: 453224, sem35: 5348707, sem52: 2501276 },

  { id: 'fl', name: 'FLETES EN GENERAL', level: 1, color: '#2563eb', sem32: 11120294, sem33: 3990599, sem34: 114000, sem35: 4680690, sem52: 2146354 },
  { id: 'fl1', name: 'Fletes y Gastos de Transporte de Cacao (Nestlé)', level: 2, sem32: 9810412, sem33: 3460904, sem34: 0, sem35: 4208154, sem52: 2146354 },
  { id: 'fl2', name: 'Traslado de Sacos Vacíos', level: 2, sem32: 1309882, sem33: 529899, sem34: 114000, sem35: 472536, sem52: 0 },
  { id: 'fl3', name: 'Traslado Interno Cacao', level: 2, sem32: 0, sem33: 0, sem34: 0, sem35: 0, sem52: 0 },

  { id: 'oc', name: 'OTROS COSTOS', level: 1, color: '#7c3aed', sem32: 1744904, sem33: 571389, sem34: 338575, sem35: 480016, sem52: 354923 },
  { id: 'oc1', name: 'Sacos', level: 2, sem32: 0, sem33: 0, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'oc2', name: 'Químicos', level: 2, sem32: 0, sem33: 0, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'oc3', name: 'Correas, Hilos y Aguas', level: 2, sem32: 20159, sem33: 0, sem34: 0, sem35: 20159, sem52: 0 },
  { id: 'oc4', name: 'Preparación de Cacao', level: 2, sem32: 408368, sem33: 113818, sem34: 108575, sem35: 98374, sem52: 87600 },
  { id: 'oc5', name: 'Manipulación de Sacos', level: 2, sem32: 1316377, sem33: 457572, sem34: 230002, sem35: 361480, sem52: 267323 },

  { id: 'in', name: 'IMPUESTOS NACIONALES', level: 1, color: '#b45309', sem32: 14088249, sem33: 9701546, sem34: 3134884, sem35: 389468, sem52: 862350 },
  { id: 'in1', name: 'IGTF', level: 2, sem32: 7300344, sem33: 2752451, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'in2', name: 'ACTI (LOCTI)', level: 2, sem32: 3273428, sem33: 0, sem34: 3273428, sem35: 0, sem52: 0 },
  { id: 'in3', name: 'FONDEPORTE', level: 2, sem32: 0, sem33: 0, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'in4', name: 'Imp. por Publicidad y Propaganda', level: 2, sem32: 0, sem33: 0, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'in5', name: 'Imp. Protección de Pensiones', level: 2, sem32: 1045309, sem33: 1042518, sem34: 0, sem35: 2880, sem52: 0 },
  { id: 'in6', name: 'Servicio Medio Ambiental Alcaldía de Sucre', level: 2, sem32: 0, sem33: 0, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'in7', name: 'Créditos Fiscales', level: 2, sem32: 2469077, sem33: 906597, sem34: 313542, sem35: 386588, sem52: 862350 },
  { id: 'in8', name: 'Gasto de ISLR', level: 2, sem32: 0, sem33: 0, sem34: 0, sem35: 0, sem52: 0 },

  { id: 'gf', name: 'GASTOS FIJOS', level: 0, color: '#1a1a2e', sem32: 37161450, sem33: 16939636, sem34: 9745622, sem35: 9443749, sem52: 15120690 },

  { id: 'rh', name: 'RECURSOS HUMANOS', level: 1, color: '#065f46', sem32: 14455745, sem33: 1607847, sem34: 3997629, sem35: 695716, sem52: 8154552 },

  { id: 'cld', name: 'CARGA LABORAL DIRECTA', level: 1, color: '#047857', sem32: 11815588, sem33: 510042, sem34: 3305217, sem35: 3217, sem52: 7996012 },
  { id: 'cld1', name: 'Sueldos', level: 2, sem32: 4373390, sem33: 2180031, sem34: 2169185, sem35: 3217, sem52: 1916522 },
  { id: 'cld2', name: 'Bono Vacacional', level: 2, sem32: 1336570, sem33: 200538, sem34: 1136082, sem35: 0, sem52: 0 },
  { id: 'cld3', name: 'Utilidades', level: 2, sem32: 5409, sem33: 5409, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'cld4', name: 'Prestaciones Sociales (FIDEICOMISO + INTERESES)', level: 2, sem32: 17137, sem33: 17137, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'cld5', name: 'Prestaciones Sociales (RETROACTIVIDAD)', level: 2, sem32: 0, sem33: 0, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'cld6', name: 'Aporte IVSS y RPE', level: 2, sem32: 2936, sem33: 2936, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'cld7', name: 'Aporte BPVH', level: 2, sem32: 0, sem33: 0, sem34: 0, sem52: 0, sem35: 0 },
  { id: 'cld8', name: 'Aporte INCE', level: 2, sem32: 0, sem33: 0, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'cld9', name: 'Bono Alimenticio', level: 2, sem32: 6080000, sem33: 0, sem34: 0, sem35: 0, sem52: 6080000 },

  { id: 'cli', name: 'CARGA LABORAL INDIRECTA', level: 1, color: '#059669', sem32: 2640352, sem33: 1097800, sem34: 692412, sem35: 692499, sem52: 158540 },
  { id: 'cli1', name: 'Centro de Educación Inicial', level: 2, sem32: 0, sem33: 0, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'cli2', name: 'Dotación de Uniformes', level: 2, sem32: 0, sem33: 0, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'cli3', name: 'Formación al Personal (No INCES)', level: 2, sem32: 32285, sem33: 0, sem34: 32285, sem35: 0, sem52: 0 },
  { id: 'cli4', name: 'Formación Aprendices INCES', level: 2, sem32: 0, sem33: 0, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'cli5', name: 'Reclutamiento y Selección de Personal', level: 2, sem32: 0, sem33: 0, sem34: 0, sem35: 0, sem52: 0 },
  { id: 'cli6', name: 'Exámenes Médicos', level: 2, sem32: 87838, sem33: 87838, sem34: 40466, sem35: 0, sem52: 0 },
  { id: 'cli7', name: 'LOPCYMAT', level: 2, sem32: 725795, sem33: 0, sem34: 508155, sem35: 0, sem52: 157640 },
  { id: 'cli8', name: 'Incentivos Sin Carácter Salarial', level: 2, sem32: 1513290, sem33: 852010, sem34: 0, sem35: 661280, sem52: 0 },
];

const SEMANAS = [
  { key: 'sem32' as const, label: 'Sem 32', fecha: '1/8' },
  { key: 'sem33' as const, label: 'Sem 33', fecha: '10/8' },
  { key: 'sem34' as const, label: 'Sem 34', fecha: '17/8' },
  { key: 'sem35' as const, label: 'Sem 35', fecha: '24/8' },
  { key: 'sem52' as const, label: 'Sem 52', fecha: '0/1' },
];

const accumulate = (row: CostRow) =>
  row.sem32 + row.sem33 + row.sem34 + row.sem35 + row.sem52;

interface BudgetExecutionModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

const fmt = (v: number) =>
  v === 0 ? '–' : (v / 1e6).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'M';

const fmtFull = (v: number) =>
  v === 0 ? '–' : v.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const BudgetExecutionModule: React.FC<BudgetExecutionModuleProps> = ({ currency, bcvRate }) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showInMillions, setShowInMillions] = useState(true);

  const toggle = (id: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const formatVal = (v: number) => showInMillions ? fmt(v) : fmtFull(v);

  const convertVal = (vBs: number) => {
    if (currency === 'USD') return vBs / bcvRate;
    if (currency === 'EUR') return vBs / bcvRate * 0.92;
    return vBs;
  };

  const cvTotal = useMemo(() => BUDGET_ROWS.filter(r => r.id === 'cv')[0], []);
  const gfTotal = useMemo(() => BUDGET_ROWS.filter(r => r.id === 'gf')[0], []);

  // Grand total row
  const grandTotal: CostRow = {
    id: '__grand', name: 'GASTO TOTAL EJECUTADO', level: 0,
    sem32: (cvTotal?.sem32 ?? 0) + (gfTotal?.sem32 ?? 0),
    sem33: (cvTotal?.sem33 ?? 0) + (gfTotal?.sem33 ?? 0),
    sem34: (cvTotal?.sem34 ?? 0) + (gfTotal?.sem34 ?? 0),
    sem35: (cvTotal?.sem35 ?? 0) + (gfTotal?.sem35 ?? 0),
    sem52: (cvTotal?.sem52 ?? 0) + (gfTotal?.sem52 ?? 0),
  };

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return BUDGET_ROWS;
    return BUDGET_ROWS.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  const isVisible = (row: CostRow, index: number) => {
    // Always show level 0
    if (row.level === 0) return true;
    // Check if any ancestor group is collapsed
    if (row.level === 1) {
      const parent = BUDGET_ROWS.slice(0, BUDGET_ROWS.indexOf(row)).reverse().find(r => r.level === 0);
      return parent ? !collapsed.has(parent.id) : true;
    }
    if (row.level === 2) {
      const parent = BUDGET_ROWS.slice(0, BUDGET_ROWS.indexOf(row)).reverse().find(r => r.level === 1);
      const grandParent = parent ? BUDGET_ROWS.slice(0, BUDGET_ROWS.indexOf(parent)).reverse().find(r => r.level === 0) : null;
      return (parent ? !collapsed.has(parent.id) : true) && (grandParent ? !collapsed.has(grandParent.id) : true);
    }
    return true;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8B5A2B]">table_rows</span>
            Presupuesto Ejecutado Semanal
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Costos Variables y Gastos Fijos • Semanas 32–35 • Agosto 2026 • Agropecuaria Aprocao, C.A.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[18px]">search</span>
            <input
              type="text" placeholder="Buscar cuenta..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-48 focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]"
            />
          </div>
          <button
            onClick={() => setShowInMillions(!showInMillions)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${showInMillions ? 'bg-[#8B5A2B] text-white border-[#8B5A2B]' : 'bg-white text-slate-700 border-slate-200'}`}
          >
            {showInMillions ? 'Millones (M)' : 'Valor Completo'}
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SEMANAS.slice(0, 4).map(s => {
          const total = (cvTotal?.[s.key] ?? 0) + (gfTotal?.[s.key] ?? 0);
          return (
            <div key={s.key} className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{s.label} ({s.fecha}/ago)</span>
              <div className="text-lg font-bold font-mono-num text-slate-900 mt-1">
                {currency === 'USD' ? `$${(convertVal(total) / 1000).toFixed(1)}K` : `Bs. ${(total / 1e6).toFixed(1)}M`}
              </div>
              <div className="text-[11px] text-slate-500 font-mono-num">
                CV: {fmt(cvTotal?.[s.key] ?? 0)} | GF: {fmt(gfTotal?.[s.key] ?? 0)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Budget Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="bg-[#1e3a5f] text-white px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-bold tracking-wide uppercase">CUENTAS DE COSTOS Y GASTOS — PRESUPUESTO EJECUTADO SEMANAL</span>
          <span className="text-[11px] text-slate-400">Valores en Bs.{showInMillions ? ' (millones)' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider font-mono-num">
                <th className="py-2.5 px-3 w-72 font-semibold">Cuenta / Rubro</th>
                <th className="py-2.5 px-2 text-right font-semibold">Acumulado</th>
                {SEMANAS.map(s => (
                  <th key={s.key} className="py-2.5 px-2 text-right font-semibold">
                    {s.label}<br /><span className="text-slate-400 normal-case">{s.fecha}/ago</span>
                  </th>
                ))}
                <th className="py-2.5 px-2 text-center font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => {
                if (!isVisible(row, idx)) return null;
                const acum = accumulate(row);
                const hasChildren = BUDGET_ROWS.some(r => {
                  const ri = BUDGET_ROWS.indexOf(row);
                  const ci = BUDGET_ROWS.indexOf(r);
                  return ci > ri && r.level > row.level && !BUDGET_ROWS.slice(ri + 1, ci).some(x => x.level <= row.level);
                });
                const isCollapsed = collapsed.has(row.id);
                const isSection = row.level === 0;
                const isGroup = row.level === 1;

                return (
                  <tr key={row.id} className={`border-b transition-colors ${
                    isSection ? 'bg-slate-800 text-white border-slate-700' :
                    isGroup ? 'bg-slate-100 border-slate-200 hover:bg-slate-200/60' :
                    'border-slate-100 hover:bg-slate-50'
                  }`}>
                    <td className={`py-2 px-3 ${
                      isSection ? 'font-bold text-[11px] uppercase tracking-wider' :
                      isGroup ? 'font-bold text-xs text-slate-800' :
                      'text-xs text-slate-700 pl-7'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {hasChildren && (
                          <button onClick={() => toggle(row.id)} className="flex-shrink-0">
                            <span className={`material-symbols-outlined text-[16px] ${isSection ? 'text-slate-300' : 'text-slate-500'}`}>
                              {isCollapsed ? 'chevron_right' : 'expand_more'}
                            </span>
                          </button>
                        )}
                        <span style={{ color: row.level === 0 ? 'white' : undefined }}>{row.name}</span>
                      </div>
                    </td>
                    <td className={`py-2 px-2 text-right font-mono-num font-bold ${
                      isSection ? 'text-amber-300' : isGroup ? 'text-slate-900' : 'text-slate-700'
                    }`}>
                      {formatVal(convertVal(acum))}
                    </td>
                    {SEMANAS.map(s => (
                      <td key={s.key} className={`py-2 px-2 text-right font-mono-num ${
                        isSection ? 'text-white font-bold' : isGroup ? 'font-semibold text-slate-800' : 'text-slate-700'
                      }`}>
                        {row[s.key] > 0 ? formatVal(convertVal(row[s.key])) : '–'}
                      </td>
                    ))}
                    <td className="py-2 px-2 text-center">
                      {row.level === 2 && (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          acum > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {acum > 0 ? 'VERDADERO' : 'FALSO'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Grand Total */}
              <tr className="bg-[#8B5A2B] text-white border-t-2 border-amber-400">
                <td className="py-2.5 px-3 font-bold text-xs uppercase tracking-wider">GASTO TOTAL EJECUTADO</td>
                <td className="py-2.5 px-2 text-right font-bold font-mono-num text-amber-200">
                  {formatVal(convertVal(accumulate(grandTotal)))}
                </td>
                {SEMANAS.map(s => (
                  <td key={s.key} className="py-2.5 px-2 text-right font-bold font-mono-num text-amber-200">
                    {grandTotal[s.key] > 0 ? formatVal(convertVal(grandTotal[s.key])) : '–'}
                  </td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
