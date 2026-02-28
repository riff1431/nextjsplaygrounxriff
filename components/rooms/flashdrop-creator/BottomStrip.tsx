import DropCard from "./DropCard";

const bundles = ["Weekend Bundle", "Backstage Bundle", "Bedroom Bundle"];

const BottomStrip = () => {
    return (
        <div className="grid grid-cols-3 gap-3">
            {bundles.map((label, i) => (
                <div key={i} className="flex flex-col gap-1">
                    <span className="text-xs font-semibold neon-text tracking-wide uppercase">
                        {label}
                    </span>
                    <DropCard size="md" />
                </div>
            ))}
        </div>
    );
};

export default BottomStrip;
