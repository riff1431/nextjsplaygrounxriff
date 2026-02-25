import { Crown, Lock } from "lucide-react";
import { useState } from "react";

export const SubscriptionSettings = () => {
  const [weekly, setWeekly] = useState("");
  const [monthly, setMonthly] = useState("");

  return (
    <div className="glass-card p-5">
      <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
        <Crown size={20} className="text-neon-yellow" /> Subscription Settings
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Set your subscription prices. Fans can subscribe to unlock access to all your paid content. Leave blank to disable a tier.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-sm font-medium mb-1.5 block">Weekly Price ($)</label>
          <div className="flex items-center bg-input/60 border border-border rounded-lg px-3 py-2.5">
            <span className="text-muted-foreground mr-2">$</span>
            <input
              type="text"
              placeholder="e.g. 4.99"
              value={weekly}
              onChange={(e) => setWeekly(e.target.value)}
              className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex-1 w-full">
          <label className="text-sm font-medium mb-1.5 block">Monthly Price ($)</label>
          <div className="flex items-center bg-input/60 border border-border rounded-lg px-3 py-2.5">
            <span className="text-muted-foreground mr-2">$</span>
            <input
              type="text"
              placeholder="e.g. 14.99"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <button className="neon-glow-green bg-accent text-accent-foreground font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2 hover:brightness-110 transition-all whitespace-nowrap">
          <Lock size={16} /> Save Changes
        </button>
      </div>
    </div>
  );
};
