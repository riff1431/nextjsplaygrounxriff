import { ArrowLeft } from "lucide-react";
import CompetitionCard from "@/components/CompetitionCard";
import LeaderboardCard from "@/components/LeaderboardCard";
import TopicVotingCard from "@/components/TopicVotingCard";

const Index = () => {
  return (
    <div
      className="min-h-screen bg-background bg-center bg-cover bg-no-repeat relative"
      style={{ backgroundImage: "url('/images/bg5.jpeg')" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-background/10" />

      {/* Back Button */}
      <button
        onClick={() => window.history.back()}
        className="vote-btn absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="relative z-10 max-w-7xl mx-auto py-8 pt-56">
        {/* Header */}
        <div className="text-center mb-10">
          {/* <h1 className="font-display italic text-6xl md:text-7xl lg:text-8xl text-primary neon-text font-bold tracking-tight">
            PlayGround<span className="text-foreground">X</span>
          </h1> */}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 lg:grid-rows-1 ml-12">
          {/* Left Column */}
          <div className="lg:col-span-4 flex flex-col gap-16 lg:row-span-1">
            <CompetitionCard />
            <TopicVotingCard />
          </div>
           <div className="lg:col-span-2">
            <div className=" vote-btn lg:col-span-3 lg:row-span-3 rounded-lg mt-52 h-12 mx-2 font-semibold flex items-center justify-center">
            Enter Room
            </div>
           </div>
          {/* Right Column */}
          <div className="lg:col-span-4 lg:row-span-1">
            <LeaderboardCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
