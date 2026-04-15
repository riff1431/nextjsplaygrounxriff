import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { invalidateSplitCache } from "@/utils/finance/splitConfig";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// Helper: verify admin role
// Uses server client only for auth.getUser() (session cookie),
// then adminClient (service role) to read profiles — bypassing
// any RLS on the profiles table that could cause false 403s.
// ──────────────────────────────────────────────────
async function requireAdmin(supabase: any) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { user: null, error: "Unauthorized", status: 401 };

    // Use adminClient to bypass RLS when reading the user's role
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") return { user: null, error: "Admin access required", status: 403 };
    return { user, error: null, status: 200 };
}

// ──────────────────────────────────────────────────
// GET /api/v1/admin/split-config
// Returns all split config rows (admin only)
// ──────────────────────────────────────────────────
export async function GET() {
    const supabase = await createClient();
    const { user, error, status } = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error }, { status });

    // Use adminClient to bypass RLS on platform_split_config
    const adminClient = createAdminClient();
    const { data, error: dbErr } = await adminClient
        .from("platform_split_config")
        .select("*")
        .order("id", { ascending: true });

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    return NextResponse.json({ splits: data || [] });
}

// ──────────────────────────────────────────────────
// PUT /api/v1/admin/split-config
// Update a split config row by split_key (admin only)
// Body: { split_key, creator_pct, platform_pct, entry_fee?, cost_per_min?, min_charge?, description? }
// ──────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
    const supabase = await createClient();
    const { user, error, status } = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error }, { status });

    try {
        const body = await request.json();
        const { split_key, creator_pct, platform_pct, entry_fee, cost_per_min, min_charge, description } = body;

        if (!split_key) {
            return NextResponse.json({ error: "split_key is required" }, { status: 400 });
        }

        // Validate percentages
        if (creator_pct !== undefined || platform_pct !== undefined) {
            const c = Number(creator_pct ?? 0);
            const p = Number(platform_pct ?? 0);
            if (isNaN(c) || isNaN(p)) {
                return NextResponse.json({ error: "creator_pct and platform_pct must be numbers" }, { status: 400 });
            }
            if (Math.round((c + p) * 100) !== 10000) {
                return NextResponse.json({ error: `creator_pct + platform_pct must equal 100 (got ${c + p})` }, { status: 400 });
            }
            if (c < 0 || c > 100 || p < 0 || p > 100) {
                return NextResponse.json({ error: "Percentages must be between 0 and 100" }, { status: 400 });
            }
        }

        // Check if the row is editable
        const adminClient = createAdminClient();
        const { data: existing } = await adminClient
            .from("platform_split_config")
            .select("is_editable")
            .eq("split_key", split_key)
            .single();

        if (!existing) {
            return NextResponse.json({ error: `Split config '${split_key}' not found` }, { status: 404 });
        }
        if (!existing.is_editable) {
            return NextResponse.json({ error: `Split config '${split_key}' is locked and cannot be edited` }, { status: 403 });
        }

        // Build update payload — only include provided fields
        const updates: Record<string, any> = {
            updated_at: new Date().toISOString(),
            updated_by: user.id,
        };

        if (creator_pct !== undefined) updates.creator_pct = Number(creator_pct);
        if (platform_pct !== undefined) updates.platform_pct = Number(platform_pct);
        if (entry_fee !== undefined) updates.entry_fee = entry_fee === null ? null : Number(entry_fee);
        if (cost_per_min !== undefined) updates.cost_per_min = cost_per_min === null ? null : Number(cost_per_min);
        if (min_charge !== undefined) updates.min_charge = min_charge === null ? null : Number(min_charge);
        if (description !== undefined) updates.description = description;

        const { data, error: dbErr } = await adminClient
            .from("platform_split_config")
            .update(updates)
            .eq("split_key", split_key)
            .select()
            .single();

        if (dbErr) throw dbErr;

        // Invalidate cache so next request picks up the new value immediately
        invalidateSplitCache();

        return NextResponse.json({ success: true, split: data });
    } catch (err: any) {
        console.error("Update split config error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// POST /api/v1/admin/split-config/reset
// Reset a split to PRD defaults (admin only)
// Body: { split_key }
// ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { user, error, status } = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error }, { status });

    try {
        const body = await request.json();
        const { split_key } = body;
        if (!split_key) return NextResponse.json({ error: "split_key is required" }, { status: 400 });

        const PRD_DEFAULTS: Record<string, any> = {
            GLOBAL:           { creator_pct: 85, platform_pct: 15, entry_fee: null, cost_per_min: null, min_charge: null },
            PUBLIC_ENTRY:     { creator_pct: 0,  platform_pct: 100, entry_fee: 10,  cost_per_min: null, min_charge: null },
            PUBLIC_PER_MIN:   { creator_pct: 25, platform_pct: 75, entry_fee: null, cost_per_min: 2,   min_charge: null },
            PRIVATE_ENTRY:    { creator_pct: 50, platform_pct: 50, entry_fee: null, cost_per_min: null, min_charge: 20  },
            PRIVATE_PER_MIN:  { creator_pct: 50, platform_pct: 50, entry_fee: null, cost_per_min: 5,   min_charge: 5   },
            SUGA4U_FAVORITES: { creator_pct: 100, platform_pct: 0, entry_fee: null, cost_per_min: null, min_charge: null },
            COMPETITION_TIPS: { creator_pct: 100, platform_pct: 0, entry_fee: null, cost_per_min: null, min_charge: null },
        };

        const defaults = PRD_DEFAULTS[split_key];
        if (!defaults) return NextResponse.json({ error: `No defaults found for '${split_key}'` }, { status: 404 });

        const adminClient = createAdminClient();
        const { data, error: dbErr } = await adminClient
            .from("platform_split_config")
            .update({ ...defaults, updated_at: new Date().toISOString(), updated_by: user.id })
            .eq("split_key", split_key)
            .select()
            .single();

        if (dbErr) throw dbErr;

        // Invalidate cache so next request picks up the reset value immediately
        invalidateSplitCache();

        return NextResponse.json({ success: true, split: data });
    } catch (err: any) {
        console.error("Reset split config error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
