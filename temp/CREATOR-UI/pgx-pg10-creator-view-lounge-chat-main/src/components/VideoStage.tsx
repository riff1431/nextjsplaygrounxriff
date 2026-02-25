import { Heart } from "lucide-react";

const FloatingHeart = ({ delay, left }: { delay: number; left: string }) => (
  <div
    className="absolute text-accent animate-float"
    style={{ animationDelay: `${delay}s`, left, top: "30%" }}
  >
    <Heart className="w-6 h-6" fill="hsl(var(--accent))" />
  </div>
);

const VideoStage = () => {
  return (
    <div className="relative flex flex-col items-center justify-center h-full">
      {/* Floating hearts */}
      <FloatingHeart delay={0} left="10%" />
      <FloatingHeart delay={1} left="25%" />
      <FloatingHeart delay={0.5} left="70%" />
      <FloatingHeart delay={1.5} left="85%" />
      <FloatingHeart delay={2} left="50%" />

      {/* Video frame */}
      <div className="mt-48 gold-border rounded-xl w-[90%] h-[50%] bg-background/30 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-background/90" />
        <p className="text-muted-foreground text-sm z-10">Live Stream</p>
      </div>

      {/* Sparkle effects */}
      <div className="absolute top-4 left-1/2 w-2 h-2 rounded-full bg-primary animate-sparkle" />
      <div className="absolute top-8 left-1/3 w-1.5 h-1.5 rounded-full bg-accent animate-sparkle" style={{ animationDelay: "0.5s" }} />
      <div className="absolute bottom-12 right-1/3 w-1 h-1 rounded-full bg-primary animate-sparkle" style={{ animationDelay: "1s" }} />
    </div>
  );
};

export default VideoStage;
