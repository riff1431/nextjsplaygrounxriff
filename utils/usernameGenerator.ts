import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generates a unique username from first and last name.
 * It queries the profiles table to ensure uniqueness.
 */
export async function generateUniqueUsername(
    supabase: SupabaseClient,
    firstName: string,
    lastName: string
): Promise<string> {
    const cleanName = (val: string) => {
        return val
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "") // Keep only lowercase alphanumeric characters
            .trim();
    };

    const cleanedFirst = cleanName(firstName || "");
    const cleanedLast = cleanName(lastName || "");
    
    // Combine name. If empty, use a fallback
    let base = `${cleanedFirst}_${cleanedLast}`;
    if (base === "_") {
        base = "user";
    } else if (cleanedFirst && !cleanedLast) {
        base = cleanedFirst;
    } else if (!cleanedFirst && cleanedLast) {
        base = cleanedLast;
    }

    // Truncate base to ensure it remains a reasonable length when appending suffixes
    base = base.substring(0, 15);

    let isUnique = false;
    let username = base;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
        const { count, error } = await supabase
            .from("profiles")
            .select("username", { count: "exact", head: true })
            .eq("username", username);

        if (!error && count === 0) {
            isUnique = true;
        } else {
            // Append a random 3-digit number to base username
            const randomSuffix = Math.floor(100 + Math.random() * 900);
            username = `${base}${randomSuffix}`;
        }
        attempts++;
    }

    if (!isUnique) {
        // Fallback to timestamp suffix if all attempts fail
        username = `${base}${Date.now().toString().slice(-4)}`;
    }

    return username;
}
