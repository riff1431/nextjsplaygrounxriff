// check_suga_settings.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, type');

  if (error) {
    console.error("Error querying rooms:", error);
  } else {
    console.log("All rooms:", data);
  }
}
run();
