"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ProtectRoute } from "@/app/context/AuthContext";
import SugaLogo from "@/components/rooms/suga4u-v2/SugaLogo";
import UserProfile from "@/components/rooms/suga4u-v2/UserProfile";
import LiveStream from "@/components/rooms/suga4u-v2/LiveStream";
import PinnedOfferDrops from "@/components/rooms/suga4u-v2/PinnedOfferDrops";
import CreatorSecrets from "@/components/rooms/suga4u-v2/CreatorSecrets";
import LiveChat from "@/components/rooms/suga4u-v2/LiveChat";
import CreatorFavorites from "@/components/rooms/suga4u-v2/CreatorFavorites";
import PaidRequestMenu from "@/components/rooms/suga4u-v2/PaidRequestMenu";
import SendSugarGifts from "@/components/rooms/suga4u-v2/SendSugarGifts";
import QuickPaidActions from "@/components/rooms/suga4u-v2/QuickPaidActions";

import { createClient } from "@/utils/supabase/client";

const Suga4URoomV2 = () => {
    const router = useRouter();
    const supabase = createClient();
    const [roomId, setRoomId] = React.useState<string | null>(null);
    const [hostName, setHostName] = React.useState("Alexis Rose");

    React.useEffect(() => {
        async function fetchRoom() {
            // Find the latest live "suga-4-u" room
            const { data: room } = await supabase
                .from('rooms')
                .select('id, host_id')
                .eq('status', 'live')
                .eq('type', 'suga-4-u')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (room) {
                setRoomId(room.id);
                // Fetch host name
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, full_name')
                    .eq('id', room.host_id)
                    .single();

                if (profile) {
                    setHostName(profile.full_name || profile.username || "Creator");
                }
            } else {
                setHostName("No Active Room");
            }
        }
        fetchRoom();
    }, [supabase]);

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            <div className="min-h-screen relative fd-suga4u-theme text-foreground font-body overflow-hidden">
                {/* Full-screen background */}
                <div className="fixed inset-0 z-0">
                    <img
                        src="/rooms/suga4u/bg1.jpeg"
                        alt=""
                        className="w-full h-full object-cover"
                    />
                    <div className="suga-background-overlay" />
                </div>

                <div className="relative z-10 p-3 lg:p-4 h-screen flex flex-col">
                    {/* Header */}
                    <header className="flex items-center justify-between mb-3 flex-shrink-0">
                        <div className="hover:opacity-80 transition-opacity cursor-pointer" onClick={() => router.push("/home")}>
                            <SugaLogo />
                        </div>
                        <UserProfile name={hostName} />
                    </header>

                    {/* Main 3-Column Layout - fills remaining viewport */}
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_300px] gap-3 lg:gap-4 flex-1 min-h-0 px-40">
                        {/* Left Column: Stream + Offers + Secrets */}
                        <div className="flex flex-col gap-3 min-h-0">
                            <div className="flex-[1.5] min-h-0">
                                <LiveStream />
                            </div>
                            <div className="grid grid-cols lg:grid-cols-[1fr_1fr] gap-3 lg:gap-4 flex-1 min-h-0">
                                <CreatorSecrets roomId={roomId} />
                                <CreatorFavorites roomId={roomId} />
                            </div>
                        </div>

                        {/* Middle Column: Live Chat */}
                        <div className="flex flex-col gap-3 min-h-0">
                            <div className="flex-[3] min-h-0">
                                <LiveChat roomId={roomId} />
                            </div>
                        </div>

                        {/* Right Column: Paid Requests + Gifts + Actions */}
                        <div className="flex flex-col gap-3 min-h-0 pr-10 overflow-y-auto chat-scroll">
                            <PaidRequestMenu roomId={roomId} />
                            <SendSugarGifts roomId={roomId} />
                            <QuickPaidActions roomId={roomId} />
                            <PinnedOfferDrops roomId={roomId} />
                        </div>
                    </div>
                </div>
            </div>
        </ProtectRoute>
    );
};

export default Suga4URoomV2;
