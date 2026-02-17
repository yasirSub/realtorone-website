import React, { useState } from 'react';
import { apiClient } from '../api/client';
import type { ActivityType, SubscriptionPackage } from '../types';

interface SettingsPageProps {
    activityTypes: ActivityType[];
    setActivityTypes: React.Dispatch<React.SetStateAction<ActivityType[]>>;
    packages: SubscriptionPackage[];
    setPackages: React.Dispatch<React.SetStateAction<SubscriptionPackage[]>>;
    userActivityPoints: number;
    setUserActivityPoints: (points: number) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
    activityTypes,
    setActivityTypes,
    packages,
    setPackages,
    userActivityPoints,
    setUserActivityPoints
}) => {
    const [pointsValue, setPointsValue] = useState(userActivityPoints);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const handleSavePoints = async () => {
        setSaving(true);
        try {
            const res = await apiClient.setUserActivityPoints(pointsValue);
            if (res.success) {
                setUserActivityPoints(res.points);
                setMessage('Activity points infrastructure updated successfully.');
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            console.error('Failed to save points', error);
        } finally {
            setSaving(false);
        }
    };

    const handlePriceUpdate = async (id: number, newPrice: number) => {
        try {
            const res = await apiClient.updatePackage(id, { price_monthly: newPrice });
            if (res.success) {
                setPackages(prev => prev.map(p => p.id === id ? res.data : p));
            }
        } catch (error) {
            console.error('Failed to update price', error);
        }
    };

    const handleSyncActivities = async () => {
        // This triggers the backend seeder logic and returns the full updated list
        try {
            const res = await apiClient.getActivityTypes();
            if (res.success) {
                setActivityTypes(res.data);
                setMessage('Global activity registry synchronized.');
            }
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Failed to sync', error);
        }
    };

    return (
        <div className="view-container fade-in">
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '10px' }}>System Infrastructure</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Management Plane for Platform Logic & Monetization.</p>

            {message && (
                <div className="glass-panel" style={{ padding: '15px', marginBottom: '20px', border: '1px solid var(--success)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontWeight: 800, fontSize: '0.8rem' }}>
                    {message}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'flex-start' }}>
                <div className="glass-panel">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '25px' }}>Operational Parameters</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Custom Activity Weight</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="number"
                                    value={pointsValue}
                                    onChange={(e) => setPointsValue(parseInt(e.target.value))}
                                    className="form-input"
                                    style={{ flex: 1 }}
                                />
                                <button
                                    onClick={handleSavePoints}
                                    className="btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? 'SYNCING...' : 'UPDATE WEIGHT'}
                                </button>
                            </div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Global points awarded to operators for custom subconscious rituals.</p>
                        </div>

                        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '25px' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>Subscription Fleet Pricing</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {packages.map(pkg => (
                                    <div key={pkg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)', padding: '12px 15px', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pkg.name === 'Titan' ? '#F59E0B' : pkg.name === 'Rainmaker' ? '#94A3B8' : 'var(--primary)' }}></div>
                                            <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{pkg.name} TIER</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>$</span>
                                            <input
                                                type="number"
                                                defaultValue={pkg.price_monthly}
                                                onBlur={(e) => handlePriceUpdate(pkg.id, parseFloat(e.target.value))}
                                                style={{ width: '60px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontWeight: 900, fontSize: '0.9rem', borderRadius: '4px', padding: '2px 5px', textAlign: 'right' }}
                                            />
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>/mo</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '25px' }}>System Diagnostics</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '10px' }}>CORE API ENDPOINT</label>
                            <input type="text" value={import.meta.env.VITE_API_BASE_URL || 'DYNAMIC_CLOUD'} readOnly className="form-input" style={{ width: '100%', background: 'var(--bg-app)', border: 'none', fontStyle: 'italic' }} />
                        </div>

                        <div style={{ padding: '20px', borderRadius: '15px', background: 'var(--bg-app)', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)' }}>INTEGRITY STATUS</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--success)' }}>OPTIMAL</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Activity Types Loaded</span>
                                    <span style={{ fontWeight: 800 }}>{activityTypes.length} Functions</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Admin Status</span>
                                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>AUTHORIZED</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button onClick={handleSyncActivities} className="btn-primary" style={{ background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>Sync Global Registry</button>
                            <button className="btn-primary" style={{ background: 'var(--error)15', color: 'var(--error)', border: 'none', opacity: 0.5 }}>Purge System Cache</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
