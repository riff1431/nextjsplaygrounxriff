import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Helper: verify admin
async function verifyAdmin(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return null;
    return user;
}

// ──────────────────────────────────────────────────
// GET /api/v1/admin/reaction-catalog?room_type=...
// List all reactions, optionally filtered by room_type
// ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const roomType = searchParams.get("room_type");

    try {
        let query = supabase
            .from("room_reaction_catalog")
            .select("*")
            .order("sort_order", { ascending: true });

        if (roomType) {
            query = query.or(`room_type.eq.${roomType},room_type.is.null`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ reactions: data || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// POST /api/v1/admin/reaction-catalog
// Create a new reaction (admin only)
// Body: { room_type?, name, emoji, price, sort_order? }
// ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    try {
        const body = await request.json();
        const { room_type, name, emoji, price, sort_order } = body;

        if (!name || !emoji || price == null) {
            return NextResponse.json({ error: "name, emoji, and price are required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("room_reaction_catalog")
            .insert({
                room_type: room_type || null,
                name,
                emoji,
                price: Number(price),
                sort_order: sort_order || 0,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, reaction: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// PUT /api/v1/admin/reaction-catalog
// Update a reaction (admin only)
// Body: { id, ...fields }
// ──────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

        const allowed = ["room_type", "name", "emoji", "price", "is_active", "sort_order"];
        const filtered: Record<string, any> = { updated_at: new Date().toISOString() };
        for (const key of allowed) {
            if (updates[key] !== undefined) filtered[key] = updates[key];
        }

        const { data, error } = await supabase
            .from("room_reaction_catalog")
            .update(filtered)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, reaction: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// DELETE /api/v1/admin/reaction-catalog?id=...
// Delete a reaction (admin only)
// ──────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    try {
        const { error } = await supabase
            .from("room_reaction_catalog")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
