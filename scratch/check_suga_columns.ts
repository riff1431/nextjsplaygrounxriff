import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('suga_paid_requests')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching suga_paid_requests:', error);
  } else {
    console.log('Columns in suga_paid_requests:', data.length > 0 ? Object.keys(data[0]) : 'No rows found');
  }
}

test();
