-- 20261124090007_password_change_trigger.sql
-- Trigger auditável sobre mudança efetiva de auth.users.encrypted_password
-- Confirma troca de senha somente quando a credencial realmente muda.
-- Distingue troca pelo usuário (self-service) de reset administrativo
-- via tabela pending_password_resets com validação RBAC.

-- Tabela de resets administrativos pendentes
CREATE TABLE IF NOT EXISTS pending_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_pending_resets_user ON pending_password_resets(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_pending_resets_expires ON pending_password_resets(expires_at);

ALTER TABLE pending_password_resets ENABLE ROW LEVEL SECURITY;

-- Trigger function: fires on password change
CREATE OR REPLACE FUNCTION fn_trg_password_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_person_id UUID;
  v_is_admin_reset BOOLEAN := false;
  v_was_onboarding BOOLEAN := false;
BEGIN
  -- Only fire when encrypted_password actually changes
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
    -- Clean up expired pending resets for this user
    DELETE FROM pending_password_resets
    WHERE auth_user_id = NEW.id AND expires_at <= now();

    -- Resolve person via auth_identity_links
    SELECT ail.person_id INTO v_person_id
    FROM auth_identity_links ail
    WHERE ail.auth_user_id = NEW.id;

    IF v_person_id IS NOT NULL THEN
      -- Check if this is an admin reset (valid pending record exists)
      SELECT EXISTS (
        SELECT 1 FROM pending_password_resets
        WHERE auth_user_id = NEW.id
          AND expires_at > now()
      ) INTO v_is_admin_reset;

      -- Check if user was in onboarding state
      SELECT COALESCE(uo.must_change_password, false) INTO v_was_onboarding
      FROM user_onboarding uo
      WHERE uo.person_id = v_person_id;

      IF v_is_admin_reset THEN
        -- Admin reset: ensure must_change_password = true
        INSERT INTO user_onboarding (person_id, must_change_password, password_changed_at)
        VALUES (v_person_id, true, NULL)
        ON CONFLICT (person_id) DO UPDATE
        SET must_change_password = true,
            password_changed_at = NULL,
            updated_at = now();

        -- Clean up pending reset
        DELETE FROM pending_password_resets
        WHERE auth_user_id = NEW.id AND expires_at > now();
      ELSE
        -- Self-service: only clear if user was in onboarding state
        -- (must_change_password was true before this change)
        IF v_was_onboarding THEN
          INSERT INTO user_onboarding (person_id, must_change_password, password_changed_at)
          VALUES (v_person_id, false, now())
          ON CONFLICT (person_id) DO UPDATE
          SET must_change_password = false,
              password_changed_at = now(),
              updated_at = now();
        END IF;
      END IF;

      -- Audit (no password or hash)
      BEGIN
        INSERT INTO audit_events (pessoa_id, auth_user_id, recurso, acao, entidade, entidade_id, resultado)
        VALUES (v_person_id, NEW.id, 'auth', 'password_changed', 'user_onboarding', v_person_id, 'sucesso');
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS trg_password_changed ON auth.users;
CREATE TRIGGER trg_password_changed
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION fn_trg_password_changed();

-- Revoke direct execution
REVOKE EXECUTE ON FUNCTION fn_trg_password_changed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_trg_password_changed() FROM authenticated;
REVOKE EXECUTE ON FUNCTION fn_trg_password_changed() FROM anon;

-- RPC for admin to initiate a password reset (RBAC-protected)
CREATE OR REPLACE FUNCTION fn_initiate_admin_password_reset(p_auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_person_id UUID;
  v_is_admin BOOLEAN := false;
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Resolve caller's person_id
  SELECT ail.person_id INTO v_caller_person_id
  FROM auth_identity_links ail
  WHERE ail.auth_user_id = auth.uid();

  IF v_caller_person_id IS NULL THEN
    RAISE EXCEPTION 'No identity link for caller';
  END IF;

  -- Check admin/root role
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.person_id = v_caller_person_id
      AND r.nome IN ('root', 'admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Insufficient permissions: admin or root required';
  END IF;

  -- Clean up expired pending resets for target
  DELETE FROM pending_password_resets
  WHERE auth_user_id = p_auth_user_id AND expires_at <= now();

  -- Insert pending reset record
  INSERT INTO pending_password_resets (auth_user_id, initiated_by)
  VALUES (p_auth_user_id, auth.uid());

  -- Audit
  BEGIN
    INSERT INTO audit_events (pessoa_id, auth_user_id, recurso, acao, entidade, entidade_id, resultado)
    VALUES (v_caller_person_id, auth.uid(), 'auth', 'admin_password_reset_initiated', 'user_onboarding', p_auth_user_id, 'sucesso');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_initiate_admin_password_reset(UUID) TO authenticated;

-- Cleanup function for abandoned pending resets
CREATE OR REPLACE FUNCTION fn_cleanup_expired_password_resets()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM pending_password_resets WHERE expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;