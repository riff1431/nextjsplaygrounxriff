import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

async function runOnPort(port: number, sql: string) {
  const connectionString = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  console.log(`Connecting to PostgreSQL on port ${port}...`);
  const sqlClient = postgres(connectionString);

  try {
    await sqlClient.unsafe(sql);
    console.log(`Successfully applied room_settings realtime migration on port ${port}!`);
    return true;
  } catch (err: any) {
    console.log(`Failed on port ${port}:`, err.message);
    return false;
  } finally {
    await sqlClient.end();
  }
}

async function main() {
  const sql = fs.readFileSync('supabase/migrations/20260524_enable_room_settings_realtime.sql', 'utf8');
  const success1 = await runOnPort(54322, sql);
  if (!success1) {
    await runOnPort(5432, sql);
  }
}

main();
