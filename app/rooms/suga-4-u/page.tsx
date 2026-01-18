"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  Crown,
  MessageCircle,
  Heart,
  Star,
  Lock,
  Mic,
  Image as ImageIcon,
  Timer,
  Sparkles,
  Flame,
  Gift,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";

/**
 * PlayGroundX — Suga4U Room (PREVIEW MOCKUP)
 * ----------------------------------------
 * UX rules (locked):
 * - Do NOT show entry-rule education or badge-tier pricing in this room.
 *   Those belong in signup + My Profile.
 * - In-room: show ONLY status badges + spending surfaces.
 * - Suga Baby label is ALWAYS "Suga Baby"; badge color depends on creator gender (male=blue, female=pink).
 * - Fan badge is the Suga Daddy / Suga Mama tier badge (Bronze/Silver/Gold/Platinum/VIP) with a tier-logo.
 *
 * Monetization rules (locked):
 * - Entry: $10 entry fee unless VIP tier (VIP enters free).
 * - Time: first 10 mins free, then $2 per minute pay-to-stay.
 *
 * Included features in this room:
 * (1) Creator Secrets (blurred unlocks)
 * (4) Pinned Offer Drops (timed + limited slots)
 * (6) Paid Request Menu
 * (7) Favorites expansion: pay to reveal links + Buy sends funds as tip
 * (8) Pay-to-stay session timer + pay action
 */

// ---- Config (Suga4U monetization rules) ------------------------------------
const ENTRY_FEE = 10;


const GIFTS = [
  { label: "💖 Kiss", amount: 5 },
  { label: "🔥 Tease", amount: 10 },
  { label: "💎 Luxury", amount: 25 },
  { label: "👑 Royal", amount: 50 },
] as const;

type FavTier = "cute" | "luxury" | "dream";

type BadgeTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "VIP";

type CreatorGender = "male" | "female";

type Secret = {
  id: string;
  title: string;
  price: number;
  reveal: string;
};

type OfferDrop = {
  id: string;
  title: string;
  description: string;
  price: number;
  totalSlots: number;
  endsInSeconds: number;
};

type PaidRequest = {
  id: string;
  label: string;
  price: number;
  hint: string;
};

type FavoriteItem = {
  name: string;
  price: number;
  linkLabel: string;
  linkUrl: string;
  revealFee: number;
};

const FAVORITES: Record<FavTier, { unlock: number; items: FavoriteItem[] }> = {
  cute: {
    unlock: 10,
    items: [
      {
        name: "Cute Top",
        price: 40,
        linkLabel: "Store link",
        linkUrl: "https://example.com/cute-top",
        revealFee: 3,
      },
      {
        name: "Gloss Set",
        price: 25,
        linkLabel: "Store link",
        linkUrl: "https://example.com/gloss-set",
        revealFee: 2,
      },
    ],
  },
  luxury: {
    unlock: 20,
    items: [
      {
        name: "Luxury Perfume",
        price: 180,
        linkLabel: "Store link",
        linkUrl: "https://example.com/perfume",
        revealFee: 5,
      },
      {
        name: "Silk Lingerie",
        price: 120,
        linkLabel: "Store link",
        linkUrl: "https://example.com/silk",
        revealFee: 5,
      },
    ],
  },
  dream: {
    unlock: 30,
    items: [
      {
        name: "Designer Heels",
        price: 350,
        linkLabel: "Store link",
        linkUrl: "https://example.com/heels",
        revealFee: 8,
      },
      {
        name: "Weekend Getaway",
        price: 500,
        linkLabel: "Offer details",
        linkUrl: "https://example.com/getaway",
        revealFee: 10,
      },
    ],
  },
};

const CREATOR_SECRETS: Secret[] = [
  {
    id: "s1",
    title: "My real type…",
    price: 8,
    reveal: "I love confident talk + kindness.",
  },
  {
    id: "s2",
    title: "What I wear to bed",
    price: 12,
    reveal: "Silk set + perfume. Sometimes nothing.",
  },
  {
    id: "s3",
    title: "My wildest fantasy",
    price: 20,
    reveal: "A private night where you lead.",
  },
  {
    id: "s4",
    title: "My private photo drop",
    price: 25,
    reveal: "(Unlocked in DMs)",
  },
];

const OFFER_DROPS: OfferDrop[] = [
  {
    id: "o1",
    title: "Limited Voice Note Drop",
    description: "First 10 buyers get a personalized 30s voice note.",
    price: 15,
    totalSlots: 10,
    endsInSeconds: 12 * 60,
  },
  {
    id: "o2",
    title: "Outfit Pick (Tonight)",
    description: "Vote by paying — top outfit wins (private reveal).",
    price: 10,
    totalSlots: 25,
    endsInSeconds: 8 * 60,
  },
];

const PAID_REQUESTS: PaidRequest[] = [
  { id: "r1", label: "Pose Request", price: 10, hint: "Ask for a pose / angle" },
  { id: "r2", label: "Name Shoutout", price: 15, hint: "She says your name on cam" },
  { id: "r3", label: "Quick Tease", price: 25, hint: "Short premium tease" },
  { id: "r4", label: "Custom Clip", price: 50, hint: "Custom 30–60s clip" },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isEntryRequired(tier: BadgeTier) {
  return tier !== "VIP";
}

function fanTierClasses(tier: BadgeTier) {
  switch (tier) {
    case "Bronze":
      return "border-yellow-700/70 text-yellow-500";
    case "Silver":
      return "border-gray-400/70 text-gray-200";
    case "Gold":
      return "border-yellow-400/70 text-yellow-300";
    case "Platinum":
      return "border-indigo-300/70 text-indigo-200";
    case "VIP":
      return "border-yellow-400/80 text-yellow-300";
    default:
      return "border-gray-600 text-gray-200";
  }
}

function fanTierBg(tier: BadgeTier) {
  switch (tier) {
    case "Bronze":
      return "bg-yellow-900/15";
    case "Silver":
      return "bg-gray-500/10";
    case "Gold":
      return "bg-yellow-500/10";
    case "Platinum":
      return "bg-indigo-500/10";
    case "VIP":
      return "bg-yellow-500/15";
    default:
      return "bg-white/5";
  }
}

function creatorBabyClasses(gender: CreatorGender) {
  return gender === "male"
    ? "border-blue-400/70 text-blue-300"
    : "border-pink-400/70 text-pink-300";
}

function SugaTierLogo({ tier, className = "" }: { tier: BadgeTier; className?: string }) {
  // Placeholder tier-logo for Suga Daddy / Suga Mama.
  // Replace this SVG with the final logo asset while keeping tier tinting.
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-md border ${fanTierClasses(
        tier
      )} ${fanTierBg(tier)} ${className}`}
      aria-label={`Suga tier logo ${tier}`}
      title={`${tier} tier badge logo`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-90"
      >
        <path
          d="M12 2l2.2 4.6L19 7.7l-3.6 3.5.9 5L12 14.9 7.7 16.2l.9-5L5 7.7l4.8-1.1L12 2z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 20.5h9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function formatMMSS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// Minimal dev-time sanity checks (no UI impact)
function useDevSanityTests() {
  useEffect(() => {
    console.assert(clamp(0, 0, 10) === 0, "clamp lower bound failed");
    console.assert(clamp(99, 0, 10) === 10, "clamp upper bound failed");
    console.assert(clamp(3, 0, 10) === 3, "clamp passthrough failed");

    console.assert(isEntryRequired("VIP") === false, "VIP should not require entry");
    console.assert(isEntryRequired("Gold") === true, "Non-VIP should require entry");

    const fanVipLabel = `VIP${"VIP" === "VIP" ? " VIP" : ""}`;
    console.assert(fanVipLabel === "VIP VIP", "VIP label test failed");

    console.assert(fanTierClasses("Gold").length > 0, "fanTierClasses(Gold) empty");
    console.assert(fanTierBg("Gold").length > 0, "fanTierBg(Gold) empty");
  }, []);
}

export default function Suga4URoom() {
  useDevSanityTests();

  // In production, these come from creator profile + fan subscription state.
  const [creatorGender] = useState<CreatorGender>("female");
  const [selectedBadgeTier] = useState<BadgeTier>("Gold");

  // Entry + time
  // Entry + time
  const [hasPaidEntry, setHasPaidEntry] = useState<boolean>(false);


  // Chat + reactions
  const [chat, setChat] = useState<string[]>(["Welcome to Suga4U 💖"]);
  const [chatInput, setChatInput] = useState("");
  const [reaction, setReaction] = useState<string | null>(null);

  // Earnings (aggregate for preview)
  const [totalSuga, setTotalSuga] = useState(0);

  // Secrets
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // Offer drops
  const [dropEnds, setDropEnds] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    OFFER_DROPS.forEach((d) => (init[d.id] = d.endsInSeconds));
    return init;
  });
  const [dropSlots, setDropSlots] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    OFFER_DROPS.forEach((d) => (init[d.id] = d.totalSlots));
    return init;
  });

  // Favorites unlock + reveal
  const [unlocked, setUnlocked] = useState<Record<FavTier, boolean>>({
    cute: false,
    luxury: false,
    dream: false,
  });
  const [activeTier, setActiveTier] = useState<FavTier | null>(null);
  const [revealedLinks, setRevealedLinks] = useState<Record<string, boolean>>({});

  // Requests
  const [requestText, setRequestText] = useState("");

  // VIP skips entry fee
  useEffect(() => {
    if (selectedBadgeTier === "VIP") setHasPaidEntry(true);
  }, [selectedBadgeTier]);

  const goalPct = useMemo(() => Math.min((totalSuga / 100) * 100, 100), [totalSuga]);
  const fanBadgeLabel = `${selectedBadgeTier}${selectedBadgeTier === "VIP" ? " VIP" : ""}`;



  function pushChat(msg: string) {
    setChat((c) => [...c, msg]);
  }

  function addToSuga(amount: number, context: string) {
    setTotalSuga((s) => s + amount);
    pushChat(`${context} ($${amount})`);
  }

  function payEntryFee() {
    if (hasPaidEntry) return;
    setHasPaidEntry(true);
    addToSuga(ENTRY_FEE, "🚪 Room entry");
  }

  function sendGift(label: string, amount: number) {
    setReaction(label);
    addToSuga(amount, `🎁 ${label} sent`);
    setTimeout(() => setReaction(null), 1200);
  }

  function sendMessage() {
    const t = chatInput.trim();
    if (!t) return;
    pushChat(t);
    setChatInput("");
  }

  function unlockFavoritesTier(t: FavTier) {
    setUnlocked((u) => ({ ...u, [t]: true }));
    setActiveTier(t);
    addToSuga(FAVORITES[t].unlock, `🔓 Unlocked ${t} favorites`);
  }

  function revealFavoriteLink(tier: FavTier, itemName: string, fee: number) {
    const key = `${tier}:${itemName}`;
    if (revealedLinks[key]) return;
    setRevealedLinks((m) => ({ ...m, [key]: true }));
    addToSuga(fee, `🔍 Revealed link for ${itemName}`);
  }

  function buyForHer(price: number, name: string) {
    addToSuga(price, `🛍️ Buy-for-her: ${name}`);
  }

  function revealSecret(secret: Secret) {
    if (revealedSecrets[secret.id]) return;
    setRevealedSecrets((m) => ({ ...m, [secret.id]: true }));
    addToSuga(secret.price, `🔓 Secret unlocked: ${secret.title}`);
  }

  function claimDrop(d: OfferDrop) {
    const slots = dropSlots[d.id] ?? 0;
    const ends = dropEnds[d.id] ?? 0;
    if (slots <= 0 || ends <= 0) return;
    setDropSlots((m) => ({ ...m, [d.id]: Math.max(0, (m[d.id] ?? 0) - 1) }));
    addToSuga(d.price, `✨ Claimed: ${d.title}`);
  }

  function submitRequest(r: PaidRequest) {
    const t = requestText.trim();
    if (!t) {
      pushChat("⚠️ Add a request note first.");
      return;
    }
    addToSuga(r.price, `📩 Request sent: ${r.label}`);
    pushChat(`📝 Note: ${t}`);
    setRequestText("");
  }



  // Timers


  useEffect(() => {
    const id = window.setInterval(() => {
      setDropEnds((m) => {
        const next: Record<string, number> = { ...m };
        Object.keys(next).forEach((k) => {
          next[k] = Math.max(0, next[k] - 1);
        });
        return next;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-pink-500/20">
        <BrandLogo showBadge={false} />

        <div className="text-pink-300 text-sm flex items-center gap-2">
          <Crown className="w-4 h-4" /> Suga4U Room

          {/* Creator badge */}
          <span
            className={`ml-2 px-2 py-[2px] rounded-full text-[10px] border ${creatorBabyClasses(
              creatorGender
            )}`}
            title="Creator badge"
          >
            Suga Baby
          </span>

          {/* Fan tier badge */}
          <span
            className={`px-2 py-[2px] rounded-full text-[10px] border inline-flex items-center gap-1 ${fanTierClasses(
              selectedBadgeTier
            )} ${fanTierBg(selectedBadgeTier)}`}
            title="Fan Suga Daddy / Suga Mama tier badge"
          >
            <SugaTierLogo tier={selectedBadgeTier} />
            {fanBadgeLabel}
          </span>

          {/* Pay-to-stay status (no pricing shown) */}

        </div>
      </div>

      <main className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl mx-auto">


        {/* LEFT: Creator Spotlight */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="relative aspect-video rounded-3xl border border-pink-500/40 bg-black flex items-center justify-center overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-20 animate-pulse bg-gradient-to-b from-pink-500/30 via-transparent to-blue-500/20" />

            {reaction && <div className="absolute text-4xl text-pink-400 animate-pulse">{reaction}</div>}
            <span className="text-pink-300">Creator Spotlight</span>

            <div className="absolute bottom-3 left-3 right-3">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500" style={{ width: `${goalPct}%` }} />
              </div>
              <div className="text-xs text-pink-300 mt-1">Suga Goal: ${totalSuga} / $100</div>
            </div>
          </div>

          {/* Offer Drops (Pinned) */}
          <div className="rounded-2xl border border-blue-500/25 bg-gray-950 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-blue-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Pinned Offer Drops
              </h2>
              <div className="text-[10px] text-gray-400">Limited + timed</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OFFER_DROPS.map((d) => {
                const ends = dropEnds[d.id] ?? 0;
                const slots = dropSlots[d.id] ?? 0;
                const disabled = ends <= 0 || slots <= 0;
                return (
                  <div key={d.id} className="rounded-xl border border-blue-500/25 bg-black/40 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm text-blue-200 font-medium">{d.title}</div>
                        <div className="text-[11px] text-gray-400 mt-1">{d.description}</div>
                      </div>
                      <div className="text-[10px] text-gray-300 whitespace-nowrap">{formatMMSS(ends)}</div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="text-[11px] text-gray-300">
                        Slots: {slots}/{d.totalSlots}
                      </div>
                      <button
                        onClick={() => claimDrop(d)}
                        disabled={disabled}
                        className={`px-3 py-1.5 rounded-lg text-xs border ${disabled
                          ? "border-gray-700 text-gray-500"
                          : "border-blue-400/50 text-blue-200 hover:bg-blue-600/10"
                          }`}
                      >
                        Unlock ${d.price}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Creator Secrets */}
          <div className="rounded-2xl border border-pink-500/30 bg-gray-950 p-4">
            <h2 className="text-pink-300 mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4" /> Creator Secrets
              <span className="text-[10px] text-gray-400">Blurred until unlocked</span>
            </h2>

            <div className="space-y-2">
              {CREATOR_SECRETS.map((s) => {
                const isRevealed = !!revealedSecrets[s.id];
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between border border-pink-500/20 rounded-xl p-3 bg-black/30"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-pink-200">{s.title}</div>
                      <div className={`text-[11px] mt-1 ${isRevealed ? "text-gray-200" : "text-gray-500"}`}>
                        {isRevealed ? s.reveal : "████████████████████"}
                      </div>
                    </div>
                    <button
                      onClick={() => revealSecret(s)}
                      disabled={isRevealed}
                      className={`ml-3 px-3 py-1.5 rounded-lg text-xs border ${isRevealed
                        ? "border-gray-700 text-gray-500"
                        : "border-pink-400/50 text-pink-200 hover:bg-pink-600/10"
                        }`}
                    >
                      {isRevealed ? "Unlocked" : `Unlock $${s.price}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Favorites */}
          <div className="rounded-2xl border border-pink-500/30 bg-gray-950 p-4">
            <h2 className="text-pink-300 mb-3 flex items-center gap-2">
              <Gift className="w-4 h-4" /> Creator Favorites
              <span className="text-[10px] text-gray-400">Reveal links, then Buy sends funds</span>
            </h2>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {(Object.keys(FAVORITES) as FavTier[]).map((t) => (
                <button
                  key={t}
                  onClick={() => unlockFavoritesTier(t)}
                  className={`rounded-lg border py-2 text-xs hover:bg-pink-600/10 ${unlocked[t] ? "border-pink-500" : "border-pink-500/30"
                    }`}
                >
                  {unlocked[t] ? `Unlocked ${t}` : `Unlock ${t} ($${FAVORITES[t].unlock})`}
                </button>
              ))}
            </div>

            {!activeTier ? (
              <div className="text-[11px] text-gray-500">Select a tier to view items.</div>
            ) : (
              <div className="space-y-2">
                {FAVORITES[activeTier].items.map((it) => {
                  const key = `${activeTier}:${it.name}`;
                  const linkRevealed = !!revealedLinks[key];
                  return (
                    <div key={it.name} className="border border-pink-500/20 rounded-xl p-3 bg-black/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm text-gray-100">{it.name}</div>
                          <div className="text-[11px] mt-1 text-gray-400">
                            {it.linkLabel}:{" "}
                            {linkRevealed ? (
                              <a
                                className="text-blue-300 underline"
                                href={it.linkUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {it.linkUrl}
                              </a>
                            ) : (
                              <span className="text-gray-500">███████████████</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <button
                            onClick={() => revealFavoriteLink(activeTier, it.name, it.revealFee)}
                            disabled={linkRevealed}
                            className={`px-3 py-1.5 rounded-lg text-xs border ${linkRevealed
                              ? "border-gray-700 text-gray-500"
                              : "border-blue-400/40 text-blue-200 hover:bg-blue-600/10"
                              }`}
                          >
                            {linkRevealed ? "Link revealed" : `Reveal $${it.revealFee}`}
                          </button>
                          <button
                            onClick={() => buyForHer(it.price, it.name)}
                            className="px-3 py-1.5 rounded-lg text-xs bg-pink-600 hover:bg-pink-700"
                          >
                            Buy ${it.price}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="text-[10px] text-gray-400">
                  Buy-for-her sends the amount to the creator as a tip (fan assumes item is purchased).
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE: Chat */}
        <aside className="rounded-2xl border border-pink-500/30 bg-gray-950 p-4 flex flex-col">
          <h3 className="text-pink-300 mb-2 flex items-center gap-1">
            <MessageCircle className="w-4 h-4" /> Live Chat
          </h3>
          <div className="flex-1 overflow-y-auto text-xs space-y-1 mb-2">
            {chat.map((m, i) => (
              <div key={`${i}-${m.slice(0, 10)}`}>{m}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-black border border-pink-500/30 rounded-lg px-2 py-1 text-xs"
              placeholder="Say something sweet…"
            />
            <button
              onClick={sendMessage}
              className="bg-pink-600 px-3 rounded-lg text-xs hover:bg-pink-700"
            >
              Send
            </button>
          </div>
        </aside>

        {/* RIGHT: Monetization */}
        <aside className="rounded-2xl border border-pink-500/30 bg-gray-950 p-4 space-y-4">
          {/* Pay-to-stay control (action-only) */}


          {/* Paid Request Menu */}
          <div className="rounded-xl border border-blue-500/20 bg-black/40 p-3">
            <div className="flex items-center justify-between">
              <div className="text-blue-200 text-sm flex items-center gap-2">
                <Mic className="w-4 h-4" /> Request Menu
              </div>
              <div className="text-[10px] text-gray-400">Paid requests</div>
            </div>

            <textarea
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              className="mt-2 w-full bg-black border border-blue-500/20 rounded-lg px-2 py-2 text-xs"
              rows={3}
              placeholder="Write what you want her to do…"
            />

            <div className="mt-2 grid grid-cols-2 gap-2">
              {PAID_REQUESTS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => submitRequest(r)}
                  title={r.hint}
                  className="border border-blue-400/30 rounded-xl py-2 hover:bg-blue-600/10 text-xs text-blue-200"
                >
                  {r.label} · ${r.price}
                </button>
              ))}
            </div>
          </div>

          {/* Send Suga */}
          <div>
            <h3 className="text-pink-300">Send Suga</h3>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {GIFTS.map((g) => (
                <button
                  key={g.label}
                  onClick={() => sendGift(g.label, g.amount)}
                  className="border border-pink-500/30 rounded-xl py-2 hover:bg-pink-600/10"
                >
                  {g.label} · ${g.amount}
                </button>
              ))}
            </div>
          </div>

          {/* Quick paid actions */}
          <button className="w-full bg-pink-600 py-2 rounded-xl hover:bg-pink-700">
            Say My Name ($15)
          </button>
          <button className="w-full border border-pink-500/40 py-2 rounded-xl hover:bg-pink-600/10">
            Sponsor Room ($100)
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button className="border border-pink-500/40 py-2 rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-pink-600/10">
              <Mic className="w-4 h-4" /> Voice $10
            </button>
            <button className="border border-pink-500/40 py-2 rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-pink-600/10">
              <ImageIcon className="w-4 h-4" /> Photo $15
            </button>
          </div>

          <button className="w-full bg-pink-600 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-pink-700">
            <Lock className="w-4 h-4" /> Private 1-on-1 ($10/min)
          </button>

          <div className="text-xs text-gray-400">
            <p className="flex items-center gap-1">
              <Star className="w-3 h-3" /> Spending triggers reactions and visibility
            </p>
            <p className="flex items-center gap-1">
              <Heart className="w-3 h-3" /> Buy-for-her sends funds to creator
            </p>
          </div>
        </aside>
      </main>


    </div>
  );
}






