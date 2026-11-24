-- 20261124090005_cms_column_privileges.sql
-- Revogar privilégios diretos de alteração de status para authenticated/anon
-- Transições de status ocorrem exclusivamente via RPCs SECURITY DEFINER

-- Revogar INSERT de tabela inteira para authenticated e anon
REVOKE INSERT ON ui_page_versions FROM authenticated;
REVOKE INSERT ON ui_page_versions FROM anon;

-- Conceder INSERT apenas nas colunas de rascunho (excluindo status e published_at)
GRANT INSERT (page_id, versao, layout_id) ON ui_page_versions TO authenticated;
-- status e published_at usam DEFAULT (draft, NULL) definidos na tabela

-- Revogar UPDATE de tabela inteira para authenticated e anon
REVOKE UPDATE ON ui_page_versions FROM authenticated;
REVOKE UPDATE ON ui_page_versions FROM anon;

-- Conceder UPDATE apenas em colunas de rascunho (não status) para authenticated
GRANT UPDATE (layout_id) ON ui_page_versions TO authenticated;
-- status, page_id, versao são gerenciados apenas por RPCs

-- Revogar DELETE para anon
REVOKE DELETE ON ui_page_versions FROM anon;

-- Revogar EXECUTE de helper interno para não-autorizados
REVOKE EXECUTE ON FUNCTION _cms_check_permission(UUID, TEXT[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _cms_check_permission(UUID, TEXT[]) FROM anon;
GRANT EXECUTE ON FUNCTION _cms_check_permission(UUID, TEXT[]) TO authenticated, service_role;

-- Garantir que RPCs são SECURITY DEFINER (owner = postgres)
ALTER FUNCTION fn_publish_page_version(UUID) OWNER TO postgres;
ALTER FUNCTION fn_rollback_page_version(UUID) OWNER TO postgres;
ALTER FUNCTION _cms_check_permission(UUID, TEXT[]) OWNER TO postgres;
