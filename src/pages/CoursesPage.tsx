import React, { useState } from 'react';
import { apiClient } from '../api/client';
import type { Course } from '../types';
import CurriculumEditor from '../components/courses/CurriculumEditor';

interface CoursesPageProps {
    courses: Course[];
    setCourses: (courses: any[]) => void;
    ebooks: any[];
    setEbooks: (ebooks: any[]) => void;
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

const resolveProtectedAssetUrl = (url?: string) => {
    if (!url) return '';

    const appendTokenForStream = (nextUrl: string) => {
        const token = localStorage.getItem('adminToken');
        if (!token || !nextUrl.includes('/api/stream/')) return nextUrl;
        const separator = nextUrl.includes('?') ? '&' : '?';
        return `${nextUrl}${separator}token=${encodeURIComponent(token)}`;
    };

    if (/^https?:\/\//i.test(url)) {
        return appendTokenForStream(url);
    }

    const normalized = url.startsWith('/') ? url : `/${url}`;
    const configuredBase = apiClient.getBaseUrl();

    if (configuredBase.startsWith('http://') || configuredBase.startsWith('https://')) {
        return appendTokenForStream(new URL(normalized, `${configuredBase.replace(/\/$/, '')}/`).toString());
    }

    const base = configuredBase.replace('/api', '');
    return appendTokenForStream(`${base}${normalized}`);
};

export const CoursesPage: React.FC<CoursesPageProps> = ({ courses, setCourses, ebooks, setEbooks }) => {
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

    type AiTier = 'Consultant' | 'Rainmaker' | 'Titan';
    const [aiKbVisibility, setAiKbVisibility] = useState<Record<AiTier, boolean>>({
        Consultant: false,
        Rainmaker: false,
        Titan: false,
    });

    const [uploading, setUploading] = useState(false);
    const [selectedCourseForCurriculum, setSelectedCourseForCurriculum] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'courses' | 'ebooks'>('courses');

    // Ebook state
    const [showEbookModal, setShowEbookModal] = useState(false);
    const [editingEbook, setEditingEbook] = useState<any | null>(null);
    const [ebookFormData, setEbookFormData] = useState<any>({
        title: '',
        description: '',
        thumbnail_url: '',
        file_url: '',
        min_tier: 'Consultant',
        is_published: true,
    });

    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

    const loadCourses = async () => {
        try {
            const res = await apiClient.getCourses();
            if (res.success) setCourses(res.data);
        } catch (error) {
            console.error('Failed to load courses', error);
        }
    };

    const loadEbooks = async () => {
        try {
            const res = await apiClient.getEbooks();
            if (res.success) setEbooks(res.data);
        } catch (error) {
            console.error('Failed to load ebooks', error);
        }
    };

    React.useEffect(() => {
        loadEbooks();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingCourse) {
                await apiClient.updateCourse(editingCourse.id, formData);
                await apiClient.setAiCourseVisibility(editingCourse.id, aiKbVisibility);
            } else {
                const created = await apiClient.createCourse(formData);
                const createdId = created?.data?.id;
                if (createdId) {
                    await apiClient.setAiCourseVisibility(createdId, aiKbVisibility);
                }
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

    const handleSaveEbook = async () => {
        setSaving(true);
        try {
            if (editingEbook) {
                await apiClient.updateEbook(editingEbook.id, ebookFormData);
            } else {
                await apiClient.createEbook(ebookFormData);
            }
            setShowEbookModal(false);
            setEditingEbook(null);
            resetEbookForm();
            loadEbooks();
        } catch (error: any) {
            console.error('Failed to save ebook', error);
            alert(error.message || 'Failed to deploy E-book asset. Please check your connection and try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteEbook = async (id: number) => {
        if (confirm('Delete this E-book? This cannot be undone.')) {
            try {
                await apiClient.deleteEbook(id);
                loadEbooks();
            } catch (error) {
                console.error('Failed to delete ebook', error);
            }
        }
    };

    const resetForm = () => {
        setFormData({ title: '', description: '', url: '', min_tier: 'Consultant', thumbnail_url: undefined });
        setAiKbVisibility({ Consultant: false, Rainmaker: false, Titan: false });
    };

    const resetEbookForm = () => {
        setEbookFormData({
            title: '',
            description: '',
            thumbnail_url: '',
            file_url: '',
            min_tier: 'Consultant',
            is_published: true,
        });
    };

    const openModal = (tier: string, course?: Course) => {
        if (course) {
            setEditingCourse(course);
            setFormData({
                title: course.title,
                description: course.description,
                url: course.url || '',
                min_tier: course.min_tier,
                thumbnail_url: course.thumbnail_url,
            });
            // visibility is managed in the form fields directly or we can fetch it here if needed
            // For now, assume aiKbVisibility defaults are okay or handled elsewhere
        } else {
            setEditingCourse(null);
            resetForm();
            setFormData(prev => ({ ...prev, min_tier: tier as any }));
        }
        setShowModal(true);
    };

    const openEbookModal = (tier: string, ebook?: any) => {
        if (ebook) {
            setEditingEbook(ebook);
            setEbookFormData({
                title: ebook.title,
                description: ebook.description,
                thumbnail_url: ebook.thumbnail_url,
                file_url: ebook.file_url,
                min_tier: ebook.min_tier,
                is_published: ebook.is_published,
            });
        } else {
            setEditingEbook(null);
            resetEbookForm();
            setEbookFormData((prev: any) => ({ ...prev, min_tier: tier }));
        }
        setShowEbookModal(true);
    };

    const getTierColor = (tier: string) =>
        TIERS.find(t => t.key.toLowerCase() === tier.toLowerCase())?.color ?? '#38BDF8';

    const resolveAssetUrl = (url?: string) => {
        return resolveProtectedAssetUrl(url);
    };

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
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                        <div
                            onClick={() => setActiveTab('courses')}
                            style={{
                                position: 'relative',
                                cursor: 'pointer',
                                paddingBottom: '10px',
                            }}
                        >
                            <h1
                                style={{
                                    margin: 0,
                                    fontSize: '1.6rem',
                                    fontWeight: 900,
                                    letterSpacing: '-0.5px',
                                    color: activeTab === 'courses' ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                                    transition: 'all 0.3s ease',
                                    transform: activeTab === 'courses' ? 'scale(1)' : 'scale(0.95)',
                                    transformOrigin: 'left center',
                                }}
                            >
                                Course Library
                            </h1>
                            {activeTab === 'courses' && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '4px',
                                        background: '#6366F1',
                                        borderRadius: '99px',
                                        boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)',
                                    }}
                                />
                            )}
                        </div>

                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

                        <div
                            onClick={() => setActiveTab('ebooks')}
                            style={{
                                position: 'relative',
                                cursor: 'pointer',
                                paddingBottom: '10px',
                            }}
                        >
                            <h1
                                style={{
                                    margin: 0,
                                    fontSize: '1.6rem',
                                    fontWeight: 900,
                                    letterSpacing: '-0.5px',
                                    color: activeTab === 'ebooks' ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                                    transition: 'all 0.3s ease',
                                    transform: activeTab === 'ebooks' ? 'scale(1)' : 'scale(0.95)',
                                    transformOrigin: 'left center',
                                }}
                            >
                                E-book Vault
                            </h1>
                            {activeTab === 'ebooks' && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '4px',
                                        background: '#6366F1',
                                        borderRadius: '99px',
                                        boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)',
                                    }}
                                />
                            )}
                        </div>
                    </div>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                        {activeTab === 'courses'
                            ? 'Manage courses by access tier — each column represents a subscription level'
                            : 'Deploy digital assets and strategies across specific user tiers'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>Total: <strong style={{ color: 'var(--text-main)' }}>
                        {activeTab === 'courses' ? courses.length : (ebooks?.length ?? 0)}
                    </strong> {activeTab === 'courses' ? 'courses' : 'ebooks'}</span>
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
                    const tierItems = activeTab === 'courses'
                        ? courses.filter(c => c.min_tier === tier.key)
                        : (ebooks ?? []).filter(e => e.min_tier === tier.key);

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
                                        {activeTab === 'courses' ? tier.icon : '📖'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: '1rem', color: 'white', letterSpacing: '-0.3px' }}>
                                            {tier.label}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
                                            {tierItems.length} {activeTab === 'courses' ? 'course' : 'ebook'}{tierItems.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => activeTab === 'courses' ? void openModal(tier.key) : openEbookModal(tier.key)}
                                    title={`Add ${tier.label} ${activeTab === 'courses' ? 'course' : 'ebook'}`}
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

                            {/* Cards */}
                            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                {tierItems.length === 0 ? (
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
                                        <div style={{ fontSize: '32px', opacity: 0.3 }}>{activeTab === 'courses' ? '📚' : '📖'}</div>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                            No {tier.label} {activeTab === 'courses' ? 'courses' : 'ebooks'} yet
                                        </p>
                                        <button
                                            onClick={() => activeTab === 'courses' ? void openModal(tier.key) : openEbookModal(tier.key)}
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
                                            + ADD FIRST {activeTab === 'courses' ? 'COURSE' : 'E-BOOK'}
                                        </button>
                                    </div>
                                ) : (
                                    tierItems.map(item => (
                                        activeTab === 'courses' ? (
                                            <CourseCard
                                                key={item.id}
                                                course={item}
                                                tierColor={tier.color}
                                                onEdit={() => void openModal(tier.key, item)}
                                                onDelete={() => handleDelete(item.id)}
                                                onCurriculum={() => setSelectedCourseForCurriculum(item.id)}
                                            />
                                        ) : (
                                            <EbookCard
                                                key={item.id}
                                                ebook={item}
                                                tierColor={tier.color}
                                                onEdit={() => openEbookModal(tier.key, item)}
                                                onDelete={() => handleDeleteEbook(item.id)}
                                                onPreview={(url) => setPreviewPdfUrl(url)}
                                            />
                                        )
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add/Edit Modal (Course) */}
            {/* ... Modal content for course (Already exists) ... */}
            {showModal && (
                <div
                    className="premium-modal-overlay"
                    onClick={() => { setShowModal(false); setEditingCourse(null); resetForm(); }}
                    style={{
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
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
                            maxWidth: '680px',
                            background: '#0F172A',
                            borderRadius: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '85vh',
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
                                        <img src={resolveAssetUrl(formData.thumbnail_url)} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

                            {/* AI Knowledge Base visibility per tier */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#8F9BBA', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
                                    AI Knowledge Base (per tier)
                                </label>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    {TIERS.map(t => {
                                        const key = t.key as AiTier;
                                        const enabled = aiKbVisibility[key];
                                        return (
                                            <div
                                                key={t.key}
                                                onClick={() => setAiKbVisibility(prev => ({ ...prev, [key]: !enabled }))}
                                                style={{
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    padding: '12px 10px',
                                                    border: enabled ? `1.5px solid ${t.color}` : '1px solid rgba(255,255,255,0.08)',
                                                    background: enabled ? `${t.color}22` : '#0B1437',
                                                    transition: 'all 0.18s ease',
                                                    userSelect: 'none',
                                                }}
                                                title={`AI knowledge ${enabled ? 'ON' : 'OFF'} for ${t.label}`}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ fontSize: '18px' }}>{t.icon}</div>
                                                        <div style={{ fontWeight: 950, color: enabled ? t.color : '#8F9BBA' }}>{t.label}</div>
                                                    </div>

                                                    <div
                                                        style={{
                                                            width: 40,
                                                            height: 22,
                                                            borderRadius: 999,
                                                            background: enabled ? t.color : 'rgba(255,255,255,0.12)',
                                                            border: enabled ? `1px solid ${t.color}` : '1px solid rgba(255,255,255,0.12)',
                                                            position: 'relative',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: 18,
                                                                height: 18,
                                                                borderRadius: 999,
                                                                background: enabled ? 'white' : '#CBD5E1',
                                                                position: 'absolute',
                                                                top: 2,
                                                                left: enabled ? 20 : 2,
                                                                transition: 'all 0.18s ease',
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div style={{
                            padding: '24px 32px 32px',
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

            {/* Add/Edit Modal (Ebook) */}
            {showEbookModal && (
                <div
                    className="premium-modal-overlay"
                    onClick={() => { setShowEbookModal(false); setEditingEbook(null); resetEbookForm(); }}
                    style={{
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
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
                            maxWidth: '600px',
                            background: '#0F172A',
                            borderRadius: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '85vh',
                            boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ height: '8px', background: getTierColor(ebookFormData.min_tier), flexShrink: 0 }} />

                        <div style={{ padding: '24px 30px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'white' }}>
                                {editingEbook ? 'Refine E-book Asset' : 'New E-book Deployment'}
                            </h2>
                            <button onClick={() => { setShowEbookModal(false); setEditingEbook(null); resetEbookForm(); }} style={{ background: 'none', border: 'none', color: '#8F9BBA', cursor: 'pointer', fontSize: '20px' }}>✕</button>
                        </div>

                        <div style={{ padding: '24px 30px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Covers */}
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ width: '80px', height: '110px', background: '#0B1437', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {ebookFormData.thumbnail_url ? <img src={resolveAssetUrl(ebookFormData.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '30px' }}>📘</span>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#8F9BBA', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>E-book Cover</label>
                                    <input type="file" id="ebook-thumb" hidden accept="image/*" onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setUploading(true);
                                            const res = await apiClient.uploadFile(file, 'Image');
                                            if (res.success) setEbookFormData({ ...ebookFormData, thumbnail_url: res.url });
                                            setUploading(false);
                                        }
                                    }} />
                                    <label htmlFor="ebook-thumb" style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        {uploading ? 'UPLOADING...' : '⬆ UPLOAD COVER'}
                                    </label>
                                </div>
                            </div>

                            {/* PDF File */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#8F9BBA', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>E-book PDF File</label>
                                <input type="file" id="ebook-pdf" hidden accept=".pdf" onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setUploading(true);
                                        const res = await apiClient.uploadFile(file, 'PDF');
                                        if (res.success) setEbookFormData({ ...ebookFormData, file_url: res.url });
                                        setUploading(false);
                                    }
                                }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <label htmlFor="ebook-pdf" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#6366F122', borderRadius: '10px', color: '#818CF8', fontSize: '12px', fontWeight: 800, cursor: 'pointer', border: '1px solid #6366F144' }}>
                                        <span style={{ fontSize: '16px' }}>📄</span> {uploading ? 'PROCESSING...' : ebookFormData.file_url ? 'CHANGE PDF' : 'ATTACH PDF ASSET'}
                                    </label>
                                    {ebookFormData.file_url && <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>✓ ATTACHED</span>}
                                </div>
                            </div>

                            <input type="text" className="premium-input" placeholder="E-book Title" value={ebookFormData.title} onChange={e => setEbookFormData({ ...ebookFormData, title: e.target.value })} />
                            <textarea className="premium-input" placeholder="Brief description of this asset..." rows={3} value={ebookFormData.description} onChange={e => setEbookFormData({ ...ebookFormData, description: e.target.value })} />

                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#8F9BBA', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Min Access Tier</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {TIERS.map(t => (
                                        <button key={t.key} onClick={() => setEbookFormData({ ...ebookFormData, min_tier: t.key })} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: ebookFormData.min_tier === t.key ? `${t.color}22` : '#0B1437', color: ebookFormData.min_tier === t.key ? t.color : '#8F9BBA', border: ebookFormData.min_tier === t.key ? `1.5px solid ${t.color}` : '1px solid rgba(255,255,255,0.05)', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>{t.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '24px 30px 30px', display: 'flex', gap: '12px' }}>
                            <button onClick={() => { setShowEbookModal(false); setEditingEbook(null); resetEbookForm(); }} className="btn-modal-cancel" style={{ flex: 1, padding: '14px', borderRadius: '14px', fontSize: '12px', fontWeight: 800 }}>CANCEL</button>
                            <button onClick={handleSaveEbook} disabled={saving || !ebookFormData.title || !ebookFormData.file_url} style={{ flex: 2, padding: '14px', borderRadius: '14px', background: getTierColor(ebookFormData.min_tier), color: 'white', border: 'none', fontWeight: 900, fontSize: '13px', cursor: 'pointer', opacity: (saving || !ebookFormData.title || !ebookFormData.file_url) ? 0.5 : 1 }}>{saving ? 'DEPLOYING...' : editingEbook ? 'UPDATE ASSET' : 'DEPLOY ASSET'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF Preview Modal */}
            {previewPdfUrl && (
                <div
                    style={{
                        zIndex: 20000,
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(2, 6, 23, 0.9)',
                        backdropFilter: 'blur(20px)',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '40px'
                    }}
                    onClick={() => setPreviewPdfUrl(null)}
                >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        color: 'white'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '20px' }}>🛡️</span>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Neural Asset Link</h3>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>ENCRYPTED VIEWPORT ACTIVE</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setPreviewPdfUrl(null)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                                padding: '12px 24px',
                                borderRadius: '14px',
                                cursor: 'pointer',
                                fontWeight: 900,
                                fontSize: '0.8rem',
                                letterSpacing: '1px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            TERMINATE SESSION
                        </button>
                    </div>
                    <div style={{
                        flex: 1,
                        background: '#F8FAFC',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }} onClick={e => e.stopPropagation()}>
                        <iframe
                            src={previewPdfUrl}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title="SECURE ASSET PREVIEW"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Ebook Card Sub-Component ──────────────────────────────────────────────

interface EbookCardProps {
    ebook: any;
    tierColor: string;
    onEdit: () => void;
    onDelete: () => void;
}

const EbookCard: React.FC<EbookCardProps & { onPreview: (url: string) => void }> = ({ ebook, tierColor, onEdit, onDelete, onPreview }) => {
    const [hovered, setHovered] = useState(false);
    const resolveAssetUrl = (url?: string) => {
        return resolveProtectedAssetUrl(url);
    };

    const handleView = () => {
        if (ebook.file_url) {
            onPreview(resolveAssetUrl(ebook.file_url));
        }
    };

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                borderRadius: '16px',
                border: hovered ? `1px solid ${tierColor}55` : '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(30, 41, 59, 0.4)',
                padding: '16px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: hovered ? 'translateY(-4px)' : 'none',
                boxShadow: hovered ? `0 12px 24px ${tierColor}15` : 'none',
                position: 'relative',
                overflow: 'hidden',
                backdropFilter: 'blur(10px)',
            }}
        >
            {/* Glossy Overlay */}
            {hovered && (
                <div style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: `radial-gradient(circle at center, ${tierColor}05 0%, transparent 70%)`,
                    pointerEvents: 'none'
                }} />
            )}

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {/* Book Cover with 3D Effect */}
                <div style={{
                    width: '70px',
                    height: '95px',
                    background: '#0B1437',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: '4px 4px 12px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    position: 'relative'
                }}>
                    {ebook.thumbnail_url ? (
                        <img src={resolveAssetUrl(ebook.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${tierColor}22, ${tierColor}44)` }}>
                            <span style={{ fontSize: '24px' }}>📖</span>
                        </div>
                    )}
                    {/* Spine detail */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'rgba(255,255,255,0.2)', boxShadow: '1px 0 2px rgba(0,0,0,0.2)' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 style={{
                        margin: '0 0 6px',
                        fontSize: '0.95rem',
                        fontWeight: 900,
                        color: 'white',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        letterSpacing: '-0.2px'
                    }}>
                        {ebook.title}
                    </h5>
                    <p style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: 'rgba(143, 155, 186, 0.8)',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}>
                        {ebook.description || 'No description provided.'}
                    </p>
                </div>
            </div>

            <div style={{
                marginTop: '16px',
                display: 'flex',
                gap: '8px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: '14px'
            }}>
                <button
                    onClick={handleView}
                    style={{
                        flex: 1.5,
                        padding: '8px',
                        background: `${tierColor}15`,
                        border: `1px solid ${tierColor}30`,
                        borderRadius: '10px',
                        color: tierColor,
                        fontSize: '11px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${tierColor}25`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${tierColor}15`; }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    VIEW
                </button>
                <button
                    onClick={onEdit}
                    style={{
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                >
                    EDIT
                </button>
                <button
                    onClick={onDelete}
                    style={{
                        padding: '8px 10px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        borderRadius: '10px',
                        color: '#F87171',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                >
                    ✕
                </button>
            </div>
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

    const resolveAssetUrl = (url?: string) => {
        return resolveProtectedAssetUrl(url);
    };

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                borderRadius: '20px',
                border: hovered ? `1px solid ${tierColor}55` : '1px solid rgba(255,255,255,0.08)',
                background: hovered ? 'rgba(30, 41, 59, 0.6)' : 'rgba(30, 41, 59, 0.4)',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: hovered ? `0 15px 35px ${tierColor}15` : 'none',
                transform: hovered ? 'translateY(-5px)' : 'none',
                backdropFilter: 'blur(10px)',
            }}
        >
            {/* Banner — thumbnail or gradient */}
            {course.thumbnail_url ? (
                <div style={{ height: '140px', overflow: 'hidden', position: 'relative' }}>
                    <img
                        src={resolveAssetUrl(course.thumbnail_url)}
                        alt={course.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }}
                    />
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to bottom, transparent 20%, rgba(15, 23, 42, 0.9))',
                    }} />
                </div>
            ) : (
                <div style={{
                    height: '80px',
                    background: `linear-gradient(135deg, ${tierColor}44, ${tierColor}11)`,
                    display: 'flex', alignItems: 'center', padding: '0 20px', gap: '15px',
                }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: `${tierColor}33`,
                        border: `1px solid ${tierColor}55`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={tierColor} stroke="none">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    </div>
                    <div style={{
                        height: '6px', flex: 1, borderRadius: '99px',
                        background: 'rgba(255,255,255,0.05)',
                    }}>
                        <div style={{ width: '65%', height: '100%', borderRadius: '99px', background: tierColor, boxShadow: `0 0 10px ${tierColor}` }} />
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
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '18px 20px 20px',
                marginTop: '12px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
                <button
                    onClick={onCurriculum}
                    style={{
                        flex: 1.2, padding: '12px 14px',
                        background: `${tierColor}18`,
                        border: `1px solid ${tierColor}40`,
                        borderRadius: '14px',
                        color: tierColor,
                        fontWeight: 900, fontSize: '0.75rem',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.3s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${tierColor}33`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${tierColor}18`; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    CURRICULUM
                </button>

                <button
                    onClick={onEdit}
                    title="Edit details"
                    style={{
                        padding: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '14px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.3s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>

                <button
                    onClick={onDelete}
                    title="Delete course"
                    style={{
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '14px',
                        color: '#F87171',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.3s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

