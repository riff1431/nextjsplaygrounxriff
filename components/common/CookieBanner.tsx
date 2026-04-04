"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has already set cookie preferences
        const consent = localStorage.getItem("cookie_consent");
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const handleAcceptAll = () => {
        localStorage.setItem("cookie_consent", "all");
        setIsVisible(false);
    };

    const handleRejectNonEssential = () => {
        localStorage.setItem("cookie_consent", "essential");
        setIsVisible(false);
    };

    const handleManagePreferences = () => {
        // In a more complex setup, this opens a modal.
        // For now, we save it as 'custom' and hide the banner, 
        // assuming standard compliance for early launch.
        localStorage.setItem("cookie_consent", "custom");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 pointer-events-none">
            <div className="max-w-4xl mx-auto bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] pointer-events-auto flex flex-col md:flex-row gap-6 p-6 items-center">
                
                {/* Content */}
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <Cookie className="w-6 h-6 text-cyan-400" />
                        <h3 className="font-bold text-white text-lg">We value your privacy</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        We use necessary cookies to make our site work. We'd also like to set optional analytics and marketing cookies to help us improve it and power our ads (like Meta, TikTok). We won't set optional cookies unless you enable them. Using this tool will set a cookie on your device to remember your preferences.
                        For more detailed information about the cookies we use, see our <Link href="/cookies-policy" className="text-cyan-400 hover:underline">Cookies Policy</Link>.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                    <button 
                        onClick={handleManagePreferences}
                        className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-semibold transition"
                    >
                        Manage Preferences
                    </button>
                    <button 
                        onClick={handleRejectNonEssential}
                        className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 text-sm font-semibold transition"
                    >
                        Reject Non-Essential
                    </button>
                    <button 
                        onClick={handleAcceptAll}
                        className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold shadow-[0_0_15px_rgba(34,211,238,0.4)] transition"
                    >
                        Accept All
                    </button>
                </div>
                
                {/* Close Button Mobile */}
                <button 
                    onClick={handleRejectNonEssential}
                    className="absolute top-4 right-4 md:hidden p-2 text-gray-500 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
