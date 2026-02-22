import { Play, Volume2, Users } from "lucide-react";

const LiveStream = () => (
    <div className="relative w-full h-full rounded-2xl overflow-hidden glass-panel border-gold/30">
        <img
            src="/rooms/suga4u/suga4u-bg.jpeg"
            alt="Live Stream"
            className="w-full h-full object-cover"
        />

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

        {/* Top Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
            <div className="bg-pink px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 glow-pink">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
            </div>
            <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 text-white underline decoration-gold">
                <Users className="w-3 h-3 text-gold" />
                1.2K VIEWERS
            </div>
        </div>

        {/* Center Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 group cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-gold/20 backdrop-blur-md border border-gold/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-gold fill-gold" />
            </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 transition-colors">
                    <Volume2 className="w-4 h-4 text-white" />
                </button>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="w-6 h-6 rounded-full border border-gold/50 bg-muted overflow-hidden">
                            <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
                <span className="text-[10px] font-bold text-white/80">+24 more</span>
            </div>
        </div>
    </div>
);

export default LiveStream;
