import { useState, useCallback } from "react";
import { Crown, Search, Heart, Rocket, Trophy, Timer, Lock, MessageSquare, Users } from "lucide-react";

const StreamArea = () => (
  <div className="glass-panel gold-glow flex-1 flex items-center justify-center min-h-[300px] lg:min-h-[500px] relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/40" />
    <div className="relative z-10 text-center">
      <div className="w-12 h-12 border-2 border-dashed border-muted-foreground rounded-full mx-auto mb-3 animate-spin" style={{ animationDuration: '3s' }} />
      <p className="text-muted-foreground text-sm">Waiting for host...</p>
    </div>
  </div>
);

const ProfileCard = ({ name, title, color }: { name: string; title: string; color: "red" | "blue" }) => (
  <div className={`glass-panel p-3 text-center flex-1 ${color === "red" ? "text-neon-red" : ""}`}>
    <p className={`text-xs font-semibold mb-1 ${color === "red" ? "text-neon-red" : "text-accent"}`}>
      <Crown className="inline w-3 h-3 mr-1" />
      {title}
    </p>
    <div className={`w-12 h-12 mx-auto rounded-full border-2 flex items-center justify-center mb-1 ${color === "red" ? "border-neon-red text-neon-red bg-primary/10" : "border-accent bg-accent/10"}`}>
      <Crown className={`w-5 h-5 ${color === "red" ? "text-neon-red" : "text-neon-blue"}`} />
    </div>
    <p className={`text-xs text-foreground ${color === "red" ? "text-neon-red" : "text-neon-blue"}`}>{name}</p>
  </div>
);

const ChatMessage = ({ user, msg, color }: { user: string; msg: string; color: string }) => (
  <div className="flex items-start gap-2 mb-3">
    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold`} style={{ backgroundColor: color }}>
      {user[0]}
    </div>
    <div>
      <p className="text-xs font-semibold" style={{ color }}>{user}</p>
      <p className="text-xs text-muted-foreground">{msg}</p>
    </div>
  </div>
);

const LiveChat = () => (
  <div className="glass-panel p-4 flex flex-col flex-1">
    <h3 className="text-sm font-semibold mb-2 text-foreground">▸ Live Chat Room</h3>
    <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
      <Users className="w-3 h-3" />
      <span>Fans in Room</span>
      <span className="ml-auto glass-panel px-2 py-0.5 text-accent text-[10px]">0 online</span>
    </div>
    <div className="flex-1 overflow-y-auto space-y-1 mb-3">
      <ChatMessage user="User123" msg="Welcome to the game!" color="hsl(40, 80%, 55%)" />
      <ChatMessage user="User456" msg="Can't wait to start!" color="hsl(350, 80%, 60%)" />
      <ChatMessage user="User789" msg="Looking forward to some spicy fun in here!" color="hsl(270, 70%, 60%)" />
    </div>
    <div className="glass-panel flex items-center px-3 py-2">
      <input
        type="text"
        placeholder="Type your message..."
        className="bg-transparent text-xs flex-1 outline-none text-foreground placeholder:text-muted-foreground"
      />
      <Heart className="w-5 h-5 text-secondary cursor-pointer hover:scale-110 transition-transform" />
    </div>
  </div>
);

const ActionButton = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
    <Icon className="w-4 h-4" />
    <span className="text-[10px]">{label}</span>
  </button>
);

const BottleSpinner = () => {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [glowing, setGlowing] = useState(false);

  const spin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    setGlowing(true);
    const extraDeg = 1080 + Math.random() * 2160;
    setRotation((prev) => prev + extraDeg);
    setTimeout(() => {
      setSpinning(false);
      setTimeout(() => setGlowing(false), 600);
    }, 3500);
  }, [spinning]);

  return (
    <div className="glass-panel gold-glow p-4 mt-4 flex flex-col items-center">
      <h3 className="text-sm font-display font-semibold text-foreground mb-3">▸ Spin the Bottle</h3>
      <div
        className="relative w-36 h-36 rounded-full flex items-center justify-center"
        style={{
          background: "radial-gradient(circle, hsla(40,80%,55%,0.08) 0%, transparent 70%)",
          boxShadow: glowing ? "0 0 30px hsla(40,80%,55%,0.3), inset 0 0 20px hsla(40,80%,55%,0.1)" : "none",
          transition: "box-shadow 0.6s ease",
        }}
      >
        {/* Tick marks around the circle */}
        {Array.from({ length: 12 }).map((_, i) => {
          const isLeft = i >= 4 && i <= 8;
          const isRight = i <= 2 || i >= 10;
          const color = isLeft ? "bg-neon-blue/60" : isRight ? "bg-neon-red/60" : "bg-primary/30";
          return (
            <div
              key={i}
              className={`absolute w-0.5 h-2 ${color} rounded-full`}
              style={{
                transform: `rotate(${i * 30}deg) translateY(-62px)`,
              }}
            />
          );
        })}

        {/* Champagne Bottle */}
        <div
          className="absolute w-full h-full flex items-center justify-center"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 3.5s cubic-bezier(0.15, 0.6, 0.15, 1)" : "none",
            filter: spinning ? "drop-shadow(0 0 12px hsla(40,80%,55%,0.6))" : "drop-shadow(0 0 4px hsla(40,80%,55%,0.2))",
          }}
        >
          {/* Foil top */}
          <div className="flex flex-col items-center">
            <div className="w-2 h-1.5 rounded-t-sm bg-primary" />
            {/* Cork / cap */}
            <div className="w-3 h-2 bg-gradient-to-b from-primary to-yellow-600 rounded-t-sm" />
            {/* Neck */}
            <div className="w-2.5 h-8 bg-gradient-to-b from-green-800 via-green-700 to-green-800 rounded-t-sm relative">
              {/* Neck label band */}
              <div className="absolute bottom-1 left-0 right-0 h-2 bg-primary/60 rounded-sm" />
            </div>
            {/* Shoulder */}
            <div
              className="w-6 h-3 bg-gradient-to-b from-green-800 to-green-900"
              style={{ borderRadius: "2px 2px 0 0" }}
            />
            {/* Body */}
            <div className="w-6 h-10 bg-gradient-to-b from-green-900 via-green-800 to-green-950 relative rounded-b-md">
              {/* Label */}
              <div className="absolute inset-x-0.5 top-1 bottom-3 bg-gradient-to-b from-amber-100 to-amber-200 rounded-sm flex items-center justify-center">
                <div className="w-3 h-3 rounded-full border border-primary/60 flex items-center justify-center">
                  <span className="text-[5px] font-bold text-primary">X</span>
                </div>
              </div>
              {/* Bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-green-950 rounded-b-md" />
            </div>
          </div>
        </div>

        {/* Center dot */}
        <div
          className="absolute w-3 h-3 rounded-full z-10"
          style={{
            background: "radial-gradient(circle, hsl(40,80%,65%), hsl(40,80%,45%))",
            boxShadow: "0 0 10px hsla(40,80%,55%,0.6)",
          }}
        />
      </div>
      <button
        onClick={spin}
        disabled={spinning}
        className="glass-panel mt-3 px-6 py-2 text-xs gold-text hover:bg-primary/10 transition-all disabled:opacity-50 active:scale-95"
      >
        {spinning ? "✨ Spinning..." : "🍾 Spin!"}
      </button>
    </div>
  );
};

const TierRow = ({ tier, price, desc, color }: { tier: string; price: string; desc: string; color?: "truth" | "dare" }) => (
  <div className="flex items-baseline justify-between py-1.5 border-b border-border/30 last:border-0">
    <div>
      <span className={`text-sm font-semibold ${color === "truth" ? "text-neon-blue neon-glow-blue" : color === "dare" ? "text-neon-red neon-glow-red" : "gold-text"}`}>{tier}</span>
      <p className="text-[10px] text-muted-foreground">{desc}</p>
    </div>
    <span className="text-sm font-semibold text-foreground">{price}</span>
  </div>
);

const PromptSection = () => (
  <div className="glass-panel gold-glow p-4 h-full">
    <div className="flex items-center gap-2 mb-3">
      <Search className="w-4 h-4 text-muted-foreground" />
      <h3 className="text-sm font-display font-semibold text-foreground">Choose a Prompt</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="border-r border-border/30 pr-4">
        <h4 className="text-xs font-semibold text-neon-blue neon-glow-blue mb-2">System Truths</h4>
        <TierRow tier="Bronze" price="$3" desc="Light & playful" color="truth" />
        <TierRow tier="Silver" price="$5" desc="Very explicit" color="truth" />
        <TierRow tier="Gold" price="$7" desc="Very explicit" color="truth" />
      </div>
      <div className="border-r border-border/30 pr-4">
        <h4 className="text-xs font-semibold text-neon-red neon-glow-red mb-2">System Dares</h4>
        <TierRow tier="Silver" price="$5" desc="Spicy" color="dare" />
        <TierRow tier="Gold" price="$5" desc="Very explicit" color="dare" />
        <TierRow tier="Diamond" price="$7" desc="Very explicit" color="dare" />
      </div>
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Custom Requests (Fan-Written)</h4>
        <div className="flex gap-2 mb-2">
          <button className="glass-panel px-3 py-1.5 text-xs text-neon-blue neon-glow-blue hover:bg-neon-blue/10 transition-colors">Custom Truth ($25)</button>
          <button className="glass-panel px-3 py-1.5 text-xs text-neon-red neon-glow-red hover:bg-neon-red/10 transition-colors">Custom Dare ($35)</button>
        </div>
        <textarea
          placeholder="Write your custom Truth/Dare here..."
          className="w-full bg-muted/30 rounded-md p-2 text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none h-16 border border-border/30"
        />
        <button className="glass-panel w-full mt-2 py-2 text-xs gold-text flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors">
          <MessageSquare className="w-3 h-3" />
          Pay & Submit
        </button>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">Custom requests are direct fan→creator. No auto-approval.</p>
      </div>
    </div>
  </div>
);

const Index = () => {
  return (
    <div
      className="min-h-screen bg-background bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: "url('/images/bed-bg.png')" }}
    >
      <div className="absolute inset-0 bg-background/10" />
      <div className="relative z-10 p-4 lg:p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="gold-text font-display text-sm font-bold">X</span>
            </div>
            <span className="font-display text-sm font-semibold gold-text">PlayGroundX</span>
          </div>
          {/* <h1 className="font-display text-lg md:text-xl font-bold tracking-widest text-foreground uppercase">
            Truth or Dare Room
          </h1> */}
          {/* <img src="/images/logo.png" alt="PlayGroundX Logo" className="h-10 object-contain" /> */}
        </header>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-2">
          {/* Left: Stream + Prompts */}
          <div className="flex flex-col gap-4 flex-1 lg:flex-[2]">
            <StreamArea />
            <PromptSection />
          </div>

   

          {/* 2nd Section */}
           <div className="flex flex-col gap-2 w-full lg:w-[320px]">
              {/* Profiles */}
            <div className="flex gap-3">
              <ProfileCard name="John Doe" title="Truth King" color="blue" />
              <ProfileCard name="John Doe" title="Dare King" color="red" />
            </div>
           
             {/* Action Buttons */}
             <div className="glass-panel p-3 flex justify-around mt-2">
               <ActionButton icon={Rocket} label="Boost Room" />
               <ActionButton icon={Trophy} label="Leaderboard" />
               <ActionButton icon={Timer} label="Extend Timer" />
               <ActionButton icon={Lock} label="Private Session" />
             </div>

             {/* Bottle Spinner */}
             <BottleSpinner />

 {/* Custom Req Section Starts  */}
              <div className="glass-panel gold-glow p-4 h-full mt-10">

    <div className="grid grid-cols-1 md:grid-cols gap-4">

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Group Voting</h4>
        <div className="flex gap-2 mb-2">
          <button className="glass-panel px-3 py-1.5 text-xs text-neon-blue neon-glow-blue hover:bg-neon-blue/10 transition-colors">Custom Truth ($25)</button>
          <button className="glass-panel px-3 py-1.5 text-xs text-neon-red neon-glow-red hover:bg-neon-red/10 transition-colors">Custom Dare ($35)</button>
        </div>
        <textarea
          placeholder="Write your custom Truth/Dare here..."
          className="w-full bg-muted/30 rounded-md p-2 text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none h-16 border border-border/30"
        />
        <button className="glass-panel w-full mt-2 py-2 text-xs gold-text flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors">
          <MessageSquare className="w-3 h-3" />
          Pay & Vote
        </button>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">Custom requests are direct fan→creator. No auto-approval.</p>
      </div>
    </div>
  </div>

 
 {/* Custom Req Section Ends  */}
          </div>

          {/* Right Sidebar */}
          <div className="flex flex-col gap-4 w-full lg:w-[320px]">
            {/* Chat */}
            <LiveChat />
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Index;
