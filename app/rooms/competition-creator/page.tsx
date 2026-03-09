"use client";
import RoomSessionDashboard from "@/components/rooms/shared/RoomSessionDashboard";

export default function CompetitionCreatorPage() {
    return (
        <RoomSessionDashboard
            roomType="competition"
            roomEmoji="🏆"
            roomLabel="Competition"
            creatorPageRoute="/rooms/fans-competitions"
            accentHsl="30, 90%, 55%"
            accentHslSecondary="15, 85%, 50%"
            backgroundImage="/rooms/fans-competitions-bg.jpeg"
        />
    );
}
