const labels = ["Fans", "Drops", "Packs", "Bundles", "Drop Requests",];

const SummaryBox = () => {
    return (
        <div className="glass-panel rounded-xl p-4 flex-1 flex flex-col min-h-0">
            <h2 className="font-display text-lg font-bold neon-text mb-3 tracking-wider shrink-0">
                Summary Box
            </h2>
            <div className="flex-1 overflow-y-auto themed-scrollbar min-h-0">
                <div className="grid grid-cols-2 gap-2">
                    {labels.map((label, i) => (
                        <div key={i} className="flex flex-col gap-1">
                            <span className="text-xs font-semibold neon-text tracking-wide uppercase">
                                {label}
                            </span>
                            <div className="glass-card rounded-lg flex items-center justify-center cursor-pointer h-16 w-full">
                                <span className="font-display text-lg font-bold text-primary">{Math.floor(Math.random() * 500) + 1}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SummaryBox;
