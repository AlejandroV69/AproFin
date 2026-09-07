import React, { useState, useMemo } from 'react';
import type { CurrencyMode } from './Navbar';

interface TradeRecord {
  id: string;
  date: string;
  producer: string;
  type: 'Compra' | 'Venta';
  grossWeight: number;
  moisturePct: number;
  impurityPct: number;
  netWeight: number;
  pricePerKgUsd: number;
  totalUsd: number;
  status: 'Liquidado' | 'En Revisión' | 'Rechazado';
}

const INITIAL_TRADES: TradeRecord[] = [
  {
    id: 'LOT-2026-089',
    date: '2026-09-07',
    producer: 'Hacienda San José - Barlovento',
    type: 'Compra',
    grossWeight: 4500,
    moisturePct: 8.5,
    impurityPct: 1.5,
    netWeight: 4410,
    pricePerKgUsd: 3.42,
    totalUsd: 15082.20,
    status: 'Liquidado',
  },
  {
    id: 'LOT-2026-088',
    date: '2026-09-06',
    producer: 'Agropecuaria El Porvenir - Choroní',
    type: 'Compra',
    grossWeight: 3200,
    moisturePct: 7.0,
    impurityPct: 1.0,
    netWeight: 3200,
    pricePerKgUsd: 3.40,
    totalUsd: 10880.00,
    status: 'Liquidado',
  },
  {
    id: 'LOT-2026-087',
    date: '2026-09-05',
    producer: 'Cooperativa Cacaotera Ocumare',
    type: 'Compra',
    grossWeight: 6000,
    moisturePct: 9.8,
    impurityPct: 2.1,
    netWeight: 5766,
    pricePerKgUsd: 3.35,
    totalUsd: 19316.10,
    status: 'En Revisión',
  },
  {
    id: 'LOT-2026-086',
    date: '2026-09-04',
    producer: 'Chocolates Premium Export (EUA)',
    type: 'Venta',
    grossWeight: 12000,
    moisturePct: 6.8,
    impurityPct: 0.5,
    netWeight: 12000,
    pricePerKgUsd: 4.85,
    totalUsd: 58200.00,
    status: 'Liquidado',
  },
];

interface CacaoTradeModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

export const CacaoTradeModule: React.FC<CacaoTradeModuleProps> = ({ currency, bcvRate }) => {
  const [trades, setTrades] = useState<TradeRecord[]>(INITIAL_TRADES);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calculator Form State
  const [calcProducer, setCalcProducer] = useState('');
  const [calcGrossWeight, setCalcGrossWeight] = useState<number>(2500);
  const [calcMoisture, setCalcMoisture] = useState<number>(8.0);
  const [calcImpurity, setCalcImpurity] = useState<number>(1.2);
  const [calcPricePerKg, setCalcPricePerKg] = useState<number>(3.42);

  // Dockage Calculation
  const moisturePenaltyKg = useMemo(() => {
    const excess = Math.max(0, calcMoisture - 7.0);
    return Math.round((calcGrossWeight * excess) / 100);
  }, [calcGrossWeight, calcMoisture]);

  const impurityPenaltyKg = useMemo(() => {
    const excess = Math.max(0, calcImpurity - 1.0);
    return Math.round((calcGrossWeight * excess) / 100);
  }, [calcGrossWeight, calcImpurity]);

  const totalDockageKg = moisturePenaltyKg + impurityPenaltyKg;
  const netPayableWeight = Math.max(0, calcGrossWeight - totalDockageKg);
  const totalAmountUsd = netPayableWeight * calcPricePerKg;

  const formatMoney = (amountUsd: number) => {
    if (currency === 'VES') {
      return `Bs. ${(amountUsd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === 'EUR') {
      return `€ ${(amountUsd * 0.92).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$ ${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAddTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcProducer.trim()) return;

    const newRecord: TradeRecord = {
      id: `LOT-2026-${String(trades.length + 90).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      producer: calcProducer,
      type: 'Compra',
      grossWeight: calcGrossWeight,
      moisturePct: calcMoisture,
      impurityPct: calcImpurity,
      netWeight: netPayableWeight,
      pricePerKgUsd: calcPricePerKg,
      totalUsd: totalAmountUsd,
      status: 'Liquidado',
    };

    setTrades([newRecord, ...trades]);
    setCalcProducer('');
  };

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
      const matchesQuery =
        t.producer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [trades, filterStatus, searchQuery]);

  // Aggregate Metrics
  const totalRecibidoKg = useMemo(() => trades.reduce((acc, curr) => acc + curr.netWeight, 0), [trades]);
  const totalDesembolsadoUsd = useMemo(() => trades.reduce((acc, curr) => acc + (curr.type === 'Compra' ? curr.totalUsd : 0), 0), [trades]);
  const totalVentasUsd = useMemo(() => trades.reduce((acc, curr) => acc + (curr.type === 'Venta' ? curr.totalUsd : 0), 0), [trades]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#8B5A2B]">scale</span>
            <span>Módulo 2: Compras y Ventas de Cacao</span>
          </h2>
          <p className="text-xs text-slate-500">
            Recepción en báscula, liquidador de merma por humedad e impurezas y registro de operaciones.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500">Filtrar Estado:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]"
          >
            <option value="ALL">Todos los Lotes</option>
            <option value="Liquidado">Liquidados</option>
            <option value="En Revisión">En Revisión</option>
            <option value="Rechazado">Rechazados</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            CACAO RECIBIDO NETO
          </span>
          <div className="text-xl font-bold font-mono-num text-slate-900 mt-1">
            {(totalRecibidoKg / 1000).toFixed(2)} <span className="text-xs font-semibold text-slate-500">TM</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">
            {totalRecibidoKg.toLocaleString()} KG Procesados
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            COMPRAS TOTALES
          </span>
          <div className="text-xl font-bold font-mono-num text-emerald-700 mt-1">
            {formatMoney(totalDesembolsadoUsd)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block flex items-center space-x-1">
            <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
            <span>Liquidación a Productores</span>
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            VENTAS / EXPORTACIÓN
          </span>
          <div className="text-xl font-bold font-mono-num text-[#8B5A2B] mt-1">
            {formatMoney(totalVentasUsd)}
          </div>
          <span className="text-[11px] text-[#8B5A2B] font-semibold mt-1 block flex items-center space-x-1">
            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
            <span>Contratos FOB / CIF</span>
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MARGEN PROMEDIO / KG
          </span>
          <div className="text-xl font-bold font-mono-num text-amber-700 mt-1">
            {formatMoney(1.43)}
          </div>
          <span className="text-[11px] text-amber-600 font-semibold mt-1 block">
            Spread Compra vs Venta
          </span>
        </div>
      </div>

      {/* Live Dockage & Moisture Calculator Section */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-[#8B5A2B]/10 text-[#8B5A2B] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">calculate</span>
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Calculadora de Merma por Humedad y Impurezas (Dockage Strip)
              </h3>
              <p className="text-xs text-slate-500">
                Ajuste automático de peso según estándar de recepción (Humedad &lt;= 7.0%, Impurezas &lt;= 1.0%)
              </p>
            </div>
          </div>
          <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
            NORMATIVA ICCO
          </span>
        </div>

        <form onSubmit={handleAddTrade} className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-700">Proveedor / Productor</label>
            <input
              type="text"
              required
              placeholder="Ej. Hacienda La Elvira - Carúpano"
              value={calcProducer}
              onChange={(e) => setCalcProducer(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#8B5A2B] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Peso Bruto (KG)</label>
            <input
              type="number"
              min="1"
              value={calcGrossWeight}
              onChange={(e) => setCalcGrossWeight(Number(e.target.value))}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono-num focus:bg-white focus:ring-2 focus:ring-[#8B5A2B] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Humedad (%)</label>
            <input
              type="number"
              step="0.1"
              value={calcMoisture}
              onChange={(e) => setCalcMoisture(Number(e.target.value))}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono-num focus:bg-white focus:ring-2 focus:ring-[#8B5A2B] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Impurezas (%)</label>
            <input
              type="number"
              step="0.1"
              value={calcImpurity}
              onChange={(e) => setCalcImpurity(Number(e.target.value))}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono-num focus:bg-white focus:ring-2 focus:ring-[#8B5A2B] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Precio / KG ($)</label>
            <input
              type="number"
              step="0.01"
              value={calcPricePerKg}
              onChange={(e) => setCalcPricePerKg(Number(e.target.value))}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono-num focus:bg-white focus:ring-2 focus:ring-[#8B5A2B] focus:outline-none"
            />
          </div>

          {/* Calculator Output Strip */}
          <div className="md:col-span-6 bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-num">
            <div className="flex items-center space-x-4">
              <div>
                <span className="text-slate-500 block text-[10px] font-sans font-semibold">DESCUENTO HUMEDAD</span>
                <span className="text-amber-700 font-bold">-{moisturePenaltyKg} KG</span>
              </div>
              <span className="text-slate-300">|</span>
              <div>
                <span className="text-slate-500 block text-[10px] font-sans font-semibold">DESCUENTO IMPUREZAS</span>
                <span className="text-amber-700 font-bold">-{impurityPenaltyKg} KG</span>
              </div>
              <span className="text-slate-300">|</span>
              <div>
                <span className="text-slate-500 block text-[10px] font-sans font-semibold">PESO NETO PAGADERO</span>
                <span className="text-emerald-700 font-bold text-sm">{netPayableWeight.toLocaleString()} KG</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <span className="text-slate-500 block text-[10px] font-sans font-semibold">TOTAL A LIQUIDAR</span>
                <span className="text-[#8B5A2B] font-bold text-sm">{formatMoney(totalAmountUsd)}</span>
              </div>
              <button
                type="submit"
                className="h-9 px-4 bg-[#8B5A2B] hover:bg-[#6F4315] text-white font-sans text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Registrar Lote</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Ledger Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-slate-500">list_alt</span>
            <h3 className="text-sm font-bold text-slate-900">Libro de Operaciones de Cacao</h3>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por lote o proveedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8B5A2B] w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 font-mono-num">
                <th className="py-2.5 px-3">Lote ID</th>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Proveedor / Cliente</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3 text-right">Peso Bruto</th>
                <th className="py-2.5 px-3 text-right">Humedad %</th>
                <th className="py-2.5 px-3 text-right">Peso Neto</th>
                <th className="py-2.5 px-3 text-right">Precio/KG</th>
                <th className="py-2.5 px-3 text-right">Total Liquidado</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono-num text-slate-800">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-6 text-slate-400 font-sans">
                    No se encontraron registros de lotes.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{item.id}</td>
                    <td className="py-2.5 px-3 text-slate-500">{item.date}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{item.producer}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.type === 'Compra'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{item.grossWeight.toLocaleString()} KG</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={item.moisturePct > 7.0 ? 'text-amber-600 font-bold' : 'text-slate-700'}>
                        {item.moisturePct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{item.netWeight.toLocaleString()} KG</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">${item.pricePerKgUsd.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#8B5A2B]">{formatMoney(item.totalUsd)}</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'Liquidado'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'En Revisión'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
