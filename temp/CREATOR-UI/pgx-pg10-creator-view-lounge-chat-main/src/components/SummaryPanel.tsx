const stats = [
  { label: "Fans", value: "2,491" },
  { label: "Drinks", value: "18" },
  { label: "Tips", value: "5,210" },
  { label: "Requests", value: "46" },
];

const SummaryPanel = () => {
  return (
    <div className="glass-panel p-4">
      <h2 className="text-lg font-semibold gold-text font-serif mb-3">Summary</h2>
      <div className="space-y-2">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{stat.label}</span>
            <span className="text-sm font-semibold text-foreground">{stat.value}</span>
          </div>
        ))}
      </div>
      {/* <div className="mt-4 pt-3 border-t border-border">
        <p className="text-2xl font-bold text-center earnings-glow font-serif">$26,050.00</p>
      </div> */}
    </div>
  );
};

export default SummaryPanel;
