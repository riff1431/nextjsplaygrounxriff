import { Heart, Send, Smile } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

const messages = [
  { user: "SugaFan17", avatar: "🌸", text: "Hello beautiful! 💕✨", tip: null },
  { user: "LoveStruck23", avatar: "💜", text: "You look amazing!", tip: null },
  { user: "HottieHunter", avatar: "🔥", text: "Hey Suga! Hope you're having a great day! 🌹", tip: null },
  { user: "Candy4U", avatar: "🍬", text: "Hey Suga! 🥰 🎁", tip: "€50" },
  { user: "DreamyNight", avatar: "🌙", text: "Just dropped by to say hi! 💫", tip: null },
  { user: "RoseQueen", avatar: "🌹", text: "Love the vibe tonight!", tip: "€25" },
  { user: "SweetTalker", avatar: "🍯", text: "You're absolutely glowing 🔥", tip: null },
  { user: "GoldenBoy", avatar: "⭐", text: "Can't stop watching! 💛", tip: "€100" },
  { user: "MidnightRider", avatar: "🌃", text: "What's the song playing?", tip: null },
  { user: "CherryPop", avatar: "🍒", text: "Sending love your way! 💋", tip: "€30" },
  { user: "BlueVelvet", avatar: "💎", text: "You deserve the world 🌍", tip: null },
  { user: "StarlightX", avatar: "✨", text: "First time here, already a fan!", tip: "€15" },
];

const LiveChat = () => {
  const [input, setInput] = useState("");

  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <h3 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
        <Heart className="w-4 h-4 text-primary fill-primary" />
        Live Chat
      </h3>
      <ScrollArea className="flex-1 pr-1 mb-3">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xl">{msg.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">{msg.user}</span>
                  {msg.tip && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
                      {msg.tip}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/80 break-words">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex gap-2 items-center">
        <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter message"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <Smile className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/80 transition-colors">
          Send
        </button>
      </div>
    </div>
  );
};

export default LiveChat;
