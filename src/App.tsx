import { useState, lazy, Suspense, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import type { ModuleView, CurrencyMode } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { CacaoTradeModule } from './components/CacaoTradeModule';
import { MonthlyExpensesModule } from './components/MonthlyExpensesModule';
import { YtdExpensesModule } from './components/YtdExpensesModule';
import { ProfitPlusImporterModule } from './components/ProfitPlusImporterModule';
import { onAuthStateChange, signOut } from './lib/auth';
import { useExchangeRates } from './lib/services/exchangeRateService';

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
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string>('admin');
  const [currentView, setCurrentView] = useState<ModuleView>('importer');
  const [currency, setCurrency] = useState<CurrencyMode>('USD');

  // Tasas de cambio en tiempo real desde DolarAPI
  const { bcvRate, eurRate, isLoading: ratesLoading, error: ratesError } = useExchangeRates();

  // Detectar sesión activa al cargar la app
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setIsAuthenticated(!!user);
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLoginSuccess = (role: string) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
  };

  // Pantalla de carga mientras verifica la sesión
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-6 h-6 border-2 border-[#8B5A2B] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
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

      {/* Banner de tasa BCV si hay error al cargar */}
      {ratesError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-700 font-medium flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[16px]">warning</span>
          {ratesError} — Tasa BCV aproximada: ${bcvRate.toFixed(2)}
        </div>
      )}

      {/* Indicador de carga de tasas */}
      {ratesLoading && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-1.5 text-center text-[11px] text-blue-600 font-medium flex items-center justify-center gap-1.5">
          <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
          Actualizando tasa BCV desde DolarAPI...
        </div>
      )}

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={<LoadingFallback />}>
          {currentView === 'importer' && <ProfitPlusImporterModule currency={currency} bcvRate={bcvRate} />}
          {currentView === 'trade' && <CacaoTradeModule currency={currency} bcvRate={bcvRate} />}
          {currentView === 'monthly' && <MonthlyExpensesModule currency={currency} bcvRate={bcvRate} />}
          {currentView === 'ytd' && <YtdExpensesModule currency={currency} bcvRate={bcvRate} />}
          {currentView === 'cashflow' && <CashFlowModuleLazy currency={currency} bcvRate={bcvRate} eurRate={eurRate} />}
          {currentView === 'budget' && <BudgetModuleLazy currency={currency} bcvRate={bcvRate} />}
          {currentView === 'summary' && <SummaryModuleLazy currency={currency} bcvRate={bcvRate} />}
          {currentView === 'projection' && <ProjectionModuleLazy currency={currency} bcvRate={bcvRate} />}
          {currentView === 'estructura' && <EstructuraModuleLazy currency={currency} bcvRate={bcvRate} />}
        </Suspense>
      </main>

      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500 font-mono-num">
        <div className="max-w-[1600px] mx-auto px-4 flex justify-center items-center gap-4">
          <span>APRONFIN ERP • Agropecuaria Aprocao, C.A. • RIF: J-40812903-1</span>
          {!ratesLoading && (
            <span className="text-slate-400">
              BCV: Bs. {bcvRate.toFixed(2)} | EUR: Bs. {eurRate.toFixed(2)}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
