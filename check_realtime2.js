const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const roomId = '842cfa6a-faff-43f7-96f8-f43b50f22be7';

const channel = anonClient.channel(`test_${Date.now()}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suga_paid_requests' }, (payload) => {
    console.log("ANON RECEIVED INSERT:", payload);
  })
  .subscribe((status) => {
    console.log("ANON SUBSCRIPTION STATUS:", status);
    if (status === 'SUBSCRIBED') {
       // Admin inserts row
       adminClient.from('suga_paid_requests').insert({
         room_id: roomId, fan_name: 'Test', type: 'POSE', label: 'Test', price: 10, status: 'pending'
       }).then(res => console.log("ADMIN INSERT RESULT:", res));
    }
  });

setTimeout(() => {
  console.log("Timeout, exiting.");
  process.exit(0);
}, 5000);
