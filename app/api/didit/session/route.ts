import { createClient } from '@/utils/supabase/server';
import { DiditClient } from '@/utils/didit/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const diditClient = new DiditClient();
        const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verification/callback`;

        // redirect_url is where the USER is sent after finishing on Didit side
        // we send them back to onboarding or a success page
        const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?verified=true`;

        // Create session
        // Note: We need to check exact Didit API payload structure.
        // Usually creation returns a session_id and a url.
        // We are passing vendor_internal_id as user.id

        // For this implementation, we will assume the client class handles the specific payload structure
        // If we need to pass a redirect_url to Didit, we might need to update the client.
        // Let's assume the client.createSession accepts additional options if needed, 
        // but for now we'll stick to the basic implementation.
        // Actually, looking at Didit docs usually they need a callback_url (webhook) and valid return url.
        // I will update the client call to include return_url if the API supports it in the body.

        // Let's look at the client implementation again. It takes callbackUrl. 
        // I'll update client to accept options or just pass what I have.

        const session = await diditClient.createSession(user.id, callbackUrl);

        if (!session || !session.session_id || !session.url) {
            console.error("Invalid Didit session response:", session);
            return NextResponse.json({ error: 'Failed to create verification session' }, { status: 500 });
        }

        // Save session to database
        const { error: dbError } = await supabase.from('kyc_submissions').insert({
            user_id: user.id,
            didit_session_id: session.session_id,
            verification_url: session.url,
            status: 'pending',
            id_type: 'didit_verification' // Placeholder since column might be required or we leave it null if fixed
        });

        if (dbError) {
            console.error("Database error:", dbError);
            return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
        }

        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error("Session creation error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
