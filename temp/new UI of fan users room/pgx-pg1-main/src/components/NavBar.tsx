import { Heart, ArrowLeft, Plus, Users, Menu, Coins } from "lucide-react";

const NavBar = () => {
  return (
    <nav className="flex items-center justify-between px-4 py-3 border-b border-border">
      <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center gap-2">
        <Heart className="w-6 h-6 text-primary fill-primary" />
        <h1 className="font-display text-xl font-bold tracking-wider neon-text">
          Confessions <span className="gold-text">X</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-sm font-medium">
          <Coins className="w-4 h-4 text-gold" />
          <span className="gold-text font-semibold">$100</span>
          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-sm">
          <Users className="w-4 h-4 text-muted-foreground" />
          Requests
        </button>
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
