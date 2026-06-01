import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('iframe_menus')
    .select('*');
  if (error) {
    console.error("Error fetching iframe_menus with ANON key:", error);
  } else {
    console.log("Iframe menus records with ANON key:", JSON.stringify(data, null, 2));
  }
}
run();
