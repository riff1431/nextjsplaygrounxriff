"use client";

import OnboardingGuard from "@/components/onboarding/OnboardingGuard";

export default function LiveLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <OnboardingGuard>
            {children}
        </OnboardingGuard>
    );
}
