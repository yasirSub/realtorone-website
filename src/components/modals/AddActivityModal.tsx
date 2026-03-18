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

    const defaultSectionTitle = newActivity.category === 'subconscious'
        ? 'Day 1'
        : 'Conscious';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '450px' }}>
                <div style={{ padding: '30px' }}>
                    <h3 style={{ margin: '0 0 25px 0', fontSize: '1.4rem', fontWeight: 900 }}>Add Daily Task</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                                <label className="form-label">TASK NAME</label>
                            <input
                                placeholder="Market Analysis"
                                value={newActivity.name}
                                onChange={e => setNewActivity({ ...newActivity, name: e.target.value })}
                                className="form-input"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label className="form-label">POINTS</label>
                                <input
                                    type="number"
                                    value={newActivity.points}
                                    onChange={e => setNewActivity({ ...newActivity, points: Number(e.target.value) })}
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">ICON</label>
                                <input
                                    placeholder="📊"
                                    value={newActivity.icon}
                                    onChange={e => setNewActivity({ ...newActivity, icon: e.target.value })}
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="form-label">CATEGORY</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className={`filter-btn ${newActivity.category === 'conscious' ? 'active' : ''}`}
                                    onClick={() => setNewActivity({ ...newActivity, category: 'conscious', section_title: 'Conscious' })}
                                    style={{ flex: 1 }}
                                >Conscious</button>
                                <button
                                    className={`filter-btn ${newActivity.category === 'subconscious' ? 'active' : ''}`}
                                    onClick={() => setNewActivity({ ...newActivity, category: 'subconscious', section_title: 'Day 1' })}
                                    style={{ flex: 1 }}
                                >Subconscious</button>
                            </div>
                        </div>

                        <div>
                            <label className="form-label">TASK DESCRIPTION</label>
                            <textarea
                                rows={3}
                                value={newActivity.description ?? ''}
                                onChange={e => setNewActivity({ ...newActivity, description: e.target.value })}
                                className="form-input"
                                style={{ resize: 'vertical' }}
                                placeholder="Write instructions for what user should do."
                            />
                        </div>

                        <div>
                            <label className="form-label">VIDEO/REEL SCRIPT IDEA</label>
                            <textarea
                                rows={3}
                                value={newActivity.script_idea ?? ''}
                                onChange={e => setNewActivity({ ...newActivity, script_idea: e.target.value })}
                                className="form-input"
                                style={{ resize: 'vertical' }}
                                placeholder="Founder explains real client scenario..."
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr', gap: '15px' }}>
                            <div>
                                <label className="form-label">DAY / INNER SECTION</label>
                                {newActivity.category === 'subconscious' && (
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                        <button
                                            className={`filter-btn ${newActivity.section_title === 'Day 1' ? 'active' : ''}`}
                                            onClick={() => setNewActivity({ ...newActivity, section_title: 'Day 1', section_order: 1 })}
                                            style={{ flex: 1, padding: '10px 10px', fontSize: '0.75rem' }}
                                        >
                                            Day 1
                                        </button>
                                        <button
                                            className={`filter-btn ${newActivity.section_title === 'Day 2' ? 'active' : ''}`}
                                            onClick={() => setNewActivity({ ...newActivity, section_title: 'Day 2', section_order: 2 })}
                                            style={{ flex: 1, padding: '10px 10px', fontSize: '0.75rem' }}
                                        >
                                            Day 2
                                        </button>
                                    </div>
                                )}
                                <input
                                    placeholder={defaultSectionTitle}
                                    value={newActivity.section_title ?? ''}
                                    onChange={e => setNewActivity({ ...newActivity, section_title: e.target.value })}
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">SECTION ORDER</label>
                                <input
                                    type="number"
                                    value={newActivity.section_order ?? 1}
                                    onChange={e => setNewActivity({ ...newActivity, section_order: Number(e.target.value) })}
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">ITEM ORDER</label>
                                <input
                                    type="number"
                                    value={newActivity.item_order ?? 1}
                                    onChange={e => setNewActivity({ ...newActivity, item_order: Number(e.target.value) })}
                                    className="form-input"
                                />
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
                                    setNewActivity({
                                        name: '',
                                        description: '',
                                        script_idea: '',
                                        points: 5,
                                        category: 'conscious',
                                        section_title: 'Conscious',
                                        section_order: 1,
                                        item_order: 1,
                                        icon: 'Activity',
                                        is_global: true,
                                        min_tier: 'Consultant'
                                    });
                                }
                            });
                        }}>Add Task</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddActivityModal;
