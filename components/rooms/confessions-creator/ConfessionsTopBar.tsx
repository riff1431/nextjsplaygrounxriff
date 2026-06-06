"use client";

import { useState, useEffect } from "react";
import { Heart, DollarSign, ArrowLeft, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface ConfessionsTopBarProps {
    onBack?: () => void;
    rightElement?: React.ReactNode;
}

const ConfessionsTopBar = ({ onBack, rightElement }: ConfessionsTopBarProps) => {
    const router = useRouter();
    return (
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 min-h-[56px] sm:min-h-[64px] border-b border-white/[0.06] relative z-50 gap-2 w-full">
            <button
                onClick={onBack ? onBack : () => router.push("/home")}
                className="flex items-center gap-1.5 sm:gap-2 text-white/60 hover:text-white transition-colors shrink-0"
            >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium hidden sm:inline">Back</span>
            </button>
            
            <h1 className="conf-font-pacifico text-base sm:text-xl md:text-2xl lg:text-3xl text-white tracking-wide text-center flex-1 min-w-0 truncate px-1">
                <span className="inline sm:hidden">Confessions</span>
                <span className="hidden sm:inline">Confession Room — Studio</span>
            </h1>

            {rightElement && (
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    {rightElement}
                </div>
            )}
        </div>
    );
};

export default ConfessionsTopBar;

