import { Wine, Crown, Sparkles, Heart } from "lucide-react";

const drinkMenu = [
  { name: "VIP Bottle", price: 550, icon: "🍾" },
  { name: "Champagne", price: 250, icon: "🥂" },
  { name: "69 Bar Shot", price: 50, icon: "♋" },
  { name: "Blowjob Shot", price: 50, icon: "😮‍💨" },
  { name: "Pornstar Shot", price: 50, icon: "🌟" },
  { name: "Quickie Shot", price: 50, icon: "⏱️" },
  { name: "Liquid Lust Shot", price: 50, icon: "❤️‍🔥" },
  { name: "Cream & Scream Shot", price: 50, icon: "🍦" },
  { name: "Temptation Shot", price: 50, icon: "🍎" },
  { name: "Devil's Kiss Shot", price: 50, icon: "💋" },
  { name: "Sweet Sin Shot", price: 50, icon: "😈" },
  // { name: "TequilaX Bottle", price: 200, icon: "🍸" },
  // { name: "VodkaX Bottle", price: 150, icon: "🍹" },
  // { name: "TequilaX Shot", price: 55, icon: "🥃" },
  // { name: "HennyX Shot", price: 50, icon: "🥃" },
  // { name: "Margarita", price: 30, icon: "🍹" },
  { name: "Sex on Beach", price: 50, icon: "🏖️" },
];

const DrinkMenu = () => {
  return (
    <div className="p-4 flex flex-col h-full border border-border/20 rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <Wine className="w-5 h-3 text-neon-purple animate-glow-pulse" />
        <h2 className="font-display text-xl font-bold glow-text-gold text-gold">
          Buy a Drink
        </h2>
      </div>
      <p className="text-muted-foreground text-sm">for [CreatorName]</p>

      <div className="border-t border-border/30 pt-2">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 tracking-wider uppercase">
          Drink Menu
        </h3>
        <div className="space-y-0">
          {drinkMenu.map((drink) => (
            <div key={drink.name} className="drink-item">
              <div className="flex items-center gap-2">
                <span className="text-lg">{drink.icon}</span>
                <span className="text-foreground font-medium text-sm">{drink.name}</span>
              </div>
              <span className="text-gold font-semibold">${drink.price}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border/30 pt-3 space-y-2">
        <h3 className="font-display text-lg font-bold text-foreground text-center">VIP Lounge</h3>
        <div className="glass-panel p-3 glow-gold space-y-2">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold animate-glow-pulse" />
            <span className="font-bold text-gold glow-text-gold">Upgrade to VIP - $150</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 ml-7">
            <li className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-neon-pink" /> Exclusive Content</li>
          </ul>
        </div>

        <div className="glass-panel p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛋️</span>
            <div>
              <span className="font-bold text-foreground text-sm">Reserve a Booth</span>
              <span className="text-gold font-bold ml-2">$300</span>
              <p className="text-xs text-muted-foreground">🎉 Private (5 mins)</p>
            </div>
          </div>
        </div>
      </div>

      {/* <div className="border-t border-border/30 pt-3 space-y-2">
        <div className="glass-panel p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📌</span>
            <div>
              <span className="font-bold text-foreground text-sm">Pin My Name</span>
              <span className="text-gold font-bold ml-2">$25</span>
              <p className="text-xs text-muted-foreground">📍 Pinned (10 mins)</p>
            </div>
          </div>
        </div>
      </div> */}

    </div>
  );
};

export default DrinkMenu;
