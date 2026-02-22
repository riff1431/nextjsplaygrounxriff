import { Heart, Send } from "lucide-react";

const messages = [
  { user: "Jessica", emoji: "💖", text: "tipped $50!", highlight: true },
  { user: "Mike_Daddy", emoji: "😎", text: "She's stunning!" },
  { user: "QueenB", emoji: "👑", text: "Can you say my name? $20", highlight: true },
  { user: "Steven", emoji: "", text: "sent Luxury Bag 👜", highlight: true },
  { user: "EmilyR", emoji: "🔥", text: "That body! 💕" },
  { user: "Alex King", emoji: "", text: "Sponsor Room 💎", highlight: true },
  { user: "Rose✨", emoji: "😂", text: "Take my money!" },
  { user: "Diamond_Jay", emoji: "💰", text: "Just sent $200! Keep going queen 👑", highlight: true },
  { user: "LuxLife", emoji: "🥂", text: "Best stream tonight!" },
  { user: "Kingpin", emoji: "🔥", text: "VIP access when? 💎", highlight: false },
  { user: "SugarRush", emoji: "🍬", text: "tipped $75!", highlight: true },
  { user: "Bella_V", emoji: "💋", text: "Love the vibes tonight ✨" },
  { user: "ChampagnePapi", emoji: "🍾", text: "sent Diamond Ring 💍", highlight: true },
  { user: "MrGenerous", emoji: "💸", text: "Sponsor Room unlocked! 🎉", highlight: true },
  { user: "NightOwl", emoji: "🦉", text: "Can't stop watching 😍" },
  { user: "GoldMember", emoji: "🏆", text: "tipped $100!", highlight: true },
  { user: "StarGazer", emoji: "⭐", text: "You're glowing tonight!" },
  { user: "BigSpender", emoji: "💎", text: "Private show request! $500", highlight: true },
];

const LiveChat = () => (
  <div className="glass-panel flex flex-col h-full bg-transparent border-gold/20">
    <div className="flex items-center justify-center p-3 border-b border-gold/20">
      <div className="h-px flex-1 bg-gold/30" />
      <span className="section-title px-3">Live Chat</span>
      <div className="h-px flex-1 bg-gold/30" />
    </div>

    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
      {messages.map((m, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <div className="w-6 h-6 rounded-full bg-muted/30 flex-shrink-0 flex items-center justify-center">
            <span className="text-xs">{m.emoji || "👤"}</span>
          </div>
          <p className="leading-snug">
            <span className={`font-bold ${m.highlight ? "text-gold" : "text-pink-light"}`}>{m.user}:</span>{" "}
            <span className="text-foreground/80">{m.text}</span>
            {m.highlight && <Heart className="inline w-3 h-3 text-pink fill-pink ml-1" />}
          </p>
        </div>
      ))}
    </div>

    <div className="p-3 border-t border-gold/20 flex gap-2">
      <input
        type="text"
        placeholder="Type a message..."
        className="flex-1 bg-muted/30 rounded-full px-4 py-2 text-sm outline-none border border-gold/20 focus:border-pink/50 transition-colors"
      />
      <button className="btn-pink w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
        <Send className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export default LiveChat;
