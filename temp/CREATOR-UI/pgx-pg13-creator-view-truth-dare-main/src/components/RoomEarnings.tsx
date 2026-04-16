const RoomEarnings = () => {
  const items = [
    { label: "Tips", amount: "€0.00" },
    { label: "Truths", amount: "€0.00" },
    { label: "Dares", amount: "€0.00" },
    { label: "Custom", amount: "€0.00" },
  ];

  return (
    <div className="panel-bg rounded-xl neon-border-green p-4">
      <h3 className="font-bold text-foreground mb-3">Room Earnings</h3>
      <div className="text-center mb-4 py-3 rounded-lg neon-border-green glow-green">
        <p className="text-xs text-neon-green font-semibold tracking-wider uppercase">Total Earned</p>
        <p className="text-4xl font-black text-neon-green">$ 0.00</p>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="text-foreground font-medium">{item.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomEarnings;
