import { Bell, Volume2 } from "lucide-react";

const UserProfile = ({ name = "Suga Baby" }: { name?: string }) => (
    <div className="flex items-center gap-3">
        <div className="text-right">
            <h3 className="text-sm font-bold tracking-wide text-foreground">{name}</h3>
            <div className="flex items-center justify-end gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Online</span>
            </div>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-gold/30 p-0.5 bg-background">
            <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&auto=format&fit=crop"
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
            />
        </div>
    </div>
);

export default UserProfile;
