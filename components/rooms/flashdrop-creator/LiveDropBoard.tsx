import DropCard from "./DropCard";

const LiveDropBoard = () => {
    return (
        <div className="glass-panel rounded-xl p-4 flex-1 flex flex-col min-h-0">
            <h2 className="font-display text-lg font-bold neon-text mb-3 tracking-wider shrink-0">
                Live Drop Board
            </h2>
            <div className="flex-1 overflow-y-auto themed-scrollbar min-h-0 flex flex-col">
                <div className="flex-1 grid grid-cols-3 gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <DropCard key={i} size="sm" />
                    ))}
                </div>
                <div className="mt-3">
                    <span className="text-xs font-semibold neon-text tracking-wide uppercase">
                        Exclusive Drop
                    </span>
                    <DropCard active size="lg" />
                </div>
            </div>
        </div>
    );
};

export default LiveDropBoard;
