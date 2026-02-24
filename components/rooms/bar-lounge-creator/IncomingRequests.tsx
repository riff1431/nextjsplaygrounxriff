"use client";

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
            <h2 className="text-lg font-semibold text-gold font-title mb-3">Incoming Requests</h2>
            <div className="space-y-3">
                {mockRequests.map((req, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                        <p className="text-sm flex-1" style={{ color: "hsla(300, 20%, 95%, 0.9)" }}>{req.message}</p>
                        {req.status ? (
                            <button
                                className="px-3 py-1 rounded text-xs font-medium border"
                                style={
                                    req.status === "accept"
                                        ? {
                                            borderColor: "hsla(45, 90%, 55%, 0.5)",
                                            color: "hsl(45, 90%, 55%)",
                                            background: "hsla(45, 90%, 55%, 0.1)",
                                        }
                                        : {
                                            borderColor: "hsla(320, 80%, 60%, 0.5)",
                                            color: "hsl(320, 80%, 60%)",
                                            background: "hsla(320, 80%, 60%, 0.1)",
                                        }
                                }
                            >
                                {req.status === "accept" ? "Accept" : "Decline"}
                            </button>
                        ) : (
                            <div className="flex gap-1">
                                <button
                                    className="px-3 py-1 rounded text-xs font-medium border hover:opacity-80 transition-colors"
                                    style={{
                                        borderColor: "hsla(45, 90%, 55%, 0.5)",
                                        color: "hsl(45, 90%, 55%)",
                                        background: "hsla(45, 90%, 55%, 0.1)",
                                    }}
                                >
                                    Accept
                                </button>
                                <button
                                    className="px-3 py-1 rounded text-xs font-medium border hover:opacity-80 transition-colors"
                                    style={{
                                        borderColor: "hsla(320, 80%, 60%, 0.5)",
                                        color: "hsl(320, 80%, 60%)",
                                        background: "hsla(320, 80%, 60%, 0.1)",
                                    }}
                                >
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
