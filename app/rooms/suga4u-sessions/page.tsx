"use client";
import RoomSessionsBrowse from "@/components/rooms/shared/RoomSessionsBrowse";

export default function Suga4USessionsPage() {
    return (
        <RoomSessionsBrowse
            roomType="suga-4-u"
            roomEmoji="🍬"
            roomLabel="Suga 4 U"
            fanPageRoute="/rooms/suga4u"
            accentHsl="340, 75%, 55%"
            accentHslSecondary="320, 70%, 50%"
            backgroundImage="/rooms/suga4u/bg1.jpeg"
            backgroundOverlay="rgba(0,0,0,0.45)"
        />
    );
}
