export interface Profile {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    website: string | null;
    bio: string | null;
    role: string | null;
    location?: string | null;
    created_at?: string | null;
    cover_url?: string | null;
    subscription_price_weekly?: number | null;
    subscription_price_monthly?: number | null;
}

export interface Subscription {
    id: string;
    user_id: string;
    creator_id: string;
    tier: 'weekly' | 'monthly';
    status: 'active' | 'cancelled' | 'expired';
    current_period_end: string;
    created_at: string;
    creator?: Profile;
}
