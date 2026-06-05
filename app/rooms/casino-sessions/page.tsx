"use client";
import RoomSessionsBrowse from "@/components/rooms/shared/RoomSessionsBrowse";

export default function CasinoSessionsPage() {
    return (
        <RoomSessionsBrowse
            roomType="casino"
            roomEmoji="🎰"
            roomLabel="Casino Lounge"
            fanPageRoute="/rooms/casino"
            accentHsl="0, 90%, 55%"
            accentHslSecondary="45, 90%, 55%"
        />
    );
}
