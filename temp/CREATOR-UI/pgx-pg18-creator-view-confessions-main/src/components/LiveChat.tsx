import { useState } from "react";
import { Send, Heart, Star, DollarSign } from "lucide-react";

interface ChatMessage {
  id: number;
  user: string;
  message: string;
  time: string;
  emoji?: string;
  color?: string;
}

const chatMessages: ChatMessage[] = [
  { id: 1, user: "Mike92", message: "Gorgeous, you look amazing tonight!", time: "1:00", emoji: "💜" },
  { id: 2, user: "JamesLover", message: "How do I submit a confession?", time: "2:00", emoji: "💜" },
  { id: 3, user: "David89", message: "That outfit is doing things to m...", time: "1:00", emoji: "🌸" },
  { id: 4, user: "Max87", message: "Hey, can I share a secret confession?", time: "1:00", emoji: "💜" },
  { id: 5, user: "SamathaLove", message: "You're looking so hott 🔥", time: "1:00", emoji: "💜" },
  { id: 6, user: "Frank_H85", message: "Any confessions that surprised you tonight?", time: "1:00", emoji: "⭐" },
  { id: 7, user: "SeedLover", message: "Sent you a tip! You're so stunning ❤️", time: "1:00", emoji: "💰", color: "gold" },
];

const LiveChat = () => {
  const [message, setMessage] = useState("");

  return (
    <div className="glass-card-strong flex flex-col w-[400px] shrink-0 h-full pb-2">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-display text-foreground text-lg font-semibold mb-3">Live Chat</h2>
        {/* <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fans:</span>
            <span className="text-foreground font-semibold">6,382</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Confessions:</span>
            <span className="text-foreground font-semibold">23</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tips:</span>
            <span className="text-gold font-semibold">€1,290</span>
          </div>
        </div> */}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.map((msg) => (
          <div key={msg.id} className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-secondary shrink-0 flex items-center justify-center text-xs text-muted-foreground">
              {msg.user.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-foreground text-sm font-medium truncate">{msg.user}</span>
                <span className="text-xs">{msg.emoji}</span>
                <span className="text-muted-foreground text-xs ml-auto shrink-0">{msg.time}</span>
              </div>
              <p className="text-muted-foreground text-xs mt-0.5">{msg.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button className="bg-primary hover:bg-primary/80 text-primary-foreground px-3 py-2 rounded-lg transition-colors">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveChat;
