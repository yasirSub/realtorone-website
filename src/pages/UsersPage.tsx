import React from 'react';
import type { User } from '../types';

interface UsersPageProps {
    filteredUsers: User[];
    activeTier: string;
    setActiveTier: (tier: any) => void;
    onUserClick: (user: User) => void;
    onQuickLook: (user: User) => void;
    onDelete: (userId: number, userName: string) => void;
    onToggleStatus: (userId: number) => void;
}

const UsersPage: React.FC<UsersPageProps> = ({
    filteredUsers,
    activeTier,
    setActiveTier,
    onUserClick,
    onQuickLook,
    onDelete,
    onToggleStatus
}) => {
    return (
        <div className="view-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div className="filter-group">
                    <button className={`filter-btn ${activeTier === 'All' ? 'active' : ''}`} onClick={() => setActiveTier('All')}>ALL LEVELS</button>
                    <button className={`filter-btn ${activeTier === 'Consultant' ? 'active' : ''}`} onClick={() => setActiveTier('Consultant')}>CONSULTANT TIER</button>
                    <button className={`filter-btn ${activeTier === 'Rainmaker' ? 'active' : ''}`} onClick={() => setActiveTier('Rainmaker')}>RAINMAKER TIER</button>
                    <button className={`filter-btn ${activeTier === 'Titan' ? 'active' : ''}`} onClick={() => setActiveTier('Titan')}>TITAN TIER</button>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <span style={{ color: 'var(--primary)' }}>{filteredUsers.length}</span> OPERATORS IDENTIFIED
                </div>
            </div>

            <div className="glass-panel fade-in" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '60px' }}>Ind</th>
                            <th>Practitioner</th>
                            <th>Identity Email</th>
                            <th>Level Status</th>
                            <th>Score</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)', fontWeight: 800 }}>
                                    NO OPERATORS LOCATED IN THIS SECTOR
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map(user => (
                                <tr key={user.id} className="table-row-hover">
                                    <td>
                                        <div className={`status-dot ${user.status === 'active' ? 'active' : ''}`} style={{ margin: '0 auto' }}></div>
                                    </td>
                                    <td data-label="Practitioner">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => onQuickLook(user)}>
                                            <div className="avatar-chip" style={{ width: '35px', height: '35px', fontSize: '0.8rem' }}>{(user.name || 'U').substring(0, 1)}</div>
                                            <span style={{ fontWeight: 800, fontSize: '0.9rem' }} className="table-row-hover-link">{user.name}</span>
                                        </div>
                                    </td>
                                    <td data-label="Email">
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>{user.email}</span>
                                    </td>
                                    <td data-label="Tier">
                                        <span className={`tier-pill ${(user.membership_tier || 'Consultant').toLowerCase()}`}>{user.membership_tier || 'Consultant'}</span>
                                    </td>
                                    <td data-label="Score">
                                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>{user.growth_score || 0}%</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }} data-label="Actions">
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                            <button
                                                className="btn-view"
                                                onClick={() => {
                                                    onUserClick(user);
                                                }}
                                                style={{
                                                    background: 'var(--primary)',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '6px 15px',
                                                    borderRadius: '8px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 12px var(--primary-shadow)'
                                                }}
                                            >
                                                VIEW DOSSIER
                                            </button>
                                            <button
                                                onClick={() => onToggleStatus(user.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.7, color: 'var(--text-main)' }}
                                                title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                                            >
                                                {user.status === 'active' ? (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                ) : (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => onDelete(user.id, user.name)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.5, color: 'var(--error)' }}
                                                title="Purge"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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
    );
};

export default UsersPage;
