import React from "react";
import RoomClient from "@/components/room/RoomClient";

interface PageProps {
    params: {
        id: string;
    };
}

export default function RoomPage({ params }: PageProps) {
    return <RoomClient roomId={params.id} />;
}
