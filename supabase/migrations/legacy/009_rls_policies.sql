-- 009_rls_policies.sql
-- Políticas de Segurança em Nível de Linha (RLS) para multi-tenant

-- Habilitar RLS em todas as tabelas de dados
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_professional_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_professional_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para obter tenant_id do contexto da requisição (jwt.claims)
CREATE OR REPLACE FUNCTION fn_current_tenant_id() RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_tenant_id TEXT;
BEGIN
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id') INTO v_tenant_id;
  RETURN v_tenant_id::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Função auxiliar para obter person_id do contexto (sub do auth.users)
CREATE OR REPLACE FUNCTION fn_current_person_id() RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_sub TEXT;
BEGIN
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'sub') INTO v_sub;
  RETURN v_sub::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- === Políticas por tenant ===

-- tenants: só vê o próprio tenant (ou todos se root via service role)
CREATE POLICY tenants_own ON tenants
FOR ALL USING (id = fn_current_tenant_id());

-- people: pessoas vinculadas ao tenant via memberships
CREATE POLICY people_tenant_visible ON people
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tenant_memberships tm
    WHERE tm.person_id = people.id
      AND tm.tenant_id = fn_current_tenant_id()
      AND tm.ativo = true
  )
);

-- tenant_settings: só do próprio tenant
CREATE POLICY tenant_settings_own ON tenant_settings
FOR ALL USING (tenant_id = fn_current_tenant_id());

-- tenant_memberships: só do próprio tenant
CREATE POLICY tenant_memberships_own ON tenant_memberships
FOR ALL USING (tenant_id = fn_current_tenant_id());

-- units: só do próprio tenant
CREATE POLICY units_own ON units
FOR ALL USING (tenant_id = fn_current_tenant_id());

-- unit_memberships: unidades do próprio tenant
CREATE POLICY unit_memberships_own ON unit_memberships
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM units u WHERE u.id = unit_memberships.unit_id AND u.tenant_id = fn_current_tenant_id()
  )
);

-- === RBAC ===

-- roles: leitura para todos autenticados do tenant
CREATE POLICY roles_read ON roles FOR SELECT USING (true);

-- permissions: leitura para todos autenticados
CREATE POLICY permissions_read ON permissions FOR SELECT USING (true);

-- role_permissions: leitura para todos autenticados
CREATE POLICY role_permissions_read ON role_permissions FOR SELECT USING (true);

-- role_assignments: só do próprio tenant
CREATE POLICY role_assignments_own ON role_assignments
FOR ALL USING (
  (tenant_id = fn_current_tenant_id()) OR (tenant_id IS NULL)
);

-- === Catálogo médico ===

-- specialties: do próprio tenant ou globais (tenant_id IS NULL)
CREATE POLICY specialties_visible ON specialties
FOR SELECT USING (tenant_id = fn_current_tenant_id() OR tenant_id IS NULL);

-- medical_professionals: do próprio tenant
CREATE POLICY medical_professionals_own ON medical_professionals
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM medical_professional_units mpu
    JOIN units u ON u.id = mpu.unit_id
    WHERE mpu.medical_professional_id = medical_professionals.id
      AND u.tenant_id = fn_current_tenant_id()
      AND mpu.ativo = true
  )
);

-- medical_professional_specialties: vinculadas a profissionais visíveis
CREATE POLICY medical_professional_specialties_visible ON medical_professional_specialties
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM medical_professionals mp
    WHERE mp.id = medical_professional_specialties.medical_professional_id
      AND EXISTS (
        SELECT 1 FROM medical_professional_units mpu
        JOIN units u ON u.id = mpu.unit_id
        WHERE mpu.medical_professional_id = mp.id
          AND u.tenant_id = fn_current_tenant_id()
          AND mpu.ativo = true
      )
  )
);

-- medical_professional_units: unidades do próprio tenant
CREATE POLICY medical_professional_units_visible ON medical_professional_units
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM units u WHERE u.id = medical_professional_units.unit_id AND u.tenant_id = fn_current_tenant_id()
  )
);

-- === Levantamentos e Produção ===

-- collection_shifts: do próprio tenant
CREATE POLICY collection_shifts_own ON collection_shifts
FOR ALL USING (tenant_id = fn_current_tenant_id());

-- collection_batches: de shifts do próprio tenant
CREATE POLICY collection_batches_own ON collection_batches
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM collection_shifts cs WHERE cs.id = collection_batches.collection_shift_id AND cs.tenant_id = fn_current_tenant_id()
  )
);

-- production_entries: de batches do próprio tenant
CREATE POLICY production_entries_own ON production_entries
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM collection_batches cb
    JOIN collection_shifts cs ON cs.id = cb.collection_shift_id
    WHERE cb.id = production_entries.collection_batch_id
      AND cs.tenant_id = fn_current_tenant_id()
  )
);

-- === Integração ===

-- data_sources: do próprio tenant
CREATE POLICY data_sources_own ON data_sources
FOR ALL USING (tenant_id = fn_current_tenant_id());

-- source_references: de entradas do próprio tenant
CREATE POLICY source_references_visible ON source_references
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM production_entries pe
    JOIN collection_batches cb ON cb.id = pe.collection_batch_id
    JOIN collection_shifts cs ON cs.id = cb.collection_shift_id
    WHERE pe.id = source_references.production_entry_id
      AND cs.tenant_id = fn_current_tenant_id()
  )
);

-- import_batches: do próprio tenant
CREATE POLICY import_batches_own ON import_batches
FOR ALL USING (tenant_id = fn_current_tenant_id());

-- === Auditoria ===

-- audit_events: leitura para o próprio tenant
CREATE POLICY audit_events_read ON audit_events
FOR SELECT USING (tenant_id = fn_current_tenant_id());

-- production_revisions: vinculadas a entradas visíveis
CREATE POLICY production_revisions_visible ON production_revisions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM production_entries pe
    JOIN collection_batches cb ON cb.id = pe.collection_batch_id
    JOIN collection_shifts cs ON cs.id = cb.collection_shift_id
    WHERE pe.id = production_revisions.production_entry_id
      AND cs.tenant_id = fn_current_tenant_id()
  )
);

-- === Interface ===

-- ui_metadata: do próprio tenant
CREATE POLICY ui_modules_own ON ui_modules FOR ALL USING (tenant_id = fn_current_tenant_id());
CREATE POLICY ui_pages_visible ON ui_pages FOR SELECT USING (
  EXISTS (SELECT 1 FROM ui_modules um WHERE um.id = ui_pages.module_id AND um.tenant_id = fn_current_tenant_id() AND um.ativo = true)
);
CREATE POLICY ui_forms_visible ON ui_forms FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM ui_pages up
    JOIN ui_modules um ON um.id = up.module_id
    WHERE up.id = ui_forms.page_id AND um.tenant_id = fn_current_tenant_id() AND up.ativo = true
  )
);
CREATE POLICY ui_themes_own ON ui_themes FOR ALL USING (tenant_id = fn_current_tenant_id());
CREATE POLICY dashboard_widgets_own ON dashboard_widgets FOR ALL USING (tenant_id = fn_current_tenant_id());
