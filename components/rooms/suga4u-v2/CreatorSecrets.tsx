import { Lock } from "lucide-react";

const secrets = [
    { name: "Behind the Scenes", price: 29 },
    { name: "Bath Party", price: 29 },
    { name: "Bedroom Vibes", price: 49 },
    { name: "Behind the Scenes", price: 29 },
    { name: "Bath Party", price: 29 },
    { name: "Bedroom Vibes", price: 49 },
];

const CreatorSecrets = () => (
    <div className="glass-panel p-3">
        <div className="flex items-center justify-center mb-3">
            <div className="h-px flex-1 bg-gold/30" />
            <span className="section-title px-3">Creator Secrets</span>
            <div className="h-px flex-1 bg-gold/30" />
        </div>
        <div className="grid grid-cols-3 gap-3 p-4">
            {secrets.map((s, i) => (
                <div key={i} className="glass-panel neon-border-pink p-3 text-center">
                    <Lock className="w-5 h-5 mx-auto mb-1 text-gold" />
                    <p className="text-[11px] font-semibold mb-2 leading-tight">{s.name}</p>
                    <button className="btn-gold w-full py-1 text-[10px]">${s.price} UNLOCK</button>
                </div>
            ))}
        </div>
    </div>
);

export default CreatorSecrets;
