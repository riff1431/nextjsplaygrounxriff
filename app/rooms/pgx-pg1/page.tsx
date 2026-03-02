"use client";

import { useState, useEffect } from "react";
import NavBar from "@/components/rooms/pgx-pg1/NavBar";
import CreatorSpotlight from "@/components/rooms/pgx-pg1/CreatorSpotlight";
import ConfessionWall from "@/components/rooms/pgx-pg1/ConfessionWall";
import RequestConfession from "@/components/rooms/pgx-pg1/RequestConfession";
import MyRequests from "@/components/rooms/pgx-pg1/MyRequests";
import RandomConfession from "@/components/rooms/pgx-pg1/RandomConfession";
import FloatingHearts from "@/components/rooms/pgx-pg1/FloatingHearts";
import { createClient } from "@/utils/supabase/client";

const Index = () => {
    const [roomId, setRoomId] = useState<string | null>(null);
    const [creatorId, setCreatorId] = useState<string | null>(null);

    // Discover the first room
    useEffect(() => {
        async function findRoom() {
            const supabase = createClient();
            const { data: room } = await supabase
                .from("rooms")
                .select("id, host_id")
                .limit(1)
                .maybeSingle();

            if (room) {
                setRoomId(room.id);
                setCreatorId(room.host_id);
            }
        }
        findRoom();
    }, []);

    return (
        <div className="h-screen flex flex-col overflow-hidden relative">
            {/* Background image */}
            <div className="fixed inset-0 z-0">
                <img src="/assets/bg-flames.png" alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-background/40" />
            </div>
            <FloatingHearts />

            <div className="relative z-10 flex flex-col h-full overflow-hidden">
                <NavBar />

                <main className="flex-1 p-4 max-w-[1400px] mx-auto w-full overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
                        {/* Left Column */}
                        <div className="h-full">
                            <div className="flex flex-col h-full gap-4 pr-2">
                                <CreatorSpotlight />
                                <MyRequests roomId={roomId} />
                            </div>
                        </div>

                        {/* Center Column - wider */}
                        <div className="lg:col-span-2 h-full overflow-hidden">
                            <ConfessionWall roomId={roomId} />
                        </div>

                        {/* Right Column */}
                        <div className="h-full">
                            <div className="flex flex-col h-full gap-4 pr-2">
                                <RequestConfession roomId={roomId} creatorId={creatorId} />
                                <div className="flex-1" />
                                <RandomConfession />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Index;
