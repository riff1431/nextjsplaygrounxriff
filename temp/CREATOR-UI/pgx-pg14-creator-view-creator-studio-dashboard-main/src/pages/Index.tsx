import studioBg from "@/assets/studio-bg.jpg";
import { DashboardHeader, StatsBar } from "@/components/DashboardHeader";
import { CreatorStudio } from "@/components/CreatorStudio";
import { SubscriptionSettings } from "@/components/SubscriptionSettings";
import { RecentRoomHistory } from "@/components/RecentRoomHistory";

const Index = () => {
  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${studioBg})` }}
      />
      <div className="fixed inset-0 bg-background/20" />

      {/* Content */}
      <div className="relative z-10 p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
        <DashboardHeader />
        <StatsBar />
        <CreatorStudio />
        <SubscriptionSettings />
        <RecentRoomHistory />
      </div>
    </div>
  );
};

export default Index;
