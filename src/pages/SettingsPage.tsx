import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import type { ActivityType, SubscriptionPackage } from '../types';
import '../index.css';

interface SettingsPageProps {
    activityTypes: ActivityType[];
    setActivityTypes: React.Dispatch<React.SetStateAction<ActivityType[]>>;
    packages: SubscriptionPackage[];
    setPackages: React.Dispatch<React.SetStateAction<SubscriptionPackage[]>>;
    userActivityPoints: number;
    setUserActivityPoints: React.Dispatch<React.SetStateAction<number>>;
}

const SettingsPage: React.FC<SettingsPageProps> = (_props) => {
    const [pointsValue, setPointsValue] = useState(500);
    const [saving, setSaving] = useState(false);
    const [savingAppConfig, setSavingAppConfig] = useState(false);
    const [message, setMessage] = useState('');

    const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
    const [maintenanceMessage, setMaintenanceMessage] = useState('');
    const [minAndroidVersion, setMinAndroidVersion] = useState('');
    const [minIosVersion, setMinIosVersion] = useState('');
    const [androidStoreUrl, setAndroidStoreUrl] = useState('');
    const [iosStoreUrl, setIosStoreUrl] = useState('');

    // Backup State
    const [includeDb, setIncludeDb] = useState(true);
    const [includeMedia, setIncludeMedia] = useState(true);
    const [includeModuleData] = useState(true);
    const [includeUserData, setIncludeUserData] = useState(true);
    const [includeVideoMedia, setIncludeVideoMedia] = useState(true);
    const [includePdfMedia, setIncludePdfMedia] = useState(true);
    const [backupModules, setBackupModules] = useState<Array<{ key: string; label: string; count: number }>>([]);
    const [selectedBackupModules, setSelectedBackupModules] = useState<string[]>([]);
    const [loadingBackupModules, setLoadingBackupModules] = useState(false);
    const [backupValidationMessage, setBackupValidationMessage] = useState('');
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [backupProgress, setBackupProgress] = useState(0);
    const [backupStage, setBackupStage] = useState('');
    const backupTimerRef = useRef<any>(null);

    // Restore State
    const [restoreProgress, setRestoreProgress] = useState(0);
    const [restoreStage, setRestoreStage] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);

    // History State
    const [backups, setBackups] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    const [legalSlug, setLegalSlug] = useState<'privacy' | 'terms'>('privacy');
    const [legalTitle, setLegalTitle] = useState('');
    const [legalBody, setLegalBody] = useState('');
    const [legalLoading, setLegalLoading] = useState(false);
    const [legalSaving, setLegalSaving] = useState(false);
    const [settingsLoadError, setSettingsLoadError] = useState('');

    const buttonBase: React.CSSProperties = {
        borderRadius: '12px',
        border: '1px solid',
        fontWeight: 800,
        fontSize: '0.85rem',
        letterSpacing: '0.2px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
    };
    const primaryButton: React.CSSProperties = {
        ...buttonBase,
        background: '#4F46E5',
        borderColor: '#6366F1',
        color: '#FFFFFF',
    };
    const secondaryButton: React.CSSProperties = {
        ...buttonBase,
        background: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(148, 163, 184, 0.38)',
        color: '#E2E8F0',
    };
    const subtleButton: React.CSSProperties = {
        ...buttonBase,
        background: 'rgba(2, 6, 23, 0.55)',
        borderColor: 'rgba(148, 163, 184, 0.24)',
        color: '#CBD5E1',
        fontSize: '0.75rem',
    };

    const fetchBackups = async () => {
        try {
            const res = await apiClient.getBackups();
            if (res.success) setBackups(res.data);
        } catch (error) {
            console.error('Failed to fetch backup history', error);
        }
    };

    useEffect(() => {
        fetchBackups();
        // Load settings
        apiClient.getPointsPerActivity().then((res: any) => {
            if (res.success) setPointsValue(res.data.points_per_activity);
            else setSettingsLoadError('Failed to load points setting.');
        }).catch((e) => setSettingsLoadError(e?.message || 'Failed to load points setting.'));
        setLoadingBackupModules(true);
        apiClient.getBackupModules().then((res: any) => {
            if (!res?.success || !Array.isArray(res.data)) return;
            const list = res.data.map((m: any) => ({
                key: String(m.key),
                label: String(m.label),
                count: Number(m.count ?? 0),
            }));
            setBackupModules(list);
            setSelectedBackupModules(list.map((m: any) => m.key));
        }).catch((e) => setSettingsLoadError(e?.message || 'Failed to load backup modules.'))
            .finally(() => setLoadingBackupModules(false));

        // Load app runtime config (maintenance + min versions)
        apiClient.getAdminAppConfig().then((res: any) => {
            if (!res?.success || !res.data) return;
            setMaintenanceEnabled(Boolean(res.data.maintenance_enabled));
            setMaintenanceMessage(String(res.data.maintenance_message ?? ''));
            setMinAndroidVersion(String(res.data.min_android_version ?? ''));
            setMinIosVersion(String(res.data.min_ios_version ?? ''));
            setAndroidStoreUrl(String(res.data.android_store_url ?? ''));
            setIosStoreUrl(String(res.data.ios_store_url ?? ''));
        }).catch((e) => setSettingsLoadError(e?.message || 'Failed to load app runtime config.'));
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLegalLoading(true);
        void apiClient
            .getAdminLegalDocument(legalSlug)
            .then((res) => {
                if (cancelled) return;
                setLegalLoading(false);
                if (res.success && res.data) {
                    setLegalTitle(res.data.title);
                    setLegalBody(res.data.body_html);
                }
            })
            .catch(() => {
                if (!cancelled) setLegalLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [legalSlug]);

    const handleSaveLegal = async () => {
        setLegalSaving(true);
        setMessage('');
        try {
            const res = await apiClient.updateAdminLegalDocument(legalSlug, {
                title: legalTitle,
                body_html: legalBody,
            });
            if (res.success) setMessage('Legal document saved. Website /privacy and /terms and the mobile app reflect this content.');
            else setMessage(String(res.message ?? 'Save failed.'));
        } catch {
            setMessage('Network error saving legal document.');
        } finally {
            setLegalSaving(false);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const handleSavePoints = async () => {
        setSaving(true);
        try {
            const res = await apiClient.updatePointsPerActivity(pointsValue);
            if (res.success) setMessage('System configuration updated successfully.');
            else setMessage('Failed to update Registry.');
        } catch (error) {
            setMessage('Network error during configuration sync.');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const saveAppConfig = async (
        payload: {
            maintenance_enabled?: boolean;
            maintenance_message?: string;
            min_android_version?: string;
            min_ios_version?: string;
            android_store_url?: string;
            ios_store_url?: string;
        },
        successText: string
    ) => {
        setSavingAppConfig(true);
        setMessage('');
        try {
            const res = await apiClient.updateAdminAppConfig(payload);
            if (res.success) setMessage(successText);
            else setMessage(String(res.message ?? 'Failed to save app runtime config.'));
        } catch {
            setMessage('Network error saving app runtime config.');
        } finally {
            setSavingAppConfig(false);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const handleSaveMaintenanceConfig = async () =>
        saveAppConfig(
            {
                maintenance_enabled: maintenanceEnabled,
                maintenance_message: maintenanceMessage,
            },
            'Maintenance settings saved.'
        );

    const handleSaveVersionConfig = async () =>
        saveAppConfig(
            {
                min_android_version: minAndroidVersion,
                min_ios_version: minIosVersion,
                android_store_url: androidStoreUrl,
                ios_store_url: iosStoreUrl,
            },
            'Version control settings saved.'
        );

    const handleSyncActivities = async () => {
        setMessage('Synchronizing database registries...');
        try {
            const res = await apiClient.syncActivityTypes();
            if (res.success) setMessage('Registry synchronization complete.');
            else setMessage('Registry sync failed.');
        } catch (error) {
            setMessage('Critical error during sync.');
        }
    };

    const handleDownloadBackup = async () => {
        setBackupValidationMessage('');
        if (!includeDb && !includeMedia) {
            setBackupValidationMessage('Select at least one archive component.');
            return;
        }
        if (includeDb && !includeUserData) {
            setBackupValidationMessage('Select User Data for Database Set backup.');
            return;
        }
        if (includeMedia && selectedBackupModules.length === 0) {
            setBackupValidationMessage('Select at least one module under Media Assets.');
            return;
        }
        if (includeMedia && !includeVideoMedia && !includePdfMedia) {
            setBackupValidationMessage('Select at least one media type (Video or PDF).');
            return;
        }

        setIsBackingUp(true);
        setBackupProgress(0);
        setMessage('');

        // Precise simulation for backend tasks
        if (backupTimerRef.current) clearInterval(backupTimerRef.current);
        backupTimerRef.current = setInterval(() => {
            setBackupProgress(prev => {
                if (prev >= 98) return prev;
                const increment = prev < 20 ? 1 : (prev < 60 ? 0.4 : 0.05);
                const next = prev + increment;

                if (next < 10) setBackupStage('Handshaking with system kernel...');
                else if (next < 40) setBackupStage('Generating high-fidelity MySQL dump...');
                else if (next < 85) setBackupStage('Compressing course media and assets (ZIP)...');
                else setBackupStage('Finalizing encrypted archive package...');

                return next;
            });
        }, 150);

        try {
            const res = await apiClient.getBackup({
                db: includeDb,
                media: includeMedia,
                moduleData: includeModuleData,
                userData: includeUserData,
                modules: includeMedia ? selectedBackupModules : [],
                mediaTypes: includeMedia
                    ? [
                        ...(includeVideoMedia ? ['video'] : []),
                        ...(includePdfMedia ? ['pdf'] : []),
                    ]
                    : [],
            });
            if (backupTimerRef.current) clearInterval(backupTimerRef.current);

            if (res.success) {
                setBackupProgress(100);
                setBackupStage('Archive synchronized and verified.');
                setMessage('Backup complete! Download initiated.');

                if (res.data?.name) {
                    await apiClient.downloadBackup(res.data.name);
                }

                fetchBackups();
                setTimeout(() => {
                    setIsBackingUp(false);
                    setBackupProgress(0);
                    setBackupStage('');
                }, 3000);
            } else {
                throw new Error(res.message || 'Engine failure');
            }
        } catch (error: any) {
            if (backupTimerRef.current) clearInterval(backupTimerRef.current);
            setIsBackingUp(false);
            setBackupProgress(0);
            setBackupStage('');
            const errText = error?.message || 'Unknown failure';
            setBackupValidationMessage(`Backup failed: ${errText}`);
            setMessage(`Protocol error: ${errText}`);
        }
    };

    const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm('WARNING: This will overwrite operational data. Confirm system reset?')) {
            return;
        }

        setIsRestoring(true);
        setRestoreProgress(0);
        setRestoreStage('Streaming recovery package to kernel...');
        setMessage('');

        try {
            const res = await apiClient.restoreBackupWithProgress(file, (percent: number) => {
                const displayPercent = percent * 0.9;
                setRestoreProgress(displayPercent);
                if (percent < 100) setRestoreStage(`Data transmission: ${percent}%`);
                else setRestoreStage('Restoring entities and flushing cache...');
            });

            if (res.success) {
                setRestoreProgress(100);
                setRestoreStage('Environment successfully restored.');
                setMessage('Success! Core systems rebooting.');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setIsRestoring(false);
                setRestoreProgress(0);
                setRestoreStage('');
                setMessage(`Restoration aborted: ${res.message}`);
            }
        } catch (error) {
            setIsRestoring(false);
            setRestoreProgress(0);
            setRestoreStage('');
            setMessage('Critical violation: ZIP package is corrupt.');
        }
    };

    return (
        <div className="view-container fade-in" style={{ padding: '0 40px 60px 40px' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px', paddingTop: '30px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div className="pulse-dot" style={{ background: 'var(--neon-purple)' }}></div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
                                OPERATIONAL CONFIGURATION
                            </span>
                        </div>
                        <h1 className="text-outfit" style={{ fontSize: '2.8rem', fontWeight: 900, margin: 0, letterSpacing: '-1.8px', textTransform: 'uppercase' }}>
                            System <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Configuration</span>
                        </h1>
                    </div>

                    <div style={{ padding: '8px 20px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '12px', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px' }}>KERNEL VERSION</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>INFRASTRUCTURE v4.3.0</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '40px' }}>

                    {/* DISASTER RECOVERY PANEL */}
                    <div className="glass-panel" style={{ padding: '40px' }}>
                        <div style={{ position: 'absolute', top: '40px', right: '40px' }}>
                            <div className="pulse-dot" style={{ background: '#EF4444' }} />
                        </div>

                        <h2 className="text-outfit" style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '35px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            Disaster Recovery
                        </h2>

                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '30px', borderRadius: '18px', border: '1px solid var(--glass-border)', marginBottom: '30px' }}>
                            <p style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2px', marginBottom: '20px' }}>ARCHIVE SPECIFICATIONS</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', padding: '18px', borderRadius: '14px', background: includeDb ? 'rgba(139, 92, 246, 0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${includeDb ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.2s' }}>
                                    <input type="checkbox" checked={includeDb} onChange={e => setIncludeDb(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Database Set</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>User data backup (users, activities, results, chat)</div>
                                    </div>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', padding: '18px', borderRadius: '14px', background: includeMedia ? 'rgba(139, 92, 246, 0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${includeMedia ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.2s' }}>
                                    <input type="checkbox" checked={includeMedia} onChange={e => setIncludeMedia(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Media Assets</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Module media list (updated modules)</div>
                                    </div>
                                </label>
                            </div>
                            {includeDb && (
                                <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px 14px', borderRadius: '10px', background: includeUserData ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)', border: `1px solid ${includeUserData ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.06)'}` }}>
                                        <input
                                            type="checkbox"
                                            checked={includeUserData}
                                            onChange={e => setIncludeUserData(e.target.checked)}
                                            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                                        />
                                        <div>
                                            <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>User Data</div>
                                            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>users, activity logs, chat, results</div>
                                        </div>
                                    </label>
                                </div>
                            )}
                            {includeMedia && (
                                <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(2,6,23,0.45)' }}>
                                    <div style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${includeVideoMedia ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`, background: includeVideoMedia ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)' }}>
                                            <input
                                                type="checkbox"
                                                checked={includeVideoMedia}
                                                onChange={(e) => setIncludeVideoMedia(e.target.checked)}
                                                style={{ width: '15px', height: '15px', accentColor: 'var(--primary)' }}
                                            />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>Video files</span>
                                                <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)' }}>.mp4, .mov, .avi, .mkv</span>
                                            </div>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${includePdfMedia ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`, background: includePdfMedia ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)' }}>
                                            <input
                                                type="checkbox"
                                                checked={includePdfMedia}
                                                onChange={(e) => setIncludePdfMedia(e.target.checked)}
                                                style={{ width: '15px', height: '15px', accentColor: 'var(--primary)' }}
                                            />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>PDF files</span>
                                                <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)' }}>.pdf documents</span>
                                            </div>
                                        </label>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>
                                            MODULE LIST (UPDATED MODULES)
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedBackupModules(backupModules.map((m) => m.key))}
                                                disabled={backupModules.length === 0 || loadingBackupModules}
                                                style={{ ...subtleButton, height: '28px', padding: '0 10px', fontSize: '0.63rem' }}
                                            >
                                                SELECT ALL
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedBackupModules([])}
                                                disabled={backupModules.length === 0 || loadingBackupModules}
                                                style={{ ...subtleButton, height: '28px', padding: '0 10px', fontSize: '0.63rem' }}
                                            >
                                                CLEAR
                                            </button>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                {selectedBackupModules.length} selected / {backupModules.length}
                                            </div>
                                        </div>
                                    </div>
                                    {loadingBackupModules ? (
                                        <div style={{ padding: '14px', borderRadius: '10px', border: '1px dashed rgba(148,163,184,0.35)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                            Loading module list...
                                        </div>
                                    ) : backupModules.length === 0 ? (
                                        <div style={{ padding: '14px', borderRadius: '10px', border: '1px dashed rgba(148,163,184,0.35)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                            No module metadata found yet. Start backend API and refresh this page.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            {backupModules.map((module) => {
                                                const checked = selectedBackupModules.includes(module.key);
                                                return (
                                                    <label key={module.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${checked ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`, background: checked ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedBackupModules((prev) => Array.from(new Set([...prev, module.key])));
                                                                } else {
                                                                    setSelectedBackupModules((prev) => prev.filter((k) => k !== module.key));
                                                                }
                                                            }}
                                                            style={{ width: '15px', height: '15px', accentColor: 'var(--primary)' }}
                                                        />
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{module.label}</span>
                                                            <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)' }}>{module.count} tables</span>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {backupValidationMessage && (
                            <div style={{ marginTop: '-24px', marginBottom: '24px', fontSize: '0.74rem', color: '#FCA5A5', fontWeight: 700 }}>
                                {backupValidationMessage}
                            </div>
                        )}
                        {settingsLoadError && (
                            <div style={{ marginTop: '-12px', marginBottom: '20px', fontSize: '0.74rem', color: '#FCA5A5', fontWeight: 700 }}>
                                {settingsLoadError}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
                            <button
                                onClick={handleDownloadBackup}
                                disabled={isBackingUp || isRestoring || (includeMedia && backupModules.length === 0)}
                                style={{
                                    ...primaryButton,
                                    flex: 1.5,
                                    height: '56px',
                                    fontWeight: 900,
                                    fontSize: '0.92rem',
                                    cursor: isBackingUp || isRestoring ? 'not-allowed' : 'pointer',
                                    opacity: isBackingUp || isRestoring ? 0.7 : 1,
                                }}
                            >
                                {isBackingUp ? 'Compiling Archive...' : 'Generate New Backup'}
                            </button>
                            <label
                                style={{
                                    ...secondaryButton,
                                    flex: 1,
                                    height: '56px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: isBackingUp || isRestoring ? 'not-allowed' : 'pointer',
                                    opacity: isBackingUp || isRestoring ? 0.7 : 1,
                                }}
                            >
                                Restore Sync
                                <input type="file" accept=".zip" onChange={handleRestoreBackup} style={{ display: 'none' }} disabled={isBackingUp || isRestoring} />
                            </label>
                        </div>

                        {/* PROGRESS HUD */}
                        {(isBackingUp || isRestoring) && (
                            <div style={{
                                padding: '30px', background: 'rgba(0,0,0,0.3)', borderRadius: '24px',
                                border: `1px solid ${isBackingUp ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                                marginBottom: '40px', position: 'relative', overflow: 'hidden'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: isBackingUp ? '#8B5CF6' : '#10B981', letterSpacing: '2px', marginBottom: '5px' }}>
                                            {isBackingUp ? 'ENCRYPTION STAGE' : 'DECRYPTION STAGE'}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{isBackingUp ? backupStage : restoreStage}</div>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                                        {Math.round(isBackingUp ? backupProgress : restoreProgress)}%
                                    </div>
                                </div>
                                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', width: `${isBackingUp ? backupProgress : restoreProgress}%`,
                                        background: isBackingUp ? 'linear-gradient(90deg, #8B5CF6, #4f46e5)' : 'linear-gradient(90deg, #10B981, #059669)',
                                        transition: 'width 0.4s ease-out',
                                        boxShadow: `0 0 20px ${isBackingUp ? 'rgba(139, 92, 246, 0.5)' : 'rgba(16, 185, 129, 0.5)'}`
                                    }} />
                                </div>
                            </div>
                        )}

                        {/* HISTORY LOGS */}
                        <div>
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                style={{
                                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                                    fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'
                                }}
                            >
                                {showHistory ? '▼ CLOSE ARCHIVE VAULT' : '▶ OPEN ARCHIVE VAULT'}
                            </button>

                            {showHistory && (
                                <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {backups.length === 0 ? (
                                        <div style={{ padding: '30px', textAlign: 'center', opacity: 0.3, fontSize: '0.8rem' }}>Vault is empty.</div>
                                    ) : (
                                        backups.map((bak, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '15px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '15px',
                                                border: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8B5CF6' }} />
                                                    <div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{bak.name}</div>
                                                        <div style={{ fontSize: '0.6rem', opacity: 0.4 }}>{(bak.size / (1024 * 1024)).toFixed(2)} MB • {new Date(bak.created_at * 1000).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button
                                                        onClick={() => apiClient.downloadBackup(bak.name)}
                                                        style={{ ...secondaryButton, padding: '0 12px', height: '32px', fontSize: '0.64rem' }}
                                                    >
                                                        DNLD
                                                    </button>
                                                    <button
                                                        onClick={async () => { if (window.confirm('Erase?')) { await apiClient.deleteBackup(bak.name); fetchBackups(); } }}
                                                        style={{
                                                            ...buttonBase,
                                                            padding: '0 12px',
                                                            height: '32px',
                                                            fontSize: '0.64rem',
                                                            background: 'rgba(127, 29, 29, 0.2)',
                                                            borderColor: 'rgba(239, 68, 68, 0.38)',
                                                            color: '#FCA5A5',
                                                        }}
                                                    >
                                                        DEL
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: MAINTENANCE & TERMINAL */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                        {/* APP RUNTIME CONFIG (maintenance + min versions) */}
                        <div className="glass-panel" style={{ padding: '40px' }}>
                            <h2 className="text-outfit" style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                App Runtime Config
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 900, color: 'rgba(255,255,255,0.35)', letterSpacing: '1.2px' }}>
                                    APP STARTUP RULES
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#E2E8F0' }}>
                                                Maintenance Mode
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                Show maintenance screen to all mobile users on app launch.
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={maintenanceEnabled}
                                            onClick={() => setMaintenanceEnabled((v) => !v)}
                                            style={{
                                                width: '64px',
                                                height: '34px',
                                                borderRadius: '999px',
                                                border: maintenanceEnabled ? '1px solid rgba(99,102,241,0.8)' : '1px solid rgba(148,163,184,0.35)',
                                                background: maintenanceEnabled ? 'linear-gradient(90deg, #6366F1, #4F46E5)' : 'rgba(15,23,42,0.9)',
                                                cursor: 'pointer',
                                                padding: '3px',
                                                position: 'relative',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    display: 'block',
                                                    width: '26px',
                                                    height: '26px',
                                                    borderRadius: '50%',
                                                    background: '#fff',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                                                    transform: maintenanceEnabled ? 'translateX(30px)' : 'translateX(0)',
                                                    transition: 'transform 0.2s ease',
                                                }}
                                            />
                                        </button>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginBottom: '10px' }}>
                                            MAINTENANCE MESSAGE (OPTIONAL)
                                        </label>
                                        <textarea
                                            value={maintenanceMessage}
                                            onChange={(e) => setMaintenanceMessage(e.target.value)}
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                borderRadius: '12px',
                                                border: '1px solid var(--glass-border)',
                                                background: 'rgba(0,0,0,0.35)',
                                                color: 'var(--text-main)',
                                                fontFamily: 'ui-sans-serif, system-ui',
                                                fontSize: '0.8rem',
                                                lineHeight: 1.4,
                                                resize: 'vertical',
                                            }}
                                        />
                                    </div>

                                    <button
                                        onClick={() => void handleSaveMaintenanceConfig()}
                                        disabled={savingAppConfig}
                                        style={{
                                            ...primaryButton,
                                            width: '100%',
                                            height: '42px',
                                            fontWeight: 900,
                                            fontSize: '0.72rem',
                                        }}
                                    >
                                        {savingAppConfig ? 'SAVING…' : 'SAVE MAINTENANCE'}
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#E2E8F0' }}>
                                            Version Control
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            If app version is below minimum, the app shows update screen.
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginBottom: '10px' }}>
                                            MIN ANDROID VERSION
                                        </label>
                                        <input
                                            type="text"
                                            value={minAndroidVersion}
                                            onChange={(e) => setMinAndroidVersion(e.target.value)}
                                            placeholder="e.g. 1.2.4"
                                            style={{
                                                width: '100%',
                                                background: 'rgba(0,0,0,0.4)',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: '12px',
                                                padding: '12px',
                                                color: 'var(--text-main)',
                                                fontWeight: 800,
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginBottom: '10px' }}>
                                            MIN iOS VERSION
                                        </label>
                                        <input
                                            type="text"
                                            value={minIosVersion}
                                            onChange={(e) => setMinIosVersion(e.target.value)}
                                            placeholder="e.g. 1.2.4"
                                            style={{
                                                width: '100%',
                                                background: 'rgba(0,0,0,0.4)',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: '12px',
                                                padding: '12px',
                                                color: 'var(--text-main)',
                                                fontWeight: 800,
                                            }}
                                        />
                                    </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginBottom: '10px' }}>
                                            ANDROID STORE URL
                                        </label>
                                        <input
                                            type="text"
                                            value={androidStoreUrl}
                                            onChange={(e) => setAndroidStoreUrl(e.target.value)}
                                            placeholder="https://play.google.com/store/apps/details?id=..."
                                            style={{
                                                width: '100%',
                                                background: 'rgba(0,0,0,0.4)',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: '12px',
                                                padding: '12px',
                                                color: 'var(--text-main)',
                                                fontWeight: 700,
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginBottom: '10px' }}>
                                            iOS STORE URL
                                        </label>
                                        <input
                                            type="text"
                                            value={iosStoreUrl}
                                            onChange={(e) => setIosStoreUrl(e.target.value)}
                                            placeholder="https://apps.apple.com/app/id..."
                                            style={{
                                                width: '100%',
                                                background: 'rgba(0,0,0,0.4)',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: '12px',
                                                padding: '12px',
                                                color: 'var(--text-main)',
                                                fontWeight: 700,
                                            }}
                                        />
                                    </div>
                                    </div>

                                    <button
                                        onClick={() => void handleSaveVersionConfig()}
                                        disabled={savingAppConfig}
                                        style={{
                                            ...primaryButton,
                                            width: '100%',
                                            height: '42px',
                                            fontWeight: 900,
                                            fontSize: '0.72rem',
                                        }}
                                    >
                                        {savingAppConfig ? 'SAVING…' : 'SAVE VERSION CONTROL'}
                                    </button>
                                </div>

                                <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.03)' }} />

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginBottom: '12px' }}>GLOBAL ACTIVITY WEIGHT</label>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <input
                                            type="number"
                                            value={pointsValue}
                                            onChange={e => setPointsValue(parseInt(e.target.value))}
                                            style={{
                                                width: '100px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)',
                                                borderRadius: '12px', padding: '12px', color: 'var(--text-main)', fontWeight: 800, textAlign: 'center'
                                            }}
                                        />
                                        <button
                                            onClick={handleSavePoints}
                                            disabled={saving}
                                            style={{ ...secondaryButton, flex: 1, height: '48px' }}
                                        >
                                            {saving ? 'SYNCING...' : 'UPDATE REGISTRY'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                    <button
                                        onClick={handleSyncActivities}
                                        style={{ ...subtleButton, width: '100%', height: '46px' }}
                                    >
                                        FORCE REGISTRY RE-SYNC (SEEDER)
                                    </button>
                                </div>


                            </div>
                        </div>

                        {/* Legal: public URLs + admin editor (API → web /privacy /terms + mobile WebView) */}
                        <div className="glass-panel" style={{ padding: '32px' }}>
                            <h2 className="text-outfit" style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"></path><rect x="4" y="8" width="16" height="12" rx="2"></rect></svg>
                                Legal &amp; compliance
                            </h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: 1.5 }}>
                                Public pages load from the API. Edits here apply to the website and the in-app legal WebView.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
                                <a
                                    href="/privacy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-command"
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '14px 20px', textDecoration: 'none', color: 'var(--text-main)', fontWeight: 800, fontSize: '0.75rem' }}
                                >
                                    Preview Privacy →
                                </a>
                                <a
                                    href="/terms"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-command"
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '14px 20px', textDecoration: 'none', color: 'var(--text-main)', fontWeight: 800, fontSize: '0.75rem' }}
                                >
                                    Preview Terms →
                                </a>
                            </div>

                            <p style={{ fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', marginBottom: '12px' }}>EDIT SOURCE (HTML)</p>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Document</label>
                                <select
                                    value={legalSlug}
                                    onChange={(e) => setLegalSlug(e.target.value as 'privacy' | 'terms')}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'rgba(0,0,0,0.35)',
                                        color: 'var(--text-main)',
                                        fontWeight: 700,
                                    }}
                                >
                                    <option value="privacy">Privacy Policy</option>
                                    <option value="terms">Terms &amp; Conditions</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Title (shown in app bar)</label>
                                <input
                                    type="text"
                                    value={legalTitle}
                                    onChange={(e) => setLegalTitle(e.target.value)}
                                    disabled={legalLoading}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'rgba(0,0,0,0.35)',
                                        color: 'var(--text-main)',
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Body (HTML fragment)</label>
                                <textarea
                                    value={legalBody}
                                    onChange={(e) => setLegalBody(e.target.value)}
                                    disabled={legalLoading}
                                    rows={12}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'rgba(0,0,0,0.35)',
                                        color: 'var(--text-main)',
                                        fontFamily: 'ui-monospace, monospace',
                                        fontSize: '0.75rem',
                                        lineHeight: 1.45,
                                        resize: 'vertical',
                                    }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => void handleSaveLegal()}
                                disabled={legalLoading || legalSaving || !legalBody.trim()}
                                style={{
                                    ...primaryButton,
                                    width: '100%',
                                    height: '44px',
                                    fontWeight: 900,
                                    fontSize: '0.75rem',
                                }}
                            >
                                {legalSaving ? 'SAVING…' : legalLoading ? 'LOADING…' : 'SAVE TO API'}
                            </button>
                        </div>

                        {/* STATUS NOTIFICATION */}
                        {message && (
                            <div style={{
                                padding: '20px 25px',
                                background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1))',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: '#A78BFA',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px'
                            }}>
                                <span style={{ fontSize: '1rem' }}>🔔</span>
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
