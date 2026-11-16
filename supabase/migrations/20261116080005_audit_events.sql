-- 006_audit_events.sql
-- Gate 1 - AppSec: Eventos de auditoria (quem, o quê, quando, onde, resultado)
-- Não executar no Supabase sem autorização.

-- ============================================
-- audit_events: trilha de auditoria obrigatória
-- ============================================
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES people(id) ON DELETE SET NULL,
  auth_user_id UUID, -- id do auth.users no momento do evento (pode ser NULL se sistema)
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  recurso TEXT NOT NULL,
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  resultado TEXT NOT NULL DEFAULT 'sucesso', -- sucesso, falha, negado
  ip TEXT,
  user_agent TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_pessoa ON audit_events (pessoa_id);
CREATE INDEX idx_audit_events_tenant ON audit_events (tenant_id);
CREATE INDEX idx_audit_events_recurso_acao ON audit_events (recurso, acao);
CREATE INDEX idx_audit_events_criado_em ON audit_events (criado_em);
CREATE INDEX idx_audit_events_resultado ON audit_events (resultado);

COMMENT ON TABLE audit_events IS 'Trilha de auditoria: quem executou, o quê, quando, em qual contexto e resultado.';
