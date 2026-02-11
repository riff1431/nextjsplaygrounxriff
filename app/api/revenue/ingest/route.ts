import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getSplitProfileForEvent, computeSplits } from '@/utils/finance/splitEngine';

export async function POST(req: NextRequest) {
    const supabase = createAdminClient();

    try {
        const body = await req.json();
        const {
            occurredAt,
            fanUserId,
            creatorUserId,
            revenueTypeId,
            roomKey,
            competitionId,
            subscriptionId,
            currency,
            grossAmount,
            netAmount,
            paymentProvider,
            paymentIntentId,
            status,
            sessionId,
            metadata,
        } = body;

        // 1. Check for duplicates (Idempotency)
        const { data: existing } = await supabase
            .from('revenue_events')
            .select('id')
            .eq('payment_provider', paymentProvider)
            .eq('payment_intent_id', paymentIntentId)
            .single();

        if (existing) {
            return NextResponse.json({ ok: true, eventId: existing.id, message: "Already processed" }, { status: 200 });
        }

        // 2. Insert revenue event
        const eventData = {
            occurred_at: occurredAt || new Date().toISOString(),
            fan_user_id: fanUserId,
            creator_user_id: creatorUserId, // can be null for platform-only revenue
            revenue_type_id: revenueTypeId,
            room_key: roomKey,
            competition_id: competitionId,
            subscription_id: subscriptionId,
            currency: currency || 'USD',
            gross_amount: grossAmount,
            net_amount: netAmount, // optional
            payment_provider: paymentProvider,
            payment_intent_id: paymentIntentId,
            status: status || 'succeeded',
            metadata: metadata || {}
        };

        const { data: event, error: eventError } = await supabase
            .from('revenue_events')
            .insert(eventData)
            .select()
            .single();

        if (eventError) {
            throw new Error(`Failed to create event: ${eventError.message}`);
        }

        // 3. Determine Split Profile
        const profile = await getSplitProfileForEvent({
            revenueTypeId,
            roomKey,
            occurredAt: new Date(eventData.occurred_at)
        });

        // 4. Compute Splits
        const baseAmount = Number(event.gross_amount);
        const splitAmounts = computeSplits(baseAmount, profile);

        // 5. Insert Splits
        const splitsToInsert = splitAmounts.map(s => ({
            revenue_event_id: event.id,
            beneficiary_type: s.key,
            beneficiary_id: s.key === 'creator' ? creatorUserId : null, // only creator type gets a user ID
            split_profile_id: profile.id,
            pct: s.pct,
            amount: s.amount
        }));

        const { error: splitError } = await supabase
            .from('revenue_splits')
            .insert(splitsToInsert);

        if (splitError) {
            // In a real system, you might roll back the event or mark it as 'processing_failed'
            console.error("Split insertion failed", splitError);
            // For now, we return partial success but log error
            return NextResponse.json({ ok: false, error: "Event recorded but splits failed", details: splitError.message }, { status: 500 });
        }

        // 6. Link Session (Optional)
        if (sessionId) {
            await supabase
                .from('revenue_event_sessions')
                .insert({
                    revenue_event_id: event.id,
                    session_id: sessionId
                });
        }

        return NextResponse.json({ ok: true, eventId: event.id });

    } catch (error: any) {
        console.error("Revenue ingest error:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
