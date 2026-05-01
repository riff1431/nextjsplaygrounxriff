import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: policies } = await supabase.rpc('get_policies', { table_name: 'confession_requests' }).catch(() => ({ data: 'rpc failed' }));
  console.log('Policies RPC:', policies);

  // Fallback: run raw SQL using postgres function if possible? We don't have direct SQL access.
  // Instead, let's test RLS directly.
  // I will create a client acting as the creator 'fba858d9-4862-46e0-99e0-09207967f08f'
  // But wait, we can't create an authenticated client without JWT signing.

  console.log("Checking if RLS is enabled...");
}
test();
