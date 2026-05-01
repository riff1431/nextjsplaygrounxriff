const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const roomId = '842cfa6a-faff-43f7-96f8-f43b50f22be7';
const channel = supabase.channel(`test_${Date.now()}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suga_paid_requests' }, (payload) => {
    console.log("RECEIVED INSERT:", payload);
  })
  .subscribe((status) => {
    console.log("SUBSCRIPTION STATUS:", status);
    if (status === 'SUBSCRIBED') {
       // Trigger an insert
       supabase.from('suga_paid_requests').insert({
         room_id: roomId, fan_name: 'Test', type: 'POSE', label: 'Test', price: 10, status: 'pending'
       }).then(res => console.log("INSERT RESULT:", res));
    }
  });

setTimeout(() => {
  console.log("Timeout, exiting.");
  process.exit(0);
}, 5000);
