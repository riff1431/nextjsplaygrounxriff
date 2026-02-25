import { Zap } from "lucide-react";

interface Request {
  user: string;
  text: string;
}

interface RequestPanelProps {
  title: string;
  icon?: React.ReactNode;
  requests: Request[];
  accentColor: "pink" | "blue";
}

const RequestPanel = ({ title, requests, accentColor }: RequestPanelProps) => {
  const borderClass = accentColor === "pink" ? "neon-border-pink" : "neon-border-blue";
  const iconColor = accentColor === "pink" ? "text-neon-pink" : "text-neon-blue";

  return (
    <div className={`panel-bg rounded-xl ${borderClass} p-4 flex flex-col`}>
      <div className="flex items-center gap-2 mb-3">
        <Zap className={`w-4 h-4 ${iconColor}`} />
        <h3 className="font-bold text-foreground">{title}</h3>
      </div>
      <div className="space-y-2.5 flex-1 overflow-y-auto min-h-0">
        {requests.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-primary to-secondary rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{r.user}</p>
              <p className="text-xs text-muted-foreground truncate">{r.text}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button className="px-2.5 py-1 text-xs rounded bg-neon-green text-foreground font-semibold hover:opacity-80 transition-opacity">
                Accept
              </button>
              <button className="px-2.5 py-1 text-xs rounded border border-muted-foreground/30 text-muted-foreground font-semibold hover:opacity-80 transition-opacity">
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RequestPanel;
