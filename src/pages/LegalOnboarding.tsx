import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/context/AuthContextProvider';
import { supabase } from '../lib/supabase';

interface LegalDoc { id: string; tipo: string; versao: string; titulo: string; conteudo: string; }

const TYPE_LABEL: Record<string, string> = {
  terms: 'Termos de Uso',
  privacy: 'Política de Privacidade (LGPD)',
  responsibility: 'Termo de Responsabilidade',
};

export default function LegalOnboarding() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('legal_documents').select('id, tipo, versao, titulo, conteudo').eq('ativo', true);
      if (error) setError(error.message);
      else setDocs((data as LegalDoc[]) || []);
      setLoading(false);
    })();
  }, []);

  const toggle = (id: string) => {
    setAccepted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allAccepted = docs.length > 0 && docs.every(d => accepted.has(d.id));

  const submit = async () => {
    if (!allAccepted || busy) return;
    setBusy(true); setError('');
    try {
      for (const doc of docs) {
        const { error: acceptError } = await supabase.rpc('fn_accept_legal_document', {
          p_document_id: doc.id,
          p_evidencia: { origin: 'legal_onboarding', version: doc.versao, explicitly_accepted: true },
          p_user_agent: navigator.userAgent,
        });
        if (acceptError) throw acceptError;
      }
      const { data: bootstrap, error: statusError } = await supabase.rpc('fn_auth_bootstrap_v2');
      if (statusError) throw statusError;
      if (!bootstrap || typeof bootstrap !== 'object' ||
          (bootstrap as { terms_pending?: boolean }).terms_pending !== false ||
          (bootstrap as { responsibility_pending?: boolean }).responsibility_pending !== false) {
        throw new Error('Os aceites foram registrados, mas ainda há documentos obrigatórios pendentes. Atualize a página para conferir.');
      }
      await refresh();
      navigate('/welcome', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar aceite.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="min-h-dvh flex items-center justify-center">Carregando documentos...</div>;

  return (
    <main className="min-h-dvh bg-gray-50 p-6 text-gray-900 dark:bg-slate-950 dark:text-white">
      <section className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Termos e privacidade</h1>
        <p className="text-sm text-gray-600 dark:text-slate-300">Leia e aceite todos os documentos para continuar.</p>
        {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {docs.map(d => (
          <article key={d.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">{d.titulo || TYPE_LABEL[d.tipo] || d.tipo}</h2>
            <p className="mt-1 text-xs text-gray-500">Versão {d.versao}</p>
            <div className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800">{d.conteudo}</div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={accepted.has(d.id)} onChange={() => toggle(d.id)} />
              Li e aceito este documento
            </label>
          </article>
        ))}
        <button onClick={submit} disabled={!allAccepted || busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {busy ? 'Registrando...' : 'Confirmar aceite'}
        </button>
      </section>
    </main>
  );
}
