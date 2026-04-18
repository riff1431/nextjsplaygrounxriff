import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const supabase = await createClient();
    const { roomId } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const price = Number(body.price) || 10;

        // Fetch room
        const { data: room, error: roomErr } = await supabase
            .from("rooms")
            .select("id, host_id, type")
            .eq("id", roomId)
            .single();

        if (roomErr || !room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        // Check if user is host
        if (room.host_id === user.id) {
            return NextResponse.json({ success: true, message: "Host join" });
        }

        // Charge fan if price > 0
        if (price > 0 && room.host_id) {
            const { data: result, error: payError } = await supabase.rpc("transfer_funds", {
                p_from_user_id: user.id,
                p_to_user_id: room.host_id,
                p_amount: price,
                p_description: `Bar Lounge entry fee`,
                p_room_id: room.id,
                p_related_type: "room_entry",
                p_related_id: room.id,
            });

            if (payError) {
                return NextResponse.json({ error: "Payment failed: " + payError.message }, { status: 500 });
            }

            if (!result?.success) {
                return NextResponse.json({
                    error: result?.error || "Insufficient wallet balance",
                    required: price,
                }, { status: 400 });
            }
        }

        return NextResponse.json({
            success: true,
            status: "joined",
            message: price > 0 ? `Joined the room and charged €${price}` : "Joined successfully!",
        });
    } catch (err: any) {
        console.error("Join bar-lounge error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
