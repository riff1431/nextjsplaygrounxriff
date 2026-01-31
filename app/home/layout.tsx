"use client";

import OnboardingGuard from "@/components/onboarding/OnboardingGuard";

export default function HomeLayout({
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
