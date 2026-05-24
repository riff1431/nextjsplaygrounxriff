import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Use the public anon key to simulate client-side fetch
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const { data, error } = await supabase.from('room_settings').select('room_type, is_active');
  if (error) {
    console.error("Client fetch failed:", error.message);
  } else {
    console.log("Client fetch succeeded! Data:", data);
  }
}

main();
