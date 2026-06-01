"use client";

import React from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CsKycSkippedBanner() {
    const router = useRouter();

    return (
        <div className="cs-glass-card overflow-hidden border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)] animate-in fade-in duration-500">
            <div className="px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-pink-500/5 to-purple-900/10">
                <div className="flex items-center gap-3.5 text-center md:text-left flex-col md:flex-row">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-extrabold text-base tracking-wide flex items-center justify-center md:justify-start gap-2">
                            Identity Verification Required
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-widest font-black">
                                skipped
                            </span>
                        </h3>
                        <p className="text-white/60 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                            Your profile is unverified. To start streaming, set subscription prices, schedule events, and withdraw payouts, please complete your identity verification.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => router.push("/kyc-verification")}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 w-full md:w-auto"
                >
                    Complete Verification
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
