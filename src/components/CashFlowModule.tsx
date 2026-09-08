import React, { useState, useMemo } from 'react';
import type { CurrencyMode } from './Navbar';

interface WeekData {
  semana: number;
  fecha: string;
  // FEE Estimado
  kilogramasEstimados: number;
  // Gastos Ejecutados
  gastosEjecutados: number;
  prestamosBancarios: number;
  // Ventas Nestlé
  kgVendidos: number;
  montoVentaBs: number;
  feeRealVenta: number;
  // Compras
  kgComprados: number;
  montoCompraBs: number;
  precioPromCompra: number;
  feeCorregido: number;
  // ND por diferencia
  diferenciaEnPrecio: number;
  kgFacturados: number;
}

const WEEKS: WeekData[] = [
  {
    semana: 32, fecha: '1/8/2026',
    kilogramasEstimados: 25000, gastosEjecutados: 21791913, prestamosBancarios: 0,
    kgVendidos: 20300, montoVentaBs: 68325203, feeRealVenta: 1073.49,
    kgComprados: 20975, montoCompraBs: 72985959, precioPromCompra: 3547.31, feeCorregido: 4620.80,
    diferenciaEnPrecio: 260.60, kgFacturados: 20300,
  },
  {
    semana: 33, fecha: '10/8/2026',
    kilogramasEstimados: 25000, gastosEjecutados: 10469191, prestamosBancarios: 0,
    kgVendidos: 17798, montoVentaBs: 76913220, feeRealVenta: 588.22,
    kgComprados: 18111, montoCompraBs: 64305544, precioPromCompra: 3550.63, feeCorregido: 4138.85,
    diferenciaEnPrecio: -182.60, kgFacturados: 17298,
  },
  {
    semana: 34, fecha: '17/8/2026',
    kilogramasEstimados: 25000, gastosEjecutados: 15044479, prestamosBancarios: 0,
    kgVendidos: 13153, montoVentaBs: 61139906, feeRealVenta: 1143.81,
    kgComprados: 12575, montoCompraBs: 51265928, precioPromCompra: 4076.81, feeCorregido: 5220.62,
    diferenciaEnPrecio: 572.26, kgFacturados: 13153,
  },
  {
    semana: 35, fecha: '24/8/2026',
    kilogramasEstimados: 25000, gastosEjecutados: 17692800, prestamosBancarios: 0,
    kgVendidos: 16255, montoVentaBs: 76431010, feeRealVenta: 1088.46,
    kgComprados: 16245, montoCompraBs: 71874773, precioPromCompra: 4424.42, feeCorregido: 5512.88,
    diferenciaEnPrecio: 810.88, kgFacturados: 16255,
  },
  {
    semana: 52, fecha: '0/1/1900',
    kilogramasEstimados: 0, gastosEjecutados: 0, prestamosBancarios: 0,
    kgVendidos: 0, montoVentaBs: 0, feeRealVenta: 0,
    kgComprados: 0, montoCompraBs: 0, precioPromCompra: 0, feeCorregido: 0,
    diferenciaEnPrecio: 0, kgFacturados: 0,
  },
];

interface CashFlowModuleProps {
  currency: CurrencyMode;
  bcvRate: number;
}

const fmt = (v: number, dec = 2) =>
  v === 0 ? '0' : v.toLocaleString('es-VE', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtUsd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const CashFlowModule: React.FC<CashFlowModuleProps> = ({ bcvRate }) => {
  // Variables Panel (right side in Excel)
  const [halEfectivo, setHalEfectivo] = useState(1.25);
  const [tnsProyectadas, setTnsProyectadas] = useState(58);
  const [precioCompraUsd, setPrecioCompraUsd] = useState(5.00);
  const [precioVentaUsd, setPrecioVentaUsd] = useState(4.4854);

  const precioCompraBs = precioCompraUsd * bcvRate;
  const precioVentaBs = precioVentaUsd * bcvRate;

  // Consolidated totals
  const totals = useMemo(() => ({
    kgEstimados: WEEKS.reduce((a, w) => a + w.kilogramasEstimados, 0),
    gastosEjec: WEEKS.reduce((a, w) => a + w.gastosEjecutados, 0),
    kgVendidos: WEEKS.reduce((a, w) => a + w.kgVendidos, 0),
    montoVentas: WEEKS.reduce((a, w) => a + w.montoVentaBs, 0),
    kgComprados: WEEKS.reduce((a, w) => a + w.kgComprados, 0),
    montoCompras: WEEKS.reduce((a, w) => a + w.montoCompraBs, 0),
    kgFacturados: WEEKS.reduce((a, w) => a + w.kgFacturados, 0),
    notaDebito: WEEKS.reduce((a, w) => a + Math.abs(w.diferenciaEnPrecio * w.kgFacturados), 0),
  }), []);

  const feeEstimadoSemanal = (w: WeekData) =>
    w.kilogramasEstimados > 0 ? (w.gastosEjecutados / w.kilogramasEstimados) : 0;

  const feeRealSemanal = (w: WeekData) =>
    w.kgVendidos > 0 ? (w.montoVentaBs / w.kgVendidos) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8B5A2B]">account_balance_wallet</span>
            Flujo de Caja Ejecutado – Agosto 2026
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Semanas 32 al 35 • Ventas Nestlé • Compras Productores • FEE Real vs Estimado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#8B5A2B]/10 text-[#8B5A2B] text-xs font-bold px-3 py-1 rounded-full border border-[#8B5A2B]/20">
            Semanas 32 → 35 | Consolidado
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Main Table (3/4 width) */}
        <div className="xl:col-span-3 space-y-4">

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'KG VENDIDOS TOTAL', value: `${(totals.kgVendidos / 1000).toFixed(1)} TM`, sub: `${totals.kgVendidos.toLocaleString()} KG`, color: 'text-emerald-700' },
              { label: 'KG COMPRADOS TOTAL', value: `${(totals.kgComprados / 1000).toFixed(1)} TM`, sub: `${totals.kgComprados.toLocaleString()} KG`, color: 'text-[#8B5A2B]' },
              { label: 'MONTO VENTAS (Bs.)', value: `Bs. ${(totals.montoVentas / 1e9).toFixed(3)}B`, sub: fmt(totals.montoVentas / bcvRate) + ' USD equiv.', color: 'text-emerald-700' },
              { label: 'NOTA DE DÉBITO ESTIMADA', value: fmtUsd(totals.notaDebito / bcvRate), sub: `Bs. ${fmt(totals.notaDebito / 1e6, 3)}M`, color: 'text-amber-700' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{k.label}</span>
                <div className={`text-lg font-bold font-mono-num mt-1 ${k.color}`}>{k.value}</div>
                <span className="text-[11px] text-slate-500 font-mono-num">{k.sub}</span>
              </div>
            ))}
          </div>

          {/* Main Weekly Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="bg-[#0F172A] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-bold tracking-wide">FLUJO DE CAJA EJECUTADO — SEMANAS 32 AL 35 + CONSOLIDADO</span>
              <span className="text-[11px] text-slate-400 font-mono-num">Agropecuaria Aprocao, C.A.</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono-num">
                <thead>
                  <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-3 w-48 font-semibold">Concepto</th>
                    {WEEKS.slice(0, 4).map(w => (
                      <th key={w.semana} className="py-2 px-2 text-right font-semibold">
                        <div>{w.fecha}</div>
                        <div className="text-slate-400">Sem {w.semana}</div>
                      </th>
                    ))}
                    <th className="py-2 px-2 text-right font-semibold bg-slate-700">
                      <div>Consolidado</div>
                    </th>
                  </tr>
                </thead>
                <tbody>

                  {/* FEE Estimado Section */}
                  <tr className="bg-amber-50 border-t-2 border-amber-300">
                    <td colSpan={6} className="py-1.5 px-3 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                      FEE ESTIMADO
                    </td>
                  </tr>
                  {[
                    { label: 'Kilos Estimados', key: 'kilogramasEstimados', fmt: (v: number) => v.toLocaleString() + ' KG' },
                    { label: 'FEE Estimado Semanal (Bs./KG)', key: '__fee', fmt: (v: number, w: WeekData) => fmt(feeEstimadoSemanal(w)) },
                  ].map(row => (
                    <tr key={row.label} className="border-b border-slate-100 hover:bg-amber-50/40">
                      <td className="py-1.5 px-3 text-slate-700 font-sans font-medium">{row.label}</td>
                      {WEEKS.slice(0, 4).map(w => (
                        <td key={w.semana} className="py-1.5 px-2 text-right text-slate-900">
                          {row.key === '__fee' ? fmt(feeEstimadoSemanal(w)) : fmt((w as any)[row.key])}
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-right font-bold text-slate-900 bg-amber-50/60">
                        {row.key === 'kilogramasEstimados' ? fmt(totals.kgEstimados) : '—'}
                      </td>
                    </tr>
                  ))}

                  {/* Gastos Ejecutados Section */}
                  <tr className="bg-red-50 border-t-2 border-red-300">
                    <td colSpan={6} className="py-1.5 px-3 text-[10px] font-bold text-red-800 uppercase tracking-wider">
                      GASTOS EJECUTADOS
                    </td>
                  </tr>
                  {[
                    { label: 'Gastos Ejecutados Semanal (Bs.)', key: 'gastosEjecutados' },
                    { label: 'Créditos Financieros / Préstamos', key: 'prestamosBancarios' },
                  ].map(row => (
                    <tr key={row.label} className="border-b border-slate-100 hover:bg-red-50/30">
                      <td className="py-1.5 px-3 text-slate-700 font-sans font-medium">{row.label}</td>
                      {WEEKS.slice(0, 4).map(w => (
                        <td key={w.semana} className="py-1.5 px-2 text-right text-slate-900">
                          {fmt((w as any)[row.key])}
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-right font-bold bg-red-50/60">
                        {row.key === 'gastosEjecutados' ? fmt(totals.gastosEjec) : '0'}
                      </td>
                    </tr>
                  ))}

                  {/* Ventas Nestlé Section */}
                  <tr className="bg-emerald-50 border-t-2 border-emerald-400">
                    <td colSpan={6} className="py-1.5 px-3 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      VENTAS A NESTLÉ
                    </td>
                  </tr>
                  {[
                    { label: 'KG Vendidos / Sem', key: 'kgVendidos', fmt2: (v: number) => v.toLocaleString() + ' KG' },
                    { label: 'Monto Ventas Bs.', key: 'montoVentaBs' },
                    { label: 'FEE Real Semanal (si no venta, base es KG)', key: '__feeRealVenta' },
                  ].map(row => (
                    <tr key={row.label} className="border-b border-slate-100 hover:bg-emerald-50/40">
                      <td className="py-1.5 px-3 text-slate-700 font-sans font-medium text-[11px]">{row.label}</td>
                      {WEEKS.slice(0, 4).map(w => (
                        <td key={w.semana} className="py-1.5 px-2 text-right text-emerald-800 font-semibold">
                          {row.key === '__feeRealVenta'
                            ? fmt(feeRealSemanal(w))
                            : fmt((w as any)[row.key])}
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-right font-bold text-emerald-800 bg-emerald-50/60">
                        {row.key === 'kgVendidos' ? totals.kgVendidos.toLocaleString() + ' KG'
                          : row.key === 'montoVentaBs' ? fmt(totals.montoVentas)
                          : '—'}
                      </td>
                    </tr>
                  ))}

                  {/* Compras Section */}
                  <tr className="bg-blue-50 border-t-2 border-blue-400">
                    <td colSpan={6} className="py-1.5 px-3 text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                      COMPRAS DE CACAO
                    </td>
                  </tr>
                  {[
                    { label: 'KG Comprados / Sem', key: 'kgComprados' },
                    { label: 'Monto Compras Bs.', key: 'montoCompraBs' },
                    { label: 'Precio Promedio Compra (Bs./KG)', key: 'precioPromCompra' },
                    { label: 'Precio Venta Corregido [PC + 11%] (Bs./KG)', key: 'feeCorregido' },
                  ].map(row => (
                    <tr key={row.label} className="border-b border-slate-100 hover:bg-blue-50/30">
                      <td className="py-1.5 px-3 text-slate-700 font-sans font-medium text-[11px]">{row.label}</td>
                      {WEEKS.slice(0, 4).map(w => (
                        <td key={w.semana} className="py-1.5 px-2 text-right text-slate-900">
                          {fmt((w as any)[row.key])}
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-right font-bold bg-blue-50/60">
                        {row.key === 'kgComprados' ? totals.kgComprados.toLocaleString()
                          : row.key === 'montoCompraBs' ? fmt(totals.montoCompras)
                          : '—'}
                      </td>
                    </tr>
                  ))}

                  {/* ND / Nota Débito Section */}
                  <tr className="bg-purple-50 border-t-2 border-purple-400">
                    <td colSpan={6} className="py-1.5 px-3 text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                      ND POR DIFERENCIA EN FEE
                    </td>
                  </tr>
                  {[
                    { label: 'Diferencia en Precio por Pagar (Bs./KG)', key: 'diferenciaEnPrecio', highlight: true },
                    { label: 'Kilogramos Facturados', key: 'kgFacturados' },
                    { label: '(*) Gastos Mínimos (en caso de Facturación Cero)', key: '__gastosMin' },
                  ].map(row => (
                    <tr key={row.label} className="border-b border-slate-100 hover:bg-purple-50/30">
                      <td className="py-1.5 px-3 text-slate-700 font-sans font-medium text-[11px]">{row.label}</td>
                      {WEEKS.slice(0, 4).map(w => (
                        <td key={w.semana} className={`py-1.5 px-2 text-right font-semibold ${
                          row.key === 'diferenciaEnPrecio'
                            ? (w as any)[row.key] < 0 ? 'text-red-600' : 'text-emerald-700'
                            : 'text-slate-900'
                        }`}>
                          {row.key === '__gastosMin' ? '—' : fmt((w as any)[row.key])}
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-right font-bold bg-purple-50/60">
                        {row.key === 'kgFacturados' ? totals.kgFacturados.toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}

                  {/* Nota de Débito Final */}
                  <tr className="bg-[#0F172A] text-white border-t-2 border-[#8B5A2B]">
                    <td className="py-2 px-3 font-bold text-xs">NOTA DE DÉBITO PRELIMINAR (Bs.)</td>
                    {WEEKS.slice(0, 4).map(w => (
                      <td key={w.semana} className="py-2 px-2 text-right font-bold font-mono-num text-amber-400">
                        {fmt(Math.abs(w.diferenciaEnPrecio * w.kgFacturados))}
                      </td>
                    ))}
                    <td className="py-2 px-2 text-right font-bold font-mono-num text-amber-400 bg-slate-800">
                      {fmt(totals.notaDebito)}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Variables Panel (Right, mimics Excel right panel) */}
        <div className="space-y-4">
          <div className="bg-[#0F172A] rounded-xl p-4 space-y-4 text-white shadow-md">
            <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
              <span className="material-symbols-outlined text-[#8B5A2B] text-[20px]">tune</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">VARIABLES OPERATIVAS</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block mb-1">HAL Efectivo Preliminar ($)</label>
                <input
                  type="number" step="0.01" value={halEfectivo}
                  onChange={e => setHalEfectivo(+e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 font-mono-num text-amber-400 font-bold focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block mb-1">TNS Proyectadas</label>
                <input
                  type="number" step="1" value={tnsProyectadas}
                  onChange={e => setTnsProyectadas(+e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 font-mono-num text-white font-bold focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block mb-1">Precio Compra Prom. ($/KG)</label>
                <input
                  type="number" step="0.01" value={precioCompraUsd}
                  onChange={e => setPrecioCompraUsd(+e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 font-mono-num text-white font-bold focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]"
                />
                <span className="text-slate-500 text-[10px] font-mono-num">Bs. {fmt(precioCompraBs)}/KG</span>
              </div>
              <div>
                <label className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block mb-1">Precio Venta Prom. ($/KG)</label>
                <input
                  type="number" step="0.0001" value={precioVentaUsd}
                  onChange={e => setPrecioVentaUsd(+e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 font-mono-num text-white font-bold focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]"
                />
                <span className="text-slate-500 text-[10px] font-mono-num">Bs. {fmt(precioVentaBs)}/KG</span>
              </div>
            </div>

            {/* Computed Indicators */}
            <div className="border-t border-slate-700 pt-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">HAL Total Proyectado ($)</span>
                <span className="font-mono-num text-amber-400 font-bold">
                  {fmtUsd(halEfectivo * tnsProyectadas * 1000)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Margen Compra→Venta</span>
                <span className="font-mono-num text-emerald-400 font-bold">
                  {fmtUsd(precioVentaUsd - precioCompraUsd)}/KG
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Nota de Débito Est. (USD)</span>
                <span className="font-mono-num text-amber-400 font-bold">
                  {fmtUsd(totals.notaDebito / bcvRate)}
                </span>
              </div>
            </div>
          </div>

          {/* Weeks Summary Cards */}
          {WEEKS.slice(0, 4).map(w => (
            <div key={w.semana} className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-700">Semana {w.semana}</span>
                <span className="text-[10px] text-slate-500 font-mono-num">{w.fecha}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-mono-num">
                <div>
                  <span className="text-slate-500">Vendido:</span>
                  <span className="text-emerald-700 font-bold ml-1">{(w.kgVendidos / 1000).toFixed(1)} TM</span>
                </div>
                <div>
                  <span className="text-slate-500">Comprado:</span>
                  <span className="text-[#8B5A2B] font-bold ml-1">{(w.kgComprados / 1000).toFixed(1)} TM</span>
                </div>
                <div>
                  <span className="text-slate-500">FEE Real:</span>
                  <span className={`font-bold ml-1 ${w.feeRealVenta > 1000 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {fmt(feeRealSemanal(w))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">ΔPrecio:</span>
                  <span className={`font-bold ml-1 ${w.diferenciaEnPrecio < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {fmt(w.diferenciaEnPrecio)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
