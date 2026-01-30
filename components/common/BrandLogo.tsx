"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/context/ThemeContext";

export default function BrandLogo({ className, showBadge = true }: { className?: string, showBadge?: boolean }) {
    const { theme } = useTheme();

    // Just to force dependency update
    const siteName = theme?.siteName || "PlayGround"; // Fallback name logic if needed

    return (
        <div className={cn("flex items-center gap-3 select-none", className)}>
            <img
                src="/logo.png"
                alt={theme?.siteName || "PlayGroundX"}
                className="h-9 w-auto object-contain"
            />

            {showBadge && (
                <span className="ml-1 text-[10px] px-2 py-[2px] rounded-full border border-pink-500/40 text-pink-200 bg-black/40">
                    Alpha
                </span>
            )}
        </div>
    );
}
