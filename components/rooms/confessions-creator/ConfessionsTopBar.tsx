"use client";

import { useState, useEffect } from "react";
import { Heart, DollarSign, ArrowLeft, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

const ConfessionsTopBar = ({ onBack }: { onBack?: () => void }) => {
    const router = useRouter();
    const { user } = useAuth();
    const supabase = createClient();
    return (
        <div className="relative flex items-center justify-center px-6 py-3 min-h-[64px]">
            <button
                onClick={onBack ? onBack : () => router.push("/home")}
                className="absolute left-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back</span>
            </button>
            <h1 className="conf-font-pacifico text-4xl text-white tracking-wide">Confession Room</h1>
        </div>
    );
};

export default ConfessionsTopBar;
