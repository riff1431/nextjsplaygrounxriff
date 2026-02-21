const LiveStream = () => {
    return (
        <div className="glass-panel overflow-hidden flex flex-col h-full bg-transparent border-gold/20">
            {/* Stream View - now shows creator photo */}
            <div className="relative flex-1 min-h-[250px]">
                <img src="/rooms/suga4u/creator-photo.jpeg" alt="Creator" className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/70 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">Live</span>
                </div>
            </div>
        </div>
    );
};

export default LiveStream;
