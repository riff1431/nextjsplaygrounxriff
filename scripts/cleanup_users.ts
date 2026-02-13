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

async function cleanupUsers() {
    console.log("Starting user cleanup...");

    let allUsers: any[] = [];
    let page = 0;
    const perPage = 50;

    // Fetch all users
    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: perPage
        });

        if (error) {
            console.error("Error listing users:", error);
            break;
        }

        if (!users || users.length === 0) break;

        allUsers = [...allUsers, ...users];
        page++;
    }

    console.log(`Found ${allUsers.length} total users.`);

    let deletedCount = 0;
    let keptCount = 0;

    for (const user of allUsers) {
        // Keep only users with @playgroundx.com email
        if (user.email && user.email.endsWith('@playgroundx.com')) {
            console.log(`Keeping active creator: ${user.email}`);
            keptCount++;
        } else {
            console.log(`Deleting user: ${user.email} (${user.id})`);
            try {
                const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
                if (deleteError) {
                    console.error(`Failed to delete ${user.email}:`, deleteError.message);
                } else {
                    deletedCount++;
                }
            } catch (err) {
                console.error(`Exception deleting ${user.email}:`, err);
            }
            // Add delay to avoid rate limits or Db locks
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log(`Cleanup complete.`);
    console.log(`Deleted: ${deletedCount}`);
    console.log(`Kept: ${keptCount}`);
}

cleanupUsers().catch(e => console.error(e));
