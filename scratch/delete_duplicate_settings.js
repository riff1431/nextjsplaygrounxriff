const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Starting deletion of duplicate room settings...");

  // Delete competitions and flash-drops from room_settings table
  const { data: deleteData, error: deleteError } = await supabase
    .from('room_settings')
    .delete()
    .in('room_type', ['competitions', 'flash-drops'])
    .select();

  if (deleteError) {
    console.error("Error deleting duplicate room settings:", deleteError);
  } else {
    console.log("Successfully deleted entries:", deleteData);
  }

  // Verify the remaining entries
  const { data, error } = await supabase
    .from('room_settings')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error("Error fetching room settings:", error);
  } else {
    console.log("\nRemaining Room Settings in DB:");
    data.forEach(row => {
      console.log(`- ${row.display_name} (${row.room_type}): Active = ${row.is_active}`);
    });
  }
}

main();
