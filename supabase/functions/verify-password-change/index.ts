// supabase/functions/verify-password-change/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user is ROOT (check auth_identity_links + user_roles)
    const { data: link } = await adminClient
      .from('auth_identity_links')
      .select('person_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!link?.person_id) {
      return new Response(JSON.stringify({ error: 'No identity link' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check ROOT role
    const { data: roles } = await adminClient
      .from('user_roles')
      .select('role_id, roles!inner(nome)')
      .eq('person_id', link.person_id);

    const isRoot = (roles || []).some((r: any) => r.roles?.nome === 'root');
    if (!isRoot) {
      return new Response(JSON.stringify({ error: 'Recovery only available to ROOT' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check state is consistent with pre-trigger change
    const { data: onboarding } = await adminClient
      .from('user_onboarding')
      .select('must_change_password, password_changed_at')
      .eq('person_id', link.person_id)
      .single();

    if (!onboarding || !onboarding.must_change_password || onboarding.password_changed_at !== null) {
      return new Response(JSON.stringify({ error: 'Onboarding state not eligible for recovery' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // One-time recovery: confirm password change
    const { data, error: rpcErr } = await adminClient.rpc('fn_confirm_password_changed_by_auth_user', {
      p_auth_user_id: user.id,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Audit
    await adminClient.from('audit_events').insert({
      pessoa_id: link.person_id,
      auth_user_id: user.id,
      recurso: 'auth',
      acao: 'password_changed_recovery_root',
      entidade: 'user_onboarding',
      entidade_id: link.person_id,
      resultado: 'sucesso',
    });

    return new Response(JSON.stringify({ success: data, recovery: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});