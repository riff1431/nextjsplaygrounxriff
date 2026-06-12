const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log("=== Starting Role Transitions E2E Simulation ===");
  
  // 1. Sign in as the creator
  const email = 'greenwordpress.com@gmail.com';
  const password = 'greenwordpress.com@gmail.com';
  console.log(`[Auth] Signing in user: ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    console.error("[-] Auth sign in failed:", authError.message);
    process.exit(1);
  }

  const user = authData.user;
  console.log(`[+] Auth signed in successfully. User ID: ${user.id}`);

  // Get supabase client authenticated with the user session
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
  // Set the session explicitly to simulate client-side context
  await client.auth.setSession({
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token
  });

  // 2. Fetch initial profile state
  console.log("[Profile] Fetching initial profile...");
  const { data: initialProfile, error: profileError } = await client
    .from('profiles')
    .select('role, is_creator')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("[-] Failed to fetch profile:", profileError.message);
    process.exit(1);
  }

  console.log(`[+] Initial profile: role="${initialProfile.role}", is_creator=${initialProfile.is_creator}`);
  
  if (!initialProfile.is_creator) {
    console.error("[-] Test user must be a creator to verify role switching.");
    process.exit(1);
  }

  // 3. Switch Creator to Fan view
  console.log("\n[Transition] Switching role from creator to fan...");
  
  // Update profiles role
  const { error: updateProfileErr1 } = await client
    .from('profiles')
    .update({ role: 'fan' })
    .eq('id', user.id);
    
  if (updateProfileErr1) {
    console.error("[-] Profile switch to 'fan' failed:", updateProfileErr1.message);
    process.exit(1);
  }
  
  // Update auth metadata role
  const { data: updateAuthData1, error: updateAuthErr1 } = await client.auth.updateUser({
    data: { role: 'fan' }
  });
  
  if (updateAuthErr1) {
    console.error("[-] Auth metadata switch to 'fan' failed:", updateAuthErr1.message);
    process.exit(1);
  }

  // Verify transition to fan
  const { data: fanProfile, error: fanProfileErr } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (fanProfileErr) {
    console.error("[-] Failed to fetch profile after transition:", fanProfileErr.message);
    process.exit(1);
  }
  
  const fanMetadataRole = updateAuthData1.user.user_metadata?.role;
  console.log(`[+] Verification (Fan View): database.role="${fanProfile.role}", metadata.role="${fanMetadataRole}"`);
  
  if (fanProfile.role !== 'fan' || fanMetadataRole !== 'fan') {
    console.error("[-] Transition to 'fan' failed to persist correctly.");
    process.exit(1);
  }

  // 4. Switch Fan back to Creator view
  console.log("\n[Transition] Switching role back from fan to creator...");
  
  // Update profiles role
  const { error: updateProfileErr2 } = await client
    .from('profiles')
    .update({ role: 'creator' })
    .eq('id', user.id);
    
  if (updateProfileErr2) {
    console.error("[-] Profile switch to 'creator' failed:", updateProfileErr2.message);
    process.exit(1);
  }
  
  // Update auth metadata role
  const { data: updateAuthData2, error: updateAuthErr2 } = await client.auth.updateUser({
    data: { role: 'creator' }
  });
  
  if (updateAuthErr2) {
    console.error("[-] Auth metadata switch to 'creator' failed:", updateAuthErr2.message);
    process.exit(1);
  }

  // Verify transition to creator
  const { data: creatorProfile, error: creatorProfileErr } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (creatorProfileErr) {
    console.error("[-] Failed to fetch profile after transition back:", creatorProfileErr.message);
    process.exit(1);
  }
  
  const creatorMetadataRole = updateAuthData2.user.user_metadata?.role;
  console.log(`[+] Verification (Creator Hub): database.role="${creatorProfile.role}", metadata.role="${creatorMetadataRole}"`);
  
  if (creatorProfile.role !== 'creator' || creatorMetadataRole !== 'creator') {
    console.error("[-] Transition back to 'creator' failed to persist correctly.");
    process.exit(1);
  }

  console.log("\n[+] E2E Simulation completed successfully! All role transitions and metadata syncs match perfectly.");
}

run().catch(err => {
  console.error("Unexpected error in E2E verification script:", err);
  process.exit(1);
});
