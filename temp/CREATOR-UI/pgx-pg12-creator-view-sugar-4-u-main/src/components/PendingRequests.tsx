import { Diamond } from "lucide-react";

const requests = [
  { user: "SuGaFan17", amount: "$200", text: "Sexy lingerie shoot ❤️ ✨" },
  { user: "RichieBoy", amount: "$75", text: "Late night chat ✨" },
];

const PendingRequests = () => {
  return (
    <div className="glass-panel p-4">
      <h3 className="font-display text-lg font-bold text-foreground mb-3">Pending Requests</h3>
      <div className="space-y-3">
        {requests.map((req, i) => (
          <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-3">
              <span className="text-xl">🌸</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{req.user}</p>
                <p className="text-xs text-muted-foreground">{req.text}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gold flex items-center gap-1">
                {req.amount} <Diamond className="w-3 h-3" />
              </span>
              <button className="text-xs bg-muted/50 text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors">
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-muted/30 rounded-lg px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-foreground">Private 1 on 1</h4>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gold flex items-center gap-1">
              $300 <Diamond className="w-3 h-3" />
            </span>
            <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-1 rounded">11:00 PM</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs bg-muted/50 text-muted-foreground px-3 py-1.5 rounded-lg">
            Choose Time
          </button>
          <button className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-semibold">
            Accept
          </button>
          <button className="text-xs bg-muted/50 text-muted-foreground px-3 py-1.5 rounded-lg">
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingRequests;
