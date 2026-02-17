import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Course } from '../types';

interface CoursesPageProps {
    courses: Course[];
    setCourses: (courses: any[]) => void;
}

export const CoursesPage: React.FC<CoursesPageProps> = ({ courses, setCourses }) => {
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [formData, setFormData] = useState<Partial<Course>>({
        title: '',
        description: '',
        url: '',
        min_tier: 'Free'
    });

    const loadCourses = async () => {
        setLoading(true);
        try {
            const res = await apiClient.getCourses();
            if (res.success) {
                setCourses(res.data);
            }
        } catch (error) {
            console.error('Failed to load courses', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (editingCourse) {
                await apiClient.updateCourse(editingCourse.id, formData);
            } else {
                await apiClient.createCourse(formData);
            }
            setShowModal(false);
            setEditingCourse(null);
            setFormData({ title: '', description: '', url: '', min_tier: 'Free' });
            loadCourses();
        } catch (error) {
            console.error('Failed to save course', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this course?')) {
            try {
                await apiClient.deleteCourse(id);
                loadCourses();
            } catch (error) {
                console.error('Failed to delete course', error);
            }
        }
    };

    const openModal = (course?: Course) => {
        if (course) {
            setEditingCourse(course);
            setFormData({
                title: course.title,
                description: course.description,
                url: course.url,
                min_tier: course.min_tier
            });
        } else {
            setEditingCourse(null);
            setFormData({ title: '', description: '', url: '', min_tier: 'Free' });
        }
        setShowModal(true);
    };

    if (loading) return <div className="loader"></div>;

    return (
        <div className="courses-page fade-in">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button
                    className="btn-primary"
                    onClick={() => openModal()}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    ADD NEW COURSE
                </button>
            </div>

            <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {courses.map(course => (
                    <div key={course.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                            <span className={`tier-pill ${course.min_tier.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>{course.min_tier} Content</span>
                        </div>

                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '5px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </div>

                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{course.title}</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>{course.description}</p>

                        {course.url && (
                            <a href={course.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}>
                                Access Resource <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                        )}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                            <button
                                onClick={() => openModal(course)}
                                style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                                EDIT
                            </button>
                            <button
                                onClick={() => handleDelete(course.id)}
                                style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '8px', color: 'var(--error)', cursor: 'pointer' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ width: '500px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>{editingCourse ? 'Edit Course' : 'Deploy New Content'}</h2>
                            <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure educational material details.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="form-group">
                                <label>Course Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Advanced Sales Psychology"
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief summary of the learning outcome..."
                                    rows={3}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-app)', color: 'var(--text-main)', resize: 'vertical' }}
                                />
                            </div>

                            <div className="form-group">
                                <label>Resource URL (Video/Doc)</label>
                                <input
                                    type="text"
                                    value={formData.url || ''}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="https://"
                                />
                            </div>

                            <div className="form-group">
                                <label>Access Tier</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                                    {['Free', 'Silver', 'Gold', 'Diamond'].map(tier => (
                                        <div
                                            key={tier}
                                            onClick={() => setFormData({ ...formData, min_tier: tier as any })}
                                            style={{
                                                padding: '10px',
                                                textAlign: 'center',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                border: formData.min_tier === tier ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                                                background: formData.min_tier === tier ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                                                fontWeight: formData.min_tier === tier ? 800 : 500
                                            }}
                                        >
                                            {tier}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>CANCEL</button>
                                <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave}>
                                    {editingCourse ? 'UPDATE COURSE' : 'PUBLISH COURSE'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
