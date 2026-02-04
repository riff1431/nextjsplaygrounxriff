'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

function VerificationCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        const statusParam = searchParams.get('status');
        const decisionParam = searchParams.get('decision');
        // Didit might send status or decision parameters
        const currentStatus = statusParam || decisionParam;

        setStatus(currentStatus);

        if (currentStatus === 'Approved' || currentStatus === 'approved') {
            // Auto-redirect to dashboard after a short delay
            const timer = setTimeout(() => {
                router.push('/creator/dashboard');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [searchParams, router]);

    if (!status) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Verifying session...</p>
                </div>
            </div>
        );
    }

    const isApproved = status === 'Approved' || status === 'approved';

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md border-border bg-card">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        {isApproved ? (
                            <CheckCircle className="h-10 w-10 text-green-500" />
                        ) : (
                            <XCircle className="h-10 w-10 text-destructive" />
                        )}
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {isApproved ? 'Verification Successful' : 'Verification Failed'}
                    </CardTitle>
                    <CardDescription>
                        {isApproved
                            ? 'Your identity has been successfully verified. Redirecting you to your dashboard...'
                            : 'We noticed an issue with your verification submission.'}
                    </CardDescription>
                </CardHeader>

                {!isApproved && (
                    <CardFooter className="flex justify-center">
                        <Button
                            onClick={() => router.push('/onboarding')}
                            className="w-full sm:w-auto"
                        >
                            Try Again
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}

export default function VerificationCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        }>
            <VerificationCallbackContent />
        </Suspense>
    );
}
