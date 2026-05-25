/**
 * Tour Step Definitions
 *
 * Pure data – defines every step for each user-type tour.
 * The `target` value maps to a `data-tour="..."` attribute on a DOM element.
 * New tours (Casino9, Marketplace, etc.) can be added by extending `tourConfigs`.
 */

export interface TourStep {
  /** Value of the data-tour attribute on the target element */
  target: string;
  /** Emoji shown in the tooltip header */
  icon: string;
  /** Short heading shown in the tooltip */
  title: string;
  /** Description text */
  content: string;
  /** Preferred tooltip placement relative to target */
  placement?: "top" | "bottom" | "left" | "right" | "auto";
  /** Optional route to navigate to before showing this step */
  route?: string;
}

export type TourType = "fan" | "creator" | "suga";

// ---------------------------------------------------------------------------
// Fan Tour – 6 steps (shown on /home)
// ---------------------------------------------------------------------------
const fanSteps: TourStep[] = [
  {
    target: "wallet-button",
    icon: "💳",
    title: "Your Wallet",
    content:
      "Add funds to your wallet for subscriptions, gifts, tips, and paid rooms.",
    placement: "bottom",
  },
  {
    target: "creator-feed",
    icon: "🔥",
    title: "Creator Feed",
    content:
      "Browse creators and discover who is live now.",
    placement: "left",
  },
  {
    target: "rooms-menu",
    icon: "🚀",
    title: "Live Rooms",
    content:
      "Join interactive rooms like Truth or Dare, FlashDrops, Confessions, Suga 4U, and Bar Lounge.",
    placement: "right",
  },
  {
    target: "subscription-section",
    icon: "👑",
    title: "Subscriptions",
    content:
      "Manage all creator subscriptions and premium access here.",
    placement: "bottom",
  },
  {
    target: "gifts-tips",
    icon: "🎁",
    title: "Gifts & Tips",
    content:
      "Send gifts and tips to creators during streams and chats.",
    placement: "bottom",
  },
  {
    target: "schedule-section",
    icon: "📅",
    title: "Schedule",
    content:
      "See when creators will be live and what rooms they are hosting.",
    placement: "bottom",
  },
];

// ---------------------------------------------------------------------------
// Creator Tour – 6 steps (shown on /rooms/creator-studio)
// ---------------------------------------------------------------------------
const creatorSteps: TourStep[] = [
  {
    target: "profile-setup",
    icon: "👤",
    title: "Profile Setup",
    content: "Customize your creator profile and upload media.",
    placement: "bottom",
  },
  {
    target: "subscription-settings",
    icon: "💎",
    title: "Subscription Settings",
    content: "Set subscription pricing and fan access levels.",
    placement: "bottom",
  },
  {
    target: "live-streaming",
    icon: "🎬",
    title: "Live Streaming",
    content: "Start live streams and interact with fans in real-time.",
    placement: "bottom",
  },
  {
    target: "room-scheduler",
    icon: "🗓️",
    title: "Room Scheduler",
    content: "Schedule upcoming room events so fans know when to join.",
    placement: "bottom",
  },
  {
    target: "earnings-dashboard",
    icon: "📊",
    title: "Earnings Dashboard",
    content: "Track subscriptions, tips, gifts, and room earnings.",
    placement: "bottom",
  },
  {
    target: "withdrawals",
    icon: "💰",
    title: "Withdrawals",
    content: "Withdraw creator earnings securely.",
    placement: "bottom",
  },
];

// ---------------------------------------------------------------------------
// Suga Tour – 4 steps (shown on /home)
// ---------------------------------------------------------------------------
const sugaSteps: TourStep[] = [
  {
    target: "role-selection",
    icon: "✨",
    title: "Role Selection",
    content:
      "Choose whether you are a Sugadaddy, Sugamama, or Sugababy.",
    placement: "bottom",
  },
  {
    target: "match-discovery",
    icon: "💕",
    title: "Match Discovery",
    content: "Discover users and creators that match your interests.",
    placement: "right",
  },
  {
    target: "gift-system",
    icon: "🎁",
    title: "Gift System",
    content: "Send gifts and rewards directly to users.",
    placement: "bottom",
  },
  {
    target: "private-chat",
    icon: "💬",
    title: "Private Chat",
    content: "Chat privately and build connections.",
    placement: "bottom",
  },
];

// ---------------------------------------------------------------------------
// Registry – add new tours here
// ---------------------------------------------------------------------------
export const tourConfigs: Record<TourType, TourStep[]> = {
  fan: fanSteps,
  creator: creatorSteps,
  suga: sugaSteps,
};
