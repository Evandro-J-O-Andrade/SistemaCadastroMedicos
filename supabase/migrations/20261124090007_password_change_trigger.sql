-- 20261124090007_password_change_trigger.sql
-- Trigger auditável sobre mudança efetiva de auth.users.encrypted_password
-- Confirma troca de senha somente quando a credencial realmente muda.
-- Distingue troca pelo usuário (self-service) de reset administrativo
-- via tabela pending_password_resets, sem depender de auth.role().

-- Tabela de resets administrativos pendentes
CREATE TABLE IF NOT EXISTS pending_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_pending_resets_user ON pending_password_resets(auth_user_id);

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
BEGIN
  -- Only fire when encrypted_password actually changes
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
    -- Resolve person via auth_identity_links
    SELECT ail.person_id INTO v_person_id
    FROM auth_identity_links ail
    WHERE ail.auth_user_id = NEW.id;

    IF v_person_id IS NOT NULL THEN
      -- Check if this is an admin reset (pending record exists)
      SELECT EXISTS (
        SELECT 1 FROM pending_password_resets
        WHERE auth_user_id = NEW.id
          AND expires_at > now()
      ) INTO v_is_admin_reset;

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
        -- Self-service change: clear must_change_password
        INSERT INTO user_onboarding (person_id, must_change_password, password_changed_at)
        VALUES (v_person_id, false, now())
        ON CONFLICT (person_id) DO UPDATE
        SET must_change_password = false,
            password_changed_at = now(),
            updated_at = now();
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

-- RPC for admin to initiate a password reset (inserts pending record)
CREATE OR REPLACE FUNCTION fn_initiate_admin_password_reset(p_auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Insert pending reset record
  INSERT INTO pending_password_resets (auth_user_id, initiated_by)
  VALUES (p_auth_user_id, auth.uid());
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_initiate_admin_password_reset(UUID) TO authenticated;