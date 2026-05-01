import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const roomId = 'f3b35702-0479-43da-a36c-1b25dbc3077a';
  const creatorId = 'fba858d9-4862-46e0-99e0-09207967f08f';
  const fanId = '65ba2ca2-8107-4fbb-852b-7801b8d50c2f';

  const { data, error } = await supabase
    .from('confession_requests')
    .insert({
        room_id: roomId,
        fan_id: fanId,
        creator_id: creatorId,
        type: 'Text',
        topic: 'Test Dynamic Insert',
        amount: 99,
        status: 'pending_approval',
        fan_name: 'Test Fan',
        is_anonymous: false,
        confession_mode: '1on1'
    })
    .select()
    .single();
    
  console.log('Inserted request:', data);
  console.log('Error:', error);
}

test();
