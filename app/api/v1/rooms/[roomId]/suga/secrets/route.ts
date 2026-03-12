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
        const { name, description, unlock_price, category } = body;
        
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
            .from("suga_creator_secrets")
            .insert({
                creator_id: user.id,
                name,
                description: description || "",
                unlock_price: Number(unlock_price),
                category: category || "CUTE"
            })
            .select()
            .single();

        if (error) throw error;
        
        return NextResponse.json({ secret: data });
    } catch (err) {
        console.error("Failed to create secret", err);
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
        const secretId = searchParams.get('id');
        
        if (!secretId) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

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
            .from("suga_creator_secrets")
            .delete()
            .eq("id", secretId)
            .eq("creator_id", user.id);

        if (error) throw error;
        
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Failed to delete secret", err);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
