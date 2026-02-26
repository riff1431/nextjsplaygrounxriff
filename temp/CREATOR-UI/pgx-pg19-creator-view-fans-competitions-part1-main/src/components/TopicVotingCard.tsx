const topics = [
  { name: "Short Skirts", votes: 182 },
  { name: "Wet T-Shirt", votes: 244 },
  { name: "School Teacher", votes: 199 },
  { name: "Cheer Captain", votes: 155 },
];

const TopicVotingCard = () => (
  <div className="glass-card neon-border rounded-lg p-6">
    <div className="flex items-center justify-between mb-1">
      <h2 className="text-xl font-semibold text-foreground">Topic Voting</h2>
      <span className="neon-badge text-[10px] px-3 py-1 rounded-full font-semibold uppercase">
        Voting Closed
      </span>
    </div>
    <p className="text-xs text-muted-foreground mb-4">
      Fans vote in advance. Admin locks and selects the winner 2 day before the event at 10:00 PM.
    </p>
    <div className="grid grid-cols-2 gap-3">
      {topics.map((t) => (
        <div key={t.name} className="flex items-center justify-between glass-card rounded-md px-4 py-3 border border-border/30">
          <div>
            <p className="text-foreground font-medium text-sm">{t.name}</p>
          </div>
            <p className="text-primary text-xs">{t.votes} votes</p>
         
          {/* <button className="vote-btn px-3 py-1.5 rounded-md text-xs font-semibold">
            Vote
          </button> */}
        </div>
      ))}
    </div>
  </div>
);

export default TopicVotingCard;
