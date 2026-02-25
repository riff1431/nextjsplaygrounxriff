interface Request {
  message: string;
  status?: "accept" | "decline" | null;
}

const mockRequests: Request[] = [
  { message: "Can I buy you a drink? 🍸" },
  { message: "Dance for us 💃", status: "accept" },
  { message: "Blow a kiss to the camera 😘", status: "decline" },
  { message: "Some as more!", status: "accept" },
];

const IncomingRequests = () => {
  return (
    <div className="glass-panel p-4 h-full flex flex-col w-full">
      <h2 className="text-lg font-semibold gold-text font-serif mb-3">Incoming Requests</h2>
      <div className="space-y-3">
        {mockRequests.map((req, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <p className="text-sm text-foreground/90 flex-1">{req.message}</p>
            {req.status ? (
              <button
                className={`px-3 py-1 rounded text-xs font-medium border ${
                  req.status === "accept"
                    ? "border-primary/50 text-primary bg-primary/10"
                    : "border-accent/50 text-accent bg-accent/10"
                }`}
              >
                {req.status === "accept" ? "Accept" : "Decline"}
              </button>
            ) : (
              <div className="flex gap-1">
                <button className="px-3 py-1 rounded text-xs font-medium border border-primary/50 text-primary bg-primary/10 hover:bg-primary/20 transition-colors">
                  Accept
                </button>
                <button className="px-3 py-1 rounded text-xs font-medium border border-accent/50 text-accent bg-accent/10 hover:bg-accent/20 transition-colors">
                  Decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncomingRequests;
