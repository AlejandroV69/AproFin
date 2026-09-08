import { useState, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import type { ModuleView, CurrencyMode } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { CacaoTradeModule } from './components/CacaoTradeModule';
import { MonthlyExpensesModule } from './components/MonthlyExpensesModule';
import { YtdExpensesModule } from './components/YtdExpensesModule';
import { ProfitPlusImporterModule } from './components/ProfitPlusImporterModule';

// Lazy-loaded advanced modules
const CashFlowModuleLazy = lazy(() => import('./components/CashFlowModule').then(m => ({ default: m.CashFlowModule })));
const BudgetModuleLazy = lazy(() => import('./components/BudgetExecutionModule').then(m => ({ default: m.BudgetExecutionModule })));
const SummaryModuleLazy = lazy(() => import('./components/ExecutiveSummaryModule').then(m => ({ default: m.ExecutiveSummaryModule })));
const ProjectionModuleLazy = lazy(() => import('./components/ProjectionModule').then(m => ({ default: m.ProjectionModule })));
const EstructuraModuleLazy = lazy(() => import('./components/EstructuraCostosModule').then(m => ({ default: m.EstructuraCostosModule })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex items-center gap-3 text-slate-500">
      <div className="w-5 h-5 border-2 border-[#8B5A2B] border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-semibold">Cargando módulo...</span>
    </div>
  </div>
);

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('admin');
  const [currentView, setCurrentView] = useState<ModuleView>('importer');
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

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={<LoadingFallback />}>
          {currentView === 'importer' && <ProfitPlusImporterModule currency={currency} bcvRate={bcvRate} />}
          {currentView === 'trade' && <CacaoTradeModule currency={currency} bcvRate={bcvRate} />}
          {currentView === 'monthly' && <MonthlyExpensesModule currency={currency} bcvRate={bcvRate} />}
          {currentView === 'ytd' && <YtdExpensesModule currency={currency} bcvRate={bcvRate} />}
        </Suspense>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 font-mono-num">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>APRONFIN ERP v2.4 • Agropecuaria Aprocao, C.A. • RIF: J-40812903-1</span>
          <span>Integración Operativa Profit Plus 2K12 & Libros de Excel .xlsm</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
