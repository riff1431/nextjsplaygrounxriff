import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const { data, error } = await supabase.from('room_settings').select('room_type, is_active, display_name');
  if (error) {
    console.error("Error fetching room_settings:", error);
  } else {
    console.log("Room Settings in DB:", JSON.stringify(data, null, 2));
  }
}

main();
