const UserProfile = ({ name }: { name: string }) => (
    <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gold glow-text-gold uppercase">{name}</p>
            <div className="flex items-center justify-end gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Live Now</span>
            </div>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-gold/50 p-0.5 glow-gold">
            <div className="w-full h-full rounded-full bg-muted overflow-hidden">
                <img src="/rooms/suga4u/creator-photo.jpeg" alt="Avatar" className="w-full h-full object-cover" />
            </div>
        </div>
    </div>
);

export default UserProfile;
