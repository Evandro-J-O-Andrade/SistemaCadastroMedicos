// src/pages/LoginEnterprise.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../core/theme/ThemeProvider';
import { Eye, EyeOff, Mail, Lock, Loader2, Sun, Moon } from 'lucide-react';
import logoAlpha from '../img/Logo_Alpha.png';

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

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left panel - 60% institutional dark */}
      <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.08)_0%,_transparent_70%)]" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <img
            src={logoAlpha}
            alt="Gestão Médica Alpha"
            className="w-48 h-48 object-contain mb-8 drop-shadow-2xl"
          />
          <h1 className="text-2xl font-bold text-white mb-2">Gestão Médica Alpha</h1>
          <p className="text-slate-300 text-sm mb-1">Enterprise SaaS Platform</p>
          <p className="text-slate-400 text-sm leading-relaxed mt-4">
            Inteligência para a gestão médica
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Central administrativa e operação multiunidade
          </p>
        </div>

        <div className="absolute bottom-6 text-xs text-slate-500">
          Gestão Médica Alpha © 2026
        </div>
      </div>

      {/* Right panel - 40% auth form */}
      <div className="flex-1 lg:w-2/5 flex items-center justify-center p-8 bg-slate-900">
        <div className="w-full max-w-sm">
          {/* Theme toggle */}
          <div className="flex justify-end mb-6">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <img src={logoAlpha} alt="Gestão Médica Alpha" className="h-16 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Bem-vindo de volta</h2>
            <p className="text-slate-400 text-sm mt-1">Entre com sua conta institucional</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                E-mail institucional
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
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

          <div className="mt-6 text-center">
            <a href="/recuperar-senha" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Esqueceu sua senha?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}