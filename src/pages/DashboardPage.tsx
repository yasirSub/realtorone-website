import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

interface DashboardPageProps {
    stats: {
        total_users: number;
        active_today: number;
        total_activities: number;
        db_connected: boolean;
    };
}

const DashboardPage: React.FC<DashboardPageProps> = ({ stats }) => {
    const [momentumData, setMomentumData] = useState<any>(null);
    const [weeklyReview, setWeeklyReview] = useState<any>(null);
    const [recentBadges, setRecentBadges] = useState<any[]>([]);

    useEffect(() => {
        // Fetch real dashboard stats
        apiClient.getDashboardStats().then(res => {
            if (res.success) {
                setMomentumData(res.data);
            }
        });

        // Fetch weekly review data
        apiClient.getWeeklyReview().then(res => {
            if (res.success) {
                setWeeklyReview(res.data);
            }
        });

        // Fetch recent badges
        apiClient.getRecentBadges().then(res => {
            if (res.success) {
                setRecentBadges(res.data);
            }
        });
    }, []);

    const momentumScore = momentumData?.growth_score || 0;
    const subcoScore = momentumData?.mindset_index || 0;
    const execScore = momentumData?.execution_rate || 0;
    const resultsScore = weeklyReview?.deals || 0;

    const getScoreColor = (score: number) => {
        if (score <= 40) return '#ef4444'; // Red
        if (score <= 70) return '#f59e0b'; // Orange
        return '#10b981'; // Green
    };

    const currentScoreColor = getScoreColor(momentumScore);

    return (
        <div className="view-container fade-in" style={{ padding: '0 20px 60px 20px' }}>
            {/* System Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 950, margin: 0, letterSpacing: '-1.5px' }}>GLOBAL OPERATIONS HUB</h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 700, marginTop: '5px', fontSize: '0.9rem', letterSpacing: '0.5px' }}>
                        SYSTEM_STATUS: <span style={{ color: stats.db_connected ? 'var(--success)' : 'var(--error)' }}>{stats.db_connected ? 'OPERATIONAL' : 'DEGRADED'}</span> |
                        LIVE_AGENTS: {stats.active_today}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>Operational Cycle</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px', alignItems: 'flex-start' }}>

                {/* PRIMARY MOMENTUM SECTOR */}
                <div className="glass-panel" style={{ padding: '50px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at center, ${currentScoreColor}10, transparent)`, pointerEvents: 'none' }}></div>

                    <h3 style={{ fontSize: '0.75rem', fontWeight: 950, color: 'var(--text-muted)', letterSpacing: '2.5px', marginBottom: '40px', textTransform: 'uppercase' }}>Growth Score Protocol</h3>

                    {/* Ring Container */}
                    <div style={{ position: 'relative', width: '280px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="280" height="280" viewBox="0 0 100 100">
                            {/* Background Track */}
                            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-app)" strokeWidth="8" />
                            {/* Progress Ring */}
                            <circle
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke={currentScoreColor}
                                strokeWidth="8"
                                strokeDasharray="283"
                                strokeDashoffset={283 - (283 * momentumScore) / 100}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s' }}
                            />
                        </svg>
                        <div style={{ position: 'absolute', textAlign: 'center' }}>
                            <div style={{ fontSize: '5rem', fontWeight: 950, lineHeight: 1, color: currentScoreColor, letterSpacing: '-3px' }}>{momentumScore}</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-muted)', marginTop: '5px' }}>{momentumData?.rank || 'STARTER'}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', width: '100%', marginTop: '50px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--text-muted)', marginBottom: '8px' }}>MINDSET</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 950 }}>{subcoScore}<span style={{ fontSize: '0.8rem', opacity: 0.4 }}>/100</span></div>
                            <div style={{ height: '4px', background: 'var(--bg-app)', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${subcoScore}%`, background: '#d946ef' }}></div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--text-muted)', marginBottom: '8px' }}>EXECUTION</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 950 }}>{execScore}<span style={{ fontSize: '0.8rem', opacity: 0.4 }}>/100</span></div>
                            <div style={{ height: '4px', background: 'var(--bg-app)', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${execScore}%`, background: '#a855f7' }}></div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--text-muted)', marginBottom: '8px' }}>WEEK_DEALS</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 950 }}>{resultsScore}<span style={{ fontSize: '0.8rem', opacity: 0.4 }}></span></div>
                            <div style={{ height: '4px', background: 'var(--bg-app)', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, resultsScore * 20)}%`, background: 'var(--primary)' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SIDE STATS & LOGS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    {/* DOPAMINE HUD */}
                    <div className="glass-panel" style={{ padding: '30px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ fontSize: '2rem' }}>🔥</div>
                                    <div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 950 }}>{momentumData?.current_streak || 0} DAYS</div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>CURRENT_STREAK</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ fontSize: '2rem' }}>💰</div>
                                    <div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 950 }}>AED {weeklyReview?.commission?.toLocaleString() || 0}</div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>WEEKLY_COMMISSION</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '15px', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--text-muted)', marginBottom: '10px' }}>WEEKLY REVIEW INSIGHT</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', lineHeight: '1.4' }}>
                                    {weeklyReview?.message || "Continue behavioral execution to generate weekly insights."}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RECENT BADGES */}
                    <div className="glass-panel" style={{ padding: '30px', flex: 1 }}>
                        <h4 style={{ fontSize: '0.7rem', fontWeight: 950, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '25px' }}>Recent Achievements</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {recentBadges.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No badges earned yet this period.</div>
                            ) : (
                                recentBadges.map((badge, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: i < recentBadges.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ fontSize: '1.2rem', background: 'var(--bg-app)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge.icon}</div>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{badge.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{badge.type.toUpperCase()} PROTOCOL</div>
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 950, color: 'var(--primary)', fontSize: '0.7rem' }}>{new Date(badge.earned_at).toLocaleDateString()}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* LOWER HUD - ACTIVITY LOGS */}
            <div style={{ marginTop: '40px' }} className="glass-panel">
                <div style={{ padding: '40px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 950, marginBottom: '5px' }}>Operational Capacity Audit</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '30px' }}>Global activity distribution for the current cycle.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                        <div style={{ padding: '20px', borderRadius: '15px', background: 'var(--bg-app)' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--text-muted)', marginBottom: '10px' }}>TOTAL_USERS</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 950 }}>{stats.total_users}</div>
                        </div>
                        <div style={{ padding: '20px', borderRadius: '15px', background: 'var(--bg-app)' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--text-muted)', marginBottom: '10px' }}>IDLE_AGENTS</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 950 }}>{stats.total_users - stats.active_today}</div>
                        </div>
                        <div style={{ padding: '20px', borderRadius: '15px', background: 'var(--bg-app)' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--text-muted)', marginBottom: '10px' }}>SYSTEM_THROUGHPUT</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 950 }}>{stats.total_activities}</div>
                        </div>
                        <div style={{ padding: '20px', borderRadius: '15px', background: 'var(--bg-app)' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--text-muted)', marginBottom: '10px' }}>DB_LATENCY</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--success)' }}>OPTIMAL</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
