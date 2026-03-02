"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface SuccessToastProps {
    message: string;
    emoji?: string;
    /** auto-dismiss after ms (default 3000) */
    duration?: number;
    onDismiss: () => void;
}

export default function SuccessToast({
    message,
    emoji = "✨",
    duration = 3000,
    onDismiss,
}: SuccessToastProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onDismiss, 300); // allow exit animation
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onDismiss]);

    return (
        <div
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ${visible
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 -translate-y-4 scale-95"
                }`}
        >
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/90 backdrop-blur-xl px-5 py-3 shadow-2xl shadow-emerald-900/20">
                <span className="text-xl">{emoji}</span>
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-100">
                    {message}
                </span>
            </div>
        </div>
    );
}
