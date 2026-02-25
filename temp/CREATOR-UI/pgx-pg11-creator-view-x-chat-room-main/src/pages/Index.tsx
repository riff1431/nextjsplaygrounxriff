import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import LiveChat from "@/components/LiveChat";
import VideoFeeds from "@/components/VideoFeeds";
import IncomingRequests from "@/components/IncomingRequests";
import SummaryPanel from "@/components/SummaryPanel";

const Index = () => {
  return (
    <div
      className="min-h-screen w-full bg-background bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: "url('/images/casino-bg.jpeg')" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-background/20" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen overflow-hidden">
        {/* Top Bar */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-glass flex items-center px-4 py-3 relative"
        >
          <button className="flex items-center gap-1 text-foreground hover:text-primary transition-colors absolute left-4">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">Back</span>
          </button>
          <h1
            className="mx-auto text-2xl md:text-3xl gold-text"
            style={{ fontFamily: "'Pacifico', cursive" }}
          >
            Creators View for X Chat
          </h1>
        </motion.header>

        {/* Main 3-column layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr_400px] gap-3 px-3 pb-3 max-w-[1600px] mx-auto w-full overflow-hidden">
          {/* Left - Live Chat */}
          <div className="hidden lg:flex min-h-0">
            <LiveChat />
          </div>

          {/* Center - Video Feeds */}
          <div className="flex items-center justify-center w-full">
            <VideoFeeds />
          </div>

          {/* Right - Requests + Summary */}
          <div className="hidden lg:flex flex-col gap-1 min-h-0 overflow-y-auto scrollbar-thin">
            <IncomingRequests />
            <SummaryPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
