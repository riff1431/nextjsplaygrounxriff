
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
    console.error("Missing env vars.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    const correctRoomId = '9b3ebfe9-4c61-4f7d-815e-23c74150e34a';
    const wrongRoomId = 'd091a6c4-3acd-4923-aec6-dea97674ea71';

    console.log(`Moving confessions from ${wrongRoomId} to ${correctRoomId}...`);

    const { error, count } = await supabase
        .from('confessions')
        .update({ room_id: correctRoomId })
        .eq('room_id', wrongRoomId)
        .select('*', { count: 'exact' });

    if (error) console.error("Error updating:", error);
    else console.log(`Success! Confessions moved.`);
}

main();
