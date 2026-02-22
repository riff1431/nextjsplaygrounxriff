import { Heart } from "lucide-react";
import creatorPhoto from "@/assets/creator-photo.jpeg";

const CreatorStream = () => {
  return (
    <div className="relative flex items-center justify-center h-full top-52">
      <div className="relative glass-panel glow-purple overflow-hidden rounded-xl max-w-md w-full">
        <img
          src={creatorPhoto}
          alt="Creator"
          className="w-full object-cover rounded-xl top-50"
        />
        {/* Floating hearts */}
        <div className="absolute top-10 right-4 animate-float">
          <Heart className="w-10 h-10 text-neon-pink fill-neon-pink/50 animate-glow-pulse drop-shadow-[0_0_10px_hsla(320,100%,65%,0.6)]" />
        </div>
        <div className="absolute top-12 right-16 animate-float" style={{ animationDelay: "1s" }}>
          <Heart className="w-6 h-6 text-neon-pink fill-neon-pink/30 animate-glow-pulse drop-shadow-[0_0_8px_hsla(320,100%,65%,0.4)]" />
        </div>

        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/80 to-transparent" />
      </div>
    </div>
  );
};

export default CreatorStream;
