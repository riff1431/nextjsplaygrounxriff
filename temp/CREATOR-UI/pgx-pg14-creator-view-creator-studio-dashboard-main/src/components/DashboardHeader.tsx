import { DollarSign, Gift, Users, Play, Star, Lock, ChevronLeft, Bell, ChevronDown } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const StatCard = ({ icon, label, value, color }: StatCardProps) => (
  <div className="glass-card px-4 py-3 flex items-center gap-3 min-w-[140px]">
    <div className={`${color} shrink-0`}>{icon}</div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  </div>
);

export const StatsBar = () => {
  const stats: StatCardProps[] = [
    { icon: <DollarSign size={20} />, label: "Tips Earned", value: "$184", color: "text-neon-green" },
    { icon: <Gift size={20} />, label: "Gifts", value: "0", color: "text-neon-pink" },
    { icon: <Users size={20} />, label: "Total Followers", value: "0", color: "text-neon-cyan" },
    { icon: <Play size={20} />, label: "Active Rooms", value: "2", color: "text-neon-purple" },
    { icon: <Star size={20} />, label: "Subscribers", value: "0", color: "text-neon-yellow" },
    { icon: <Lock size={20} />, label: "Subscription Earnings", value: "$0", color: "text-neon-orange" },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
};

export const DashboardHeader = () => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-3xl md:text-4xl font-display italic neon-text-pink">
        Creator Studio Dashboard
      </h1>
      <p className="text-muted-foreground mt-1">Welcome back, @JenDoe</p>
    </div>
    <div className="flex items-center gap-3">
      <button className="glass-card px-4 py-2 flex items-center gap-2 text-sm hover:bg-secondary/50 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <button className="glass-card p-2 hover:bg-secondary/50 transition-colors">
        <Bell size={18} />
      </button>
      <button className="glass-card px-3 py-2 flex items-center gap-2 text-sm hover:bg-secondary/50 transition-colors">
        <div className="w-7 h-7 rounded-full bg-neon-pink/30 border border-neon-pink/50" />
        JenDoe <ChevronDown size={14} />
      </button>
    </div>
  </div>
);
