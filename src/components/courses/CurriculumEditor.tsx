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
    const [backupExpanded, setBackupExpanded] = useState(false);
    const [backupDownloading, setBackupDownloading] = useState(false);
    const [backupRestoring, setBackupRestoring] = useState(false);
    const [backupStatus, setBackupStatus] = useState('');
    const [previewPdfId, setPreviewPdfId] = useState<number | null>(null);
    const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({});
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState('');

    const [activeView, setActiveView] = useState<'lesson' | 'exam'>('lesson');
    const [exam, setExam] = useState<{ id: number; title: string; passing_percent: number; time_minutes: number | null; questions: { id: number; question_text: string; options: string[]; correct_index: number; sequence: number }[] } | null>(null);
    const [examLoading, setExamLoading] = useState(false);
    const [addQuestionModal, setAddQuestionModal] = useState<{ isOpen: boolean; question: string; options: string[]; correctIndex: number }>({ isOpen: false, question: '', options: ['', '', '', ''], correctIndex: 0 });

    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: '', message: '' });

    const showConfirm = (title: string, message: string, onConfirm: () => void) => setConfirmDialog({ isOpen: true, title, message, onConfirm });
    const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

    const showError = (title: string, message: string) => setErrorDialog({ isOpen: true, title, message });
    const closeError = () => setErrorDialog(prev => ({ ...prev, isOpen: false }));

    const [inputModal, setInputModal] = useState<{
        isOpen: boolean; title: string; placeholder: string; onConfirm: (val: string) => void;
    }>({ isOpen: false, title: '', placeholder: '', onConfirm: () => { } });

    const resolveAssetUrl = (rawUrl?: string | null) => {
        if (!rawUrl) return undefined;
        if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

        const normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
        const configuredBase = import.meta.env.VITE_API_BASE_URL || '/api';

        if (configuredBase.startsWith('http://') || configuredBase.startsWith('https://')) {
            return new URL(normalized, `${configuredBase.replace(/\/$/, '')}/`).toString();
        }

        return normalized;
    };

    useEffect(() => { loadCourseDetails(); }, [courseId]);
    const loadExam = async () => {
        setExamLoading(true);
        try {
            const res = await apiClient.getCourseExam(courseId);
            if (res.success) setExam(res.data);
        } catch (e) { console.error(e); } finally { setExamLoading(false); }
    };

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

    const handleDownloadLessonBackup = async () => {
        if (!activeLesson?.id) return;
        setBackupStatus('');
        setBackupDownloading(true);
        try {
            await apiClient.downloadLessonBackup(activeLesson.id);
            setBackupStatus('Backup downloaded successfully.');
        } catch (e: any) {
            setBackupStatus(e?.message || 'Backup download failed.');
        } finally {
            setBackupDownloading(false);
        }
    };

    const handleRestoreLessonBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !activeLesson?.id) return;
        if (!window.confirm('Restore this lesson backup? This will replace current lesson video/PDF and metadata.')) {
            return;
        }
        setBackupStatus('');
        setBackupRestoring(true);
        try {
            const res = await apiClient.restoreLessonBackup(activeLesson.id, file);
            if (res.success) {
                setBackupStatus('Lesson restored successfully.');
                await loadCourseDetails();
            } else {
                setBackupStatus(res.message || 'Lesson restore failed.');
            }
        } catch (e: any) {
            setBackupStatus(e?.message || 'Lesson restore failed.');
        } finally {
            setBackupRestoring(false);
            event.target.value = '';
        }
    };

    const handleDownloadCourseBackup = async () => {
        if (!courseId) return;
        setBackupStatus('');
        setBackupDownloading(true);
        try {
            await apiClient.downloadCourseBackup(Number(courseId));
            setBackupStatus('Course backup downloaded successfully.');
        } catch (e: any) {
            setBackupStatus(e?.message || 'Course backup failed.');
        } finally {
            setBackupDownloading(false);
        }
    };

    const handleRestoreCourseBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !courseId) return;
        if (!window.confirm('Restore this FULL COURSE backup? This will DELETE all current modules/lessons and replace them.')) {
            return;
        }
        setBackupStatus('');
        setBackupRestoring(true);
        try {
            const res = await apiClient.restoreCourseBackup(Number(courseId), file);
            if (res.success) {
                setBackupStatus('Course restored successfully.');
                await loadCourseDetails();
                setActiveLesson(null);
            } else {
                setBackupStatus(res.message || 'Course restore failed.');
            }
        } catch (e: any) {
            setBackupStatus(e?.message || 'Course restore failed.');
        } finally {
            setBackupRestoring(false);
            event.target.value = '';
        }
    };

    if (loading) return <div className="loader"></div>;

    const getTierColor = (tier?: string) => {
        const t = tier?.toLowerCase() || '';
        if (t.includes('titan')) return '#F59E0B'; // Gold/Amber
        if (t.includes('rainmaker')) return '#94A3B8'; // Silver/Slate
        return '#4f46e5'; // Consultant / Primary Purple
    };

    const tierColor = getTierColor(course?.min_tier);
    const tierShadow = `${tierColor}55`; // 33% opacity for shadow

    return (
        <div className="curriculum-container fade-in" style={{
            ['--tier-color' as any]: tierColor,
            ['--tier-shadow' as any]: tierShadow
        }}>
            <div className="curriculum-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'space-between', paddingRight: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                        onClick={onBack}
                        className="btn-back-icon"
                        style={{ background: 'rgba(var(--text-main-rgb), 0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderRadius: '12px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '20px', transition: 'all 0.2s' }}
                    >
                        ←
                    </button>
                    <h1 style={{ margin: 0, fontSize: 'clamp(1.1rem, 2vw, 1.8rem)', lineHeight: 1.2, overflowWrap: 'anywhere' }}>{course?.title}</h1>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        className="btn-premium-primary"
                        style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={handleDownloadCourseBackup}
                        disabled={backupDownloading || backupRestoring}
                    >
                        <span>{backupDownloading ? 'Preparing...' : '📦 Backup Course'}</span>
                    </button>
                    <label 
                        className="btn-premium-ghost" 
                        style={{ 
                            padding: '8px 16px', 
                            fontSize: '12px', 
                            cursor: 'pointer', 
                            margin: 0,
                            background: 'rgba(var(--text-main-rgb), 0.03)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '10px'
                        }}
                    >
                        {backupRestoring ? 'Restoring...' : 'Restore'}
                        <input
                            type="file"
                            accept=".zip"
                            onChange={handleRestoreCourseBackup}
                            disabled={backupDownloading || backupRestoring}
                            style={{ display: 'none' }}
                        />
                    </label>
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
                                        <div key={l.id} className={`lesson-item ${activeView === 'lesson' && activeLesson?.id === l.id ? 'active' : ''}`} onClick={() => { setActiveView('lesson'); setActiveLesson(l); }}>
                                            <span>{l.title}</span>
                                            <button className="btn-sidebar-delete" onClick={(e) => { e.stopPropagation(); handleDeleteLesson(l.id, l.title); }}>×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div
                            className={`lesson-item ${activeView === 'exam' ? 'active' : ''}`}
                            onClick={() => { setActiveView('exam'); setActiveLesson(null); loadExam(); }}
                            style={{ marginTop: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}
                        >
                            <span>📋 Test / Exam</span>
                        </div>
                    </div>
                </div>

                <div className="curriculum-main">
                    {activeView === 'exam' ? (
                        <div className="lesson-editor" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '28px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(var(--primary-rgb), 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📋</div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Test / Exam</h2>
                                    <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Users take this exam when they complete the course 100%</p>
                                </div>
                            </div>
                            {examLoading ? (
                                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading exam...</div>
                            ) : !exam ? (
                                <div className="editor-card" style={{ padding: '40px', textAlign: 'center', border: '2px dashed var(--glass-border)', borderRadius: '20px', background: 'rgba(var(--text-main-rgb), 0.02)' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>📝</div>
                                    <h3 style={{ margin: '0 0 12px', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 800 }}>No exam yet</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.5 }}>Create an exam with questions. Users must pass it after completing all modules.</p>
                                    <button
                                        className="btn-premium-primary"
                                        onClick={async () => {
                                            const title = (course?.title || 'Course') + ' Exam';
                                            const res = await apiClient.createCourseExam(courseId, { title, passing_percent: 70, time_minutes: 30 });
                                            if (res.success) loadExam();
                                        }}
                                    >
                                        Create Exam
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="editor-card" style={{ marginBottom: '24px', padding: '24px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>EXAM TITLE</label>
                                                <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '1rem' }}>{exam.title}</div>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>PASSING %</label>
                                                <div style={{ color: 'var(--text-main)', fontWeight: 700 }}>{exam.passing_percent}%</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            Time limit: {exam.time_minutes ? `${exam.time_minutes} minutes` : 'No limit'} · {exam.questions.length} question{exam.questions.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    <div className="editor-card" style={{ padding: '0', overflow: 'hidden' }}>
                                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 900, letterSpacing: '1px' }}>QUESTIONS</h3>
                                            <button
                                                className="btn-premium-primary"
                                                style={{ padding: '8px 16px', fontSize: '11px' }}
                                                onClick={() => setAddQuestionModal({ isOpen: true, question: '', options: ['', '', '', ''], correctIndex: 0 })}
                                            >
                                                + Add Question
                                            </button>
                                        </div>
                                        <div style={{ padding: '20px' }}>
                                            {exam.questions.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
                                                    No questions yet. Add questions for users to answer.
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    {exam.questions.map((q, idx) => (
                                                        <div key={q.id} style={{ padding: '16px', background: 'rgba(var(--text-main-rgb), 0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                                            <div style={{ fontWeight: 700, marginBottom: '10px', color: 'var(--text-main)' }}>Q{idx + 1}. {q.question_text}</div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                {q.options.map((opt, i) => (
                                                                    <div key={i} style={{ fontSize: '13px', color: i === q.correct_index ? 'var(--success)' : 'var(--text-secondary)' }}>
                                                                        {String.fromCharCode(65 + i)}. {opt} {i === q.correct_index ? ' ✓' : ''}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : activeLesson ? (
                        <div className="lesson-editor">
                            <div className="editor-card" style={{ marginBottom: '8px' }}>
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

                            {false && (
                                <div className="editor-card" style={{ marginTop: '10px' }}>
                                    <div
                                        className="card-header"
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                        onClick={() => setBackupExpanded((v) => !v)}
                                    >
                                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>🗂️</span>
                                            Backup
                                        </h3>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 800 }}>{backupExpanded ? '−' : '+'}</span>
                                    </div>
                                    {backupExpanded && (
                                        <div className="card-body" style={{ paddingTop: '10px' }}>
                                            <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                Download or restore this lesson package (metadata + video + PDF files).
                                            </p>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <button
                                                    className="btn-premium-primary"
                                                    onClick={handleDownloadLessonBackup}
                                                    disabled={backupDownloading || backupRestoring}
                                                >
                                                    {backupDownloading ? 'Preparing Backup...' : 'Download Backup'}
                                                </button>
                                                <label className="btn-premium-ghost" style={{ cursor: backupDownloading || backupRestoring ? 'not-allowed' : 'pointer', opacity: backupDownloading || backupRestoring ? 0.6 : 1 }}>
                                                    {backupRestoring ? 'Restoring...' : 'Restore Backup'}
                                                    <input
                                                        type="file"
                                                        accept=".zip"
                                                        onChange={handleRestoreLessonBackup}
                                                        disabled={backupDownloading || backupRestoring}
                                                        style={{ display: 'none' }}
                                                    />
                                                </label>
                                            </div>
                                            {backupStatus && (
                                                <div style={{ marginTop: '10px', fontSize: '12px', color: backupStatus.toLowerCase().includes('failed') ? 'var(--error)' : 'var(--text-main)' }}>
                                                    {backupStatus}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Resources Grid (Video twin-cards) */}
                            {(() => {
                                const materials = activeLesson.materials || [];
                                const videoMaterial = materials.find((m: any) => (m.type || '').toString().toLowerCase() === 'video');
                                return videoMaterial ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                                    {/* Card 1: Main Video */}
                                    <div className="editor-card" style={{ padding: '0', background: 'rgba(var(--text-main-rgb), 0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', height: 'clamp(150px, 22vh, 210px)', display: 'flex', flexDirection: 'column' }}>
                                        <div className="card-header" style={{ border: 'none', background: 'transparent', padding: '15px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2.5px' }}>VIDEO CONTENT</h3>
                                            <button className="btn-sidebar-delete" onClick={() => {
                                                showConfirm('Delete Video', 'Remove this video file from the lesson?', () => {
                                                    apiClient.deleteMaterial(videoMaterial.id).then(() => { loadCourseDetails(); closeConfirm(); });
                                                });
                                            }}>×</button>
                                        </div>
                                        <div style={{ position: 'relative', flex: 1, background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)', borderRadius: '0 0 24px 24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <video src={resolveAssetUrl(videoMaterial.url)} preload="metadata" controls poster={resolveAssetUrl(videoMaterial.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />

                                            <input type="file" accept="video/*" id="video-replace" hidden onChange={e => handleFileUpload(e, activeLesson.id, 'Video')} />
                                            <label htmlFor="video-replace" style={{ position: 'absolute', top: '10px', left: '10px', padding: '6px 14px', background: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: '8px', fontSize: '9px', fontWeight: 900, cursor: 'pointer', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0, transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>REPLACE VIDEO</label>
                                        </div>
                                    </div>

                                    {/* Card 2: Poster/Thumbnail */}
                                    <div className="editor-card" style={{ padding: '0', background: 'rgba(var(--text-main-rgb), 0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', height: 'clamp(150px, 22vh, 210px)', display: 'flex', flexDirection: 'column' }}>
                                        <div className="card-header" style={{ border: 'none', background: 'transparent', padding: '15px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2.5px' }}>THUMBNAIL PREVIEW</h3>
                                            {videoMaterial.thumbnail_url && (
                                                <button className="btn-sidebar-delete" onClick={() => {
                                                    showConfirm('Remove Thumbnail', 'Reset poster to default preview?', () => {
                                                        apiClient.updateMaterial(videoMaterial.id, { thumbnail_url: '' }).then(() => { loadCourseDetails(); closeConfirm(); });
                                                    });
                                                }}>×</button>
                                            )}
                                        </div>
                                        <div style={{ position: 'relative', flex: 1, background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)', borderRadius: '0 0 24px 24px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            {videoMaterial.thumbnail_url ? (
                                                <img src={resolveAssetUrl(videoMaterial.thumbnail_url)} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                                                    await apiClient.updateMaterial(videoMaterial.id, { thumbnail_url: res.url }); loadCourseDetails();
                                                }
                                            }} />
                                            <label htmlFor="thumb-replace" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', opacity: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 900, transition: '0.2s', backdropFilter: 'blur(8px)' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                                                {videoMaterial.thumbnail_url ? 'REPLACE POSTER' : 'UPLOAD CUSTOM POSTER'}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                ) : null;
                            })()}
                            {!((activeLesson.materials || []).find((m: any) => (m.type || '').toString().toLowerCase() === 'video')) && (
                                <div style={{ marginBottom: '10px', textAlign: 'center', padding: '22px', background: 'rgba(var(--text-main-rgb), 0.02)', borderRadius: '24px', border: '2px dashed var(--glass-border)' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '15px', opacity: 0.4 }}>🎬</div>
                                    <h4 style={{ margin: '0 0 10px', color: 'var(--text-main)', fontSize: '15px', fontWeight: 800 }}>No main video detected</h4>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '300px', margin: '0 auto 25px' }}>Attach a video resource to start building this lesson.</p>
                                    <input type="file" accept="video/*" id="video-init" hidden onChange={e => handleFileUpload(e, activeLesson.id, 'Video')} />
                                    <label htmlFor="video-init" className="btn-premium-primary" style={{ cursor: 'pointer', display: 'inline-block' }}>{uploading ? `UPLOADING ${uploadProgress}%` : 'SELECT VIDEO FILE'}</label>
                                </div>
                            )}

                            {/* Section Divider */}
                            <div style={{ position: 'relative', margin: '14px 0 10px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
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
                                        {(activeLesson.materials || []).filter((m: any) => (m.type || '').toString().toLowerCase() === 'pdf').length > 0 && (
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--tier-color)', background: 'rgba(var(--primary-rgb), 0.1)', padding: '4px 12px', borderRadius: '8px', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
                                                {(activeLesson.materials || []).filter((m: any) => (m.type || '').toString().toLowerCase() === 'pdf').length} ATTACHED
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {((activeLesson.materials || []).filter((m: any) => (m.type || '').toString().toLowerCase() === 'pdf').length > 0) && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', alignItems: 'start' }}>
                                        {/* Left Side: List of Documents */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {(activeLesson.materials || []).filter((m: any) => (m.type || '').toString().toLowerCase() === 'pdf').map((pdf: any) => (
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
                                                                {(pdf.title || '').length > 30 ? (pdf.title || '').substring(0, 27) + '...' : (pdf.title || 'Untitled')}
                                                            </span>
                                                        </div>
                                                        <button className="btn-sidebar-delete" onClick={(e) => {
                                                            e.stopPropagation();
                                                            showConfirm('Remove Document', `Delete "${pdf.title || 'this document'}"?`, () => {
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
                                        <div className="editor-card" style={{ padding: '0', background: 'rgba(var(--text-main-rgb), 0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)', boxShadow: '0 12px 40px rgba(0,0,0,0.15)', overflow: 'hidden', height: '100%', minHeight: '220px', position: 'relative', top: 'auto' }}>
                                            <div className="card-header" style={{ border: 'none', background: 'transparent', padding: '15px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h3 style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2px' }}>DOCUMENT PREVIEW</h3>
                                                {previewPdfId && (
                                                    <a
                                                        href={(() => {
                                                            const pdf = (activeLesson.materials || []).find((m: any) => m.id === previewPdfId);
                                                            return resolveAssetUrl(pdf?.url) || '#';
                                                        })()}
                                                        target="_blank" rel="noreferrer"
                                                        style={{ fontSize: '9px', fontWeight: 900, color: 'var(--tier-color)', textDecoration: 'none', padding: '4px 10px', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '6px' }}
                                                    >FULLSCREEN ↗</a>
                                                )}
                                            </div>
                                            <div style={{ padding: '0 20px 20px', height: 'calc(100% - 60px)' }}>
                                                {previewPdfId ? (
                                                    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: '#fff', height: '100%', minHeight: '200px' }}>
                                                        <iframe
                                                            src={resolveAssetUrl((activeLesson.materials || []).find((m: any) => m.id === previewPdfId)?.url) || ''}
                                                            style={{ width: '100%', height: '100%', border: 'none' }}
                                                            key={previewPdfId}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '15px' }}>
                                                        <div style={{ fontSize: '40px', opacity: 0.2 }}>📑</div>
                                                        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>SELECT A DOCUMENT TO PREVIEW</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {((activeLesson.materials || []).filter((m: any) => (m.type || '').toString().toLowerCase() === 'pdf').length === 0) && (
                                    <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(var(--text-main-rgb), 0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
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

            {addQuestionModal.isOpen && exam && (
                <div className="premium-modal-overlay" onClick={() => setAddQuestionModal(p => ({ ...p, isOpen: false }))}>
                    <div className="premium-modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Question</h2>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>QUESTION</label>
                                <textarea
                                    className="premium-input"
                                    placeholder="Enter the question text..."
                                    value={addQuestionModal.question}
                                    onChange={e => setAddQuestionModal(p => ({ ...p, question: e.target.value }))}
                                    rows={3}
                                    style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                                />
                            </div>
                            {addQuestionModal.options.map((opt, i) => (
                                <div key={i}>
                                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                                        OPTION {String.fromCharCode(65 + i)} {addQuestionModal.correctIndex === i ? '(Correct)' : ''}
                                    </label>
                                    <input
                                        type="text"
                                        className="premium-input"
                                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                        value={opt}
                                        onChange={e => {
                                            const next = [...addQuestionModal.options];
                                            next[i] = e.target.value;
                                            setAddQuestionModal(p => ({ ...p, options: next }));
                                        }}
                                    />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>CORRECT ANSWER</label>
                                <select
                                    className="premium-input"
                                    value={addQuestionModal.correctIndex}
                                    onChange={e => setAddQuestionModal(p => ({ ...p, correctIndex: Number(e.target.value) }))}
                                >
                                    {addQuestionModal.options.map((_, i) => (
                                        <option key={i} value={i}>Option {String.fromCharCode(65 + i)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-premium-ghost" onClick={() => setAddQuestionModal(p => ({ ...p, isOpen: false }))}>Cancel</button>
                            <button
                                className="btn-premium-primary"
                                onClick={async () => {
                                    const { question, options, correctIndex } = addQuestionModal;
                                    const opts = options.filter(o => o.trim());
                                    if (!question.trim() || opts.length < 2) {
                                        showError('Validation', 'Provide a question and at least 2 options.');
                                        return;
                                    }
                                    const res = await apiClient.addExamQuestion(exam.id, { question_text: question.trim(), options: opts, correct_index: correctIndex >= opts.length ? 0 : correctIndex, sequence: exam.questions.length });
                                    if (res.success) {
                                        loadExam();
                                        setAddQuestionModal({ isOpen: false, question: '', options: ['', '', '', ''], correctIndex: 0 });
                                    } else {
                                        showError('Error', 'Failed to add question.');
                                    }
                                }}
                            >
                                Add Question
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurriculumEditor;
