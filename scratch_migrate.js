require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function migrate() {
    // If DATABASE_URL is not set, we can try to extract connection details from SUPABASE_URL if possible, 
    // but usually local Supabase has a standard DATABASE_URL.
    // Let's print the env to see if we have DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    console.log("Connecting to", dbUrl);
    
    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();
        const res = await client.query('ALTER TABLE flash_drop_requests ADD COLUMN IF NOT EXISTS media_url TEXT;');
        console.log("Success!", res);
        
        // Also reload schema cache
        await client.query('NOTIFY pgrst, \'reload schema\';');
        console.log("Schema reloaded.");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

migrate();
