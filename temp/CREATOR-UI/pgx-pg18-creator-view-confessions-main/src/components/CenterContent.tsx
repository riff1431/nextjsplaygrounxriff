import { useState } from "react";

interface RequestRow {
  id: number;
  fan: string;
  confession: string;
  emoji?: string;
}

const confessionRequests: RequestRow[] = [
  { id: 1, fan: "Mike92", confession: "I have a motto crush on you, Can I at home planes 11:" },
  { id: 2, fan: "JamesLover", confession: "Mintt's have ang mess thing write emtype stone 7!", emoji: "💜" },
  { id: 3, fan: "David89", confession: "Davidet and porter Acquard tqnary nawbe lip." },
  { id: 4, fan: "TommyBoy", confession: "Confession: is have sitting 32, you do bet mother." },
  { id: 5, fan: "Frank_H85", confession: "I have a coot t ocer meade, chintcen fron graff0." },
];

const randomRequests: RequestRow[] = [
  { id: 1, fan: "Jason25", confession: "Confant. Love have hanning slocc hav." },
  { id: 2, fan: "Max87", confession: "Maher the lower chirmpct exceeds pyt h. tmith migle?" },
  { id: 3, fan: "David89", confession: "That outfit is doing things to m,." },
  { id: 4, fan: "Max87", confession: "I have a pertior atbout ngi liteedq thumb." },
  { id: 5, fan: "EricFN", confession: "Confessions, poguetto hectericos." },
  { id: 6, fan: "Jason25", confession: "Confant. Love have hanning slocc hav." },
  { id: 7, fan: "Max87", confession: "Maher the lower chirmpct exceeds pyt h. tmith migle?" },
  { id: 8, fan: "David89", confession: "That outfit is doing things to m,." },
  { id: 9, fan: "Max87", confession: "I have a pertior atbout ngi liteedq thumb." },
  { id: 10, fan: "EricFN", confession: "Confessions, poguetto hectericos." },
];

const RequestTable = ({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: RequestRow[];
}) => {
  const [decisions, setDecisions] = useState<Record<number, "accepted" | "declined">>({});

  const handleAction = (id: number, action: "accepted" | "declined") => {
    setDecisions((prev) => ({ ...prev, [id]: action }));
  };

  return (
    <div className="glass-card p-5 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-foreground text-xl font-semibold">{title}</h2>
        {subtitle && <span className="text-muted-foreground text-sm">{subtitle}</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-2 px-2 font-medium">Fan</th>
              <th className="text-left py-2 px-2 font-medium">
                {title.includes("Confession") ? "Confession" : "Fans"}
              </th>
              <th className="text-center py-2 px-2 font-medium" colSpan={2}>Request</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="py-3 px-2 text-foreground font-medium whitespace-nowrap">
                  {row.fan} {row.emoji && <span>{row.emoji}</span>}
                </td>
                <td className="py-3 px-2 text-muted-foreground max-w-[250px] truncate">
                  {row.confession}
                </td>
                <td className="py-3 px-2 text-center" colSpan={2}>
                  {decisions[row.id] === "accepted" ? (
                    <span className="text-success font-medium">Accepted</span>
                  ) : decisions[row.id] === "declined" ? (
                    <span className="text-destructive font-medium">Declined</span>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleAction(row.id, "accepted")}
                        className="bg-gold/90 hover:bg-gold text-gold-foreground font-bold text-xs px-4 py-1.5 rounded transition-colors"
                      >
                        ACCEPT
                      </button>
                      <button
                        onClick={() => handleAction(row.id, "declined")}
                        className="border border-foreground/30 hover:border-foreground text-foreground font-bold text-xs px-4 py-1.5 rounded transition-colors"
                      >
                        DECLINE
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CenterContent = ({ variant = "confessions" }: { variant?: "confessions" | "random" }) => {
  const isConfessions = variant === "confessions";
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-4">
      <div className="flex-1 flex flex-col">
        <RequestTable
          title={isConfessions ? "Confessions Requests" : "Random Requests"}
          // subtitle={isConfessions ? "Ti mny you" : "Tip +1132079"}
          rows={isConfessions ? confessionRequests : randomRequests}
        />
      </div>
    </div>
  );
};

export default CenterContent;
