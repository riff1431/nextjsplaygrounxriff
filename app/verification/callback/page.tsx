'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function VerificationCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'approved' | 'declined' | 'pending' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        // Didit redirects to: {callback}?verificationSessionId={session_id}&status={status}
        const diditStatus = searchParams.get('status');
        const sessionId = searchParams.get('verificationSessionId');

        console.log('[Verification Callback] Didit redirect params:', { diditStatus, sessionId });

        // Always server-verify the status — never trust client-side query params
        verifyStatusServerSide();
    }, [searchParams]);

    const verifyStatusServerSide = async () => {
        try {
            const response = await fetch('/api/didit/session/status');
            
            if (!response.ok) {
                throw new Error(`Status check failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('[Verification Callback] Server status response:', data);

            if (data.status === 'approved') {
                setStatus('approved');
                // Auto-close tab after delay (opened via window.open from the original tab)
                // The original tab's realtime subscription / polling will detect the DB update
                setTimeout(() => {
                    window.close();
                    // Fallback if window.close() doesn't work (not opened via window.open)
                    router.push('/onboarding');
                }, 2500);
            } else if (data.status === 'rejected') {
                setStatus('declined');
            } else {
                // Still pending / in progress
                setStatus('pending');
                // The original tab will continue polling. Close this tab.
                setTimeout(() => {
                    window.close();
                    router.push('/onboarding');
                }, 3000);
            }
        } catch (error) {
            console.error('[Verification Callback] Error verifying status:', error);
            setStatus('error');
            setErrorMsg('Could not verify status. Please return to the onboarding page.');
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black p-4">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                    <p className="text-gray-400">Confirming your verification result...</p>
                </div>
            </div>
        );
    }

    if (status === 'approved') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black p-4">
                <Card className="w-full max-w-md border-green-500/20 bg-black/80">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                            <CheckCircle className="h-10 w-10 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-white">
                            Verification Successful!
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                            Your identity has been verified. This tab will close automatically...
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (status === 'declined') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black p-4">
                <Card className="w-full max-w-md border-red-500/20 bg-black/80">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                            <XCircle className="h-10 w-10 text-red-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-white">
                            Verification Not Approved
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                            We couldn&apos;t verify your identity. Please return and try again with clearer documents.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Button
                            onClick={() => {
                                window.close();
                                router.push('/onboarding');
                            }}
                            className="w-full sm:w-auto"
                        >
                            Return to Onboarding
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Pending or error
    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <Card className="w-full max-w-md border-yellow-500/20 bg-black/80">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
                        <Loader2 className="h-10 w-10 text-yellow-500 animate-spin" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">
                        {status === 'error' ? 'Verification Status Unknown' : 'Verification Processing'}
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                        {status === 'error' 
                            ? (errorMsg || 'Please return to the onboarding page to check your status.')
                            : 'Your verification is still being processed. You can close this tab — the onboarding page will update automatically.'
                        }
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center">
                    <Button
                        onClick={() => {
                            window.close();
                            router.push('/onboarding');
                        }}
                        className="w-full sm:w-auto"
                    >
                        Return to Onboarding
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function VerificationCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-black p-4">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        }>
            <VerificationCallbackContent />
        </Suspense>
    );
}
