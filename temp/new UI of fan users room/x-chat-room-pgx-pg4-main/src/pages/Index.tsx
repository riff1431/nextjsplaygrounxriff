import { ArrowLeft } from "lucide-react";
import casinoBg from "@/assets/casino-bg.jpeg";
import CreatorCard from "@/components/CreatorCard";
import ChatPanel from "@/components/ChatPanel";
import PaidReactions from "@/components/PaidReactions";

const Index = () => {
  return (
    <div
      className="min-h-screen bg-background bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: `url(${casinoBg})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-background/10" />

      {/* Content */}
      <div className="relative z-10 max-w-8xl mx-auto p-4 px-40">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-8">
            <button className="glass-card px-4 py-2 text-foreground hover:text-gold transition-colors flex items-center gap-2 text-sm">
              <ArrowLeft size={16} />
              Back
            </button>
            <h1 className="font-display text-2xl md:text-3xl text-gold-gradient">
              X Chat Room
            </h1>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-foreground text-sm">
              Host – <span className="text-gold-light">BlueMuse</span>
            </p>
            <p className="text-foreground text-sm">
              Creator – <span className="text-gold-light">EllaRose_XXX</span>
            </p>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-60">
          {/* Left: Live Chat + Reactions */}
          <div className="lg:col-span-2 space-y-2">
            {/* Live X Chat */}
            <div className="glass-card p-4">
              <h2 className="font-display text-gold text-base mb-4">Live X Chat</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CreatorCard username="BlueMuse" tier="Rising" />
                <CreatorCard username="EllaRose_XXX" tier="Popular" price="$2/min metered" />
              </div>
            </div>

            {/* Paid sections */}
            <PaidReactions />
          </div>

          {/* Right: Chat panel */}
          <div className="lg:col-span-1">
            <ChatPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
