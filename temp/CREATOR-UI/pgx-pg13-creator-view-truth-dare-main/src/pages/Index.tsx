import LiveChat from "@/components/LiveChat";
import StreamViewer from "@/components/StreamViewer";
import RoomEarnings from "@/components/RoomEarnings";
import GroupVoteCampaigns from "@/components/GroupVoteCampaigns";
import RequestPanel from "@/components/RequestPanel";
import SpinBottleRequests from "@/components/SpinBottleRequests";

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

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-3 lg:p-4">
      {/* Top row: Chat | Stream | Earnings */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-3 lg:gap-4 mb-3 lg:mb-4">
        <div className="h-[420px]">
          <LiveChat />
        </div>
        <div className="h-[420px]">
          <StreamViewer />
        </div>
        <div>
          <RoomEarnings />
        </div>
      </div>

      {/* Bottom row: GroupVote | Truth | Dare | SpinBottle */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_1fr_280px] gap-3 lg:gap-4">
        <div>
          <GroupVoteCampaigns />
        </div>
        <div>
          <RequestPanel title="Truth Requests" requests={truthRequests} accentColor="blue" />
        </div>
        <div>
          <RequestPanel title="Dare Requests" requests={dareRequests} accentColor="pink" />
        </div>
        <div>
          <SpinBottleRequests />
        </div>
      </div>
    </div>
  );
};

export default Index;
