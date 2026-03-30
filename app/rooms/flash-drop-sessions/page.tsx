"use client";
import RoomSessionsBrowse from "@/components/rooms/shared/RoomSessionsBrowse";

export default function FlashDropSessionsPage() {
    return (
        <RoomSessionsBrowse
            roomType="flash-drop"
            roomEmoji="⚡"
            roomLabel="Flash Drops"
            fanPageRoute="/rooms/flash-drop"
            accentHsl="330, 100%, 55%"
            accentHslSecondary="280, 80%, 60%"
            backgroundImage="/flash-drops/nightclub-bg.png"
            backgroundOverlay="rgba(0,0,0,0.50)"
        />
    );
}
