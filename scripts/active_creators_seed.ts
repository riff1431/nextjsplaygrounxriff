import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const levelMap = {
    Rookie: "215761bd-6eb2-4aa0-a3f4-988a4b8d9ab5",
    Rising: "936cdba3-6ff9-4623-9276-867c9394db45",
    Star: "a71ccaf3-f559-4698-bd3a-540790aa7520",
    Elite: "389746b4-6b67-402f-a201-634ee6bdff71"
};

const activeCreators = [
    {
        name: "NeonNyla",
        level: "Elite",
        tags: ["Truth or Dare", "Bar Lounge", "X Chat"],
        bio: "Live Truth or Dare sessions, Bar Lounge hangouts, and interactive X Chat rooms. Fans decide the vibe.",
        avatar_url: "/creators/creator-1.jpg"
    },
    {
        name: "LunaVibe",
        level: "Star",
        tags: ["Confessions", "Chat"],
        bio: "Confessions, late-night chats, and live reactions. Some stories surprise even me.",
        avatar_url: "/creators/creator-2.jpg"
    },
    {
        name: "AvaPulse",
        level: "Rising",
        tags: ["X Chat", "Live"],
        bio: "High-energy X Chat rooms and live audience interaction. Stay active, stay involved.",
        avatar_url: "/creators/creator-3.jpg"
    },
    {
        name: "ScarlettRay",
        level: "Elite",
        tags: ["Bar Lounge", "Premium"],
        bio: "Bar Lounge vibes, live conversations, and premium fan interaction.",
        avatar_url: "/creators/creator-4.jpg"
    },
    {
        name: "MiaNova",
        level: "Star",
        tags: ["Truth or Dare", "Confessions"],
        bio: "Truth or Dare challenges and Confessions rooms driven by fan participation.",
        avatar_url: "/creators/creator-5.jpg"
    },
    {
        name: "JadeLux",
        level: "Elite",
        tags: ["Suga 4 U", "VIP"],
        bio: "Luxury Suga 4U sessions, exclusive gifting, and VIP connections.",
        avatar_url: "/creators/creator-6.jpg"
    },
    {
        name: "SiennaFlow",
        level: "Rising",
        tags: ["Bar Lounge", "Hangouts"],
        bio: "Relaxed Bar Lounge chats, fan interaction, and live hangouts.",
        avatar_url: "/creators/creator-7.jpg"
    },
    {
        name: "AriaBliss",
        level: "Star",
        tags: ["Confessions", "Storytelling"],
        bio: "Confessions, reactions, and audience-led storytelling.",
        avatar_url: "/creators/creator-8.jpg"
    },
    {
        name: "VioletX",
        level: "Rising",
        tags: ["X Chat", "Real-time"],
        bio: "Live X Chat rooms with real-time engagement and top supporter interaction.",
        avatar_url: "/creators/creator-9.jpg"
    },
    {
        name: "NovaBelle",
        level: "Star",
        tags: ["Truth or Dare", "Interactive"],
        bio: "Truth or Dare rooms where fans shape the outcome.",
        avatar_url: "/creators/creator-10.jpg"
    },
    {
        name: "KiraMoon",
        level: "Rising",
        tags: ["Confessions", "Late-night"],
        bio: "Late-night Confessions and premium reactions.",
        avatar_url: "/creators/creator-11.jpg"
    },
    {
        name: "LexiSpark",
        level: "Rookie",
        tags: ["X Chat", "Tipping"],
        bio: "Fast-moving X Chat rooms with live tipping and pinned messages.",
        avatar_url: "/creators/creator-12.jpg"
    },
    {
        name: "ZaraWave",
        level: "Star",
        tags: ["Bar Lounge", "Interactive"],
        bio: "Bar Lounge hangouts and interactive fan conversations.",
        avatar_url: "/creators/creator-13.jpg"
    },
    {
        name: "RubyVixen",
        level: "Elite",
        tags: ["Truth or Dare", "Voting"],
        bio: "Truth or Dare challenges and live audience votes.",
        avatar_url: "/creators/creator-14.jpg"
    },
    {
        name: "NinaGlow",
        level: "Rising",
        tags: ["Confessions", "Trending"],
        bio: "Confessions, trending stories, and fan-driven reactions.",
        avatar_url: "/creators/creator-15.jpg"
    },
    {
        name: "IvyFame",
        level: "Star",
        tags: ["Competitions", "Voting"],
        bio: "Competitions, live rankings, and fan voting.",
        avatar_url: "/creators/creator-16.jpg"
    },
    {
        name: "TaliaXO",
        level: "Elite",
        tags: ["Confessions", "VIP"],
        bio: "Confessions and live reactions with VIP unlocks.",
        avatar_url: "/creators/creator-17.jpg"
    },
    {
        name: "RoxyLuxe",
        level: "Elite",
        tags: ["Suga 4 U", "Priority"],
        bio: "Suga 4U rooms, luxury gifting, and priority access.",
        avatar_url: "/creators/creator-18.jpg"
    },
    {
        name: "MattStar",
        level: "Star",
        tags: ["Competitions", "Influence"],
        bio: "Competitions, audience voting, and live fan influence.",
        avatar_url: "/creators/creator-19.jpg"
    },
    {
        name: "NoahVibe",
        level: "Rising",
        tags: ["Bar Lounge", "Confessions"],
        bio: "Bar Lounge chats, Confessions, and interactive live rooms.",
        avatar_url: "/creators/creator-20.jpg"
    }
];

async function seedCreators() {
    console.log(`Starting to seed ${activeCreators.length} creators...`);

    for (const creator of activeCreators) {
        const email = `${creator.name.toLowerCase()}@playgroundx.com`;
        const password = "password123"; // Default password for sample users

        // Check if user exists or create
        // We use admin.createUser which automatically handles existence check if we catch error, 
        // or we can list users. createUser throws if email exists usually? No, it returns error.
        // But listUsers is safer.

        let userId: string | null = null;

        // Try to get user by email first (Supabase Admin List Users by email isn't direct, have to list and filter or createUser and catch)
        // Simplest: Try creating. If fails with 'User already registered', then we need to fetch their ID.
        // Actually, listing users by email is possible in recent versions? listUsers({ query: email }) ?
        // Or supabase.rpc if exposed?
        // Let's rely on createUser returning error, then search for user.

        const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: creator.name,
                role: 'creator' // Important metadata
            }
        });

        if (createError) {
            console.log(`User ${email} creation result: ${createError.message}`);
            // If duplicate, find the user
            // Assuming we can list users. If we can't, we are stuck?
            // Standard way:
            const { data: users, error: listError } = await supabase.auth.admin.listUsers();
            if (listError) {
                console.error("Failed to list users to find existing:", listError);
                continue;
            }
            const found = users.users.find(u => u.email === email);
            if (found) {
                userId = found.id;
                console.log(`Found existing user ID for ${creator.name}: ${userId}`);
            } else {
                console.error(`Could not create or find user for ${creator.name}`);
                continue;
            }
        } else {
            userId = createdUser.user.id;
            console.log(`Created new user for ${creator.name}: ${userId}`);
        }

        if (!userId) continue;

        // Upsert Profile
        const profileData = {
            id: userId,
            username: creator.name,
            full_name: creator.name, // Using name as full name
            avatar_url: creator.avatar_url,
            bio: creator.bio,
            tags: creator.tags, // Array
            role: 'creator',
            creator_level_id: levelMap[creator.level as keyof typeof levelMap] || levelMap.Rookie,
            updated_at: new Date().toISOString()
        };

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profileData);

        if (profileError) {
            console.error(`Error updating profile for ${creator.name}:`, profileError);
        } else {
            console.log(`Updated profile for ${creator.name}`);
        }
    }

    console.log("Seeding complete.");
}

seedCreators().catch(e => console.error(e));
