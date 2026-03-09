"use client";
import RoomSessionsBrowse from "@/components/rooms/shared/RoomSessionsBrowse";

export default function ConfessionsSessionsPage() {
    return (
        <RoomSessionsBrowse
            roomType="confessions"
            roomEmoji="💜"
            roomLabel="Confessions"
            fanPageRoute="/rooms/confessions"
            accentHsl="280, 70%, 60%"
            accentHslSecondary="320, 65%, 55%"
        />
    );
}
