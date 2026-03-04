import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import './CurriculumEditor.css';

interface CurriculumEditorProps {
    courseId: number;
    onBack: () => void;
}

const CurriculumEditor: React.FC<CurriculumEditorProps> = ({ courseId, onBack }) => {
    const [course, setCourse] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeLesson, setActiveLesson] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewPdfId, setPreviewPdfId] = useState<number | null>(null);
    const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({});
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState('');

    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: '', message: '' });

    const showConfirm = (title: string, message: string, onConfirm: () => void) => setConfirmDialog({ isOpen: true, title, message, onConfirm });
    const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

    const showError = (title: string, message: string) => setErrorDialog({ isOpen: true, title, message });
    const closeError = () => setErrorDialog(prev => ({ ...prev, isOpen: false }));

    const [inputModal, setInputModal] = useState<{
        isOpen: boolean; title: string; placeholder: string; onConfirm: (val: string) => void;
    }>({ isOpen: false, title: '', placeholder: '', onConfirm: () => { } });

    useEffect(() => { loadCourseDetails(); }, [courseId]);

    const loadCourseDetails = async () => {
        setLoading(true);
        try {
            const res = await apiClient.getCourseDetails(courseId);
            if (res.success) {
                setCourse(res.data);
                const allLessons: any[] = [];
                res.data.modules?.forEach((m: any) => m.lessons?.forEach((l: any) => allLessons.push(l)));
                setActiveLesson((prev: any) => {
                    if (prev) {
                        const refreshed = allLessons.find((l: any) => l.id === prev.id);
                        return refreshed ?? prev;
                    }
                    return res.data.modules?.[0]?.lessons?.[0] || null;
                });
                if (res.data.modules) {
                    const expanded: Record<number, boolean> = {};
                    res.data.modules.forEach((m: any, idx: number) => { expanded[m.id] = idx === 0; });
                    setExpandedModules(expanded);
                }
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const toggleModule = (id: number) => setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));

    const handleAddModule = () => {
        setInputModal({
            isOpen: true, title: 'New Module', placeholder: 'Module title...',
            onConfirm: async (title) => {
                await apiClient.createModule(courseId, { title, sequence: (course?.modules?.length || 0) + 1 });
                loadCourseDetails(); setInputModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleAddLesson = (moduleId: number) => {
        setInputModal({
            isOpen: true, title: 'New Lesson', placeholder: 'Lesson title...',
            onConfirm: async (title) => {
                const mod = course.modules.find((m: any) => m.id === moduleId);
                await apiClient.createLesson(moduleId, { title, sequence: (mod?.lessons?.length || 0) + 1 });
                loadCourseDetails(); setInputModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleDeleteModule = (id: number, title: string) => showConfirm('Delete Module', `Delete "${title}"?`, async () => {
        await apiClient.deleteModule(id); loadCourseDetails(); closeConfirm();
    });

    const handleDeleteLesson = (id: number, title: string) => showConfirm('Delete Lesson', `Delete "${title}"?`, async () => {
        await apiClient.deleteLesson(id); if (activeLesson?.id === id) setActiveLesson(null);
        loadCourseDetails(); closeConfirm();
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, lessonId: number, type: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true); setUploadProgress(0);
        try {
            const res = await apiClient.uploadFileWithProgress(file, type, p => setUploadProgress(p));
            if (res.success) {
                const existing = activeLesson?.materials?.find((m: any) => m.type === type);
                const data = { title: res.name, type, url: res.url, count: 1 };
                if (existing) await apiClient.updateMaterial(existing.id, data);
                else await apiClient.createMaterial(lessonId, data);
                await loadCourseDetails();
            } else {
                showError('Upload Engine Warning', res.message || 'The server rejected the file request. This usually happens if the file exceeds current server-side size limits.');
            }
        } catch (error: any) {
            console.error('File upload error:', error);
            showError('Global Error Detected', error.message || 'The connection to the media gateway was interrupted. Please check your network and ensure the backend is running with enhanced PHP limits.');
        } finally { setUploading(false); }
    };

    const updateLesson = async (id: number, updates: any) => {
        await apiClient.updateLesson(id, updates);
        setActiveLesson((prev: any) => prev ? { ...prev, ...updates } : null);
        loadCourseDetails();
    };

    if (loading) return <div className="loader"></div>;

    const getTierColor = (tier?: string) => {
        const t = tier?.toLowerCase() || '';
        if (t.includes('titan')) return '#F59E0B'; // Gold/Amber
        if (t.includes('rainmaker')) return '#94A3B8'; // Silver/Slate
        return '#6d28d9'; // Consultant / Primary Purple
    };

    const tierColor = getTierColor(course?.min_tier);
    const tierShadow = `${tierColor}55`; // 33% opacity for shadow

    return (
        <div className="curriculum-container fade-in" style={{
            ['--tier-color' as any]: tierColor,
            ['--tier-shadow' as any]: tierShadow
        }}>
            <div className="curriculum-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                        onClick={onBack}
                        className="btn-back-icon"
                        style={{ background: 'rgba(var(--text-main-rgb), 0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderRadius: '12px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '20px', transition: 'all 0.2s' }}
                    >
                        ←
                    </button>
                    <h1 style={{ margin: 0, fontSize: '1.8rem' }}>{course?.title}</h1>
                </div>
            </div>

            <div className="curriculum-layout">
                <div className="curriculum-sidebar">
                    <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '15px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)' }}>MODULES</span>
                        <button onClick={handleAddModule} className="add-lesson-mini-btn">+</button>
                    </div>
                    <div className="sidebar-content">
                        {course?.modules?.map((m: any) => (
                            <div key={m.id} className={`module-item ${expandedModules[m.id] ? 'expanded' : 'collapsed'}`}>
                                <div className="module-header" onClick={() => toggleModule(m.id)}>
                                    <h3>{m.title}</h3>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button className="add-lesson-mini-btn" onClick={(e) => { e.stopPropagation(); handleAddLesson(m.id); }}>+</button>
                                        <button className="btn-sidebar-delete" onClick={(e) => { e.stopPropagation(); handleDeleteModule(m.id, m.title); }}>×</button>
                                    </div>
                                </div>
                                <div className="sidebar-lessons">
                                    {m.lessons?.map((l: any) => (
                                        <div key={l.id} className={`lesson-item ${activeLesson?.id === l.id ? 'active' : ''}`} onClick={() => setActiveLesson(l)}>
                                            <span>{l.title}</span>
                                            <button className="btn-sidebar-delete" onClick={(e) => { e.stopPropagation(); handleDeleteLesson(l.id, l.title); }}>×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="curriculum-main">
                    {activeLesson ? (
                        <div className="lesson-editor">
                            <div className="editor-card" style={{ marginBottom: '20px' }}>
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        {editingTitle ? (
                                            <input
                                                autoFocus
                                                value={titleDraft}
                                                onChange={e => setTitleDraft(e.target.value)}
                                                onBlur={() => { updateLesson(activeLesson.id, { title: titleDraft }); setEditingTitle(false); }}
                                                onKeyDown={e => { if (e.key === 'Enter') { updateLesson(activeLesson.id, { title: titleDraft }); setEditingTitle(false); } }}
                                                style={{
                                                    background: 'rgba(var(--primary-rgb), 0.05)',
                                                    border: 'none',
                                                    borderBottom: '2px solid var(--tier-color)',
                                                    color: 'var(--text-main)',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 800,
                                                    outline: 'none',
                                                    padding: '6px 12px',
                                                    width: '100%',
                                                    borderRadius: '8px 8px 0 0',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px'
                                                }}
                                            />
                                        ) : (
                                            <h3
                                                onClick={() => { setTitleDraft(activeLesson.title); setEditingTitle(true); }}
                                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                                            >
                                                {activeLesson.title}
                                                <span style={{ fontSize: '12px', opacity: 0.3 }}>✎</span>
                                            </h3>
                                        )}
                                    </div>
                                    {(() => {
                                        const parentMod = course?.modules?.find((m: any) => m.lessons?.some((l: any) => l.id === activeLesson.id));
                                        if (!parentMod) return null;
                                        return (
                                            <button
                                                className="btn-sidebar-delete"
                                                style={{ marginLeft: '20px', width: '32px', height: '32px', fontSize: '18px' }}
                                                onClick={() => handleDeleteModule(parentMod.id, parentMod.title)}
                                                title={`Delete ${parentMod.title} Module`}
                                            >×</button>
                                        );
                                    })()}
                                </div>
                                <div className="card-body">
                                    <div className="settings-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                        <div className="setting-item">
                                            <div className="setting-info">
                                                <div className="setting-icon" style={{ background: 'rgba(var(--primary-rgb), 0.1)' }}>💬</div>
                                                <div className="setting-labels"><strong>Comments</strong><span>Allow student Q&A</span></div>
                                            </div>
                                            <div className={`switch ${activeLesson.allow_comments ? 'on' : ''}`} onClick={() => updateLesson(activeLesson.id, { allow_comments: !activeLesson.allow_comments })}><div className="handle" /></div>
                                        </div>
                                        <div className="setting-item">
                                            <div className="setting-info">
                                                <div className="setting-icon" style={{ background: 'rgba(var(--primary-rgb), 0.1)' }}>🎬</div>
                                                <div className="setting-labels"><strong>Video Download</strong><span>Allow video saving</span></div>
                                            </div>
                                            <div className={`switch ${activeLesson.allow_video_download ? 'on' : ''}`} onClick={() => updateLesson(activeLesson.id, { allow_video_download: !activeLesson.allow_video_download })}><div className="handle" /></div>
                                        </div>
                                        <div className="setting-item">
                                            <div className="setting-info">
                                                <div className="setting-icon" style={{ background: 'rgba(var(--error-rgb), 0.1)' }}>📄</div>
                                                <div className="setting-labels"><strong>PDF Download</strong><span>Allow PDF saving</span></div>
                                            </div>
                                            <div className={`switch ${activeLesson.allow_pdf_download ? 'on' : ''}`} onClick={() => updateLesson(activeLesson.id, { allow_pdf_download: !activeLesson.allow_pdf_download })}><div className="handle" /></div>
                                        </div>
                                        <div className="setting-item">
                                            <div className="setting-info">
                                                <div className="setting-icon" style={{ background: activeLesson.is_published ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--text-muted-rgb), 0.1)' }}>🚀</div>
                                                <div className="setting-labels"><strong>Published</strong><span>Visible to users</span></div>
                                            </div>
                                            <div className={`switch ${activeLesson.is_published ? 'on' : ''}`} onClick={() => updateLesson(activeLesson.id, { is_published: !activeLesson.is_published })}><div className="handle" /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resources Grid (Video twin-cards) */}
                            {activeLesson.materials?.find((m: any) => m.type === 'Video') ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                                    {/* Card 1: Main Video */}
                                    <div className="editor-card" style={{ padding: '0', background: 'rgba(var(--text-main-rgb), 0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', height: '280px', display: 'flex', flexDirection: 'column' }}>
                                        <div className="card-header" style={{ border: 'none', background: 'transparent', padding: '15px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2.5px' }}>VIDEO CONTENT</h3>
                                            <button className="btn-sidebar-delete" onClick={() => {
                                                const vid = activeLesson.materials.find((m: any) => m.type === 'Video');
                                                showConfirm('Delete Video', 'Remove this video file from the lesson?', () => {
                                                    apiClient.deleteMaterial(vid.id).then(() => { loadCourseDetails(); closeConfirm(); });
                                                });
                                            }}>×</button>
                                        </div>
                                        <div style={{ position: 'relative', flex: 1, background: '#000', borderRadius: '0 0 24px 24px', overflow: 'hidden' }}>
                                            <video src={(() => {
                                                const url = activeLesson.materials.find((m: any) => m.type === 'Video').url;
                                                const filename = url?.split('/').pop();
                                                return filename ? `http://127.0.0.1:8000/api/stream/${filename}` : url;
                                            })()} preload="none" controls poster={activeLesson.materials.find((m: any) => m.type === 'Video').thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />

                                            <input type="file" accept="video/*" id="video-replace" hidden onChange={e => handleFileUpload(e, activeLesson.id, 'Video')} />
                                            <label htmlFor="video-replace" style={{ position: 'absolute', top: '10px', left: '10px', padding: '6px 14px', background: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: '8px', fontSize: '9px', fontWeight: 900, cursor: 'pointer', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0, transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>REPLACE VIDEO</label>
                                        </div>
                                    </div>

                                    {/* Card 2: Poster/Thumbnail */}
                                    <div className="editor-card" style={{ padding: '0', background: 'rgba(var(--text-main-rgb), 0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', height: '280px', display: 'flex', flexDirection: 'column' }}>
                                        <div className="card-header" style={{ border: 'none', background: 'transparent', padding: '15px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2.5px' }}>THUMBNAIL PREVIEW</h3>
                                            {activeLesson.materials.find((m: any) => m.type === 'Video').thumbnail_url && (
                                                <button className="btn-sidebar-delete" onClick={() => {
                                                    const vid = activeLesson.materials.find((m: any) => m.type === 'Video');
                                                    showConfirm('Remove Thumbnail', 'Reset poster to default preview?', () => {
                                                        apiClient.updateMaterial(vid.id, { thumbnail_url: '' }).then(() => { loadCourseDetails(); closeConfirm(); });
                                                    });
                                                }}>×</button>
                                            )}
                                        </div>
                                        <div style={{ position: 'relative', flex: 1, background: '#000', borderRadius: '0 0 24px 24px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {activeLesson.materials.find((m: any) => m.type === 'Video').thumbnail_url ? (
                                                <img src={activeLesson.materials.find((m: any) => m.type === 'Video').thumbnail_url} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.2 }}>🖼️</div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>No custom poster</div>
                                                </div>
                                            )}
                                            <input type="file" id="thumb-replace" hidden accept="image/*" onChange={async (e) => {
                                                const f = e.target.files?.[0]; if (!f) return;
                                                const res = await apiClient.uploadFile(f, 'Image');
                                                if (res.success) {
                                                    const vid = activeLesson.materials.find((m: any) => m.type === 'Video');
                                                    await apiClient.updateMaterial(vid.id, { thumbnail_url: res.url }); loadCourseDetails();
                                                }
                                            }} />
                                            <label htmlFor="thumb-replace" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', opacity: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 900, transition: '0.2s', backdropFilter: 'blur(8px)' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                                                {activeLesson.materials.find((m: any) => m.type === 'Video').thumbnail_url ? 'REPLACE POSTER' : 'UPLOAD CUSTOM POSTER'}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ marginBottom: '25px', textAlign: 'center', padding: '50px', background: 'rgba(var(--text-main-rgb), 0.02)', borderRadius: '24px', border: '2px dashed var(--glass-border)' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '15px', opacity: 0.4 }}>🎬</div>
                                    <h4 style={{ margin: '0 0 10px', color: 'var(--text-main)', fontSize: '15px', fontWeight: 800 }}>No main video detected</h4>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '300px', margin: '0 auto 25px' }}>Attach a video resource to start building this lesson.</p>
                                    <input type="file" accept="video/*" id="video-init" hidden onChange={e => handleFileUpload(e, activeLesson.id, 'Video')} />
                                    <label htmlFor="video-init" className="btn-premium-primary" style={{ cursor: 'pointer', display: 'inline-block' }}>{uploading ? `UPLOADING ${uploadProgress}%` : 'SELECT VIDEO FILE'}</label>
                                </div>
                            )}

                            {/* Section Divider */}
                            <div style={{ position: 'relative', margin: '60px 0 40px', display: 'flex', alignItems: 'center', gap: '25px', justifyContent: 'center' }}>
                                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg, var(--glass-border), transparent)', opacity: 0.3 }} />
                                <h4 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '4px', textTransform: 'uppercase', whiteSpace: 'nowrap', margin: 0, opacity: 0.6 }}>
                                    Supplementary Materials
                                </h4>
                                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, var(--glass-border), transparent)', opacity: 0.3 }} />
                            </div>

                            {/* PDF Container */}
                            <div className="editor-card" style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
                                <div className="card-header" style={{ padding: '10px 20px 20px', border: 'none', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <h3 style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '1px', margin: 0 }}>PDF DOCUMENTS</h3>
                                        {activeLesson.materials?.filter((m: any) => m.type === 'PDF').length > 0 && (
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--tier-color)', background: 'rgba(var(--primary-rgb), 0.1)', padding: '4px 12px', borderRadius: '8px', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
                                                {activeLesson.materials.filter((m: any) => m.type === 'PDF').length} ATTACHED
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {activeLesson.materials?.filter((m: any) => m.type === 'PDF').length > 0 && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '25px', alignItems: 'start' }}>
                                        {/* Left Side: List of Documents */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {activeLesson.materials.filter((m: any) => m.type === 'PDF').map((pdf: any) => (
                                                <div
                                                    key={pdf.id}
                                                    className="editor-card"
                                                    style={{
                                                        padding: '15px 20px',
                                                        background: previewPdfId === pdf.id ? 'rgba(var(--primary-rgb), 0.08)' : 'rgba(var(--text-main-rgb), 0.02)',
                                                        borderRadius: '20px',
                                                        border: previewPdfId === pdf.id ? '1px solid var(--tier-color)' : '1px solid var(--glass-border)',
                                                        transition: 'all 0.2s ease',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => setPreviewPdfId(pdf.id)}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(var(--error-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>📄</div>
                                                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                                                                {pdf.title.length > 30 ? pdf.title.substring(0, 27) + '...' : pdf.title}
                                                            </span>
                                                        </div>
                                                        <button className="btn-sidebar-delete" onClick={(e) => {
                                                            e.stopPropagation();
                                                            showConfirm('Remove Document', `Delete "${pdf.title}"?`, () => {
                                                                apiClient.deleteMaterial(pdf.id).then(() => {
                                                                    if (previewPdfId === pdf.id) setPreviewPdfId(null);
                                                                    loadCourseDetails(); closeConfirm();
                                                                });
                                                            });
                                                        }}>×</button>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            className="btn-premium-ghost"
                                                            style={{
                                                                flex: 1, padding: '6px', fontSize: '8px', fontWeight: 900,
                                                                background: previewPdfId === pdf.id ? 'var(--tier-color)' : 'transparent',
                                                                color: previewPdfId === pdf.id ? 'white' : 'var(--text-main)',
                                                                borderColor: previewPdfId === pdf.id ? 'var(--tier-color)' : 'var(--glass-border)'
                                                            }}
                                                            onClick={(e) => { e.stopPropagation(); setPreviewPdfId(pdf.id); }}
                                                        >
                                                            {previewPdfId === pdf.id ? 'ACTIVE PREVIEW' : 'VIEW PREVIEW'}
                                                        </button>

                                                        <input type="file" id={`pdf-rep-${pdf.id}`} hidden accept="application/pdf" onChange={e => {
                                                            const file = e.target.files?.[0]; if (!file) return;
                                                            setUploading(true);
                                                            apiClient.uploadFileWithProgress(file, 'PDF', p => setUploadProgress(p)).then(res => {
                                                                if (res.success) apiClient.updateMaterial(pdf.id, { title: res.name, url: res.url }).then(() => loadCourseDetails());
                                                            }).finally(() => setUploading(false));
                                                        }} />
                                                        <label htmlFor={`pdf-rep-${pdf.id}`} onClick={e => e.stopPropagation()} className="btn-premium-ghost" style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '8px', cursor: 'pointer', fontWeight: 900 }}>REPLACE</label>
                                                    </div>
                                                </div>
                                            ))}

                                            <input type="file" id="pdf-add-list" hidden accept="application/pdf" onChange={e => {
                                                const file = e.target.files?.[0]; if (!file) return;
                                                setUploading(true);
                                                apiClient.uploadFileWithProgress(file, 'PDF', p => setUploadProgress(p)).then(res => {
                                                    if (res.success) apiClient.createMaterial(activeLesson.id, { title: res.name, type: 'PDF', url: res.url, count: 1 }).then(() => loadCourseDetails());
                                                }).finally(() => setUploading(false));
                                            }} />
                                            <label htmlFor="pdf-add-list" className="btn-premium-ghost" style={{ marginTop: '5px', padding: '15px', borderRadius: '20px', border: '1px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', transition: '0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--tier-color)'; e.currentTarget.style.borderColor = 'var(--tier-color)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}>
                                                <span>➕</span> ATTACH ANOTHER DOCUMENT
                                            </label>
                                        </div>

                                        {/* Right Side: Shared Preview Area */}
                                        <div className="editor-card" style={{ padding: '0', background: 'rgba(var(--text-main-rgb), 0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)', boxShadow: '0 12px 40px rgba(0,0,0,0.15)', overflow: 'hidden', height: '100%', minHeight: '400px', position: 'sticky', top: '20px' }}>
                                            <div className="card-header" style={{ border: 'none', background: 'transparent', padding: '15px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h3 style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2px' }}>DOCUMENT PREVIEW</h3>
                                                {previewPdfId && (
                                                    <a
                                                        href={(() => {
                                                            const pdf = activeLesson.materials.find((m: any) => m.id === previewPdfId);
                                                            if (!pdf) return '#';
                                                            const filename = pdf.url?.split('/').pop();
                                                            return filename ? `http://127.0.0.1:8000/api/stream/${filename}` : pdf.url;
                                                        })()}
                                                        target="_blank" rel="noreferrer"
                                                        style={{ fontSize: '9px', fontWeight: 900, color: 'var(--tier-color)', textDecoration: 'none', padding: '4px 10px', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '6px' }}
                                                    >FULLSCREEN ↗</a>
                                                )}
                                            </div>
                                            <div style={{ padding: '0 20px 20px', height: 'calc(100% - 60px)' }}>
                                                {previewPdfId ? (
                                                    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: '#fff', height: '100%', minHeight: '350px' }}>
                                                        <iframe
                                                            src={(() => {
                                                                const pdf = activeLesson.materials.find((m: any) => m.id === previewPdfId);
                                                                if (!pdf) return '';
                                                                const filename = pdf.url?.split('/').pop();
                                                                return filename ? `http://127.0.0.1:8000/api/stream/${filename}` : pdf.url;
                                                            })()}
                                                            style={{ width: '100%', height: '100%', border: 'none' }}
                                                            key={previewPdfId}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{ height: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '15px' }}>
                                                        <div style={{ fontSize: '40px', opacity: 0.2 }}>📑</div>
                                                        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>SELECT A DOCUMENT TO PREVIEW</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeLesson.materials?.filter((m: any) => m.type === 'PDF').length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(var(--text-main-rgb), 0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                                        <div style={{ fontSize: '40px', marginBottom: '15px', opacity: 0.4 }}>📄</div>
                                        <h4 style={{ margin: '0 0 10px', color: 'var(--text-main)', fontSize: '15px', fontWeight: 800 }}>No documents detected</h4>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '300px', margin: '0 auto 25px' }}>Attach a supplementary PDF document to this lesson.</p>
                                        <input type="file" id="pdf-init" hidden accept="application/pdf" onChange={e => {
                                            const file = e.target.files?.[0]; if (!file) return;
                                            setUploading(true);
                                            apiClient.uploadFileWithProgress(file, 'PDF', p => setUploadProgress(p)).then(res => {
                                                if (res.success) apiClient.createMaterial(activeLesson.id, { title: res.name, type: 'PDF', url: res.url, count: 1 }).then(() => loadCourseDetails());
                                            }).finally(() => setUploading(false));
                                        }} />
                                        <label htmlFor="pdf-init" className="btn-premium-primary" style={{ cursor: 'pointer', display: 'inline-block' }}>{uploading ? `UPLOADING ${uploadProgress}%` : 'SELECT DOCUMENT FILE'}</label>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', opacity: 0.5 }}>
                            <div style={{ fontSize: '60px', marginBottom: '20px' }}>👈</div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Select a lesson to begin editing</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Pick a module from the sidebar to manage its content</p>
                        </div>
                    )}
                </div>
            </div>

            {inputModal.isOpen && (
                <div className="premium-modal-overlay" onClick={() => setInputModal(p => ({ ...p, isOpen: false }))}>
                    <div className="premium-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{inputModal.title}</h2>
                        </div>
                        <div className="modal-body">
                            <input autoFocus className="premium-input" placeholder={inputModal.placeholder} id="mi" onKeyDown={e => { if (e.key === 'Enter') inputModal.onConfirm((e.currentTarget as HTMLInputElement).value); }} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn-premium-ghost" onClick={() => setInputModal(p => ({ ...p, isOpen: false }))}>Cancel</button>
                            <button className="btn-premium-primary" onClick={() => inputModal.onConfirm((document.getElementById('mi') as HTMLInputElement).value)}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDialog.isOpen && (
                <div className="premium-modal-overlay" onClick={closeConfirm}>
                    <div className="premium-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{confirmDialog.title}</h2>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '1rem', lineHeight: '1.6' }}>{confirmDialog.message}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-premium-ghost" onClick={closeConfirm}>Cancel</button>
                            <button className="btn-premium-danger" onClick={confirmDialog.onConfirm}>Confirm Action</button>
                        </div>
                    </div>
                </div>
            )}

            {errorDialog.isOpen && (
                <div className="premium-modal-overlay" onClick={closeError}>
                    <div className="premium-modal-card" style={{ border: '1px solid rgba(var(--error-rgb), 0.3)' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ background: 'rgba(var(--error-rgb), 0.05)' }}>
                            <h2 style={{ color: 'var(--error)' }}>{errorDialog.title}</h2>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem' }}>⚠️</div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>{errorDialog.message}</p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-premium-danger" style={{ width: '100%' }} onClick={closeError}>Acknowledge and Continue</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurriculumEditor;
