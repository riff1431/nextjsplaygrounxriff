-- ══════════════════════════════════════════════════════════════════
-- Room Entry Info Modal — Schema Migration + Default Content Seed
-- ══════════════════════════════════════════════════════════════════

-- 1. Add new JSONB columns for the 3 info sections + pro tip
ALTER TABLE room_settings
  ADD COLUMN IF NOT EXISTS entry_info_section1 jsonb DEFAULT '{"title": "What Happens Here", "items": []}'::jsonb,
  ADD COLUMN IF NOT EXISTS entry_info_section2 jsonb DEFAULT '{"title": "How to Participate", "items": []}'::jsonb,
  ADD COLUMN IF NOT EXISTS entry_info_section3 jsonb DEFAULT '{"title": "Ways to Spend", "items": []}'::jsonb,
  ADD COLUMN IF NOT EXISTS entry_info_pro_tip text DEFAULT '';

-- 2. Seed default content for each room

-- ── Confessions ──
UPDATE room_settings SET
  entry_info_section1 = '{
    "title": "What Happens Here",
    "items": [
      {"emoji": "💜", "text": "Browse spicy confessions – all posted anonymously"},
      {"emoji": "🤑", "text": "Unlock confessions starting at $5"},
      {"emoji": "😈", "text": "Request custom confessions and watch them spill the tea!"}
    ]
  }'::jsonb,
  entry_info_section2 = '{
    "title": "How to Participate",
    "items": [
      {"emoji": "1️⃣", "text": "Explore spicy, dirty, and forbidden confessions"},
      {"emoji": "2️⃣", "text": "Tap to unlock your favorites"},
      {"emoji": "3️⃣", "text": "Request and post your own custom confessions"},
      {"emoji": "4️⃣", "text": "React and engage anonymously!"}
    ]
  }'::jsonb,
  entry_info_section3 = '{
    "title": "Ways to Spend",
    "items": [
      {"emoji": "🔓", "text": "Unlock confessions starting at $5"},
      {"emoji": "🔥", "text": "Get custom confessions ($10+)"},
      {"emoji": "💸", "text": "Make anonymous confession requests"}
    ]
  }'::jsonb,
  entry_info_pro_tip = 'See how many others unlocked – top spenders get confessions first!'
WHERE room_type = 'confessions';

-- ── X-Chat ──
UPDATE room_settings SET
  entry_info_section1 = '{
    "title": "What Happens Here",
    "items": [
      {"emoji": "💬", "text": "Live interactive chat sessions with your favorite creators"},
      {"emoji": "🎤", "text": "Send voice notes, reactions, and private messages"},
      {"emoji": "⚡", "text": "Boost your visibility to stand out in the crowd!"}
    ]
  }'::jsonb,
  entry_info_section2 = '{
    "title": "How to Participate",
    "items": [
      {"emoji": "1️⃣", "text": "Join the live chat room"},
      {"emoji": "2️⃣", "text": "Send messages and interact with creators"},
      {"emoji": "3️⃣", "text": "Use paid reactions to get noticed"},
      {"emoji": "4️⃣", "text": "Send voice notes for personal replies!"}
    ]
  }'::jsonb,
  entry_info_section3 = '{
    "title": "Ways to Spend",
    "items": [
      {"emoji": "🚀", "text": "Message boost starting at $3"},
      {"emoji": "🎤", "text": "Voice note replies ($5+)"},
      {"emoji": "💎", "text": "VIP reactions and exclusive stickers"}
    ]
  }'::jsonb,
  entry_info_pro_tip = 'Boosted messages get pinned to the top – creators respond faster!'
WHERE room_type = 'x-chat';

-- ── Bar Lounge ──
UPDATE room_settings SET
  entry_info_section1 = '{
    "title": "What Happens Here",
    "items": [
      {"emoji": "🍸", "text": "Chill live sessions with relaxed conversations"},
      {"emoji": "🎵", "text": "Hang out, chat, and vibe with the creator"},
      {"emoji": "🥂", "text": "Send virtual drinks and exclusive toasts!"}
    ]
  }'::jsonb,
  entry_info_section2 = '{
    "title": "How to Participate",
    "items": [
      {"emoji": "1️⃣", "text": "Enter the lounge and find your seat"},
      {"emoji": "2️⃣", "text": "Chat with the creator and other fans"},
      {"emoji": "3️⃣", "text": "Send drinks and reactions to show love"},
      {"emoji": "4️⃣", "text": "Request a private conversation!"}
    ]
  }'::jsonb,
  entry_info_section3 = '{
    "title": "Ways to Spend",
    "items": [
      {"emoji": "🍹", "text": "Buy virtual drinks starting at $3"},
      {"emoji": "🎯", "text": "VIP table access ($10+)"},
      {"emoji": "💬", "text": "Private chat with the creator"}
    ]
  }'::jsonb,
  entry_info_pro_tip = 'The more drinks you send, the higher you climb on the VIP leaderboard!'
WHERE room_type = 'bar-lounge';

-- ── Truth or Dare ──
UPDATE room_settings SET
  entry_info_section1 = '{
    "title": "What Happens Here",
    "items": [
      {"emoji": "🎯", "text": "Interactive Truth or Dare game with live creators"},
      {"emoji": "🗳️", "text": "Vote on dares and watch them happen in real-time"},
      {"emoji": "🔥", "text": "Challenge creators with your own dares!"}
    ]
  }'::jsonb,
  entry_info_section2 = '{
    "title": "How to Participate",
    "items": [
      {"emoji": "1️⃣", "text": "Choose Truth or Dare when prompted"},
      {"emoji": "2️⃣", "text": "Vote on challenges with other fans"},
      {"emoji": "3️⃣", "text": "Watch creators complete dares live"},
      {"emoji": "4️⃣", "text": "Submit your own challenges!"}
    ]
  }'::jsonb,
  entry_info_section3 = '{
    "title": "Ways to Spend",
    "items": [
      {"emoji": "🗳️", "text": "Vote boosts starting at $2"},
      {"emoji": "🎯", "text": "Custom dare challenges ($5+)"},
      {"emoji": "💰", "text": "Tip creators for completing your dare"}
    ]
  }'::jsonb,
  entry_info_pro_tip = 'Top voters get to pick the final dare – make it count!'
WHERE room_type = 'truth-or-dare';

-- ── Suga 4 U ──
UPDATE room_settings SET
  entry_info_section1 = '{
    "title": "What Happens Here",
    "items": [
      {"emoji": "👑", "text": "Premium 1-on-1 interactions with top creators"},
      {"emoji": "💎", "text": "Exclusive content drops and personal attention"},
      {"emoji": "🌟", "text": "VIP treatment and custom experiences!"}
    ]
  }'::jsonb,
  entry_info_section2 = '{
    "title": "How to Participate",
    "items": [
      {"emoji": "1️⃣", "text": "Browse premium creator sessions"},
      {"emoji": "2️⃣", "text": "Request a personal session"},
      {"emoji": "3️⃣", "text": "Enjoy exclusive one-on-one time"},
      {"emoji": "4️⃣", "text": "Send gifts and unlock special content!"}
    ]
  }'::jsonb,
  entry_info_section3 = '{
    "title": "Ways to Spend",
    "items": [
      {"emoji": "💎", "text": "Session fees vary by creator"},
      {"emoji": "🎁", "text": "Send luxury gifts ($5+)"},
      {"emoji": "👑", "text": "Unlock exclusive premium content"}
    ]
  }'::jsonb,
  entry_info_pro_tip = 'Top spenders get priority access and exclusive perks from creators!'
WHERE room_type = 'suga4u';

-- ── Flash Drops ──
UPDATE room_settings SET
  entry_info_section1 = '{
    "title": "What Happens Here",
    "items": [
      {"emoji": "⚡", "text": "Time-limited exclusive content drops"},
      {"emoji": "📦", "text": "Grab rare packs before they sell out"},
      {"emoji": "🏆", "text": "Collect exclusive creator content!"}
    ]
  }'::jsonb,
  entry_info_section2 = '{
    "title": "How to Participate",
    "items": [
      {"emoji": "1️⃣", "text": "Watch for live flash drop announcements"},
      {"emoji": "2️⃣", "text": "Grab content packs before time runs out"},
      {"emoji": "3️⃣", "text": "Collect and save to your library"},
      {"emoji": "4️⃣", "text": "Trade up for premium drops!"}
    ]
  }'::jsonb,
  entry_info_section3 = '{
    "title": "Ways to Spend",
    "items": [
      {"emoji": "📦", "text": "Standard drops starting at $5"},
      {"emoji": "💎", "text": "Premium packs ($15+)"},
      {"emoji": "🎁", "text": "Bundle deals for collectors"}
    ]
  }'::jsonb,
  entry_info_pro_tip = 'Set notifications ON to never miss a drop – they sell out fast!'
WHERE room_type = 'flash-drops';
