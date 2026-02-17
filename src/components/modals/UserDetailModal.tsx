import React from 'react';
import type { User } from '../../types';

interface UserDetailModalProps {
    user: User;
    onClose: () => void;
    onViewDossier: () => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({
    user,
    onClose,
    onViewDossier
}) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px', display: 'grid', gridTemplateColumns: '1fr' }}>
                {/* Compact Premium Header */}
                <div style={{ position: 'relative', height: '110px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', padding: '20px' }}>
                    <button
                        onClick={onClose}
                        style={{ position: 'absolute', right: '15px', top: '15px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800 }}
                    >✕</button>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', position: 'absolute', bottom: '-40px', left: '25px' }}>
                        <div className="avatar-chip" style={{ width: '80px', height: '80px', fontSize: '2.2rem', borderRadius: '25px', border: '4px solid var(--bg-modal)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>{(user.name || 'U').substring(0, 1)}</div>
                        <div style={{ paddingBottom: '10px' }}>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: 'white', textShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>{user.name}</h2>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px' }}>
                                <span className={`tier-pill ${(user.membership_tier || 'Free').toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '3px 10px' }}>{user.membership_tier || 'Free'} Member</span>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{user.email}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '55px 25px 25px 25px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                        <div className="glass-panel" style={{ padding: '15px', background: 'var(--bg-app)', border: 'none' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Growth Score</span>
                            <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-1px' }}>{user.growth_score || 0}%</span>
                            <div className="progress-track" style={{ height: '8px', marginTop: '8px' }}>
                                <div className="progress-fill" style={{ width: `${user.growth_score || 0}%`, background: 'var(--primary)' }}></div>
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '15px', background: 'var(--bg-app)', border: 'none' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Daily Momentum</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent)', letterSpacing: '-1px' }}>{user.daily_score || 0}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>/ 100</span>
                            </div>
                            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: user.badge_color || '#6b7280', background: `${user.badge_color || '#6b7280'}18`, padding: '2px 8px', borderRadius: '6px' }}>
                                    {user.momentum_badge || 'Inactive'}
                                </span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(109,40,217,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                                    🔥 {user.current_streak || 0} Streak
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800 }}>Performance Pillars</h3>
                        <div className="pillar-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {[
                                { l: 'Branding', k: 'branding' as const, i: '🎨' },
                                { l: 'Lead Gen', k: 'lead_gen' as const, i: '🎯' },
                                { l: 'Sales', k: 'sales' as const, i: '🤝' },
                                { l: 'Mindset', k: 'mindset' as const, i: '🧠' }
                            ].map(p => {
                                const scores = user.diagnosis_scores;
                                const score = scores ? (scores[p.k] || 0) : 0;
                                return (
                                    <div key={p.k} style={{ padding: '12px', borderRadius: '15px', background: 'var(--bg-app)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.75rem' }}>{p.i} {p.l}</span>
                                            <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '0.85rem' }}>{score}%</span>
                                        </div>
                                        <div className="progress-track" style={{ height: '5px', background: 'white' }}>
                                            <div className="progress-fill" style={{ width: `${score}%`, background: score > 70 ? 'var(--success)' : (score > 40 ? 'var(--primary)' : 'var(--error)') }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div style={{ padding: '20px', background: 'var(--bg-app)', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Account Profile</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Full Professional Dossier</span>
                        </div>
                        <button
                            onClick={onViewDossier}
                            className="btn-primary"
                            style={{ fontSize: '0.8rem', padding: '10px 20px', background: 'var(--text-main)', color: 'var(--bg-app)', border: 'none' }}
                        >View Deep Analytics</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetailModal;
