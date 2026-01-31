"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";

interface Props {
    children: React.ReactNode;
}

/**
 * OnboardingGuard
 * 
 * Wraps routes that require completed onboarding.
 * Redirects users to /onboarding if they haven't completed profile setup.
 * 
 * For creators, also checks KYC status:
 * - pending: shows pending screen (handled by onboarding page)
 * - rejected: redirects to onboarding to resubmit
 * - approved: allows access
 */
export default function OnboardingGuard({ children }: Props) {
    const { user, role, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const supabase = createClient();
    const [checking, setChecking] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            checkOnboardingStatus();
        } else if (!authLoading && !user) {
            // Not logged in, let auth middleware handle it
            setChecking(false);
            setAllowed(true);
        }
    }, [user, authLoading]);

    const checkOnboardingStatus = async () => {
        if (!user) {
            setChecking(false);
            return;
        }

        try {
            const { data: profile, error } = await supabase
                .from("profiles")
                .select("onboarding_completed_at, kyc_status, role")
                .eq("id", user.id)
                .single();

            if (error) {
                console.error("Error checking onboarding status:", error);
                setChecking(false);
                setAllowed(true); // Allow access on error to not block users
                return;
            }

            // Fan users: check if onboarding is completed
            if (profile.role === "fan") {
                if (!profile.onboarding_completed_at) {
                    router.push("/onboarding");
                    return;
                }
                setAllowed(true);
            }

            // Creator users: check onboarding and KYC status
            if (profile.role === "creator") {
                // If onboarding not completed, redirect
                if (!profile.onboarding_completed_at && profile.kyc_status !== "approved") {
                    router.push("/onboarding");
                    return;
                }

                // If KYC pending or rejected, redirect to onboarding
                if (profile.kyc_status === "pending" || profile.kyc_status === "rejected") {
                    router.push("/onboarding");
                    return;
                }

                // If KYC approved, allow access
                if (profile.kyc_status === "approved") {
                    setAllowed(true);
                }
            }

            // Admin users bypass onboarding
            if (profile.role === "admin") {
                setAllowed(true);
            }
        } catch (error) {
            console.error("Onboarding check failed:", error);
            setAllowed(true); // Allow on error
        }

        setChecking(false);
    };

    if (authLoading || checking) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!allowed) {
        // Redirecting...
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
                    <p className="text-gray-400">Redirecting...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * Hook to check if user has completed onboarding
 * Returns { completed, loading, kycStatus }
 */
export function useOnboardingStatus() {
    const { user } = useAuth();
    const supabase = createClient();
    const [status, setStatus] = useState({
        completed: false,
        loading: true,
        kycStatus: "not_required" as string,
    });

    useEffect(() => {
        if (user) {
            checkStatus();
        }
    }, [user]);

    const checkStatus = async () => {
        if (!user) {
            setStatus({ completed: false, loading: false, kycStatus: "not_required" });
            return;
        }

        const { data } = await supabase
            .from("profiles")
            .select("onboarding_completed_at, kyc_status")
            .eq("id", user.id)
            .single();

        setStatus({
            completed: !!data?.onboarding_completed_at,
            loading: false,
            kycStatus: data?.kyc_status || "not_required",
        });
    };

    return status;
}
