"use client";

import React from "react";
import { cn } from "@/lib/utils";

export default function BrandLogo({ className, showBadge = true }: { className?: string, showBadge?: boolean }) {
    return (
        <div className={cn("flex items-center gap-3 select-none", className)}>
            <style jsx global>{`
                .pgx-logo {
                    font-family: cursive;
                    font-style: italic;
                    color: rgba(255,0,200,0.95);
                    text-shadow: 0 0 18px rgba(255,0,200,0.95), 0 0 56px rgba(255,0,200,0.55);
                    filter: saturate(1.7) contrast(1.15);
                }
                .pgx-logo-x {
                    font-family: cursive;
                    font-style: italic;
                    margin-left: 2px;
                    color: rgba(0,230,255,0.95);
                    text-shadow: 0 0 18px rgba(0,230,255,0.95), 0 0 56px rgba(0,230,255,0.55);
                    filter: saturate(1.7) contrast(1.15);
                }
            `}</style>
            <div className="text-2xl leading-none">
                <span className="pgx-logo">PlayGround</span>
                <span className="pgx-logo-x">X</span>
            </div>
            {showBadge && (
                <span className="ml-1 text-[10px] px-2 py-[2px] rounded-full border border-pink-500/40 text-pink-200 bg-black/40">
                    Alpha
                </span>
            )}
        </div>
    );
}
