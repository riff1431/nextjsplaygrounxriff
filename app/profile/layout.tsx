"use client";

import OnboardingGuard from "@/components/onboarding/OnboardingGuard";

export default function ProfileLayout({
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
