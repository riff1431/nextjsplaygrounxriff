import { useState, useRef, useCallback } from "react";

const SEGMENTS = [
  { label: "Secret 1", color: "hsl(330, 90%, 45%)" },
  { label: "$5", color: "hsl(40, 95%, 50%)" },
  { label: "Secret 2", color: "hsl(310, 80%, 40%)" },
  { label: "$10", color: "hsl(35, 90%, 45%)" },
  { label: "Secret 3", color: "hsl(330, 85%, 50%)" },
  { label: "$25", color: "hsl(45, 95%, 55%)" },
  { label: "Secret 4", color: "hsl(300, 70%, 35%)" },
  { label: "$50", color: "hsl(40, 90%, 40%)" },
];

const RandomConfession = () => {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const wheelRef = useRef<SVGSVGElement>(null);

  const spin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    const extraSpins = 1440 + Math.random() * 1440; // 4-8 full spins
    setRotation((prev) => prev + extraSpins);
    setTimeout(() => setSpinning(false), 4000);
  }, [spinning]);

  const segCount = SEGMENTS.length;
  const anglePerSeg = 360 / segCount;
  const radius = 90;
  const cx = 100;
  const cy = 100;

  return (
    <div className="glass-card p-4 space-y-3 overflow-hidden relative">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold tracking-wide">Random Confession</h2>
        <span className="gold-text font-display font-bold text-sm">$8</span>
      </div>

      <div className="relative flex items-center justify-center">
        {/* Pointer */}
        <div className="absolute -top-1 z-20 w-0 h-0"
          style={{
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "18px solid hsl(40, 95%, 55%)",
            filter: "drop-shadow(0 0 6px hsl(40, 95%, 55%))",
          }}
        />

        <svg
          ref={wheelRef}
          viewBox="0 0 200 200"
          className="w-52 h-52 cursor-pointer drop-shadow-[0_0_25px_hsl(330,90%,55%,0.4)]"
          onClick={spin}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
          }}
        >
          {/* Outer ring glow */}
          <circle cx={cx} cy={cy} r={radius + 4} fill="none" stroke="hsl(330, 90%, 55%)" strokeWidth="2" opacity="0.5" />
          <circle cx={cx} cy={cy} r={radius + 2} fill="none" stroke="hsl(40, 95%, 55%)" strokeWidth="1" opacity="0.3" />

          {SEGMENTS.map((seg, i) => {
            const startAngle = (i * anglePerSeg - 90) * (Math.PI / 180);
            const endAngle = ((i + 1) * anglePerSeg - 90) * (Math.PI / 180);
            const x1 = cx + radius * Math.cos(startAngle);
            const y1 = cy + radius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(endAngle);
            const y2 = cy + radius * Math.sin(endAngle);
            const largeArc = anglePerSeg > 180 ? 1 : 0;

            const midAngle = ((i + 0.5) * anglePerSeg - 90) * (Math.PI / 180);
            const textR = radius * 0.62;
            const tx = cx + textR * Math.cos(midAngle);
            const ty = cy + textR * Math.sin(midAngle);
            const textRotation = (i + 0.5) * anglePerSeg;

            return (
              <g key={i}>
                <path
                  d={`M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={seg.color}
                  stroke="hsl(0, 0%, 10%)"
                  strokeWidth="1"
                />
                <text
                  x={tx}
                  y={ty}
                  fill="white"
                  fontSize="7"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
                >
                  {seg.label}
                </text>
              </g>
            );
          })}

          {/* Center hub */}
          <circle cx={cx} cy={cy} r="16" fill="hsl(260, 20%, 8%)" stroke="hsl(330, 90%, 55%)" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="12" fill="url(#centerGrad)" />
          <text x={cx} y={cy} fill="white" fontSize="8" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" fontFamily="Orbitron, sans-serif">
            $8
          </text>
          <defs>
            <radialGradient id="centerGrad">
              <stop offset="0%" stopColor="hsl(330, 90%, 55%)" />
              <stop offset="100%" stopColor="hsl(310, 80%, 35%)" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        className="w-full py-2.5 rounded-lg gradient-pink text-primary-foreground font-display font-bold text-xs tracking-wide neon-border hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {spinning ? "Spinning..." : "Spin to reveal a secret! ✨"}
      </button>
    </div>
  );
};

export default RandomConfession;
