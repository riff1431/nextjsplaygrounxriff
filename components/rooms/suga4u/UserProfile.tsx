import { Bell, Volume2 } from "lucide-react";

const UserProfile = ({ name = "Alexis Rose" }: { name?: string }) => (
    <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-muted-foreground">
            <Volume2 className="w-4 h-4" />
            <Bell className="w-4 h-4" />
        </div>
        <div className="text-right">
            <p className="text-[10px] text-gold tracking-wider">Gold Tier</p>
            <p className="text-sm font-bold">{name}</p>
        </div>
        <div className="relative">
            <div className="w-9 h-9 rounded-full bg-muted border-2 border-gold flex items-center justify-center text-sm">👩</div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-background" />
        </div>
    </div>
);

export default UserProfile;
