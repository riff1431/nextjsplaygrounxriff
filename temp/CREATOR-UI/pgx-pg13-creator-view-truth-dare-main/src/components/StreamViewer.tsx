import { Wifi } from "lucide-react";
import bgImage from "@/assets/background.jpeg";

const StreamViewer = () => (
  <div className="relative rounded-xl overflow-hidden neon-border-pink glow-pink h-full">
    <img
      src={bgImage}
      alt="Live stream"
      className="w-full h-full object-cover"
    />
    {/* LIVE badge */}
    <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-destructive/90 px-3 py-1 rounded-md">
      <div className="w-2 h-2 rounded-full bg-foreground animate-pulse-glow" />
      <span className="text-foreground font-bold text-sm">LIVE</span>
    </div>
    {/* Viewer count */}
    <div className="absolute top-4 right-4 flex items-center gap-1.5 panel-bg px-3 py-1 rounded-md">
      <Wifi className="w-4 h-4 text-neon-green" />
      <span className="text-foreground font-semibold text-sm">4,532</span>
    </div>
  </div>
);

export default StreamViewer;
