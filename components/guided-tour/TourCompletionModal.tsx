"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Sparkles, Award } from "lucide-react";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Confetti Particle
// ---------------------------------------------------------------------------
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  delay: number;
  duration: number;
  xDrift: number;
}

const CONFETTI_COLORS = [
  "#ec4899", // pink
  "#f43f5e", // rose
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#10b981", // emerald
  "#e879f9", // fuchsia
  "#facc15", // yellow
  "#fb923c", // orange
];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 30,
    size: 4 + Math.random() * 8,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 360,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2.5,
    xDrift: -30 + Math.random() * 60,
  }));
}

// ---------------------------------------------------------------------------
// TourCompletionModal
// ---------------------------------------------------------------------------
export default function TourCompletionModal({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  const router = useRouter();
  const [particles] = useState(() => generateParticles(60));
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowBadge(true), 600);
    return () => clearTimeout(t);
  }, []);

  const handleExplore = () => {
    onDismiss();
    router.push("/home");
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[10001] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-sm"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size * (0.6 + Math.random() * 0.8),
                backgroundColor: p.color,
                rotate: p.rotation,
              }}
              animate={{
                y: ["0vh", "120vh"],
                x: [0, p.xDrift],
                rotate: [p.rotation, p.rotation + 360 + Math.random() * 360],
                opacity: [1, 1, 0.6, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeIn",
                repeat: Infinity,
                repeatDelay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Central Card */}
        <motion.div
          className="relative z-10 mx-4 max-w-md w-full"
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.15 }}
        >
          <div className="relative rounded-3xl border border-pink-500/40 bg-black/90 backdrop-blur-xl overflow-hidden shadow-[0_0_80px_rgba(236,72,153,0.2),0_0_200px_rgba(236,72,153,0.06)]">
            {/* Ambient glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-pink-500/15 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-500/10 blur-[60px] pointer-events-none" />
            <div className="absolute top-10 left-0 w-32 h-32 bg-purple-500/10 blur-[50px] pointer-events-none" />

            <div className="relative px-8 pt-10 pb-8 flex flex-col items-center text-center">
              {/* Badge Icon */}
              <AnimatePresence>
                {showBadge && (
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className="mb-5"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-600/30 to-purple-600/20 border-2 border-pink-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.4)]">
                        <Award className="w-10 h-10 text-pink-400" />
                      </div>
                      {/* Sparkle accents */}
                      <motion.div
                        className="absolute -top-2 -right-2"
                        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                      </motion.div>
                      <motion.div
                        className="absolute -bottom-1 -left-2"
                        animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                      >
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Explorer Badge Label */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mb-3"
              >
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 text-xs font-semibold uppercase tracking-wider">
                  <Award className="w-3 h-3" />
                  Explorer Badge Earned
                </span>
              </motion.div>

              {/* Heading */}
              <motion.h2
                className="text-2xl sm:text-3xl font-bold text-white mb-2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                You&apos;re ready to explore
              </motion.h2>

              <motion.div
                className="text-2xl sm:text-3xl font-bold mb-4"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                style={{
                  background: "linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                PlayGroundX 🚀
              </motion.div>

              <motion.p
                className="text-sm text-gray-400 mb-8 max-w-xs leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Your tour is complete! Dive into rooms, connect with creators,
                and discover everything PlayGroundX has to offer.
              </motion.p>

              {/* CTA Button */}
              <motion.button
                onClick={handleExplore}
                className="group relative flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-semibold text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #ec4899, #d946ef)",
                  boxShadow: "0 0 30px rgba(236,72,153,0.4), 0 0 60px rgba(236,72,153,0.15)",
                }}
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 0 45px rgba(236,72,153,0.6), 0 0 90px rgba(236,72,153,0.25)",
                }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <Rocket className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                Start Exploring
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
