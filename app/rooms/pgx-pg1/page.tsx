"use client";

import React from "react";

import NavBar from "@/components/rooms/confessions-pg1/NavBar";
import CreatorSpotlight from "@/components/rooms/confessions/CreatorSpotlight";
import ConfessionWall from "@/components/rooms/confessions/ConfessionWall";
import RequestConfession from "@/components/rooms/confessions/RequestConfession";
import MyRequests from "@/components/rooms/confessions/MyRequests";
import RandomConfession from "@/components/rooms/confessions/RandomConfession";
import FloatingHearts from "@/components/rooms/confessions/FloatingHearts";

const Index = () => {
    // Basic state for components
    const [requests, setRequests] = React.useState<any[]>([
        { id: '1', topic: 'Midnight Whisper', status: 'pending_approval', amount: 50 },
        { id: '2', topic: 'Shadow Secret', status: 'delivered', amount: 100, delivery_content: 'This is a sample secret delivery content.' }
    ]);
    const [confessions, setConfessions] = React.useState<any[]>([
        { id: 'c1', tier: 'Spicy', title: 'The hidden letter', teaser: 'I found a letter under the bed...', price: 10, unlocked: false },
        { id: 'c2', tier: 'Dark', title: 'Night visitor', teaser: 'Someone came by last night...', price: 25, unlocked: true, content: 'It was just the wind, but it sounded so real.' }
    ]);
    const [myUnlocks, setMyUnlocks] = React.useState<Set<string>>(new Set(['c2']));
    const [goalTotal, setGoalTotal] = React.useState(140);
    const [isAnon, setIsAnon] = React.useState(true);
    const [reqType, setReqType] = React.useState<'Text' | 'Audio' | 'Video'>('Text');
    const [reqAmount, setReqAmount] = React.useState(10);
    const [reqTopic, setReqTopic] = React.useState("");

    return (
        <div className="min-h-screen relative truth-dare-theme">
            {/* Background image */}
            <div className="fixed inset-0 z-0">
                <img src="/confessions/bg-flames.png" alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-background/40" />
            </div>
            <FloatingHearts />

            <div className="relative z-10 font-sans">
                <NavBar />

                <main className="p-4 max-w-[1400px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <CreatorSpotlight
                                goalTotal={goalTotal}
                                pay={(val) => setGoalTotal(prev => prev + val)}
                                isAnon={isAnon}
                                setIsAnon={setIsAnon}
                            />
                            <MyRequests
                                requests={requests}
                                setReviewRequest={(req) => alert(`Reviewing: ${req.delivery_content}`)}
                            />
                        </div>

                        {/* Center Column - wider */}
                        <div className="lg:col-span-2">
                            <ConfessionWall
                                confessions={confessions}
                                myUnlocks={myUnlocks}
                                loadingWall={false}
                                tierFilter="All"
                                handleTierFilter={() => { }}
                                setViewConfession={(c) => alert(`Viewing: ${c.content}`)}
                                setPurchaseConfession={(c) => alert(`Purchasing: ${c.title}`)}
                            />
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            <RequestConfession
                                reqType={reqType}
                                setReqType={setReqType}
                                reqAmount={reqAmount}
                                setReqAmount={setReqAmount}
                                reqTopic={reqTopic}
                                setReqTopic={setReqTopic}
                                isAnon={isAnon}
                                setIsAnon={setIsAnon}
                                handleOpenConfirm={() => alert("Requesting...")}
                                isSending={false}
                            />
                            <RandomConfession onSpinComplete={() => alert("Spin complete!")} />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Index;
