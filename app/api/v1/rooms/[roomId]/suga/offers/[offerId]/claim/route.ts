import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST: Simulate Claim
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string; offerId: string }> }
) {
    const params = await props.params;
    const { roomId, offerId } = params;
    const supabase = await createClient();

    // 1. Get Offer
    const { data: offer } = await supabase
        .from("suga_offer_drops")
        .select("*")
        .eq("id", offerId)
        .single();

    if (!offer) {
        return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    if (offer.slots_remaining <= 0) {
        return NextResponse.json({ error: "No slots remaining" }, { status: 400 });
    }

    // 2. Decrement Slots & Increment Revenue
    const { data: updatedOffer, error } = await supabase
        .from("suga_offer_drops")
        .update({
            slots_remaining: offer.slots_remaining - 1,
            claims: offer.claims + 1,
            revenue: offer.revenue + offer.price
        })
        .eq("id", offerId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Log Activity
    await supabase
        .from("suga_activity_events")
        .insert([{
            room_id: roomId,
            type: "OFFER_CLAIM",
            fan_name: "Sim Fan",
            label: offer.title,
            amount: offer.price
        }]);

    return NextResponse.json({ success: true, offer: updatedOffer });
}
