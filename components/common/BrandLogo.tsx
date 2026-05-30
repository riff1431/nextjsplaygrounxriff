"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/context/ThemeContext";

export default function BrandLogo({ className, showBadge = true }: { className?: string, showBadge?: boolean }) {
    const { theme } = useTheme();

    const logoSrc = theme?.logoUrl || "/logo.png";
    const logoHeight = theme?.logoSize ? theme.logoSize * 2 : 72; // Force 200% size

    return (
        <div className={cn("flex items-center gap-3 select-none", className)}>
            <img
                src={logoSrc}
                alt={theme?.siteName || "PlayGroundX"}
                className="w-auto object-contain flex-shrink-0 h-8 md:h-[var(--logo-height)]"
                style={{ "--logo-height": `${logoHeight}px` } as React.CSSProperties}
            />
        </div>
    );
}
