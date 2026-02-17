import type { HealthStatus, User, ActivityType, SubscriptionPackage, Coupon, UserSubscription, Course, LeaderboardEntry, LeaderboardCategory, Badge } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000/api' : '/api');
console.log('API Base URL:', API_BASE_URL);

export const apiClient = {
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
    getStats: async (): Promise<{ total_users: number; active_today: number; total_activities: number; db_connected: boolean }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/stats`);
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            throw error;
        }
    },
    getUsers: async (): Promise<User[]> => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users`);
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        } catch (error) {
            console.error('Failed to fetch users:', error);
            throw error;
        }
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
    getPackages: async (): Promise<{ success: boolean; data: SubscriptionPackage[] }> => {
        const response = await fetch(`${API_BASE_URL}/admin/packages`);
        return response.json();
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
        const response = await fetch(`${API_BASE_URL}/admin/subscriptions`);
        return response.json();
    },
    getCoupons: async (): Promise<{ success: boolean; data: Coupon[] }> => {
        const response = await fetch(`${API_BASE_URL}/admin/coupons`);
        return response.json();
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
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/activity-types`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
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
    deleteActivityType: async (id: number): Promise<{ success: boolean }> => {
        const response = await fetch(`${API_BASE_URL}/admin/activity-types/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },
    getUserActivityPoints: async (): Promise<{ success: boolean; points: number }> => {
        const response = await fetch(`${API_BASE_URL}/admin/settings/user-activity-points`);
        return response.json();
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
        const response = await fetch(`${API_BASE_URL}/admin/courses`);
        return response.json();
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
    }
};


