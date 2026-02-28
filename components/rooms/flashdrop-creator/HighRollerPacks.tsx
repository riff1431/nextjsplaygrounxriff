import DropCard from "./DropCard";

const labels = ["Pack 1", "Pack 2", "Pack 3", "Pack 4", "Pack 5", "Pack 6"];

const HighRollerPacks = () => {
    return (
        <div className="glass-panel rounded-xl p-4 flex-1 flex flex-col min-h-0">
            <h2 className="font-display text-lg font-bold neon-text mb-3 tracking-wider shrink-0">
                High Roller Packs
            </h2>
            <div className="flex-1 overflow-y-auto themed-scrollbar min-h-0">
                <div className="grid grid-cols-2 gap-2">
                    {labels.map((label, i) => (
                        <div key={i} className="flex flex-col gap-1">
                            <span className="text-xs font-semibold neon-text tracking-wide uppercase">
                                {label}
                            </span>
                            <DropCard size="md" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HighRollerPacks;
