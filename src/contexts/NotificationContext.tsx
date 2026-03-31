import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationAction {
    label: string;
    onClick: () => void;
    primary?: boolean;
}

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    description: string;
    meta?: string;
    timestamp?: string;
    actions?: NotificationAction[];
    duration?: number;
}

interface NotificationContextType {
    notifications: Notification[];
    history: Notification[];
    addNotification: (notification: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
    clearHistory: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [history, setHistory] = useState<Notification[]>(() => {
        const saved = localStorage.getItem('admin_notification_history');
        return saved ? JSON.parse(saved) : [];
    });

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const addNotification = useCallback((n: Omit<Notification, 'id'>) => {
        const id = Math.random().toString(36).substring(7);
        const newNotification = { ...n, id, timestamp: new Date().toISOString() };
        setNotifications((prev) => [...prev, newNotification]);
        
        // Push to persistent history
        setHistory((prev) => {
            const updated = [newNotification, ...prev].slice(0, 100);
            localStorage.setItem('admin_notification_history', JSON.stringify(updated));
            return updated;
        });

        if (n.duration !== 0) {
            setTimeout(() => {
                removeNotification(id);
            }, n.duration || 5000);
        }
    }, [removeNotification]);

    const clearHistory = useCallback(() => {
        setHistory([]);
        localStorage.removeItem('admin_notification_history');
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, history, addNotification, removeNotification, clearHistory }}>
            {children}
            <div className="notification-container">
                {notifications.map((n) => (
                    <div key={n.id} className="notification-toast">
                        <div className={`notification-icon-wrap ${n.type}`}>
                            {n.type === 'success' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            {n.type === 'error' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>}
                            {n.type === 'info' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>}
                            {n.type === 'warning' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>}
                        </div>
                        <div className="notification-body">
                            <div className="notification-header">
                                <span className="notification-title">{n.title}</span>
                                {n.meta && <span className="notification-meta">{n.meta}</span>}
                            </div>
                            <div className="notification-desc">{n.description}</div>
                            {n.actions && (
                                <div className="notification-actions">
                                    {n.actions.map((action, i) => (
                                        <button
                                            key={i}
                                            className={`notification-btn ${action.primary ? 'primary' : ''}`}
                                            onClick={() => {
                                                action.onClick();
                                                removeNotification(n.id);
                                            }}
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button className="notification-close" onClick={() => removeNotification(n.id)}>✕</button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within a NotificationProvider');
    return context;
};
