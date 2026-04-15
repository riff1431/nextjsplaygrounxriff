"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/context/ThemeContext";

export default function BrandLogo({ className, showBadge = true }: { className?: string, showBadge?: boolean }) {
    const { theme } = useTheme();

    const logoSrc = theme?.logoUrl || "/logo.png";

    const logoHeight = theme?.logoSize || 36;

    return (
        <div className={cn("flex items-center gap-3 select-none", className)}>
            <img
                src={logoSrc}
                alt={theme?.siteName || "PlayGroundX"}
                className="w-auto object-contain flex-shrink-0"
                style={{ height: `${logoHeight}px`, minWidth: `${logoHeight}px` }}
            />

            {/* {showBadge && (
                <span className="ml-1 text-[10px] px-2 py-[2px] rounded-full border border-pink-500/40 text-pink-200 bg-black/40">
                    Alpha
                </span>
            )} */}
        </div>
    );
}
