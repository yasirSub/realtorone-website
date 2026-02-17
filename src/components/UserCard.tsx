import React from 'react';
import type { User } from '../types';

interface UserCardProps {
    user: User;
    onClick: (user: User) => void;
    onDelete: (userId: number, userName: string) => void;
    onToggleStatus: (userId: number) => void;
}

const UserCard: React.FC<UserCardProps> = ({
    user,
    onClick,
    onDelete,
    onToggleStatus
}) => {
    return (
        <div className="glass-panel scale-in" style={{ padding: '25px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className={`status-indicator ${user.status === 'active' ? 'active' : ''}`}></div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(user.id, user.name); }}
                        style={{ border: 'none', background: 'none', fontSize: '1rem', cursor: 'pointer', opacity: 0.5 }}
                        title="Purge Identity"
                    >🗑️</button>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '5px' }} onClick={() => onClick(user)}>
                <div className="avatar-chip" style={{ width: '60px', height: '60px', margin: '0 auto 15px auto', fontSize: '1.4rem' }}>{(user.name || 'U').substring(0, 1)}</div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', fontWeight: 900 }}>{user.name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '15px' }}>{user.email}</span>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                    <span className={`tier-pill ${(user.membership_tier || 'Free').toLowerCase()}`}>{user.membership_tier || 'Free'}</span>
                    <span style={{ background: 'var(--bg-app)', padding: '4px 12px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)' }}>ID: #{user.id}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                    <div>
                        <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Growth Score</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>{user.growth_score || 0}%</span>
                    </div>
                    <div>
                        <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mindset Index</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)' }}>{user.mindset_index || 0}</span>
                    </div>
                </div>
            </div>

            <button
                onClick={() => onToggleStatus(user.id)}
                style={{ width: '100%', marginTop: '20px', padding: '10px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
            >
                Set to {user.status === 'active' ? 'INACTIVE' : 'ACTIVE'}
            </button>
        </div>
    );
};

export default UserCard;
