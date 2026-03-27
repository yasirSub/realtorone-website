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
    setActivityTypes,
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

    const [includeDb, setIncludeDb] = useState(true);
    const [includeMedia, setIncludeMedia] = useState(true);

    const handleDownloadBackup = async () => {
        if (!includeDb && !includeMedia) {
            setMessage('Please select at least one component to backup.');
            return;
        }
        setMessage('Generating backup... please wait.');
        try {
            await apiClient.getBackup({ db: includeDb, media: includeMedia });
            setMessage('Backup generated successfully.');
            setTimeout(() => setMessage(''), 5000);
        } catch (error) {
            console.error('Backup failed', error);
            setMessage('Backup failed. Check console for details.');
        }
    };

    const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm('WARNING: This will overwrite current data. Continue?')) {
            return;
        }

        setMessage('Restoring system... this may take a moment.');
        setSaving(true);
        try {
            const res = await apiClient.restoreBackup(file);
            if (res.success) {
                setMessage('System successfully restored! Page will reload.');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setMessage(`Restore failed: ${res.message}`);
            }
        } catch (error) {
            console.error('Restore failed', error);
            setMessage('Critical error during restoration.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="view-container fade-in">
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '5px' }}>System Admin</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '0.9rem' }}>Core infrastructure, data redundancy, and platform parameters.</p>

            {message && (
                <div className="glass-panel" style={{ padding: '15px', marginBottom: '20px', border: '1px solid var(--success)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontWeight: 800, fontSize: '0.8rem' }}>
                    {message}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'flex-start' }}>
                {/* Left Column: Disaster Recovery */}
                <div className="glass-panel">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--primary)' }}>●</span> Disaster Recovery & Redundancy
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ padding: '25px', borderRadius: '15px', background: 'var(--bg-app)', border: '1px solid var(--glass-border)' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '15px', textTransform: 'uppercase' }}>Select Components to Backup</label>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={includeDb} onChange={e => setIncludeDb(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>MySQL Database (Users, Progress, Logs)</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={includeMedia} onChange={e => setIncludeMedia(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Media Assets (Course Videos & PDFs)</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button
                                    onClick={handleDownloadBackup}
                                    className="btn-primary"
                                    style={{ flex: 1.5, height: '45px', fontSize: '0.85rem' }}
                                >
                                    GENERATE SELECTED BACKUP
                                </button>
                                <label className="btn-primary" style={{ flex: 1, height: '45px', background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                                    RESTORE FROM ZIP
                                    <input type="file" accept=".zip" onChange={handleRestoreBackup} style={{ display: 'none' }} />
                                </label>
                            </div>
                        </div>

                        <div style={{ padding: '20px', background: 'rgba(245, 158, 11, 0.05)', border: '1px dashed #F59E0B55', borderRadius: '12px' }}>
                            <p style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 600 }}>
                                <strong>Safety Tip:</strong> Download a backup before making major structural changes to the database or mass-deleting courses.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Parameters & Maintenance */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div className="glass-panel">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '25px' }}>System Maintenance</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Global Activity Weight</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="number"
                                        value={pointsValue}
                                        onChange={(e) => setPointsValue(parseInt(e.target.value))}
                                        className="form-input"
                                        style={{ width: '80px' }}
                                    />
                                    <button
                                        onClick={handleSavePoints}
                                        className="btn-primary"
                                        disabled={saving}
                                        style={{ background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', flex: 1 }}
                                    >
                                        {saving ? 'SAVING...' : 'SYNC POINTS'}
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Base rewards for identity conditioning tasks.</p>
                            </div>

                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Sync Database Registry</label>
                                <button onClick={handleSyncActivities} className="btn-primary" style={{ width: '100%', background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>
                                    RUN GLOBAL SEEDER SYNC
                                </button>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Forces a refresh of all mission types from the source code.</p>
                            </div>

                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>API Integration</label>
                                <input type="text" value={apiClient.getBaseUrl()} readOnly className="form-input" style={{ width: '100%', background: 'var(--bg-app)', border: 'none', fontStyle: 'italic', fontSize: '0.8rem' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 800 }}>● CONNECTED TO CLOUD</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>v1.4.2-PRIME</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
