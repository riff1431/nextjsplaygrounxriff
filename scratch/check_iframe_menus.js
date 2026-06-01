import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('iframe_menus')
    .select('*');
  if (error) {
    console.error("Error fetching iframe_menus:", error);
  } else {
    console.log("Iframe menus records:", JSON.stringify(data, null, 2));
  }
}
run();
