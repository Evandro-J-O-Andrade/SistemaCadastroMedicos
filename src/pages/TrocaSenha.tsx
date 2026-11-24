import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
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
      // Confirm via Edge Function (server-side service_role)
      const { data: session } = await (await import('../lib/supabase')).supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (token) {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-password-change`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Confirmação falhou');
      }
      setPassword('');
      setConfirm('');
      await refresh();
      setMessage('Senha atualizada e confirmada. Redirecionando para os documentos legais...');
      setTimeout(() => navigate('/onboarding/legal'), 1500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a senha.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-100 px-4 py-10 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <header className="border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><ShieldCheck size={21} className="text-blue-600 dark:text-blue-400" /><span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300">Primeiro acesso · Etapa 1 de 3</span></div>
            <button type="button" onClick={toggleTheme} aria-label="Alternar tema" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs dark:border-slate-600">{theme === 'dark' ? 'Claro' : 'Escuro'}</button>
          </div>
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
          <button type="submit" disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Atualizando senha...' : 'Atualizar senha'}</button>
          <button type="button" onClick={() => { void signOut(); }} className="block w-full text-center text-sm text-gray-500 underline dark:text-slate-400">Sair desta conta</button>
        </form>
      </section>
    </main>
  );
}
