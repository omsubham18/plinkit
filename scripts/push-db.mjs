import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local file not found.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split(/\r?\n/);
let dbUrl = '';

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    dbUrl = trimmed.substring('DATABASE_URL='.length).trim();
    // Strip optional surrounding quotes
    if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
      dbUrl = dbUrl.slice(1, -1).trim();
    }
    break;
  }
}

if (!dbUrl || dbUrl.includes('[YOUR-PASSWORD]') || !dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
  console.error('\nError: Please add a valid DATABASE_URL in .env.local first.');
  console.error('Example: DATABASE_URL=postgresql://postgres.xxx:mypassword@aws-0-eu-central-1.pooler.supabase.com:6543/postgres\n');
  process.exit(1);
}

console.log('Connecting to Supabase and pushing all migrations...');

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

try {
  execSync(`${npxCmd} supabase db push --db-url "${dbUrl}"`, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('\nSuccess: All migrations have been pushed to Supabase!');
} catch {
  console.error('\nFailed to push migrations. Please verify your connection string and database password.');
  process.exit(1);
}
