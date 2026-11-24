// Gestão de Documentos Legais (Gate 3.3)
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { legalDocumentService, type LegalDocument } from '../auth/services/legalDocumentService';
import { FileText, Plus, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const TIPOS = ['terms_of_use', 'responsibility', 'privacy_notice'];

export default function GestaoDocumentosLegais() {
  const { user, loading: authLoading } = useAuth();
  const [docs, setDocs] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTipo, setFormTipo] = useState('terms_of_use');
  const [formVersao, setFormVersao] = useState('');
  const [formTitulo, setFormTitulo] = useState('');
  const [formConteudo, setFormConteudo] = useState('');
  const [formObrigatorio, setFormObrigatorio] = useState(true);

  const isRoot = user?.roles?.includes('root') ?? false;

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await legalDocumentService.listarDocumentos(false);
      setDocs(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) carregar();
  }, [authLoading, carregar]);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVersao.trim() || !formTitulo.trim()) return;
    setSaving(true);
    try {
      await legalDocumentService.criarDocumento({
        tipo: formTipo,
        versao: formVersao.trim(),
        titulo: formTitulo.trim(),
        conteudo: formConteudo.trim() || undefined,
        obrigatorio: formObrigatorio,
      });
      setFormVersao('');
      setFormTitulo('');
      setFormConteudo('');
      setShowForm(false);
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar documento');
    } finally {
      setSaving(false);
    }
  };

  const handleDesativar = async (id: string) => {
    try {
      await legalDocumentService.desativarDocumento(id);
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desativar');
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Loader2 className="spin" />
      </div>
    );
  }

  if (!isRoot) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={48} color="#f59e0b" />
        <h2>Acesso restrito</h2>
        <p>Apenas ROOT global pode gerenciar documentos legais.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileText size={24} /> Gestão de Documentos Legais
      </h1>

      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16, padding: '8px 16px', cursor: 'pointer' }}>
        <Plus size={16} style={{ verticalAlign: 'middle' }} /> Novo Documento
      </button>

      {showForm && (
        <form onSubmit={handleCriar} style={{ marginBottom: 24, padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <label style={{ marginRight: 8 }}>Tipo:</label>
            <select value={formTipo} onChange={(e) => setFormTipo(e.target.value)} style={{ padding: 8 }}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <input placeholder="Versão (ex: 1.0)" value={formVersao} onChange={(e) => setFormVersao(e.target.value)} required style={{ marginRight: 8, padding: 8 }} />
            <input placeholder="Título" value={formTitulo} onChange={(e) => setFormTitulo(e.target.value)} required style={{ marginRight: 8, padding: 8, width: 300 }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Conteúdo (rascunho até aprovação):</label>
            <textarea
              value={formConteudo}
              onChange={(e) => setFormConteudo(e.target.value)}
              rows={6}
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              <input type="checkbox" checked={formObrigatorio} onChange={(e) => setFormObrigatorio(e.target.checked)} />
              {' '}Obrigatório
            </label>
          </div>
          <button type="submit" disabled={saving} style={{ padding: '8px 16px' }}>
            {saving ? 'Salvando...' : 'Publicar (rascunho)'}
          </button>
        </form>
      )}

      <h2>Documentos ({docs.length})</h2>
      {docs.map((d) => (
        <div key={d.id} style={{ padding: 12, marginBottom: 8, border: '1px solid #e2e8f0', borderRadius: 8, opacity: d.ativo ? 1 : 0.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{d.titulo}</strong>
              <span style={{ marginLeft: 8, color: '#64748b', fontSize: 12 }}>
                {d.tipo} v{d.versao} {d.obrigatorio ? '(obrigatório)' : ''}
              </span>
              {!d.ativo && <span style={{ marginLeft: 8, color: '#ef4444', fontSize: 12 }}>[Inativo]</span>}
            </div>
            {d.ativo && (
              <button onClick={() => handleDesativar(d.id)} style={{ padding: '4px 8px', cursor: 'pointer', color: '#ef4444' }}>
                Desativar
              </button>
            )}
          </div>
          {d.conteudo && (
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>
              {d.conteudo}
            </p>
          )}
        </div>
      ))}
      {docs.length === 0 && <p style={{ color: '#64748b' }}>Nenhum documento cadastrado.</p>}
    </div>
  );
}