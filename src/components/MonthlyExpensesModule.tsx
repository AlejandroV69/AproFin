import React, { useState, useMemo } from 'react';
import type { CurrencyMode } from './Navbar';

interface ExpenseItem {
  id: string;
  date: string;
  category: string;
  description: string;
  vendor: string;
  amountUsd: number;
  paymentMethod: 'Transferencia VES' | 'Zelle USD' | 'Efectivo USD' | 'Pago Móvil';
  status: 'Aprobado' | 'Pendiente' | 'Rechazado';
}

const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: 'EXP-09-001',
    date: '2026-09-07',
    category: 'Logística y Fletes',
    description: 'Transporte de Cacao Seco Barlovento -> Planta',
    vendor: 'TransCacao C.A.',
    amountUsd: 1450.00,
    paymentMethod: 'Transferencia VES',
    status: 'Aprobado',
  },
  {
    id: 'EXP-09-002',
    date: '2026-09-06',
    category: 'Mantenimiento Secaderos',
    description: 'Repuestos para ventiladores térmicos de secado',
    vendor: 'TecnoAgro Sucre',
    amountUsd: 620.00,
    paymentMethod: 'Zelle USD',
    status: 'Aprobado',
  },
  {
    id: 'EXP-09-003',
    date: '2026-09-05',
    category: 'Nómina Agrícola',
    description: 'Pago de jornada semanal cuadrilla de fermentación',
    vendor: 'Cuadrilla Central',
    amountUsd: 2800.00,
    paymentMethod: 'Pago Móvil',
    status: 'Aprobado',
  },
  {
    id: 'EXP-09-004',
    date: '2026-09-03',
    category: 'Empaques y Sacos',
    description: 'Lote de 500 sacos de yute para exportación',
    vendor: 'Sacos e Hilos de Venezuela',
    amountUsd: 890.00,
    paymentMethod: 'Transferencia VES',
    status: 'Pendiente',
  },
];

const CATEGORY_BUDGETS = [
  { name: 'Logística y Fletes', budget: 5000 },
  { name: 'Nómina Agrícola', budget: 10000 },
  { name: 'Mantenimiento Secaderos', budget: 3000 },
  { name: 'Empaques y Sacos', budget: 2500 },
  { name: 'Impuestos & Tasas', budget: 1500 },
];

interface MonthlyExpensesModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

export const MonthlyExpensesModule: React.FC<MonthlyExpensesModuleProps> = ({ currency, bcvRate }) => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>(INITIAL_EXPENSES);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // New Expense Form State
  const [desc, setDesc] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('Logística y Fletes');
  const [amountUsd, setAmountUsd] = useState<number>(350);
  const [method, setMethod] = useState<'Transferencia VES' | 'Zelle USD' | 'Efectivo USD' | 'Pago Móvil'>('Transferencia VES');

  const formatMoney = (usd: number) => {
    if (currency === 'VES') {
      return `Bs. ${(usd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === 'EUR') {
      return `€ ${(usd * 0.92).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$ ${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalSpentUsd = useMemo(() => expenses.reduce((acc, item) => acc + item.amountUsd, 0), [expenses]);
  const totalBudgetUsd = 22000;
  const remainingBudgetUsd = totalBudgetUsd - totalSpentUsd;
  const spentPct = Math.min(100, Math.round((totalSpentUsd / totalBudgetUsd) * 100));

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;

    const newItem: ExpenseItem = {
      id: `EXP-09-${String(expenses.length + 5).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      category,
      description: desc,
      vendor: vendor || 'Proveedor General',
      amountUsd,
      paymentMethod: method,
      status: 'Aprobado',
    };

    setExpenses([newItem, ...expenses]);
    setDesc('');
    setVendor('');
  };

  const filteredExpenses = useMemo(() => {
    if (selectedCategory === 'ALL') return expenses;
    return expenses.filter((e) => e.category === selectedCategory);
  }, [expenses, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#8B5A2B]">payments</span>
            <span>Módulo 3: Gastado Dentro del Mes</span>
          </h2>
          <p className="text-xs text-slate-500">
            Control de egresos operativos, ejecución presupuestaria mensual y conciliación de fletes/nómina.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500">Categoría:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]"
          >
            <option value="ALL">Todas las Categorías</option>
            {CATEGORY_BUDGETS.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            PRESUPUESTO MES SEPTIEMBRE
          </span>
          <div className="text-2xl font-bold font-mono-num text-slate-900">
            {formatMoney(totalBudgetUsd)}
          </div>
          <p className="text-xs text-slate-500">Monto Global Aprobado por Junta</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            EJECUTADO A LA FECHA
          </span>
          <div className="text-2xl font-bold font-mono-num text-amber-700">
            {formatMoney(totalSpentUsd)}
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${spentPct > 85 ? 'bg-red-500' : 'bg-amber-500'}`}
              style={{ width: `${spentPct}%` }}
            ></div>
          </div>
          <span className="text-[11px] text-slate-600 font-mono-num block">
            {spentPct}% del presupuesto ejecutado
          </span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            DISPONIBLE RESTANTE
          </span>
          <div className="text-2xl font-bold font-mono-num text-emerald-700">
            {formatMoney(remainingBudgetUsd)}
          </div>
          <p className="text-xs text-emerald-600 font-medium">Margen Operativo Saludable</p>
        </div>
      </div>

      {/* Category Breakdown Meters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <span className="material-symbols-outlined text-[#8B5A2B]">align_horizontal_left</span>
          <span>Desglose Presupuestario por Rubro</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORY_BUDGETS.map((cat) => {
            const spentInCat = expenses
              .filter((e) => e.category === cat.name)
              .reduce((acc, curr) => acc + curr.amountUsd, 0);
            const pct = Math.min(100, Math.round((spentInCat / cat.budget) * 100));

            return (
              <div key={cat.name} className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">{cat.name}</span>
                  <span className="font-mono-num text-slate-600 font-medium">
                    {formatMoney(spentInCat)} / {formatMoney(cat.budget)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono-num">
                  <span>{pct}% Ejecutado</span>
                  <span>Restante: {formatMoney(cat.budget - spentInCat)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Expense Form & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#8B5A2B]">add_card</span>
            <span>Registrar Nuevo Egreso</span>
          </h3>

          <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Descripción del Gasto</label>
              <input
                type="text"
                required
                placeholder="Ej. Combustible para flete de cacao"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8B5A2B] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Proveedor / Beneficiario</label>
              <input
                type="text"
                placeholder="Ej. Distribuidora Agro-Cacao"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8B5A2B] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8B5A2B] focus:outline-none"
              >
                {CATEGORY_BUDGETS.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Monto USD ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(Number(e.target.value))}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-mono-num focus:bg-white focus:ring-2 focus:ring-[#8B5A2B] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Forma de Pago</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8B5A2B] focus:outline-none"
                >
                  <option value="Transferencia VES">Transferencia VES</option>
                  <option value="Zelle USD">Zelle USD</option>
                  <option value="Efectivo USD">Efectivo USD</option>
                  <option value="Pago Móvil">Pago Móvil</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-9 bg-[#8B5A2B] hover:bg-[#6F4315] text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-1 mt-2"
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>Guardar Egreso</span>
            </button>
          </form>
        </div>

        {/* Expenses Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Histórico de Transacciones del Mes</h3>
            <span className="text-xs text-slate-500 font-mono-num">{filteredExpenses.length} Registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 font-mono-num">
                  <th className="py-2.5 px-3">ID / Fecha</th>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">Método</th>
                  <th className="py-2.5 px-3 text-right">Monto</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-mono-num text-slate-800">
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{e.id}</span>
                      <span className="text-[10px] text-slate-400 font-sans">{e.date}</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                      <div>{e.description}</div>
                      <div className="text-[10px] text-slate-500">{e.vendor}</div>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{e.paymentMethod}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatMoney(e.amountUsd)}</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          e.status === 'Aprobado'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
