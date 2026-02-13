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

async function createPartners() {
    console.log("Creating partner accounts...");

    const users = [
        {
            email: "Johndoe@gmail.com",
            password: "password123",
            full_name: "John Doe",
            username: "JohnDoe",
            role: "fan",
            bio: "A fan for testing."
        },
        {
            email: "Jendoe@gmail.com",
            password: "password123",
            full_name: "Jen Doe",
            username: "JenDoe",
            role: "creator",
            bio: "A creator for testing."
        }
    ];

    for (const user of users) {
        console.log(`Processing ${user.email}...`);

        // 1. Create Auth User
        const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
                full_name: user.full_name,
                username: user.username,
                role: user.role
            }
        });

        let userId = createdUser?.user?.id;

        if (createError) {
            console.log(`Failed to create auth user ${user.email} (might exist): ${createError.message}`);
            // Try to find existing user 
            // Note: In some setups, listing users requires more perms, assume creation fails only if exists.
            // But we can upsert profiles anyway if we find the user ID.
            // Since we can't easily find user via email in admin without listUsers permission on large sets or specific query support:

            try {
                // If create failed, maybe we can list users (inefficient but works for small sets or specific email query if supported)
                const { data: listData } = await supabase.auth.admin.listUsers();
                const existing = listData.users.find(u => u.email?.toLowerCase() === user.email.toLowerCase());
                if (existing) {
                    userId = existing.id;
                    console.log(`Found existing user ID: ${userId}`);
                } else {
                    console.error(`Could not create or find user ${user.email}`);
                    continue;
                }
            } catch (e) {
                console.error(`Error finding user:`, e);
                continue;
            }
        } else {
            console.log(`Created new auth user: ${userId}`);
        }

        if (userId) {
            // 2. Upsert Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    username: user.username,
                    full_name: user.full_name,
                    role: user.role,
                    bio: user.bio,
                    updated_at: new Date().toISOString()
                });

            if (profileError) {
                console.error(`Error updating profile for ${user.username}:`, profileError);
            } else {
                console.log(`Profile updated for ${user.username} (${user.role})`);
            }
        }
    }
    console.log("Partner creation complete.");
}

createPartners().catch(console.error);
