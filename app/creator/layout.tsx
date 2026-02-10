"use client";

import OnboardingGuard from "@/components/onboarding/OnboardingGuard";
import { ProtectRoute } from "@/app/context/AuthContext";

export default function CreatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectRoute allowedRoles={["creator"]}>
            <OnboardingGuard>
                {children}
            </OnboardingGuard>
        </ProtectRoute>
    );
}
