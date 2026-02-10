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

// Helper to create a client (can be used in parent page)
export const createAgoraClient = () => {
    return AgoraRTC.createClient({ mode: "live", codec: "vp8" });
};
