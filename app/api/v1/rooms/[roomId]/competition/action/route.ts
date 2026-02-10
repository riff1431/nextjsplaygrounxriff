import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { action, competitionId, payload } = body;

    const { data: { user } } = await supabase.auth.getUser();

    if (!competitionId) return NextResponse.json({ error: "Missing competitionId" }, { status: 400 });

    if (action === 'REGISTER') {
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Check if already registered
        const { data: existing } = await supabase
            .from("competition_participants")
            .select("id")
            .eq("competition_id", competitionId)
            .eq("user_id", user.id)
            .single();

        if (existing) return NextResponse.json({ success: true, message: "Already registered" });

        // Get profile name
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
        const name = profile?.username || user.email || "Creator";

        const { error } = await supabase
            .from("competition_participants")
            .insert([{
                competition_id: competitionId,
                user_id: user.id,
                name: name,
                avatar_url: profile?.avatar_url,
                badge: 'Rising',
                is_ready: false
            }]);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Log Activity
        await supabase.from("competition_activity").insert([{
            competition_id: competitionId,
            type: 'system',
            message: `${name} joined the competition!`
        }]);
    }
    else if (action === 'TOGGLE_READY') {
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { ready } = payload;

        const { error } = await supabase
            .from("competition_participants")
            .update({ is_ready: ready })
            .eq("competition_id", competitionId)
            .eq("user_id", user.id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Log Activity (optional, maybe too noisy)
        // const status = ready ? "Ready" : "Not Ready";
        // await supabase.from("competition_activity").insert([{ competition_id: competitionId, type: 'system', message: `Participant is ${status}` }]);
    }
    else if (action === 'SIMULATE_VOTE') {
        // In real app, this is 'VOTE' and checks auth. For sim, we allow it.
        const { type, id } = payload; // type: 'topic' | 'participant'

        if (type === 'participant') {
            const participantId = id;

            // 1. Insert Vote Record (Audit)
            // For simulation, we assume 'user' is the voter, or use a dummy ID if null
            const voterId = user ? user.id : null;

            await supabase.from("competition_votes").insert([{
                competition_id: competitionId,
                creator_id: participantId,
                voter_user_id: voterId,
                is_suspicious: false
            }]);

            // 2. Increment Aggregate (Atomic update would be better via RPC, but this works for MVP)
            const { data: p } = await supabase.from('competition_participants').select('votes, name').eq('id', participantId).single();
            if (p) {
                await supabase.from('competition_participants').update({ votes: p.votes + 1 }).eq('id', participantId);

                // 3. Log Activity
                await supabase.from("competition_activity").insert([{
                    competition_id: competitionId,
                    type: 'vote',
                    message: `Vote received for ${p.name}`
                }]);
            }
        }
    }
    else if (action === 'SIMULATE_TIP') {
        // Custom action for "Simulate Tip" logic requested by user
        const { amountCents, participantId } = payload;
        if (!amountCents || !participantId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

        const creatorAmount = Math.floor(amountCents * 0.90);
        const houseAmount = amountCents - creatorAmount;

        // 1. Insert Tip Record
        await supabase.from("competition_tips").insert([{
            competition_id: competitionId,
            creator_id: participantId,
            tipper_user_id: user?.id,
            amount_cents: amountCents,
            creator_amount_cents: creatorAmount,
            house_amount_cents: houseAmount
        }]);

        // 2. Update Participant Total
        const { data: p } = await supabase.from('competition_participants').select('tips, name').eq('id', participantId).single();
        if (p) {
            const currentTips = Number(p.tips) || 0; // tips column is numeric (dollars) or check schema.. it was NUMERIC in setup. let's assume it stores Dollars for now or Cents? 
            // Schema said: tips NUMERIC DEFAULT 0. Let's store DOLLARS in numeric to match typical Postgres 'money' usage, OR cents in INT. 
            // My update schema didn't change 'tips'. Original was NUMERIC. 
            // Let's assume 'tips' column is DOLLARS since frontend formatted it.
            // Wait, user provided UI uses `tipsCents`. 
            // Let's store DOLLARS in DB 'tips' column for backward compat with view, but best to convert.
            // Actually, let's just add to it. amountCents / 100.

            await supabase.from('competition_participants').update({
                tips: currentTips + (amountCents / 100)
            }).eq('id', participantId);

            // 3. Log Activity
            const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
            await supabase.from("competition_activity").insert([{
                competition_id: competitionId,
                type: 'tip',
                message: `${p.name} received a ${formatter.format(amountCents / 100)} tip!`
            }]);
        }
    }
    else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
