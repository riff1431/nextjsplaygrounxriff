import nightclubBg from "@/assets/nightclub-bg.png";
import LiveDropBoard from "@/components/LiveDropBoard";
import ImpulsePanel from "@/components/ImpulsePanel";

const bundles = [
  { name: "Weekend Bundle", subtitle: "3 drops + 1 DM", price: 500 },
  { name: "Backstage Bundle", subtitle: "5 drops + Vault preview", price: 1000 },
  { name: "Whale Bundle", subtitle: "All drops + today priority", price: 2500 },
];

const tickerItems = [
  "🔥 VAULT DROP LIVE NOW",
  "💎 Diamond Patron unlocked",
  "⚡ New flash drop in 3 minutes",
  "🌟 Lux Dungeon Preview RARE",
  "💰 Whale Bundle — 2 slots left",
  "🎁 Golden Key access — limited",
  "🔥 VAULT DROP LIVE NOW",
  "💎 Diamond Patron unlocked",
  "⚡ New flash drop in 3 minutes",
  "🌟 Lux Dungeon Preview RARE",
  "💰 Whale Bundle — 2 slots left",
  "🎁 Golden Key access — limited",
];

export default function Index() {
  return (
    <div className="relative h-screen overflow-hidden font-body">
      {/* Background image */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${nightclubBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Subtle dark overlay — reduced opacity so bg shows */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(270 60% 4% / 0.45) 0%, hsl(270 50% 6% / 0.30) 50%, hsl(270 60% 4% / 0.45) 100%)",
        }}
      />

      {/* Ambient neon glow orb */}
      <div
        className="fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle, hsl(330 100% 55% / 0.06) 0%, transparent 70%)",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Top ticker bar */}
        <div className="bg-black/20 border-b border-primary/20 overflow-hidden py-1">
          <div className="ticker-content inline-flex gap-12 text-xs font-tech text-primary/80">
            {tickerItems.map((item, i) => (
              <span key={i} className="shrink-0">{item}</span>
            ))}
          </div>
        </div>

        {/* Header */}
        <header className="relative flex items-center justify-between px-5 py-1.5 border-b border-primary/20">
          <button
            className="flex items-center gap-2 px-3 py-1 rounded-full border border-primary/50 text-foreground/80 font-body font-semibold text-sm hover:border-primary hover:text-foreground transition-all"
            style={{ boxShadow: "0 0 10px hsl(330 100% 55% / 0.2)" }}
          >
            ‹ Back
          </button>

          <h1
          className="text-4xl absolute left-1/4 -translate-x-1/2"
            style={{
              fontFamily: "cursive",
              color: "hsl(330 100% 70%)",
              textShadow:
                "0 0 10px hsl(330 100% 65% / 0.9), 0 0 30px hsl(330 100% 65% / 0.7), 0 0 60px hsl(330 100% 65% / 0.5)",
            }}
          >
            Flash Drops
          </h1>

          <div className="flex items-center gap-2 text-xs font-tech text-primary/60">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            LIVE
          </div>
        </header>

        {/* Main 3-column layout */}
        <main className="flex-1 grid grid-cols-[340px_1fr_320px] gap-2 px-80 py-2 overflow-hidden">
          {/* Left: Live Drop Board */}
          <div className="overflow-hidden min-h-0">
            <LiveDropBoard />
          </div>

          {/* Center: Stage area */}
          <div className="flex items-start justify-center pt-3">
            {/* <div
              className="font-tech text-xs font-bold tracking-widest"
              style={{
                color: "hsl(330 100% 65%)",
                textShadow: "0 0 10px hsl(330 100% 65% / 0.9), 0 0 25px hsl(330 100% 65% / 0.6)",
              }}
            >
              VIP LOUNGE
            </div> */}
          </div>

          {/* Right: Impulse Panel */}
          <div className="overflow-y-auto overflow-x-hidden min-h-0">
            <ImpulsePanel />
          </div>
        </main>

        {/* Bottom bundle bar */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-center gap-0 rounded-xl overflow-hidden neon-border-md max-w-2xl mx-auto">
            {bundles.map((bundle, i) => (
              <div key={bundle.name} className="flex-1 flex flex-col items-center gap-0.5 px-4 py-2 relative">
                {i < bundles.length - 1 && (
                  <div className="absolute right-0 top-2 bottom-2 w-px bg-primary/30" />
                )}
                <div
                  className="font-display text-lg"
                  style={{
                    color: "hsl(330 100% 75%)",
                    textShadow: "0 0 10px hsl(330 100% 70% / 0.8), 0 0 25px hsl(330 100% 70% / 0.5)",
                  }}
                >
                  {bundle.name}
                </div>
                <div className="font-body text-xs text-foreground/60">{bundle.subtitle}</div>
                <button
                  className="mt-1 px-6 py-1 rounded font-tech font-bold text-sm text-white transition-all hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, hsl(330 80% 35%), hsl(330 100% 50%))`,
                    boxShadow: "0 0 15px hsl(330 100% 55% / 0.4), 0 0 30px hsl(330 100% 55% / 0.2)",
                  }}
                >
                  Buy · ${bundle.price.toLocaleString()}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
