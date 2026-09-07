import { useState } from 'react';
import { Navbar } from './components/Navbar';
import type { ModuleView, CurrencyMode } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { CacaoTradeModule } from './components/CacaoTradeModule';
import { MonthlyExpensesModule } from './components/MonthlyExpensesModule';
import { YtdExpensesModule } from './components/YtdExpensesModule';
import { ProfitPlusImporterModule } from './components/ProfitPlusImporterModule';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('admin');
  const [currentView, setCurrentView] = useState<ModuleView>('trade');
  const [currency, setCurrency] = useState<CurrencyMode>('USD');

  // Official Central Bank fixing rate
  const bcvRate = 36.42;

  const handleLoginSuccess = (role: string) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} bcvRate={bcvRate} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#0D1C2E] flex flex-col font-sans">
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        currency={currency}
        setCurrency={setCurrency}
        userRole={userRole}
        onLogout={handleLogout}
        bcvRate={bcvRate}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'trade' && (
          <CacaoTradeModule currency={currency} bcvRate={bcvRate} />
        )}
        {currentView === 'monthly' && (
          <MonthlyExpensesModule currency={currency} bcvRate={bcvRate} />
        )}
        {currentView === 'ytd' && (
          <YtdExpensesModule currency={currency} bcvRate={bcvRate} />
        )}
        {currentView === 'importer' && (
          <ProfitPlusImporterModule currency={currency} bcvRate={bcvRate} />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 font-mono-num">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>APRONFIN ERP v2.4 • Agropecuaria Aprocao, C.A. • RIF: J-40812903-1</span>
          <span>Supabase Auth & Profit Plus 2K12 Connector Activos</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
