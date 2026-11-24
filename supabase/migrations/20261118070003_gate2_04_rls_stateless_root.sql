-- 20261118070003_gate2_04_rls_stateless_root.sql
-- Gate 2.1.2 (local): ajustes de RLS para operação stateless (auth.uid/membership) e acesso ROOT global.
-- Complementa 007 (publicada) e correções 70000-70002. NÃO modifica histórico publicado.
-- NÃO executar em remoto sem autorização/homologação.

-- Objetivo:
-- 1) Remover dependência de "tenant atual" em GUC transacional nas políticas onde o escopo é o próprio registro.
-- 2) Garantir que ROOT global (role assignment tenant_id NULL) tenha acesso legítimo e auditável mesmo sem membership explícita.
-- 3) ROOT com escopo de tenant NÃO recebe bypass global (fn_is_root = global only).
-- 4) Manter fail-closed para não-ROOT sem vínculo/membership.

-- Usa fn_resolve_person_id() e fn_is_root() (global) definidos em 70000.

-- ============================================
-- tenants: ROOT global pode ler/administrar; membros leem próprios tenants
-- ============================================
DROP POLICY IF EXISTS tenants_member_read ON tenants;
CREATE POLICY tenants_read ON tenants
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_resolve_person_id()
        AND tm.tenant_id = tenants.id
        AND tm.ativo = true
    )
  );

DROP POLICY IF EXISTS tenants_member_insert ON tenants;
CREATE POLICY tenants_insert ON tenants
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'tenants', 'create', NULL, NULL)
  );

DROP POLICY IF EXISTS tenants_member_update ON tenants;
CREATE POLICY tenants_update ON tenants
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_resolve_person_id()
        AND tm.tenant_id = tenants.id
        AND tm.ativo = true
    )
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'tenants', 'update', tenants.id, NULL)
  );

DROP POLICY IF EXISTS tenants_member_delete ON tenants;
CREATE POLICY tenants_delete ON tenants
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (
      EXISTS (
        SELECT 1 FROM tenant_memberships tm
        WHERE tm.person_id = fn_resolve_person_id()
          AND tm.tenant_id = tenants.id
          AND tm.ativo = true
      )
      AND fn_person_has_permission(fn_resolve_person_id(), 'tenants', 'delete', tenants.id, NULL)
    )
  );

-- ============================================
-- people: acesso por membership no tenant do vínculo (não depende de tenant GUC)
-- ROOT global pode acessar pessoas (governança) - escopo auditável
-- ============================================
DROP POLICY IF EXISTS people_own_tenant_read ON people;
CREATE POLICY people_read ON people
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = people.id
        AND tm.ativo = true
        AND EXISTS (
          SELECT 1 FROM tenant_memberships my
          WHERE my.person_id = fn_resolve_person_id()
            AND my.tenant_id = tm.tenant_id
            AND my.ativo = true
        )
    )
    OR people.id = fn_resolve_person_id()
  );

DROP POLICY IF EXISTS people_own_tenant_insert ON people;
CREATE POLICY people_insert ON people
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'people', 'create', NULL, NULL)
  );

DROP POLICY IF EXISTS people_own_tenant_update ON people;
CREATE POLICY people_update ON people
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR people.id = fn_resolve_person_id()
    OR EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = people.id
        AND tm.ativo = true
        AND EXISTS (
          SELECT 1 FROM tenant_memberships my
          WHERE my.person_id = fn_resolve_person_id()
            AND my.tenant_id = tm.tenant_id
            AND my.ativo = true
        )
    )
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'people', 'update', NULL, NULL)
    OR (people.id = fn_resolve_person_id())
  );

DROP POLICY IF EXISTS people_own_tenant_delete ON people;
CREATE POLICY people_delete ON people
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (
      fn_person_has_permission(fn_resolve_person_id(), 'people', 'delete', NULL, NULL)
      AND EXISTS (
        SELECT 1 FROM tenant_memberships tm
        WHERE tm.person_id = people.id
          AND tm.ativo = true
          AND EXISTS (
            SELECT 1 FROM tenant_memberships my
            WHERE my.person_id = fn_resolve_person_id()
              AND my.tenant_id = tm.tenant_id
              AND my.ativo = true
          )
      )
    )
  );

-- ============================================
-- auth_identity_links: leitura restrita a contexto autorizado; escrita controlada
-- ============================================
DROP POLICY IF EXISTS links_own_person_read ON auth_identity_links;
CREATE POLICY links_read ON auth_identity_links
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR auth_identity_links.person_id = fn_resolve_person_id()
    OR EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = auth_identity_links.person_id
        AND tm.ativo = true
        AND EXISTS (
          SELECT 1 FROM tenant_memberships my
          WHERE my.person_id = fn_resolve_person_id()
            AND my.tenant_id = tm.tenant_id
            AND my.ativo = true
        )
    )
  );

DROP POLICY IF EXISTS links_own_person_insert ON auth_identity_links;
CREATE POLICY links_insert ON auth_identity_links
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'people', 'create', NULL, NULL)
  );

DROP POLICY IF EXISTS links_own_person_update ON auth_identity_links;
CREATE POLICY links_update ON auth_identity_links
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'people', 'update', NULL, NULL)
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'people', 'update', NULL, NULL)
  );

-- ============================================
-- units / tenant_settings: membership-based (row tenant), ROOT global
-- ============================================
DROP POLICY IF EXISTS units_member_read ON units;
DROP POLICY IF EXISTS units_own_unit_read ON units;
CREATE POLICY units_read ON units
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_resolve_person_id()
        AND tm.tenant_id = units.tenant_id
        AND tm.ativo = true
    )
    OR EXISTS (
      SELECT 1 FROM unit_memberships um
      WHERE um.person_id = fn_resolve_person_id()
        AND um.unit_id = units.id
        AND um.ativo = true
    )
  );

DROP POLICY IF EXISTS units_member_insert ON units;
CREATE POLICY units_insert ON units
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'units', 'create', tenant_id, NULL)
  );

DROP POLICY IF EXISTS units_member_update ON units;
CREATE POLICY units_update ON units
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_resolve_person_id()
        AND tm.tenant_id = units.tenant_id
        AND tm.ativo = true
    )
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'units', 'update', tenant_id, NULL)
  );

DROP POLICY IF EXISTS units_member_delete ON units;
CREATE POLICY units_delete ON units
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (
      fn_person_has_permission(fn_resolve_person_id(), 'units', 'delete', tenant_id, NULL)
      AND EXISTS (
        SELECT 1 FROM tenant_memberships tm
        WHERE tm.person_id = fn_resolve_person_id()
          AND tm.tenant_id = units.tenant_id
          AND tm.ativo = true
      )
    )
  );

DROP POLICY IF EXISTS settings_tenant_read ON tenant_settings;
CREATE POLICY settings_read ON tenant_settings
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_resolve_person_id()
        AND tm.tenant_id = tenant_settings.tenant_id
        AND tm.ativo = true
    )
  );

DROP POLICY IF EXISTS settings_tenant_insert ON tenant_settings;
CREATE POLICY settings_insert ON tenant_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'tenant_settings', 'create', tenant_id, NULL)
  );

DROP POLICY IF EXISTS settings_tenant_update ON tenant_settings;
CREATE POLICY settings_update ON tenant_settings
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = fn_resolve_person_id()
        AND tm.tenant_id = tenant_settings.tenant_id
        AND tm.ativo = true
    )
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'tenant_settings', 'update', tenant_id, NULL)
  );

DROP POLICY IF EXISTS settings_tenant_delete ON tenant_settings;
CREATE POLICY settings_delete ON tenant_settings
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (
      fn_person_has_permission(fn_resolve_person_id(), 'tenant_settings', 'delete', tenant_id, NULL)
      AND EXISTS (
        SELECT 1 FROM tenant_memberships tm
        WHERE tm.person_id = fn_resolve_person_id()
          AND tm.tenant_id = tenant_settings.tenant_id
          AND tm.ativo = true
      )
    )
  );

-- ============================================
-- memberships: própria pessoa ou admin autorizado no tenant; ROOT global
-- ============================================
DROP POLICY IF EXISTS memberships_tenant_read ON tenant_memberships;
DROP POLICY IF EXISTS memberships_own_read ON tenant_memberships;
CREATE POLICY memberships_read ON tenant_memberships
  FOR SELECT TO authenticated
  USING (
    person_id = fn_resolve_person_id()
    OR fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'memberships', 'read', tenant_id, NULL)
  );

DROP POLICY IF EXISTS memberships_tenant_insert ON tenant_memberships;
CREATE POLICY memberships_insert ON tenant_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'memberships', 'create', tenant_id, NULL)
  );

DROP POLICY IF EXISTS memberships_tenant_update ON tenant_memberships;
CREATE POLICY memberships_update ON tenant_memberships
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'memberships', 'update', tenant_id, NULL)
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'memberships', 'update', tenant_id, NULL)
  );

DROP POLICY IF EXISTS memberships_tenant_delete ON tenant_memberships;
CREATE POLICY memberships_delete ON tenant_memberships
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'memberships', 'delete', tenant_id, NULL)
  );

-- unit_memberships
DROP POLICY IF EXISTS umemberships_tenant_read ON unit_memberships;
DROP POLICY IF EXISTS umemberships_own_read ON unit_memberships;
CREATE POLICY umemberships_read ON unit_memberships
  FOR SELECT TO authenticated
  USING (
    person_id = fn_resolve_person_id()
    OR fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'memberships', 'read', tenant_id, unit_id)
  );

DROP POLICY IF EXISTS umemberships_tenant_insert ON unit_memberships;
CREATE POLICY umemberships_insert ON unit_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'memberships', 'create', tenant_id, unit_id)
  );

DROP POLICY IF EXISTS umemberships_tenant_update ON unit_memberships;
CREATE POLICY umemberships_update ON unit_memberships
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'memberships', 'update', tenant_id, unit_id)
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'memberships', 'update', tenant_id, unit_id)
  );

DROP POLICY IF EXISTS umemberships_tenant_delete ON unit_memberships;
CREATE POLICY umemberships_delete ON unit_memberships
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'memberships', 'delete', tenant_id, unit_id)
  );

-- ============================================
-- roles/permissions/rbac: leitura para autenticados vinculados; escrita por permissão/ROOT
-- (evita dependência de tenant GUC; mantém controle por permissão)
-- ============================================
DROP POLICY IF EXISTS roles_tenant_read ON roles;
DROP POLICY IF EXISTS roles_global_read ON roles;
CREATE POLICY roles_read ON roles
  FOR SELECT TO authenticated
  USING (
    fn_resolve_person_id() IS NOT NULL
  );

DROP POLICY IF EXISTS roles_tenant_insert ON roles;
CREATE POLICY roles_insert ON roles
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'roles', 'create', NULL, NULL)
  );
DROP POLICY IF EXISTS roles_tenant_update ON roles;
CREATE POLICY roles_update ON roles
  FOR UPDATE TO authenticated
  USING (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'roles', 'update', NULL, NULL))
  WITH CHECK (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'roles', 'update', NULL, NULL));
DROP POLICY IF EXISTS roles_tenant_delete ON roles;
CREATE POLICY roles_delete ON roles
  FOR DELETE TO authenticated
  USING (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'roles', 'delete', NULL, NULL));

DROP POLICY IF EXISTS permissions_read ON permissions;
CREATE POLICY permissions_read ON permissions
  FOR SELECT TO authenticated
  USING (fn_resolve_person_id() IS NOT NULL);

DROP POLICY IF EXISTS permissions_insert ON permissions;
CREATE POLICY permissions_insert ON permissions
  FOR INSERT TO authenticated
  WITH CHECK (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'permissions', 'create', NULL, NULL));
DROP POLICY IF EXISTS permissions_update ON permissions;
CREATE POLICY permissions_update ON permissions
  FOR UPDATE TO authenticated
  USING (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'permissions', 'update', NULL, NULL))
  WITH CHECK (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'permissions', 'update', NULL, NULL));
DROP POLICY IF EXISTS permissions_delete ON permissions;
CREATE POLICY permissions_delete ON permissions
  FOR DELETE TO authenticated
  USING (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'permissions', 'delete', NULL, NULL));

DROP POLICY IF EXISTS rp_tenant_read ON role_permissions;
CREATE POLICY rp_read ON role_permissions
  FOR SELECT TO authenticated
  USING (fn_resolve_person_id() IS NOT NULL);
DROP POLICY IF EXISTS rp_tenant_insert ON role_permissions;
CREATE POLICY rp_insert ON role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'roles', 'assign', NULL, NULL));
DROP POLICY IF EXISTS rp_tenant_update ON role_permissions;
CREATE POLICY rp_update ON role_permissions
  FOR UPDATE TO authenticated
  USING (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'roles', 'assign', NULL, NULL))
  WITH CHECK (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'roles', 'assign', NULL, NULL));
DROP POLICY IF EXISTS rp_tenant_delete ON role_permissions;
CREATE POLICY rp_delete ON role_permissions
  FOR DELETE TO authenticated
  USING (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'roles', 'assign', NULL, NULL));

-- role_assignments: própria pessoa, ROOT, ou gestor com permissão no escopo da linha
DROP POLICY IF EXISTS ra_tenant_read ON role_assignments;
DROP POLICY IF EXISTS ra_own_read ON role_assignments;
CREATE POLICY ra_read ON role_assignments
  FOR SELECT TO authenticated
  USING (
    person_id = fn_resolve_person_id()
    OR fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'roles', 'assign', tenant_id, unit_id)
  );

DROP POLICY IF EXISTS ra_tenant_insert ON role_assignments;
CREATE POLICY ra_insert ON role_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'roles', 'assign', tenant_id, unit_id)
  );
DROP POLICY IF EXISTS ra_tenant_update ON role_assignments;
CREATE POLICY ra_update ON role_assignments
  FOR UPDATE TO authenticated
  USING (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'roles', 'assign', tenant_id, unit_id))
  WITH CHECK (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'roles', 'assign', tenant_id, unit_id));
DROP POLICY IF EXISTS ra_tenant_delete ON role_assignments;
CREATE POLICY ra_delete ON role_assignments
  FOR DELETE TO authenticated
  USING (fn_is_root(fn_resolve_person_id()) OR fn_person_has_permission(fn_resolve_person_id(), 'roles', 'assign', tenant_id, unit_id));

-- ============================================
-- audit_events: leitura própria/tenant autorizado/ROOT; escrita direta bloqueada (70000)
-- ============================================
DROP POLICY IF EXISTS audit_tenant_read ON audit_events;
DROP POLICY IF EXISTS audit_own_read ON audit_events;
CREATE POLICY audit_read ON audit_events
  FOR SELECT TO authenticated
  USING (
    pessoa_id = fn_resolve_person_id()
    OR fn_is_root(fn_resolve_person_id())
    OR (
      tenant_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM tenant_memberships tm
        WHERE tm.person_id = fn_resolve_person_id()
          AND tm.tenant_id = audit_events.tenant_id
          AND tm.ativo = true
      )
    )
  );

-- INSERT/UPDATE/DELETE já endurecidos (audit_no_direct_insert em 70000, no_update/no_delete em 007)
-- Remover policy permissiva herdada do Gate 1 que permitia inserção arbitrária em audit_events.
DROP POLICY IF EXISTS audit_system_insert ON audit_events;
-- Revogar privilégio de inserção direta em audit_events de todos os papéis.
REVOKE INSERT ON public.audit_events FROM PUBLIC;
REVOKE INSERT ON public.audit_events FROM anon;
REVOKE INSERT ON public.audit_events FROM authenticated;
DROP POLICY IF EXISTS audit_no_update ON audit_events;
CREATE POLICY audit_no_update ON audit_events FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS audit_no_delete ON audit_events;
CREATE POLICY audit_no_delete ON audit_events FOR DELETE TO authenticated USING (false);

-- Defesa em profundidade: RLS já habilitado (Gate 1/2.1). FORCE ROW LEVEL SECURITY não aplicado aqui
-- para não quebrar funções/triggers SECURITY DEFINER controladas (avaliação durante homologação).
