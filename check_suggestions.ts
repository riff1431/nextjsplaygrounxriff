import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase.from('platform_suggestions').select('*').limit(1);
  console.log('platform_suggestions:', error ? error.message : 'exists, count: ' + data?.length);
  
  const { data: d2, error: e2 } = await supabase.from('suggestions').select('*').limit(1);
  console.log('suggestions:', e2 ? e2.message : 'exists, count: ' + d2?.length);
}

check().catch(console.error);
