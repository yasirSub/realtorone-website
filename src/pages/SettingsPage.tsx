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
    const [message, setMessage] = useState('');

    // Backup State
    const [includeDb, setIncludeDb] = useState(true);
    const [includeMedia, setIncludeMedia] = useState(true);
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
        });
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
        if (!includeDb && !includeMedia) {
            setMessage('Select at least one archive component.');
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
            const res = await apiClient.getBackup({ db: includeDb, media: includeMedia });
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
            setMessage(`Protocol error: ${error.message || 'Unknown failure'}`);
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
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MySQL Nodes</div>
                                    </div>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', padding: '18px', borderRadius: '14px', background: includeMedia ? 'rgba(139, 92, 246, 0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${includeMedia ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.2s' }}>
                                    <input type="checkbox" checked={includeMedia} onChange={e => setIncludeMedia(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Media Assets</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>public/* distribution</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
                            <button
                                onClick={handleDownloadBackup}
                                disabled={isBackingUp || isRestoring}
                                className="btn-command primary"
                                style={{ flex: 1.5, height: '60px', padding: 0 }}
                            >
                                {isBackingUp ? 'Compiling Archive...' : 'Generate New Backup'}
                            </button>
                            <label className="btn-command" style={{ flex: 1, height: '60px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                                                    <button onClick={() => apiClient.downloadBackup(bak.name)} style={{ padding: '8px 15px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}>DNLD</button>
                                                    <button onClick={async () => { if (window.confirm('Erase?')) { await apiClient.deleteBackup(bak.name); fetchBackups(); } }} style={{ padding: '8px 15px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#EF4444', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}>DEL</button>
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

                        {/* MAINTENANCE CARD */}
                        <div className="glass-panel" style={{ padding: '40px' }}>
                            <h2 className="text-outfit" style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                Terminal Control
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
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
                                            className="btn-command"
                                            style={{ flex: 1, padding: 0 }}
                                        >
                                            {saving ? 'SYNCING...' : 'UPDATE REGISTRY'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                    <button
                                        onClick={handleSyncActivities}
                                        style={{
                                            width: '100%', padding: '18px', background: 'rgba(0,0,0,0.2)', border: '1px dashed rgba(255,255,255,0.1)',
                                            borderRadius: '15px', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                                        }}
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
                                className="btn-command primary"
                                style={{ width: '100%', padding: '14px', fontWeight: 900, fontSize: '0.75rem' }}
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
