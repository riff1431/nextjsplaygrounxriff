"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Home, Sparkles } from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";
import SiteFooter from "@/components/navigation/SiteFooter";

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="min-h-screen w-full bg-black text-white flex flex-col">
            <style>{`
                /* ══════ 404 GLITCH / FLICKER ══════ */
                @keyframes neonFlicker404 {
                    0%, 100% { opacity: 1; filter: saturate(1.55) contrast(1.06); }
                    42% { opacity: 0.95; }
                    43% { opacity: 0.78; }
                    44% { opacity: 1; }
                    68% { opacity: 0.93; }
                    69% { opacity: 0.72; }
                    70% { opacity: 0.99; }
                }
                @keyframes glitch404 {
                    0%, 100% { text-shadow: 0 0 20px rgba(255,0,200,0.8), 0 0 40px rgba(255,0,200,0.4), 0 0 80px rgba(255,0,200,0.2); transform: translate(0); }
                    2% { text-shadow: -3px 0 rgba(0,230,255,0.7), 3px 0 rgba(255,0,200,0.7), 0 0 40px rgba(255,0,200,0.4); transform: translate(2px, -1px); }
                    4% { text-shadow: 3px 0 rgba(0,230,255,0.7), -3px 0 rgba(255,0,200,0.7), 0 0 40px rgba(255,0,200,0.4); transform: translate(-2px, 1px); }
                    6% { text-shadow: 0 0 20px rgba(255,0,200,0.8), 0 0 40px rgba(255,0,200,0.4), 0 0 80px rgba(255,0,200,0.2); transform: translate(0); }
                    40% { text-shadow: 0 0 20px rgba(255,0,200,0.8), 0 0 40px rgba(255,0,200,0.4); transform: translate(0); }
                    41% { text-shadow: -2px 0 rgba(0,230,255,0.8), 2px 0 rgba(255,0,200,0.8); transform: translate(1px, 0); }
                    42% { text-shadow: 0 0 20px rgba(255,0,200,0.8), 0 0 40px rgba(255,0,200,0.4); transform: translate(0); }
                    80% { text-shadow: 0 0 20px rgba(255,0,200,0.8), 0 0 40px rgba(255,0,200,0.4); transform: translate(0); }
                    81% { text-shadow: 4px 0 rgba(0,230,255,0.6), -4px 0 rgba(255,0,200,0.6); transform: translate(-3px, 1px); }
                    82% { text-shadow: -1px 0 rgba(0,230,255,0.6), 1px 0 rgba(255,0,200,0.6); transform: translate(1px, -1px); }
                    83% { text-shadow: 0 0 20px rgba(255,0,200,0.8), 0 0 40px rgba(255,0,200,0.4); transform: translate(0); }
                }
                .glitch-404 {
                    animation: glitch404 4s ease-in-out infinite, neonFlicker404 7.5s infinite;
                }

                /* ══════ SMOKE DRIFT ══════ */
                @keyframes smokeDrift404 {
                    0% { transform: translate3d(-6%, -2%, 0) scale(1); opacity: .18; }
                    50% { transform: translate3d(4%, 3%, 0) scale(1.10); opacity: .32; }
                    100% { transform: translate3d(-6%, -2%, 0) scale(1); opacity: .18; }
                }

                /* ══════ ANIMATED GRADIENT ORBS ══════ */
                @keyframes orbFloat404_1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(60px, -40px) scale(1.15); }
                    50% { transform: translate(-30px, 50px) scale(0.95); }
                    75% { transform: translate(40px, 20px) scale(1.08); }
                }
                @keyframes orbFloat404_2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(-50px, 30px) scale(1.12); }
                    66% { transform: translate(40px, -60px) scale(0.92); }
                }
                @keyframes orbFloat404_3 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
                    50% { transform: translate(70px, 40px) scale(1.2); opacity: 0.85; }
                }
                @keyframes orbPulse404 {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.15); }
                }

                /* ══════ SPARK PARTICLES ══════ */
                @keyframes sparkRise404 {
                    0% { transform: translateY(0) scale(1); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 0.8; }
                    100% { transform: translateY(-100vh) scale(0); opacity: 0; }
                }
                @keyframes sparkPulse404 {
                    0%, 100% { box-shadow: 0 0 4px 1px currentColor; }
                    50% { box-shadow: 0 0 12px 3px currentColor, 0 0 24px 6px currentColor; }
                }

                /* ══════ NEON GRID ══════ */
                @keyframes gridPulse404 {
                    0%, 100% { opacity: 0.04; }
                    50% { opacity: 0.09; }
                }
                .neon-grid-404 {
                    position: absolute;
                    inset: 0;
                    background-image:
                        linear-gradient(rgba(255, 0, 200, 0.06) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 230, 255, 0.06) 1px, transparent 1px);
                    background-size: 60px 60px;
                    animation: gridPulse404 6s ease-in-out infinite;
                    mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 20%, transparent 75%);
                    -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 20%, transparent 75%);
                }

                /* ══════ SWEEPING LIGHT BEAMS ══════ */
                @keyframes lightSweep404_1 {
                    0% { transform: rotate(-15deg) translateX(-120%); opacity: 0; }
                    40% { opacity: 0.12; }
                    100% { transform: rotate(-15deg) translateX(120%); opacity: 0; }
                }
                @keyframes lightSweep404_2 {
                    0% { transform: rotate(25deg) translateX(120%); opacity: 0; }
                    45% { opacity: 0.08; }
                    100% { transform: rotate(25deg) translateX(-120%); opacity: 0; }
                }

                /* ══════ STAR FIELD ══════ */
                @keyframes starTwinkle404 {
                    0%, 100% { opacity: 0.15; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.5); }
                }

                /* ══════ FLOATING CARD ══════ */
                @keyframes cardFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }

                /* ══════ BUTTON GLOW PULSE ══════ */
                @keyframes btnGlow {
                    0%, 100% { box-shadow: 0 0 15px rgba(236,72,153,0.4), 0 0 30px rgba(236,72,153,0.15); }
                    50% { box-shadow: 0 0 25px rgba(236,72,153,0.6), 0 0 50px rgba(236,72,153,0.25), 0 0 80px rgba(236,72,153,0.1); }
                }

                /* ══════ SCANLINE EFFECT ══════ */
                @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }

                .spark-404 {
                    position: absolute;
                    border-radius: 50%;
                    pointer-events: none;
                    will-change: transform, opacity;
                }
            `}</style>

            {/* ═══════════════ BACKDROP ═══════════════ */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">

                {/* ── Base dark gradient ── */}
                <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse 120% 100% at 50% 30%, rgba(26,10,46,0.60) 0%, rgba(0,0,0,0.95) 60%)'
                }} />

                {/* ── Animated gradient orbs ── */}
                <div className="absolute inset-0">
                    {/* Fuchsia orb */}
                    <div className="absolute -left-20 -top-20 h-[600px] w-[600px] rounded-full blur-[100px]"
                         style={{ background: 'radial-gradient(circle, rgba(255,0,200,0.30) 0%, rgba(255,0,200,0.05) 60%, transparent 80%)', animation: 'orbFloat404_1 18s ease-in-out infinite' }} />
                    {/* Cyan orb */}
                    <div className="absolute -right-16 top-1/4 h-[550px] w-[550px] rounded-full blur-[90px]"
                         style={{ background: 'radial-gradient(circle, rgba(0,230,255,0.25) 0%, rgba(0,230,255,0.04) 60%, transparent 80%)', animation: 'orbFloat404_2 22s ease-in-out infinite' }} />
                    {/* Violet orb */}
                    <div className="absolute left-1/3 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
                         style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.20) 0%, rgba(139,92,246,0.03) 60%, transparent 80%)', animation: 'orbFloat404_3 25s ease-in-out infinite' }} />
                    {/* Hot pink pulse */}
                    <div className="absolute bottom-[-100px] left-[-50px] h-[400px] w-[400px] rounded-full blur-[80px]"
                         style={{ background: 'radial-gradient(circle, rgba(255,50,150,0.22) 0%, transparent 70%)', animation: 'orbPulse404 8s ease-in-out infinite' }} />
                    {/* Electric blue pulse */}
                    <div className="absolute -right-10 -top-10 h-[350px] w-[350px] rounded-full blur-[70px]"
                         style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)', animation: 'orbPulse404 10s ease-in-out infinite 3s' }} />
                </div>

                {/* ── Neon grid overlay ── */}
                <div className="neon-grid-404" />

                {/* ── Sweeping light beams ── */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-[50%] left-0 h-[200%] w-[120px]"
                         style={{ background: 'linear-gradient(90deg, transparent, rgba(255,0,200,0.08), rgba(255,0,200,0.15), rgba(255,0,200,0.08), transparent)', animation: 'lightSweep404_1 12s ease-in-out infinite' }} />
                    <div className="absolute -top-[50%] right-0 h-[200%] w-[80px]"
                         style={{ background: 'linear-gradient(90deg, transparent, rgba(0,230,255,0.06), rgba(0,230,255,0.12), rgba(0,230,255,0.06), transparent)', animation: 'lightSweep404_2 16s ease-in-out infinite 4s' }} />
                </div>

                {/* ── Spark particles ── */}
                <div className="absolute inset-0">
                    <div className="spark-404" style={{ width: 3, height: 3, background: '#ff00c8', left: '10%', bottom: '5%', color: '#ff00c8', animation: 'sparkRise404 7s linear infinite, sparkPulse404 2s ease-in-out infinite' }} />
                    <div className="spark-404" style={{ width: 2, height: 2, background: '#ff69b4', left: '25%', bottom: '10%', color: '#ff69b4', animation: 'sparkRise404 9s linear infinite 1s, sparkPulse404 2.5s ease-in-out infinite' }} />
                    <div className="spark-404" style={{ width: 4, height: 4, background: '#ff00c8', left: '72%', bottom: '3%', color: '#ff00c8', animation: 'sparkRise404 6s linear infinite 2s, sparkPulse404 1.8s ease-in-out infinite' }} />
                    <div className="spark-404" style={{ width: 2, height: 2, background: '#00e6ff', left: '15%', bottom: '15%', color: '#00e6ff', animation: 'sparkRise404 10s linear infinite 2s, sparkPulse404 2.8s ease-in-out infinite' }} />
                    <div className="spark-404" style={{ width: 3, height: 3, background: '#00e6ff', left: '80%', bottom: '12%', color: '#00e6ff', animation: 'sparkRise404 7s linear infinite 1.5s, sparkPulse404 2.4s ease-in-out infinite' }} />
                    <div className="spark-404" style={{ width: 3, height: 3, background: '#a78bfa', left: '50%', bottom: '4%', color: '#a78bfa', animation: 'sparkRise404 9s linear infinite 5s, sparkPulse404 2.6s ease-in-out infinite' }} />
                    <div className="spark-404" style={{ width: 2, height: 2, background: '#fbbf24', left: '30%', bottom: '1%', color: '#fbbf24', animation: 'sparkRise404 10s linear infinite 2.5s, sparkPulse404 2.8s ease-in-out infinite' }} />
                    <div className="spark-404" style={{ width: 3, height: 3, background: '#f59e0b', left: '68%', bottom: '9%', color: '#f59e0b', animation: 'sparkRise404 8.5s linear infinite 4.5s, sparkPulse404 2.3s ease-in-out infinite' }} />
                    <div className="spark-404" style={{ width: 2, height: 2, background: '#ff1493', left: '45%', bottom: '2%', color: '#ff1493', animation: 'sparkRise404 8s linear infinite 3s, sparkPulse404 2.2s ease-in-out infinite' }} />
                    <div className="spark-404" style={{ width: 3, height: 3, background: '#8b5cf6', left: '92%', bottom: '6%', color: '#8b5cf6', animation: 'sparkRise404 7.5s linear infinite 6s, sparkPulse404 2.1s ease-in-out infinite' }} />
                </div>

                {/* ── Star field ── */}
                <div className="absolute inset-0">
                    {[
                        { x: '8%', y: '12%', d: '0s', s: 1.5 }, { x: '16%', y: '35%', d: '1.2s', s: 1 },
                        { x: '24%', y: '8%', d: '2.5s', s: 2 }, { x: '33%', y: '55%', d: '0.8s', s: 1 },
                        { x: '42%', y: '22%', d: '3.1s', s: 1.5 }, { x: '52%', y: '78%', d: '1.8s', s: 1 },
                        { x: '61%', y: '15%', d: '4.2s', s: 2 }, { x: '70%', y: '42%', d: '0.3s', s: 1 },
                        { x: '78%', y: '68%', d: '2.8s', s: 1.5 }, { x: '86%', y: '25%', d: '1.5s', s: 1 },
                        { x: '93%', y: '52%', d: '3.8s', s: 2 }, { x: '5%', y: '82%', d: '2.1s', s: 1 },
                        { x: '38%', y: '90%', d: '0.6s', s: 1.5 }, { x: '65%', y: '5%', d: '4.5s', s: 1 },
                        { x: '82%', y: '88%', d: '1.1s', s: 2 },
                    ].map((star, i) => (
                        <div key={i} className="absolute rounded-full bg-white" style={{
                            left: star.x, top: star.y,
                            width: star.s, height: star.s,
                            animation: `starTwinkle404 ${3 + (i % 4)}s ease-in-out infinite ${star.d}`
                        }} />
                    ))}
                </div>

                {/* ── Vignette ── */}
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0" style={{
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.4) 100%)'
                }} />
            </div>

            {/* ═══════════════ CONTENT ═══════════════ */}
            <div className="relative z-10 flex flex-1 flex-col">

                {/* Header / Brand */}
                <header className="px-6 pt-6 md:px-10 md:pt-8">
                    <Link href="/" className="inline-block" aria-label="Go to homepage">
                        <BrandLogo showBadge={false} />
                    </Link>
                </header>

                {/* Main centered content */}
                <main className="flex flex-1 items-center justify-center px-4 py-10 md:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="w-full max-w-lg"
                        style={{ animation: 'cardFloat 6s ease-in-out infinite' }}
                    >
                        <div className="relative rounded-3xl border border-pink-500/20 bg-black/55 p-8 md:p-12 shadow-2xl backdrop-blur-xl overflow-hidden text-center">

                            {/* Neon smoke behind card */}
                            <div className="pointer-events-none absolute inset-0 -m-12 opacity-60"
                                 style={{
                                     filter: 'blur(18px)',
                                     background: 'radial-gradient(circle at 18% 20%, rgba(255,0,200,.22), transparent 55%), radial-gradient(circle at 74% 38%, rgba(0,230,255,.18), transparent 60%), radial-gradient(circle at 35% 82%, rgba(0,255,170,.12), transparent 58%)',
                                     mixBlendMode: 'screen',
                                     animation: 'smokeDrift404 9s ease-in-out infinite'
                                 }}
                                 aria-hidden="true"
                            />

                            {/* Scanline effect over card */}
                            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
                                <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-400/30 to-transparent"
                                     style={{ animation: 'scanline 3s linear infinite' }} />
                            </div>

                            {/* Content */}
                            <div className="relative z-10">

                                {/* Decorative sparkle */}
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-pink-500/30 bg-pink-500/10 backdrop-blur-sm">
                                    <Sparkles className="h-7 w-7 text-fuchsia-400" style={{ filter: 'drop-shadow(0 0 8px rgba(255,0,200,0.6))' }} />
                                </div>

                                {/* 404 Number */}
                                <h1 className="glitch-404 text-8xl md:text-9xl font-black leading-none select-none"
                                    style={{
                                        background: 'linear-gradient(135deg, #ff00c8 0%, #00e6ff 40%, #a78bfa 70%, #ff69b4 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        letterSpacing: '-0.04em',
                                    }}
                                >
                                    404
                                </h1>

                                {/* Subtitle */}
                                <h2 className="mt-4 text-xl md:text-2xl font-semibold text-gray-50"
                                    style={{ animation: 'neonFlicker404 7.5s infinite' }}
                                >
                                    This room doesn&apos;t exist
                                </h2>

                                {/* Description */}
                                <p className="mt-3 text-sm md:text-base text-gray-300/80 max-w-sm mx-auto leading-relaxed">
                                    The page you&apos;re looking for has vanished into the neon void.
                                    It may have been moved, deleted, or never existed.
                                </p>

                                {/* Divider */}
                                <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-pink-500/30 to-transparent" />

                                {/* CTA Buttons */}
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <Link
                                        href="/home"
                                        className="inline-flex items-center gap-2 rounded-xl bg-pink-600 hover:bg-pink-700 px-6 py-3 text-sm font-semibold text-white transition-all"
                                        style={{ animation: 'btnGlow 3s ease-in-out infinite' }}
                                        id="not-found-go-home"
                                    >
                                        <Home className="h-4 w-4" />
                                        Go Home
                                    </Link>

                                    <button
                                        onClick={() => router.back()}
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 hover:bg-white/5 px-6 py-3 text-sm font-medium text-gray-200 transition-all hover:border-pink-500/30"
                                        id="not-found-go-back"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Go Back
                                    </button>
                                </div>

                                {/* Extra hint */}
                                <p className="mt-6 text-xs text-gray-500">
                                    Lost? Try exploring our{" "}
                                    <Link href="/home" className="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-4 transition-colors">
                                        rooms
                                    </Link>{" "}
                                    instead.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </main>
            </div>

            {/* Footer */}
            <div className="relative z-10">
                <SiteFooter />
            </div>
        </div>
    );
}
