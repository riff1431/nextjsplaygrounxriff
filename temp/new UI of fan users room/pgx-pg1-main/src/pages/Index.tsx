import NavBar from "@/components/NavBar";
import CreatorSpotlight from "@/components/CreatorSpotlight";
import ConfessionWall from "@/components/ConfessionWall";
import RequestConfession from "@/components/RequestConfession";
import MyRequests from "@/components/MyRequests";
import RandomConfession from "@/components/RandomConfession";
import FloatingHearts from "@/components/FloatingHearts";
import bgFlames from "@/assets/bg-flames.png";

const Index = () => {
  return (
    <div className="min-h-screen relative">
      {/* Background image */}
      <div className="fixed inset-0 z-0">
        <img src={bgFlames} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/40" />
      </div>
      <FloatingHearts />

      <div className="relative z-10">
        <NavBar />

        <main className="p-4 max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <CreatorSpotlight />
              <MyRequests />
            </div>

            {/* Center Column - wider */}
            <div className="lg:col-span-2">
              <ConfessionWall />
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <RequestConfession />
              <RandomConfession />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
