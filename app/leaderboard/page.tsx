"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import CompetitionCard from "@/components/rooms/leaderboard/CompetitionCard";
import LeaderboardCard from "@/components/rooms/leaderboard/LeaderboardCard";
import TopicVotingCard from "@/components/rooms/leaderboard/TopicVotingCard";
import Link from "next/link";

const LeaderboardPage = () => {
    return (
        <div
            className="min-h-screen bg-background bg-center bg-no-repeat relative leaderboard-theme"
            style={{ backgroundImage: "url('/images/bg2.jpeg')" }}
        >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-background/20" />

            {/* Back Button */}
            <Link
                href="/home"
                className="vote-btn absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm"
            >
                <ArrowLeft size={18} />
                Back
            </Link>

            <div className="relative z-10 max-w-7xl mx-auto py-8 pt-48">
                {/* Header */}
                <div className="text-center mb-10">
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 lg:grid-rows-1 p-4 lg:p-0">
                    {/* Left Column */}
                    <div className="lg:col-span-4 flex flex-col gap-6 lg:row-span-1">
                        <CompetitionCard />
                        <TopicVotingCard />
                    </div>

                    <div className="lg:col-span-2 flex items-center justify-center">
                        <Link
                            href="/rooms/pgx-pg8"
                            className="vote-btn w-full lg:col-span-3 lg:row-span-3 rounded-lg lg:mt-52 h-12 font-semibold flex items-center justify-center hover:brightness-110 transition-all shadow-[0_0_20px_rgba(255,51,153,0.3)]"
                        >
                            Enter Room
                        </Link>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-4 lg:row-span-1 min-h-[500px]">
                        <LeaderboardCard />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardPage;
