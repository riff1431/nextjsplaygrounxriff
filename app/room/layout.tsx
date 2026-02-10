"use client";

import OnboardingGuard from "@/components/onboarding/OnboardingGuard";

export default function RoomLayout({
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
