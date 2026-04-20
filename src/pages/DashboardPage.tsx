import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

interface DashboardPageProps {
    stats: {
        total_users: number;
        active_today: number;
        total_activities: number;
        db_connected: boolean;
        pending_deletion_requests?: number;
    };
}

const DashboardPage: React.FC<DashboardPageProps> = ({ stats }) => {
    const [momentumData, setMomentumData] = useState<any>(null);
    const [weeklyReview, setWeeklyReview] = useState<any>(null);
    const [recentBadges, setRecentBadges] = useState<any[]>([]);
    const [revenueStats, setRevenueStats] = useState<any>(null);

    useEffect(() => {
        apiClient.getDashboardStats().then(res => {
            if (res.success) setMomentumData(res.data);
        });

        apiClient.getWeeklyReview().then(res => {
            if (res.success) setWeeklyReview(res.data);
        });

        apiClient.getRecentBadges().then(res => {
            if (res.success) setRecentBadges(res.data);
        });

        apiClient.getUserRevenueMetrics(1).then(res => {
            if (res.success) setRevenueStats(res.data);
        });
    }, []);

    const momentumScore = momentumData?.growth_score || 0;
    const mindsetScore = momentumData?.mindset_index || 0;
    const execScore = momentumData?.execution_rate || 0;
    const consistencyScore = momentumData?.results_score || 0;

    const getStatusColor = (score: number) => {
        if (score <= 40) return '#ee5d50';
        if (score <= 70) return '#ffb547';
        return '#00e096';
    };

    const accentColor = getStatusColor(momentumScore);

    const pendingRemoval = stats.pending_deletion_requests ?? 0;

    return (
        <div className="view-container fade-in" style={{ padding: '0 10px 60px 10px' }}>
            {pendingRemoval > 0 ? (
                <div
                    className="glass-panel"
                    style={{
                        marginBottom: '24px',
                        padding: '14px 20px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                    }}
                >
                    <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 950, letterSpacing: '2px', color: '#fecaca', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Compliance queue
                        </div>
                        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                            <strong style={{ color: 'var(--text-main)' }}>{pendingRemoval}</strong> practitioner{pendingRemoval === 1 ? '' : 's'} requested data / account removal from the app. Open <strong>Registry</strong> and look for the red &quot;Data removal requested&quot; badge.
                        </div>
                    </div>
                    <span style={{
                        fontSize: '1.25rem',
                        fontWeight: 950,
                        color: '#fff',
                        background: '#dc2626',
                        padding: '8px 14px',
                        borderRadius: '10px',
                    }}>{pendingRemoval}</span>
                </div>
            ) : null}

            {/* Header: Adaptive Operational Context */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingTop: '20px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div className={`status-pulse ${stats.db_connected ? '' : 'error'}`}></div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase' }}>
                            {stats.db_connected ? 'Systems Verified' : 'System Anomaly Detected'}
                        </span>
                    </div>
                    <h1 className="text-outfit" style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, letterSpacing: '-1.5px', textTransform: 'uppercase' }}>
                        Operational <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Command</span>
                    </h1>
                </div>
                
                <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div className="card-heading" style={{ marginBottom: '4px' }}>Strategic Cycle</div>
                        <div className="text-outfit" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</div>
                    </div>
                    <div style={{ width: '1px', height: '40px', background: 'var(--glass-border)' }}></div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            className="btn-command" 
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
                            onClick={() => window.location.href = '/contact'}
                        >
                            SUPPORT CENTER
                        </button>
                        <button className="btn-command primary">GENERATE STRATEGIC REPORT</button>
                    </div>
                </div>
            </div>

            {/* Top Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🔥</div>
                    <div>
                        <div className="card-heading" style={{ marginBottom: '2px' }}>Streak</div>
                        <div className="metric-value" style={{ fontSize: '1.5rem' }}>{momentumData?.current_streak || 0} Days</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(0, 224, 150, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>💰</div>
                    <div>
                        <div className="card-heading" style={{ marginBottom: '2px' }}>Net Revenue</div>
                        <div className="metric-value" style={{ fontSize: '1.5rem' }}>AED {(revenueStats?.total_commission || 0).toLocaleString()}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>👥</div>
                    <div>
                        <div className="card-heading" style={{ marginBottom: '2px' }}>Network</div>
                        <div className="metric-value" style={{ fontSize: '1.5rem' }}>{stats.total_users} Agents</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(217, 70, 239, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>📡</div>
                    <div>
                        <div className="card-heading" style={{ marginBottom: '2px' }}>Throughput</div>
                        <div className="metric-value" style={{ fontSize: '1.5rem' }}>{(stats.total_activities / 1000).toFixed(1)}k <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Events</span></div>
                    </div>
                </div>
            </div>

            {/* Main Interactive Zone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '40px' }}>
                
                {/* Performance Analytics Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    <div className="glass-panel" style={{ padding: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                            <div>
                                <h3 className="text-outfit" style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Growth Protocol Analysis</h3>
                                <p className="metric-subtext">Real-time behavioral synthesis & engagement telemetry</p>
                            </div>
                            <div style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, color: accentColor, border: `1px solid ${accentColor}30` }}>
                                {momentumData?.rank?.toUpperCase() || 'EVALUATING'}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '60px' }}>
                            {/* High-Fidelity Tactical Arc Gauge (Research-Inspired) */}
                            <div style={{ position: 'relative', width: '220px', height: '140px', overflow: 'hidden' }}>
                                <svg width="220" height="220" viewBox="0 0 100 100">
                                    <path 
                                        d="M10,50 A40,40 0 1,1 90,50" 
                                        fill="none" 
                                        stroke="rgba(255,255,255,0.03)" 
                                        strokeWidth="8" 
                                        strokeLinecap="round" 
                                    />
                                    <path 
                                        d="M10,50 A40,40 0 1,1 90,50" 
                                        fill="none" 
                                        stroke={accentColor} 
                                        strokeWidth="8" 
                                        strokeDasharray="126" 
                                        strokeDashoffset={126 - (126 * momentumScore) / 100} 
                                        strokeLinecap="round" 
                                        style={{ transition: 'stroke-dashoffset 2.5s cubic-bezier(0.19, 1, 0.22, 1)' }}
                                    />
                                </svg>
                                <div style={{ position: 'absolute', bottom: '15%', left: 0, right: 0, textAlign: 'center' }}>
                                    <div className="text-outfit" style={{ fontSize: '3.8rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>{momentumScore}</div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: '2px', marginTop: '5px' }}>NET MOMENTUM</div>
                                </div>
                            </div>

                            {/* Detailed Indicators */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span className="card-heading" style={{ margin: 0, fontSize: '0.65rem' }}>Mindset Index</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>{mindsetScore}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${mindsetScore}%`, background: 'linear-gradient(90deg, var(--accent) 0%, #ff7bed 100%)', borderRadius: '10px' }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span className="card-heading" style={{ margin: 0, fontSize: '0.65rem' }}>Execution Rate</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>{execScore}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${execScore}%`, background: 'linear-gradient(90deg, var(--primary) 0%, #9e7aff 100%)', borderRadius: '10px' }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span className="card-heading" style={{ margin: 0, fontSize: '0.65rem' }}>Consistency Pool</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#00e096' }}>{consistencyScore}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${consistencyScore}%`, background: 'linear-gradient(90deg, #00e096 0%, #00ffd0 100%)', borderRadius: '10px' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Operational Capacities (Bottom Row) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
                        <div className="glass-panel" style={{ padding: '24px' }}>
                            <div className="card-heading">Hot Leads</div>
                            <div className="metric-value">{revenueStats?.hot_leads || 0}</div>
                            <div className="metric-subtext">Active Negotiations</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '24px' }}>
                            <div className="card-heading">Deals Converted</div>
                            <div className="metric-value">{revenueStats?.deals_closed || 0}</div>
                            <div className="metric-subtext">Verified Transactions</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '24px' }}>
                            <div className="card-heading">System Load</div>
                            <div className="metric-value" style={{ color: 'var(--success)' }}>Optimal</div>
                            <div className="metric-subtext">0.12ms Latency</div>
                        </div>
                    </div>
                </div>

                {/* Tactical Feed Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    <div className="glass-panel" style={{ padding: '30px', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                            <h4 className="card-heading" style={{ margin: 0 }}>Strategic Protocol Insight</h4>
                        </div>
                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.6', margin: 0, opacity: 0.9 }}>
                            {weeklyReview?.message || "Synthesizing operational history to generate behavioral directives. Maintain baseline execution velocity."}
                        </p>
                    </div>

                    <div className="glass-panel" style={{ padding: '32px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h4 className="card-heading" style={{ margin: 0 }}>Protocol Clearances</h4>
                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)' }}>VIEW ALL HISTORY</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {recentBadges.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '20px' }}>
                                    <div style={{ fontSize: '1.6rem', marginBottom: '10px', opacity: 0.3 }}>🛡️</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>No elite badges authorized for this cycle.</div>
                                </div>
                            ) : (
                                recentBadges.map((badge, i) => (
                                    <div key={i} className="premium-stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', border: 'none', background: 'rgba(255,255,255,0.02)' }}>
                                        <div style={{ fontSize: '1.4rem' }}>{badge.icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{badge.name}</div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{badge.type} Protocol Verified</div>
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800 }}>{new Date(badge.earned_at).toLocaleDateString()}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
