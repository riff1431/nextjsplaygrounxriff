import TopBar from "@/components/TopBar";
import LeftSidebar from "@/components/LeftSidebar";
import CenterContent from "@/components/CenterContent";
import LiveChat from "@/components/LiveChat";
import FloatingHearts from "@/components/FloatingHearts";

const Index = () => {
  return (
    <div
      className="h-screen overflow-hidden bg-background relative"
      style={{
        backgroundImage: `url('/images/bg1.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-background/20" />
      <FloatingHearts />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen">
        <TopBar />
        <div className="flex-1 flex items-stretch gap-16 px-4 pb-4 overflow-hidden mx-40">
          <LeftSidebar />
          {/* <CenterContent variant="confessions" /> */}
          <CenterContent variant="random" />
          <LiveChat />
        </div>
      </div>
    </div>
  );
};

export default Index;
