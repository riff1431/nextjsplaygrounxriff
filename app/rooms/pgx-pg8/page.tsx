"use client";

import React from "react";
import "./competition.css";
import LiveChat from "@/components/rooms/pgx-pg8/LiveChat";
import ContestantCard from "@/components/rooms/pgx-pg8/ContestantCard";
import BuyVotes from "@/components/rooms/pgx-pg8/BuyVotes";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const contestants = [
    { rank: 1, name: "ALEXA", votes: "8.4k", gradient: "bg-gradient-to-br from-pink-600/60 to-purple-800/60" },
    { rank: 2, name: "MIA", votes: "7.9k", gradient: "bg-gradient-to-br from-purple-600/60 to-indigo-800/60" },
    { rank: 3, name: "JESSICA", votes: "9.1k", gradient: "bg-gradient-to-br from-rose-600/60 to-pink-800/60" },
    { rank: 4, name: "SOPHIA", votes: "8.7k", gradient: "bg-gradient-to-br from-fuchsia-600/60 to-purple-800/60" },
];

export default function CompetitionRoom() {
    const router = useRouter();

    return (
        <div className="competition-theme">
            <div
                className="h-screen w-screen overflow-hidden bg-background bg-cover bg-center bg-fixed relative"
                style={{ backgroundImage: "url('/images/pgx-pg8/bg2.jpeg')" }}
            >
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px]" />

                <div className="relative z-10 mx-auto mx-100 h-full flex flex-col p-3 md:p-4 lg:p-5">
                    {/* Header */}
                    <header className="py-2 flex-shrink-0 flex items-center">
                        <button onClick={() => router.back()} className="flex items-center gap-1 text-foreground/80 hover:text-foreground transition-colors bg-card/40 border border-border rounded-lg px-3 py-1.5 neon-border">
                            <ArrowLeft size={16} />
                            <span className="text-xs font-display tracking-wider">BACK</span>
                        </button>
                        <div className="flex-1 flex justify-center">
                            <h1 className="font-cursive text-3xl md:text-4xl lg:text-5xl tracking-wide neon-text text-foreground mr-96 pr-40">
                                Competition Room
                            </h1>
                        </div>
                    </header>

                    {/* Main Content - fills remaining space */}
                    <main className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 mx-60">
                        {/* Live Chat - Left side */}
                        <div className="lg:w-72 xl:w-80 flex-shrink-0 flex flex-col gap-2 h-48 lg:h-full">
                            <div className="flex-1 min-h-0">
                                <LiveChat />
                            </div>
                            {/* <button className="flex-shrink-0 w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-foreground font-display text-sm font-bold tracking-wider py-2 rounded-lg border border-border neon-border transition-all hover:brightness-110">
                💰 SEND TIP — €5
              </button> */}
                        </div>

                        {/* Right side content */}
                        <div className="flex-1 min-h-0 flex flex-col gap-3">
                            {/* Contestant Grid */}
                            <div className="flex-1 min-h-0 grid grid-cols-2 gap-3">
                                {contestants.map((c) => (
                                    <ContestantCard key={c.rank} {...c} />
                                ))}
                            </div>

                            {/* Buy Votes - compact */}
                            <div className="flex-shrink-0">
                                <BuyVotes />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
