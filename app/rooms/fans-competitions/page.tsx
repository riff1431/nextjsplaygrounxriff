"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import FcCompetitionCard from "@/components/rooms/fans-competitions/FcCompetitionCard";
import FcLeaderboardCard from "@/components/rooms/fans-competitions/FcLeaderboardCard";
import FcTopicVotingCard from "@/components/rooms/fans-competitions/FcTopicVotingCard";

const FansCompetitionsPage = () => {
    const router = useRouter();

    return (
        <div
            className="fc-theme min-h-screen bg-center bg-cover bg-no-repeat relative"
            style={{ backgroundImage: "url('/rooms/fans-competitions-bg.jpeg')" }}
        >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Back Button */}
            <button
                onClick={() => router.push("/home")}
                className="fc-vote-btn absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm"
            >
                <ArrowLeft size={18} />
                Back
            </button>

            <div className="relative z-10 max-w-7xl mx-auto py-8 pt-56">
                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 lg:grid-rows-1 ml-12 pr-12 lg:pr-0">
                    {/* Left Column */}
                    <div className="lg:col-span-4 flex flex-col gap-16 lg:row-span-1">
                        <FcCompetitionCard />
                        <FcTopicVotingCard />
                    </div>

                    {/* Center Column - Enter Room Button */}
                    <div className="lg:col-span-2">
                        <button
                            onClick={() => router.push("/rooms/pgx-pg8")}
                            className="fc-vote-btn w-full rounded-lg mt-52 h-12 font-semibold flex items-center justify-center transition-all hover:scale-105"
                        >
                            Enter Room
                        </button>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-4 lg:row-span-1">
                        <FcLeaderboardCard />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FansCompetitionsPage;
