"use client";

import { Crown, Send } from "lucide-react";

const chatMessages = [
  { user: "Buzzed_Boi", avatar: "🧑", msg: "bought a Champagne 🍾", amount: "$25", isVip: false },
  { user: "ShadowHeart", avatar: "👤", msg: "upgraded to VIP Lounge - 4", amount: "", isVip: true },
  { user: "Buzzed_Boi", avatar: "🧑", msg: "Cheers!", amount: "$25", isVip: false },
  { user: "BlurredFan1", avatar: "😎", msg: "VIP here we go 🎉🥂", amount: "", isVip: true },
  { user: "GlimmerBabe", avatar: "💃", msg: "Love this place!", amount: "", isVip: false },
  { user: "Buzzed_Boi", avatar: "🧑", msg: "Cheers! 🍾", amount: "", isVip: false },
  { user: "VIPFan1", avatar: "🤴", msg: "VIP here! 👑", amount: "", isVip: true },
  { user: "StarDrinker", avatar: "⭐", msg: "VIP here we go ✨", amount: "", isVip: false },
  // { user: "GlimmerBabe", avatar: "💃", msg: "Love this place! 🥂", amount: "", isVip: false },
  // { user: "BlurredFan1", avatar: "😎", msg: "VIP here we go 🎉🥂", amount: "", isVip: true },
  // { user: "GlimmerBabe", avatar: "💃", msg: "Love this place!", amount: "", isVip: false },
  // { user: "Buzzed_Boi", avatar: "🧑", msg: "Cheers! 🍾", amount: "", isVip: false },
  { user: "VIPFan1", avatar: "🤴", msg: "VIP here! 👑", amount: "", isVip: true },
];

const LoungeChat = () => {
  return (
    <div className="pb-28 p-4 flex flex-col h-full border border-border/20 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-xl font-bold glow-text-gold text-gold">
          Lounge Chat
        </h2>
        <span className="live-badge">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-glow-pulse" />
          Live
        </span>
      </div>

      {/* Pin Input area moved to top */}
      <div className="chat-message glow-pink flex items-center gap-2 mb-2 p-2 rounded-lg border border-neon-pink/30 bg-neon-pink/5">
        <span className="text-lg">🔥</span>
        <span className="text-sm font-bold text-neon-pink animate-neon-flicker">
          PIN NAME TO TOP 10 mins
        </span>
        <span className="text-gold font-bold ml-auto">+$25</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin mb-3">
        {chatMessages.map((msg, i) => (
          <div key={i} className="chat-message flex items-start gap-2">
            <span className="text-lg shrink-0">{msg.avatar}</span>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm text-foreground">{msg.user}</span>
              {msg.isVip && (
                <Crown className="w-3 h-3 text-gold inline ml-1 mb-0.5" />
              )}
              <span className="text-sm text-muted-foreground ml-1">{msg.msg}</span>
            </div>
            {msg.amount && (
              <span className="text-gold font-semibold text-sm shrink-0">{msg.amount}</span>
            )}
          </div>
        ))}


      </div>


      <div className="flex gap-2">

        <input
          type="text"
          placeholder="Send a message..."
          className="flex-1 rounded-lg px-3 py-2 text-sm bg-muted/30 border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
        <button className="btn-glow rounded-lg px-4 py-2 text-sm font-bold text-foreground flex items-center gap-1">
          SEND
        </button>
      </div>
    </div>
  );
};

export default LoungeChat;
