"use client";

interface SessionEarnings {
    total: number;
    tips: number;
    truths: number;
    dares: number;
    custom: number;
}

const TodCreatorRoomEarnings = ({ earnings }: { earnings?: SessionEarnings }) => {
    const data = earnings || { total: 0, tips: 0, truths: 0, dares: 0, custom: 0 };

    const items = [
        { label: "Tips", amount: `€${data.tips.toFixed(2)}` },
        { label: "Truths", amount: `€${data.truths.toFixed(2)}` },
        { label: "Dares", amount: `€${data.dares.toFixed(2)}` },
        { label: "Custom", amount: `€${data.custom.toFixed(2)}` },
    ];

    return (
        <div className="tod-creator-panel-bg rounded-xl tod-creator-neon-border-green p-2.5 h-full flex flex-col">
            <h3 className="font-bold text-white text-xs mb-1.5">Room Earnings</h3>
            <div className="text-center py-1.5 rounded-lg tod-creator-neon-border-green tod-creator-glow-green mb-1.5">
                <p className="text-[9px] tod-creator-text-neon-green font-semibold tracking-wider uppercase leading-none">Total Earned</p>
                <p className="text-2xl font-black tod-creator-text-neon-green leading-tight">€ {data.total.toFixed(2)}</p>
            </div>
            <div className="space-y-0.5">
                {items.map((item) => (
                    <div key={item.label} className="flex justify-between text-[11px]">
                        <span className="text-white/60">{item.label}</span>
                        <span className="text-white font-medium">{item.amount}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TodCreatorRoomEarnings;
