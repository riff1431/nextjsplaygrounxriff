import React from "react";
import { DollarSign, Zap } from "lucide-react";

interface TipsSectionProps {
    onSendTip: (amount: number) => void;
}

const TipsSection: React.FC<TipsSectionProps> = ({ onSendTip }) => {
    const [customAmount, setCustomAmount] = React.useState("");
    const tipPresets = [10, 25, 50];

    return (
        <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
                <Zap className="w-5 h-5 text-gold fill-gold/20" />
                <h2 className="font-title text-2xl font-bold text-gold tracking-wide">Tip Now</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex items-center gap-4">
                    {tipPresets.map((amount) => (
                        <button
                            key={amount}
                            onClick={() => onSendTip(amount)}
                            className="tip-circle text-white/80 border-white/10 hover:bg-gold/10"
                        >
                            ${amount}
                        </button>
                    ))}
                </div>

                <div className="flex-1 w-full md:w-auto">
                    <div className="custom-tip-container focus-within:border-gold/40 transition-all">
                        <span className="text-white/40 font-bold mr-2">$</span>
                        <input
                            type="text"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            placeholder="Custom Amount"
                            className="bg-transparent border-none text-white focus:outline-none text-sm w-full placeholder:text-white/10"
                        />
                    </div>
                </div>

                <button
                    onClick={() => customAmount && onSendTip(Number(customAmount))}
                    className="w-full md:w-auto px-10 py-4 btn-gold rounded-full flex items-center justify-center gap-2"
                >
                    <DollarSign className="w-5 h-5" />
                    Send Tip
                </button>
            </div>
        </div>
    );
};

export default TipsSection;
