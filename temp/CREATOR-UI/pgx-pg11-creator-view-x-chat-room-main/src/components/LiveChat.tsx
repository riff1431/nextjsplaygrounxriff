import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Settings } from "lucide-react";

const CHAT_MESSAGES = [
  { user: "SarahSmiles", time: "1h ago", msg: "How is great ramin", avatar: "🙂" },
  { user: "PokerKing77", time: "18h ago", msg: "Mees ahoubout 👑 :11", avatar: "😎" },
  { user: "MusicLover123", time: "1h ago", msg: "Time to every new is :5", avatar: "🎵" },
  { user: "GamingGuru", time: "16h ago", msg: "Epic Lure recon mend! 🎰", avatar: "🎮" },
  { user: "LilyLuvs123", time: "1h ago", msg: "So aluch 7 😄 🥰", avatar: "🌸" },
  { user: "MusicLover123", time: "1h ago", msg: "Supen smeshearistt 🤩 🎵", avatar: "🎵" },
  { user: "Jack_G.123", time: "1h ago", msg: "Nberoione! 💕", avatar: "⭐" },
  { user: "TechNerd31", time: "1h ago", msg: "Boosi to 🎉 🎆 💕", avatar: "💻" },
  { user: "DaveyPlays", time: "14h ago", msg: "Fase Econii ✨💕", avatar: "🎲" },
  { user: "DaveyPlays", time: "14h ago", msg: "🎁 😍 🤩", avatar: "🎲" },
];

const EMOJIS = ["🎁", "💕", "😄", "🤩", "💰"];

const LiveChat = () => {
  const [message, setMessage] = useState("");

  return (
    <div className="panel-glass rounded-lg flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-display text-sm tracking-widest gold-text flex items-center gap-2">
          💬 LIVE CHAT
        </h2>
        <div className="flex gap-2 text-muted-foreground">
          <ArrowUp className="w-4 h-4 cursor-pointer hover:text-primary transition-colors" />
          <Settings className="w-4 h-4 cursor-pointer hover:text-primary transition-colors" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-2">
        {CHAT_MESSAGES.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-2 py-1"
          >
            <span className="text-lg flex-shrink-0">{m.avatar}</span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm text-foreground">{m.user}</span>
                <span className="text-xs text-muted-foreground">{m.time}</span>
              </div>
              <p className="text-sm text-foreground/80 break-words">{m.msg}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Send a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 bg-input rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          />
          <button className="bg-success text-success-foreground px-4 py-2 rounded text-sm font-bold tracking-wide hover:opacity-90 transition-opacity">
            SEND
          </button>
        </div>
        {/* <div className="flex gap-3 mt-2 text-xl">
          {EMOJIS.map((e, i) => (
            <button key={i} className="hover:scale-125 transition-transform cursor-pointer">
              {e}
            </button>
          ))}
        </div> */}
      </div>
    </div>
  );
};

export default LiveChat;
