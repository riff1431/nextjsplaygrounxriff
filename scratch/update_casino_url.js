import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Updating Casino URL to local route /rooms/casino-game to allow framing...");
  const { data, error } = await supabase
    .from('iframe_menus')
    .update({ url: '/rooms/casino-game' })
    .eq('id', 'c3d04d6f-8d47-4055-89e3-94cfc1f81f3c')
    .select();

  if (error) {
    console.error("Error updating Casino record in database:", error);
  } else {
    console.log("Successfully updated database record:", JSON.stringify(data, null, 2));
  }
}
run();
