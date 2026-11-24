-- 20261124090007_password_change_trigger.sql
-- Trigger auditável sobre mudança efetiva de auth.users.encrypted_password
-- Confirma troca de senha somente quando a credencial realmente muda

CREATE OR REPLACE FUNCTION fn_trg_password_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_person_id UUID;
  v_caller_role TEXT;
BEGIN
  -- Only fire when encrypted_password actually changes
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
    -- Determine who initiated the change
    v_caller_role := COALESCE(
      auth.role(),
      current_setting('request.jwt.claim.role', true),
      current_setting('request.jwt.role', true)
    );

    -- Resolve person via auth_identity_links
    SELECT ail.person_id INTO v_person_id
    FROM auth_identity_links ail
    WHERE ail.auth_user_id = NEW.id;

    IF v_person_id IS NOT NULL THEN
      -- Only clear must_change_password if the user changed their own password
      -- (authenticated role). Admin/service_role resets keep or set must_change_password = true.
      IF v_caller_role = 'authenticated' THEN
        INSERT INTO user_onboarding (person_id, must_change_password, password_changed_at)
        VALUES (v_person_id, false, now())
        ON CONFLICT (person_id) DO UPDATE
        SET must_change_password = false,
            password_changed_at = now(),
            updated_at = now();
      ELSE
        -- Admin/service_role reset: ensure must_change_password = true
        INSERT INTO user_onboarding (person_id, must_change_password, password_changed_at)
        VALUES (v_person_id, true, NULL)
        ON CONFLICT (person_id) DO UPDATE
        SET must_change_password = true,
            password_changed_at = NULL,
            updated_at = now();
      END IF;

      -- Audit (no password or hash) - wrapped to not crash Auth on failure
      BEGIN
        INSERT INTO audit_events (pessoa_id, auth_user_id, recurso, acao, entidade, entidade_id, resultado)
        VALUES (v_person_id, NEW.id, 'auth', 'password_changed', 'user_onboarding', v_person_id, 'sucesso');
      EXCEPTION WHEN OTHERS THEN
        -- Log but don't fail the password change
        NULL;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (SECURITY DEFINER, runs as postgres)
DROP TRIGGER IF EXISTS trg_password_changed ON auth.users;
CREATE TRIGGER trg_password_changed
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION fn_trg_password_changed();

-- Revoke direct execution of trigger function (it's a trigger, not callable)
REVOKE EXECUTE ON FUNCTION fn_trg_password_changed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_trg_password_changed() FROM authenticated;
REVOKE EXECUTE ON FUNCTION fn_trg_password_changed() FROM anon;
