
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
    console.log('Running migration...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Try to find the service role key, fall back to anon (which might fail for DDL but worth a shot for debug environment)
    // Actually, DDL usually requires service_role or database connection. 
    // If we only have anon key, we can't run DDL via 'rpc' unless there's a specific function exposed.
    // However, for this environment, often the setup allows using the anon key for initial development or the user has the service role in .env.local?
    // Let's check environment vars first.

    // Assuming we might have SUPABASE_SERVICE_ROLE_KEY in .env.local
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase URL or Key');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const migrationPath = path.join(__dirname, '../supabase/migrations/20260201_create_payment_settings.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Supabase JS client doesn't expose a raw 'query' method for DDL easily.
    // But we can use 'postgres' via connection string if we had it.
    // OR we can misuse an RPC call if one exists for executing SQL (unlikely).
    // Wait, if we are in local dev, we might be able to use the `supabase` CLI check status result??
    // The previous tool call output for `npx supabase status` isn't back yet.

    // ALTERNATIVE: Use the postgres-js library to connect directly if we can guess the connection string?
    // 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' is typical for local supabase.

    const postgres = require('postgres');
    // Default local supabase db port is 54322
    const sqlClient = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres');

    try {
        console.log('Connecting to local DB...');
        await sqlClient.unsafe(sql);
        console.log('Migration applied successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await sqlClient.end();
    }
}

runMigration();
