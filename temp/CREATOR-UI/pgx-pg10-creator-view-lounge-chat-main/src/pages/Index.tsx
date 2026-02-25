import LoungeChat from "@/components/LoungeChat";
import VideoStage from "@/components/VideoStage";
import IncomingRequests from "@/components/IncomingRequests";
import SummaryPanel from "@/components/SummaryPanel";

const Index = () => {
  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex flex-col"
      style={{ backgroundImage: "url('/images/lounge-bg.jpeg')" }}
    >
      {/* Top Bar */}
      <div className="relative z-20 flex items-center justify-center px-4 py-3 glass-panel rounded-none border-x-0 border-t-0">
        <button
          onClick={() => window.history.back()}
          className="absolute left-4 glass-panel gold-border px-3 py-2 rounded-lg flex items-center gap-2 text-primary hover:bg-primary/10 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-2xl gold-text" style={{ fontFamily: "'Pacifico', cursive" }}>Bar Lounge</h1>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[350px_650px_350px] p-4 max-w-[1600px] mx-auto">
        {/* Left - Chat */}
        <div className="h-full hidden lg:flex">
          <LoungeChat />
        </div>

        {/* Center - Video */}
        <div className="h-full flex items-center justify-center w-full">
          <div className="w-full h-full">
            <VideoStage />
          </div>
        </div>

        {/* Right - Requests & Summary */}
        <div className="hidden lg:flex flex-col gap-4 h-full">
          <div className="flex-1">
            <IncomingRequests />
          </div>
          <SummaryPanel />
        </div>
      </div>
    </div>
  );
};

export default Index;
