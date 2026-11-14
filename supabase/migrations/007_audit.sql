-- 007_audit.sql
-- Governança: trilha imutável de alterações de produção e eventos do sistema

-- Eventos de auditoria gerais
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  unidade_id UUID REFERENCES units(id) ON DELETE SET NULL,
  evento TEXT NOT NULL, -- producao.criada, producao.editada, producao.excluida, shift.encerrado, batch.encerrado
  entidade TEXT NOT NULL, -- production_entries, collection_shifts, collection_batches, etc.
  entidade_id UUID NOT NULL,
  dados_anteriores JSONB DEFAULT '{}',
  dados_novos JSONB DEFAULT '{}',
  justificativa TEXT,
  ip TEXT,
  user_agent TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_tenant ON audit_events (tenant_id);
CREATE INDEX idx_audit_events_person ON audit_events (person_id);
CREATE INDEX idx_audit_events_entidade ON audit_events (entidade, entidade_id);
CREATE INDEX idx_audit_events_evento ON audit_events (evento);
CREATE INDEX idx_audit_events_criado_em ON audit_events (criado_em);

-- Revisões de produção (histórico de valores de quantidade)
CREATE TABLE production_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_entry_id UUID NOT NULL REFERENCES production_entries(id) ON DELETE CASCADE,
  quantidade_anterior INTEGER,
  quantidade_nova INTEGER,
  motivo TEXT,
  revisado_por UUID NOT NULL REFERENCES people(id),
  revisado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_production_revisions_entry ON production_revisions (production_entry_id);
CREATE INDEX idx_production_revisions_revisado_em ON production_revisions (revisado_em);
