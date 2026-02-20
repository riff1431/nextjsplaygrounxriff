import React from "react";

interface TipsSectionProps {
    onTip: (amount: number) => void;
    onCustomTip: (amount: number) => void;
}

const TipsSection: React.FC<TipsSectionProps> = ({ onTip, onCustomTip }) => {
    const [customValue, setCustomValue] = React.useState<string>("");

    const handleCustomTip = () => {
        const val = Number(customValue);
        if (!isNaN(val) && val > 0) {
            onCustomTip(val);
            setCustomValue("");
        }
    };

    return (
        <div className="mt-4 border border-violet-500/20 rounded-xl p-4 bg-black/40 backdrop-blur-md">
            <h3 className="font-display text-lg font-bold text-white text-center mb-4">Tip Extra</h3>
            <div className="flex gap-4 mb-4">
                {[10, 25, 50].map((amount) => (
                    <button
                        key={amount}
                        onClick={() => onTip(amount)}
                        className="bl-tip-btn flex-1 text-sm text-center"
                    >
                        ${amount}
                    </button>
                ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="bl-tip-btn flex-1 flex items-center justify-between text-sm py-0 pl-3 pr-2 focus-within:ring-1 focus-within:ring-fuchsia-500">
                    <span className="text-gray-400">Custom</span>
                    <div className="flex items-center gap-1">
                        <span className="text-yellow-400 font-bold">$</span>
                        <input
                            type="number"
                            min="1"
                            value={customValue}
                            onChange={(e) => setCustomValue(e.target.value)}
                            className="bg-transparent border-none outline-none text-white text-right w-16 font-bold placeholder:text-gray-600"
                            placeholder="0"
                        />
                    </div>
                </div>
                <button
                    onClick={handleCustomTip}
                    className="bl-btn-gold rounded-lg px-6 py-2 flex-1 sm:flex-none text-sm min-w[120px]"
                >
                    Tip Now
                </button>
            </div>
        </div>
    );
};

export default TipsSection;
