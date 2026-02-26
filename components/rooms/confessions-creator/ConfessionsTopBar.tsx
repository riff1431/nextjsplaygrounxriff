"use client";

import { Heart, DollarSign, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const ConfessionsTopBar = () => {
    const router = useRouter();

    return (
        <div className="flex items-center justify-between px-6 py-3">
            <button
                onClick={() => router.push("/home")}
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back</span>
            </button>
            <h1 className="conf-font-pacifico pl-40 text-4xl text-white tracking-wide">Confession Room</h1>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 conf-text-primary fill-current" />
                    <span className="text-white font-medium">Fans.</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-lg">33</span>
                    <span className="text-white/60">Confessions.</span>
                </div>
                <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 conf-text-gold" />
                    <span className="conf-text-gold font-bold text-xl">$1,290</span>
                </div>
            </div>
        </div>
    );
};

export default ConfessionsTopBar;
