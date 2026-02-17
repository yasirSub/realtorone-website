import React, { useState, useEffect } from 'react';
import type { Badge } from '../types';
import { apiClient } from '../api/client';

const BadgesPage: React.FC = () => {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [stats, setStats] = useState({ earned_count: 0, total_count: 0, completion_percent: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        apiClient.getBadges().then(res => {
            if (res.success) {
                setBadges(res.data.badges);
                setStats({
                    earned_count: res.data.earned_count,
                    total_count: res.data.total_count,
                    completion_percent: res.data.completion_percent
                });
            }
            setIsLoading(false);
        });
    }, []);

    const getRarityTier = (rarity: number) => {
        switch (rarity) {
            case 1: return { name: 'COMMON', color: '#94a3b8' };
            case 2: return { name: 'RARE', color: '#3b82f6' };
            case 3: return { name: 'EPIC', color: '#a855f7' };
            case 4: return { name: 'LEGENDARY', color: '#f59e0b' };
            default: return { name: 'UNKNOWN', color: '#94a3b8' };
        }
    };

    return (
        <div className="view-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 950, margin: 0, letterSpacing: '-1px' }}>ACHIEVEMENT ARMORY</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Visual evidence of high-performance behavioral patterns.</p>
                </div>
                <div className="glass-panel" style={{ padding: '20px 30px', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 950, color: 'var(--text-muted)', letterSpacing: '1px' }}>COMPLETION_STATUS</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--primary)' }}>{stats.earned_count}<span style={{ fontSize: '0.9rem', opacity: 0.4 }}>/{stats.total_count}</span></div>
                    </div>
                    <div style={{ position: 'relative', width: '50px', height: '50px' }}>
                        <svg width="50" height="50" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-app)" strokeWidth="10" />
                            <circle
                                cx="50" cy="50" r="40"
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="10"
                                strokeDasharray="251"
                                strokeDashoffset={251 - (251 * stats.completion_percent) / 100}
                                strokeLinecap="round"
                                transform="rotate(-90 50 50)"
                            />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 950 }}>
                            {stats.completion_percent}%
                        </div>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: '100px', textAlign: 'center' }}>
                    <div className="loader" style={{ margin: '0 auto' }}></div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {badges.map(badge => {
                        const tier = getRarityTier(badge.rarity);
                        return (
                            <div
                                key={badge.id}
                                className="glass-panel"
                                style={{
                                    padding: '30px',
                                    position: 'relative',
                                    opacity: badge.earned ? 1 : 0.4,
                                    filter: badge.earned ? 'none' : 'grayscale(0.8)',
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    border: badge.earned ? `1px solid ${badge.color}40` : '1px solid var(--glass-border)',
                                    background: badge.earned ? `linear-gradient(135deg, var(--bg-card), ${badge.color}05)` : 'var(--bg-card)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '60px', height: '60px', borderRadius: '18px',
                                        background: badge.earned ? `${badge.color}20` : 'var(--bg-app)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '2rem', border: badge.earned ? `1px solid ${badge.color}40` : '1px solid var(--glass-border)',
                                        boxShadow: badge.earned ? `0 10px 20px -5px ${badge.color}30` : 'none'
                                    }}>
                                        {badge.icon}
                                    </div>
                                    <div style={{
                                        fontSize: '0.55rem', fontWeight: 950,
                                        letterSpacing: '1px', padding: '4px 8px',
                                        borderRadius: '6px', background: `${tier.color}20`,
                                        color: tier.color, border: `1px solid ${tier.color}30`
                                    }}>
                                        {tier.name}
                                    </div>
                                </div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 950, marginBottom: '8px', color: badge.earned ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                    {badge.name.toUpperCase()}
                                </h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, lineHeight: '1.5', minHeight: '3em' }}>
                                    {badge.description}
                                </p>

                                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {badge.type} protocol
                                    </div>
                                    {badge.earned && (
                                        <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--success)' }}>
                                            ✓ UNLOCKED {badge.earned_at ? new Date(badge.earned_at).toLocaleDateString().toUpperCase() : ''}
                                        </div>
                                    )}
                                </div>

                                {!badge.earned && (
                                    <div style={{
                                        position: 'absolute', bottom: '20px', right: '20px',
                                        fontSize: '1.2rem', opacity: 0.2
                                    }}>
                                        🔒
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div style={{ marginTop: '40px', padding: '30px', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 950, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px' }}>Archive Classification</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    {[
                        { n: 'Common', d: 'Standard operational milestones.' },
                        { n: 'Rare', d: 'Significant behavioral discipline.' },
                        { n: 'Epic', d: 'Exceptional market dominance.' },
                        { n: 'Legendary', d: 'Top 1% identity calibration.' },
                    ].map((t, i) => (
                        <div key={i}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 950, marginBottom: '5px' }}>{t.n}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t.d}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BadgesPage;
