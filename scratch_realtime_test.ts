import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const roomId = 'f3b35702-0479-43da-a36c-1b25dbc3077a';

  const channel = supabase
    .channel(`test-realtime`)
    .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "confession_requests",
    }, (payload) => {
        console.log("REALTIME EVENT RECEIVED:", payload);
    })
    .subscribe((status) => {
        console.log("Subscription status:", status);
    });
    
  console.log("Waiting for events (10s)...");
  setTimeout(() => {
    supabase.removeChannel(channel);
    console.log("Done waiting.");
    process.exit(0);
  }, 10000);
}

test();
