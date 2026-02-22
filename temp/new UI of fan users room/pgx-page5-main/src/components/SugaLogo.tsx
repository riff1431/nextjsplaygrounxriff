import { Heart } from "lucide-react";

const SugaLogo = () => (
  <div className="flex items-center gap-2">
    <div className="flex gap-0.5">
      <Heart className="w-5 h-5 text-pink fill-pink" />
      <Heart className="w-4 h-4 text-pink-light fill-pink-light -ml-1 mt-1" />
    </div>
    <div>
      <h1 className="font-display text-2xl leading-none">
        <span className="text-pink glow-text-pink">S</span>
        <span className="text-gold glow-text-gold">UGA</span>
        <span className="text-pink glow-text-pink">4</span>
        <span className="text-gold glow-text-gold">U</span>
      </h1>
      <p className="text-[10px] tracking-[0.25em] text-gold-light uppercase">Premium Sugar Experience</p>
    </div>
  </div>
);

export default SugaLogo;
