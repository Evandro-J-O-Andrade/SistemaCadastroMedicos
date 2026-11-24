import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Sun, Moon } from 'lucide-react';
import logoNewWave from '../img/logonewwave.png';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../core/theme/ThemeProvider';

export default function TrocaSenha() {
  const navigate = useNavigate();
  const { updatePassword, refresh, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');

  const handleRecovery = async () => {
    if (busy) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const { data: session } = await (await import('../lib/supabase')).supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Sessão inválida');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-password-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Verificação falhou');

      await refresh();
      setMessage('Senha confirmada. Prosseguindo para os documentos legais...');
      setTimeout(() => navigate('/onboarding/legal'), 1500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível verificar a senha.');
    } finally {
      setBusy(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setMessage('');
    if (password.length < 12) return setError('Use pelo menos 12 caracteres para sua nova senha.');
    if (password !== confirm) return setError('As senhas informadas não coincidem.');
    setBusy(true);
    try {
      await updatePassword(password);
      setPassword('');
      setConfirm('');

      // The authoritative status comes from the authenticated bootstrap RPC,
      // not direct reads of identity links or onboarding tables.
      const { supabase } = await import('../lib/supabase');
      let confirmed = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        const { data, error: statusError } = await supabase.rpc('fn_auth_bootstrap_v2');
        if (!statusError && data && typeof data === 'object' &&
            (data as { must_change_password?: boolean }).must_change_password === false) {
          confirmed = true;
          break;
        }
        if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (!confirmed) {
        setMessage('Senha atualizada no Supabase Auth, mas a confirmação do primeiro acesso ainda está pendente no servidor. Não altere a senha novamente; solicite a verificação do administrador.');
        return;
      }
      await refresh();
      setMessage('Senha confirmada. Prosseguindo para os documentos legais...');
      navigate('/onboarding/legal', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a senha.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#080f1e] dark:text-slate-100">
      {/* Página de primeiro acesso independente do layout e hero de LoginEnterprise. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-blue-300/25 blur-3xl dark:bg-blue-600/10" />
        <div className="absolute -right-24 bottom-16 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.09),transparent_48%)]" />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8" >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
            <ShieldCheck aria-hidden="true" size={23} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight">Gestão Médica Alpha</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ambiente institucional · Primeiro acesso</p>
          </div>
        </div>
        <button type="button" onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
          {theme === 'dark' ? <Sun aria-hidden="true" size={19} /> : <Moon aria-hidden="true" size={19} />}
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-5 pb-12 pt-4 sm:px-8">
        <div className="max-w-xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900/80 dark:bg-blue-950/40 dark:text-blue-300">
            <KeyRound aria-hidden="true" size={14} /> Configuração de acesso seguro
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Proteja seu acesso à plataforma</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">
            {user?.nome ? `Olá, ${user.nome}. ` : ''}Esta etapa é exclusiva do primeiro acesso.
            Defina sua senha pessoal para continuar com os termos institucionais e as boas-vindas.
          </p>
        </div>

        <section aria-label="Alteração de senha do primeiro acesso"
          className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
          <div className="border-b border-slate-100 px-6 py-6 text-center dark:border-slate-800 sm:px-8">
            <div className="mx-auto mb-4 flex h-16 max-w-[220px] items-center justify-center rounded-xl bg-white px-4">
              <img src={logoNewWave} alt="New Wave Sistemas Digital" className="max-h-12 max-w-full object-contain" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Etapa 1 de 3</p>
            <h2 className="mt-2 text-xl font-bold">{recoveryMode ? 'Verificação de acesso' : 'Crie sua senha definitiva'}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {recoveryMode ? 'Confirme sua alteração de senha para solicitar a verificação do primeiro acesso.' : 'Use uma senha exclusiva com pelo menos 12 caracteres.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4 px-6 py-6 sm:px-8">
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
            {message && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">{message}</p>}

            {recoveryMode ? (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Se você já alterou sua senha antes da instalação do mecanismo de confirmação, clique abaixo para confirmar a alteração vinculada à sua identidade ROOT.
                </p>
                <button type="button" onClick={handleRecovery} disabled={busy}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60">
                  {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                  {busy ? 'Confirmando...' : 'Confirmar alteração de senha'}
                </button>
                <button type="button" onClick={() => { setRecoveryMode(false); setError(''); setMessage(''); }}
                  className="block w-full text-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                  Voltar para alteração de senha
                </button>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium">Nova senha</label>
                  <div className="relative">
                    <KeyRound aria-hidden="true" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input id="new-password" autoComplete="new-password" type={visible ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)} minLength={12} required
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-11 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                    <button type="button" onClick={() => setVisible(x => !x)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300">
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium">Confirmar nova senha</label>
                  <input id="confirm-password" autoComplete="new-password" type={visible ? 'text' : 'password'}
                    value={confirm} onChange={e => setConfirm(e.target.value)} minLength={12} required
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                </div>
                <button type="submit" disabled={busy}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60">
                  {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                  {busy ? 'Atualizando senha...' : 'Confirmar nova senha'}
                </button>
                <button type="button" onClick={() => { setRecoveryMode(true); setError(''); setMessage(''); }}
                  className="block w-full text-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                  Já alterei minha senha anteriormente
                </button>
              </>
            )}
          </form>
          <div className="border-t border-slate-100 px-6 py-3 text-center dark:border-slate-800">
            <button type="button" onClick={() => { void signOut(); }}
              className="text-xs text-slate-500 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-white">
              Sair desta conta
            </button>
          </div>
        </section>
        <p className="flex items-center gap-2 text-center text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck aria-hidden="true" size={16} /> Acesso protegido · Etapas obrigatórias de segurança
        </p>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 px-5 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-8">
        <span>© {new Date().getFullYear()} Gestão Médica Alpha Enterprise</span>
        <span>Tecnologia por New Wave Sistemas Digital</span>
      </footer>
    </main>
  );
}
