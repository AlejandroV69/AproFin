import React, { useState } from 'react';
import { signInWithEmail } from '../lib/auth';

interface LoginScreenProps {
  onLoginSuccess: (role: string) => void;
  bcvRate?: number;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await signInWithEmail(email, password);
      onLoginSuccess('admin');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Error al iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      {/* Centered Integrated Login Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-lg shadow-slate-200/50 border border-slate-200/80 space-y-6">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#5C3A21] text-amber-100 flex items-center justify-center shadow-md border border-[#5C3A21]/20">
            <span className="material-symbols-outlined text-[30px]">eco</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">APRONFIN</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Agropecuaria Aprocao, C.A.</p>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-start space-x-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700 font-medium">
            <span className="material-symbols-outlined text-[16px] mt-0.5 flex-shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Clean Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Correo Electrónico</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[18px]">
                mail
              </span>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@aprocao.com"
                className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#5C3A21] focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Contraseña</label>
              <button
                type="button"
                onClick={() => alert('Por favor contacte al administrador de TI para restablecer su acceso.')}
                className="text-[11px] text-[#5C3A21] font-semibold hover:underline"
              >
                ¿Olvidaste tu clave?
              </button>
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[18px]">
                lock
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono-num text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#5C3A21] focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-[#5C3A21] hover:bg-[#432A18] text-white rounded-xl text-xs font-bold tracking-wide flex items-center justify-center space-x-2 shadow-md shadow-[#5C3A21]/20 transition-all active:scale-[0.99] disabled:opacity-75 mt-2 cursor-pointer"
          >
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Integrated Footer Info */}
        <footer className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100 font-mono-num">
          Agropecuaria Aprocao, C.A. • RIF: J-40812903-1
        </footer>
      </div>
    </div>
  );
};
