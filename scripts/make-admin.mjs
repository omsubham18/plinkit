import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const p = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) {
    console.error('.env.local not found');
    process.exit(1);
  }
  const lines = fs.readFileSync(p, 'utf-8').split(/\r?\n/);
  const env = {};
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, eq).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const targetEmail = process.argv[2]?.trim()?.toLowerCase();

  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Error listing users:', listErr.message);
    process.exit(1);
  }

  const { data: currentAdmins } = await supabase.from('admins').select('*');
  const adminIds = new Set((currentAdmins || []).map((a) => a.user_id));

  console.log('\n--- Current Registered Users in Supabase ---');
  if (!users || users.length === 0) {
    console.log('No registered users yet. Sign in once on http://localhost:5173/account or checkout first.');
  } else {
    for (const u of users) {
      const isAdmin = adminIds.has(u.id);
      console.log(`- ${u.email} (id: ${u.id}) ${isAdmin ? '[ADMIN]' : ''}`);
    }
  }

  if (!targetEmail) {
    console.log('\nUsage to make a user admin:');
    console.log('  node scripts/make-admin.mjs <your-email@example.com>\n');
    return;
  }

  const user = users?.find((u) => u.email?.toLowerCase() === targetEmail);
  if (!user) {
    console.error(`\nUser with email "${targetEmail}" not found in Supabase auth.users.`);
    console.log('Make sure to sign in on the website once first, then re-run this command.\n');
    process.exit(1);
  }

  const { error: insertErr } = await supabase.from('admins').upsert({ user_id: user.id });
  if (insertErr) {
    console.error('Failed to add admin:', insertErr.message);
    process.exit(1);
  }

  console.log(`\nSUCCESS: User "${user.email}" (${user.id}) is now an ADMIN in public.admins!`);
  console.log('You can now open http://localhost:5173/admin to access the Operator Console.\n');
}

main();
