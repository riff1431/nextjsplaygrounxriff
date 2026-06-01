import React from "react";
import RoomClient from "@/components/room/RoomClient";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function RoomPage({ params }: PageProps) {
    const { id } = await params;
    return <RoomClient roomId={id} />;
}
