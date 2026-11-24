-- 20261124090005_cms_column_privileges.sql
-- Revogar privilégios diretos de alteração da coluna status para authenticated/anon
-- Transições de status ocorrem exclusivamente via RPCs SECURITY DEFINER

-- Revogar UPDATE na coluna status para authenticated e anon
REVOKE UPDATE (status) ON ui_page_versions FROM authenticated;
REVOKE UPDATE (status) ON ui_page_versions FROM anon;

-- Revogar UPDATE em todas as colunas para anon (defesa em profundidade)
REVOKE UPDATE ON ui_page_versions FROM anon;
REVOKE INSERT ON ui_page_versions FROM anon;
REVOKE DELETE ON ui_page_versions FROM anon;

-- Revogar DELETE de versões publicadas (proteção adicional via trigger já existente)
-- Garantir que apenas RPCs SECURITY DEFINER possam alterar status

-- Revogar EXECUTE de helper interno para não-superusers
REVOKE EXECUTE ON FUNCTION _cms_check_permission(UUID, TEXT[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _cms_check_permission(UUID, TEXT[]) FROM anon;
GRANT EXECUTE ON FUNCTION _cms_check_permission(UUID, TEXT[]) TO authenticated, service_role;

-- Garantir que RPCs são SECURITY DEFINER (owner = postgres, bypassa RLS mas triggers aplicam)
-- As RPCs já são SECURITY DEFINER; confirmar owner
ALTER FUNCTION fn_publish_page_version(UUID) OWNER TO postgres;
ALTER FUNCTION fn_rollback_page_version(UUID) OWNER TO postgres;
ALTER FUNCTION _cms_check_permission(UUID, TEXT[]) OWNER TO postgres;
