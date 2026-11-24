-- 20261118070000_gate2_01_security_hardening.sql
-- Gate 2.1.2 (local): endurecimento de segurança sobre CORE Gate 1 (revisão P0).
-- Substitui rascunho Gate 2.1. Correções incrementais; NÃO modifica histórico publicado (20261116080000-006).
-- NÃO executar em remoto sem autorização/homologação.

-- ============================================
-- 0. Helpers de identidade (stateless, por requisição)
--    Fonte de verdade: auth.uid() -> auth_identity_links -> people (ativa)
-- ============================================

CREATE OR REPLACE FUNCTION fn_resolve_person_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT p.id
  FROM auth_identity_links ail
  JOIN people p ON p.id = ail.person_id
  WHERE ail.auth_user_id = auth.uid()
    AND p.ativo = true
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION fn_resolve_person_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_resolve_person_id() TO authenticated;

-- ROOT global: assignment de papel root sem escopo de tenant (tenant_id NULL).
-- Atribuições root escopadas a tenant NÃO concedem bypass global.
CREATE OR REPLACE FUNCTION fn_is_root(p_person_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    WHERE ra.person_id = COALESCE(p_person_id, fn_resolve_person_id())
      AND ra.ativo = true
      AND r.ativo = true
      AND r.nome = 'root'
      AND ra.tenant_id IS NULL
  );
$$;

REVOKE EXECUTE ON FUNCTION fn_is_root(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_is_root(UUID) TO authenticated;

-- Compatibilidade de nome: resolução stateless por requisição (não depende de GUC transacional)
CREATE OR REPLACE FUNCTION fn_current_person_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT fn_resolve_person_id();
$$;

-- Contexto tenant/unidade "selecionado" não é persistido entre requests HTTP.
-- Funções mantidas para compatibilidade; retornam NULL (políticas devem ser membership/auth.uid()-based).
CREATE OR REPLACE FUNCTION fn_current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT NULL::UUID;
$$;

CREATE OR REPLACE FUNCTION fn_current_unit_id()
RETURNS UUID
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT NULL::UUID;
$$;

-- ============================================
-- 1. Auditoria: impedir falsificação de autoria/resultado
-- ============================================

CREATE OR REPLACE FUNCTION trg_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_acao TEXT;
  v_auth_user_id UUID;
  v_pessoa_id UUID;
  v_tenant_id UUID := NULL;
  v_unit_id UUID := NULL;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    v_acao := 'delete';
  ELSE
    v_acao := lower(TG_OP);
  END IF;

  v_auth_user_id := auth.uid();
  v_pessoa_id := fn_resolve_person_id();

  -- Melhor esforço: inferir tenant/unidade da linha quando existir (não confiável para todos os casos)
  BEGIN
    v_tenant_id := COALESCE((to_jsonb(NEW)->>'tenant_id')::uuid, (to_jsonb(OLD)->>'tenant_id')::uuid);
  EXCEPTION WHEN others THEN
    v_tenant_id := NULL;
  END;
  BEGIN
    v_unit_id := COALESCE((to_jsonb(NEW)->>'unit_id')::uuid, (to_jsonb(OLD)->>'unit_id')::uuid);
  EXCEPTION WHEN others THEN
    v_unit_id := NULL;
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
    v_pessoa_id,
    v_auth_user_id,
    v_tenant_id,
    v_unit_id,
    TG_TABLE_NAME,
    v_acao,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    'sucesso',
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION trg_audit_event() FROM PUBLIC;

-- Remover INSERT livre: auditoria só pode ser escrita por mecanismos confiáveis.
DROP POLICY IF EXISTS audit_system_insert ON audit_events;
DROP POLICY IF EXISTS audit_no_direct_insert ON audit_events;
CREATE POLICY audit_no_direct_insert ON audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Registro explícito de auditoria: restrito a contextos confiáveis (não exposto ao cliente final).
CREATE OR REPLACE FUNCTION fn_audit_log(
  p_recurso TEXT,
  p_acao TEXT,
  p_entidade TEXT DEFAULT NULL,
  p_entidade_id UUID DEFAULT NULL,
  p_dados_anteriores JSONB DEFAULT NULL,
  p_dados_novos JSONB DEFAULT NULL,
  p_resultado TEXT DEFAULT 'sucesso',
  p_tenant_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_auth_user_id UUID;
  v_pessoa_id UUID;
BEGIN
  v_auth_user_id := auth.uid();
  v_pessoa_id := fn_resolve_person_id();

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
    v_pessoa_id,
    v_auth_user_id,
    p_tenant_id,
    p_unit_id,
    p_recurso,
    p_acao,
    p_entidade,
    p_entidade_id,
    p_dados_anteriores,
    p_dados_novos,
    COALESCE(p_resultado, 'sucesso'),
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_audit_log(TEXT, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_audit_log(TEXT, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION fn_audit_log(TEXT, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, UUID, UUID) TO service_role;

-- ============================================
-- 2. Permissões (stateless, sem impersonação)
-- ============================================

CREATE OR REPLACE FUNCTION fn_person_has_permission(
  p_person_id UUID,
  p_recurso TEXT,
  p_acao TEXT,
  p_tenant_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_person UUID;
  v_count INTEGER;
BEGIN
  -- Identidade autenticada resolvida por requisição (auth.uid). Sem identidade => deny.
  v_auth_person := fn_resolve_person_id();
  IF v_auth_person IS NULL OR p_person_id IS NULL THEN
    RETURN false;
  END IF;
  -- Anti-impersonação: só é permitido consultar permissões da própria pessoa autenticada.
  IF p_person_id <> v_auth_person THEN
    RETURN false;
  END IF;

  -- ROOT: assignment global (tenant_id NULL) vale globalmente; assignment escopado vale no tenant.
  SELECT COUNT(*) INTO v_count
  FROM role_assignments ra
  JOIN roles r ON r.id = ra.role_id
  WHERE ra.person_id = p_person_id
    AND ra.ativo = true
    AND r.ativo = true
    AND r.nome = 'root'
    AND (ra.tenant_id IS NULL OR ra.tenant_id = p_tenant_id);

  IF v_count > 0 THEN
    RETURN true;
  END IF;

  -- RBAC: escopo NULL no assignment = amplo dentro do nível.
  SELECT COUNT(*) INTO v_count
  FROM role_assignments ra
  JOIN role_permissions rp ON rp.role_id = ra.role_id AND rp.ativo = true
  JOIN permissions p ON p.id = rp.permission_id AND p.ativo = true
  JOIN roles r ON r.id = ra.role_id AND r.ativo = true
  WHERE ra.person_id = p_person_id
    AND ra.ativo = true
    AND p.recurso = p_recurso
    AND p.acao = p_acao
    AND (ra.tenant_id IS NULL OR ra.tenant_id = p_tenant_id)
    AND (ra.unit_id IS NULL OR p_unit_id IS NULL OR ra.unit_id = p_unit_id);

  RETURN v_count > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_person_has_permission(UUID, TEXT, TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_person_has_permission(UUID, TEXT, TEXT, UUID, UUID) TO authenticated;

-- ============================================
-- 3. Contexto: validação por requisição (sem dependência de GUC persistente)
-- ============================================
DROP FUNCTION IF EXISTS fn_set_session_contexto(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION fn_set_session_contexto(
  p_tenant_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_person_id UUID;
  v_membro_tenant BOOLEAN;
  v_membro_unidade BOOLEAN;
  v_is_root BOOLEAN := false;
BEGIN
  -- Identidade SEMPRE derivada de auth.uid() (não aceita auth_user_id do cliente).
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  v_person_id := fn_resolve_person_id();
  IF v_person_id IS NULL THEN
    RETURN false;
  END IF;

  v_is_root := fn_is_root(v_person_id);

  IF p_tenant_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = v_person_id
        AND tm.tenant_id = p_tenant_id
        AND tm.ativo = true
    ) INTO v_membro_tenant;

    IF NOT COALESCE(v_membro_tenant, false) AND NOT v_is_root THEN
      RETURN false;
    END IF;
  END IF;

  IF p_unit_id IS NOT NULL THEN
    IF p_tenant_id IS NULL THEN
      RETURN false;
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM unit_memberships um
      WHERE um.person_id = v_person_id
        AND um.unit_id = p_unit_id
        AND um.tenant_id = p_tenant_id
        AND um.ativo = true
    ) INTO v_membro_unidade;

    IF NOT COALESCE(v_membro_unidade, false) AND NOT v_is_root THEN
      RETURN false;
    END IF;
  END IF;

  -- Best-effort: claims locais à transação (podem ser úteis em RPCs que fazem trabalho na mesma tx).
  -- NÃO devem ser pré-requisito de autorização entre requisições HTTP independentes.
  PERFORM set_config('request.jwt.claims.person_id', v_person_id::TEXT, true);
  PERFORM set_config('request.jwt.claims.tenant_id', COALESCE(p_tenant_id::TEXT, ''), true);
  PERFORM set_config('request.jwt.claims.unit_id', COALESCE(p_unit_id::TEXT, ''), true);

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_set_session_contexto(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_set_session_contexto(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION fn_set_session_contexto(UUID, UUID) IS
  'Valida contexto tenant/unidade para a identidade autenticada (auth.uid()). Claims GUC são best-effort por transação; autorização entre requests deve ser stateless.';

-- ============================================
-- 4. Resolver pessoa autenticada atual (compatibilidade)
-- ============================================
CREATE OR REPLACE FUNCTION fn_resolve_current_person()
RETURNS TABLE(person_id UUID, full_name TEXT, email TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.nome, p.email
  FROM auth_identity_links ail
  JOIN people p ON p.id = ail.person_id
  WHERE ail.auth_user_id = auth.uid()
    AND p.ativo = true
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION fn_resolve_current_person() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_resolve_current_person() TO authenticated;
