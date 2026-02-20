import loungeBg from "@/assets/lounge-bg.png";
import DrinkMenu from "@/components/DrinkMenu";
import LoungeChat from "@/components/LoungeChat";
import CreatorStream from "@/components/CreatorStream";

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background image */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${loungeBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Dark overlay */}
      <div className="fixed inset-0 z-0 bg-background/60" />

      {/* Sparkle particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="fixed w-1 h-1 rounded-full bg-gold animate-sparkle z-10 pointer-events-none"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-20 min-h-screen p-4 lg:p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[320px_1fr_350px] gap-4 lg:gap-6 lg:h-[calc(100vh-3rem)]">
          {/* Left panel - Drink Menu */}
          <div className="order-2 lg:order-1 overflow-y-auto">
            <DrinkMenu />
          </div>

          {/* Center - Creator Stream + Tips */}
          <div className="order-1 lg:order-2 flex flex-col">
            <CreatorStream />
            <div className="mt-0 border border-border/20 rounded-xl p-4 pt-0 space-y-4 px-16">
              <h3 className="font-display text-lg font-bold text-foreground text-center">Tips</h3>
              <div className="flex gap-4">
                {[10, 25, 50].map((amount) => (
                  <button key={amount} className="tip-btn flex-1 text-sm">${amount}</button>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="tip-btn flex-1 flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">Custom</span>
                  <span className="text-gold">$</span>
                </div>
                <button className="btn-gold rounded-lg px-4 py-2 flex-1 text-sm">Tip Now</button>
              </div>
            </div>
          </div>

          {/* Right panel - Lounge Chat */}
          <div className="order-3 lg:order-3">
            <LoungeChat />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
