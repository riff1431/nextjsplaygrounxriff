import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH: Update status
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ roomId: string; requestId: string }> }
) {
    const params = await props.params;
    const { requestId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { action, deliveryContent } = body; // action: 'accept' | 'reject' | 'deliver' | 'approve'

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch current request status
    const { data: currentRequest, error: fetchError } = await supabase
        .from("confession_requests")
        .select("*")
        .eq("id", requestId)
        .single();

    if (fetchError || !currentRequest) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    let updateData: any = {};

    // State Machine
    if (action === "accept") {
        if (currentRequest.creator_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        updateData = { status: "in_progress" };
    }
    else if (action === "reject") {
        if (currentRequest.creator_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        updateData = { status: "rejected" };

        // REFUND LOGIC
        await supabase.rpc("add_balance", {
            p_user_id: currentRequest.fan_id,
            p_amount: currentRequest.amount
        });
    }
    else if (action === "deliver") {
        if (currentRequest.creator_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        updateData = { status: "delivered", delivery_content: deliveryContent };
    }
    else if (action === "approve") {
        if (currentRequest.fan_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        updateData = { status: "completed" };

        // PAYOUT LOGIC
        await supabase.rpc("add_balance", {
            p_user_id: currentRequest.creator_id,
            p_amount: currentRequest.amount
        });
    } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data: updatedRequest, error: updateError } = await supabase
        .from("confession_requests")
        .update(updateData)
        .eq("id", requestId)
        .select()
        .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: updatedRequest });
}
