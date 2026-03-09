"use client";
import RoomSessionsBrowse from "@/components/rooms/shared/RoomSessionsBrowse";

export default function BarLoungeSessionsPage() {
    return (
        <RoomSessionsBrowse
            roomType="bar-lounge"
            roomEmoji="🍸"
            roomLabel="Bar Lounge"
            fanPageRoute="/rooms/bar-lounge"
            accentHsl="45, 90%, 55%"
            accentHslSecondary="280, 40%, 50%"
        />
    );
}
