import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * GET /api/admin/confessions
 * Admin-only: Returns all confessions across all rooms with creator enrichment.
 * Query params:
 *   status - filter by status (Published, Draft, etc.)
 *   tier   - filter by tier (Soft, Spicy, Dirty, Diamonds, Forbidden)
 *   q      - search title/teaser text
 */
export async function GET(request: NextRequest) {
    try {
        // 1. Auth: verify caller is admin
        const supabase = await createClient();
        const {
            data: { user: caller },
        } = await supabase.auth.getUser();

        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminClient = createAdminClient();

        const { data: callerProfile } = await adminClient
            .from("profiles")
            .select("role")
            .eq("id", caller.id)
            .maybeSingle();

        const isAdmin =
            callerProfile?.role === "admin" ||
            caller.user_metadata?.role === "admin" ||
            caller.app_metadata?.role === "admin";

        if (!isAdmin) {
            return NextResponse.json(
                { error: "Access denied: Admin only" },
                { status: 403 }
            );
        }

        // 2. Parse query params
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status")?.trim() || "";
        const tier = searchParams.get("tier")?.trim() || "";
        const q = searchParams.get("q")?.trim() || "";

        // 3. Build confessions query
        let query = adminClient
            .from("confessions")
            .select("*")
            .order("created_at", { ascending: false });

        if (status && status !== "All") {
            query = query.eq("status", status);
        }

        if (tier && tier !== "All") {
            query = query.eq("tier", tier);
        }

        if (q) {
            query = query.or(`title.ilike.%${q}%,teaser.ilike.%${q}%`);
        }

        const { data: confessions, error: confErr } = await query;

        if (confErr) {
            return NextResponse.json({ error: confErr.message }, { status: 500 });
        }

        if (!confessions || confessions.length === 0) {
            return NextResponse.json({ confessions: [], stats: { total: 0, byTier: {}, totalUnlocks: 0 } });
        }

        // 4. Enrich with creator info via rooms → profiles
        const roomIds = [...new Set(confessions.map((c: any) => c.room_id))];

        const { data: rooms } = await adminClient
            .from("rooms")
            .select("id, host_id, slug")
            .in("id", roomIds);

        let creatorMap = new Map<string, any>();

        if (rooms && rooms.length > 0) {
            const hostIds = [...new Set(rooms.map((r: any) => r.host_id))];
            const { data: profiles } = await adminClient
                .from("profiles")
                .select("id, full_name, username, avatar_url")
                .in("id", hostIds);

            if (profiles) {
                const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
                for (const room of rooms) {
                    creatorMap.set(room.id, profileMap.get(room.host_id) || null);
                }
            }
        }

        // 5. Get unlock counts per confession
        const confessionIds = confessions.map((c: any) => c.id);
        const { data: unlockData } = await adminClient
            .from("confession_unlocks")
            .select("confession_id")
            .in("confession_id", confessionIds);

        const unlockCounts = new Map<string, number>();
        if (unlockData) {
            for (const u of unlockData) {
                unlockCounts.set(u.confession_id, (unlockCounts.get(u.confession_id) || 0) + 1);
            }
        }

        // 6. Build enriched response
        const enriched = confessions.map((c: any) => ({
            ...c,
            creator: creatorMap.get(c.room_id) || null,
            unlock_count: unlockCounts.get(c.id) || 0,
        }));

        // 7. Compute stats
        const byTier: Record<string, number> = {};
        let totalUnlocks = 0;
        for (const c of enriched) {
            const t = c.tier || "Unknown";
            byTier[t] = (byTier[t] || 0) + 1;
            totalUnlocks += c.unlock_count;
        }

        return NextResponse.json({
            confessions: enriched,
            stats: {
                total: enriched.length,
                byTier,
                totalUnlocks,
            },
        });
    } catch (err: any) {
        console.error("[ADMIN CONFESSIONS] Error:", err);
        return NextResponse.json(
            { error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
}
