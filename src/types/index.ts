export type Tab = 'dashboard' | 'users' | 'settings' | 'momentum' | 'user-profile' | 'subscriptions' | 'courses' | 'leaderboard' | 'badges';

// ... (existing interfaces)

export interface Course {
    id: number;
    title: string;
    description: string;
    url: string;
    min_tier: 'Consultant' | 'Rainmaker' | 'Titan';
    created_at: string;
    updated_at: string;
}

export interface HealthStatus {
    status: string;
    database: boolean;
    storage: boolean;
}

export interface User {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    phone_number?: string;
    profile_picture?: string;
    rank?: string;
    growth_score?: number;
    execution_rate?: number;
    mindset_index?: number;
    current_streak?: number;
    is_premium?: boolean;
    membership_tier?: 'Consultant' | 'Rainmaker' | 'Titan';
    is_admin?: boolean;
    status?: string;
    created_at?: string;
    diagnosis_scores?: {
        branding: number;
        lead_gen: number;
        sales: number;
        mindset: number;
    };
    daily_score?: number;
    today_subconscious?: number;
    today_conscious?: number;
    momentum_badge?: string;
    badge_color?: string;
    license_number?: string;
    premium_expires_at?: string;
    last_activity_date?: string;
    city?: string;
    brokerage?: string;
    instagram?: string;
    linkedin?: string;
    total_commission?: number;
    performance_history?: PerformanceMetric[];
}

export interface PerformanceMetric {
    id: number;
    user_id: number;
    date: string;
    subconscious_score: number;
    conscious_score: number;
    results_score: number;
    total_momentum_score: number;
    leads_generated: number;
    deals_closed: number;
    commission_earned: string;
    streak_count: number;
}

export interface ActivityType {
    id: number;
    name: string;
    points: number;
    category: 'conscious' | 'subconscious';
    icon: string;
    is_global: boolean;
    min_tier?: string;
}

export interface SubscriptionPackage {
    id: number;
    name: string;
    tier_level: number;
    price_monthly: number;
    description: string;
    features: string[];
    is_active: boolean;
}

export interface Coupon {
    id: number;
    code: string;
    discount_percentage: number;
    expires_at?: string;
    max_uses?: number;
    used_count: number;
    is_active: boolean;
}

export interface UserSubscription {
    id: number;
    user: User;
    package: SubscriptionPackage;
    started_at: string;
    expires_at: string;
    status: string;
    payment_method: string;
    payment_id: string;
    amount_paid: number;
    coupon?: Coupon;
    created_at: string;
}

export interface Badge {
    id: number;
    name: string;
    slug: string;
    description: string;
    icon: string;
    color: string;
    type: 'daily' | 'weekly' | 'monthly' | 'milestone' | 'special';
    rarity: number;
    earned?: boolean;
    earned_at?: string;
}

export interface UserBadge {
    id: number;
    user_id: number;
    badge_id: number;
    earned_at: string;
    badge: Badge;
}

export interface LeaderboardCategory {
    key: string;
    name: string;
    icon: string;
    period: 'daily' | 'weekly' | 'monthly';
    description: string;
}

export interface LeaderboardEntry {
    user_id: number;
    user: User;
    score: number;
    rank: number;
    metadata?: any;
    is_me?: boolean;
}

