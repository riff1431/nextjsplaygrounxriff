"use client";
import RoomSessionsBrowse from "@/components/rooms/shared/RoomSessionsBrowse";

export default function FlashDropSessionsPage() {
    return (
        <RoomSessionsBrowse
            roomType="flash-drop"
            roomEmoji="⚡"
            roomLabel="Flash Drops"
            fanPageRoute="/rooms/flash-drop"
            accentHsl="170, 80%, 50%"
            accentHslSecondary="150, 70%, 45%"
        />
    );
}
