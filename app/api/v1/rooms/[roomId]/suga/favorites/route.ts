import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    
    try {
        const body = await request.json();
        const { name, description, category, emoji, buy_price, reveal_price } = body;
        
        const supabase = await createClient();
        
        // Ensure user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Ensure user is the host of the room
        const { data: room } = await supabase
            .from("rooms")
            .select("host_id")
            .eq("id", roomId)
            .single();
            
        if (!room || room.host_id !== user.id) {
            return NextResponse.json({ error: "Forbidden: Not room host" }, { status: 403 });
        }

        const { data, error } = await supabase
            .from("suga_creator_favorites")
            .insert({
                creator_id: user.id,
                name,
                description: description || "",
                category: category || "CUTE",
                emoji: emoji || "💖",
                buy_price: Number(buy_price),
                reveal_price: reveal_price ? Number(reveal_price) : null
            })
            .select()
            .single();

        if (error) throw error;
        
        return NextResponse.json({ favorite: data });
    } catch (err) {
        console.error("Failed to create favorite", err);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    
    try {
        const { searchParams } = new URL(request.url);
        const favoriteId = searchParams.get('id');
        
        if (!favoriteId) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const supabase = await createClient();
        
        // Ensure user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Room host check
        const { data: room } = await supabase
            .from("rooms")
            .select("host_id")
            .eq("id", roomId)
            .single();
            
        if (!room || room.host_id !== user.id) {
            return NextResponse.json({ error: "Forbidden: Not room host" }, { status: 403 });
        }

        const { error } = await supabase
            .from("suga_creator_favorites")
            .delete()
            .eq("id", favoriteId)
            .eq("creator_id", user.id);

        if (error) throw error;
        
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Failed to delete favorite", err);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
