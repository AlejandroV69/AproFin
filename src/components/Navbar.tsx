import React from 'react';

export type ModuleView = 'trade' | 'monthly' | 'ytd' | 'importer';
export type CurrencyMode = 'USD' | 'VES' | 'EUR';

interface NavbarProps {
  currentView: ModuleView;
  setCurrentView: (view: ModuleView) => void;
  currency: CurrencyMode;
  setCurrency: (c: CurrencyMode) => void;
  userRole: string;
  onLogout: () => void;
  bcvRate: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  currency,
  setCurrency,
  userRole,
  onLogout,
  bcvRate,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner: Market Rates & Indicators */}
      <div className="bg-[#0F172A] text-white text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 font-mono-num">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-slate-300">TASA BCV OFICIAL:</span>
            <span className="text-emerald-400 font-bold">Bs. {bcvRate.toFixed(2)} / USD</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-300">CACAO FINO GRADO 1 (ICCO):</span>
            <span className="text-amber-400 font-bold">$3,420.00 / TM</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-slate-400">
          <span>TLS 1.3 ENCRYPTED</span>
          <span>•</span>
          <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full font-sans font-semibold text-[10px] tracking-wide border border-emerald-800">
            PRODUCCIÓN OK
          </span>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Isotype */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('trade')}>
            <div className="w-10 h-10 rounded-lg bg-[#8B5A2B] text-white flex items-center justify-center font-bold text-xl shadow-xs">
              <span className="material-symbols-outlined">eco</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">APRONFIN</span>
                <span className="bg-[#8B5A2B]/10 text-[#8B5A2B] font-semibold text-[10px] px-1.5 py-0.5 rounded-md border border-[#8B5A2B]/20">
                  v2.4 ERP
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Agropecuaria Aprocao, C.A.</p>
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <nav className="hidden md:flex space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setCurrentView('trade')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 ${
                currentView === 'trade'
                  ? 'bg-white text-[#8B5A2B] shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">scale</span>
              <span>1. Compras & Ventas</span>
            </button>

            <button
              onClick={() => setCurrentView('monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 ${
                currentView === 'monthly'
                  ? 'bg-white text-[#8B5A2B] shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">payments</span>
              <span>2. Gastos del Mes</span>
            </button>

            <button
              onClick={() => setCurrentView('ytd')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 ${
                currentView === 'ytd'
                  ? 'bg-white text-[#8B5A2B] shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">analytics</span>
              <span>3. Estructura YTD</span>
            </button>

            <button
              onClick={() => setCurrentView('importer')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 ${
                currentView === 'importer'
                  ? 'bg-white text-[#8B5A2B] shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>4. Profit Plus ERP</span>
            </button>
          </nav>

          {/* Right Controls: Currency Switcher & Profile */}
          <div className="flex items-center space-x-3">
            {/* Currency Pill */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-mono-num font-semibold">
              {(['USD', 'VES', 'EUR'] as CurrencyMode[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2 py-1 rounded-md transition-all ${
                    currency === c
                      ? 'bg-[#8B5A2B] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Profile Info */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <span className="block text-xs font-bold text-slate-800 capitalize">{userRole}</span>
                <span className="block text-[10px] text-slate-500">Acceso Verificado</span>
              </div>
              <button
                onClick={onLogout}
                title="Cerrar Sesión"
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex overflow-x-auto pb-2 space-x-1 border-t border-slate-100 pt-2">
          <button
            onClick={() => setCurrentView('trade')}
            className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${
              currentView === 'trade' ? 'bg-[#8B5A2B] text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Compras & Ventas
          </button>
          <button
            onClick={() => setCurrentView('monthly')}
            className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${
              currentView === 'monthly' ? 'bg-[#8B5A2B] text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Gastos Mes
          </button>
          <button
            onClick={() => setCurrentView('ytd')}
            className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${
              currentView === 'ytd' ? 'bg-[#8B5A2B] text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Estructura YTD
          </button>
          <button
            onClick={() => setCurrentView('importer')}
            className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${
              currentView === 'importer' ? 'bg-[#8B5A2B] text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Profit Plus
          </button>
        </div>
      </div>
    </header>
  );
};
