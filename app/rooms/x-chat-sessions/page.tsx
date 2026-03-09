"use client";
import RoomSessionsBrowse from "@/components/rooms/shared/RoomSessionsBrowse";

export default function XChatSessionsPage() {
    return (
        <RoomSessionsBrowse
            roomType="x-chat"
            roomEmoji="💬"
            roomLabel="X Chat"
            fanPageRoute="/rooms/x-chat"
            accentHsl="45, 90%, 55%"
            accentHslSecondary="35, 85%, 50%"
        />
    );
}
