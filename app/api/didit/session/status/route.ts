import { createClient } from '@/utils/supabase/server';
import { DiditClient } from '@/utils/didit/client';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * GET /api/didit/session/status
 * 
 * Actively checks the verification status with Didit's API.
 * This is the critical fallback when webhooks don't arrive.
 * 
 * Flow:
 * 1. Authenticate the user
 * 2. Find their latest kyc_submission with a didit_session_id
 * 3. Call Didit's GET /v3/session/{session_id}/decision/ endpoint
 * 4. Map Didit's status to our internal status
 * 5. Update DB if status changed
 * 6. Return the current status
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find the latest kyc_submission for this user
        const { data: submission, error: submissionError } = await supabase
            .from('kyc_submissions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (submissionError || !submission) {
            return NextResponse.json({ 
                status: 'no_session',
                message: 'No verification session found. Please start verification first.' 
            });
        }

        // If we already have a terminal status in our DB, return it immediately
        if (submission.status === 'approved') {
            return NextResponse.json({ status: 'approved' });
        }

        // If no Didit session ID, we can't query Didit
        if (!submission.didit_session_id) {
            return NextResponse.json({ 
                status: submission.status || 'pending',
                message: 'Session exists but has no Didit session ID.' 
            });
        }

        // Query Didit's API for the session decision
        const diditClient = new DiditClient();
        let decision;
        
        try {
            decision = await diditClient.getSessionDecision(submission.didit_session_id);
        } catch (diditError) {
            console.error('Failed to query Didit API:', diditError);
            // Return current DB status as fallback
            return NextResponse.json({ 
                status: submission.status || 'pending',
                message: 'Could not reach Didit API. Showing last known status.'
            });
        }

        console.log('Didit decision response:', JSON.stringify(decision));

        // Map Didit's capitalized status to our internal lowercase status
        // Didit returns: "Approved", "Declined", "In Review", "In Progress", "Not Started", "Abandoned"
        const diditStatus = decision?.status || decision?.decision || '';
        let mappedStatus = 'pending';
        
        if (diditStatus === 'Approved' || diditStatus === 'approved') {
            mappedStatus = 'approved';
        } else if (diditStatus === 'Declined' || diditStatus === 'declined' || diditStatus === 'Rejected' || diditStatus === 'rejected') {
            mappedStatus = 'rejected';
        } else if (diditStatus === 'In Review' || diditStatus === 'in_review' || diditStatus === 'review_needed') {
            mappedStatus = 'pending'; // Still under review
        } else if (diditStatus === 'In Progress' || diditStatus === 'Not Started') {
            mappedStatus = 'pending'; // User hasn't finished yet
        }

        // If status changed from what we have, update the database
        if (mappedStatus !== submission.status) {
            // Use service role client for admin operations
            const supabaseAdmin = createSupabaseClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Update kyc_submissions
            await supabaseAdmin
                .from('kyc_submissions')
                .update({
                    status: mappedStatus,
                    decision: decision,
                    updated_at: new Date().toISOString()
                })
                .eq('id', submission.id);

            // Update profiles if terminal status
            if (mappedStatus === 'approved' || mappedStatus === 'rejected') {
                await supabaseAdmin
                    .from('profiles')
                    .update({
                        kyc_status: mappedStatus,
                        onboarding_completed_at: mappedStatus === 'approved' ? new Date().toISOString() : null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);
            }
        }

        return NextResponse.json({ 
            status: mappedStatus,
            didit_status: diditStatus,
        });

    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
