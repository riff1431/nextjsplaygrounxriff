"use client";

const stats = [
    { label: "Fans", value: "2,491" },
    { label: "Drinks", value: "18" },
    { label: "Tips", value: "5,210" },
    { label: "Requests", value: "46" },
];

const SummaryPanel = () => {
    return (
        <div className="glass-panel p-4">
            <h2 className="text-lg font-semibold text-gold font-title mb-3">Summary</h2>
            <div className="space-y-2">
                {stats.map((stat, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: "hsl(280, 15%, 60%)" }}>{stat.label}</span>
                        <span className="text-sm font-semibold" style={{ color: "hsl(300, 20%, 95%)" }}>{stat.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SummaryPanel;
