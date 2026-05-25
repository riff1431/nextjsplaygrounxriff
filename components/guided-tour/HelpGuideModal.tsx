"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Wallet,
  CreditCard,
  Gift,
  ArrowDownToLine,
  Shield,
  Zap,
  Crown,
  Sparkles,
  Lock,
  MessageCircle,
  Tv,
  Gamepad2,
  Heart,
  ChevronRight,
  DollarSign,
  Users,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type GuideType = "wallet" | "rooms" | "payouts";

interface GuideSection {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string; // tailwind color class fragment
}

// ---------------------------------------------------------------------------
// Content Data
// ---------------------------------------------------------------------------
const walletGuide: GuideSection[] = [
  {
    icon: <CreditCard className="w-5 h-5" />,
    title: "Add Funds",
    description:
      "Top up your wallet using a credit card, debit card, or PayPal. Funds are available instantly and stored securely in your PlayGroundX account.",
    accent: "blue",
  },
  {
    icon: <Crown className="w-5 h-5" />,
    title: "Pay for Subscriptions",
    description:
      "Use your wallet balance to subscribe to your favorite creators. Choose weekly or monthly plans for exclusive access to their premium content and rooms.",
    accent: "yellow",
  },
  {
    icon: <Gift className="w-5 h-5" />,
    title: "Send Gifts & Tips",
    description:
      "Show love to creators during live streams and chats by sending gifts and tips. Gifts are displayed live so creators see your support in real-time.",
    accent: "pink",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Join Paid Rooms",
    description:
      "Some rooms require an entry fee or per-minute charges. Your wallet covers Flash Drops, VIP sessions, Truth or Dare, and other premium room experiences.",
    accent: "purple",
  },
  {
    icon: <ArrowDownToLine className="w-5 h-5" />,
    title: "Withdrawals (Creators)",
    description:
      "Creators can withdraw their earnings directly from the wallet. Funds are sent to your linked bank account or payment method within 3-5 business days.",
    accent: "emerald",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Secure & Protected",
    description:
      "All transactions are encrypted and processed through Stripe. Your payment info is never stored on our servers. Refund policies apply per our terms.",
    accent: "cyan",
  },
];

const roomsGuide: GuideSection[] = [
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Flash Drops",
    description:
      "Time-limited exclusive content drops from creators. Get first access to photos, videos, and bundles before they're gone. Some drops sell out in seconds!",
    accent: "blue",
  },
  {
    icon: <Lock className="w-5 h-5" />,
    title: "Confessions",
    description:
      "Submit anonymous confessions or browse the Confession Wall. Creators publish text, voice, and video confessions with tiered pricing from Soft to Diamond 💎.",
    accent: "rose",
  },
  {
    icon: <MessageCircle className="w-5 h-5" />,
    title: "X Chat",
    description:
      "Live interactive chat rooms with creators. Send priority DMs, use emoji reactions, and engage in real-time conversations. Some chats include live video streaming.",
    accent: "yellow",
  },
  {
    icon: <Tv className="w-5 h-5" />,
    title: "Bar Lounge",
    description:
      "Chill virtual lounge experience with live streaming. Enjoy a relaxed vibe, VIP tables, and casual interaction with creators in an intimate nightclub atmosphere.",
    accent: "purple",
  },
  {
    icon: <Gamepad2 className="w-5 h-5" />,
    title: "Truth or Dare",
    description:
      "Interactive game room where creators and fans play Truth or Dare live. Vote on dares, watch prompts get answered, and join the action with camera-on participation.",
    accent: "emerald",
  },
  {
    icon: <Heart className="w-5 h-5" />,
    title: "Suga 4 U",
    description:
      "Premium matchmaking and connection room. Whether you're a Sugadaddy, Sugamama, or Sugababy — discover compatible users, send gifts, and build meaningful connections.",
    accent: "pink",
  },
];

const payoutsGuide: GuideSection[] = [
  {
    icon: <DollarSign className="w-5 h-5" />,
    title: "Earning Sources",
    description:
      "You earn from subscriptions, tips, gifts, room entry fees, per-minute charges, Flash Drop sales, and Confession Wall unlocks. All earnings are tracked in your dashboard.",
    accent: "emerald",
  },
  {
    icon: <CreditCard className="w-5 h-5" />,
    title: "Payout Methods",
    description:
      "Link your bank account or Stripe Connect to receive payouts. We support direct bank transfers in most countries. Setup is quick and verified securely.",
    accent: "blue",
  },
  {
    icon: <ArrowDownToLine className="w-5 h-5" />,
    title: "Withdrawal Process",
    description:
      "Request withdrawals from your Earnings Dashboard. Minimum withdrawal is $50. Payouts are processed within 3-5 business days after request.",
    accent: "purple",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Revenue Split",
    description:
      "PlayGroundX takes a platform fee on earnings. You keep the majority of every dollar earned. Exact percentages are shown on your earnings breakdown.",
    accent: "yellow",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Tax & Compliance",
    description:
      "Earnings above thresholds may require tax reporting. We provide yearly statements. Ensure your KYC verification is up to date for uninterrupted payouts.",
    accent: "cyan",
  },
];

const guideData: Record<GuideType, { title: string; subtitle: string; emoji: string; sections: GuideSection[] }> = {
  wallet: {
    title: "How Wallet Works",
    subtitle: "Your PlayGroundX wallet is the central hub for all transactions",
    emoji: "💳",
    sections: walletGuide,
  },
  rooms: {
    title: "How Rooms Work",
    subtitle: "Explore interactive rooms and connect with creators live",
    emoji: "🚀",
    sections: roomsGuide,
  },
  payouts: {
    title: "How Payouts Work",
    subtitle: "Turn your creator earnings into real-world income",
    emoji: "💰",
    sections: payoutsGuide,
  },
};

// ---------------------------------------------------------------------------
// Accent color helpers
// ---------------------------------------------------------------------------
function accentBg(accent: string) {
  const map: Record<string, string> = {
    blue: "bg-blue-500/15 border-blue-500/30",
    yellow: "bg-yellow-500/15 border-yellow-500/30",
    pink: "bg-pink-500/15 border-pink-500/30",
    purple: "bg-purple-500/15 border-purple-500/30",
    emerald: "bg-emerald-500/15 border-emerald-500/30",
    cyan: "bg-cyan-500/15 border-cyan-500/30",
    rose: "bg-rose-500/15 border-rose-500/30",
  };
  return map[accent] || map.pink;
}

function accentText(accent: string) {
  const map: Record<string, string> = {
    blue: "text-blue-400",
    yellow: "text-yellow-400",
    pink: "text-pink-400",
    purple: "text-purple-400",
    emerald: "text-emerald-400",
    cyan: "text-cyan-400",
    rose: "text-rose-400",
  };
  return map[accent] || map.pink;
}

function accentGlow(accent: string) {
  const map: Record<string, string> = {
    blue: "shadow-[0_0_20px_rgba(59,130,246,0.15)]",
    yellow: "shadow-[0_0_20px_rgba(234,179,8,0.15)]",
    pink: "shadow-[0_0_20px_rgba(236,72,153,0.15)]",
    purple: "shadow-[0_0_20px_rgba(168,85,247,0.15)]",
    emerald: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    cyan: "shadow-[0_0_20px_rgba(6,182,212,0.15)]",
    rose: "shadow-[0_0_20px_rgba(244,63,94,0.15)]",
  };
  return map[accent] || map.pink;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HelpGuideModal({
  guide,
  onClose,
}: {
  guide: GuideType;
  onClose: () => void;
}) {
  const data = guideData[guide];
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Modal */}
        <motion.div
          className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col"
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="relative rounded-3xl border border-pink-500/30 bg-black/95 backdrop-blur-xl overflow-hidden shadow-[0_0_60px_rgba(236,72,153,0.15),0_0_120px_rgba(236,72,153,0.05)]">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/8 blur-[70px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/6 blur-[60px] pointer-events-none" />

            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-white/5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/10 border border-pink-500/30 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(236,72,153,0.2)]">
                    {data.emoji}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{data.title}</h2>
                    <p className="text-xs text-gray-400 mt-0.5 max-w-[280px] leading-relaxed">
                      {data.subtitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content — Scrollable */}
            <div className="px-5 py-4 overflow-y-auto max-h-[60vh] space-y-2.5 scrollbar-thin">
              {data.sections.map((section, idx) => {
                const isExpanded = expandedIdx === idx;
                return (
                  <motion.div
                    key={idx}
                    layout
                    className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                      isExpanded
                        ? `${accentBg(section.accent)} ${accentGlow(section.accent)}`
                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
                    }`}
                  >
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isExpanded
                            ? `${accentBg(section.accent)} ${accentText(section.accent)}`
                            : "bg-white/5 text-gray-500"
                        }`}
                      >
                        {section.icon}
                      </div>
                      <span
                        className={`text-sm font-semibold flex-1 transition-colors ${
                          isExpanded ? "text-white" : "text-gray-300"
                        }`}
                      >
                        {section.title}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-gray-500 transition-transform duration-300 shrink-0 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-0">
                            <p className="text-sm text-gray-300/90 leading-relaxed pl-12">
                              {section.description}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                PlayGroundX Help Center
              </span>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white text-sm font-semibold transition shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]"
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
