"use client";
import RoomSessionsBrowse from "@/components/rooms/shared/RoomSessionsBrowse";

export default function ConfessionsSessionsPage() {
    return (
        <RoomSessionsBrowse
            roomType="confessions"
            roomEmoji="💜"
            roomLabel="Confessions"
            fanPageRoute="/rooms/confessions"
            accentHsl="340, 82%, 52%"
            accentHslSecondary="330, 80%, 60%"
            backgroundImage="/assets/bg-flames.png"
            backgroundOverlay="rgba(0,0,0,0.45)"
        />
    );
}
