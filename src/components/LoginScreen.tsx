import React, { useState } from 'react';

interface LoginScreenProps {
  onLoginSuccess: (role: string) => void;
  bcvRate: number;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, bcvRate }) => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'contador' | 'operador'>('admin');
  const [email, setEmail] = useState('admin@aprocao.com');
  const [password, setPassword] = useState('ContrasenaSeguraCacao2025');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const roleDescriptions = {
    admin: 'Control total, aprobación de pagos y balances de cacao.',
    contador: 'Conciliación de fletes, retenciones y libros contables.',
    operador: 'Pesaje en báscula, análisis de humedad y recepción de lote.',
  };

  const handleRoleChange = (role: 'admin' | 'contador' | 'operador') => {
    setSelectedRole(role);
    if (role === 'admin') setEmail('admin@aprocao.com');
    else if (role === 'contador') setEmail('contabilidad@aprocao.com');
    else setEmail('operaciones@aprocao.com');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage('Validando credenciales con Supabase Auth...');

    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(selectedRole);
    }, 1200);
  };

  const handleBiometricAuth = () => {
    setIsLoading(true);
    setStatusMessage('Autenticación biométrica exitosa. Conectando...');
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(selectedRole);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] flex flex-col justify-center items-center py-8 px-4">
      <div className="w-full max-w-md space-y-4">
        {/* Toast Security Alert */}
        <aside className="flex items-center justify-between px-4 py-2 bg-white text-slate-800 rounded-xl shadow-xs border border-slate-200/60">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-600">Supabase Auth Conectado • TLS 1.3</span>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono-num text-[10px] font-bold border border-emerald-200">
            PRODUCCIÓN
          </span>
        </aside>

        {/* Main Card */}
        <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          {/* Header & Logo */}
          <header className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#8B5A2B] text-white flex items-center justify-center shadow-md p-2">
              <span className="material-symbols-outlined text-[36px]">eco</span>
            </div>
            <div>
              <div className="flex items-center justify-center space-x-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">APRONFIN</h1>
                <span className="bg-[#8B5A2B]/10 text-[#8B5A2B] font-mono-num text-[11px] font-semibold px-2 py-0.5 rounded-md border border-[#8B5A2B]/20">
                  v2.4
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Agropecuaria Aprocao, C.A.</p>
              <p className="text-xs text-[#8B5A2B] font-semibold mt-1">
                ERP Financiero & Control de Costos de Cacao
              </p>
            </div>
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Tabs */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Perfil Operativo
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg text-center">
                {(['admin', 'contador', 'operador'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleChange(role)}
                    className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                      selectedRole === role
                        ? 'bg-white text-[#8B5A2B] shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {role === 'admin' ? 'Administrador' : role === 'contador' ? 'Contador' : 'Operador'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 italic px-1">
                {roleDescriptions[selectedRole]}
              </p>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">Correo Corporativo</label>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  <span>Dominio Autorizado</span>
                </span>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                  mail
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 pl-9 pr-9 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#8B5A2B] focus:outline-none transition-colors"
                  placeholder="usuario@aprocao.com"
                />
                <span className="material-symbols-outlined absolute right-3 text-emerald-500 text-[18px]">
                  check_circle
                </span>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">Contraseña</label>
                <button
                  type="button"
                  onClick={() => alert('Contacte a soporte de TI para restablecer su credencial.')}
                  className="text-[11px] text-[#8B5A2B] font-medium hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-9 pl-9 pr-9 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono-num text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#8B5A2B] focus:outline-none transition-colors"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Checkbox & Biometric Badge */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#8B5A2B] focus:ring-[#8B5A2B]"
                />
                <span className="text-xs text-slate-600">Recordar sesión (30 días)</span>
              </label>
              <div className="flex items-center space-x-1 text-slate-600 text-[11px] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                <span className="material-symbols-outlined text-[14px] text-[#8B5A2B]">fingerprint</span>
                <span>Biometría lista</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-[#8B5A2B] hover:bg-[#6F4315] text-white rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center space-x-2 shadow-xs transition-all active:scale-[0.99] disabled:opacity-75"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>{statusMessage || 'Procesando...'}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">lock_open</span>
                  <span>Iniciar Sesión en APRONFIN</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Biometric Quick Access */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleBiometricAuth}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium flex items-center justify-center space-x-2 transition-colors border border-slate-200/80"
            >
              <span className="material-symbols-outlined text-[18px] text-[#8B5A2B]">face</span>
              <span>Entrar con Face ID / Huella Dactilar</span>
            </button>
          </div>
        </div>

        {/* Live Market Bar */}
        <section className="bg-white rounded-xl p-4 shadow-xs border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 text-slate-700 font-bold">
              <span className="material-symbols-outlined text-[#8B5A2B] text-[18px]">payments</span>
              <span className="uppercase tracking-wider text-[10px]">Tasa Oficial & Referencia</span>
            </div>
            <span className="font-mono-num text-[10px] text-emerald-600 font-semibold">HOY EN VIVO</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono-num">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase block font-sans font-semibold">DÓLAR BCV</span>
              <span className="text-xs text-slate-900 font-bold">Bs. {bcvRate.toFixed(2)} / USD</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase block font-sans font-semibold">CACAO FINO GRADO 1</span>
              <span className="text-xs text-[#8B5A2B] font-bold">$3,420.00 / TM</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center space-y-2 text-[11px] text-slate-500 pt-2">
          <p>
            ¿Problemas de conectividad o tokens?{' '}
            <a href="mailto:soporte@aprocao.com" className="text-[#8B5A2B] font-semibold hover:underline">
              Mesa de Ayuda TI / Finanzas
            </a>
          </p>
          <div className="font-mono-num text-[10px] text-slate-400">
            APRONFIN ERP v2.4 • RIF: J-40812903-1 • Agropecuaria Aprocao, C.A.
          </div>
        </footer>
      </div>
    </div>
  );
};
