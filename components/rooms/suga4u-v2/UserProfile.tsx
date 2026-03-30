const UserProfile = ({ name = "Alexis Rose", avatarUrl }: { name?: string; avatarUrl?: string | null }) => (
    <div className="flex items-center gap-3">
        <div className="text-right">
            <p className="text-[10px] text-gold tracking-wider">Gold Tier</p>
            <p className="text-sm font-bold">{name}</p>
        </div>
        <div className="relative">
            {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-9 h-9 rounded-full object-cover border-2 border-gold" />
            ) : (
                <div className="w-9 h-9 rounded-full bg-muted border-2 border-gold flex items-center justify-center text-sm">👩</div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-background" />
        </div>
    </div>
);

export default UserProfile;
