import profileImage from "@/assets/profile-model.jpg";
import { Heart, MessageSquare, Plus, Mail, DollarSign, User } from "lucide-react";

const LeftSidebar = () => {
  return (
    <div className="flex flex-col gap-4 w-[260px] shrink-0 overflow-y-auto pb-4">
      {/* Profile Card */}
      <div className="glass-card overflow-hidden relative">
        <div className="relative">
          <img
            src={profileImage}
            alt="Profile"
            className="w-full h-[220px] object-cover"
          />
          <div className="absolute top-3 left-3 bg-live text-primary-foreground text-xs font-bold px-3 py-1 rounded-md live-pulse">
            LIVE
          </div>
          <div className="absolute bottom-3 left-3 text-foreground text-sm font-medium">
            Fan:37
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="glass-card p-4">
        <h3 className="font-display text-foreground font-semibold text-lg mb-3 border-b border-border pb-2">
          Summary
        </h3>
        <div className="space-y-2 text-sm">
       
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4 text-gold" />
            <span>Fans: <span className="text-gold font-semibold">1,290</span></span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageSquare className="h-4 w-4 text-gold" />
            <span>Confessions: <span className="text-gold font-semibold">1,290</span></span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4 text-gold" />
            <span>Tips: <span className="text-gold font-semibold">€1,290</span></span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4 text-gold" />
            <span>Earned: <span className="text-gold font-semibold">€1,290</span></span>
          </div>
        </div>
      </div>

      {/* Random Request */}
      <div className="glass-card p-4">
        <h3 className="font-display text-foreground font-semibold mb-3">Random Request</h3>
        <button className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-lg text-gold hover:bg-secondary/50 transition-colors">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Confession Wall */}
      <div className="glass-card p-4 flex-1 flex flex-col">
        <h3 className="font-display text-foreground font-semibold mb-3">Confession Wall</h3>
        <div className="flex flex-col gap-3 flex-1">
          <button className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-lg text-gold hover:bg-secondary/50 transition-colors">
            <Plus className="h-5 w-5" />
          </button>
          {/* <button className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-lg text-gold hover:bg-secondary/50 transition-colors">
            <Plus className="h-5 w-5" />
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
