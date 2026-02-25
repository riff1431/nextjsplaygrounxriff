import { useState } from "react";
import { Send, Camera, Heart } from "lucide-react";

interface ChatMessage {
  user: string;
  message: string;
  time: string;
  color: string;
}

const mockMessages: ChatMessage[] = [
  { user: "DiamondKing", message: "You're stunning! 💎", time: "09:01", color: "text-accent" },
  { user: "NightOwl", message: "You're on mon 💜", time: "09:03", color: "text-secondary" },
  { user: "ChampagnePapi", message: "Can I buy you another drink? 🥂💜", time: "09:18", color: "text-primary" },
  { user: "VelvetVibes", message: "Show me that seductive side of you 😏", time: "09:30", color: "text-accent" },
  { user: "GoldenHeart", message: "Sent 50 Tips", time: "09:35", color: "text-primary" },
  { user: "DiamondKing", message: "You're welcome!! 💜", time: "09:05", color: "text-accent" },
  { user: "MoonDancer", message: "Sent 50 Tips", time: "09:01", color: "text-primary" },
  { user: "StarGazer", message: "Soo a beer 🍻", time: "09:04", color: "text-secondary" },
  { user: "NightOwl", message: "Sent 50 Tips", time: "09:06", color: "text-primary" },
];

const LoungeChat = () => {
  const [message, setMessage] = useState("");

  return (
    <div className="glass-panel flex flex-col h-full w-full">
      <h2 className="text-lg font-semibold px-4 pt-4 pb-2 gold-text font-serif">
        Lounge Chat
      </h2>
      
      <div className="flex-1 overflow-y-auto px-4 space-y-3 scrollbar-thin">
        {mockMessages.map((msg, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <div className="flex-1 min-w-0">
              <span className={`font-medium ${msg.color} text-xs`}>{msg.user}</span>
              <span className="text-muted-foreground text-[10px] ml-2">{msg.time}</span>
              <p className="text-foreground/90 text-sm mt-0.5">{msg.message}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <Send className="w-4 h-4 text-primary cursor-pointer hover:text-primary/80 transition-colors" />
        </div>
        <button className="glow-button w-full py-2 rounded-lg text-foreground font-medium text-sm flex items-center justify-center gap-2">
          <Heart className="w-4 h-4" fill="currentColor" />
          Send Tip
        </button>
      </div>
    </div>
  );
};

export default LoungeChat;
