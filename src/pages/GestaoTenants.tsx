// Gestão de Organizações e Unidades (Gate 3.2)
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { tenantService, type Tenant, type Unit } from '../auth/services/tenantService';
import { Building, Plus, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react';

export default function GestaoTenants() {
  const { user, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [saving, setSaving] = useState(false);

  const isRoot = user?.roles?.includes('root') ?? false;

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await tenantService.listarTenants();
      setTenants(t);
      if (t.length > 0 && !selectedTenant) setSelectedTenant(t[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tenants');
    } finally {
      setLoading(false);
    }
  }, [selectedTenant]);

  useEffect(() => {
    if (!authLoading) carregar();
  }, [authLoading, carregar]);

  useEffect(() => {
    if (selectedTenant) {
      tenantService.listarUnidades(selectedTenant).then(setUnits).catch(() => setUnits([]));
    }
  }, [selectedTenant]);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) return;
    setSaving(true);
    try {
      await tenantService.criarTenant({ nome: formNome.trim(), slug: formSlug.trim() || undefined });
      setFormNome('');
      setFormSlug('');
      setShowForm(false);
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar tenant');
    } finally {
      setSaving(false);
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
        <p>Apenas ROOT global pode gerenciar organizações.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Building size={24} /> Gestão de Organizações
      </h1>

      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: 16, padding: '8px 16px', cursor: 'pointer' }}>
        <Plus size={16} style={{ verticalAlign: 'middle' }} /> Nova Organização
      </button>

      {showForm && (
        <form onSubmit={handleCriar} style={{ marginBottom: 24, padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <input
            placeholder="Nome da organização"
            value={formNome}
            onChange={(e) => setFormNome(e.target.value)}
            required
            style={{ marginRight: 8, padding: 8 }}
          />
          <input
            placeholder="Slug (opcional)"
            value={formSlug}
            onChange={(e) => setFormSlug(e.target.value)}
            style={{ marginRight: 8, padding: 8 }}
          />
          <button type="submit" disabled={saving} style={{ padding: '8px 16px' }}>
            {saving ? 'Salvando...' : 'Criar'}
          </button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <h2>Organizações ({tenants.length})</h2>
          {tenants.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTenant(t.id)}
              style={{
                padding: 12,
                marginBottom: 8,
                border: selectedTenant === t.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: 8,
                cursor: 'pointer',
                opacity: t.ativo ? 1 : 0.5,
              }}
            >
              <strong>{t.nome}</strong>
              {t.slug && <span style={{ marginLeft: 8, color: '#64748b', fontSize: 12 }}>({t.slug})</span>}
              {!t.ativo && <span style={{ marginLeft: 8, color: '#ef4444', fontSize: 12 }}>[Inativa]</span>}
            </div>
          ))}
        </div>

        <div>
          <h2>Unidades {selectedTenant && `(${units.length})`}</h2>
          {selectedTenant ? (
            <>
              <p style={{ fontSize: 12, color: '#64748b' }}>Tenant: {tenants.find((t) => t.id === selectedTenant)?.nome}</p>
              {units.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    opacity: u.ativo ? 1 : 0.5,
                  }}
                >
                  <strong>{u.nome}</strong>
                  {u.codigo && <span style={{ marginLeft: 8, color: '#64748b', fontSize: 12 }}>({u.codigo})</span>}
                  {!u.ativo && <span style={{ marginLeft: 8, color: '#ef4444', fontSize: 12 }}>[Inativa]</span>}
                </div>
              ))}
              {units.length === 0 && <p style={{ color: '#64748b' }}>Nenhuma unidade cadastrada.</p>}
            </>
          ) : (
            <p style={{ color: '#64748b' }}>Selecione uma organização.</p>
          )}
        </div>
      </div>
    </div>
  );
}
