// src/pages/LoginEnterprise.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Mail, Lock, Loader2, Building2 } from 'lucide-react';
import logoAlpha from '../img/Logo_Alpha.png';

export default function LoginEnterprise(): React.ReactElement {
  const navigate = useNavigate();
  const { signIn } = useAuth();
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
    <div className="min-h-screen flex">
      {/* Left panel - 60% institutional */}
      <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <img src={logoAlpha} alt="Gestão Médica Alpha" className="h-12 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-bold">Gestão Médica Alpha</h1>
            <p className="text-blue-200 text-xs">Enterprise SaaS Platform</p>
          </div>
        </div>

        <div className="max-w-lg">
          <h2 className="text-3xl font-bold mb-4 leading-tight">
            Plataforma de gestão médica multiunidade
          </h2>
          <p className="text-blue-100 text-base leading-relaxed mb-6">
            Central administrativa, unidades, médicos, escalas, plantões e produção médica em um único sistema seguro e auditável.
          </p>
          <div className="flex items-center gap-6 text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>Central + 10 unidades</span>
            </div>
            <div className="flex items-center gap-2">
              <span>RBAC + RLS + Auditoria</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-blue-300">
          © 2026 Gestão Médica Alpha. Todos os direitos reservados.
        </div>
      </div>

      {/* Right panel - 40% auth form */}
      <div className="flex-1 lg:w-2/5 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img src={logoAlpha} alt="Gestão Médica Alpha" className="h-10 w-auto object-contain" />
            <span className="text-lg font-bold text-gray-900 dark:text-white">Gestão Médica Alpha</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bem-vindo de volta</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Acesse sua plataforma de gestão médica</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
            <a href="/recuperar-senha" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors">
              Recuperar senha
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}