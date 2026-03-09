"use client";
import RoomSessionsBrowse from "@/components/rooms/shared/RoomSessionsBrowse";

export default function CompetitionSessionsPage() {
    return (
        <RoomSessionsBrowse
            roomType="competition"
            roomEmoji="🏆"
            roomLabel="Competition"
            fanPageRoute="/rooms/fans-competitions"
            accentHsl="30, 90%, 55%"
            accentHslSecondary="15, 85%, 50%"
        />
    );
}
