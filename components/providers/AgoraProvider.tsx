import { ReactNode } from 'react';
import AgoraRTC, { AgoraRTCProvider, IAgoraRTCClient } from 'agora-rtc-react';

interface AgoraProviderProps {
    children: ReactNode;
    client: IAgoraRTCClient;
}

export default function AgoraProvider({ children, client }: AgoraProviderProps) {
    return (
        <AgoraRTCProvider client={client}>
            {children}
        </AgoraRTCProvider>
    );
}

// Helper to create a client for one-to-many live streaming
export const createAgoraClient = () => {
    return AgoraRTC.createClient({ mode: "live", codec: "vp8" });
};

// Separate client for group video calls (Zoom/Meet style).
// mode:"rtc" makes every participant a publisher by default — no role management needed.
// This avoids the race condition where setClientRole("host") fires after join in live mode.
export const createGroupCallClient = () => {
    return AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
};
