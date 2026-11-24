import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Sun, Moon } from 'lucide-react';
import logoNewWave from '../img/logonewwave.png';
import logoDark from '../img/loginalphadark.png';
import logoLight from '../img/loginalphalight.png';
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
    if (!verifyPassword) return setError('Informe sua senha atual.');
    setBusy(true);
    try {
      const { data: session } = await (await import('../lib/supabase')).supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Sessão inválida');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-password-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: verifyPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Verificação falhou');

      setVerifyPassword('');
      await refresh();
      setMessage('Senha verificada. Redirecionando para os documentos legais...');
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
    <main className="flex min-h-dvh flex-col bg-gray-100 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="relative hidden overflow-hidden lg:flex lg:w-3/5">
          <img src={theme === 'dark' ? logoDark : logoLight} alt="Gestão Médica Alpha" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="relative mt-auto p-10 text-white"><p className="text-2xl font-bold">Gestão Médica Alpha</p><p className="mt-1 text-sm text-slate-200">Segurança e governança para sua gestão médica</p></div>
        </aside>
        <div className="flex flex-1 items-center justify-center px-4 py-8 lg:w-2/5 lg:bg-gray-50 lg:px-8 dark:lg:bg-slate-900">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <header className="border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><ShieldCheck size={19} className="text-blue-600 dark:text-blue-400" /><span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Primeiro acesso · Etapa 1 de 3</span></div>
            <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-200 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          </div>
          <div className="my-5 flex justify-center rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-slate-600 dark:bg-white"><img src={logoNewWave} alt="New Wave Sistemas Digital" className="h-12 max-w-full object-contain" /></div>
          <h1 className="mt-4 text-xl font-bold">Crie sua senha definitiva</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Bem-vindo, {user?.nome || 'usuário'}. Para proteger seu acesso, altere a senha temporária antes de continuar.</p>
        </header>
        <form onSubmit={submit} className="space-y-5 px-6 py-6">
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium">Nova senha</label>
            <div className="relative">
              <KeyRound aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              <input id="new-password" autoComplete="new-password" type={visible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} minLength={12} required className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-12 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
              <button type="button" onClick={() => setVisible(x => !x)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-3 text-gray-500 dark:text-slate-400">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Mínimo de 12 caracteres. Use uma senha exclusiva.</p>
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium">Confirmar nova senha</label>
            <input id="confirm-password" autoComplete="new-password" type={visible ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} minLength={12} required className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
          </div>
          {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>}
          {message && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-slate-800 dark:text-blue-200">{message}</p>}
          {recoveryMode ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-slate-300">Se você já alterou sua senha antes da instalação do mecanismo de confirmação, informe sua senha atual para verificar o acesso.</p>
              <div>
                <label htmlFor="verify-password" className="mb-1.5 block text-sm font-medium">Senha atual</label>
                <div className="relative">
                  <KeyRound aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <input id="verify-password" type={visible ? 'text' : 'password'} value={verifyPassword} onChange={e => setVerifyPassword(e.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-12 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                  <button type="button" onClick={() => setVisible(x => !x)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-3 text-gray-500 dark:text-slate-400">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              <button type="button" onClick={handleRecovery} disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 font-semibold text-white hover:bg-amber-700 disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Verificando...' : 'Verificar senha atual'}</button>
              <button type="button" onClick={() => setRecoveryMode(false)} className="block w-full text-center text-sm text-gray-500 underline dark:text-slate-400">Voltar para alteração de senha</button>
            </div>
          ) : (
            <button type="submit" disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Atualizando senha...' : 'Atualizar senha'}</button>
          )}
          <button type="button" onClick={() => { void signOut(); }} className="block w-full text-center text-sm text-gray-500 underline dark:text-slate-400">Sair desta conta</button>
          {!recoveryMode && (
            <button type="button" onClick={() => setRecoveryMode(true)} className="block w-full text-center text-xs text-gray-400 underline dark:text-slate-500">Já alterei minha senha anteriormente</button>
          )}
        </form>
      </section>
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-white px-5 py-3 text-xs text-gray-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"><span>Gestão Médica Alpha © {new Date().getFullYear()}</span><span>Tecnologia por New Wave Sistemas Digital</span></footer>
    </main>
  );
}
