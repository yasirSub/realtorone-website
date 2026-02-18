import React from 'react';
import { apiClient } from '../../api/client';

interface AddActivityModalProps {
    show: boolean;
    onClose: () => void;
    newActivity: any;
    setNewActivity: (val: any) => void;
    setActivityTypes: (val: any) => void;
}

const AddActivityModal: React.FC<AddActivityModalProps> = ({
    show,
    onClose,
    newActivity,
    setNewActivity,
    setActivityTypes
}) => {
    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '450px' }}>
                <div style={{ padding: '30px' }}>
                    <h3 style={{ margin: '0 0 25px 0', fontSize: '1.4rem', fontWeight: 900 }}>Define Intelligence Metric</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label className="form-label">ACTIVITY NAME</label>
                            <input
                                placeholder="Market Analysis"
                                value={newActivity.name}
                                onChange={e => setNewActivity({ ...newActivity, name: e.target.value })}
                                className="form-input"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label className="form-label">REWARD POINTS</label>
                                <input
                                    type="number"
                                    value={newActivity.points}
                                    onChange={e => setNewActivity({ ...newActivity, points: Number(e.target.value) })}
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">VISUAL ICON</label>
                                <input
                                    placeholder="📊"
                                    value={newActivity.icon}
                                    onChange={e => setNewActivity({ ...newActivity, icon: e.target.value })}
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="form-label">COGNITIVE CATEGORY</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className={`filter-btn ${newActivity.category === 'conscious' ? 'active' : ''}`}
                                    onClick={() => setNewActivity({ ...newActivity, category: 'conscious' })}
                                    style={{ flex: 1 }}
                                >Revenue Actions</button>
                                <button
                                    className={`filter-btn ${newActivity.category === 'subconscious' ? 'active' : ''}`}
                                    onClick={() => setNewActivity({ ...newActivity, category: 'subconscious' })}
                                    style={{ flex: 1 }}
                                >Identity Conditioning</button>
                            </div>
                        </div>

                        <div>
                            <label className="form-label">MINIMUM TIER ACCESS</label>
                            <select
                                className="form-input"
                                style={{ width: '100%' }}
                                value={newActivity.min_tier}
                                onChange={e => setNewActivity({ ...newActivity, min_tier: e.target.value })}
                            >
                                <option value="Consultant">Consultant</option>
                                <option value="Rainmaker">Rainmaker</option>
                                <option value="Titan">Titan</option>
                            </select>
                        </div>

                        <button className="btn-primary" style={{ marginTop: '10px', height: '50px' }} onClick={() => {
                            apiClient.createActivityType(newActivity, true).then(res => {
                                if (res.success) {
                                    setActivityTypes((prev: any[]) => [res.data, ...prev]);
                                    onClose();
                                    setNewActivity({ name: '', points: 5, category: 'conscious', icon: 'Activity', is_global: true, min_tier: 'Consultant' });
                                }
                            });
                        }}>Commit to Global Infrastructure</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddActivityModal;
