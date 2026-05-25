/**
 * Tour Step Definitions
 *
 * Pure data – defines every step for each user-type tour.
 * The `target` value maps to a `data-tour="..."` attribute on a DOM element.
 * New tours (Casino9, Marketplace, etc.) can be added by extending `tourConfigs`.
 *
 * IMPORTANT: Every step description MUST match the actual UI element it highlights.
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
//
// Actual home page layout:
//   Header:  Logo | Welcome | Search | Messages | Notifications | Subscription | ProfileMenu
//   Left rail:  Browse Room (Flash Drops, Confessions, X Chat, Bar Lounge, Truth or Dare, Suga 4 U, Competition)
//               My Account (Collections, Suggestions, Subscriptions, NewsFeed, Log Out)
//   Center:  Creator Level filter, Room/Category filter, Sort → Creator tiles grid
//   Right:   Featured Creators (auto-scrolling feed)
// ---------------------------------------------------------------------------
const fanSteps: TourStep[] = [
  {
    target: "wallet-button",
    icon: "💳",
    title: "Your Wallet",
    content:
      "Tap your profile menu to access your Wallet. Add funds for subscriptions, gifts, tips, and paid room access — all managed from here.",
    placement: "bottom",
  },
  {
    target: "rooms-menu",
    icon: "🚀",
    title: "Browse Rooms",
    content:
      "Explore all live room categories — Flash Drops, Confessions, X Chat, Bar Lounge, Truth or Dare, and Suga 4 U. Tap any room to jump in!",
    placement: "right",
  },
  {
    target: "creator-feed",
    icon: "🔥",
    title: "Featured Creators",
    content:
      "Discover top creators on PlayGroundX. This feed showcases featured profiles — tap any creator to visit their profile and see their content.",
    placement: "left",
  },
  {
    target: "subscription-section",
    icon: "👑",
    title: "My Subscriptions",
    content:
      "View and manage your active creator subscriptions. Subscribe weekly or monthly for exclusive content and room access.",
    placement: "bottom",
  },
  {
    target: "suggestions-button",
    icon: "💡",
    title: "Suggestions",
    content:
      "Submit feature suggestions and feedback to help improve PlayGroundX. Your voice matters!",
    placement: "bottom",
  },
  {
    target: "newsfeed-button",
    icon: "📰",
    title: "NewsFeed",
    content:
      "Stay updated with the latest posts, announcements, and activity from creators you follow.",
    placement: "bottom",
  },
];

// ---------------------------------------------------------------------------
// Creator Tour – 6 steps (shown on /rooms/creator-studio)
//
// Actual creator studio layout:
//   CsDashboardHeader:  "Creator Studio Dashboard" title, Welcome @username, Messages, ProfileMenu
//   CsStatsBar:  Tips Earned | Gifts | Followers | Active Rooms | Subscribers | Subscription Earnings + Schedule button
//   CsCreatorStudio:  Grid of room launch cards (Confessions, X Chat, Flash Drops, Bar Lounge, Truth or Dare, Suga 4 U, Competition)
//   CsSubscriptionSettings:  Weekly/Monthly pricing form
//   CsRecentRoomHistory:  Table of recent room sessions
// ---------------------------------------------------------------------------
const creatorSteps: TourStep[] = [
  {
    target: "profile-setup",
    icon: "👤",
    title: "Dashboard Header",
    content:
      "Welcome to your Creator Studio! Here you can access messages, notifications, and your profile settings.",
    placement: "bottom",
  },
  {
    target: "earnings-dashboard",
    icon: "📊",
    title: "Stats & Earnings",
    content:
      "Track your performance at a glance — tips earned, gifts received, total followers, active rooms, subscribers, and subscription earnings. All in real-time.",
    placement: "bottom",
  },
  {
    target: "room-scheduler",
    icon: "🗓️",
    title: "Schedule",
    content:
      "Plan and schedule upcoming room sessions. Fans will see your schedule so they know when to join your next live event.",
    placement: "bottom",
  },
  {
    target: "live-streaming",
    icon: "🎬",
    title: "Room Launcher",
    content:
      "Launch and manage your rooms — Confessions Studio, X Chat Console, Flash Drops, Bar Lounge, Truth or Dare, and Suga 4 U. Each card takes you to that room's creator dashboard.",
    placement: "bottom",
  },
  {
    target: "subscription-settings",
    icon: "💎",
    title: "Subscription Pricing",
    content:
      "Set your weekly and monthly subscription prices. Fans pay to access your exclusive content and premium rooms.",
    placement: "bottom",
  },
  {
    target: "recent-rooms",
    icon: "📋",
    title: "Recent Room History",
    content:
      "View your past room sessions — see which rooms you hosted, when they ran, and how they performed.",
    placement: "bottom",
  },
];

// ---------------------------------------------------------------------------
// Suga Tour – 4 steps (shown on /home)
//
// Suga users are fans with a special account_type (sugadaddy/sugamama/sugababy).
// The tour highlights features relevant to the Suga experience on the home page:
//   - Suga 4 U room button (entry point to the Suga experience)
//   - Featured Creators feed (discover creators)
//   - Subscriptions (subscribe to creators)
//   - Messages (private chat with creators)
// ---------------------------------------------------------------------------
const sugaSteps: TourStep[] = [
  {
    target: "role-selection",
    icon: "✨",
    title: "Suga 4 U Room",
    content:
      "This is your gateway to the Suga experience. Tap Suga 4 U to enter premium rooms, connect with creators, and explore exclusive interactions.",
    placement: "right",
  },
  {
    target: "creator-feed",
    icon: "💕",
    title: "Discover Creators",
    content:
      "Browse featured creators on PlayGroundX. Find profiles that match your interests and start building connections.",
    placement: "left",
  },
  {
    target: "subscription-section",
    icon: "👑",
    title: "Subscribe to Creators",
    content:
      "Subscribe to your favorite creators for exclusive access to their content, premium rooms, and direct interactions.",
    placement: "bottom",
  },
  {
    target: "private-chat",
    icon: "💬",
    title: "Messages",
    content:
      "Chat privately with creators and other users. Build meaningful connections through direct messaging.",
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
