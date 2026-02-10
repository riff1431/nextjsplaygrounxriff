
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Helper to load env
function loadEnv() {
    const files = ['.env.local', '.env'];
    for (const file of files) {
        const p = path.resolve(process.cwd(), file);
        if (fs.existsSync(p)) {
            console.log(`Loading env from ${file}`);
            const content = fs.readFileSync(p, 'utf-8');
            const env: Record<string, string> = {};
            content.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const val = match[2].trim().replace(/^["']|["']$/g, '');
                    env[key] = val;
                }
            });
            return env;
        }
    }
    return {};
}

const env = loadEnv();
const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing env vars. URLs:", supabaseUrl, "KEY:", !!supabaseAnonKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    console.log("--- ROOMS ---");
    const { data: rooms } = await supabase.from('rooms').select('*');
    console.log(JSON.stringify(rooms, null, 2));

    console.log("\n--- RECENT CONFESSIONS (Limit 5) ---");
    const { data: confessions } = await supabase
        .from('confessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log(JSON.stringify(confessions, null, 2));
}

main();
