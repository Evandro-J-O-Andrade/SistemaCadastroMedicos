// src/pages/Welcome.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Shield, Users, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { resolverDestino } from '../auth/services/dispatcherService';

export default function Welcome(): React.ReactElement {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fullName = user?.nome || user?.email || 'Usuário';

  const entrar = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      // Conclui a etapa de boas-vindas no servidor (gate: senha + termos/responsabilidade).
      // Sem isto, welcome_pending permanece true e o App redireciona de volta para /welcome.
      const { data, error: welcomeError } = await supabase.rpc('fn_complete_welcome');
      if (welcomeError) throw welcomeError;
      if (data !== true) {
        throw new Error('Não foi possível concluir as boas-vindas. Confirme que senha e documentos estão regularizados.');
      }

      await refresh();

      // Resolve o destino por papel (ROOT global, admin, gestor, etc.) sem depender
      // do registro de células. As etapas de senha/LGPD já foram concluídas no servidor;
      // apenas welcome_pending deixa de bloquear após fn_complete_welcome.
      const dest = resolverDestino({
        ...(user as NonNullable<typeof user>),
        must_change_password: false,
        terms_pending: false,
        responsibility_pending: false,
        welcome_pending: false,
      });
      navigate(dest.destino?.path ?? '/', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao concluir as boas-vindas.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Bem-vindo, {fullName}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">
          Sua plataforma de gestão médica está pronta.
        </p>

        {error && (
          <p role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Central</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Visão consolidada</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Unidades</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gestão por unidade</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <Shield className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Segurança</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">RBAC + RLS</p>
          </div>
        </div>

        <button
          onClick={() => void entrar()}
          disabled={busy}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
        >
          {busy ? 'Concluindo...' : 'Acessar Dashboard'}
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}