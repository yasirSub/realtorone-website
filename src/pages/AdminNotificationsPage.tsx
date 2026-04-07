import React from 'react';
import { useNotification } from '../contexts/NotificationContext';

const AdminNotificationsPage: React.FC = () => {
    const { history, clearHistory } = useNotification();

    return (
        <div className="view-container fade-in" style={{ padding: '0 40px 60px 40px' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px', paddingTop: '30px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div className="pulse-dot" style={{ background: 'var(--success)' }}></div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
                            STRATEGIC EMISSION LOG
                        </span>
                    </div>
                    <h1 className="text-outfit" style={{ fontSize: '2.8rem', fontWeight: 900, margin: 0, letterSpacing: '-1.8px', textTransform: 'uppercase' }}>
                        System <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Command</span>
                    </h1>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <button className="btn-command" onClick={clearHistory}>PURGE LOG ARCHIVE</button>
                    <button className="btn-command primary">EXPORT AUDIT</button>
                </div>
            </div>

            {/* Logs List */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px 30px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between' }}>
                    <span className="card-heading" style={{ margin: 0 }}>Transmission Event Log</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>{history.length} PROTOCOLS RECORDED</span>
                </div>

                <div style={{ minHeight: '400px' }}>
                    {history.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', opacity: 0.3 }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}>
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                            </svg>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>SYSTEM QUIET: NO RECENT ANOMALIES</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 0 40px 0' }}>
                            {history.map((log) => (
                                <div
                                    key={log.id}
                                    className="glass-panel"
                                    style={{
                                        padding: '24px 30px',
                                        display: 'flex',
                                        gap: '24px',
                                        background: 'rgba(30, 41, 59, 0.6)',
                                        borderColor: 'rgba(255, 255, 255, 0.04)',
                                    }}
                                >
                                    <div className={`notification-icon-wrap ${log.type}`} style={{ width: '52px', height: '52px', borderRadius: '16px', background: `rgba(${log.type === 'success' ? '0,224,150' : log.type === 'error' ? '238,93,80' : '79, 70, 229'}, 0.1)` }}>
                                        {log.type === 'success' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00e096" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                        {log.type === 'info' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>}
                                        {log.type === 'error' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ee5d50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>{log.title}</div>
                                                <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }}></div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>v4.3</div>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', opacity: 0.6 }}>{new Date(log.timestamp!).toLocaleTimeString()}</div>
                                        </div>

                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 20px 0', lineHeight: '1.5', maxWidth: '80%' }}>
                                            {log.description}
                                        </p>

                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button className="btn-command">Explore Records</button>
                                            <button className="btn-command">Dismiss</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginTop: '30px' }}>
                <div className="glass-panel" style={{ padding: '25px' }}>
                    <div className="card-heading">Signal Stability</div>
                    <div className="text-outfit" style={{ fontSize: '1.4rem', fontWeight: 800 }}>100.0%</div>
                    <div className="metric-subtext">Optimal Network Connection</div>
                </div>
                <div className="glass-panel" style={{ padding: '25px' }}>
                    <div className="card-heading">Anomaly Detection</div>
                    <div className="text-outfit" style={{ fontSize: '1.4rem', fontWeight: 800 }}>NONE</div>
                    <div className="metric-subtext">Clean Execution Environment</div>
                </div>
                <div className="glass-panel" style={{ padding: '25px' }}>
                    <div className="card-heading">Protocol Latency</div>
                    <div className="text-outfit" style={{ fontSize: '1.4rem', fontWeight: 800 }}>0.12ms</div>
                    <div className="metric-subtext">Real-time Response Interface</div>
                </div>
            </div>

        </div>
    );
};

export default AdminNotificationsPage;
