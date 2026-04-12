import React, { useState, useEffect } from 'react';
import type { Webinar } from '../types';
import { apiClient } from '../api/client';
import { useNotification } from '../contexts/NotificationContext';
import ConfirmModal from '../components/modals/ConfirmModal';
import './WebinarsPage.css';

const WebinarsPage: React.FC = () => {
    const { addNotification } = useNotification();
    const [webinars, setWebinars] = useState<Webinar[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    
    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingWebinar, setEditingWebinar] = useState<Partial<Webinar> | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: number; title: string } | null>(null);

    useEffect(() => {
        loadWebinars();
    }, []);

    const loadWebinars = async () => {
        try {
            const res = await apiClient.getAdminWebinars();
            if (res.success) {
                setWebinars(res.data);
            }
        } catch (error: any) {
            addNotification({
                type: 'error',
                title: 'Sync Error',
                description: error.message || 'Failed to sync with webinar database.'
            });
        } finally {
            setIsInitialLoading(false);
        }
    };

    const handleSaveWebinar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingWebinar) return;

        setIsActionLoading(true);
        try {
            if (editingWebinar.id) {
                await apiClient.updateWebinar(editingWebinar.id, editingWebinar);
                addNotification({ type: 'success', title: 'Session Updated', description: 'Webinar parameters synchronized successfully.' });
            } else {
                await apiClient.createWebinar(editingWebinar);
                addNotification({ type: 'success', title: 'New Webcast Slotted', description: 'The upcoming webinar has been added to the registry.' });
            }
            setShowModal(false);
            setEditingWebinar(null);
            loadWebinars();
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Protocol Failure', description: error.message });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setIsActionLoading(true);
        try {
            await apiClient.deleteWebinar(confirmDelete.id);
            addNotification({ type: 'info', title: 'Registry Purged', description: `Webinar "${confirmDelete.title}" has been removed.` });
            setConfirmDelete(null);
            loadWebinars();
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Deletion Blocked', description: error.message });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleNotify = async (id: number, title: string) => {
        setIsActionLoading(true);
        try {
            const res = await apiClient.notifyWebinar(id);
            addNotification({ 
                type: 'success', 
                title: 'Transmission Dispatched', 
                description: `Push notification for "${title}" sent to all users.`,
                meta: `BROADCAST_ID: #${res.broadcast_id}`
            });
        } catch (error: any) {
            addNotification({ type: 'error', title: 'Broadcast Failed', description: error.message });
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredWebinars = webinars.filter(w => 
        w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isInitialLoading) {
        return (
            <div className="webinar-loader-container">
                <div className="elite-spinner"></div>
                <span>Syncing Webinar Hub...</span>
            </div>
        );
    }

    return (
        <div className="webinars-page">
            <header className="page-header-premium">
                <div className="header-content">
                    <h1>Webinar Hub</h1>
                    <p className="subtitle">Manage upcoming sessions, promotions, and live broadcasts.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar-modern">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input 
                            type="text" 
                            placeholder="Search sessions..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary-gradient" onClick={() => { setEditingWebinar({ is_active: true, is_promotional: false, target_tier: 'Consultant' }); setShowModal(true); }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        New Webinar
                    </button>
                </div>
            </header>

            <div className="webinars-grid">
                {filteredWebinars.length === 0 ? (
                    <div className="empty-state-card col-span-full">
                        <div className="empty-icon-hub">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                        </div>
                        <h3>No webinars found</h3>
                        <p>Schedule your first live session to engage with your network.</p>
                    </div>
                ) : (
                    filteredWebinars.map(webinar => (
                        <div key={webinar.id} className={`webinar-card-premium ${!webinar.is_active ? 'inactive' : ''}`}>
                            <div className="card-thumb">
                                {webinar.image_url ? (
                                    <img src={webinar.image_url} alt={webinar.title} />
                                ) : (
                                    <div className="thumb-placeholder">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                    </div>
                                )}
                                <div className="card-badges">
                                    {webinar.is_promotional && <span className="badge-promo">PROMO</span>}
                                    <span className={`badge-tier ${webinar.target_tier || 'all'}`}>
                                        {webinar.target_tier || 'ALL TIERS'}
                                    </span>
                                </div>
                            </div>
                            <div className="card-body">
                                <h3>{webinar.title}</h3>
                                <p className="description">{webinar.description || 'No description provided.'}</p>
                                
                                <div className="card-meta">
                                    <div className="meta-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        <span>{webinar.scheduled_at ? new Date(webinar.scheduled_at).toLocaleString() : 'Not scheduled'}</span>
                                    </div>
                                    <div className="meta-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                        <span className="link-truncate">{webinar.zoom_link || 'No link'}</span>
                                    </div>
                                </div>

                                <div className="card-actions-hub">
                                    <button className="btn-icon-glass" title="Edit" onClick={() => { setEditingWebinar(webinar); setShowModal(true); }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                    <button className="btn-icon-glass notify" title="Send Push Notification" onClick={() => handleNotify(webinar.id, webinar.title)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                    </button>
                                    <button className="btn-icon-glass delete" title="Delete" onClick={() => setConfirmDelete({ id: webinar.id, title: webinar.title })}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit/Add Modal */}
            {showModal && (
                <div className="glass-modal-overlay">
                    <div className="glass-modal-content webinar-edit-modal">
                        <header>
                            <h2>{editingWebinar?.id ? 'Adjust Webcast' : 'Schedule Session'}</h2>
                            <button className="btn-close-glass" onClick={() => setShowModal(false)}>&times;</button>
                        </header>
                        <form onSubmit={handleSaveWebinar}>
                            <div className="form-grid">
                                <div className="form-group col-span-full">
                                    <label>Webinar Title</label>
                                    <input 
                                        required
                                        type="text" 
                                        value={editingWebinar?.title || ''} 
                                        onChange={e => setEditingWebinar({ ...editingWebinar, title: e.target.value })}
                                        placeholder="e.g. Masterclass: Real Estate Lead Engine"
                                    />
                                </div>
                                <div className="form-group col-span-full">
                                    <label>Description (Notification Body)</label>
                                    <textarea 
                                        rows={3}
                                        value={editingWebinar?.description || ''} 
                                        onChange={e => setEditingWebinar({ ...editingWebinar, description: e.target.value })}
                                        placeholder="Deep dive into lead conversion tactics..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Scheduled Date & Time</label>
                                    <input 
                                        type="datetime-local" 
                                        value={editingWebinar?.scheduled_at ? new Date(editingWebinar.scheduled_at).toISOString().slice(0, 16) : ''} 
                                        onChange={e => setEditingWebinar({ ...editingWebinar, scheduled_at: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Target Audience Tier</label>
                                    <select 
                                        value={editingWebinar?.target_tier || ''} 
                                        onChange={e => setEditingWebinar({ ...editingWebinar, target_tier: e.target.value || null })}
                                    >
                                        <option value="">All Tiers</option>
                                        <option value="Consultant">Consultant</option>
                                        <option value="Rainmaker">Rainmaker</option>
                                        <option value="Titan">Titan</option>
                                    </select>
                                </div>
                                <div className="form-group col-span-full">
                                    <label>Meeting/Zoom Link</label>
                                    <input 
                                        type="url" 
                                        value={editingWebinar?.zoom_link || ''} 
                                        onChange={e => setEditingWebinar({ ...editingWebinar, zoom_link: e.target.value })}
                                        placeholder="https://zoom.us/j/..."
                                    />
                                </div>
                                <div className="form-group col-span-full">
                                    <label>Thumbnail Image URL</label>
                                    <input 
                                        type="url" 
                                        value={editingWebinar?.image_url || ''} 
                                        onChange={e => setEditingWebinar({ ...editingWebinar, image_url: e.target.value })}
                                        placeholder="External image hosting link..."
                                    />
                                </div>
                                <div className="form-row switches">
                                    <label className="modern-switch">
                                        <input 
                                            type="checkbox" 
                                            checked={editingWebinar?.is_active} 
                                            onChange={e => setEditingWebinar({ ...editingWebinar, is_active: e.target.checked })} 
                                        />
                                        <span className="slider"></span>
                                        <span className="label">Live & Searchable</span>
                                    </label>
                                    <label className="modern-switch">
                                        <input 
                                            type="checkbox" 
                                            checked={editingWebinar?.is_promotional} 
                                            onChange={e => setEditingWebinar({ ...editingWebinar, is_promotional: e.target.checked })} 
                                        />
                                        <span className="slider"></span>
                                        <span className="label">Promotional Highlight</span>
                                    </label>
                                </div>
                            </div>
                            <footer>
                                <button type="button" className="btn-secondary-glass" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary-gradient" disabled={isActionLoading}>
                                    {isActionLoading ? 'Processing...' : (editingWebinar?.id ? 'Update Registry' : 'Schedule Now')}
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal 
                show={!!confirmDelete}
                title="Wipe Webinar Registry"
                message={`Are you sure you want to remove "${confirmDelete?.title}"? Users will no longer be able to see this session.`}
                onConfirm={handleDelete}
                onClose={() => setConfirmDelete(null)}
            />
        </div>
    );
};

export default WebinarsPage;
