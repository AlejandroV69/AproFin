import React from 'react';

export type ModuleView = 'importer' | 'trade' | 'monthly' | 'ytd';
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
      {/* Main Nav Bar */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Isotype */}
          <div className="flex items-center space-x-2.5 cursor-pointer shrink-0" onClick={() => setCurrentView('importer')}>
            <div className="w-8 h-8 rounded-lg bg-[#5C3A21] text-amber-100 flex items-center justify-center font-bold text-base shadow-xs">
              <span className="material-symbols-outlined text-[18px]">eco</span>
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight">APRONFIN</span>
          </div>

          {/* Module Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {([
              { key: 'importer', icon: 'upload_file', label: 'Gastos Pagados' },
              { key: 'trade', icon: 'scale', label: 'Compras y Ventas' },
              { key: 'monthly', icon: 'calendar_view_week', label: 'Gastado en el Mes' },
              { key: 'ytd', icon: 'table_chart', label: 'Estructura YTD' },
            ] as { key: ModuleView; icon: string; label: string }[]).map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setCurrentView(key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
                  currentView === key
                    ? 'bg-[#5C3A21] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Right Controls: BCV Indicator, Currency Switcher & Profile */}
          <div className="flex items-center space-x-3">
            {/* Global BCV Rate Badge */}
            <div className="hidden sm:flex items-center space-x-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono-num">
              <span className="font-bold text-[10px] text-slate-500 uppercase">BCV:</span>
              <span className="font-bold text-slate-800">Bs. {bcvRate.toFixed(2)}</span>
            </div>

            {/* Currency Selector */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-mono-num font-semibold">
              {(['USD', 'VES', 'EUR'] as CurrencyMode[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    currency === c
                      ? 'bg-[#5C3A21] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Profile Info */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <span className="text-xs font-bold text-slate-700 capitalize hidden sm:inline">{userRole}</span>
              <button
                onClick={onLogout}
                title="Cerrar Sesión"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="lg:hidden flex overflow-x-auto pb-2 space-x-1 border-t border-slate-100 pt-2">
          {([
            { key: 'importer', label: '1. Gastos Pagados' },
            { key: 'trade', label: '2. Compras/Ventas' },
            { key: 'monthly', label: '3. Gastado Mes' },
            { key: 'ytd', label: '4. Matriz YTD' },
          ] as { key: ModuleView; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCurrentView(key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${
                currentView === key ? 'bg-[#5C3A21] text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
