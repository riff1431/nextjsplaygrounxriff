
export type CreatorCard = {
    id: string;
    userId: string;
    name: string;
    level: "Rookie" | "Rising" | "Star" | "Elite";
    tags: string[];
    avatar_url: string;
    cover_url?: string;
    bio: string;
};

export const activeCreators: CreatorCard[] = [
    {
        id: "c1",
        userId: "u1",
        name: "NeonNyla",
        level: "Elite",
        tags: ["Truth or Dare", "Bar Lounge", "X Chat"],
        bio: "Live Truth or Dare sessions, Bar Lounge hangouts, and interactive X Chat rooms. Fans decide the vibe.",
        avatar_url: "/creators/creator-1.jpg"
    },
    {
        id: "c2",
        userId: "u2",
        name: "LunaVibe",
        level: "Star",
        tags: ["Confessions", "Chat"], // Shortened tags for badging
        bio: "Confessions, late-night chats, and live reactions. Some stories surprise even me.",
        avatar_url: "/creators/creator-2.jpg"
    },
    {
        id: "c3",
        userId: "u3",
        name: "AvaPulse",
        level: "Rising",
        tags: ["X Chat", "Live"],
        bio: "High-energy X Chat rooms and live audience interaction. Stay active, stay involved.",
        avatar_url: "/creators/creator-3.jpg"
    },
    {
        id: "c4",
        userId: "u4",
        name: "ScarlettRay",
        level: "Elite",
        tags: ["Bar Lounge", "Premium"],
        bio: "Bar Lounge vibes, live conversations, and premium fan interaction.",
        avatar_url: "/creators/creator-4.jpg"
    },
    {
        id: "c5",
        userId: "u5",
        name: "MiaNova",
        level: "Star",
        tags: ["Truth or Dare", "Confessions"],
        bio: "Truth or Dare challenges and Confessions rooms driven by fan participation.",
        avatar_url: "/creators/creator-5.jpg"
    },
    {
        id: "c6",
        userId: "u6",
        name: "JadeLux",
        level: "Elite",
        tags: ["Suga 4 U", "VIP"],
        bio: "Luxury Suga 4U sessions, exclusive gifting, and VIP connections.",
        avatar_url: "/creators/creator-6.jpg"
    },
    {
        id: "c7",
        userId: "u7",
        name: "SiennaFlow",
        level: "Rising",
        tags: ["Bar Lounge", "Hangouts"],
        bio: "Relaxed Bar Lounge chats, fan interaction, and live hangouts.",
        avatar_url: "/creators/creator-7.jpg"
    },
    {
        id: "c8",
        userId: "u8",
        name: "AriaBliss",
        level: "Star",
        tags: ["Confessions", "Storytelling"],
        bio: "Confessions, reactions, and audience-led storytelling.",
        avatar_url: "/creators/creator-8.jpg"
    },
    {
        id: "c9",
        userId: "u9",
        name: "VioletX",
        level: "Rising",
        tags: ["X Chat", "Real-time"],
        bio: "Live X Chat rooms with real-time engagement and top supporter interaction.",
        avatar_url: "/creators/creator-9.jpg"
    },
    {
        id: "c10",
        userId: "u10",
        name: "NovaBelle",
        level: "Star",
        tags: ["Truth or Dare", "Interactive"],
        bio: "Truth or Dare rooms where fans shape the outcome.",
        avatar_url: "/creators/creator-10.jpg"
    },
    {
        id: "c11",
        userId: "u11",
        name: "KiraMoon",
        level: "Rising",
        tags: ["Confessions", "Late-night"],
        bio: "Late-night Confessions and premium reactions.",
        avatar_url: "/creators/creator-11.jpg"
    },
    {
        id: "c12",
        userId: "u12",
        name: "LexiSpark",
        level: "Rookie",
        tags: ["X Chat", "Tipping"],
        bio: "Fast-moving X Chat rooms with live tipping and pinned messages.",
        avatar_url: "/creators/creator-12.jpg"
    },
    {
        id: "c13",
        userId: "u13",
        name: "ZaraWave",
        level: "Star",
        tags: ["Bar Lounge", "Interactive"],
        bio: "Bar Lounge hangouts and interactive fan conversations.",
        avatar_url: "/creators/creator-13.jpg"
    },
    {
        id: "c14",
        userId: "u14",
        name: "RubyVixen",
        level: "Elite",
        tags: ["Truth or Dare", "Voting"],
        bio: "Truth or Dare challenges and live audience votes.",
        avatar_url: "/creators/creator-14.jpg"
    },
    {
        id: "c15",
        userId: "u15",
        name: "NinaGlow",
        level: "Rising",
        tags: ["Confessions", "Trending"],
        bio: "Confessions, trending stories, and fan-driven reactions.",
        avatar_url: "/creators/creator-15.jpg"
    },
    {
        id: "c16",
        userId: "u16",
        name: "IvyFame",
        level: "Star",
        tags: ["Competitions", "Voting"],
        bio: "Competitions, live rankings, and fan voting.",
        avatar_url: "/creators/creator-16.jpg"
    },
    {
        id: "c17",
        userId: "u17",
        name: "TaliaXO",
        level: "Elite",
        tags: ["Confessions", "VIP"],
        bio: "Confessions and live reactions with VIP unlocks.",
        avatar_url: "/creators/creator-17.jpg"
    },
    {
        id: "c18",
        userId: "u18",
        name: "RoxyLuxe",
        level: "Elite",
        tags: ["Suga 4 U", "Priority"],
        bio: "Suga 4U rooms, luxury gifting, and priority access.",
        avatar_url: "/creators/creator-18.jpg"
    },
    {
        id: "c19",
        userId: "u19",
        name: "MattStar",
        level: "Star",
        tags: ["Competitions", "Influence"],
        bio: "Competitions, audience voting, and live fan influence.",
        avatar_url: "/creators/creator-19.jpg"
    },
    {
        id: "c20",
        userId: "u20",
        name: "NoahVibe",
        level: "Rising",
        tags: ["Bar Lounge", "Confessions"],
        bio: "Bar Lounge chats, Confessions, and interactive live rooms.",
        avatar_url: "/creators/creator-20.jpg"
    }
];
