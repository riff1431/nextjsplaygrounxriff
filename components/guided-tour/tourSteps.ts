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

export type TourType =
  | "fan"
  | "creator"
  | "suga"
  // Room-specific tours (12 total)
  | "bar_lounge_creator"
  | "bar_lounge_fan"
  | "confession_creator"
  | "confession_fan"
  | "flashdrop_creator"
  | "flashdrop_fan"
  | "suga4u_creator"
  | "suga4u_fan"
  | "truth_or_dare_creator"
  | "truth_or_dare_fan"
  | "xchat_creator"
  | "xchat_fan";

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
    target: "tour-button",
    icon: "❓",
    title: "Tour Guide",
    content: "Whenever you want to restart this tour, just click this Help icon in the header.",
    placement: "bottom",
  },
  {
    target: "wallet-button",
    icon: "💳",
    title: "Your Wallet & Profile",
    content: "Access your profile, Kyc Verification status, help resources, and Wallet here. Add coins to your balance to tip creators and unlock special rooms.",
    placement: "bottom",
  },
  {
    target: "membership-badge",
    icon: "✨",
    title: "Membership Badges",
    content: "Check your user tier status (Bronze, Silver, Gold, VIP) and benefits by clicking on your account badge.",
    placement: "bottom",
  },
  {
    target: "search-creators",
    icon: "🔍",
    title: "Search Creators",
    content: "Looking for someone specific? Type their name or level in the search bar to find and connect with your favorite creators instantly.",
    placement: "bottom",
  },
  {
    target: "notification-button",
    icon: "🔔",
    title: "Notifications",
    content: "Stay informed! Here you will get updates on notifications like locks, likes, and messages.",
    placement: "bottom",
  },
  {
    target: "private-chat",
    icon: "💬",
    title: "Messages / Chat",
    content: "View your private message chats with creators, request VIP conversations, and check updates.",
    placement: "bottom",
  },
  {
    target: "subscription-section",
    icon: "👑",
    title: "VIP Subscriptions",
    content: "Quickly view your active creator subscriptions and subscribe directly from this section.",
    placement: "bottom",
  },
  {
    target: "rooms-menu",
    icon: "🚀",
    title: "Browse Live Rooms",
    content: "Browse our active live room categories: Confessions, Bar Lounge, Truth or Dare, Suga 4 U, and X Chat. Tap a category to view active creators!",
    placement: "right",
  },
  {
    target: "collections-button",
    icon: "⭐",
    title: "My Collections",
    content: "View your purchased photos, videos, and unlocked exclusive creator content. All saved securely in your personal collection.",
    placement: "right",
  },
  {
    target: "subscriptions-button",
    icon: "👥",
    title: "My Subscriptions List",
    content: "View your subscribed creators' lists, followings, and upcoming events.",
    placement: "right",
  },
  {
    target: "suggestions-button",
    icon: "💡",
    title: "Submit Suggestions",
    content: "We value your input! Share your ideas, bug reports, and features you would like to see on PlayGroundX.",
    placement: "right",
  },
  {
    target: "newsfeed-button",
    icon: "📰",
    title: "NewsFeed",
    content: "See updates, newly published posts, photos, and status notes from all the creators you follow.",
    placement: "right",
  },
  {
    target: "creator-feed",
    icon: "🔥",
    title: "Featured Creators",
    content: "Browse top trending creators and check out who's currently live, their latest posts, or visit their profile pages.",
    placement: "left",
  },
];

// ---------------------------------------------------------------------------
// Creator Tour – 6 steps (shown on /rooms/creator-studio)
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
    title: "Content & Subscription Pricing",
    content:
      "Manage subscriber content and pricing in one place. Upload exclusive photos, videos, and posts for your supporters, and set custom weekly or monthly subscription rates for fans to unlock access.",
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

// ===========================================================================
// ROOM-SPECIFIC TOURS (12 total — Creator + Fan for each of 6 rooms)
// ===========================================================================

// ---------------------------------------------------------------------------
// Bar Lounge Creator — 8 steps
// ---------------------------------------------------------------------------
const barLoungeCreatorSteps: TourStep[] = [
  {
    target: "bar-room-info",
    icon: "⬅️",
    title: "Back / Room Info",
    content:
      "Go back to the session dashboard or minimize your room.",
    placement: "bottom",
  },
  {
    target: "bar-incoming-button",
    icon: "📥",
    title: "Incoming Requests",
    content:
      "Click here to see and manage incoming 1-on-1 call requests from fans.",
    placement: "bottom",
  },
  {
    target: "bar-start-end-room",
    icon: "🔴",
    title: "Start / End Room",
    content:
      "Go live or end your room here. Your earnings, timer, and fan count are displayed alongside.",
    placement: "bottom",
  },
  {
    target: "bar-lounge-chat",
    icon: "💬",
    title: "Lounge Chat",
    content:
      "This is your main chat with fans. Greet them, chat, answer questions, and build the vibe.",
    placement: "right",
  },
  {
    target: "bar-tips-drinks-guide",
    icon: "📹",
    title: "Live Stream / Video Stage",
    content:
      "Your live video stream is displayed here. Fans watch you live from this view.",
    placement: "bottom",
  },
  {
    target: "bar-incoming-section",
    icon: "📋",
    title: "Requests & Summary",
    content:
      "Review incoming fan requests and see your session summary stats including tips, drinks, and total earnings.",
    placement: "left",
  },
];

// ---------------------------------------------------------------------------
// Bar Lounge Fan — 8 steps
// ---------------------------------------------------------------------------
const barLoungeFanSteps: TourStep[] = [
  {
    target: "fan-wallet-balance",
    icon: "💳",
    title: "Wallet Balance",
    content:
      "Shows your current PlayGroundX wallet balance. Top up your wallet to keep interacting inside the room.",
    placement: "left",
  },
  {
    target: "fan-incoming-button",
    icon: "🔔",
    title: "Incoming",
    content:
      "Shows creator invitations, VIP approvals, and room notifications. Check this regularly.",
    placement: "left",
  },
  {
    target: "fan-buy-drink-menu",
    icon: "🍸",
    title: "Buy A Drink",
    content:
      "Purchase virtual drinks for the creator. Sending drinks helps support the creator and helps you get noticed.",
    placement: "right",
  },
  {
    target: "fan-vip-lounge",
    icon: "👑",
    title: "VIP Lounge",
    content:
      "Upgrade to VIP for exclusive content, premium access, special privileges, and more attention from the creator.",
    placement: "right",
  },
  {
    target: "fan-private-one-on-one",
    icon: "📹",
    title: "Private 1-On-1",
    content:
      "Request a private video call with the creator. If approved, you will be moved into a private session.",
    placement: "top",
  },
  {
    target: "fan-lounge-chat",
    icon: "💬",
    title: "Lounge Chat",
    content:
      "Chat live with the creator and other fans. Introduce yourself, ask questions, and engage respectfully.",
    placement: "left",
  },
  {
    target: "fan-custom-tip",
    icon: "💵",
    title: "Custom Tip",
    content:
      "Send any amount directly to the creator. Enter your amount and click Tip Now. Tips help you get noticed more.",
    placement: "top",
  },
  {
    target: "fan-pin-name",
    icon: "📌",
    title: "Pin Your Name",
    content:
      "Pin your name to the top of the chat. This helps you stay visible and get noticed by the creator and other fans.",
    placement: "top",
  },
];

// ---------------------------------------------------------------------------
// Confessions Creator — 9 steps
// ---------------------------------------------------------------------------
const confessionCreatorSteps: TourStep[] = [
  {
    target: "confession-my-requests",
    icon: "📩",
    title: "My Requests",
    content:
      "View confession requests submitted directly to you by fans. Review, accept, reject, or respond.",
    placement: "bottom",
  },
  {
    target: "confession-global-requests",
    icon: "🌍",
    title: "Global Requests",
    content:
      "Browse public confession requests submitted by all users. Choose which confessions you want to react to or discuss.",
    placement: "bottom",
  },
  {
    target: "confession-pending-requests",
    icon: "⏳",
    title: "Pending Requests",
    content:
      "This section displays confession requests waiting for your action. Review the fan, confession, amount offered, and decide whether to proceed.",
    placement: "bottom",
  },
  {
    target: "confession-earnings-live-fans",
    icon: "📊",
    title: "Earnings & Live Fans",
    content:
      "Track your earnings and current live fan count in real-time.",
    placement: "bottom",
  },
  {
    target: "confession-start-end-room",
    icon: "🔴",
    title: "Start / End Room",
    content:
      "Start your Confession Room when ready and end it when your session is complete.",
    placement: "left",
  },
  {
    target: "confession-random-request",
    icon: "🎲",
    title: "Create Random Confession",
    content:
      "Create a random confession to display publicly on the Fan view.",
    placement: "right",
  },
  {
    target: "confession-wall",
    icon: "🧱",
    title: "Confession Wall",
    content:
      "View and manage confession posts displayed publicly within your room. Popular confessions can generate more engagement and tips.",
    placement: "right",
  },
  {
    target: "confession-summary-panel",
    icon: "📋",
    title: "Summary Panel",
    content:
      "Track room performance including total fans, total confessions, reaction tips, and total earnings.",
    placement: "right",
  },
  {
    target: "confession-live-chat",
    icon: "💬",
    title: "Live Chat",
    content:
      "Chat with fans in real-time. Ask questions, react to confessions, and build engagement.",
    placement: "left",
  },
];

// ---------------------------------------------------------------------------
// Confessions Fan — 8 steps
// ---------------------------------------------------------------------------
const confessionFanSteps: TourStep[] = [
  {
    target: "confession-send-to",
    icon: "🎯",
    title: "1 on 1 & Global",
    content:
      "Choose where your confession request goes. Send it directly to one creator using 1 on 1, or make it visible to all creators using Global.",
    placement: "right",
  },
  {
    target: "confession-all-creator-confessions",
    icon: "📖",
    title: "All Creator Confessions",
    content:
      "Browse confessions created by creators. Use filters to find confessions that match your interests, mood, or preferred category.",
    placement: "bottom",
  },
  {
    target: "confession-request-builder",
    icon: "✍️",
    title: "Request Confession",
    content:
      "Create a confession request using text, image, or video. Add your offer amount and topic prompt to guide the creator.",
    placement: "left",
  },
  {
    target: "confession-invite-incoming",
    icon: "📥",
    title: "Invite / Incoming",
    content:
      "Invite friends into the room and view incoming notifications, responses, approvals, and room activities.",
    placement: "bottom",
  },
  {
    target: "confession-live-chat",
    icon: "💬",
    title: "Live Chat",
    content:
      "Chat with the creator and other fans in real-time. Send messages, react to confessions, and join the conversation.",
    placement: "right",
  },
  {
    target: "confession-creator-spotlight",
    icon: "🌟",
    title: "Creator Spotlight",
    content:
      "View the creator currently hosting the room. See their profile, live status, and stay updated on their activity.",
    placement: "top",
  },
  {
    target: "confession-send-request",
    icon: "📤",
    title: "Send Request",
    content:
      "Submit your confession request to the creator or all creators. You can choose to send it publicly or anonymously.",
    placement: "left",
  },
  {
    target: "confession-my-requests",
    icon: "📋",
    title: "My Requests List",
    content:
      "View confession requests you have already submitted and track their status, responses, and outcomes.",
    placement: "left",
  },
];

// ---------------------------------------------------------------------------
// FlashDrop Creator — 6 steps
// ---------------------------------------------------------------------------
const flashdropCreatorSteps: TourStep[] = [
  {
    target: "flashdrop-summary-box",
    icon: "📊",
    title: "Summary Box",
    content:
      "Track your fans, drops, packs, requests, and tips in real-time as your room grows.",
    placement: "bottom",
  },
  {
    target: "flashdrop-live-drop-board",
    icon: "🎯",
    title: "Live Drop Board",
    content:
      "Create, manage, and monitor all active drops. Sell photos, videos, and exclusive content instantly to your fans.",
    placement: "right",
  },
  {
    target: "flashdrop-live-stream",
    icon: "📹",
    title: "Live Stream",
    content:
      "Go live, interact with fans, promote your drops, and increase engagement while selling content.",
    placement: "bottom",
  },
  {
    target: "flashdrop-high-roller-packs",
    icon: "💎",
    title: "High Roller Packs",
    content:
      "Create premium bundles and exclusive content packs for larger purchases and VIP buyers.",
    placement: "top",
  },
  {
    target: "flashdrop-custom-request-drops",
    icon: "📝",
    title: "Custom Request Drops",
    content:
      "Fans can request custom content. Review requests and reply with Photo Drops, Video Drops, or Custom Drops directly from here.",
    placement: "left",
  },
  {
    target: "flashdrop-live-chat",
    icon: "💬",
    title: "Live Chat",
    content:
      "Chat with your fans in real-time, answer questions, promote drops, and build stronger fan relationships.",
    placement: "left",
  },
];

// ---------------------------------------------------------------------------
// FlashDrop Fan — 8 steps
// ---------------------------------------------------------------------------
const flashdropFanSteps: TourStep[] = [
  {
    target: "flashdrop-fan-creator-info",
    icon: "👤",
    title: "Creator Info",
    content:
      "View the creator's profile picture and connection status.",
    placement: "right",
  },
  {
    target: "flashdrop-fan-quick-actions",
    icon: "⚡",
    title: "Quick Actions",
    content:
      "Use these buttons to follow or add the creator, share the room, report any issues, and view incoming content sent from the creator.",
    placement: "right",
  },
  {
    target: "flashdrop-fan-live-drop-board",
    icon: "🎯",
    title: "Live Drop Board",
    content:
      "See current drops available from the creator. Tap on Photos or Videos to browse content.",
    placement: "right",
  },
  {
    target: "flashdrop-fan-live-chat",
    icon: "💬",
    title: "Live Chat",
    content:
      "Chat in real-time with the creator and other fans in the room.",
    placement: "left",
  },
  {
    target: "flashdrop-fan-reactions",
    icon: "❤️",
    title: "Reactions",
    content:
      "Send fun reactions to the creator and stand out in the chat. More reactions, more love!",
    placement: "left",
  },
  {
    target: "flashdrop-fan-high-roller-packs",
    icon: "💎",
    title: "High Roller Packs",
    content:
      "Check out exclusive premium packs created by the creator. Exclusive content inside!",
    placement: "left",
  },
  {
    target: "flashdrop-fan-request-drop",
    icon: "📝",
    title: "Request a Drop",
    content:
      "Request custom photos, videos, or special content from the creator. Be clear and add your offer.",
    placement: "left",
  },
  {
    target: "flashdrop-fan-top-alerts",
    icon: "🚨",
    title: "Top Alerts",
    content:
      "Stay updated with important announcements, rare items, limited drops, and special events.",
    placement: "bottom",
  },
];

// ---------------------------------------------------------------------------
// Suga 4 U Creator — 12 steps
// ---------------------------------------------------------------------------
const suga4uCreatorSteps: TourStep[] = [
  {
    target: "suga-creator-back-to-rooms",
    icon: "⬅️",
    title: "Back To Rooms",
    content: "Go back to the list of your rooms or minimize the session.",
    placement: "bottom",
  },
  {
    target: "suga-creator-incoming-requests",
    icon: "📥",
    title: "Incoming Requests",
    content: "View and manage all incoming 1-on-1 call requests from fans.",
    placement: "bottom",
  },
  {
    target: "suga-creator-go-live-end",
    icon: "🔴",
    title: "Go Live / End",
    content: "Start your live session or end it when you're done. Your earnings and timer appear here too.",
    placement: "bottom",
  },
  {
    target: "suga-creator-live-chat",
    icon: "💬",
    title: "Live Chat",
    content:
      "Chat with your fans in real-time. Build connections and keep the room active.",
    placement: "right",
  },
  {
    target: "suga-creator-pending-requests",
    icon: "📋",
    title: "Pending Requests",
    content:
      "See all pending paid requests from fans. Accept or decline them from here.",
    placement: "top",
  },
  {
    target: "suga-creator-group-vote",
    icon: "🗳️",
    title: "Group Vote",
    content:
      "Create a group vote and let fans vote to hit the goal! Add how much a fan pays per vote.",
    placement: "top",
  },
  {
    target: "suga-creator-favorites",
    icon: "🎁",
    title: "Creators Favorites",
    content:
      "Create your Suga Gifts you would like to receive from fans. Add name, item, link and pic, and persuade fans to buy which you want!",
    placement: "left",
  },
  {
    target: "suga-creator-summary",
    icon: "📋",
    title: "Session Summary",
    content:
      "See a summary of your session including earnings, duration, viewers and more.",
    placement: "top",
  },
  {
    target: "suga-creator-secrets",
    icon: "🤫",
    title: "Creator Secrets",
    content:
      "Add special secret requests for exclusive moments with your fans.",
    placement: "left",
  },
  {
    target: "suga-creator-live-preview",
    icon: "📹",
    title: "Live Preview",
    content:
      "See your live camera preview before and during your stream.",
    placement: "left",
  },
];

// ---------------------------------------------------------------------------
// Suga 4 U Fan — 10 steps
// ---------------------------------------------------------------------------
const suga4uFanSteps: TourStep[] = [
  {
    target: "suga-fan-back-to-rooms",
    icon: "⬅️",
    title: "Back To Rooms",
    content: "Go back to the list of all live rooms.",
    placement: "right",
  },
  {
    target: "suga-fan-invite",
    icon: "📨",
    title: "Invite Friends",
    content: "Invite your friends to join this room.",
    placement: "bottom",
  },
  {
    target: "suga-fan-incoming-from-creator",
    icon: "📥",
    title: "Incoming From Creator",
    content:
      "View your requests you submitted, approved from the creator.",
    placement: "bottom",
  },
  {
    target: "suga-fan-creator-info",
    icon: "👤",
    title: "Creator Info",
    content:
      "View the creator's profile, level, and room status.",
    placement: "left",
  },
  {
    target: "suga-fan-paid-requests",
    icon: "💳",
    title: "Paid Requests",
    content:
      "See your paid requests and their status. Creators can approve, decline, or reply to your requests.",
    placement: "left",
  },
  {
    target: "suga-fan-send-gifts",
    icon: "🎁",
    title: "Send Gifts",
    content:
      "Send Suga Gifts to show your love and support for the creator.",
    placement: "left",
  },
  {
    target: "suga-fan-special-actions",
    icon: "✨",
    title: "Special Actions",
    content:
      "Send special requests for exclusive content from the creator.",
    placement: "left",
  },
  {
    target: "suga-fan-creator-secrets",
    icon: "🤫",
    title: "Creator Secrets",
    content: "Unlock secret requests created by the creator.",
    placement: "right",
  },
  {
    target: "suga-fan-creator-favorites",
    icon: "❤️",
    title: "Creator Favorites",
    content:
      "View the creator's favorite gifts and items they love. Reveal and buy for them!",
    placement: "top",
  },
  {
    target: "suga-fan-group-votes",
    icon: "🗳️",
    title: "Group Votes",
    content:
      "Join votes with other fans to hit the goal and unlock special rewards.",
    placement: "top",
  },
];

// ---------------------------------------------------------------------------
// Truth or Dare Creator — 8 steps
// ---------------------------------------------------------------------------
const truthOrDareCreatorSteps: TourStep[] = [
  {
    target: "tod-live-stream",
    icon: "📹",
    title: "Live Stream Preview",
    content:
      "See your live stream preview in real-time. Monitor your live status and viewer count while hosting your Truth or Dare room.",
    placement: "right",
  },
  {
    target: "tod-invite-creators",
    icon: "👥",
    title: "Invite Creator Slots",
    content:
      "Invite up to 4 co-creators to join your room. Click the + icon to bring creators into the Truth or Dare session.",
    placement: "bottom",
  },
  {
    target: "tod-room-earnings",
    icon: "💰",
    title: "Room Earnings",
    content:
      "Track your total earnings, tips, truth earnings, dare earnings, and custom request earnings during the live session.",
    placement: "right",
  },
  {
    target: "tod-group-vote",
    icon: "🗳️",
    title: "Group Vote",
    content:
      "Let fans vote between Truth or Dare. Add a prompt, set vote duration, set how many votes are needed, set how much fans pay per vote, then start the vote.",
    placement: "top",
  },
  {
    target: "tod-incoming-requests",
    icon: "📥",
    title: "Incoming Requests",
    content:
      "View and manage incoming Random System Truth or Dares; and Custom requests from fans. Review requests and handle them during your stream.",
    placement: "left",
  },
  {
    target: "tod-live-chat",
    icon: "💬",
    title: "Live Chat",
    content:
      "Chat with your fans in real-time. View messages instantly, respond to your audience, and keep the room active.",
    placement: "left",
  },
  {
    target: "tod-room-timer",
    icon: "⏱️",
    title: "Room Timer",
    content:
      "Track how long your Truth or Dare session has been running in real-time.",
    placement: "bottom",
  },
  {
    target: "tod-go-live-button",
    icon: "🔴",
    title: "Go Live / End Session",
    content:
      "When offline, click Go Live to start your Truth or Dare room. Once live, this button changes to End so you can finish the session.",
    placement: "bottom",
  },
];

// ---------------------------------------------------------------------------
// Truth or Dare Fan — 9 steps
// ---------------------------------------------------------------------------
const truthOrDareFanSteps: TourStep[] = [
  {
    target: "tod-fan-live-stream",
    icon: "📹",
    title: "Live Stream Preview",
    content:
      "Watch the creator live in real-time. See the live status, creator video preview, number of viewers, and room atmosphere.",
    placement: "right",
  },
  {
    target: "tod-fan-top-fans",
    icon: "🏆",
    title: "Truth & Dare Top Fans",
    content:
      "This displays the top fan for Truth and the top fan for Dare in this room.",
    placement: "left",
  },
  {
    target: "tod-fan-gifts",
    icon: "🎁",
    title: "Gifts",
    content:
      "Send gifts to support the creator and get noticed in the room.",
    placement: "left",
  },
  {
    target: "tod-fan-tip-creator",
    icon: "💵",
    title: "Tip Creator",
    content:
      "Show your appreciation by sending a tip directly to the creator.",
    placement: "left",
  },
  {
    target: "tod-fan-vote-goals",
    icon: "🗳️",
    title: "Vote Together To Unlock Goals",
    content:
      "Fans vote together to unlock fun Truth or Dare goals and challenges.",
    placement: "left",
  },
  {
    target: "tod-fan-live-chat",
    icon: "💬",
    title: "Live Chat",
    content:
      "Chat with other fans in real-time. Share reactions, talk, and have fun together.",
    placement: "left",
  },
  {
    target: "tod-fan-system-dares",
    icon: "🔥",
    title: "System Dares",
    content:
      "Browse and vote for Dare categories with different intensity levels.",
    placement: "top",
  },
  {
    target: "tod-fan-system-truths",
    icon: "💡",
    title: "System Truths",
    content:
      "Browse and vote for Truth categories with different intensity levels.",
    placement: "top",
  },
  {
    target: "tod-fan-custom-requests",
    icon: "📝",
    title: "Custom Requests",
    content:
      "Submit your own custom Truth or Dare request for the creator to complete.",
    placement: "top",
  },
];

// ---------------------------------------------------------------------------
// X Chat Creator — 6 steps
// ---------------------------------------------------------------------------
const xchatCreatorSteps: TourStep[] = [
  {
    target: "xchat-creator-live-chat-panel",
    icon: "💬",
    title: "Live Chat Panel",
    content:
      "See all messages from fans in real-time. Switch between All, Paid, and Priority messages.",
    placement: "right",
  },
  {
    target: "xchat-creator-incoming-requests",
    icon: "📥",
    title: "Incoming Requests",
    content:
      "All content requests from fans will appear here. Click to view and respond.",
    placement: "left",
  },
  {
    target: "xchat-creator-summary-stats",
    icon: "📊",
    title: "Summary Stats",
    content:
      "See your live session statistics including reactions, stickers, paid messages, fans, and requests.",
    placement: "left",
  },
  {
    target: "xchat-creator-earned-amount",
    icon: "💰",
    title: "Earned Amount",
    content:
      "See the total amount you have earned from this session.",
    placement: "bottom",
  },
  {
    target: "xchat-creator-live-fans",
    icon: "👥",
    title: "Live Fans",
    content:
      "See the total number of fans currently watching you live.",
    placement: "bottom",
  },
  {
    target: "xchat-creator-timer-control",
    icon: "⏱️",
    title: "Timer & Control",
    content:
      "This shows your live time. Click the green button to start your X Chat session.",
    placement: "left",
  },
];

// ---------------------------------------------------------------------------
// X Chat Fan — 10 steps
// ---------------------------------------------------------------------------
const xchatFanSteps: TourStep[] = [
  {
    target: "xchat-fan-back",
    icon: "⬅️",
    title: "Back",
    content: "Click to go back to the previous screen.",
    placement: "right",
  },
  {
    target: "xchat-fan-invite",
    icon: "📨",
    title: "Invite",
    content:
      "Invite more fans to join this room and be part of the conversation.",
    placement: "right",
  },
  {
    target: "xchat-fan-video-area",
    icon: "📹",
    title: "Video Area",
    content:
      "Watch the creator live stream here. The video will be displayed in this section.",
    placement: "bottom",
  },
  {
    target: "xchat-fan-paid-reactions",
    icon: "❤️‍🔥",
    title: "Paid Reactions",
    content:
      "Send paid reactions to show your support and get noticed by the creator.",
    placement: "right",
  },
  {
    target: "xchat-fan-visibility-boosts",
    icon: "🚀",
    title: "Visibility Boosts",
    content:
      "Use boosts to highlight your messages and stand out in the chat.",
    placement: "right",
  },
  {
    target: "xchat-fan-paid-stickers",
    icon: "🎨",
    title: "Paid Stickers",
    content:
      "Send paid stickers to express yourself and grab the creator's attention.",
    placement: "left",
  },
  {
    target: "xchat-fan-direct-access",
    icon: "🎯",
    title: "Direct Access",
    content:
      "Send special requests directly to the creator, including private questions, outfit changes, or topic choices.",
    placement: "left",
  },
  {
    target: "xchat-fan-chat-filters",
    icon: "🔍",
    title: "Chat Filter Tabs",
    content:
      "Filter messages between All, Paid, and Priority messages.",
    placement: "left",
  },
  {
    target: "xchat-fan-chat-messages",
    icon: "💬",
    title: "Live Chat",
    content:
      "View all messages from the creator and other fans in real-time.",
    placement: "left",
  },
  {
    target: "xchat-fan-top-bar",
    icon: "📊",
    title: "Top Bar",
    content:
      "See incoming requests and your wallet balance or earnings.",
    placement: "left",
  },
];

// ---------------------------------------------------------------------------
// Registry – add new tours here
// ---------------------------------------------------------------------------
export const tourConfigs: Record<TourType, TourStep[]> = {
  fan: fanSteps,
  creator: creatorSteps,
  suga: sugaSteps,
  // Room tours
  bar_lounge_creator: barLoungeCreatorSteps,
  bar_lounge_fan: barLoungeFanSteps,
  confession_creator: confessionCreatorSteps,
  confession_fan: confessionFanSteps,
  flashdrop_creator: flashdropCreatorSteps,
  flashdrop_fan: flashdropFanSteps,
  suga4u_creator: suga4uCreatorSteps,
  suga4u_fan: suga4uFanSteps,
  truth_or_dare_creator: truthOrDareCreatorSteps,
  truth_or_dare_fan: truthOrDareFanSteps,
  xchat_creator: xchatCreatorSteps,
  xchat_fan: xchatFanSteps,
};

/** Check if a tour type is a room-specific tour (not the global onboarding tours) */
export function isRoomTour(type: TourType): boolean {
  return !["fan", "creator", "suga"].includes(type);
}
