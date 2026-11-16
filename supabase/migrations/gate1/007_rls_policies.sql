-- 007_rls_policies.sql
-- Gate 1 - AppSec: Habilitação de RLS e políticas de isolamento por tabela
-- Não executar no Supabase sem autorização.

-- ============================================
-- Habilitar RLS em todas as tabelas do CORE e IAM
-- ============================================
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- people
-- ============================================
CREATE POLICY people_own_tenant_read ON people
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = people.id
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
  );

CREATE POLICY people_own_tenant_insert ON people
  FOR INSERT
  TO authenticated
  WITH CHECK (
    fn_current_person_id() IS NOT NULL
    AND fn_person_has_permission(fn_current_person_id(), 'people', 'create', fn_current_tenant_id(), fn_current_unit_id())
  );

CREATE POLICY people_own_tenant_update ON people
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = people.id
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
  )
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'people', 'update', fn_current_tenant_id(), fn_current_unit_id())
  );

CREATE POLICY people_own_tenant_delete ON people
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = people.id
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
    AND fn_person_has_permission(fn_current_person_id(), 'people', 'delete', fn_current_tenant_id(), fn_current_unit_id())
  );

-- ============================================
-- auth_identity_links
-- ============================================
CREATE POLICY links_own_person_read ON auth_identity_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = auth_identity_links.person_id
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
  );

CREATE POLICY links_own_person_insert ON auth_identity_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'people', 'create', fn_current_tenant_id(), fn_current_unit_id())
  );

CREATE POLICY links_own_person_update ON auth_identity_links
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = auth_identity_links.person_id
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
  )
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'people', 'update', fn_current_tenant_id(), fn_current_unit_id())
  );

-- ============================================
-- tenants
-- ============================================
CREATE POLICY tenants_member_read ON tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = tenants.id
        AND tm.ativo = true
    )
  );

CREATE POLICY tenants_member_insert ON tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'tenants', 'create', NULL, NULL)
  );

CREATE POLICY tenants_member_update ON tenants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = tenants.id
        AND tm.ativo = true
    )
  )
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'tenants', 'update', tenants.id, NULL)
  );

CREATE POLICY tenants_member_delete ON tenants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = tenants.id
        AND tm.ativo = true
    )
    AND fn_person_has_permission(fn_current_person_id(), 'tenants', 'delete', tenants.id, NULL)
  );

-- ============================================
-- units
-- ============================================
CREATE POLICY units_member_read ON units
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = units.tenant_id
        AND tm.ativo = true
    )
  );

CREATE POLICY units_own_unit_read ON units
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM unit_memberships um
      WHERE um.person_id = fn_current_person_id()
        AND um.unit_id = units.id
        AND um.ativo = true
    )
  );

CREATE POLICY units_member_insert ON units
  FOR INSERT
  TO authenticated
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'units', 'create', tenant_id, NULL)
  );

CREATE POLICY units_member_update ON units
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = units.tenant_id
        AND tm.ativo = true
    )
  )
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'units', 'update', tenant_id, NULL)
  );

CREATE POLICY units_member_delete ON units
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = units.tenant_id
        AND tm.ativo = true
    )
    AND fn_person_has_permission(fn_current_person_id(), 'units', 'delete', tenant_id, NULL)
  );

-- ============================================
-- tenant_settings
-- ============================================
CREATE POLICY settings_tenant_read ON tenant_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = tenant_settings.tenant_id
        AND tm.ativo = true
    )
  );

CREATE POLICY settings_tenant_insert ON tenant_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'tenant_settings', 'create', tenant_id, NULL)
  );

CREATE POLICY settings_tenant_update ON tenant_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = tenant_settings.tenant_id
        AND tm.ativo = true
    )
  )
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'tenant_settings', 'update', tenant_id, NULL)
  );

CREATE POLICY settings_tenant_delete ON tenant_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = tenant_settings.tenant_id
        AND tm.ativo = true
    )
    AND fn_person_has_permission(fn_current_person_id(), 'tenant_settings', 'delete', tenant_id, NULL)
  );

-- ============================================
-- tenant_memberships
-- ============================================
CREATE POLICY memberships_tenant_read ON tenant_memberships
  FOR SELECT
  TO authenticated
  USING (person_id = fn_current_person_id());

CREATE POLICY memberships_own_read ON tenant_memberships
  FOR SELECT
  TO authenticated
  USING (person_id = fn_current_person_id());

CREATE POLICY memberships_tenant_insert ON tenant_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'memberships', 'create', tenant_id, NULL)
  );

CREATE POLICY memberships_tenant_update ON tenant_memberships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm2
      WHERE tm2.person_id = fn_current_person_id()
        AND tm2.tenant_id = tenant_memberships.tenant_id
        AND tm2.ativo = true
    )
  )
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'memberships', 'update', tenant_id, NULL)
  );

CREATE POLICY memberships_tenant_delete ON tenant_memberships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm2
      WHERE tm2.person_id = fn_current_person_id()
        AND tm2.tenant_id = tenant_memberships.tenant_id
        AND tm2.ativo = true
    )
    AND fn_person_has_permission(fn_current_person_id(), 'memberships', 'delete', tenant_id, NULL)
  );

-- ============================================
-- unit_memberships
-- ============================================
CREATE POLICY umemberships_tenant_read ON unit_memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = unit_memberships.tenant_id
        AND tm.ativo = true
    )
  );

CREATE POLICY umemberships_own_read ON unit_memberships
  FOR SELECT
  TO authenticated
  USING (person_id = fn_current_person_id());

CREATE POLICY umemberships_tenant_insert ON unit_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'memberships', 'create', tenant_id, unit_id)
  );

CREATE POLICY umemberships_tenant_update ON unit_memberships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = unit_memberships.tenant_id
        AND tm.ativo = true
    )
  )
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'memberships', 'update', tenant_id, unit_id)
  );

CREATE POLICY umemberships_tenant_delete ON unit_memberships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = unit_memberships.tenant_id
        AND tm.ativo = true
    )
    AND fn_person_has_permission(fn_current_person_id(), 'memberships', 'delete', tenant_id, unit_id)
  );

-- ============================================
-- roles
-- ============================================
CREATE POLICY roles_tenant_read ON roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
  );

CREATE POLICY roles_global_read ON roles
  FOR SELECT
  TO authenticated
  USING (
    fn_person_has_permission(fn_current_person_id(), 'roles', 'read', NULL, NULL)
  );

CREATE POLICY roles_tenant_insert ON roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'roles', 'create', fn_current_tenant_id(), NULL)
  );

CREATE POLICY roles_tenant_update ON roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
  )
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'roles', 'update', fn_current_tenant_id(), NULL)
  );

CREATE POLICY roles_tenant_delete ON roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
    AND fn_person_has_permission(fn_current_person_id(), 'roles', 'delete', fn_current_tenant_id(), NULL)
  );

-- ============================================
-- permissions
-- ============================================
CREATE POLICY permissions_read ON permissions
  FOR SELECT
  TO authenticated
  USING (
    fn_person_has_permission(fn_current_person_id(), 'permissions', 'read', fn_current_tenant_id(), fn_current_unit_id())
  );

CREATE POLICY permissions_insert ON permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'permissions', 'create', fn_current_tenant_id(), NULL)
  );

CREATE POLICY permissions_update ON permissions
  FOR UPDATE
  TO authenticated
  USING (
    fn_person_has_permission(fn_current_person_id(), 'permissions', 'update', fn_current_tenant_id(), fn_current_unit_id())
  )
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'permissions', 'update', fn_current_tenant_id(), fn_current_unit_id())
  );

CREATE POLICY permissions_delete ON permissions
  FOR DELETE
  TO authenticated
  USING (
    fn_person_has_permission(fn_current_person_id(), 'permissions', 'delete', fn_current_tenant_id(), fn_current_unit_id())
  );

-- ============================================
-- role_permissions
-- ============================================
CREATE POLICY rp_tenant_read ON role_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_permissions.role_id
        AND r.sistema = true
    )
    OR EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
  );

CREATE POLICY rp_tenant_insert ON role_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'roles', 'assign', fn_current_tenant_id(), NULL)
  );

CREATE POLICY rp_tenant_update ON role_permissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_permissions.role_id
        AND r.sistema = true
    )
    OR EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
  )
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'roles', 'assign', fn_current_tenant_id(), NULL)
  );

CREATE POLICY rp_tenant_delete ON role_permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_permissions.role_id
        AND r.sistema = true
    )
    OR EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
    AND fn_person_has_permission(fn_current_person_id(), 'roles', 'assign', fn_current_tenant_id(), NULL)
  );

-- ============================================
-- role_assignments
-- ============================================
CREATE POLICY ra_tenant_read ON role_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
  );

CREATE POLICY ra_own_read ON role_assignments
  FOR SELECT
  TO authenticated
  USING (person_id = fn_current_person_id());

CREATE POLICY ra_tenant_insert ON role_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'roles', 'assign', tenant_id, unit_id)
  );

CREATE POLICY ra_tenant_update ON role_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
  )
  WITH CHECK (
    fn_person_has_permission(fn_current_person_id(), 'roles', 'assign', tenant_id, unit_id)
  );

CREATE POLICY ra_tenant_delete ON role_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = fn_current_tenant_id()
        AND tm.ativo = true
    )
    AND fn_person_has_permission(fn_current_person_id(), 'roles', 'assign', tenant_id, unit_id)
  );

-- ============================================
-- audit_events (append-only)
-- ============================================
CREATE POLICY audit_tenant_read ON audit_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_current_person_id()
        AND tm.tenant_id = audit_events.tenant_id
        AND tm.ativo = true
    )
  );

CREATE POLICY audit_own_read ON audit_events
  FOR SELECT
  TO authenticated
  USING (pessoa_id = fn_current_person_id());

CREATE POLICY audit_system_insert ON audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY audit_no_update ON audit_events
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY audit_no_delete ON audit_events
  FOR DELETE
  TO authenticated
  USING (false);

-- ============================================
-- Trigger de auditoria genérico (para tabelas sensíveis)
-- ============================================
CREATE OR REPLACE FUNCTION trg_audit_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_acao TEXT;
  v_auth_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    v_acao := 'delete';
  END IF;

  v_auth_user_id := NULL;
  BEGIN
    v_auth_user_id := NULLIF(current_setting('request.jwt.claims.sub', true), '')::UUID;
  EXCEPTION WHEN others THEN
    v_auth_user_id := NULL;
  END;

  INSERT INTO audit_events (
    pessoa_id,
    auth_user_id,
    tenant_id,
    unit_id,
    recurso,
    acao,
    entidade,
    entidade_id,
    dados_anteriores,
    dados_novos,
    resultado,
    criado_em
  ) VALUES (
    fn_current_person_id(),
    v_auth_user_id,
    fn_current_tenant_id(),
    fn_current_unit_id(),
    TG_TABLE_NAME,
    v_acao,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD),
    to_jsonb(NEW),
    'sucesso',
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Aplicar trigger em tabelas sensíveis (exceto audit_events que é o alvo)
CREATE TRIGGER trg_people_audit
  AFTER INSERT OR UPDATE OR DELETE ON people
  FOR EACH ROW EXECUTE FUNCTION trg_audit_event();

CREATE TRIGGER trg_tenants_audit
  AFTER INSERT OR UPDATE OR DELETE ON tenants
  FOR EACH ROW EXECUTE FUNCTION trg_audit_event();

CREATE TRIGGER trg_units_audit
  AFTER INSERT OR UPDATE OR DELETE ON units
  FOR EACH ROW EXECUTE FUNCTION trg_audit_event();

CREATE TRIGGER trg_tenant_settings_audit
  AFTER INSERT OR UPDATE OR DELETE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION trg_audit_event();

CREATE TRIGGER trg_tenant_memberships_audit
  AFTER INSERT OR UPDATE OR DELETE ON tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION trg_audit_event();

CREATE TRIGGER trg_unit_memberships_audit
  AFTER INSERT OR UPDATE OR DELETE ON unit_memberships
  FOR EACH ROW EXECUTE FUNCTION trg_audit_event();

CREATE TRIGGER trg_roles_audit
  AFTER INSERT OR UPDATE OR DELETE ON roles
  FOR EACH ROW EXECUTE FUNCTION trg_audit_event();

CREATE TRIGGER trg_permissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON permissions
  FOR EACH ROW EXECUTE FUNCTION trg_audit_event();

CREATE TRIGGER trg_role_permissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION trg_audit_event();

CREATE TRIGGER trg_role_assignments_audit
  AFTER INSERT OR UPDATE OR DELETE ON role_assignments
  FOR EACH ROW EXECUTE FUNCTION trg_audit_event();
