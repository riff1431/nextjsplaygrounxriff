import { Heart, Search, Send } from "lucide-react";
import { useState } from "react";

const messages = [
  { user: "KittyKat 💕", text: "Hey cuties! 😘😘", color: "text-neon-pink" },
  { user: "Alex99", text: "Truth or dare?! Spin the bottle!", color: "text-neon-blue" },
  { user: "GamerBro Tips5", text: "$5 xcool! Deaks!", color: "text-neon-yellow" },
  { user: "MaxPower", text: "Dare King is unbeatable tonight!🤴", color: "text-neon-green" },
  { user: "CoolDude 🎭", text: "Spin the bottle! 🎉🍾", color: "text-foreground" },
  { user: "Emma45 🦋", text: "I dare you to do something crazy!", color: "text-neon-pink" },
];

const LiveChat = () => {
  const [msg, setMsg] = useState("");

  return (
    <div className="panel-bg rounded-xl neon-border-blue p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-neon-yellow text-sm">✕</span>
          <h3 className="font-bold text-foreground">Live Chat</h3>
        </div>
        <div className="flex items-center gap-1.5 text-neon-pink">
          <Heart className="w-4 h-4 fill-current" />
          <span className="font-semibold text-sm">4,532</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-primary to-secondary rounded-full" />
            </div>
            <div>
              <span className={`font-bold text-sm ${m.color}`}>{m.user}</span>
              <p className="text-sm text-muted-foreground">{m.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
        <input
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          placeholder="Send a message..."
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <Search className="w-4 h-4 text-muted-foreground cursor-pointer" />
        <Send className="w-4 h-4 text-neon-blue cursor-pointer" />
      </div>
    </div>
  );
};

export default LiveChat;
