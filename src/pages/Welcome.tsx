// src/pages/Welcome.tsx — Central de Contextos (primeiro acesso / troca de contexto)
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useActiveContext } from '../core/context/ContextProvider';
import { isContextAllowed } from '../core/context/contextResolver';
import { supabase } from '../lib/supabase';
import { authUserFromBootstrap, bootstrapFromResponse } from '../auth/services/authService';

export default function Welcome(): React.ReactElement {
  const navigate = useNavigate();
  const { user, refresh, completeContextSelection } = useAuth();
  const { contexts, active, setContext } = useActiveContext();
  const [selectedKey, setSelectedKey] = useState<string>(active?.key ?? contexts[0]?.key ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fullName = user?.nome || user?.email || 'Usuário';

  const selected = useMemo(
    () => contexts.find((c) => c.key === selectedKey) ?? null,
    [contexts, selectedKey],
  );

  const entrar = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (!selected || !isContextAllowed(user, selected)) {
        throw new Error('Selecione um contexto válido para continuar.');
      }

      // Conclui a etapa de boas-vindas no servidor (gate: senha + termos/responsabilidade).
      const { data, error: welcomeError } = await supabase.rpc('fn_complete_welcome');
      if (welcomeError) throw welcomeError;
      if (data !== true) {
        throw new Error('Não foi possível concluir as boas-vindas. Confirme que senha e documentos estão regularizados.');
      }

      // Estado autoritativo pós-boas-vindas (sem forçar flags).
      const { data: bootstrapData, error: bootstrapError } = await supabase.rpc('fn_auth_bootstrap_v2');
      if (bootstrapError) throw bootstrapError;
      const bootstrap = bootstrapFromResponse(bootstrapData);
      if (!bootstrap || !user?.auth_user_id) {
        throw new Error('Não foi possível confirmar a identidade após as boas-vindas.');
      }
      const updatedUser = authUserFromBootstrap(user.auth_user_id, bootstrap);
      if (updatedUser.must_change_password || updatedUser.terms_pending ||
          updatedUser.responsibility_pending || updatedUser.welcome_pending) {
        throw new Error('Ainda existe uma etapa obrigatória pendente. Acesso não liberado.');
      }

      // Aplica o contexto escolhido (validado contra memberships).
      if (!setContext(selected)) {
        throw new Error('Contexto não autorizado para o seu perfil.');
      }
      completeContextSelection();
      await refresh();
      // Nova jornada: após seleção de contexto, o usuário entra no portal Início
      // (tela cheia) e só então clica em "Entrar no Painel" para o dashboard.
      navigate('/inicio', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao concluir as boas-vindas.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Bem-vindo, {fullName}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">
            Selecione o contexto de trabalho para acessar a plataforma.
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {contexts.map((ctx) => {
            const isSel = ctx.key === selectedKey;
            return (
              <button
                key={ctx.key}
                type="button"
                onClick={() => setSelectedKey(ctx.key)}
                className={`text-left p-5 rounded-xl border transition-colors ${
                  isSel
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  {ctx.isGlobal ? <Shield className="w-6 h-6 text-purple-600" /> : <Building2 className="w-6 h-6 text-blue-600" />}
                  <span className="font-semibold text-gray-900 dark:text-white">{ctx.label}</span>
                  {isSel && <CheckCircle2 className="w-5 h-5 text-blue-600 ml-auto" />}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {ctx.isGlobal ? 'Visão consolidada da plataforma' : `${ctx.unitIds.length} unidade(s) autorizada(s)`}
                </p>
              </button>
            );
          })}
          {contexts.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum contexto autorizado. Procure o administrador.
            </p>
          )}
        </div>

        <button
          onClick={() => void entrar()}
          disabled={busy || !selected}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
        >
          {busy ? 'Concluindo...' : 'Acessar Dashboard'}
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}