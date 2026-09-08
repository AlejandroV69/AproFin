import React, { useState, useMemo } from 'react';
import type { CurrencyMode } from './Navbar';

interface TradeArticleItem {
  id: string;
  docNumber: string;
  date: string;
  entityName: string;
  articleCode: 'CAC200' | 'CAC201';
  articleName: string;
  warehouse: string;
  weightKg: number;
  unitCostUsd: number;
  subtotalUsd: number;
  week: string;
}

const INITIAL_COMPRAS: TradeArticleItem[] = [
  { id: 'REC-001', docNumber: 'FAC-9941', date: '2026-09-07', entityName: 'Hacienda San José - Barlovento', articleCode: 'CAC201', articleName: 'Cacao Fino Grado 1', warehouse: 'ALM-CENTRAL', weightKg: 12500, unitCostUsd: 3.42, subtotalUsd: 42750.00, week: 'Sem 35' },
  { id: 'REC-002', docNumber: 'FAC-9942', date: '2026-09-06', entityName: 'Agropecuaria El Porvenir', articleCode: 'CAC200', articleName: 'Cacao Corriente', warehouse: 'ALM-BARLOVENTO', weightKg: 8400, unitCostUsd: 2.95, subtotalUsd: 24780.00, week: 'Sem 35' },
  { id: 'REC-003', docNumber: 'FAC-9945', date: '2026-09-05', entityName: 'Cooperativa Cacaotera Ocumare', articleCode: 'CAC201', articleName: 'Cacao Fino Grado 1', warehouse: 'ALM-CENTRAL', weightKg: 15200, unitCostUsd: 3.40, subtotalUsd: 51680.00, week: 'Sem 35' },
  { id: 'REC-004', docNumber: 'FAC-9930', date: '2026-09-02', entityName: 'Asociación Cacao Sucre', articleCode: 'CAC200', articleName: 'Cacao Corriente', warehouse: 'ALM-[#2]', weightKg: 6100, unitCostUsd: 2.90, subtotalUsd: 17690.00, week: 'Sem 34' },
  { id: 'REC-005', docNumber: 'FAC-9922', date: '2026-08-28', entityName: 'Finca La Coromoto', articleCode: 'CAC201', articleName: 'Cacao Fino Grado 1', warehouse: 'ALM-CENTRAL', weightKg: 18000, unitCostUsd: 3.38, subtotalUsd: 60840.00, week: 'Sem 34' },
];

const INITIAL_VENTAS: TradeArticleItem[] = [
  { id: 'VEN-001', docNumber: 'EXP-1044', date: '2026-09-06', entityName: 'Nestlé Venezuela, S.A.', articleCode: 'CAC201', articleName: 'Cacao Fino Grado 1', warehouse: 'ALM-CENTRAL', weightKg: 25000, unitCostUsd: 4.85, subtotalUsd: 121250.00, week: 'Sem 35' },
  { id: 'VEN-002', docNumber: 'EXP-1045', date: '2026-09-04', entityName: 'Chocolates Chocolart C.A.', articleCode: 'CAC200', articleName: 'Cacao Corriente', warehouse: 'ALM-BARLOVENTO', weightKg: 12000, unitCostUsd: 3.90, subtotalUsd: 46800.00, week: 'Sem 35' },
  { id: 'VEN-003', docNumber: 'EXP-1038', date: '2026-08-30', entityName: 'Nestlé Venezuela, S.A.', articleCode: 'CAC201', articleName: 'Cacao Fino Grado 1', warehouse: 'ALM-CENTRAL', weightKg: 30000, unitCostUsd: 4.82, subtotalUsd: 144600.00, week: 'Sem 34' },
];

interface CacaoTradeModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

export const CacaoTradeModule: React.FC<CacaoTradeModuleProps> = ({ currency, bcvRate }) => {
  const [tradeType, setTradeType] = useState<'Compras' | 'Ventas'>('Compras');
  const [codeFilter, setCodeFilter] = useState<'ALL' | 'CAC200' | 'CAC201'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [compras, setCompras] = useState<TradeArticleItem[]>(INITIAL_COMPRAS);
  const [ventas, setVentas] = useState<TradeArticleItem[]>(INITIAL_VENTAS);
  const [isDragOver, setIsDragOver] = useState(false);

  const activeRecords = tradeType === 'Compras' ? compras : ventas;

  const formatMoney = (usd: number) => {
    if (currency === 'VES') {
      return `Bs. ${(usd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === 'EUR') {
      return `€ ${(usd * 0.92).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$ ${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredRecords = useMemo(() => {
    return activeRecords.filter((rec) => {
      const matchCode = codeFilter === 'ALL' || rec.articleCode === codeFilter;
      const matchSearch =
        rec.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.docNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.warehouse.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCode && matchSearch;
    });
  }, [activeRecords, codeFilter, searchQuery]);

  // Aggregate Computations
  const totalComprasKg = useMemo(() => compras.reduce((acc, c) => acc + c.weightKg, 0), [compras]);
  const estimatedComprasKg = 80000; // 80 TM
  const totalComprasUsd = useMemo(() => compras.reduce((acc, c) => acc + c.subtotalUsd, 0), [compras]);
  const avgCostCompraUsd = totalComprasKg > 0 ? totalComprasUsd / totalComprasKg : 0;

  const totalVentasKg = useMemo(() => ventas.reduce((acc, v) => acc + v.weightKg, 0), [ventas]);
  const totalVentasUsd = useMemo(() => ventas.reduce((acc, v) => acc + v.subtotalUsd, 0), [ventas]);
  const avgPriceVentaUsd = totalVentasKg > 0 ? totalVentasUsd / totalVentasKg : 0;

  // Fee preliminar calculado = Margin Venta vs Compra por Kg * Ventas Kg
  const marginPerKgUsd = avgPriceVentaUsd - avgCostCompraUsd;
  const calculatedFeeUsd = marginPerKgUsd * totalVentasKg;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate Excel / PDF Report Parse
    const newItems: TradeArticleItem[] = [
      {
        id: `IMP-${Date.now()}-1`,
        docNumber: `PF-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        entityName: 'Importado de Reporte - AgroSucre C.A.',
        articleCode: 'CAC201',
        articleName: 'Cacao Fino Grado 1',
        warehouse: 'ALM-CENTRAL',
        weightKg: 14200,
        unitCostUsd: 3.41,
        subtotalUsd: 48422.00,
        week: 'Sem 35',
      },
    ];

    if (tradeType === 'Compras') {
      setCompras([...newItems, ...compras]);
    } else {
      setVentas([...newItems, ...ventas]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#5C3A21]">scale</span>
            <span>Módulo 2: Compras y Ventas de Cacao</span>
          </h2>
          <p className="text-xs text-slate-500">
            Ingesta masiva desde Reportes de Sistema (Artículos <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">CAC200</code> / <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">CAC201</code>).
          </p>
        </div>

        {/* Tab Switcher Compras vs Ventas */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl font-semibold text-xs border border-slate-300/60">
          <button
            onClick={() => setTradeType('Compras')}
            className={`px-4 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              tradeType === 'Compras'
                ? 'bg-[#5C3A21] text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
            <span>Compras de Grano</span>
          </button>
          <button
            onClick={() => setTradeType('Ventas')}
            className={`px-4 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              tradeType === 'Ventas'
                ? 'bg-[#5C3A21] text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
            <span>Ventas de Grano</span>
          </button>
        </div>
      </div>

      {/* Computed KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            TOTAL KILOS COMPRADOS VS ESTIMADOS
          </span>
          <div className="text-xl font-bold font-mono-num text-slate-900 mt-1">
            {(totalComprasKg / 1000).toFixed(2)} <span className="text-xs font-semibold text-slate-500">TM</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (totalComprasKg / estimatedComprasKg) * 100)}%` }}
            ></div>
          </div>
          <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">
            {totalComprasKg.toLocaleString()} KG de {estimatedComprasKg.toLocaleString()} KG Est.
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            COSTO PROM. PONDERADO COMPRA
          </span>
          <div className="text-xl font-bold font-mono-num text-emerald-700 mt-1">
            ${avgCostCompraUsd.toFixed(2)} <span className="text-xs font-normal text-slate-500">/ KG</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono-num mt-1 block">
            {formatMoney(avgCostCompraUsd)} / KG en Tasa BCV
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            PRECIO PROM. PONDERADO VENTA
          </span>
          <div className="text-xl font-bold font-mono-num text-[#5C3A21] mt-1">
            ${avgPriceVentaUsd.toFixed(2)} <span className="text-xs font-normal text-slate-500">/ KG</span>
          </div>
          <span className="text-[11px] text-[#5C3A21] font-semibold mt-1 block">
            Contratos Nestlé / Exportación
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-200 bg-amber-50/40 shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            FEE EFECTIVO PRELIMINAR
          </span>
          <div className="text-xl font-bold font-mono-num text-amber-900 mt-1">
            {formatMoney(calculatedFeeUsd)}
          </div>
          <span className="text-[11px] text-amber-700 font-medium mt-1 block">
            Margen Spread: +${marginPerKgUsd.toFixed(2)} / KG
          </span>
        </div>
      </div>

      {/* Mass Ingestion Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); }}
        className={`bg-white border-2 border-dashed rounded-xl p-5 text-center transition-all ${
          isDragOver ? 'border-[#5C3A21] bg-[#5C3A21]/5' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="max-w-md mx-auto space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-[#5C3A21] mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Ingesta Masiva de Archivos ({tradeType} por Artículo)
          </h3>
          <p className="text-xs text-slate-500">
            Arrastra el reporte <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono-num">{tradeType}_Por_Articulo.xlsx</code> o archivo PDF de soporte.
          </p>

          <label className="inline-flex items-center space-x-1.5 bg-[#5C3A21] hover:bg-[#432A18] text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-xs">
            <span className="material-symbols-outlined text-[16px]">file_open</span>
            <span>Seleccionar Reporte Excel / CSV</span>
            <input type="file" accept=".xlsx,.csv,.xls" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Dense Audit Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-3">
        {/* Table Toolbar & Quick Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <span className="material-symbols-outlined text-slate-600">table_rows</span>
              <span>Libro de Ingesta Operativa ({tradeType})</span>
            </h3>

            {/* Quick Rubro Filters */}
            <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setCodeFilter('ALL')}
                className={`px-2 py-0.5 rounded ${codeFilter === 'ALL' ? 'bg-[#5C3A21] text-white' : 'text-slate-600'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setCodeFilter('CAC200')}
                className={`px-2 py-0.5 rounded ${codeFilter === 'CAC200' ? 'bg-[#5C3A21] text-white' : 'text-slate-600'}`}
              >
                CAC200 (Corriente)
              </button>
              <button
                onClick={() => setCodeFilter('CAC201')}
                className={`px-2 py-0.5 rounded ${codeFilter === 'CAC201' ? 'bg-[#5C3A21] text-white' : 'text-slate-600'}`}
              >
                CAC201 (Fino)
              </button>
            </div>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por doc, cliente o almacén..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5C3A21] w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 font-mono-num">
                <th className="py-2.5 px-3">Semana</th>
                <th className="py-2.5 px-3">Nro. Documento</th>
                <th className="py-2.5 px-3">Fecha Emisión</th>
                <th className="py-2.5 px-3">{tradeType === 'Compras' ? 'Proveedor' : 'Cliente'}</th>
                <th className="py-2.5 px-3">Código / Rubro</th>
                <th className="py-2.5 px-3">Almacén</th>
                <th className="py-2.5 px-3 text-right">Cantidad (KG)</th>
                <th className="py-2.5 px-3 text-right">Costo/Precio Unit.</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono-num text-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-slate-400 font-sans">
                    No hay registros coincidentes para {tradeType}.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-500">{item.week}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{item.docNumber}</td>
                    <td className="py-2 px-3 text-slate-500">{item.date}</td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-900">{item.entityName}</td>
                    <td className="py-2 px-3 font-sans">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.articleCode === 'CAC201' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {item.articleCode} - {item.articleName}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{item.warehouse}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">{item.weightKg.toLocaleString()} KG</td>
                    <td className="py-2 px-3 text-right text-slate-600">${item.unitCostUsd.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-bold text-[#5C3A21]">{formatMoney(item.subtotalUsd)}</td>
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
