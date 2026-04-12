import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import type { NotificationBroadcast, User } from '../types';
import './NotificationsPage.css';

interface NotificationsPageProps {
    users: User[];
}

const tierOptions = ['Consultant', 'Rainmaker', 'Titan'] as const;

function audienceLabel(b: NotificationBroadcast): string {
    if (b.audience === 'all') return 'All users';
    if (b.audience === 'tier') return `Tier: ${b.tier ?? '—'}`;
    const n = b.target_user_ids?.length ?? 0;
    return `Selected (${n})`;
}

function statusBadgeClass(status: string): string {
    const s = status.toLowerCase();
    if (s === 'scheduled') return 'notifications-badge status-scheduled';
    if (s === 'processing') return 'notifications-badge status-processing';
    if (s === 'completed') return 'notifications-badge status-completed';
    if (s === 'failed' || s === 'cancelled') return 'notifications-badge status-failed';
    return 'notifications-badge';
}

function displayBadgeClass(style: string): string {
    if (style === 'banner') return 'notifications-badge display-banner';
    if (style === 'silent') return 'notifications-badge display-silent';
    return 'notifications-badge display-standard';
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ users }) => {
    // --- State: General ---
    const [activeTab, setActiveTab] = useState<'broadcast' | 'automated' | 'history'>('automated');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [messageIsError, setMessageIsError] = useState(false);

    // --- State: Broadcast ---
    const [list, setList] = useState<NotificationBroadcast[]>([]);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [displayStyle, setDisplayStyle] = useState<'standard' | 'banner' | 'silent'>('standard');
    const [bannerSubtitle, setBannerSubtitle] = useState('');
    const [bannerCtaLabel, setBannerCtaLabel] = useState('Open');
    const [bannerAccentColor, setBannerAccentColor] = useState('#6366f1');
    const [bannerImageUrl, setBannerImageUrl] = useState('');
    const [audience, setAudience] = useState<'all' | 'tier' | 'users'>('all');
    const [tier, setTier] = useState<string>('Consultant');
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [userPicker, setUserPicker] = useState('');
    const [scheduledLocal, setScheduledLocal] = useState('');
    const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly'>('none');
    const [recurrenceTime, setRecurrenceTime] = useState('09:00');
    const [recurrenceDow, setRecurrenceDow] = useState(1);
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    const [deepLink, setDeepLink] = useState('');

    // --- State: Automation ---
    const [dailyReminders, setDailyReminders] = useState<any[]>([]);
    const [workflowTriggers, setWorkflowTriggers] = useState<any[]>([]);

    const clientUsers = useMemo(
        () =>
            users.filter(
                (u) =>
                    u.email !== 'admin@realtorone.com' &&
                    !u.is_admin &&
                    !(u.name || '').toLowerCase().includes('admin')
            ),
        [users]
    );

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [bRes, dRes, wRes] = await Promise.all([
                apiClient.getNotificationBroadcasts(),
                apiClient.getDailyReminders(),
                apiClient.getWorkflowTriggers(),
            ]);

            if (bRes.success) setList(bRes.data || []);
            if (dRes.success) setDailyReminders(dRes.data || []);
            if (wRes.success) setWorkflowTriggers(wRes.data || []);
        } catch (err) {
            console.error(err);
            setMessage('Failed to synchronize notification data.');
            setMessageIsError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAll();
    }, [loadAll]);

    const handleUpdateWorkflow = async (id: number, data: any) => {
        try {
            const res = await apiClient.updateWorkflowTrigger(id, data);
            if (res.success) {
                setMessage('Workflow updated successfully.');
                setMessageIsError(false);
                await loadAll();
            }
        } catch {
            setMessage('Failed to update workflow.');
            setMessageIsError(true);
        }
    };

    const toggleUser = (id: number) => {
        setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const filteredPicker = useMemo(() => {
        const q = userPicker.trim().toLowerCase();
        if (!q) return clientUsers.slice(0, 80);
        return clientUsers
            .filter(
                (u) =>
                    (u.name || '').toLowerCase().includes(q) ||
                    (u.email || '').toLowerCase().includes(q)
            )
            .slice(0, 80);
    }, [clientUsers, userPicker]);

    const buildExtraData = (): Record<string, string> | undefined => {
        if (displayStyle !== 'banner') return undefined;
        const out: Record<string, string> = {
            banner_subtitle: bannerSubtitle.trim(),
            banner_cta_label: (bannerCtaLabel.trim() || 'Open').slice(0, 32),
            banner_accent_color: bannerAccentColor.trim() || '#6366f1',
        };
        if (bannerImageUrl.trim() !== '') {
            out.banner_image_url = bannerImageUrl.trim().slice(0, 2000);
        }
        return out;
    };

    const submitBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        setMessageIsError(false);
        try {
            const scheduled_at =
                scheduledLocal.trim() === ''
                    ? undefined
                    : new Date(scheduledLocal).toISOString();

            const res = await apiClient.createNotificationBroadcast({
                title: title.trim(),
                body: body.trim(),
                display_style: displayStyle,
                audience,
                tier: audience === 'tier' ? tier : undefined,
                target_user_ids: audience === 'users' ? selectedUserIds : undefined,
                scheduled_at: scheduled_at ?? null,
                recurrence_type: recurrenceType,
                recurrence_time: recurrenceType === 'none' ? undefined : recurrenceTime,
                recurrence_day_of_week: recurrenceType === 'weekly' ? recurrenceDow : undefined,
                timezone,
                deep_link: deepLink.trim() || undefined,
                extra_data: buildExtraData(),
            });

            if (!res.success) {
                setMessage(res.message || 'Could not create notification.');
                setMessageIsError(true);
                return;
            }

            setMessage('Broadcast queued successfully.');
            setMessageIsError(false);
            setTitle('');
            setBody('');
            setActiveTab('history');
            await loadAll();
        } catch {
            setMessage('Network error.');
            setMessageIsError(true);
        } finally {
            setSaving(false);
        }
    };

    const cancelRow = async (id: number) => {
        const res = await apiClient.cancelNotificationBroadcast(id);
        if (res.success) await loadAll();
    };

    const sendNowRow = async (id: number) => {
        const res = await apiClient.sendNowNotificationBroadcast(id);
        if (res.success) await loadAll();
    };

    return (
        <div className="page-notifications">
            <header className="notifications-hero">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <h1>Push Center</h1>
                            <div className="notifications-badge status-completed" style={{ fontSize: '0.6rem', padding: '4px 8px' }}>
                                <span className="status-pulse" style={{ width: 6, height: 6 }}></span>
                                System Online
                            </div>
                        </div>
                        <p>
                            Manage all outbound messages, automated reminders, and workflow-triggered notifications
                            from this central mission control.
                        </p>
                    </div>
                    <div className="notifications-tabs-wrap">
                        <button
                            className={activeTab === 'automated' ? 'active' : ''}
                            onClick={() => setActiveTab('automated')}
                        >
                            Automated Sentinel
                        </button>
                        <button
                            className={activeTab === 'broadcast' ? 'active' : ''}
                            onClick={() => setActiveTab('broadcast')}
                        >
                            Broadcast Center
                        </button>
                        <button
                            className={activeTab === 'history' ? 'active' : ''}
                            onClick={() => setActiveTab('history')}
                        >
                            History & Logs
                        </button>
                    </div>
                </div>
            </header>

            {message && (
                <div className={`notifications-alert${messageIsError ? ' is-error' : ''}`} role="status" style={{
                    padding: '16px 24px',
                    borderRadius: '16px',
                    marginBottom: '24px',
                    background: messageIsError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid ${messageIsError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                    color: messageIsError ? '#f87171' : '#10b981',
                    fontWeight: 700
                }}>
                    {message}
                </div>
            )}

            {loading ? (
                <div className="notifications-loader-wrap">
                    <div className="loader" />
                    <p>Syncing notification rules...</p>
                </div>
            ) : (
                <main style={{ marginTop: 32 }}>
                    {/* --- AUTOMATED SECTION --- */}
                    {activeTab === 'automated' && (
                        <div className="notifications-automation-grid">
                            <section className="automation-card">
                                <div className="card-header">
                                    <div className="icon">🗓️</div>
                                    <div>
                                        <h3>Momentum Reminders</h3>
                                        <p>Missed daily tasks & missing audio cues.</p>
                                    </div>
                                </div>
                                <div className="card-body">
                                    {dailyReminders.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
                                            <p className="empty-msg">No active Momentum reminders.</p>
                                        </div>
                                    ) : (
                                        <div className="automation-list">
                                            {dailyReminders.map((r, i) => (
                                                <div key={i} className="automation-item">
                                                    <div className="item-info">
                                                        <span className="day">Day {r.day_number}</span>
                                                        <span className="name">{r.activity_name}</span>
                                                    </div>
                                                    <div className="item-config">
                                                        <span className="time">{r.reminder_time}</span>
                                                        <span className="status-pulse" title="Active trigger" />
                                                    </div>
                                                </div>
                                            ))}
                                            <p style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: 12, textAlign: 'center' }}>
                                                Manage these in the Momentum Activity settings.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="automation-card">
                                <div className="card-header">
                                    <div className="icon">🤝</div>
                                    <div>
                                        <h3>Deal Room Workflows</h3>
                                        <p>Milestone & client flow triggers.</p>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="automation-list">
                                        {workflowTriggers.map((w) => (
                                            <div key={w.id} className="workflow-item">
                                                <div className="workflow-head">
                                                    <label className="workflow-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!w.is_enabled}
                                                            onChange={(e) =>
                                                                handleUpdateWorkflow(w.id, { is_enabled: e.target.checked })
                                                            }
                                                            style={{ width: 22, height: 22, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                                        />
                                                        <strong>{w.display_name}</strong>
                                                    </label>
                                                    <span className="event-tag">{w.event_key}</span>
                                                </div>
                                                <div className="workflow-fields">
                                                    <input
                                                        className="notifications-input"
                                                        value={w.title_template}
                                                        style={{ padding: '10px 16px', fontSize: '0.9rem', marginBottom: 8 }}
                                                        onChange={(e) =>
                                                            setWorkflowTriggers((prev) =>
                                                                prev.map((x) =>
                                                                    x.id === w.id ? { ...x, title_template: e.target.value } : x
                                                                )
                                                            )
                                                        }
                                                        onBlur={() =>
                                                            handleUpdateWorkflow(w.id, { title_template: w.title_template })
                                                        }
                                                        placeholder="Title template..."
                                                    />
                                                    <textarea
                                                        className="notifications-textarea"
                                                        style={{ padding: '10px 16px', fontSize: '0.9rem', minHeight: 80 }}
                                                        value={w.body_template}
                                                        onChange={(e) =>
                                                            setWorkflowTriggers((prev) =>
                                                                prev.map((x) =>
                                                                    x.id === w.id ? { ...x, body_template: e.target.value } : x
                                                                )
                                                            )
                                                        }
                                                        onBlur={() =>
                                                            handleUpdateWorkflow(w.id, { body_template: w.body_template })
                                                        }
                                                        placeholder="Body template..."
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* --- BROADCAST SECTION --- */}
                    {activeTab === 'broadcast' && (
                        <form onSubmit={submitBroadcast} className="notifications-form">
                            <div className="notifications-card">
                                <section className="notifications-section">
                                    <div className="notifications-section-head">
                                        <span className="notifications-section-num">1</span>
                                        <div>
                                            <h2>Message Content</h2>
                                            <p className="hint" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                Craft a compelling notification for your users.
                                            </p>
                                        </div>
                                    </div>
                                    <input
                                        required
                                        className="notifications-input"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Broadcast Title (e.g. Workshop Starting Now!)"
                                        style={{ marginBottom: 16 }}
                                    />
                                    <textarea
                                        required
                                        className="notifications-textarea"
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        placeholder="Write your message here..."
                                    />
                                </section>

                                <section className="notifications-section">
                                    <div className="notifications-section-head">
                                        <span className="notifications-section-num">2</span>
                                        <div>
                                            <h2>Targeting & Schedule</h2>
                                        </div>
                                    </div>
                                    <div className="notifications-grid-2">
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Audience</label>
                                            <select
                                                className="notifications-select"
                                                value={audience}
                                                onChange={(e) => {
                                                    console.log('Audience changed to:', e.target.value);
                                                    setAudience(e.target.value as any);
                                                }}
                                            >
                                                <option value="all">All Registered Users</option>
                                                <option value="tier">Member Tier</option>
                                                <option value="users">Specific User List</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Release Time</label>
                                            <input
                                                type="datetime-local"
                                                className="notifications-input"
                                                value={scheduledLocal}
                                                onChange={(e) => setScheduledLocal(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* --- TIER SELECTION --- */}
                                    {audience === 'tier' && (
                                        <div className="targeting-options-panel" style={{ marginTop: 24, padding: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select Target Tier</label>
                                            <div style={{ display: 'flex', gap: 12 }}>
                                                {tierOptions.map((t) => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => setTier(t)}
                                                        className={`tier-btn ${tier === t ? 'active' : ''}`}
                                                        style={{
                                                            flex: 1,
                                                            padding: '14px',
                                                            borderRadius: '16px',
                                                            border: '1px solid',
                                                            borderColor: tier === t ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                                            background: tier === t ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                                                            color: tier === t ? '#fff' : 'var(--text-muted)',
                                                            fontWeight: 800,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                        }}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* --- SPECIFIC USER PICKER --- */}
                                    {audience === 'users' && (
                                        <div className="targeting-options-panel" style={{ marginTop: 24, padding: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select Users</label>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>{selectedUserIds.length} users selected</span>
                                                </div>
                                                <input
                                                    className="notifications-input"
                                                    style={{ width: 280, padding: '10px 18px', fontSize: '0.85rem' }}
                                                    placeholder="Search practitioners..."
                                                    value={userPicker}
                                                    onChange={(e) => setUserPicker(e.target.value)}
                                                />
                                            </div>

                                            {filteredPicker.length === 0 ? (
                                                <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: 16 }}>
                                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No practitioners found. Check your search query or sync.</p>
                                                </div>
                                            ) : (
                                                <div style={{ maxHeight: 280, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 4 }}>
                                                    {filteredPicker.map((u) => (
                                                        <label
                                                            key={u.id}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 12,
                                                                padding: '12px 16px',
                                                                background: selectedUserIds.includes(u.id) ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                borderRadius: 16,
                                                                border: '1px solid',
                                                                borderColor: selectedUserIds.includes(u.id) ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedUserIds.includes(u.id)}
                                                                onChange={() => toggleUser(u.id)}
                                                                style={{ width: 20, height: 20, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                                            />
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>{u.name || 'Anonymous Practitioner'}</span>
                                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</span>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {selectedUserIds.length > 0 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setSelectedUserIds([])}
                                                    style={{ marginTop: 16, fontSize: '0.7rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                                >
                                                    Clear Selection
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </section>

                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                                    <button type="submit" disabled={saving} className="btn-premium-primary">
                                        {saving ? (
                                            <>
                                                <span className="loader" style={{ width: 20, height: 20, borderTopColor: '#fff', margin: 0 }}></span>
                                                Queuing...
                                            </>
                                        ) : (
                                            <>
                                                <span>🚀</span>
                                                Launch Broadcast
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* --- HISTORY SECTION --- */}
                    {activeTab === 'history' && (
                        <div className="notifications-history">
                            <div className="notifications-table-wrap">
                                <table className="notifications-table">
                                    <thead>
                                        <tr>
                                            <th>Message</th>
                                            <th>Audience</th>
                                            <th>Status</th>
                                            <th>Schedule</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
                                                    No broadcast history found.
                                                </td>
                                            </tr>
                                        ) : (
                                            list.map((b) => (
                                                <tr key={b.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 800, color: '#fff' }}>{b.title}</div>
                                                        <div className="table-body-preview" style={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {b.body}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span style={{ fontWeight: 600 }}>{audienceLabel(b)}</span>
                                                    </td>
                                                    <td>
                                                        <span className={statusBadgeClass(b.status)}>{b.status}</span>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontSize: '0.85rem' }}>
                                                            {b.next_run_at ? new Date(b.next_run_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Immediate'}
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div className="notifications-actions" style={{ justifyContent: 'flex-end' }}>
                                                            {b.status === 'scheduled' && (
                                                                <button className="btn-table-action" style={{ color: '#f87171' }} onClick={() => cancelRow(b.id)}>Cancel</button>
                                                            )}
                                                            <button className="btn-table-action" onClick={() => sendNowRow(b.id)}>Send Now</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            )}
        </div>
    );

};

export default NotificationsPage;
