import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// GET /api/v1/schedules?creator_id=<uuid>
// Public: Fetch upcoming schedules for a creator
// ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get("creator_id");

    if (!creatorId) {
        return NextResponse.json({ error: "creator_id is required" }, { status: 400 });
    }

    try {
        const { data: schedules, error } = await supabase
            .from("creator_schedules")
            .select("*")
            .eq("creator_id", creatorId)
            .gte("end_time", new Date().toISOString())
            .order("start_time", { ascending: true });

        if (error) throw error;

        return NextResponse.json({ schedules: schedules || [] });
    } catch (err: any) {
        console.error("Fetch schedules error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// POST /api/v1/schedules
// Authenticated Creator: Add a new schedule slot
// Body: { room_type, title?, start_time, end_time }
// ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { room_type, title, start_time, end_time } = body;

        if (!room_type || !start_time || !end_time) {
            return NextResponse.json({ error: "room_type, start_time, and end_time are required" }, { status: 400 });
        }

        if (new Date(end_time) <= new Date(start_time)) {
            return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });
        }

        const { data: schedule, error } = await supabase
            .from("creator_schedules")
            .insert({
                creator_id: user.id,
                room_type,
                title: title || null,
                start_time,
                end_time,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, schedule });
    } catch (err: any) {
        console.error("Create schedule error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// DELETE /api/v1/schedules?id=<uuid>
// Authenticated Creator: Delete one of their schedules
// ──────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("id");

    if (!scheduleId) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    try {
        const { error } = await supabase
            .from("creator_schedules")
            .delete()
            .eq("id", scheduleId)
            .eq("creator_id", user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Delete schedule error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
