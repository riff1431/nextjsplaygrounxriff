import { Heart, DollarSign, ArrowLeft } from "lucide-react";

const TopBar = () => {
  return (
    <div className="flex items-center justify-between px-6 py-3">
      <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-5 w-5" />
        <span className="font-medium">Back</span>
      </button>
      <h1 className="font-pacifico pl-40 text-4xl text-foreground tracking-wide">Confession Room</h1>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary fill-primary" />
          <span className="text-foreground font-medium">Fans.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-foreground font-semibold text-lg">33</span>
          <span className="text-muted-foreground">Confessions.</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-gold" />
          <span className="text-gold font-bold text-xl">$1,290</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
