import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { NotificationSetting } from '../types';
import '../pages/NotificationsPage.css'; // Reusing their existing CSS

export const NotificationSettingsManager: React.FC = () => {
    const [settings, setSettings] = useState<NotificationSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);

    // Form states
    const [editingId, setEditingId] = useState<number | null>(null);
    const [key, setKey] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [defaultTitle, setDefaultTitle] = useState('');
    const [defaultBody, setDefaultBody] = useState('');
    const [triggerSettingsJSON, setTriggerSettingsJSON] = useState('{\n  \n}');
    const [isEnabled, setIsEnabled] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await apiClient.getNotificationSettings();
            setSettings(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setMessage('Failed to load settings.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadSettings();
    }, []);

    const resetForm = () => {
        setEditingId(null);
        setKey('');
        setName('');
        setDescription('');
        setDefaultTitle('');
        setDefaultBody('');
        setTriggerSettingsJSON('{\n  \n}');
        setIsEnabled(true);
    };

    const handleEdit = (item: NotificationSetting) => {
        setEditingId(item.id);
        setKey(item.key);
        setName(item.name);
        setDescription(item.description || '');
        setDefaultTitle(item.default_title || '');
        setDefaultBody(item.default_body || '');
        setIsEnabled(item.is_enabled);
        setTriggerSettingsJSON(item.trigger_settings ? JSON.stringify(item.trigger_settings, null, 2) : '{\n  \n}');
    };

    const handleToggleEnable = async (item: NotificationSetting) => {
        try {
            await apiClient.updateNotificationSetting(item.id, { is_enabled: !item.is_enabled });
            await loadSettings();
        } catch {
            alert('Failed to toggle status');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        let parsedSettings = null;
        try {
            if (triggerSettingsJSON.trim()) {
                parsedSettings = JSON.parse(triggerSettingsJSON);
            }
        } catch {
            setMessage('Trigger Settings must be valid JSON');
            setSaving(false);
            return;
        }

        const payload = {
            key,
            name,
            description,
            default_title: defaultTitle,
            default_body: defaultBody,
            is_enabled: isEnabled,
            trigger_settings: parsedSettings
        };

        try {
            if (editingId) {
                await apiClient.updateNotificationSetting(editingId, payload);
                setMessage('Setting updated successfully.');
            } else {
                await apiClient.createNotificationSetting(payload);
                setMessage('Setting created successfully.');
            }
            resetForm();
            await loadSettings();
        } catch (err: any) {
            setMessage(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading && settings.length === 0) {
        return <p style={{ color: 'var(--text-muted)' }}>Loading control system...</p>;
    }

    return (
        <div style={{ marginTop: 24 }}>
            {message && (
                <div className="notifications-alert" role="status" style={{ marginBottom: 20 }}>
                    {message}
                </div>
            )}

            <div className="notifications-grid-2" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <div className="notifications-history">
                        <h2>Automated Notification Rules</h2>
                        <p className="hint">Toggle these rules on/off or click Edit to modify deep parameters.</p>
                        
                        {settings.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No rules defined yet.</p>
                        ) : (
                            <div className="notifications-table-wrap">
                                <table className="notifications-table">
                                    <thead>
                                        <tr>
                                            <th>Rule Name & Key</th>
                                            <th>Default Content</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {settings.map(s => (
                                            <tr key={s.id}>
                                                <td>
                                                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                                                        <code>{s.key}</code>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.default_title || '—'}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.default_body || '—'}</div>
                                                </td>
                                                <td>
                                                    <button 
                                                        onClick={() => handleToggleEnable(s)}
                                                        style={{
                                                            background: s.is_enabled ? '#10b98122' : '#334155',
                                                            color: s.is_enabled ? '#10b981' : '#94a3b8',
                                                            border: 'none',
                                                            padding: '4px 8px',
                                                            borderRadius: 4,
                                                            cursor: 'pointer',
                                                            fontWeight: 600,
                                                            fontSize: '0.75rem'
                                                        }}
                                                    >
                                                        {s.is_enabled ? 'Active' : 'Disabled'}
                                                    </button>
                                                </td>
                                                <td>
                                                    <button className="notifications-btn-ghost" onClick={() => handleEdit(s)}>Edit param</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="notifications-card" style={{ flex: '0 0 380px', padding: 24 }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: 16 }}>{editingId ? 'Edit Rule' : 'Create New Rule'}</h2>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="notifications-field">
                            <label className="notifications-label">Key (unique ID)</label>
                            <input 
                                className="notifications-input" 
                                required 
                                value={key} 
                                onChange={e => setKey(e.target.value)} 
                                disabled={editingId !== null}
                                placeholder="e.g. dealer_room_alert"
                            />
                        </div>

                        <div className="notifications-field">
                            <label className="notifications-label">Display Name</label>
                            <input 
                                className="notifications-input" 
                                required 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder="Dealer Room Message"
                            />
                        </div>

                        <div className="notifications-field">
                            <label className="notifications-label">Default Title Template</label>
                            <input 
                                className="notifications-input" 
                                value={defaultTitle} 
                                onChange={e => setDefaultTitle(e.target.value)} 
                                placeholder="New message from {user}"
                            />
                        </div>

                        <div className="notifications-field">
                            <label className="notifications-label">Default Body Template</label>
                            <textarea 
                                className="notifications-textarea" 
                                value={defaultBody} 
                                onChange={e => setDefaultBody(e.target.value)} 
                                placeholder="You have a new unread message..."
                            />
                        </div>

                        <div className="notifications-field">
                            <label className="notifications-label">Trigger Parameters (JSON)</label>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, marginTop: -4 }}>
                                Define custom timings or logic flags here (like task notification time enter).
                            </p>
                            <textarea 
                                className="notifications-textarea" 
                                value={triggerSettingsJSON} 
                                onChange={e => setTriggerSettingsJSON(e.target.value)}
                                style={{ fontFamily: 'monospace', minHeight: 120 }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                            <button type="submit" disabled={saving} className="notifications-submit-btn" style={{ flex: 1 }}>
                                {saving ? 'Saving...' : 'Save Rule'}
                            </button>
                            {editingId && (
                                <button type="button" onClick={resetForm} className="notifications-btn-ghost">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
