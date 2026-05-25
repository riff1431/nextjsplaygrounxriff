import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const signature = request.headers.get('x-didit-signature') || request.headers.get('X-Didit-Signature');
        const bodyText = await request.text();

        console.log('[Didit Webhook] Received webhook. Signature present:', !!signature);
        console.log('[Didit Webhook] Body:', bodyText);

        // Verify signature if secret is present
        const webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error("[Didit Webhook] Missing webhook secret");
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Signature verification (uncomment when Didit's signature algorithm is confirmed)
        // const hmac = crypto.createHmac('sha256', webhookSecret);
        // const digest = hmac.update(bodyText).digest('hex');
        // if (signature !== digest) {
        //     console.error("[Didit Webhook] Signature mismatch");
        //     return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        // }

        const payload = JSON.parse(bodyText);
        const { session_id, status, decision } = payload;

        console.log('[Didit Webhook] Parsed payload:', { session_id, status, decision });

        // Use Service Role Client for Admin operations
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Find the submission
        const { data: submission, error: searchError } = await supabaseAdmin
            .from('kyc_submissions')
            .select('*')
            .eq('didit_session_id', session_id)
            .single();

        if (searchError || !submission) {
            console.error("[Didit Webhook] Submission not found for session:", session_id);
            return NextResponse.json({ message: 'Submission not found, ignoring' }, { status: 200 });
        }

        console.log('[Didit Webhook] Found submission:', submission.id, 'for user:', submission.user_id);

        // Map Didit status to our status
        // Didit uses CAPITALIZED values: 'Approved', 'Declined', 'In Review', etc.
        // Also handle lowercase variants for safety
        let newStatus = 'pending';
        const statusValue = status || '';
        const decisionValue = decision || '';
        
        if (statusValue === 'Approved' || statusValue === 'approved' || 
            decisionValue === 'Approved' || decisionValue === 'approved') {
            newStatus = 'approved';
        } else if (statusValue === 'Declined' || statusValue === 'declined' || 
                   statusValue === 'Rejected' || statusValue === 'rejected' ||
                   decisionValue === 'Declined' || decisionValue === 'declined') {
            newStatus = 'rejected';
        } else if (statusValue === 'In Review' || statusValue === 'review_needed' || 
                   statusValue === 'in_review') {
            newStatus = 'pending'; // Manual review
        }

        console.log('[Didit Webhook] Mapped status:', newStatus, '(from Didit status:', statusValue, ', decision:', decisionValue, ')');

        // Update submission
        await supabaseAdmin
            .from('kyc_submissions')
            .update({
                status: newStatus,
                decision: payload,
                updated_at: new Date().toISOString()
            })
            .eq('id', submission.id);

        // Update User Profile if approved/rejected
        if (newStatus === 'approved' || newStatus === 'rejected') {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({
                    kyc_status: newStatus,
                    onboarding_completed_at: newStatus === 'approved' ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', submission.user_id);
            
            if (profileError) {
                console.error('[Didit Webhook] Failed to update profile:', profileError);
            } else {
                console.log('[Didit Webhook] Profile updated successfully for user:', submission.user_id);
            }
        }

        // Notify admins if KYC is not approved (pending or rejected)
        if (newStatus !== 'approved') {
            try {
                // Get the creator's username
                const { data: creatorProfile } = await supabaseAdmin
                    .from('profiles')
                    .select('username')
                    .eq('id', submission.user_id)
                    .single();

                // Get all admin users
                const { data: admins } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('role', 'admin');

                if (admins && admins.length > 0) {
                    const statusLabel = newStatus === 'rejected' ? 'declined' : 'pending';
                    const adminNotifications = admins.map((admin) => ({
                        user_id: admin.id,
                        type: 'kyc_needs_review',
                        message: `🔔 KYC verification for @${creatorProfile?.username || 'unknown'} is ${statusLabel}. Review needed in Business Console.`,
                    }));

                    await supabaseAdmin.from('notifications').insert(adminNotifications);
                    console.log('[Didit Webhook] Admin notifications sent for status:', newStatus);
                }
            } catch (notifyErr) {
                console.warn('[Didit Webhook] Failed to notify admins:', notifyErr);
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[Didit Webhook] Error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
