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

const activeCreators = [
    { name: "NeonNyla", bio: "Welcome to my world of neon lights and late night vibes! ✨" },
    { name: "LunaVibe", bio: "Sharing my secrets... are you ready? 🌙" },
    { name: "AvaPulse", bio: "Let's keep the energy high! ⚡️" },
    { name: "ScarlettRay", bio: "Premium vibes only. Join me in the lounge. 🍸" },
    { name: "MiaNova", bio: "Truth or Dare? I pick Dare. 😉" },
    { name: "JadeLux", bio: "Spoil me. 💎" },
    { name: "SiennaFlow", bio: "Just flowing with the music. 🎶" },
    { name: "AriaBliss", bio: "Tell me your story. 📖" },
    { name: "VioletX", bio: "Live and unfiltered. 💜" },
    { name: "NovaBelle", bio: "You shape the show. 🎭" },
    { name: "KiraMoon", bio: "Midnight confessions. 🌑" },
    { name: "LexiSpark", bio: "Fast lane living. 🏎️" },
    { name: "ZaraWave", bio: "Catch the wave. 🌊" },
    { name: "RubyVixen", bio: "Your vote matters. ❤️" },
    { name: "NinaGlow", bio: "Glowing up. ✨" },
    { name: "IvyFame", bio: "Aim for the top. 🏆" },
    { name: "TaliaXO", bio: "XOXO 💋" },
    { name: "RoxyLuxe", bio: "Luxury isn't a choice, it's a lifestyle. 🥂" },
    { name: "MattStar", bio: "Influence the game. ⭐" },
    { name: "NoahVibe", bio: "Chill vibes only. 🎧" }
];

async function seedPosts() {
    console.log(`Starting to seed public posts for ${activeCreators.length} creators...`);

    for (const creator of activeCreators) {
        // 1. Get User ID
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('username', creator.name)
            .single();

        if (profileError || !profile) {
            console.error(`Could not find profile for ${creator.name}:`, profileError?.message);
            continue;
        }

        // 2. Insert Post
        // Check if post already exists (simple duplicate check by caption/user)
        const { data: existing, error: existError } = await supabase
            .from('posts')
            .select('id')
            .eq('user_id', profile.id)
            .eq('caption', creator.bio) // Using bio as unique caption check
            .maybeSingle();

        if (existing) {
            console.log(`Post already exists for ${creator.name}`);
            continue;
        }

        const { error: postError } = await supabase
            .from('posts')
            .insert({
                user_id: profile.id,
                content_type: 'image',
                caption: creator.bio,
                media_url: profile.avatar_url, // Use profile image
                thumbnail_url: profile.avatar_url, // Use profile image as thumbnail
                is_paid: false,
                price: 0
            });

        if (postError) {
            console.error(`Error creating post for ${creator.name}:`, postError.message);
        } else {
            console.log(`Created public post for ${creator.name}`);
        }
    }

    console.log("Seeding posts complete.");
}

seedPosts().catch(e => console.error(e));
