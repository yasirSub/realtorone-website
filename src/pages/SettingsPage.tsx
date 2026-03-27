import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import '../index.css';

const SettingsPage: React.FC = () => {
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
        apiClient.getPointsPerActivity().then(res => {
            if (res.success) setPointsValue(res.data.points_per_activity);
        });
    }, []);

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
            const res = await apiClient.restoreBackupWithProgress(file, (percent) => {
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
        <div className="admin-layout" style={{ 
            minHeight: '100vh', 
            background: 'radial-gradient(circle at 0% 0%, #1a1a2e 0%, #0d0d14 100%)',
            padding: '50px',
            color: '#fff',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '60px' }}>
                    <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '15px', letterSpacing: '-2px', textShadow: '0 0 30px rgba(139, 92, 246, 0.3)' }}>System Admin</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ padding: '4px 12px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, color: '#A78BFA' }}>
                            INFRASTRUCTURE v4.2
                        </div>
                        <div style={{ width: '1px', height: '15px', background: 'rgba(255,255,255,0.1)' }} />
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', margin: 0 }}>Advanced cluster controls and terminal parameters.</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '40px' }}>
                    
                    {/* DISASTER RECOVERY PANEL */}
                    <div style={{ 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        backdropFilter: 'blur(15px)',
                        borderRadius: '30px',
                        padding: '40px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        boxShadow: '0 40px 100px -20px rgba(0,0,0,0.6)',
                        position: 'relative'
                    }}>
                        <div style={{ position: 'absolute', top: '40px', right: '40px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 15px #EF4444' }} />
                        </div>

                        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '35px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontSize: '1.2rem' }}>💎</span> Disaster Recovery
                        </h2>

                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '30px' }}>
                            <p style={{ fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '20px' }}>ARCHIVE SPECIFICATIONS</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <label style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px', cursor: 'pointer', padding: '15px', borderRadius: '12px', background: includeDb ? 'rgba(139, 92, 246, 0.05)' : 'transparent', border: `1px solid ${includeDb ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.2s' }}>
                                    <input type="checkbox" checked={includeDb} onChange={e => setIncludeDb(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#8B5CF6' }} />
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Database Set</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.4 }}>MySQL Nodes</div>
                                    </div>
                                </label>
                                <label style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px', cursor: 'pointer', padding: '15px', borderRadius: '12px', background: includeMedia ? 'rgba(139, 92, 246, 0.05)' : 'transparent', border: `1px solid ${includeMedia ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.2s' }}>
                                    <input type="checkbox" checked={includeMedia} onChange={e => setIncludeMedia(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#8B5CF6' }} />
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Media Assets</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.4 }}>public/* storage</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
                            <button 
                                onClick={handleDownloadBackup}
                                disabled={isBackingUp || isRestoring}
                                style={{ 
                                    flex: 1.5, height: '60px', borderRadius: '18px', border: 'none',
                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                                    color: '#fff', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer',
                                    boxShadow: '0 20px 40px -10px rgba(139, 92, 246, 0.4)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    opacity: (isBackingUp || isRestoring) ? 0.6 : 1,
                                    textTransform: 'uppercase', letterSpacing: '1px'
                                }}
                            >
                                {isBackingUp ? 'Compiling Archive...' : 'Generate New Backup'}
                            </button>
                            <label style={{ 
                                flex: 1, height: '60px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.03)', color: '#fff', fontWeight: 800, fontSize: '0.8rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                transition: 'all 0.2s ease', opacity: (isBackingUp || isRestoring) ? 0.5 : 1
                            }}>
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
                                        background: isBackingUp ? 'linear-gradient(90deg, #8B5CF6, #6D28D9)' : 'linear-gradient(90deg, #10B981, #059669)',
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
                                                        <div style={{ fontSize: '0.6rem', opacity: 0.4 }}>{(bak.size / (1024*1024)).toFixed(2)} MB • {new Date(bak.created_at * 1000).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button onClick={() => apiClient.downloadBackup(bak.name)} style={{ padding: '8px 15px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}>DNLD</button>
                                                    <button onClick={async () => { if(window.confirm('Erase?')) { await apiClient.deleteBackup(bak.name); fetchBackups(); } }} style={{ padding: '8px 15px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#EF4444', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}>DEL</button>
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
                        <div style={{ 
                            background: 'rgba(255, 255, 255, 0.02)', 
                            backdropFilter: 'blur(15px)',
                            borderRadius: '30px',
                            padding: '40px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}>
                             <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '1rem' }}>⚙️</span> Terminal Control
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
                                                width: '100px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '12px', padding: '12px', color: '#fff', fontWeight: 800, textAlign: 'center'
                                            }}
                                        />
                                        <button 
                                            onClick={handleSavePoints}
                                            disabled={saving}
                                            style={{ 
                                                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '12px', color: '#fff', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer'
                                            }}
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

                                <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div style={{ padding: '20px', background: 'rgba(234, 179, 8, 0.05)', border: '1px dashed rgba(234, 179, 8, 0.2)', borderRadius: '15px' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#EAB308', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                            <span>⚠️</span> System Advisory
                                        </div>
                                        <p style={{ fontSize: '0.7rem', color: '#EAB308', opacity: 0.8, margin: 0, lineHeight: 1.5 }}>
                                            Always verify ZIP integrity before restoration. Large archives may require extended server allocation.
                                        </p>
                                    </div>
                                </div>
                            </div>
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
