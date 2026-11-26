import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronRight, FileText, LockKeyhole, RefreshCw, ShieldCheck, AlertCircle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../auth/context/AuthContextProvider';
import { useTheme } from '../core/theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import logoNewWave from '../img/logonewwave.png';
import draftTerms from '../../docs/legal/minuta_termos_de_uso.md?raw';
import draftResponsibility from '../../docs/legal/minuta_termo_de_responsabilidade.md?raw';
import draftPrivacy from '../../docs/legal/minuta_politica_de_privacidade.md?raw';

type DocumentType = 'terms_of_use' | 'responsibility' | 'privacy_notice';
interface LegalDoc {
  id: string;
  tipo: string;
  versao: string;
  titulo: string;
  conteudo: string | null;
  obrigatorio: boolean;
}
interface DisplayDocument {
  key: DocumentType;
  published: boolean;
  id: string | null;
  versao: string;
  titulo: string;
  conteudo: string;
  obrigatorio: boolean;
}

const DOCUMENT_TYPES: Array<{ key: DocumentType; title: string; preview: string; required: boolean }> = [
  { key: 'terms_of_use', title: 'Termos de Uso', preview: draftTerms, required: true },
  { key: 'responsibility', title: 'Termo de Responsabilidade', preview: draftResponsibility, required: true },
  { key: 'privacy_notice', title: 'Política de Privacidade (LGPD)', preview: draftPrivacy, required: false },
];

export default function LegalOnboarding() {
  const navigate = useNavigate();
  const { refresh, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [documents, setDocuments] = useState<LegalDoc[]>([]);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('legal_documents')
      .select('id, tipo, versao, titulo, conteudo, obrigatorio')
      .eq('ativo', true)
      .order('publicado_em', { ascending: false });
    if (loadError) setError('Não foi possível consultar os documentos oficiais: ' + loadError.message);
    else setDocuments((data as LegalDoc[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void loadDocuments(); }, []);

  const display: DisplayDocument[] = DOCUMENT_TYPES.map(config => {
    const official = documents.find(doc => doc.tipo === config.key && Boolean(doc.conteudo?.trim()));
    return {
      key: config.key,
      published: Boolean(official),
      id: official?.id ?? null,
      versao: official?.versao ?? 'Minuta 1.0',
      titulo: official?.titulo ?? config.title,
      conteudo: official?.conteudo ?? config.preview,
      obrigatorio: official?.obrigatorio ?? config.required,
    };
  });
  const missingRequired = display.some(doc => doc.obrigatorio && !doc.published);
  const hasPublishedDocs = display.some(doc => doc.published);
  const ready = !loading && !error && !missingRequired && hasPublishedDocs &&
    display.filter(doc => doc.published && doc.obrigatorio).every(doc => doc.id && accepted.has(doc.id));

  const toggle = (id: string) => setAccepted(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      for (const doc of display.filter(d => d.published && d.id && accepted.has(d.id))) {
        const { error: acceptError } = await supabase.rpc('fn_accept_legal_document', {
          p_document_id: doc.id,
          p_evidencia: {
            origin: 'legal_onboarding',
            version: doc.versao,
            action: doc.key === 'privacy_notice' ? 'privacy_notice_acknowledged' : 'explicit_acceptance',
            explicitly_accepted: doc.key !== 'privacy_notice',
          },
          p_user_agent: navigator.userAgent,
        });
        if (acceptError) throw acceptError;
      }

      const { data, error: bootstrapError } = await supabase.rpc('fn_auth_bootstrap_v2');
      if (bootstrapError) throw bootstrapError;
      const result = data as { terms_pending?: boolean; responsibility_pending?: boolean } | null;
      if (!result || result.terms_pending !== false || result.responsibility_pending !== false) {
        throw new Error('Ainda existe documento obrigatório pendente. Confira os documentos publicados.');
      }
      await refresh();
      navigate('/welcome', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar os aceites.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-dvh bg-slate-50 text-slate-900 dark:bg-[#080f1e] dark:text-slate-100">
      <header className="border-b border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white"><ShieldCheck size={22} aria-hidden="true" /></span>
            <div><p className="text-sm font-bold">Gestão Médica Alpha</p><p className="text-xs text-slate-500 dark:text-slate-400">Segurança e conformidade · Primeiro acesso</p></div>
          </div>
          <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
            <LockKeyhole size={14} /> Etapa 2 de 3 · Documentos institucionais
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Termos, responsabilidade e LGPD</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Consulte cada documento na íntegra. Os aceites são registrados individualmente, com a versão do documento, para fins de auditoria.
          </p>
        </div>

        {!loading && missingRequired && (
          <section role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertCircle className="mt-0.5 shrink-0" size={19} />
            <div><p className="font-semibold">Documentos oficiais aguardando publicação</p>
              <p className="mt-1 leading-6">As minutas abaixo estão disponíveis somente para leitura e revisão. Os checkboxes e o botão de confirmação serão habilitados quando os Termos de Uso e o Termo de Responsabilidade aprovados forem publicados no Supabase. Nenhum aceite de rascunho será registrado.</p>
            </div>
          </section>
        )}

        {error && <p role="alert" className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</p>}

        {loading ? (
          <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm dark:border-slate-800 dark:bg-slate-900">Carregando documentos...</div>
        ) : (
          <div className="space-y-5">
            {display.map((doc, index) => (
              <article key={doc.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{index === 2 ? <BookOpen size={20} /> : <FileText size={20} />}</span>
                    <div>
                      <h2 className="text-base font-bold sm:text-lg">{doc.titulo}</h2>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {doc.published ? 'Versão publicada: ' + doc.versao : 'Minuta não aprovada'} · {doc.key === 'privacy_notice' ? 'Ciência da política' : 'Aceite obrigatório'}
                      </p>
                    </div>
                  </div>
                  <span className={doc.published ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200'}>
                    {doc.published ? 'Documento oficial' : 'Pré-visualização'}
                  </span>
                </div>
                <div className="px-5 py-5 sm:px-6">
                  <div aria-label={'Texto de ' + doc.titulo} tabIndex={0} className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 font-sans text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:px-5">
                    {doc.conteudo}
                  </div>
                  <label className={'mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm ' + (doc.published && !missingRequired ? 'cursor-pointer border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900' : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/50')}>
                    <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600" checked={Boolean(doc.id && accepted.has(doc.id))} disabled={!doc.published || missingRequired || busy} onChange={() => { if (doc.id) toggle(doc.id); }} />
                    <span>{doc.key === 'privacy_notice'
                      ? 'Declaro que li e tomei ciência desta Política de Privacidade. Esta ciência não substitui uma base legal de tratamento.'
                      : 'Declaro que li e aceito integralmente este documento, na versão indicada acima.'}</span>
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-semibold">Confirmar e continuar</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{missingRequired ? 'Aguardando publicação dos documentos aprovados.' : 'O aceite dos documentos obrigatórios é necessário para avançar.'}</p></div>
            <button type="button" onClick={() => void loadDocuments()} disabled={busy || loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800">
              <RefreshCw size={15} /> Atualizar documentos
            </button>
          </div>
          <button type="button" onClick={() => void submit()} disabled={!ready || busy} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400">
            {busy ? 'Registrando aceites...' : 'Confirmar e ir para boas-vindas'} <ChevronRight size={19} aria-hidden="true" />
          </button>
          {!missingRequired && ready && <p className="mt-3 flex items-center justify-center gap-2 text-xs text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={15} /> Pronto para registrar os aceites.</p>}
          <button type="button" onClick={() => void signOut()} className="mt-4 block w-full text-center text-xs text-slate-500 hover:underline dark:text-slate-400">Sair desta conta</button>
        </div>
      </div>
      <footer className="flex items-center justify-center gap-2 border-t border-slate-200 px-4 py-5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <img src={logoNewWave} alt="" className="h-6 w-12 rounded bg-white object-contain p-1" />
        Tecnologia por New Wave Sistemas Digital
      </footer>
    </main>
  );
}
