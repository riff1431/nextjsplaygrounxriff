const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('room_settings')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error("Error fetching room settings:", error);
  } else {
    console.log("Room Settings from DB:");
    data.forEach(row => {
      console.log(`- ${row.display_name} (${row.room_type}):`);
      console.log(`  Active: ${row.is_active}`);
      console.log(`  Public Entry Fee: ${row.public_entry_fee}`);
      console.log(`  Min Private Entry Fee: ${row.min_private_entry_fee}`);
      console.log(`  Public Cost Per Min: ${row.public_cost_per_min}`);
      console.log(`  Min Private Cost Per Min: ${row.min_private_cost_per_min}`);
      console.log(`  Billing Enabled (Per-Min): ${row.billing_enabled}`);
      console.log(`  Public Sessions Enabled: ${row.public_sessions_enabled}`);
      console.log(`  Private Sessions Enabled: ${row.private_sessions_enabled}`);
      console.log(`  Tips Enabled: ${row.tips_enabled}`);
      console.log(`  Custom Requests Enabled: ${row.custom_requests_enabled}`);
    });
  }
}

main();
