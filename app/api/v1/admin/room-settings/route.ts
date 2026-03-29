import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// GET /api/v1/admin/room-settings
// List all room settings (admin only)
// ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { data: settings, error } = await supabase
        .from("room_settings")
        .select("*")
        .order("sort_order", { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: settings || [] });
}

// ──────────────────────────────────────────────────
// PUT /api/v1/admin/room-settings
// Update room settings
// Body: { room_type, ...fieldsToUpdate }
// ──────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { room_type, ...updates } = body;

        if (!room_type) {
            return NextResponse.json({ error: "room_type is required" }, { status: 400 });
        }

        // Allowed fields
        const allowedFields = [
            "display_name", "icon_url", "is_active",
            "public_entry_fee", "min_private_entry_fee",
            "public_sessions_enabled", "private_sessions_enabled",
            "tips_enabled", "custom_requests_enabled", "sort_order",
            "entry_info_section1", "entry_info_section2",
            "entry_info_section3", "entry_info_pro_tip",
        ];

        const filteredUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                filteredUpdates[key] = updates[key];
            }
        }

        const { data, error } = await supabase
            .from("room_settings")
            .update(filteredUpdates)
            .eq("room_type", room_type)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, settings: data });
    } catch (err: any) {
        console.error("Update room settings error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
