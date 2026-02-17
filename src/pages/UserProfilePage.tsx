import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { User } from '../types';

interface UserProfilePageProps {
    user: User;
    setActiveTab: (tab: any) => void;
    onBack: () => void;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ user, onBack }) => {
    const [performance, setPerformance] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewRange, setViewRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [expandedDays, setExpandedDays] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [perfRes, actRes] = await Promise.all([
                    apiClient.getUserPerformance(user.id),
                    apiClient.getUserActivities(user.id)
                ]);

                if (perfRes.success) {
                    setPerformance(perfRes.data.reverse()); // Oldest to newest
                }
                if (actRes.success) {
                    setActivities(actRes.data);
                }
            } catch (error) {
                console.error('Failed to sync operator data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user.id]);

    const toggleDay = (date: string) => {
        setExpandedDays(prev =>
            prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
        );
    };

    const getChartData = () => {
        if (performance.length === 0) return [];

        if (viewRange === 'daily') {
            return performance.slice(-7).map(p => ({
                label: new Date(p.date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
                value: p.total_momentum_score,
                subco: p.subconscious_score,
                conscious: p.conscious_score,
                date: p.date
            }));
        }

        if (viewRange === 'weekly') {
            const weeks: any[] = [];
            for (let i = 0; i < performance.length; i += 7) {
                const slice = performance.slice(i, i + 7);
                const avgSub = Math.round(slice.reduce((acc, curr) => acc + curr.subconscious_score, 0) / slice.length);
                const avgCon = Math.round(slice.reduce((acc, curr) => acc + curr.conscious_score, 0) / slice.length);
                const avgTotal = Math.round(slice.reduce((acc, curr) => acc + curr.total_momentum_score, 0) / slice.length);
                weeks.push({
                    label: `WEEK ${Math.floor(i / 7) + 1}`,
                    value: avgTotal,
                    subco: avgSub,
                    conscious: avgCon
                });
            }
            return weeks.slice(-10);
        }

        if (viewRange === 'monthly') {
            const months: { [key: string]: any[] } = {};
            performance.forEach(p => {
                const month = new Date(p.date).toLocaleString('en-US', { month: 'short' }).toUpperCase();
                if (!months[month]) months[month] = [];
                months[month].push(p);
            });
            return Object.entries(months).map(([name, slice]) => ({
                label: name,
                value: Math.round(slice.reduce((acc, curr) => acc + curr.total_momentum_score, 0) / slice.length),
                subco: Math.round(slice.reduce((acc, curr) => acc + curr.subconscious_score, 0) / slice.length),
                conscious: Math.round(slice.reduce((acc, curr) => acc + curr.conscious_score, 0) / slice.length)
            }));
        }

        return [];
    };

    const activityData = getChartData();
    const maxVal = Math.max(...activityData.map((d: any) => d.value), 100);

    const getTierColor = (tier?: string) => {
        switch (tier?.toLowerCase()) {
            case 'diamond': return '#7C3AED';
            case 'platinum': return '#D946EF';
            case 'silver': return '#94a3b8';
            default: return 'var(--text-muted)';
        }
    };

    return (
        <div className="view-container fade-in" style={{ padding: '0 20px 60px 20px' }}>
            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
                <button
                    onClick={onBack}
                    className="btn-view"
                    style={{
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '16px',
                        color: 'var(--text-main)',
                        fontWeight: 950,
                        fontSize: '0.7rem',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    REGISTRY ARCHIVE
                </button>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '10px 20px', borderRadius: '15px', border: '1px solid var(--glass-border)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '1px' }}>
                        SYSTEM STATUS: <span style={{ color: user.status === 'active' ? 'var(--success)' : 'var(--error)' }}>{user.status?.toUpperCase()}</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '35px', alignItems: 'flex-start' }}>
                {/* Left Tactical Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
                    <div className="glass-panel" style={{ padding: '40px 30px', textAlign: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none', background: `radial-gradient(circle at top right, ${getTierColor(user.membership_tier)}, transparent)` }}></div>

                        <div style={{ width: '130px', height: '130px', margin: '0 auto 25px auto', borderRadius: '30%', background: `linear-gradient(135deg, ${getTierColor(user.membership_tier)}40, transparent)`, padding: '3px', border: `1px solid ${getTierColor(user.membership_tier)}40` }}>
                            <div className="avatar-chip" style={{ width: '100%', height: '100%', borderRadius: 'inherit', fontSize: '3.5rem', fontWeight: 900, boxShadow: 'none' }}>
                                {(user.name || 'U').substring(0, 1)}
                            </div>
                        </div>

                        <h2 style={{ fontSize: '1.8rem', fontWeight: 950, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>{user.name}</h2>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '25px' }}>{user.email}</span>

                        <div style={{ display: 'inline-flex', padding: '8px 20px', borderRadius: '30px', background: `${getTierColor(user.membership_tier)}15`, border: `1px solid ${getTierColor(user.membership_tier)}40`, color: getTierColor(user.membership_tier), fontSize: '0.65rem', fontWeight: 950, letterSpacing: '1.5px', marginBottom: '40px' }}>
                            {user.membership_tier?.toUpperCase() || 'FREE'} OPERATOR
                        </div>

                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '20px', padding: '30px 0', borderTop: '1px solid var(--glass-border)' }}>
                            <div style={{ opacity: 0.8 }}>
                                <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Contact Intelligence</span>
                                <div style={{ fontSize: '1rem', fontWeight: 950, letterSpacing: '0.5px' }}>{user.phone_number || 'SECURE_UNKNOWN'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>OPERATOR_UID: {user.id}</div>
                            </div>
                            <div style={{ opacity: 0.8 }}>
                                <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Operational License</span>
                                <div style={{ fontSize: '1rem', fontWeight: 950, letterSpacing: '0.5px' }}>{user.license_number || 'PENDING_VERIFICATION'}</div>
                            </div>
                            <div style={{ opacity: 0.8 }}>
                                <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Registry Entry</span>
                                <div style={{ fontSize: '1rem', fontWeight: 950, letterSpacing: '0.5px' }}>{user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'LEGACY_ARCHIVE'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '35px' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.7rem', fontWeight: 950, marginBottom: '30px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary)' }}>
                            <div style={{ width: '4px', height: '12px', background: 'var(--primary)', borderRadius: '10px' }}></div>
                            System Diagnostics
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                            {[
                                { l: 'Professional Branding', k: 'branding' as const, c: 'var(--primary)' },
                                { l: 'Lead Gen System', k: 'lead_gen' as const, c: '#a855f7' },
                                { l: 'Sales Conversion', k: 'sales' as const, c: 'var(--success)' },
                                { l: 'Mental Infrastructure', k: 'mindset' as const, c: '#f59e0b' }
                            ].map(p => {
                                const score = user.diagnosis_scores ? (user.diagnosis_scores[p.k] || 0) : 0;
                                return (
                                    <div key={p.k}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'flex-end' }}>
                                            <span style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--text-main)' }}>{p.l}</span>
                                            <span style={{ fontWeight: 950, color: p.c, fontSize: '0.85rem' }}>{score}%</span>
                                        </div>
                                        <div style={{ height: '8px', width: '100%', background: 'var(--bg-app)', borderRadius: '10px', padding: '2px', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ height: '100%', width: `${score}%`, background: p.c, borderRadius: 'inherit', boxShadow: `0 0 15px ${p.c}40` }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Performance Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '25px' }}>
                        {[
                            { label: 'AGGREGATE GROWTH', value: `${user.growth_score || 0}%`, icon: '📈' },
                            { label: 'EXECUTION RATE', value: `${user.execution_rate || 0}%`, icon: '⚡' },
                            { label: 'MINDSET INDEX', value: user.mindset_index || 0, icon: '🧠' },
                            { label: 'CURRENT STREAK', value: `${user.current_streak || 0}D`, icon: '🔥' },
                        ].map((stat, i) => (
                            <div key={i} className="glass-panel" style={{ padding: '25px', border: '1px solid var(--glass-border)', background: 'linear-gradient(135deg, var(--bg-card), transparent)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--text-muted)', letterSpacing: '1px' }}>{stat.label}</span>
                                    <span style={{ fontSize: '1.2rem' }}>{stat.icon}</span>
                                </div>
                                <div style={{ fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-1px' }}>{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="glass-panel" style={{ padding: '35px', minHeight: '400px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '50px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 950, margin: 0, letterSpacing: '-0.5px' }}>Behavioral Momentum Path</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 600 }}>{
                                    viewRange === 'daily' ? 'Tactical precision over the last 7 cycles' :
                                        viewRange === 'weekly' ? 'Strategic momentum trends by week' :
                                            'Long-term operational growth arc'
                                }</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '20px' }}>
                                <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '5px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    {(['daily', 'weekly', 'monthly'] as const).map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setViewRange(r)}
                                            style={{
                                                padding: '8px 18px',
                                                fontSize: '0.7rem',
                                                fontWeight: 950,
                                                background: viewRange === r ? 'var(--primary)' : 'transparent',
                                                color: viewRange === r ? 'white' : 'var(--text-muted)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                textTransform: 'uppercase',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', fontWeight: 950 }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#7e22ce' }}></div> CONSCIOUS
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', fontWeight: 950 }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#d946ef' }}></div> SUBCO
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ height: '240px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '20px', padding: '0 30px' }}>
                            {activityData.length === 0 ? (
                                <div style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', width: '100%', textAlign: 'center' }}>Synchronizing intelligence archives...</div>
                            ) : activityData.map((d: any, i) => (
                                <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '15px' }}>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '100%', justifyContent: 'center' }}>
                                        <div style={{
                                            width: '16px',
                                            height: `${Math.max(10, (d.conscious / maxVal) * 200)}px`,
                                            background: 'linear-gradient(to top, #7e22ce, #a855f7)',
                                            borderRadius: '6px 6px 2px 2px',
                                            transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: '0 4px 15px rgba(126, 34, 206, 0.3)'
                                        }}></div>
                                        <div style={{
                                            width: '16px',
                                            height: `${Math.max(10, (d.subco / maxVal) * 200)}px`,
                                            background: 'linear-gradient(to top, #d946ef, #f472b6)',
                                            borderRadius: '6px 6px 2px 2px',
                                            transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: '0 4px 15px rgba(217, 70, 239, 0.3)'
                                        }}></div>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 950, color: 'var(--text-muted)', textAlign: 'center' }}>{d.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '35px' }}>
                        <div className="glass-panel" style={{ padding: '35px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 950, marginBottom: '40px', letterSpacing: '0.5px' }}>Global Ranking Status</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '35%',
                                    background: 'var(--bg-app)',
                                    border: '1px solid var(--glass-border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
                                }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>RANK</span>
                                    <div style={{ fontSize: '2.2rem', fontWeight: 950, color: 'var(--primary)', lineHeight: 1 }}>#{user.rank || '??'}</div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 950, letterSpacing: '-1px' }}>Top {Math.max(1, 100 - (user.growth_score || 0))}%</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '8px' }}>Positioned in the tactical {user.membership_tier?.toLowerCase()} quadrant</div>
                                    <div style={{ height: '4px', width: '100%', background: 'var(--glass-border)', borderRadius: '10px', marginTop: '20px' }}>
                                        <div style={{ height: '100%', width: `${user.growth_score}%`, background: 'var(--primary)', borderRadius: 'inherit' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '35px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 950, marginBottom: '35px', letterSpacing: '0.5px' }}>Security Verification</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {[
                                    { label: 'Account Integrity', value: 'VERIFIED', color: 'var(--success)' },
                                    { label: 'Login Context', value: 'MOBILE_GATEWAY', color: 'var(--text-main)' },
                                    { label: 'Last Activity', value: user.last_activity_date ? new Date(user.last_activity_date).toLocaleTimeString() : 'LIVE_SYNC', color: 'var(--text-main)' }
                                ].map((row, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: idx < 2 ? '1px solid var(--glass-border)' : 'none' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>{row.label}</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 950, color: row.color }}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 950, margin: 0, letterSpacing: '-0.5px' }}>Operational Activity Dossier</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 600 }}>Decentralized behavioral logic auditing</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '2px' }}>Recent System Entries</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {performance.slice().reverse().slice(0, 14).map((day, idx) => {
                                const isExpanded = expandedDays.includes(day.date);
                                const dayDateStr = day.date.substring(0, 10);
                                const dayActivities = activities.filter(a => a.scheduled_at && a.scheduled_at.substring(0, 10) === dayDateStr);

                                return (
                                    <div key={idx} style={{
                                        background: 'var(--bg-app)',
                                        borderRadius: '18px',
                                        border: isExpanded ? `1px solid ${getTierColor(user.membership_tier)}40` : '1px solid var(--glass-border)',
                                        overflow: 'hidden',
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: isExpanded ? '0 10px 40px rgba(0,0,0,0.2)' : 'none'
                                    }}>
                                        <div style={{ padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleDay(day.date)}>
                                            <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                                                <div style={{ textAlign: 'center', minWidth: '60px', padding: '10px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 950, color: 'var(--text-muted)', letterSpacing: '1px' }}>{new Date(day.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</div>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--text-main)', marginTop: '2px' }}>{new Date(day.date).getDate()}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '1rem', fontWeight: 950, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>Daily Tactical Execution</div>
                                                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                                        <span style={{ fontSize: '0.65rem', padding: '4px 12px', background: 'rgba(126, 34, 206, 0.1)', color: '#a855f7', borderRadius: '30px', fontWeight: 950, border: '1px solid rgba(126, 34, 206, 0.2)' }}>CONSCIOUS: {day.conscious_score}%</span>
                                                        <span style={{ fontSize: '0.65rem', padding: '4px 12px', background: 'rgba(217, 70, 239, 0.1)', color: '#d946ef', borderRadius: '30px', fontWeight: 950, border: '1px solid rgba(217, 70, 239, 0.2)' }}>SUBCO: {day.subconscious_score}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '25px' }}>
                                                <div>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--primary)', lineHeight: 1 }}>+{day.total_momentum_score}</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--text-muted)', marginTop: '4px' }}>POINTS EARNED</div>
                                                </div>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
                                                    <svg style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'all 0.4s' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="6 9 12 15 18 9"></polyline>
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="fade-in" style={{ padding: '0 25px 25px 25px', background: 'rgba(0,0,0,0.1)' }}>
                                                <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 0 25px 0' }}></div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                                    <div>
                                                        <h5 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', fontWeight: 950, color: '#a855f7', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                            <div style={{ width: '3px', height: '10px', background: '#a855f7', borderRadius: '10px' }}></div>
                                                            Conscious (Part B) <span style={{ opacity: 0.5, marginLeft: 'auto', fontSize: '0.6rem' }}>MAX 45 PTS</span>
                                                        </h5>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            {dayActivities.filter(a => a.category === 'task' || a.category === 'conscious').map((a, i) => (
                                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 15px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                                                    <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: a.is_completed ? 'var(--success)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {a.is_completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                                    </div>
                                                                    <span style={{ fontWeight: 800, fontSize: '0.8rem', flex: 1, opacity: a.is_completed ? 1 : 0.6 }}>{a.title}</span>

                                                                    {a.min_tier && a.min_tier !== 'Free' && (
                                                                        <span style={{
                                                                            fontSize: '0.55rem',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '6px',
                                                                            background: `${getTierColor(a.min_tier)}20`,
                                                                            color: getTierColor(a.min_tier),
                                                                            border: `1px solid ${getTierColor(a.min_tier)}40`,
                                                                            fontWeight: 900,
                                                                            letterSpacing: '0.5px',
                                                                            marginRight: '8px'
                                                                        }}>
                                                                            {a.min_tier.toUpperCase()}
                                                                        </span>
                                                                    )}

                                                                    <span style={{ fontSize: '0.7rem', fontWeight: 950, color: a.is_completed ? 'var(--primary)' : 'var(--text-muted)' }}>{a.is_completed ? `+${a.points}` : `(${a.points})`}</span>
                                                                </div>
                                                            ))}
                                                            {dayActivities.filter(a => a.category === 'task' || a.category === 'conscious').length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>No operational data recorded</span>}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', fontWeight: 950, color: '#d946ef', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                            <div style={{ width: '3px', height: '10px', background: '#d946ef', borderRadius: '10px' }}></div>
                                                            Subconscious (Part A) <span style={{ opacity: 0.5, marginLeft: 'auto', fontSize: '0.6rem' }}>MAX 40 PTS</span>
                                                        </h5>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            {dayActivities.filter(a => a.category === 'subconscious').map((a, i) => (
                                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 15px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                                                    <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: a.is_completed ? 'var(--accent)' : 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {a.is_completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                                    </div>
                                                                    <span style={{ fontWeight: 800, fontSize: '0.8rem', flex: 1, opacity: a.is_completed ? 1 : 0.6 }}>{a.title}</span>

                                                                    {a.min_tier && a.min_tier !== 'Free' && (
                                                                        <span style={{
                                                                            fontSize: '0.55rem',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '6px',
                                                                            background: `${getTierColor(a.min_tier)}20`,
                                                                            color: getTierColor(a.min_tier),
                                                                            border: `1px solid ${getTierColor(a.min_tier)}40`,
                                                                            fontWeight: 900,
                                                                            letterSpacing: '0.5px',
                                                                            marginRight: '8px'
                                                                        }}>
                                                                            {a.min_tier.toUpperCase()}
                                                                        </span>
                                                                    )}

                                                                    <span style={{ fontSize: '0.7rem', fontWeight: 950, color: a.is_completed ? 'var(--accent)' : 'var(--text-muted)' }}>{a.is_completed ? `+${a.points}` : `(${a.points})`}</span>
                                                                </div>
                                                            ))}
                                                            {dayActivities.filter(a => a.category === 'subconscious').length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>No subconscious protocols detected</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfilePage;
