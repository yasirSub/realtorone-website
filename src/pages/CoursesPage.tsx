import React, { useState } from 'react';
import { apiClient } from '../api/client';
import type { Course } from '../types';
import CurriculumEditor from '../components/courses/CurriculumEditor';

interface CoursesPageProps {
    courses: Course[];
    setCourses: (courses: any[]) => void;
}

const TIERS = [
    {
        key: 'Consultant',
        label: 'Consultant',
        icon: '🔵',
        color: '#38BDF8',
        gradient: 'linear-gradient(160deg, rgba(14,165,233,0.10) 0%, rgba(8,11,42,0.0) 100%)',
        borderColor: 'rgba(56,189,248,0.2)',
        headerBg: 'linear-gradient(135deg, #0369A1, #0EA5E9)',
    },
    {
        key: 'Rainmaker',
        label: 'Rainmaker',
        icon: '⚪',
        color: '#94A3B8',
        gradient: 'linear-gradient(160deg, rgba(148,163,184,0.08) 0%, rgba(8,11,42,0.0) 100%)',
        borderColor: 'rgba(148,163,184,0.18)',
        headerBg: 'linear-gradient(135deg, #475569, #94A3B8)',
    },
    {
        key: 'Titan',
        label: 'Titan',
        icon: '🟡',
        color: '#F59E0B',
        gradient: 'linear-gradient(160deg, rgba(245,158,11,0.10) 0%, rgba(8,11,42,0.0) 100%)',
        borderColor: 'rgba(245,158,11,0.22)',
        headerBg: 'linear-gradient(135deg, #B45309, #F59E0B)',
    },
];

export const CoursesPage: React.FC<CoursesPageProps> = ({ courses, setCourses }) => {
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [formData, setFormData] = useState<Partial<Course> & { thumbnail_url?: string }>({
        title: '',
        description: '',
        url: '',
        min_tier: 'Consultant',
        thumbnail_url: undefined,
    });
    const [uploading, setUploading] = useState(false);
    const [selectedCourseForCurriculum, setSelectedCourseForCurriculum] = useState<number | null>(null);

    const loadCourses = async () => {
        try {
            const res = await apiClient.getCourses();
            if (res.success) setCourses(res.data);
        } catch (error) {
            console.error('Failed to load courses', error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingCourse) {
                await apiClient.updateCourse(editingCourse.id, formData);
            } else {
                await apiClient.createCourse(formData);
            }
            setShowModal(false);
            setEditingCourse(null);
            resetForm();
            loadCourses();
        } catch (error) {
            console.error('Failed to save course', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Delete this course? This cannot be undone.')) {
            try {
                await apiClient.deleteCourse(id);
                loadCourses();
            } catch (error) {
                console.error('Failed to delete course', error);
            }
        }
    };

    const resetForm = () => {
        setFormData({ title: '', description: '', url: '', min_tier: 'Consultant', thumbnail_url: undefined });
    };

    const openModal = (tier: string, course?: Course) => {
        if (course) {
            setEditingCourse(course);
            setFormData({
                title: course.title,
                description: course.description,
                url: course.url,
                min_tier: course.min_tier,
                thumbnail_url: (course as any).thumbnail_url,
            });
        } else {
            setEditingCourse(null);
            resetForm();
            setFormData(prev => ({ ...prev, min_tier: tier as any }));
        }
        setShowModal(true);
    };

    const getTierColor = (tier: string) =>
        TIERS.find(t => t.key.toLowerCase() === tier.toLowerCase())?.color ?? '#38BDF8';

    if (selectedCourseForCurriculum) {
        return (
            <CurriculumEditor
                courseId={selectedCourseForCurriculum}
                onBack={() => {
                    setSelectedCourseForCurriculum(null);
                    loadCourses();
                }}
            />
        );
    }

    return (
        <div className="courses-page fade-in" style={{ padding: '0' }}>
            {/* Page Header */}
            <div style={{
                marginBottom: '28px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
                        Educational Content
                    </h1>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                        Manage courses by access tier — each column represents a subscription level
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>Total: <strong style={{ color: 'var(--text-main)' }}>{courses.length}</strong> courses</span>
                </div>
            </div>

            {/* 3-Column Tier Layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '20px',
                alignItems: 'start'
            }}>
                {TIERS.map(tier => {
                    const tierCourses = courses.filter(c => c.min_tier === tier.key);
                    return (
                        <div key={tier.key} style={{
                            borderRadius: '20px',
                            border: `1px solid ${tier.borderColor}`,
                            background: tier.gradient,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: '400px',
                        }}>
                            {/* Column Header */}
                            <div style={{
                                background: tier.headerBg,
                                padding: '18px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '16px',
                                        backdropFilter: 'blur(4px)',
                                    }}>
                                        {tier.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: '1rem', color: 'white', letterSpacing: '-0.3px' }}>
                                            {tier.label}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
                                            {tierCourses.length} course{tierCourses.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => openModal(tier.key)}
                                    title={`Add ${tier.label} course`}
                                    style={{
                                        width: '34px', height: '34px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        color: 'white',
                                        fontWeight: 900,
                                        fontSize: '20px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer',
                                        lineHeight: 1,
                                        backdropFilter: 'blur(4px)',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                                >
                                    +
                                </button>
                            </div>

                            {/* Course Cards */}
                            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                {tierCourses.length === 0 ? (
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '40px 20px',
                                        textAlign: 'center',
                                        gap: '10px',
                                    }}>
                                        <div style={{ fontSize: '32px', opacity: 0.3 }}>📚</div>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                            No {tier.label} courses yet
                                        </p>
                                        <button
                                            onClick={() => openModal(tier.key)}
                                            style={{
                                                marginTop: '6px',
                                                padding: '8px 18px',
                                                background: `${tier.color}18`,
                                                border: `1px dashed ${tier.color}60`,
                                                borderRadius: '10px',
                                                color: tier.color,
                                                fontWeight: 800,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                letterSpacing: '0.5px',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            + ADD FIRST COURSE
                                        </button>
                                    </div>
                                ) : (
                                    tierCourses.map(course => (
                                        <CourseCard
                                            key={course.id}
                                            course={course}
                                            tierColor={tier.color}
                                            onEdit={() => openModal(tier.key, course)}
                                            onDelete={() => handleDelete(course.id)}
                                            onCurriculum={() => setSelectedCourseForCurriculum(course.id)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div
                    className="premium-modal-overlay"
                    onClick={() => { setShowModal(false); setEditingCourse(null); resetForm(); }}
                    style={{
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center', // Center it perfectly for visibility
                        justifyContent: 'center',
                        backdropFilter: 'blur(20px)',
                        background: 'rgba(2, 6, 23, 0.85)',
                        position: 'fixed',
                        inset: 0,
                        padding: '20px'
                    }}
                >
                    <div
                        className="premium-modal-card"
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '95%',
                            maxWidth: '680px', // Standard comfortable width
                            background: '#0F172A',
                            borderRadius: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '85vh', // Safe viewport height
                            boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            overflow: 'hidden',
                            position: 'relative'
                        }}
                    >
                        {/* Top Accent Stripe */}
                        <div style={{
                            height: '10px',
                            background: `linear-gradient(90deg, ${getTierColor(formData.min_tier ?? 'Consultant')}, #6366F1, transparent)`,
                            flexShrink: 0
                        }} />

                        <div className="modal-header" style={{
                            padding: '22px 30px',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0
                        }}>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                                    {editingCourse ? 'Master Course Architect' : 'New Deployment'}
                                </h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        background: `${getTierColor(formData.min_tier ?? 'Consultant')}22`,
                                        color: getTierColor(formData.min_tier ?? 'Consultant'),
                                        fontSize: '10px',
                                        fontWeight: 900,
                                        border: `1px solid ${getTierColor(formData.min_tier ?? 'Consultant')}44`,
                                    }}>
                                        ACCESS: {formData.min_tier}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowModal(false); setEditingCourse(null); resetForm(); }}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '18px',
                                    cursor: 'pointer',
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{
                            padding: '24px 32px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px',
                            overflowY: 'auto',
                            flex: 1,
                            scrollbarWidth: 'thin'
                        }}>
                            {/* Thumbnail preview + upload */}
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                <div style={{
                                    width: '80px', height: '80px', borderRadius: '14px', flexShrink: 0,
                                    background: '#0B1437', border: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative',
                                }}>
                                    {formData.thumbnail_url ? (
                                        <img src={formData.thumbnail_url} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '28px' }}>🎓</span>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#8F9BBA', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                                        Course Thumbnail
                                    </label>
                                    <input
                                        type="file"
                                        id="modal-thumb"
                                        hidden
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setUploading(true);
                                                const res = await apiClient.uploadFile(file, 'Image');
                                                if (res.success) setFormData(prev => ({ ...prev, thumbnail_url: res.url }));
                                                setUploading(false);
                                            }
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <label htmlFor="modal-thumb" style={{
                                            display: 'inline-block',
                                            padding: '8px 16px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '10px',
                                            color: uploading ? '#8F9BBA' : 'white',
                                            fontWeight: 700,
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            letterSpacing: '0.5px',
                                        }}>
                                            {uploading ? 'UPLOADING...' : formData.thumbnail_url ? '↺ CHANGE IMAGE' : '⬆ UPLOAD IMAGE'}
                                        </label>

                                        {formData.thumbnail_url && !uploading && (
                                            <button
                                                onClick={() => setFormData(prev => ({ ...prev, thumbnail_url: '' }))}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                                    borderRadius: '10px',
                                                    color: '#F87171',
                                                    fontWeight: 700,
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    letterSpacing: '0.5px',
                                                }}
                                            >
                                                ✕ REMOVE
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#8F9BBA', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                                    Course Title
                                </label>
                                <input
                                    type="text"
                                    className="premium-input"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Advanced Sales Psychology"
                                    autoFocus
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#8F9BBA', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                                    Description
                                </label>
                                <textarea
                                    className="premium-input"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief summary of the learning outcome..."
                                    rows={3}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            {/* Tier picker */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#8F9BBA', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
                                    Access Tier
                                </label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {TIERS.map(t => (
                                        <div
                                            key={t.key}
                                            onClick={() => setFormData({ ...formData, min_tier: t.key as any })}
                                            style={{
                                                flex: 1, padding: '12px 8px', textAlign: 'center',
                                                borderRadius: '12px', cursor: 'pointer',
                                                border: formData.min_tier === t.key ? `1.5px solid ${t.color}` : '1px solid rgba(255,255,255,0.08)',
                                                background: formData.min_tier === t.key ? `${t.color}22` : '#0B1437',
                                                color: formData.min_tier === t.key ? t.color : '#8F9BBA',
                                                fontWeight: formData.min_tier === t.key ? 900 : 600,
                                                fontSize: '13px',
                                                transition: 'all 0.18s ease',
                                                boxShadow: formData.min_tier === t.key ? `0 0 12px ${t.color}30` : 'none',
                                            }}
                                        >
                                            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{t.icon}</div>
                                            {t.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{
                            padding: '24px 32px 32px', // Compact footer
                            display: 'flex',
                            gap: '16px',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            flexShrink: 0,
                            background: '#0F172A'
                        }}>
                            <button
                                className="btn-modal-cancel"
                                onClick={() => { setShowModal(false); setEditingCourse(null); resetForm(); }}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    borderRadius: '14px',
                                    fontSize: '13px',
                                    fontWeight: 800
                                }}
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !formData.title}
                                style={{
                                    flex: 1.8,
                                    padding: '14px',
                                    background: saving ? 'rgba(99,102,241,0.5)' : `linear-gradient(135deg, ${getTierColor(formData.min_tier ?? 'Consultant')}, ${getTierColor(formData.min_tier ?? 'Consultant')}cc)`,
                                    border: 'none',
                                    borderRadius: '14px',
                                    color: 'white',
                                    fontWeight: 900,
                                    fontSize: '14px',
                                    letterSpacing: '0.5px',
                                    cursor: saving || !formData.title ? 'not-allowed' : 'pointer',
                                    boxShadow: saving ? 'none' : `0 8px 20px ${getTierColor(formData.min_tier ?? 'Consultant')}40`,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {saving ? 'SAVING...' : editingCourse ? 'UPDATE COURSE' : 'PUBLISH COURSE'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Course Card Sub-Component ──────────────────────────────────────────────

interface CourseCardProps {
    course: Course & { thumbnail_url?: string };
    tierColor: string;
    onEdit: () => void;
    onDelete: () => void;
    onCurriculum: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, tierColor, onEdit, onDelete, onCurriculum }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                borderRadius: '16px',
                border: hovered ? `1px solid ${tierColor}55` : '1px solid var(--glass-border)',
                background: 'var(--bg-card)',
                overflow: 'hidden',
                transition: 'all 0.22s ease',
                boxShadow: hovered ? `0 8px 24px ${tierColor}20` : 'none',
                transform: hovered ? 'translateY(-2px)' : 'none',
            }}
        >
            {/* Banner — thumbnail or gradient */}
            {course.thumbnail_url ? (
                <div style={{ height: '130px', overflow: 'hidden', position: 'relative' }}>
                    <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to bottom, transparent 30%, rgba(6,10,36,0.85))',
                    }} />
                </div>
            ) : (
                <div style={{
                    height: '72px',
                    background: `linear-gradient(135deg, ${tierColor}30, ${tierColor}08)`,
                    display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px',
                }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: `${tierColor}25`,
                        border: `1px solid ${tierColor}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={tierColor} stroke="none">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    </div>
                    <div style={{
                        height: '4px', flex: 1, borderRadius: '99px',
                        background: `${tierColor}20`,
                    }}>
                        <div style={{ width: '60%', height: '100%', borderRadius: '99px', background: `${tierColor}60` }} />
                    </div>
                </div>
            )}

            {/* Body */}
            <div style={{ padding: '14px 16px 0' }}>
                <h4 style={{
                    margin: '0 0 5px', fontSize: '0.92rem', fontWeight: 800,
                    lineHeight: 1.35, color: 'var(--text-main)',
                }}>
                    {course.title}
                </h4>
                {course.description && (
                    <p style={{
                        margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)',
                        lineHeight: 1.55,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                        {course.description}
                    </p>
                )}
            </div>

            {/* Action bar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 16px 14px',
                marginTop: '6px',
                borderTop: '1px solid var(--glass-border)',
            }}>
                {/* Primary: Edit Content */}
                <button
                    onClick={onCurriculum}
                    style={{
                        flex: 1, padding: '9px 12px',
                        background: `${tierColor}18`,
                        border: `1px solid ${tierColor}45`,
                        borderRadius: '10px',
                        color: tierColor,
                        fontWeight: 800, fontSize: '0.72rem',
                        letterSpacing: '0.5px',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${tierColor}30`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${tierColor}18`; }}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                    </svg>
                    EDIT CONTENT
                </button>

                {/* Secondary: Edit Details */}
                <button
                    onClick={onEdit}
                    title="Edit course details"
                    style={{
                        padding: '9px 11px',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '10px',
                        color: 'var(--text-secondary)',
                        fontWeight: 700, fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                        transition: 'all 0.15s', letterSpacing: '0.3px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    DETAILS
                </button>

                {/* Delete */}
                <button
                    onClick={onDelete}
                    title="Delete course"
                    style={{
                        padding: '9px 10px',
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.18)',
                        borderRadius: '10px',
                        color: '#F87171',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

