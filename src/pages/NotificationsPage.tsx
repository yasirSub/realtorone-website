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
    const [list, setList] = useState<NotificationBroadcast[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [messageIsError, setMessageIsError] = useState(false);

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

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.getNotificationBroadcasts();
            if (res.success && res.data) setList(res.data);
        } catch {
            setMessage('Failed to load notifications.');
            setMessageIsError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

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

    const previewHeadline = title.trim() || 'Notification title';
    const previewSubtitle = (bannerSubtitle.trim() || body.trim() || 'Supporting line or main message body appears here.');
    const previewThumbStyle: React.CSSProperties =
        bannerImageUrl.trim() !== ''
            ? { backgroundImage: `url(${bannerImageUrl.trim()})` }
            : { background: `${bannerAccentColor}33` };

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

    const submit = async (e: React.FormEvent) => {
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
                const err =
                    res.message ||
                    (res.errors ? JSON.stringify(res.errors) : 'Could not create notification.');
                setMessage(err);
                setMessageIsError(true);
                return;
            }

            setMessage('Notification queued. It will send when the scheduler runs (or immediately if due).');
            setMessageIsError(false);
            setTitle('');
            setBody('');
            setScheduledLocal('');
            setSelectedUserIds([]);
            setBannerSubtitle('');
            setBannerCtaLabel('Open');
            setBannerAccentColor('#6366f1');
            setBannerImageUrl('');
            await load();
        } catch {
            setMessage('Network error.');
            setMessageIsError(true);
        } finally {
            setSaving(false);
        }
    };

    const cancelRow = async (id: number) => {
        const res = await apiClient.cancelNotificationBroadcast(id);
        setMessage(res.success ? 'Cancelled.' : res.message || 'Cancel failed.');
        setMessageIsError(!res.success);
        if (res.success) void load();
    };

    const sendNowRow = async (id: number) => {
        const res = await apiClient.sendNowNotificationBroadcast(id);
        setMessage(res.success ? 'Send dispatched to the queue.' : res.message || 'Send failed.');
        setMessageIsError(!res.success);
        if (res.success) void load();
    };

    return (
        <div className="page-notifications">
            <header className="notifications-hero">
                <h1>Push notifications</h1>
                <p>
                    Messages are delivered to the mobile app through your Firebase project (<strong>realtor-one</strong>
                    ). The API server still needs a{' '}
                    <code>service account</code> JSON path and <code>FIREBASE_PROJECT_ID</code> to send FCM from Laravel.
                    This admin site uses Firebase for Analytics only.
                </p>
            </header>

            {message && (
                <div className={`notifications-alert${messageIsError ? ' is-error' : ''}`} role="status">
                    {message}
                </div>
            )}

            <form onSubmit={submit} className="notifications-form">
                <div className="notifications-card">
                    {/* 1 — Message */}
                    <section className="notifications-section">
                        <div className="notifications-section-head">
                            <span className="notifications-section-num">1</span>
                            <div>
                                <h2>Message</h2>
                                <p className="hint">
                                    <strong>Title</strong> is the push headline (notification shade + in-app).{' '}
                                    <strong>Body</strong> is the main text. For banner mode you can keep the body short
                                    and use the optional banner subtitle below for a second line.
                                </p>
                            </div>
                        </div>
                        <div className="notifications-field">
                            <label className="notifications-label" htmlFor="notif-title">
                                Title
                            </label>
                            <input
                                id="notif-title"
                                required
                                className="notifications-input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Don’t miss today’s momentum"
                            />
                        </div>
                        <div className="notifications-field">
                            <label className="notifications-label" htmlFor="notif-body">
                                Body
                            </label>
                            <textarea
                                id="notif-body"
                                required
                                className="notifications-textarea"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Main message users read in the notification and in the app."
                            />
                        </div>
                    </section>

                    {/* 2 — Display */}
                    <section className="notifications-section">
                        <div className="notifications-section-head">
                            <span className="notifications-section-num">2</span>
                            <div>
                                <h2>How it appears on the phone</h2>
                                <p className="hint">
                                    Choose how the app should surface this push while the user is inside the app.
                                    System tray behavior still uses title + body for all types.
                                </p>
                            </div>
                        </div>

                        <div className="notifications-display-cards" role="radiogroup" aria-label="Display style">
                            <button
                                type="button"
                                className={`notifications-display-card${displayStyle === 'standard' ? ' is-active' : ''}`}
                                onClick={() => setDisplayStyle('standard')}
                            >
                                <span className="title">Standard</span>
                                <span className="desc">
                                    Floating snackbar when the app is open. Best for quick, non-blocking reminders.
                                </span>
                            </button>
                            <button
                                type="button"
                                className={`notifications-display-card${displayStyle === 'banner' ? ' is-active' : ''}`}
                                onClick={() => setDisplayStyle('banner')}
                            >
                                <span className="title">Banner</span>
                                <span className="desc">
                                    Full-width in-app banner (Material banner). Configure subtitle, colors, image, and
                                    action below.
                                </span>
                            </button>
                            <button
                                type="button"
                                className={`notifications-display-card${displayStyle === 'silent' ? ' is-active' : ''}`}
                                onClick={() => setDisplayStyle('silent')}
                            >
                                <span className="title">Silent / data</span>
                                <span className="desc">
                                    Data-only payload for the app to handle without showing an in-app popup (tray may
                                    still show if the OS decides to).
                                </span>
                            </button>
                        </div>

                        {displayStyle === 'banner' && (
                            <div className="notifications-banner-panel">
                                <p className="panel-title">Banner appearance</p>
                                <p className="panel-desc">
                                    These fields are sent to the app as extra data. They control the in-app banner look;
                                    title and body above are still used for the lock-screen / shade notification.
                                </p>

                                <div className="notifications-grid-2">
                                    <div className="notifications-field">
                                        <label className="notifications-label" htmlFor="banner-sub">
                                            Banner subtitle (optional)
                                        </label>
                                        <input
                                            id="banner-sub"
                                            className="notifications-input"
                                            value={bannerSubtitle}
                                            onChange={(e) => setBannerSubtitle(e.target.value)}
                                            placeholder="Second line under the title in the banner"
                                        />
                                    </div>
                                    <div className="notifications-field">
                                        <label className="notifications-label" htmlFor="banner-cta">
                                            Primary button label
                                        </label>
                                        <input
                                            id="banner-cta"
                                            className="notifications-input"
                                            value={bannerCtaLabel}
                                            onChange={(e) => setBannerCtaLabel(e.target.value)}
                                            placeholder="Open"
                                            maxLength={32}
                                        />
                                    </div>
                                </div>

                                <div className="notifications-grid-2">
                                    <div className="notifications-field">
                                        <label className="notifications-label">Accent color</label>
                                        <div className="notifications-color-row">
                                            <input
                                                type="color"
                                                value={bannerAccentColor}
                                                onChange={(e) => setBannerAccentColor(e.target.value)}
                                                aria-label="Banner accent color"
                                            />
                                            <input
                                                className="notifications-input"
                                                style={{ flex: 1, minWidth: 120 }}
                                                value={bannerAccentColor}
                                                onChange={(e) => setBannerAccentColor(e.target.value)}
                                                placeholder="#6366f1"
                                            />
                                        </div>
                                    </div>
                                    <div className="notifications-field">
                                        <label className="notifications-label" htmlFor="banner-img">
                                            Thumbnail image URL (optional)
                                        </label>
                                        <input
                                            id="banner-img"
                                            className="notifications-input"
                                            value={bannerImageUrl}
                                            onChange={(e) => setBannerImageUrl(e.target.value)}
                                            placeholder="https://…"
                                        />
                                    </div>
                                </div>

                                <p className="panel-title" style={{ marginTop: 8 }}>
                                    Live preview (approximate)
                                </p>
                                <div className="notifications-preview-phone">
                                    <div className="notifications-preview-frame">
                                        <div
                                            className="notifications-preview-banner-mock"
                                            style={{ background: `linear-gradient(90deg, ${bannerAccentColor}22, transparent)` }}
                                        >
                                            <div className="thumb" style={previewThumbStyle} />
                                            <div className="text">
                                                <div className="t">{previewHeadline}</div>
                                                <div className="s">{previewSubtitle}</div>
                                                <div className="b">
                                                    {(bannerCtaLabel.trim() || 'Open')} · Dismiss
                                                </div>
                                            </div>
                                        </div>
                                        <div className="notifications-preview-screen" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {displayStyle === 'standard' && (
                            <p className="hint" style={{ marginTop: 12, marginBottom: 0 }}>
                                Users will see a compact snackbar at the bottom while using the app.
                            </p>
                        )}
                    </section>

                    {/* 3 — Audience */}
                    <section className="notifications-section">
                        <div className="notifications-section-head">
                            <span className="notifications-section-num">3</span>
                            <div>
                                <h2>Who receives it</h2>
                                <p className="hint">Same membership tiers as the Registry filter. Admins are excluded.</p>
                            </div>
                        </div>
                        <div className="notifications-grid-2">
                            <div className="notifications-field">
                                <label className="notifications-label" htmlFor="audience">
                                    Audience
                                </label>
                                <select
                                    id="audience"
                                    className="notifications-select"
                                    value={audience}
                                    onChange={(e) => setAudience(e.target.value as typeof audience)}
                                >
                                    <option value="all">All app users</option>
                                    <option value="tier">One membership tier</option>
                                    <option value="users">Hand-picked users</option>
                                </select>
                            </div>
                            {audience === 'tier' && (
                                <div className="notifications-field">
                                    <label className="notifications-label" htmlFor="tier">
                                        Tier
                                    </label>
                                    <select
                                        id="tier"
                                        className="notifications-select"
                                        value={tier}
                                        onChange={(e) => setTier(e.target.value)}
                                    >
                                        {tierOptions.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {audience === 'users' && (
                            <div className="notifications-field">
                                <label className="notifications-label" htmlFor="user-search">
                                    Select users ({selectedUserIds.length} selected)
                                </label>
                                <input
                                    id="user-search"
                                    className="notifications-input"
                                    value={userPicker}
                                    onChange={(e) => setUserPicker(e.target.value)}
                                    placeholder="Search by name or email…"
                                />
                                <div className="notifications-user-chips">
                                    {filteredPicker.map((u) => (
                                        <label key={u.id} className="notifications-user-row">
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.includes(u.id)}
                                                onChange={() => toggleUser(u.id)}
                                            />
                                            <span>
                                                {u.name || '—'}{' '}
                                                <span style={{ color: 'var(--text-muted)' }}>{u.email}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* 4 — Schedule */}
                    <section className="notifications-section">
                        <div className="notifications-section-head">
                            <span className="notifications-section-num">4</span>
                            <div>
                                <h2>When to send</h2>
                                <p className="hint">
                                    Leave schedule empty to send as soon as the worker picks it up. Recurrence repeats
                                    using your timezone and the time you set.
                                </p>
                            </div>
                        </div>
                        <div className="notifications-grid-2">
                            <div className="notifications-field">
                                <label className="notifications-label" htmlFor="sched">
                                    First send (optional)
                                </label>
                                <input
                                    id="sched"
                                    type="datetime-local"
                                    className="notifications-input"
                                    value={scheduledLocal}
                                    onChange={(e) => setScheduledLocal(e.target.value)}
                                />
                            </div>
                            <div className="notifications-field">
                                <label className="notifications-label" htmlFor="tz">
                                    Timezone
                                </label>
                                <input
                                    id="tz"
                                    className="notifications-input"
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                    placeholder="e.g. America/Toronto"
                                />
                            </div>
                        </div>
                        <div className="notifications-grid-3">
                            <div className="notifications-field">
                                <label className="notifications-label" htmlFor="rec">
                                    Repeat
                                </label>
                                <select
                                    id="rec"
                                    className="notifications-select"
                                    value={recurrenceType}
                                    onChange={(e) => setRecurrenceType(e.target.value as typeof recurrenceType)}
                                >
                                    <option value="none">One time</option>
                                    <option value="daily">Every day</option>
                                    <option value="weekly">Every week</option>
                                </select>
                            </div>
                            {recurrenceType !== 'none' && (
                                <>
                                    <div className="notifications-field">
                                        <label className="notifications-label" htmlFor="rect">
                                            At local time
                                        </label>
                                        <input
                                            id="rect"
                                            type="time"
                                            className="notifications-input"
                                            value={recurrenceTime}
                                            onChange={(e) => setRecurrenceTime(e.target.value)}
                                        />
                                    </div>
                                    {recurrenceType === 'weekly' && (
                                        <div className="notifications-field">
                                            <label className="notifications-label" htmlFor="dow">
                                                Weekday
                                            </label>
                                            <select
                                                id="dow"
                                                className="notifications-select"
                                                value={recurrenceDow}
                                                onChange={(e) => setRecurrenceDow(Number(e.target.value))}
                                            >
                                                <option value={0}>Sunday</option>
                                                <option value={1}>Monday</option>
                                                <option value={2}>Tuesday</option>
                                                <option value={3}>Wednesday</option>
                                                <option value={4}>Thursday</option>
                                                <option value={5}>Friday</option>
                                                <option value={6}>Saturday</option>
                                            </select>
                                        </div>
                                    )}

                                    {recurrenceType === 'daily' && (
                                        <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
                                            Daily messages auto-surface based on device local time: morning = Banner, afternoon =
                                            Snackbar, evening = Banner.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </section>

                    {/* 5 — Deep link */}
                    <section className="notifications-section">
                        <div className="notifications-section-head">
                            <span className="notifications-section-num">5</span>
                            <div>
                                <h2>Open in app (optional)</h2>
                                <p className="hint">
                                    If set, the banner&apos;s primary button can open this URL or app link (when
                                    supported). Leave empty to only dismiss the banner.
                                </p>
                            </div>
                        </div>
                        <div className="notifications-field">
                            <label className="notifications-label" htmlFor="deeplink">
                                Deep link or URL
                            </label>
                            <input
                                id="deeplink"
                                className="notifications-input"
                                value={deepLink}
                                onChange={(e) => setDeepLink(e.target.value)}
                                placeholder="https://… or realtorone://…"
                            />
                        </div>
                    </section>
                </div>

                <div className="notifications-submit-row">
                    <button type="submit" disabled={saving} className="notifications-submit-btn">
                        {saving ? 'Creating…' : 'Create & queue notification'}
                    </button>
                </div>
            </form>

            <div className="notifications-history">
                <h2>Recent broadcasts</h2>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
                ) : list.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No broadcasts yet.</p>
                ) : (
                    <div className="notifications-table-wrap">
                        <table className="notifications-table">
                            <thead>
                                <tr>
                                    <th>Message</th>
                                    <th>Display</th>
                                    <th>Audience</th>
                                    <th>Status</th>
                                    <th>Schedule</th>
                                    <th>Sent</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((b) => (
                                    <tr key={b.id}>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{b.title}</div>
                                            <div
                                                style={{
                                                    color: 'var(--text-muted)',
                                                    maxWidth: 260,
                                                    fontSize: '0.8rem',
                                                    marginTop: 4,
                                                    lineHeight: 1.35,
                                                }}
                                            >
                                                {b.body}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={displayBadgeClass(b.display_style)}>
                                                {b.display_style}
                                            </span>
                                        </td>
                                        <td>{audienceLabel(b)}</td>
                                        <td>
                                            <span className={statusBadgeClass(b.status)}>{b.status}</span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.8rem' }}>
                                                {b.next_run_at ? new Date(b.next_run_at).toLocaleString() : '—'}
                                            </div>
                                            {b.last_run_at && (
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
                                                    Last: {new Date(b.last_run_at).toLocaleString()}
                                                </div>
                                            )}
                                        </td>
                                        <td>{b.last_sent_count ?? 0}</td>
                                        <td>
                                            <div className="notifications-actions">
                                                {b.status === 'scheduled' && (
                                                    <button
                                                        type="button"
                                                        className="notifications-btn-ghost"
                                                        onClick={() => void cancelRow(b.id)}
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                                {(b.status === 'scheduled' ||
                                                    b.status === 'completed' ||
                                                    b.status === 'failed') && (
                                                    <button
                                                        type="button"
                                                        className="notifications-btn-ghost"
                                                        onClick={() => void sendNowRow(b.id)}
                                                    >
                                                        Send now
                                                    </button>
                                                )}
                                            </div>
                                            {b.last_error && (
                                                <div style={{ color: '#f87171', fontSize: '0.7rem', marginTop: 8, maxWidth: 200 }}>
                                                    {b.last_error}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
