import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('confession_requests')
    .select('id, topic, room_id, creator_id, fan_id')
    .eq('room_id', 'f3b35702-0479-43da-a36c-1b25dbc3077a');
    
  console.log('Requests for this room:', data);
}

test();
