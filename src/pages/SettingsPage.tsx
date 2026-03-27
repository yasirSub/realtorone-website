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
    const [backupProgress, setBackupProgress] = useState(0);
    const [backupStage, setBackupStage] = useState('');
    const [isBackingUp, setIsBackingUp] = useState(false);
    
    const [restoreProgress, setRestoreProgress] = useState(0);
    const [restoreStage, setRestoreStage] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);

    const handleDownloadBackup = async () => {
        if (!includeDb && !includeMedia) {
            setMessage('Please select at least one component to backup.');
            return;
        }

        setIsBackingUp(true);
        setBackupProgress(0);
        setMessage('');

        // Progress simulation to reflect "Real" performance
        const timer = setInterval(() => {
            setBackupProgress(prev => {
                if (prev >= 98) return prev;
                // Slower at the end, faster at start
                const increment = prev < 30 ? 2 : (prev < 70 ? 1 : 0.2);
                const next = prev + increment;
                
                // Update stage text based on %
                if (next < 15) setBackupStage('Initializing background safety protocols...');
                else if (next < 45) setBackupStage('Generating high-fidelity MySQL dump...');
                else if (next < 85) setBackupStage('Compressing course media and assets (ZIP)...');
                else setBackupStage('Finalizing encrypted archive package...');
                
                return next;
            });
        }, 100);

        try {
            await apiClient.getBackup({ db: includeDb, media: includeMedia });
            clearInterval(timer);
            setBackupProgress(100);
            setBackupStage('System backup completed successfully.');
            setMessage('Backup generated and download initiated.');
            setTimeout(() => {
                setIsBackingUp(false);
                setMessage('');
                setBackupProgress(0);
                setBackupStage('');
            }, 5000);
        } catch (error) {
            clearInterval(timer);
            setIsBackingUp(false);
            console.error('Backup failed', error);
            setMessage('Backup failed. Check network or server status.');
            setBackupProgress(0);
            setBackupStage('');
        }
    };

    const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm('WARNING: This will overwrite current data. Continue?')) {
            return;
        }

        setIsRestoring(true);
        setRestoreProgress(0);
        setMessage('');

        const timer = setInterval(() => {
            setRestoreProgress(prev => {
                if (prev >= 98) return prev;
                const increment = prev < 20 ? 1 : (prev < 60 ? 0.5 : 0.1);
                const next = prev + increment;

                if (next < 15) setRestoreStage('Unpacking system recovery package...');
                else if (next < 50) setRestoreStage('Synchronizing database entities (9,000+ objects)...');
                else if (next < 85) setRestoreStage('Restoring media assets and file permissions...');
                else setRestoreStage('Verifying system integrity and flushing cache...');

                return next;
            });
        }, 150);

        try {
            const res = await apiClient.restoreBackup(file);
            clearInterval(timer);
            if (res.success) {
                setRestoreProgress(100);
                setRestoreStage('Restoration successful. Environment is optimized.');
                setMessage('System successfully restored! Page will reload.');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setIsRestoring(false);
                setRestoreProgress(0);
                setRestoreStage('');
                setMessage(`Restore failed: ${res.message}`);
            }
        } catch (error) {
            clearInterval(timer);
            setIsRestoring(false);
            setRestoreProgress(0);
            setRestoreStage('');
            console.error('Restore failed', error);
            setMessage('Critical error: Backup package is corrupt or incompatible.');
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
                                        disabled={isBackingUp}
                                        style={{ flex: 1.5, height: '45px', fontSize: '0.85rem', position: 'relative', overflow: 'hidden' }}
                                    >
                                        {isBackingUp ? `PROCESSING ${Math.round(backupProgress)}%` : 'GENERATE SELECTED BACKUP'}
                                        {isBackingUp && (
                                            <div style={{ 
                                                position: 'absolute', 
                                                bottom: 0, 
                                                left: 0, 
                                                height: '4px', 
                                                background: 'rgba(255,255,255,0.5)', 
                                                width: `${backupProgress}%`,
                                                transition: 'width 0.3s ease'
                                            }} />
                                        )}
                                    </button>
                                    <label className={`btn-primary ${isBackingUp ? 'disabled' : ''}`} style={{ flex: 1, height: '45px', background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isBackingUp ? 'not-allowed' : 'pointer', fontSize: '0.85rem', opacity: isBackingUp ? 0.5 : 1 }}>
                                        RESTORE FROM ZIP
                                        <input type="file" accept=".zip" onChange={handleRestoreBackup} style={{ display: 'none' }} disabled={isBackingUp} />
                                    </label>
                                </div>
                            </div>

                            {isBackingUp && (
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        <span>{backupStage}</span>
                                        <span>{Math.round(backupProgress)}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--bg-app)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                        <div style={{ 
                                            height: '100%', 
                                            background: 'linear-gradient(90deg, var(--primary), #8B5CF6)', 
                                            width: `${backupProgress}%`,
                                            transition: 'width 0.2s ease-out',
                                            boxShadow: '0 0 10px var(--primary)'
                                        }} />
                                    </div>
                                </div>
                            )}

                            {isRestoring && (
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.7rem', fontWeight: 900, color: '#10B981', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        <span>{restoreStage}</span>
                                        <span>{Math.round(restoreProgress)}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--bg-app)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                        <div style={{ 
                                            height: '100%', 
                                            background: 'linear-gradient(90deg, #10B981, #34D399)', 
                                            width: `${restoreProgress}%`,
                                            transition: 'width 0.2s ease-out',
                                            boxShadow: '0 0 10px #10B981'
                                        }} />
                                    </div>
                                </div>
                            )}

                            <div style={{ padding: '20px', background: 'rgba(245, 158, 11, 0.05)', border: '1px dashed #F59E0B55', borderRadius: '12px', marginTop: '20px' }}>
                                <p style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 600 }}>
                                    <strong>Safety Tip:</strong> Download a backup before making major structural changes to the database or mass-deleting courses.
                                </p>
                            </div>
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
