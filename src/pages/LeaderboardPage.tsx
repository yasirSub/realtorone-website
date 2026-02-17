import React, { useState, useEffect } from 'react';
import type { LeaderboardEntry, LeaderboardCategory } from '../types';
import { apiClient } from '../api/client';

const LeaderboardPage: React.FC = () => {
    const [categories, setCategories] = useState<LeaderboardCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('consistency');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('weekly');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        apiClient.getLeaderboardCategories().then(res => {
            if (res.success) {
                setCategories(res.data);
                if (res.data.length > 0) {
                    setSelectedCategory('consistency');
                    setSelectedPeriod(res.data.find(c => c.key === 'consistency')?.period || 'weekly');
                }
            }
        });
    }, []);

    useEffect(() => {
        setIsLoading(true);
        apiClient.getLeaderboard(selectedCategory, selectedPeriod).then(res => {
            if (res.success) {
                setEntries(res.data);
            }
            setIsLoading(false);
        });
    }, [selectedCategory, selectedPeriod]);

    const handleCategoryChange = (key: string) => {
        setSelectedCategory(key);
        const category = categories.find(c => c.key === key);
        if (category) {
            setSelectedPeriod(category.period);
        }
    };

    return (
        <div className="view-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 950, margin: 0, letterSpacing: '-1px' }}>GLOBAL LEADERBOARD</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Real-time performance ranking across the global network.</p>
                </div>
                <button
                    className="btn-view"
                    onClick={() => apiClient.refreshLeaderboards().then(() => window.location.reload())}
                    style={{ fontSize: '0.7rem', fontWeight: 800, padding: '10px 20px' }}
                >
                    REFRESH_SYSTEM_CACHE
                </button>
            </div>

            {/* Category Selector */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', overflowX: 'auto', paddingBottom: '10px' }}>
                {categories.map(cat => (
                    <div
                        key={cat.key}
                        onClick={() => handleCategoryChange(cat.key)}
                        style={{
                            padding: '20px',
                            minWidth: '200px',
                            cursor: 'pointer',
                            background: selectedCategory === cat.key ? 'var(--bg-card)' : 'transparent',
                            border: `1px solid ${selectedCategory === cat.key ? 'var(--primary)' : 'var(--glass-border)'}`,
                            borderRadius: '16px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            opacity: selectedCategory === cat.key ? 1 : 0.6,
                            transform: selectedCategory === cat.key ? 'translateY(-5px)' : 'none'
                        }}
                        className="glass-panel"
                    >
                        <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{cat.icon}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900, marginBottom: '5px' }}>{cat.name.toUpperCase()}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>{cat.description}</div>
                        <div style={{
                            marginTop: '15px',
                            fontSize: '0.6rem',
                            fontWeight: 950,
                            color: 'var(--primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>{cat.period} cycle</div>
                    </div>
                ))}
            </div>

            {/* Leaderboard Table */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                {isLoading ? (
                    <div style={{ padding: '100px', textAlign: 'center' }}>
                        <div className="loader" style={{ margin: '0 auto' }}></div>
                        <p style={{ marginTop: '20px', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2px' }}>LOADING_GLOBAL_RANKS...</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                                <th>Practitioner</th>
                                <th>Tier</th>
                                <th>Performance Score</th>
                                <th style={{ textAlign: 'right' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '20px' }}>🔭</div>
                                        <div style={{ fontWeight: 900, letterSpacing: '1px' }}>NO DATA AVAILABLE FOR THIS CYCLE</div>
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry) => (
                                    <tr
                                        key={entry.user_id}
                                        className="table-row-hover"
                                        style={{
                                            background: entry.is_me ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                                            borderLeft: entry.is_me ? '4px solid var(--primary)' : 'none'
                                        }}
                                    >
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{
                                                fontSize: entry.rank <= 3 ? '1.2rem' : '0.9rem',
                                                fontWeight: 950,
                                                color: entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : entry.rank === 3 ? '#CD7F32' : 'inherit'
                                            }}>
                                                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '40px', height: '40px', borderRadius: '12px',
                                                    background: 'var(--bg-app)', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '1rem', fontWeight: 950, color: 'var(--primary)',
                                                    border: '1px solid var(--glass-border)'
                                                }}>
                                                    {entry.user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                                                        {entry.user.name} {entry.is_me && <span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '5px' }}>YOU</span>}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{entry.user.city || 'Global Network'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`tier-pill ${(entry.user.membership_tier || 'Consultant').toLowerCase().replace(/\s+/g, '-')}`}>
                                                {entry.user.membership_tier || 'Consultant'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ fontWeight: 950, fontSize: '1.1rem', color: 'var(--primary)' }}>{Math.round(entry.score)}</div>
                                                <div style={{ height: '6px', width: '100px', background: 'var(--bg-app)', borderRadius: '10px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${Math.min(100, (entry.score / (selectedCategory === 'revenue' ? 100000 : 100)) * 100)}%`,
                                                        background: 'var(--primary)',
                                                        transition: 'width 1s ease-out'
                                                    }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px' }}>
                                                {(entry.user.current_streak || 0) > 0 && (
                                                    <div style={{
                                                        fontSize: '0.65rem', fontWeight: 950,
                                                        background: 'rgba(249, 115, 22, 0.1)',
                                                        color: '#f97316', padding: '4px 8px', borderRadius: '6px',
                                                        display: 'flex', alignItems: 'center', gap: '4px'
                                                    }}>
                                                        🔥 {entry.user.current_streak} DAY STREAK
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ marginTop: '30px', padding: '30px', borderRadius: '20px', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 950, letterSpacing: '1px', marginBottom: '15px' }}>🛡️ PSYCHOLOGICAL GUARD PROTOCOL</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6', fontWeight: 600 }}>
                    Ranking is meant for behavioral calibration, not worth assessment. Every practitioner moves at their own capacity.
                    Focus on your own <span style={{ color: 'var(--primary)', fontWeight: 800 }}>MOMENTUM SCORE</span> weekly improvement rather than absolute rank.
                </p>
            </div>
        </div>
    );
};

export default LeaderboardPage;
