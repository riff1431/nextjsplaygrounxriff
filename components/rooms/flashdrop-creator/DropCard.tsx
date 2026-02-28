import { Plus } from "lucide-react";

interface DropCardProps {
    active?: boolean;
    size?: "sm" | "md" | "lg";
}

const DropCard = ({ active = false, size = "md" }: DropCardProps) => {
    const sizeClasses = {
        sm: "h-16 w-full",
        md: "h-16 w-full",
        lg: "h-28 w-full",
    };

    return (

        <div
            className={`glass-card rounded-lg flex items-center justify-center cursor-pointer ${sizeClasses[size]} ${active ? "neon-border-active" : ""
                }`}
        >

            <Plus className="text-primary animate-pulse-neon" size={size === "lg" ? 32 : 24} />
        </div>
    );
};

export default DropCard;
