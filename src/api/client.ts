import type { HealthStatus, User, ActivityType, SubscriptionPackage, Coupon, UserSubscription, Course, LeaderboardEntry, LeaderboardCategory, Badge, NotificationBroadcast, ChatSession, ChatMessage, AdminAiUserSummary, AiHumanTicket, DiagnosisQuestion, DiagnosisQuestionOption, DailyLogEntry, Webinar } from '../types';

/** Default `/api` uses Vite dev proxy → http://127.0.0.1:8000 (see vite.config.ts). Override with VITE_API_BASE_URL for production or a remote API. */
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

const parseJsonSafely = async <T>(response: Response, fallbackMessage: string): Promise<T> => {
    const text = await response.text();
    try {
        return JSON.parse(text) as T;
    } catch {
        const shortBody = text.slice(0, 160).replace(/\s+/g, ' ').trim();
        return {
            success: false,
            message: `${fallbackMessage} (HTTP ${response.status}). Response: ${shortBody || 'empty'}`
        } as T;
    }
};

const buildAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const authorizedFetch = async <T>(
    path: string,
    init: RequestInit = {},
    fallbackMessage = 'Request failed'
): Promise<T> => {
    const headers: Record<string, string> = {
        ...(init.headers as Record<string, string> ?? {}),
        ...buildAuthHeaders(),
    };
    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
    const parsed = await parseJsonSafely<any>(response, fallbackMessage);
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken');
        throw new Error(parsed?.message || 'Session expired. Please log in again.');
    }
    if (!response.ok) {
        throw new Error(parsed?.message || `${fallbackMessage} (HTTP ${response.status})`);
    }
    return parsed as T;
};

export const apiClient = {
    getBaseUrl: () => API_BASE_URL,
    login: async (email: string, password: string): Promise<{ status: string; token: string; message?: string }> => {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return response.json();
    },
    getHealth: async (): Promise<HealthStatus> => {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        } catch (error) {
            console.error('Failed to fetch health status:', error);
            throw error;
        }
    },
    getStats: async (): Promise<{ total_users: number; active_today: number; total_activities: number; db_connected: boolean; pending_deletion_requests?: number }> => {
        return authorizedFetch('/admin/stats', {}, 'Failed to fetch stats');
    },
    getUsers: async (): Promise<User[]> => {
        return authorizedFetch('/admin/users', {}, 'Failed to fetch users');
    },
    toggleUserStatus: async (userId: number): Promise<{ status: string; message: string }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/toggle-status`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Failed to toggle status');
            return response.json();
        } catch (error) {
            console.error('Error toggling status:', error);
            throw error;
        }
    },
    deleteUser: async (userId: number): Promise<{ success: boolean; message: string }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete user');
            return response.json();
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },
    getUserPerformance: async (userId: number): Promise<{ success: boolean; data: any[] }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/performance`);
            if (!response.ok) throw new Error('Failed to fetch performance data');
            return response.json();
        } catch (error) {
            console.error('Error fetching performance:', error);
            throw error;
        }
    },
    getUserActivities: async (userId: number): Promise<{ success: boolean; data: any[] }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/activities`);
            if (!response.ok) throw new Error('Failed to fetch user activities');
            return response.json();
        } catch (error) {
            console.error('Error fetching activities:', error);
            throw error;
        }
    },
    getUserRevenueMetrics: async (userId: number): Promise<{ success: boolean; data: { hot_leads: number; deals_closed: number; total_commission: number; top_source: string | null; recent_activity: any[] } }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/revenue-metrics`);
            if (!response.ok) throw new Error('Failed to fetch revenue metrics');
            return response.json();
        } catch (error) {
            console.error('Error fetching revenue metrics:', error);
            throw error;
        }
    },
    getUserCourseDetail: async (userId: number): Promise<{
        success: boolean;
        data: {
            subscription: { package_name: string; expires_at: string } | null;
            course_progress: any[];
            exam_attempts: any[];
            material_progress: any[];
        };
    }> => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/course-detail`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!response.ok) throw new Error('Failed to fetch course detail');
            return response.json();
        } catch (e) {
            console.error('Error fetching user course detail:', e);
            throw e;
        }
    },
    getUserResults: async (userId: number, params?: { type?: string; source?: string }): Promise<{ success: boolean; data: any[] }> => {
        try {
            const q = new URLSearchParams();
            if (params?.type) q.set('type', params.type);
            if (params?.source) q.set('source', params.source);
            const url = `${API_BASE_URL}/admin/users/${userId}/results${q.toString() ? '?' + q : ''}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch results');
            return response.json();
        } catch (error) {
            console.error('Error fetching results:', error);
            throw error;
        }
    },
    getPackages: async (): Promise<{ success: boolean; data: SubscriptionPackage[] }> => {
        return authorizedFetch('/admin/packages', {}, 'Failed to fetch packages');
    },
    createPackage: async (data: Partial<SubscriptionPackage>): Promise<{ success: boolean; data: SubscriptionPackage }> => {
        const response = await fetch(`${API_BASE_URL}/admin/packages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    updatePackage: async (id: number, data: Partial<SubscriptionPackage>): Promise<{ success: boolean; data: SubscriptionPackage }> => {
        const response = await fetch(`${API_BASE_URL}/admin/packages/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    deletePackage: async (id: number): Promise<{ success: boolean }> => {
        const response = await fetch(`${API_BASE_URL}/admin/packages/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },
    getSubscriptions: async (): Promise<{ success: boolean; data: UserSubscription[] }> => {
        return authorizedFetch('/admin/subscriptions', {}, 'Failed to fetch subscriptions');
    },
    getCoupons: async (): Promise<{ success: boolean; data: Coupon[] }> => {
        return authorizedFetch('/admin/coupons', {}, 'Failed to fetch coupons');
    },
    createCoupon: async (data: Partial<Coupon>): Promise<{ success: boolean; data: Coupon }> => {
        const response = await fetch(`${API_BASE_URL}/admin/coupons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    deleteCoupon: async (id: number): Promise<{ success: boolean }> => {
        const response = await fetch(`${API_BASE_URL}/admin/coupons/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },
    purchaseSubscription: async (data: { package_id: number; months: number; coupon_id?: number; payment_id: string }): Promise<{ success: boolean; data: UserSubscription }> => {
        const response = await fetch(`${API_BASE_URL}/subscriptions/purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    validateCoupon: async (code: string): Promise<{ success: boolean; data: Coupon; message?: string }> => {
        const response = await fetch(`${API_BASE_URL}/subscriptions/validate-coupon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        return response.json();
    },
    logActivity: async (data: { type: string; category: string; quantity?: number; value?: number; notes?: string }) => {
        const token = localStorage.getItem('adminToken'); // Using admin token for testing
        const response = await fetch(`${API_BASE_URL}/activities/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    getMomentum: async () => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/dashboard/momentum`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },
    getMomentumLeaders: async (): Promise<any[]> => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/momentum-leaders`);
            if (!response.ok) throw new Error('Failed to fetch leaders');
            return response.json();
        } catch (error) {
            console.error('Error fetching leaders:', error);
            throw error;
        }
    },
    getActivityTypes: async (): Promise<{ success: boolean; data: ActivityType[] }> => {
        return authorizedFetch('/activity-types', {}, 'Failed to fetch activity types');
    },
    createActivityType: async (data: Partial<ActivityType>, isAdmin = false): Promise<{ success: boolean; data: ActivityType }> => {
        const token = localStorage.getItem('adminToken');
        const endpoint = isAdmin ? '/admin/activity-types' : '/activity-types';
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    updateActivityType: async (id: number, data: Partial<ActivityType>): Promise<{ success: boolean; data: ActivityType }> => {
        const response = await fetch(`${API_BASE_URL}/admin/activity-types/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    updateActivityGroup: async (data: { category: 'conscious' | 'subconscious'; current_section_title: string; section_title: string; section_order: number }): Promise<{ success: boolean; data: ActivityType[] }> => {
        const response = await fetch(`${API_BASE_URL}/admin/activity-types/group-update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    deleteActivityType: async (id: number): Promise<{ success: boolean }> => {
        const response = await fetch(`${API_BASE_URL}/admin/activity-types/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },
    getActivityTypeDailyLogs: async (id: number, fromDay = 1, toDay = 60): Promise<{ success: boolean; data: DailyLogEntry[] }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/activity-types/${id}/daily-logs?from_day=${fromDay}&to_day=${toDay}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },
    upsertActivityTypeDailyLog: async (id: number, day: number, data: {
        day_title?: string | null;
        task_title?: string | null;
        script_title?: string | null;
        task_description?: string;
        script_idea?: string;
        feedback?: string;
        audio_url?: string | null;
        required_listen_percent?: number;
        require_user_response?: boolean;
        notification_enabled?: boolean;
        morning_reminder_enabled?: boolean;
        evening_reminder_enabled?: boolean;
        morning_reminder_time?: string | null;
        evening_reminder_time?: string | null;
        is_mcq?: boolean;
        mcq_question?: string | null;
        mcq_options?: string[] | null;
        mcq_correct_option?: number | null;
    }): Promise<{ success: boolean; data: any }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/activity-types/${id}/daily-logs/${day}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    deleteActivityTypeDailyLog: async (
        id: number,
        day: number
    ): Promise<{ success: boolean; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/activity-types/${id}/daily-logs/${day}`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch {
            return {
                success: false,
                message: `Delete endpoint returned non-JSON (HTTP ${response.status}). ${text.slice(0, 140)}`
            };
        }
    },
    bulkUpsertActivityTypeDailyLogs: async (id: number, entries: Array<{
        day_number: number;
        day_title?: string | null;
        task_title?: string | null;
        script_title?: string | null;
        task_description?: string;
        script_idea?: string;
        feedback?: string;
        audio_url?: string;
        required_listen_percent?: number;
        require_user_response?: boolean;
        notification_enabled?: boolean;
        morning_reminder_enabled?: boolean;
        evening_reminder_enabled?: boolean;
        morning_reminder_time?: string;
        evening_reminder_time?: string;
        is_mcq?: boolean;
        mcq_question?: string | null;
        mcq_options?: string[] | null;
        mcq_correct_option?: number | null;
    }>): Promise<{ success: boolean; count: number }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/activity-types/${id}/daily-logs/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: JSON.stringify({ entries })
        });
        return response.json();
    },
    getUserActivityPoints: async (): Promise<{ success: boolean; points: number }> => {
        return authorizedFetch('/admin/settings/user-activity-points', {}, 'Failed to load activity points');
    },
    setUserActivityPoints: async (points: number): Promise<{ success: boolean; points: number }> => {
        const response = await fetch(`${API_BASE_URL}/admin/settings/user-activity-points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points })
        });
        return response.json();
    },
    // Courses
    getCourses: async (): Promise<{ success: boolean; data: Course[] }> => {
        return authorizedFetch('/admin/courses', {}, 'Failed to fetch courses');
    },
    createCourse: async (data: Partial<Course>): Promise<{ success: boolean; data: Course }> => {
        const response = await fetch(`${API_BASE_URL}/admin/courses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    updateCourse: async (id: number, data: Partial<Course>): Promise<{ success: boolean; data: Course }> => {
        const response = await fetch(`${API_BASE_URL}/admin/courses/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    deleteCourse: async (id: number): Promise<{ success: boolean }> => {
        const response = await fetch(`${API_BASE_URL}/admin/courses/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },
    getCourseDetails: async (id: number): Promise<{ success: boolean; data: any }> => {
        const response = await fetch(`${API_BASE_URL}/admin/courses/${id}`);
        return response.json();
    },
    // Modules
    createModule: async (courseId: number, data: any): Promise<{ success: boolean; data: any }> => {
        const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/modules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    updateModule: async (id: number, data: any): Promise<{ success: boolean; data: any }> => {
        const response = await fetch(`${API_BASE_URL}/admin/modules/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    deleteModule: async (id: number): Promise<{ success: boolean }> => {
        const response = await fetch(`${API_BASE_URL}/admin/modules/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },
    // Lessons
    createLesson: async (moduleId: number, data: any): Promise<{ success: boolean; data: any }> => {
        const response = await fetch(`${API_BASE_URL}/admin/modules/${moduleId}/lessons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    updateLesson: async (id: number, data: any): Promise<{ success: boolean; data: any }> => {
        const response = await fetch(`${API_BASE_URL}/admin/lessons/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    deleteLesson: async (id: number): Promise<{ success: boolean }> => {
        const response = await fetch(`${API_BASE_URL}/admin/lessons/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },
    // Materials
    createMaterial: async (lessonId: number, data: any): Promise<{ success: boolean; data: any }> => {
        const response = await fetch(`${API_BASE_URL}/admin/lessons/${lessonId}/materials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    updateMaterial: async (id: number, data: any): Promise<{ success: boolean; data: any }> => {
        const response = await fetch(`${API_BASE_URL}/admin/materials/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    deleteMaterial: async (id: number): Promise<{ success: boolean }> => {
        const response = await fetch(`${API_BASE_URL}/admin/materials/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },
    // Course Exam (admin)
    getCourseExam: async (courseId: number): Promise<{ success: boolean; data: { id: number; title: string; passing_percent: number; time_minutes: number | null; questions: { id: number; question_text: string; options: string[]; correct_index: number; sequence: number }[] } | null }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/exam`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },
    createCourseExam: async (courseId: number, data: { title: string; passing_percent?: number; time_minutes?: number }): Promise<{ success: boolean; data: { id: number } }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/exam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    addExamQuestion: async (examId: number, data: { question_text: string; options: string[]; correct_index: number; sequence?: number }): Promise<{ success: boolean; data: { id: number } }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/exams/${examId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    uploadFile: async (file: File, type: string): Promise<{ success: boolean; url: string; name: string; message?: string }> => {
        const formData = new FormData();
        const token = localStorage.getItem('adminToken');
        formData.append('file', file);
        formData.append('type', type);
        const response = await fetch(`${API_BASE_URL}/admin/courses/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        return response.json();
    },
    uploadFileWithProgress: (file: File, type: string, onProgress: (percent: number) => void): Promise<{ success: boolean; url: string; name: string; message?: string }> => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            const token = localStorage.getItem('adminToken');
            formData.append('file', file);
            formData.append('type', type);

            const reportProgress = (loaded: number, total: number) => {
                let percent = 0;
                if (total > 0) {
                    percent = Math.round((loaded / total) * 100);
                } else if (file.size > 0 && loaded > 0) {
                    // Many proxies leave lengthComputable false; use the file size as a fallback.
                    percent = Math.min(99, Math.round((loaded / file.size) * 100));
                } else if (loaded > 0) {
                    percent = 50;
                }
                onProgress(Math.min(99, Math.max(1, percent)));
            };

            xhr.upload.addEventListener('loadstart', () => onProgress(2));
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && e.total > 0) {
                    reportProgress(e.loaded, e.total);
                } else if (e.loaded > 0) {
                    reportProgress(e.loaded, 0);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 400) {
                    reject(new Error(`Server error (${xhr.status}): ${xhr.responseText.substring(0, 100)}`));
                    return;
                }
                try {
                    const data = JSON.parse(xhr.responseText);
                    onProgress(100);
                    resolve(data);
                } catch {
                    console.error('SERVER RESPONSE ERROR:', xhr.responseText);
                    const snippet = xhr.responseText.substring(0, 150).replace(/<[^>]*>/g, '').trim();
                    reject(new Error(`Server sent non-JSON response: "${snippet || 'Empty or Binary'}"`));
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Upload failed')));
            xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

            xhr.open('POST', `${API_BASE_URL}/admin/courses/upload`);
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            onProgress(1);
            xhr.send(formData);
        });
    },
    // Leaderboard
    getLeaderboard: async (category: string, period: string): Promise<{ success: boolean; data: LeaderboardEntry[]; category: string; period: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/leaderboard?category=${category}&period=${period}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },
    getLeaderboardCategories: async (): Promise<{ success: boolean; data: LeaderboardCategory[] }> => {
        const response = await fetch(`${API_BASE_URL}/leaderboard/categories`);
        return response.json();
    },
    refreshLeaderboards: async (): Promise<{ success: boolean; message: string }> => {
        const response = await fetch(`${API_BASE_URL}/leaderboard/refresh`, { method: 'POST' });
        return response.json();
    },
    // Badges
    getBadges: async (): Promise<{ success: boolean; data: { badges: Badge[]; earned_count: number; total_count: number; completion_percent: number } }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/badges`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },
    getRecentBadges: async (): Promise<{ success: boolean; data: Badge[] }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/badges/recent`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },
    getDashboardStats: async (): Promise<{ success: boolean; data: any }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },
    getWeeklyReview: async (): Promise<{ success: boolean; data: any }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/weekly-review`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },

    getNotificationBroadcasts: async (): Promise<{ success: boolean; data: NotificationBroadcast[] }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },

    createNotificationBroadcast: async (payload: {
        title: string;
        body: string;
        display_style: 'standard' | 'banner' | 'silent';
        audience: 'all' | 'tier' | 'users';
        tier?: string;
        target_user_ids?: number[];
        scheduled_at?: string | null;
        recurrence_type: 'none' | 'daily' | 'weekly';
        recurrence_time?: string;
        recurrence_day_of_week?: number;
        timezone?: string;
        deep_link?: string;
        extra_data?: Record<string, string>;
    }): Promise<{ success: boolean; data?: NotificationBroadcast; errors?: Record<string, string[]>; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        return response.json();
    },

    cancelNotificationBroadcast: async (id: number): Promise<{ success: boolean; data?: NotificationBroadcast; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/notifications/${id}/cancel`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },

    sendNowNotificationBroadcast: async (id: number): Promise<{ success: boolean; data?: NotificationBroadcast; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/notifications/${id}/send-now`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },

    getDailyReminders: async (): Promise<{ success: boolean; data: any[] }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/daily-logs/all-reminders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },

    getWorkflowTriggers: async (): Promise<{ success: boolean; data: any[] }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/notifications/workflow-triggers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },

    updateWorkflowTrigger: async (id: number, payload: any): Promise<{ success: boolean }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/notifications/workflow-triggers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        return response.json();
    },

    getNotificationSettings: async (): Promise<any[]> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/notification-settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },

    createNotificationSetting: async (payload: any): Promise<any> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/notification-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        return response.json();
    },

    updateNotificationSetting: async (id: number, payload: any): Promise<any> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/notification-settings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        return response.json();
    },

    // Admin: signup diagnosis questions
    getAdminDiagnosisQuestions: async (): Promise<{ success: boolean; data: DiagnosisQuestion[]; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/diagnosis/questions`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return parseJsonSafely(response, 'Unable to load signup questions');
    },

    createAdminDiagnosisQuestion: async (payload: {
        question_text: string;
        display_order: number;
        is_active?: boolean;
        options: DiagnosisQuestionOption[];
    }): Promise<{ success: boolean; data?: { id: number }; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/diagnosis/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
        });
        return parseJsonSafely(response, 'Unable to create signup question');
    },

    updateAdminDiagnosisQuestion: async (id: number, payload: {
        question_text: string;
        display_order: number;
        is_active: boolean;
        options: DiagnosisQuestionOption[];
    }): Promise<{ success: boolean; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/diagnosis/questions/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
        });
        return parseJsonSafely(response, 'Unable to update signup question');
    },

    deleteAdminDiagnosisQuestion: async (id: number): Promise<{ success: boolean; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/diagnosis/questions/${id}`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return parseJsonSafely(response, 'Unable to delete signup question');
    },

    // Reven AI Agent (chat + history)
    getAiChatSessions: async (): Promise<{ success: boolean; sessions?: ChatSession[]; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/chat/history`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },

    getAiChatMessages: async (sessionId: number): Promise<{ success: boolean; session_id?: number; messages?: ChatMessage[]; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/chat/history/${sessionId}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },

    getEbooks: async (): Promise<{ success: boolean; data: any[] }> => {
        return authorizedFetch<{ success: boolean; data: any[] }>('/admin/ebooks', {}, 'Failed to fetch ebooks');
    },
    createEbook: async (data: any): Promise<{ success: boolean; data: any }> => {
        return authorizedFetch<{ success: boolean; data: any }>('/admin/ebooks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }, 'Failed to create ebook');
    },
    updateEbook: async (id: number, data: any): Promise<{ success: boolean; data: any }> => {
        return authorizedFetch<{ success: boolean; data: any }>(`/admin/ebooks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }, 'Failed to update ebook');
    },
    deleteEbook: async (id: number): Promise<{ success: boolean }> => {
        return authorizedFetch<{ success: boolean }>(`/admin/ebooks/${id}`, {
            method: 'DELETE'
        }, 'Failed to delete ebook');
    },

    sendAiChatMessage: async (payload: { message: string; session_id?: number | null }): Promise<{
        success: boolean;
        reply?: string;
        session_id?: number;
        courses?: unknown[] | null;
        commands?: unknown[] | null;
        message?: string;
    }> => {
        const token = localStorage.getItem('adminToken');
        const body = {
            message: payload.message,
            session_id: payload.session_id ?? null
        };

        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(body)
        });

        return response.json();
    },

    deleteAiChatSession: async (sessionId: number): Promise<{ success: boolean; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/chat/history/${sessionId}`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },

    // Admin: AI Inbox monitoring
    getAdminAiUsers: async (): Promise<{ success: boolean; data?: AdminAiUserSummary[]; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/ai/users`, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },

    getAdminAiUserSessions: async (userId: number): Promise<{ success: boolean; data?: ChatSession[]; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/ai/users/${userId}/sessions`, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },

    getAdminAiSessionMessages: async (sessionId: number): Promise<{ success: boolean; data?: ChatMessage[]; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/ai/sessions/${sessionId}/messages`, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },

    getAdminAiUserKb: async (userId: number): Promise<{ success: boolean; data?: { tier: string; courses: Course[] }; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/ai/users/${userId}/kb`, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },

    getAdminAiSettings: async (): Promise<{
        success: boolean;
        data?: {
            provider: string;
            model: string;
            base_url?: string;
            api_key: string;
            has_api_key: boolean;
            knowledge_base: string;
            kb_blocks?: { id: string; title?: string; content: string; enabled?: boolean }[];
            behavior?: string;
            kb_sources?: { custom: boolean; courses: boolean };
            tier_allow?: { Consultant: boolean; Rainmaker: boolean; Titan: boolean };
        };
        message?: string;
    }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/ai/settings`, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },

    updateAdminAiSettings: async (payload: {
        provider?: string;
        model?: string;
        base_url?: string;
        api_key?: string;
        knowledge_base?: string;
        kb_blocks?: { id?: string; title?: string; content?: string; enabled?: boolean }[];
        behavior?: string;
        kb_sources?: { custom?: boolean; courses?: boolean };
        tier_allow?: { Consultant?: boolean; Rainmaker?: boolean; Titan?: boolean };
    }): Promise<{
        success: boolean;
        data?: {
            provider: string;
            model: string;
            base_url?: string;
            has_api_key: boolean;
            knowledge_base: string;
            kb_blocks?: { id: string; title?: string; content: string; enabled?: boolean }[];
            behavior?: string;
            kb_sources?: { custom: boolean; courses: boolean };
            tier_allow?: { Consultant: boolean; Rainmaker: boolean; Titan: boolean };
        };
        message?: string;
    }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/ai/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
        });
        return response.json();
    },

    getAdminAiUserUsage: async (userId: number): Promise<{ success: boolean; data?: { ai_tokens_today: number; ai_calls_today: number; ai_tokens_total: number; ai_calls_total: number }; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/ai/users/${userId}/usage`, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return parseJsonSafely(response, 'Failed to fetch AI usage');
    },

    uploadAdminAiKnowledgeBasePdf: async (payload: { pdf: File; mode?: 'append' | 'replace'; title?: string }): Promise<{ success: boolean; data?: { knowledge_base: string; kb_blocks?: { id: string; title?: string; content: string; enabled?: boolean }[] }; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const form = new FormData();
        form.append('pdf', payload.pdf);
        if (payload.mode) form.append('mode', payload.mode);
        if (payload.title) form.append('title', payload.title);

        const response = await fetch(`${API_BASE_URL}/admin/ai/settings/knowledge-base-pdf`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: form
        });

        return parseJsonSafely(response, 'Failed to upload PDF knowledge base');
    },

    replaceAdminAiKbBlockPdf: async (payload: { block_id: string; pdf: File; title?: string }): Promise<{ success: boolean; data?: { kb_blocks?: { id: string; title?: string; content: string; enabled?: boolean }[] }; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const form = new FormData();
        form.append('pdf', payload.pdf);
        if (payload.title) form.append('title', payload.title);

        const response = await fetch(`${API_BASE_URL}/admin/ai/settings/kb-block/${encodeURIComponent(payload.block_id)}/pdf`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: form
        });

        return parseJsonSafely(response, 'Failed to replace dataset PDF');
    },

    deleteAdminAiKbBlock: async (blockId: string): Promise<{ success: boolean; data?: { kb_blocks?: { id: string; title?: string; content: string; enabled?: boolean }[] }; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/ai/settings/kb-block/${encodeURIComponent(blockId)}`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return parseJsonSafely(response, 'Failed to delete dataset');
    },

    adminAiSendForUser: async (payload: { user_id: number; session_id?: number | null; message: string }): Promise<{ success: boolean; reply?: string; session_id?: number; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/ai/users/${payload.user_id}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ session_id: payload.session_id ?? null, message: payload.message })
        });
        return parseJsonSafely(response, 'Failed to send message');
    },

    // Admin: human handoff tickets
    createAdminAiTicket: async (payload: { user_id: number; chat_session_id?: number | null; request_message: string }): Promise<{ success: boolean; data?: AiHumanTicket; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/ai/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
        });
        return response.json();
    },

    resolveAdminAiTicket: async (ticketId: number, admin_resolution: string): Promise<{ success: boolean; data?: AiHumanTicket; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/ai/tickets/${ticketId}/resolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ admin_resolution })
        });
        return response.json();
    },

    getAdminAiTickets: async (): Promise<{ success: boolean; data?: AiHumanTicket[]; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/ai/tickets`, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },

    // AI Knowledge Base course visibility (admin)
    getAiCourseVisibility: async (courseId: number): Promise<{ success: boolean; data?: Record<string, boolean>; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/ai-visibility`, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },

    setAiCourseVisibility: async (
        courseId: number,
        tiers: { Consultant: boolean; Rainmaker: boolean; Titan: boolean }
    ): Promise<{ success: boolean; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/ai-visibility`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ tiers })
        });
        return response.json();
    },

    getBackups: async (): Promise<{ success: boolean; data: any[] }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/system/backups`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },

    downloadBackup: async (filename: string) => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/system/backups/download/${filename}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) throw new Error('Download failed');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    },

    deleteBackup: async (filename: string): Promise<{ success: boolean }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/system/backups/${filename}`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        return response.json();
    },

    getBackup: async (options: {
        db: boolean;
        media: boolean;
        moduleData?: boolean;
        userData?: boolean;
        modules?: string[];
        mediaTypes?: string[];
    }): Promise<{ success: boolean; data: any; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const query = new URLSearchParams({
            db: options.db ? '1' : '0',
            media: options.media ? '1' : '0',
            module_data: options.moduleData ? '1' : '0',
            user_data: options.userData ? '1' : '0',
        });
        if (options.modules?.length) {
            options.modules.forEach((key) => query.append('modules[]', key));
        }
        if (options.mediaTypes?.length) {
            options.mediaTypes.forEach((type) => query.append('media_types[]', type));
        }
        const response = await fetch(`${API_BASE_URL}/admin/system/backup?${query}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const parsed = await parseJsonSafely<{ success?: boolean; data?: any; message?: string }>(
            response,
            'Backup failed'
        );
        if (!response.ok || !parsed.success) {
            throw new Error(parsed.message || `Backup failed (HTTP ${response.status})`);
        }
        return { success: true, data: parsed.data, message: parsed.message };
    },

    getBackupModules: async (): Promise<{ success: boolean; data: Array<{ key: string; label: string; count: number; tables: string[] }>; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/system/backup/modules`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        return await parseJsonSafely(response, 'Failed to load backup modules');
    },

    restoreBackup: async (file: File): Promise<{ success: boolean; message: string }> => {
        const token = localStorage.getItem('adminToken');
        const formData = new FormData();
        formData.append('backup_file', file);
        formData.append('confirm_restore', '1');
        const response = await fetch(`${API_BASE_URL}/admin/system/restore`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
        });
        return response.json();
    },

    restoreBackupWithProgress: (file: File, onProgress: (percent: number) => void): Promise<{ success: boolean; message: string }> => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            const token = localStorage.getItem('adminToken');
            formData.append('backup_file', file);
            formData.append('confirm_restore', '1');

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    onProgress(percent);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 400) {
                    reject(new Error(`Server error (${xhr.status})`));
                    return;
                }
                try {
                    resolve(JSON.parse(xhr.responseText));
                } catch {
                    reject(new Error('Invalid server response'));
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error during restoration upload')));

            xhr.open('POST', `${API_BASE_URL}/admin/system/restore`);
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            xhr.send(formData);
        });
    },

    downloadLessonBackup: async (lessonId: number) => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/lessons/${lessonId}/backup`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error('Lesson backup download failed');
        const blob = await response.blob();
        const disposition = response.headers.get('content-disposition') || '';
        const matched = disposition.match(/filename="?([^"]+)"?/i);
        const filename = matched?.[1] || `lesson_${lessonId}_backup.zip`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    },

    downloadCourseBackup: async (courseId: number) => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/backup`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error('Course backup download failed');
        const blob = await response.blob();
        const disposition = response.headers.get('content-disposition') || '';
        const matched = disposition.match(/filename="?([^"]+)"?/i);
        const filename = matched?.[1] || `course_${courseId}_backup.zip`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    },

    restoreCourseBackup: async (courseId: number, file: File): Promise<{ success: boolean; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const formData = new FormData();
        formData.append('backup_file', file);
        const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/backup/restore`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });
        return parseJsonSafely(response, 'Course restore failed');
    },

    restoreLessonBackup: async (lessonId: number, file: File): Promise<{ success: boolean; message?: string; data?: any }> => {
        const token = localStorage.getItem('adminToken');
        const formData = new FormData();
        formData.append('backup_file', file);
        const response = await fetch(`${API_BASE_URL}/admin/lessons/${lessonId}/backup/restore`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });
        return parseJsonSafely(response, 'Lesson restore failed');
    },

    getPointsPerActivity: async (): Promise<{ success: boolean; data: { points_per_activity: number } }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/settings/user-activity-points`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await parseJsonSafely<{ success?: boolean; points?: number; message?: string }>(
            response,
            'Failed to load activity points'
        );
        if (!data.success) return { success: false, data: { points_per_activity: 0 } };
        return { success: true, data: { points_per_activity: Number(data.points ?? 0) } };
    },

    updatePointsPerActivity: async (points: number): Promise<{ success: boolean }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/settings/user-activity-points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ points })
        });
        return await parseJsonSafely(response, 'Failed to save activity points');
    },

    getAdminAppConfig: async (): Promise<{
        success?: boolean;
        data?: {
            maintenance_enabled?: boolean;
            maintenance_message?: string;
            min_android_version?: string;
            min_ios_version?: string;
            android_store_url?: string;
            ios_store_url?: string;
            updated_at?: string;
        };
        message?: string;
    }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/settings/app-config`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        return await parseJsonSafely(response, 'Failed to load app config');
    },

    updateAdminAppConfig: async (payload: {
        maintenance_enabled?: boolean;
        maintenance_message?: string;
        min_android_version?: string;
        min_ios_version?: string;
        android_store_url?: string;
        ios_store_url?: string;
    }): Promise<{ success?: boolean; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/settings/app-config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
        });
        return await parseJsonSafely(response, 'Failed to save app config');
    },

    syncActivityTypes: async (): Promise<{ success: boolean }> => {
        const response = await fetch(`${API_BASE_URL}/admin/activity-types/sync`, {
            method: 'POST'
        });
        return response.json();
    },

    changeUserPassword: async (userId: number, password: string): Promise<{ success: boolean; message: string }> => {
        return authorizedFetch(`/admin/users/${userId}/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        }, 'Failed to change user password');
    },

    /** Admin only: import Deal Room .xlsx into the practitioner’s hot leads (same format as mobile). */
    adminImportDealRoomExcel: async (
        userId: number,
        file: File
    ): Promise<{ success: boolean; message?: string; created?: number; updated?: number; skipped?: number }> => {
        const token = localStorage.getItem('adminToken');
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/import-excel`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });
        return await parseJsonSafely(response, 'Excel import failed');
    },

    /** Public: HTML for /privacy, /terms, and mobile WebView (no auth). */
    fetchLegalDocument: async (
        slug: 'privacy' | 'terms'
    ): Promise<{
        success?: boolean;
        title?: string;
        html?: string;
        updated_at?: string;
        message?: string;
    }> => {
        const response = await fetch(`${API_BASE_URL}/legal-documents/${slug}`);
        return await parseJsonSafely(response, 'Legal document request failed');
    },

    getAdminLegalDocument: async (
        slug: 'privacy' | 'terms'
    ): Promise<{
        success?: boolean;
        data?: { slug: string; title: string; body_html: string; updated_at?: string };
        message?: string;
    }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/legal-documents/${slug}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        return await parseJsonSafely(response, 'Failed to load legal document');
    },

    updateAdminLegalDocument: async (
        slug: 'privacy' | 'terms',
        payload: { title: string; body_html: string }
    ): Promise<{ success?: boolean; message?: string }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/legal-documents/${slug}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
        });
        return await parseJsonSafely(response, 'Failed to save legal document');
    },

    // Webinar Hub (Admin)
    getAdminWebinars: async (): Promise<{ success: boolean; data: Webinar[] }> => {
        return authorizedFetch('/admin/webinars', {}, 'Failed to load webinars');
    },

    createWebinar: async (payload: Partial<Webinar>): Promise<{ success: boolean; data: Webinar }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/webinars`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
        });
        return await parseJsonSafely(response, 'Failed to create webinar');
    },

    updateWebinar: async (id: number, payload: Partial<Webinar>): Promise<{ success: boolean; data: Webinar }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/webinars/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
        });
        return await parseJsonSafely(response, 'Failed to update webinar');
    },

    deleteWebinar: async (id: number): Promise<{ success: boolean }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/webinars/${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        return await parseJsonSafely(response, 'Failed to delete webinar');
    },

    notifyWebinar: async (id: number): Promise<{ success: boolean; message: string; broadcast_id: number }> => {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/admin/webinars/${id}/notify`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        return await parseJsonSafely(response, 'Failed to trigger webinar notification');
    },
};


