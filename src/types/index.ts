export type Tab = 'dashboard' | 'users' | 'settings' | 'momentum' | 'user-profile' | 'deal-room' | 'subscriptions' | 'courses' | 'leaderboard' | 'badges' | 'notifications' | 'ai-agent' | 'ai-settings' | 'signup-questions' | 'admin-notifications' | 'webinars';

export interface DiagnosisQuestionOption {
    text: string;
    blocker_type: 'leadGeneration' | 'confidence' | 'closing' | 'discipline';
    score: number;
}

export interface DiagnosisQuestion {
    id: number;
    question_text: string;
    display_order: number;
    is_active: boolean;
    options: DiagnosisQuestionOption[];
}

export interface NotificationBroadcast {
    id: number;
    title: string;
    body: string;
    display_style: 'standard' | 'banner' | 'silent';
    audience: 'all' | 'tier' | 'users';
    tier?: string | null;
    target_user_ids?: number[] | null;
    scheduled_at?: string | null;
    recurrence_type: 'none' | 'daily' | 'weekly';
    recurrence_time?: string | null;
    recurrence_day_of_week?: number | null;
    timezone: string;
    status: string;
    next_run_at?: string | null;
    last_run_at?: string | null;
    deep_link?: string | null;
    extra_data?: Record<string, string> | null;
    last_sent_count?: number;
    last_error?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface NotificationSetting {
    id: number;
    key: string;
    name: string;
    description: string | null;
    is_enabled: boolean;
    default_title: string | null;
    default_body: string | null;
    trigger_settings: Record<string, any> | null;
    created_at: string;
    updated_at: string;
}

// ... (existing interfaces)

export interface ChatSession {
    id: number;
    title: string;
    created_at?: string;
    updated_at?: string;
}

export interface AdminAiUserSummary {
    id: number;
    name?: string;
    email: string;
    membership_tier?: 'Consultant' | 'Rainmaker' | 'Titan' | string;
    is_premium?: boolean;
    status?: string;
    ai_tokens_today: number;
    ai_calls_today: number;
    ai_tokens_total: number;
    ai_calls_total: number;
}

export interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    created_at?: string;
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
    total_tokens?: number | null;
    model?: string | null;
}

export interface AiHumanTicket {
    id: number;
    user_id: number;
    chat_session_id?: number | null;
    request_message?: string | null;
    admin_resolution?: string | null;
    resolved_at?: string | null;
    status: string;
    created_at?: string;
    updated_at?: string;
}

export interface Course {
    id: number;
    title: string;
    description: string;
    thumbnail_url?: string;
    url: string;
    min_tier: 'Consultant' | 'Rainmaker' | 'Titan';
    module_number?: number;
    sequence?: number;
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
    /** ISO timestamp when user requested account deletion from the app (admin queue). */
    deletion_requested_at?: string | null;
    created_at?: string;
    updated_at?: string;
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
    timezone?: string;
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
    description?: string;
    script_idea?: string;
    task_description?: string;
    video_reel_script_idea?: string;
    daily_feedback?: string | null;
    today_day_number?: number;
    has_daily_log?: boolean;
    points: number;
    category: 'conscious' | 'subconscious';
    section_title?: string;
    section_order?: number;
    item_order?: number;
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

export interface Webinar {
    id: number;
    title: string;
    description: string | null;
    zoom_link: string | null;
    image_url: string | null;
    scheduled_at: string | null;
    is_active: boolean;
    is_promotional: boolean;
    target_tier: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface DailyLogEntry {
    day_number: number;
    day_title: string | null;
    task_title: string | null;
    script_title: string | null;
    task_description: string | null;
    script_idea: string | null;
    feedback: string | null;
    audio_url: string | null;
    required_listen_percent: number | null;
    require_user_response: boolean | null;
    notification_enabled: boolean | null;
    morning_reminder_enabled: boolean | null;
    evening_reminder_enabled: boolean | null;
    morning_reminder_time: string | null;
    evening_reminder_time: string | null;
    is_mcq: boolean | null;
    mcq_question: string | null;
    mcq_options: string[] | null;
    mcq_correct_option: number | null;
}
