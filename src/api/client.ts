const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000/api`;

export interface HealthStatus {
    status: string;
    app: string;
    environment: string;
    db: {
        ok: boolean;
        error: string | null;
    };
    timestamp: string;
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
    status?: string;
    created_at?: string;
    diagnosis_scores?: any;
    onboarding_step?: number;
}

export const apiClient = {
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
    toggleUserStatus: async (userId: number): Promise<any> => {
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
    deleteUser: async (userId: number): Promise<any> => {
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
};
