-- 20261118070005_gate2_06_rls_comembership.sql
-- Gate 2.1.4 (local): helper definer para co-membership (evita bloqueio por RLS aninhada em tenant_memberships)
-- e ajuste de policies que dependem de prova de mesmo tenant. Incremental; não altera Gate 1 publicado.

CREATE OR REPLACE FUNCTION fn_persons_share_active_tenant(p_person_a UUID, p_person_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_memberships a
    JOIN tenant_memberships b ON b.tenant_id = a.tenant_id AND b.ativo = true
    WHERE a.person_id = p_person_a
      AND b.person_id = p_person_b
      AND a.ativo = true
  );
$fn$;

REVOKE EXECUTE ON FUNCTION fn_persons_share_active_tenant(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_persons_share_active_tenant(UUID, UUID) TO authenticated;

-- people: leitura por co-membership real (mesmo tenant ativo)
DROP POLICY IF EXISTS people_read ON people;
CREATE POLICY people_read ON people
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR people.id = fn_resolve_person_id()
    OR fn_persons_share_active_tenant(fn_resolve_person_id(), people.id)
  );

DROP POLICY IF EXISTS people_update ON people;
CREATE POLICY people_update ON people
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR people.id = fn_resolve_person_id()
    OR fn_persons_share_active_tenant(fn_resolve_person_id(), people.id)
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'people', 'update', NULL, NULL)
    OR (people.id = fn_resolve_person_id())
  );

DROP POLICY IF EXISTS people_delete ON people;
CREATE POLICY people_delete ON people
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (
      fn_person_has_permission(fn_resolve_person_id(), 'people', 'delete', NULL, NULL)
      AND fn_persons_share_active_tenant(fn_resolve_person_id(), people.id)
    )
  );

-- auth_identity_links: leitura por co-membership
DROP POLICY IF EXISTS links_read ON auth_identity_links;
CREATE POLICY links_read ON auth_identity_links
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR auth_identity_links.person_id = fn_resolve_person_id()
    OR fn_persons_share_active_tenant(fn_resolve_person_id(), auth_identity_links.person_id)
  );
