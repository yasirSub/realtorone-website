import React from 'react';
import type { ActivityType } from '../types';
import { apiClient } from '../api/client';

interface MomentumPageProps {
    activityTypes: ActivityType[];
    userActivityPoints: number;
    setShowAddActivityModal: (show: boolean) => void;
    setUserActivityPoints: (points: number) => void;
    setActivityTypes: (types: any) => void;
}

const MomentumPage: React.FC<MomentumPageProps> = ({
    activityTypes,
    userActivityPoints,
    setShowAddActivityModal,
    setUserActivityPoints,
    setActivityTypes
}) => {
    return (
        <div className="view-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Behavioral Engineering</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Global activity types and point allocations.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="glass-panel" style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>GLOBAL REWARD CAP</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>{userActivityPoints}</span>
                        <button
                            onClick={() => {
                                const p = prompt('Set Global Reward Cap', String(userActivityPoints));
                                if (p) apiClient.setUserActivityPoints(Number(p)).then(res => res.success && setUserActivityPoints(res.points));
                            }}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                        >📝</button>
                    </div>
                    <button className="btn-primary" onClick={() => setShowAddActivityModal(true)}>+ Define Activity</button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {/* CONSCIOUS EXECUTION (PERFORMANCE) */}
                <div className="momentum-sector">
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                        CONSCIOUS EXECUTION
                    </h3>
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '80px', textAlign: 'center' }}>Icon</th>
                                    <th>Target Behavioral Activity</th>
                                    <th>Access</th>
                                    <th>Value</th>
                                    <th style={{ textAlign: 'right' }}>Management</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activityTypes.filter(t => t.category === 'conscious').length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)', fontWeight: 800 }}>
                                            NO CONSCIOUS BEHAVIORAL PATTERNS DEFINED
                                        </td>
                                    </tr>
                                ) : (
                                    activityTypes.filter(t => t.category === 'conscious').map(type => (
                                        <tr key={type.id} className="table-row-hover">
                                            <td style={{ textAlign: 'center' }} data-label="Icon">
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                                                </div>
                                            </td>
                                            <td data-label="Activity"><span style={{ fontWeight: 800 }}>{type.name}</span></td>
                                            <td data-label="Access"><span className={`tier-pill ${(type.min_tier || 'Consultant').toLowerCase().replace(/\s+/g, '-')}`}>{type.min_tier || 'Consultant'}+</span></td>
                                            <td data-label="Value"><span style={{ fontWeight: 900, color: 'var(--primary)' }}>+{type.points}</span></td>
                                            <td style={{ textAlign: 'right' }} data-label="Actions">
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                                    <button
                                                        className="btn-view"
                                                        style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                                                        onClick={() => {
                                                            const newPoints = prompt('Set points for ' + type.name, String(type.points));
                                                            if (newPoints) apiClient.updateActivityType(type.id, { points: Number(newPoints) }).then(res => res.success && setActivityTypes((prev: any[]) => prev.map(p => p.id === type.id ? res.data : p)));
                                                        }}
                                                    >ADJUST</button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Delete global activity ' + type.name + '?')) apiClient.deleteActivityType(type.id).then(res => res.success && setActivityTypes((prev: any[]) => prev.filter(p => p.id !== type.id)));
                                                        }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.5, color: 'var(--error)' }}
                                                    >
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SUBCONSCIOUS INFRASTRUCTURE */}
                <div className="momentum-sector">
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent)' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent)' }}></span>
                        SUBCONSCIOUS INFRASTRUCTURE
                    </h3>
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '80px', textAlign: 'center' }}>Icon</th>
                                    <th>Target Behavioral Activity</th>
                                    <th>Access</th>
                                    <th>Value</th>
                                    <th style={{ textAlign: 'right' }}>Management</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activityTypes.filter(t => t.category === 'subconscious').length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)', fontWeight: 800 }}>
                                            NO SUBCONSCIOUS BEHAVIORAL PATTERNS DEFINED
                                        </td>
                                    </tr>
                                ) : (
                                    activityTypes.filter(t => t.category === 'subconscious').map(type => (
                                        <tr key={type.id} className="table-row-hover">
                                            <td style={{ textAlign: 'center' }} data-label="Icon">
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z"></path><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"></path></svg>
                                                </div>
                                            </td>
                                            <td data-label="Activity"><span style={{ fontWeight: 800 }}>{type.name}</span></td>
                                            <td data-label="Access"><span className={`tier-pill ${(type.min_tier || 'Consultant').toLowerCase().replace(/\s+/g, '-')}`}>{type.min_tier || 'Consultant'}+</span></td>
                                            <td data-label="Value"><span style={{ fontWeight: 900, color: 'var(--accent)' }}>+{type.points}</span></td>
                                            <td style={{ textAlign: 'right' }} data-label="Actions">
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                                    <button
                                                        className="btn-view"
                                                        style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                                                        onClick={() => {
                                                            const newPoints = prompt('Set points for ' + type.name, String(type.points));
                                                            if (newPoints) apiClient.updateActivityType(type.id, { points: Number(newPoints) }).then(res => res.success && setActivityTypes((prev: any[]) => prev.map(p => p.id === type.id ? res.data : p)));
                                                        }}
                                                    >ADJUST</button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Delete global activity ' + type.name + '?')) apiClient.deleteActivityType(type.id).then(res => res.success && setActivityTypes((prev: any[]) => prev.filter(p => p.id !== type.id)));
                                                        }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.5, color: 'var(--error)' }}
                                                    >
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MomentumPage;
