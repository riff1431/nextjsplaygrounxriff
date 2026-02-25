import { Heart, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const DashboardHeader = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel px-6 py-3 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-lg bg-muted/50 border border-border flex items-center justify-center hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary/30 border-2 border-primary flex items-center justify-center">
          <span className="text-lg">🌸</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Suga <span className="text-primary">4U</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-bold hover:bg-primary/80 transition-colors">
          Start Session
        </button>
        <button className="bg-muted/50 text-foreground px-5 py-2 rounded-lg text-sm font-bold border border-border hover:bg-muted transition-colors">
          Stop Session
        </button>
      </div>

      <h2 className="font-display text-xl font-bold text-foreground">
        PlayGround<span className="text-primary">X</span>
      </h2>
    </motion.header>
  );
};

export default DashboardHeader;
