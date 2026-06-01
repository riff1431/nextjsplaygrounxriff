import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

async function runOnPort(port: number, sql: string) {
  const connectionString = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  console.log(`Connecting to PostgreSQL on port ${port}...`);
  const sqlClient = postgres(connectionString);

  try {
    await sqlClient.unsafe(sql);
    console.log(`Successfully applied SMTP migration on port ${port}!`);
    return true;
  } catch (err: any) {
    console.log(`Failed on port ${port}:`, err.message);
    return false;
  } finally {
    await sqlClient.end();
  }
}

async function main() {
  const migrationPath = 'supabase/migrations/20260602000000_create_smtp_settings.sql';
  console.log(`Reading migration from ${migrationPath}...`);
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  const success1 = await runOnPort(54322, sql);
  if (!success1) {
    const success2 = await runOnPort(5432, sql);
    if (!success2) {
      console.error("Could not apply migration to either port 54322 or 5432.");
      process.exit(1);
    }
  }
}

main();
