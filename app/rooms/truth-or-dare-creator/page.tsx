"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import TodCreatorLiveChat from "@/components/rooms/truth-or-dare-creator/TodCreatorLiveChat";
import TodCreatorStreamViewer from "@/components/rooms/truth-or-dare-creator/TodCreatorStreamViewer";
import TodCreatorRoomEarnings from "@/components/rooms/truth-or-dare-creator/TodCreatorRoomEarnings";
import TodCreatorGroupVote from "@/components/rooms/truth-or-dare-creator/TodCreatorGroupVote";
import TodCreatorRequestPanel from "@/components/rooms/truth-or-dare-creator/TodCreatorRequestPanel";

const truthRequests = [
    { user: "John456", text: "Reveal your last secret!" },
    { user: "FunTimes", text: "Tell us about your first kiss!" },
    { user: "PartyGirl", text: "Show us your craziest text message!" },
    { user: "JamieK", text: "Confess a silly thing you've done!" },
    { user: "PlayHard", text: "What's a guilty pleasure of yours!" },
    { user: "Sarah89", text: "Show an embarrassing photo!" },
];

const dareRequests = [
    { user: "Fan123", text: "Dance for 2 minutes!" },
    { user: "PartyGuy", text: "Do a funny impersonation!" },
    { user: "SamHere", text: "Send a silly dare message!" },
    { user: "Jacob99", text: 'Call someone and say "I love you!"' },
    { user: "Natalie", text: "Hold an ice bucket on head!" },
    { user: "KinkyKing", text: "Try to twerk for 1 min!" },
];

const TruthOrDareCreatorPage = () => {
    const router = useRouter();

    return (
        <div className="tod-creator-theme min-h-screen p-3 lg:p-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-3 lg:mb-4">
                <button
                    onClick={() => router.push("/home")}
                    className="tod-creator-panel-bg tod-creator-neon-border-blue px-3 py-2 rounded-lg flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-[18px] h-[18px]" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <h1 className="text-xl font-bold tod-creator-text-neon-pink">
                    🎭 Truth or Dare — Creator View
                </h1>
                <div className="w-24" />
            </div>

            {/* Top row: Chat | Stream | Earnings */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-3 lg:gap-4 mb-3 lg:mb-4">
                <div className="h-[420px]">
                    <TodCreatorLiveChat />
                </div>
                <div className="h-[420px]">
                    <TodCreatorStreamViewer />
                </div>
                <div>
                    <TodCreatorRoomEarnings />
                </div>
            </div>

            {/* Bottom row: Truth | Dare | GroupVote */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] gap-3 lg:gap-4">
                <div>
                    <TodCreatorRequestPanel title="Truth Requests" requests={truthRequests} accentColor="blue" />
                </div>
                <div>
                    <TodCreatorRequestPanel title="Dare Requests" requests={dareRequests} accentColor="pink" />
                </div>
                <div>
                    <TodCreatorGroupVote />
                </div>
            </div>
        </div>
    );
};

export default TruthOrDareCreatorPage;
