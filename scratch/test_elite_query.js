const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testEliteQuery() {
    console.log("Testing Posts Query filtering by Elite creator_level_plans...");
    const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
            id,
            user_id,
            caption,
            profiles!user_id!inner(
                id, 
                username, 
                role,
                creator_level_plans:creator_level_id!inner(
                    id,
                    name,
                    display_name
                )
            )
        `)
        .eq('profiles.role', 'creator')
        .eq('profiles.creator_level_plans.name', 'elite')
        .limit(5);

    if (postsError) {
        console.error("Query Error with creator_level_plans name:", postsError);
    } else {
        console.log("Query success with creator_level_plans! Found posts:", postsData.length);
        console.log("Sample post data:", JSON.stringify(postsData, null, 2));
    }

    console.log("\nTesting Profiles Query for Elite creators...");
    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
            id,
            username,
            role,
            creator_level_plans:creator_level_id!inner(
                id,
                name,
                display_name
            )
        `)
        .eq('role', 'creator')
        .eq('creator_level_plans.name', 'elite')
        .limit(5);

    if (profilesError) {
        console.error("Query Error for profiles with creator_level_plans name:", profilesError);
    } else {
        console.log("Query success for profiles! Found profiles:", profilesData.length);
        console.log("Sample profiles data:", JSON.stringify(profilesData, null, 2));
    }
}

testEliteQuery();
