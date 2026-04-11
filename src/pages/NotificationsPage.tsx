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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1>Push Center</h1>
                        <p style={{ maxWidth: 600 }}>
                            Manage all outbound messages, automated reminders, and workflow-triggered notifications
                            from this central mission control.
                        </p>
                    </div>
                    <div className="notifications-tabs">
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
                <div className={`notifications-alert${messageIsError ? ' is-error' : ''}`} role="status">
                    {message}
                </div>
            )}

            {loading ? (
                <div className="notifications-loader-wrap">
                    <div className="loader" />
                    <p>Syncing notification rules...</p>
                </div>
            ) : (
                <main style={{ marginTop: 24 }}>
                    {/* --- AUTOMATED SECTION --- */}
                    {activeTab === 'automated' && (
                        <div className="notifications-automation-grid">
                            <section className="automation-card">
                                <div className="card-header">
                                    <div className="icon">🗓️</div>
                                    <div>
                                        <h3>Momentum Daily Reminders</h3>
                                        <p>Triggered when users miss their daily tasks or audio requirements.</p>
                                    </div>
                                </div>
                                <div className="card-body">
                                    {dailyReminders.length === 0 ? (
                                        <p className="empty-msg">No active Momentum reminders configured.</p>
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
                                                        <span className="status-dot online" title="Active trigger" />
                                                    </div>
                                                </div>
                                            ))}
                                            <p className="hint-footer">
                                                Edit these details directly in the <b>Momentum</b> page.
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
                                        <p>Triggered by client flow actions and milestone updates.</p>
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
                                                        />
                                                        <strong>{w.display_name}</strong>
                                                    </label>
                                                    <span className="event-tag">{w.event_key}</span>
                                                </div>
                                                <div className="workflow-fields">
                                                    <input
                                                        className="mini-input"
                                                        value={w.title_template}
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
                                                        className="mini-textarea"
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
                                            <h2>Message</h2>
                                            <p className="hint">Custom push notification for the system shade.</p>
                                        </div>
                                    </div>
                                    <input
                                        required
                                        className="notifications-input"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Title (e.g. Special Webinar Alert)"
                                        style={{ marginBottom: 12 }}
                                    />
                                    <textarea
                                        required
                                        className="notifications-textarea"
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        placeholder="Main message body..."
                                    />
                                </section>

                                <section className="notifications-section">
                                    <div className="notifications-section-head">
                                        <span className="notifications-section-num">2</span>
                                        <div>
                                            <h2>Audience & Schedule</h2>
                                        </div>
                                    </div>
                                    <div className="notifications-grid-2">
                                        <select
                                            className="notifications-select"
                                            value={audience}
                                            onChange={(e) => setAudience(e.target.value as any)}
                                        >
                                            <option value="all">All Users</option>
                                            <option value="tier">By Tier</option>
                                            <option value="users">Select Users</option>
                                        </select>
                                        <input
                                            type="datetime-local"
                                            className="notifications-input"
                                            value={scheduledLocal}
                                            onChange={(e) => setScheduledLocal(e.target.value)}
                                        />
                                    </div>
                                </section>
                            </div>
                            <div className="notifications-submit-row">
                                <button type="submit" disabled={saving} className="btn-premium-primary">
                                    {saving ? 'Creating...' : 'Launch Broadcast'}
                                </button>
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
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.map((b) => (
                                            <tr key={b.id}>
                                                <td>
                                                    <div style={{ fontWeight: 700 }}>{b.title}</div>
                                                    <div className="table-body-preview">{b.body}</div>
                                                </td>
                                                <td>{audienceLabel(b)}</td>
                                                <td>
                                                    <span className={statusBadgeClass(b.status)}>{b.status}</span>
                                                </td>
                                                <td>{b.next_run_at ? new Date(b.next_run_at).toLocaleString() : '—'}</td>
                                                <td>
                                                    <div className="notifications-actions">
                                                        {b.status === 'scheduled' && (
                                                            <button className="btn-table-action" onClick={() => cancelRow(b.id)}>Cancel</button>
                                                        )}
                                                        <button className="btn-table-action" onClick={() => sendNowRow(b.id)}>Send Now</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
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
