// src/pages/LoginEnterprise.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../core/theme/ThemeProvider';
import { Eye, EyeOff, Mail, Lock, Loader2, Sun, Moon } from 'lucide-react';
import logoDark from '../img/loginalphadark.png';
import logoLight from '../img/loginalphalight.png';
import logoNewWave from '../img/logonewwave.png';

export default function LoginEnterprise(): React.ReactElement {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/welcome');
    } catch (err: any) {
      setError(err?.message || 'Credenciais inválidas. Verifique e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const heroImage = theme === 'dark' ? logoDark : logoLight;
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-slate-950">
      <div className="flex-1 flex">
        {/* Left panel - 60% institutional hero */}
        <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden">
          <img
            src={heroImage}
            alt="Gestão Médica Alpha"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="relative z-10 flex flex-col justify-between p-12 w-full">
            <div />
            <div className="max-w-md">
              <h1 className="text-2xl font-bold text-white mb-1 drop-shadow-lg">Gestão Médica Alpha</h1>
              <p className="text-slate-200 text-sm drop-shadow">Inteligência e controle para a gestão médica</p>
              <p className="text-slate-300 text-xs mt-2 drop-shadow">Central Administrativa · Multiunidade</p>
            </div>
          </div>
        </div>

        {/* Right panel - 40% auth card */}
        <div className="flex-1 lg:w-2/5 flex flex-col items-center justify-center p-6 bg-gray-100 dark:bg-slate-900">
          <div className="w-full max-w-md">
            {/* Theme toggle */}
            <div className="flex justify-end mb-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors"
                aria-label="Alternar tema"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            {/* Mobile hero */}
            <div className="lg:hidden mb-6 rounded-xl overflow-hidden">
              <img src={heroImage} alt="Gestão Médica Alpha" className="w-full h-32 object-cover" />
            </div>

            {/* Login Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl overflow-hidden">
              {/* Card Header - New Wave branding */}
              <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex flex-col items-center">
                <img
                  src={logoNewWave}
                  alt="New Wave Sistemas Digital"
                  className="h-10 w-auto object-contain mb-3"
                />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Acesso ao sistema</h2>
                <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">Bem-vindo de volta</p>
              </div>

              {/* Card Body */}
              <div className="p-6">
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
                  Entre com sua conta institucional
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-lg text-red-700 dark:text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                      E-mail institucional
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-10 pr-12 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Entrando...' : 'Entrar no sistema'}
                  </button>
                </form>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <div className="text-center">
                  <a href="/recuperar-senha" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                    Esqueceu sua senha?
                  </a>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500 text-center mt-2">
                  Acesso seguro e auditado
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 py-3 px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 dark:text-slate-500">
          <span>Gestão Médica Alpha © {year}</span>
          <span>Tecnologia por New Wave Sistemas Digital</span>
        </div>
      </footer>
    </div>
  );
}