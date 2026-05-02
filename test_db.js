import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('transfer_funds', {
    p_from_user_id: '65ba2ca2-8107-4fbb-852b-7801b8d50c2f', // Fan
    p_to_user_id: 'fba858d9-4862-46e0-99e0-09207967f08f', // Creator
    p_amount: 10,
    p_description: 'Test transfer',
    p_room_id: '0e3a38dc-f84d-463e-afac-b20e70fca8dd'
  });
  console.log("Transfer with p_room_id:", error ? error.message : "Success");
}
run();
