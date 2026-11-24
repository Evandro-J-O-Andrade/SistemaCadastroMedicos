// supabase/functions/confirm-password-change/index.ts
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

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'confirm';

    // Verify user via anon client with their JWT
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

    if (action === 'start') {
      // Create a new attempt with unique token
      const attemptToken = crypto.randomUUID();
      const { error: insertErr } = await adminClient
        .from('password_change_attempts')
        .insert({
          auth_user_id: user.id,
          attempt_token: attemptToken,
        });

      if (insertErr) {
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ token: attemptToken }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'confirm') {
      const token = body.token;
      if (!token) {
        return new Response(JSON.stringify({ error: 'Missing token' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch the attempt
      const { data: attempt, error: fetchErr } = await adminClient
        .from('password_change_attempts')
        .select('*')
        .eq('attempt_token', token)
        .eq('auth_user_id', user.id)
        .single();

      if (fetchErr || !attempt) {
        return new Response(JSON.stringify({ error: 'Invalid or expired attempt' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check expiry
      if (new Date(attempt.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Attempt expired' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if already consumed (replay protection)
      if (attempt.consumed) {
        return new Response(JSON.stringify({ error: 'Attempt already used' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify that the password was actually changed:
      // The JWT's iat must be after the attempt was created, proving a new session
      // was issued (Supabase issues new tokens on password change)
      const jwtPayload = JSON.parse(atob(authHeader.replace('Bearer ', '').split('.')[1]));
      const tokenIat = jwtPayload.iat * 1000;
      const attemptCreated = new Date(attempt.created_at).getTime();

      if (tokenIat <= attemptCreated) {
        return new Response(JSON.stringify({ error: 'Password not changed since attempt started' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Mark attempt as consumed
      await adminClient
        .from('password_change_attempts')
        .update({ consumed: true, consumed_at: new Date().toISOString() })
        .eq('id', attempt.id);

      // Call the confirmation RPC
      const { data, error: rpcErr } = await adminClient.rpc('fn_confirm_password_changed_by_auth_user', {
        p_auth_user_id: user.id,
      });

      if (rpcErr) {
        return new Response(JSON.stringify({ error: rpcErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
