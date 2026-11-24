// scripts/bootstrap-root.ts
// Bootstrap do primeiro ROOT via Supabase Admin API
// Executar: npx ts-node scripts/bootstrap-root.ts
// Requer: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ROOT_EMAIL, ROOT_TEMP_PASSWORD, ROOT_NOME

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ROOT_EMAIL = process.env.ROOT_EMAIL || 'evandro_j.o.a@hotmail.com';
const ROOT_TEMP_PASSWORD = process.env.ROOT_TEMP_PASSWORD;
const ROOT_NOME = process.env.ROOT_NOME || 'Evandro Andrade';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!ROOT_TEMP_PASSWORD) {
  console.error('Missing ROOT_TEMP_PASSWORD environment variable');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function bootstrap() {
  console.log('Checking if auth user already exists...');

  // Check if user exists
  const { data: existingUsers, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to list users:', listErr.message);
    process.exit(1);
  }

  const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === ROOT_EMAIL.toLowerCase());

  let authUserId: string;

  if (existing) {
    console.log('Auth user already exists. Skipping creation.');
    authUserId = existing.id;
  } else {
    console.log('Creating auth user...');
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: ROOT_EMAIL,
      password: ROOT_TEMP_PASSWORD,
      email_confirm: true,
    });

    if (createErr || !created?.user) {
      console.error('Failed to create auth user:', createErr?.message);
      process.exit(1);
    }

    authUserId = created.user.id;
    console.log('Auth user created successfully.');
  }

  // Invoke fn_provision_verified_initial_root
  console.log('Provisioning ROOT via RPC...');
  const { data: result, error: rpcErr } = await admin.rpc('fn_provision_verified_initial_root', {
    p_auth_user_id: authUserId,
    p_expected_email: ROOT_EMAIL,
    p_nome: ROOT_NOME,
  });

  if (rpcErr) {
    console.error('RPC failed:', rpcErr.message);
    process.exit(1);
  }

  console.log('Provisioning result:', JSON.stringify(result));
  console.log('Bootstrap complete. ROOT provisioned for:', ROOT_EMAIL);
  console.log('Auth user ID:', authUserId);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
EOF