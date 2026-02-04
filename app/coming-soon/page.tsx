"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Rocket, Sparkles, Star } from "lucide-react";
import { motion } from "framer-motion";

export default function ComingSoonPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden px-6">

            {/* Background Ambient Glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDelay: "1s" }} />
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

            <div className="relative z-10 max-w-lg w-full text-center space-y-8">

                {/* Icon Animation */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative mx-auto w-24 h-24 flex items-center justify-center"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-pink-500 to-cyan-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative bg-black/40 border border-white/10 p-5 rounded-full backdrop-blur-md shadow-2xl">
                        <Rocket className="w-10 h-10 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                    </div>

                    {/* Floating stars */}
                    <motion.div
                        animate={{ y: [-5, 5, -5], rotate: [0, 10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-2 -right-2"
                    >
                        <Star className="w-6 h-6 text-yellow-300 fill-yellow-300 drop-shadow-lg" />
                    </motion.div>
                    <motion.div
                        animate={{ y: [5, -5, 5], rotate: [0, -15, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -bottom-1 -left-4"
                    >
                        <Sparkles className="w-5 h-5 text-cyan-300 drop-shadow-lg" />
                    </motion.div>
                </motion.div>

                {/* Text Content */}
                <div className="space-y-4">
                    <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-pink-200 to-pink-500 drop-shadow-[0_0_30px_rgba(236,72,153,0.6)]">
                        Coming Soon
                    </h1>
                    <p className="text-lg text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
                        We are crafting something <span className="text-cyan-300 font-semibold drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">extraordinary</span> just for you. Stay tuned for the ultimate experience.
                    </p>
                </div>

                {/* Action Button */}
                <div className="pt-4">
                    <button
                        onClick={() => router.push("/home")}
                        className="group relative inline-flex items-center gap-2 px-8 py-3 bg-white/5 border border-white/10 rounded-full text-white font-semibold tracking-wide overflow-hidden transition-all hover:border-pink-500/50 hover:bg-pink-500/10 hover:shadow-[0_0_40px_rgba(236,72,153,0.3)]"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Home
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </button>
                </div>

            </div>

            {/* Footer */}
            <div className="absolute bottom-8 text-center w-full text-xs text-white/20 uppercase tracking-widest">
                Playground X &copy; {new Date().getFullYear()}
            </div>
        </div>
    );
}
