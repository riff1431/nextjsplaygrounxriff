import NavBar from "@/components/NavBar";
import CreatorSpotlight from "@/components/CreatorSpotlight";
import ConfessionWall from "@/components/ConfessionWall";
import RequestConfession from "@/components/RequestConfession";
import MyRequests from "@/components/MyRequests";
import RandomConfession from "@/components/RandomConfession";
import FloatingHearts from "@/components/FloatingHearts";
import bgFlames from "@/assets/bg-flames.png";
import { ScrollArea } from "@/components/ui/scroll-area";

const Index = () => {
  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      {/* Background image */}
      <div className="fixed inset-0 z-0">
        <img src={bgFlames} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/40" />
      </div>
      <FloatingHearts />

      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        <NavBar />

        <main className="flex-1 p-4 max-w-[1400px] mx-auto w-full overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
            {/* Left Column */}
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-2">
                <CreatorSpotlight />
                <MyRequests />
              </div>
            </ScrollArea>

            {/* Center Column - wider */}
            <div className="lg:col-span-2 h-full overflow-hidden">
              <ConfessionWall />
            </div>

            {/* Right Column */}
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-2">
                <RequestConfession />
                <RandomConfession />
              </div>
            </ScrollArea>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
