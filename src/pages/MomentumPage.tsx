import React from 'react';
import type { ActivityType, DailyLogEntry } from '../types';
import * as XLSX from 'xlsx';
import { apiClient } from '../api/client';
import '../components/courses/CurriculumEditor.css';

interface MomentumPageProps {
    activityTypes: ActivityType[];
    userActivityPoints: number;
    setShowAddActivityModal: (show: boolean) => void;
    setUserActivityPoints: (points: number) => void;
    setActivityTypes: React.Dispatch<React.SetStateAction<ActivityType[]>>;
    searchTerm: string;
}

type CategoryKey = 'subconscious' | 'conscious';
type SectionGroup = { title: string; order: number; items: ActivityType[] };

type DailyLogDraft = {
    day_title: string;
    task_title: string;
    script_title: string;
    task_description: string;
    script_idea: string;
    feedback: string;
    audio_url: string;
    required_listen_percent: number;
    require_user_response: boolean;
    notification_enabled: boolean;
    morning_reminder_enabled: boolean;
    evening_reminder_enabled: boolean;
    morning_reminder_time: string;
    evening_reminder_time: string;
    is_mcq: boolean;
    mcq_question: string;
    mcq_options: string[];
    mcq_correct_option: number | null;
};
type UiDialog =
    | null
    | { kind: 'confirm'; title: string; message: string; onConfirm: () => void }
    | { kind: 'prompt'; title: string; label: string; value: string; placeholder?: string; onConfirm: (value: string) => void };

type MomentumSaveToast = { message: string; variant: 'success' | 'error' };

function formatAudioTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const PremiumAudioPlayer: React.FC<{ src: string }> = ({ src }) => {
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentTime, setCurrentTime] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [playbackRate, setPlaybackRate] = React.useState(1);

    React.useEffect(() => {
        const el = audioRef.current;
        if (!el) return;
        const onTimeUpdate = () => setCurrentTime(el.currentTime);
        const onDurationChange = () => setDuration(el.duration);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        el.addEventListener('timeupdate', onTimeUpdate);
        el.addEventListener('durationchange', onDurationChange);
        el.addEventListener('play', onPlay);
        el.addEventListener('pause', onPause);
        return () => {
            el.removeEventListener('timeupdate', onTimeUpdate);
            el.removeEventListener('durationchange', onDurationChange);
            el.removeEventListener('play', onPlay);
            el.removeEventListener('pause', onPause);
        };
    }, []);

    React.useEffect(() => {
        const el = audioRef.current;
        if (!el) return;
        el.playbackRate = playbackRate;
    }, [playbackRate]);

    const togglePlay = () => {
        const el = audioRef.current;
        if (!el) return;
        if (el.paused) el.play();
        else el.pause();
    };

    const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const el = audioRef.current;
        const v = parseFloat(e.target.value);
        if (el && !Number.isNaN(v)) {
            el.currentTime = v;
            setCurrentTime(v);
        }
    };

    const toggle2x = () => setPlaybackRate((r) => (r === 2 ? 1 : 2));

    if (!src) return null;

    const dur = duration > 0 ? duration : 0;
    const pos = Math.min(currentTime, dur);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <audio ref={audioRef} src={src} preload="metadata" />
            <button type="button" onClick={togglePlay} className="btn-premium-primary" style={{ margin: 0, padding: '8px 14px', minWidth: 44 }}>
                {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
                type="button"
                onClick={toggle2x}
                style={{
                    margin: 0,
                    padding: '8px 12px',
                    background: playbackRate === 2 ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: playbackRate === 2 ? 'white' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                }}
                title="Toggle 2x speed"
            >
                2×
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 90 }}>
                {formatAudioTime(pos)} / {dur > 0 ? formatAudioTime(dur) : '--:--'}
            </span>
            <input
                type="range"
                min={0}
                max={dur || 100}
                step={0.1}
                value={pos}
                onChange={onSeek}
                style={{ flex: 1, minWidth: 120, maxWidth: 200, accentColor: 'var(--accent)' }}
                title="Seek"
            />
        </div>
    );
};

const MomentumPage: React.FC<MomentumPageProps> = ({ activityTypes, setActivityTypes, searchTerm }) => {
    const [activeCategory, setActiveCategory] = React.useState<CategoryKey>('subconscious');
    const [activeSection, setActiveSection] = React.useState('');
    const [activeActivityId, setActiveActivityId] = React.useState<number | null>(null);
    const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});
    const [selectedDayNumber, setSelectedDayNumber] = React.useState(1);
    const [bulkDayLogText, setBulkDayLogText] = React.useState('');
    const [openDayWiseEditor] = React.useState(true);
    const [openBulkImport, setOpenBulkImport] = React.useState(false);
    const [savedDayLogs, setSavedDayLogs] = React.useState<DailyLogEntry[]>([]);
    const [isLoadingSavedDayLogs, setIsLoadingSavedDayLogs] = React.useState(false);
    const [expandedSavedDay, setExpandedSavedDay] = React.useState<number | null>(null);
    const [dayDrafts, setDayDrafts] = React.useState<Record<number, DailyLogDraft>>({});
    const [savingDay, setSavingDay] = React.useState<number | null>(null);
    const [deletingDay, setDeletingDay] = React.useState<number | null>(null);
    const [isAddingDay, setIsAddingDay] = React.useState(false);
    const [newDayNumber, setNewDayNumber] = React.useState<number>(1);
    const [dayFilterMode, setDayFilterMode] = React.useState<'all' | 'week' | 'month'>('all');
    const [dayFilterIndex, setDayFilterIndex] = React.useState(1);
    const [isEditingSectionTitle, setIsEditingSectionTitle] = React.useState(false);
    const [sectionTitleDraft, setSectionTitleDraft] = React.useState('');
    const [isSavingSectionTitle, setIsSavingSectionTitle] = React.useState(false);
    const [uiDialog, setUiDialog] = React.useState<UiDialog>(null);
    const [saveToast, setSaveToast] = React.useState<MomentumSaveToast | null>(null);
    const saveToastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [taskDescExpandedByDay, setTaskDescExpandedByDay] = React.useState<Record<number, boolean>>({});
    const [scriptIdeaExpandedByDay, setScriptIdeaExpandedByDay] = React.useState<Record<number, boolean>>({});
    const [feedbackExpandedByDay, setFeedbackExpandedByDay] = React.useState<Record<number, boolean>>({});

    // Edit selected activity (e.g. Visualization item) basics.
    const [isEditingActivity, setIsEditingActivity] = React.useState(false);
    const [activityDraftName, setActivityDraftName] = React.useState('');
    const [activityDraftDescription, setActivityDraftDescription] = React.useState('');
    const [activityDraftScriptIdea, setActivityDraftScriptIdea] = React.useState('');
    const [isSavingActivity, setIsSavingActivity] = React.useState(false);
    const [audioUploadingDay, setAudioUploadingDay] = React.useState<number | null>(null);
    const [audioUploadPercent, setAudioUploadPercent] = React.useState(0);
    const singleAudioInputRef = React.useRef<HTMLInputElement>(null);
    const pendingUploadDayRef = React.useRef<number | null>(null);
    const dayDraftsRef = React.useRef(dayDrafts);
    const bulkImportFileRef = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
        dayDraftsRef.current = dayDrafts;
    }, [dayDrafts]);

    const formatTimeForInput = (time: string | null | undefined) => {
        if (!time) return '';
        if (time.length > 5 && time.includes(':')) {
            return time.split(':').slice(0, 2).join(':');
        }
        return time;
    };

    const showSaveToast = React.useCallback((message: string, variant: 'success' | 'error' = 'success') => {
        if (saveToastTimeoutRef.current) {
            clearTimeout(saveToastTimeoutRef.current);
            saveToastTimeoutRef.current = null;
        }
        setSaveToast({ message, variant });
        saveToastTimeoutRef.current = setTimeout(() => {
            setSaveToast(null);
            saveToastTimeoutRef.current = null;
        }, 3800);
    }, []);

    React.useEffect(
        () => () => {
            if (saveToastTimeoutRef.current) clearTimeout(saveToastTimeoutRef.current);
        },
        [],
    );

    const getPreviousDayTaskDescription = (day: number): string => {
        const prev = savedDayLogs.filter((x) => Number(x.day_number) < day).sort((a, b) => b.day_number - a.day_number)[0];
        return (prev?.task_description ?? '').toString().trim();
    };

    const toggleTaskDescExpanded = (day: number) => {
        setTaskDescExpandedByDay((prev) => ({ ...prev, [day]: !prev[day] }));
    };

    const toggleFeedbackExpanded = (day: number) => {
        setFeedbackExpandedByDay((prev) => ({ ...prev, [day]: !prev[day] }));
    };

    const toggleScriptIdeaExpanded = (day: number) => {
        setScriptIdeaExpandedByDay((prev) => ({ ...prev, [day]: !prev[day] }));
    };

    const momentumCollapsibleHeaderStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'none',
        border: 'none',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        padding: '6px 0',
        fontSize: '10px',
        fontWeight: 900,
        letterSpacing: '1px',
        width: '100%',
        textAlign: 'left',
        borderRadius: 8,
        transition: 'background 0.15s ease, color 0.15s ease',
    };

    const momentumCollapsiblePreviewStyle: React.CSSProperties = {
        marginTop: 8,
        padding: '8px 12px',
        background: 'var(--bg-tertiary)',
        borderRadius: 8,
        fontSize: 13,
        color: 'var(--text-muted)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        border: '1px solid rgba(255,255,255,0.06)',
    };

    const triggerAudioUpload = (day: number) => {
        pendingUploadDayRef.current = day;
        singleAudioInputRef.current?.click();
    };

    const onAudioFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const day = pendingUploadDayRef.current;
        e.target.value = '';
        pendingUploadDayRef.current = null;
        if (file && day != null) handleAudioUpload(day, file);
    };

    const resolveAudioPlaybackUrl = (url: string) => {
        const u = (url ?? '').trim();
        if (!u) return '';
        if (u.startsWith('http')) return u;
        const base = apiClient.getBaseUrl().replace(/\/api\/?$/, '');
        return base + (u.startsWith('/') ? u : '/' + u);
    };

    const handleAudioUpload = async (day: number, file: File) => {
        if (!selectedActivity) return;
        if (!localStorage.getItem('adminToken')) {
            alert('Admin session missing. Log in again, then retry the upload.');
            return;
        }
        setAudioUploadingDay(day);
        setAudioUploadPercent(1);
        try {
            const res = await apiClient.uploadFileWithProgress(file, 'Audio', (p) =>
                setAudioUploadPercent((prev) => Math.max(prev, p)),
            );
            if (!res.success || !(res.url ?? '').trim()) {
                alert(res.message ?? 'Upload finished but the server did not return a file URL.');
                return;
            }
            const raw = (res.url ?? '').trim();
            const storedUrl = raw.startsWith('http') ? raw : raw.startsWith('/') ? raw : `/${raw}`;

            const defaultDraft: DailyLogDraft = {
                day_title: '',
                task_title: 'TASK DESCRIPTION',
                script_title: 'QUESTION / PROMPT (OPTIONAL)',
                task_description: (selectedActivity.description ?? '').toString(),
                script_idea: (selectedActivity.script_idea ?? '').toString(),
                feedback: '',
                audio_url: '',
                required_listen_percent: 0,
                require_user_response: false,
                is_mcq: false,
                mcq_question: '',
                mcq_options: [],
                mcq_correct_option: null,
                notification_enabled: true,
                morning_reminder_enabled: true,
                evening_reminder_enabled: true,
                morning_reminder_time: '09:00',
                evening_reminder_time: '18:00',
            };
            const base = dayDraftsRef.current[day] ?? defaultDraft;
            const merged: DailyLogDraft = { ...base, audio_url: storedUrl };
            setDayDrafts((prev) => ({
                ...prev,
                [day]: { ...(prev[day] ?? defaultDraft), audio_url: storedUrl },
            }));

            const saveRes = await apiClient.upsertActivityTypeDailyLog(selectedActivity.id, day, {
                day_title: merged.day_title || `DAY ${day}`,
                task_title: merged.task_title || 'TASK DESCRIPTION',
                script_title: merged.script_title || 'QUESTION / PROMPT (OPTIONAL)',
                task_description: merged.task_description.trim(),
                script_idea: merged.script_idea.trim(),
                feedback: merged.feedback.trim(),
                audio_url: storedUrl,
                required_listen_percent: Math.max(0, Math.min(100, Number(merged.required_listen_percent || 0))),
                require_user_response: Boolean(merged.require_user_response),
                is_mcq: Boolean(merged.is_mcq),
                mcq_question: (merged.mcq_question ?? '').trim(),
                mcq_options: merged.mcq_options || [],
                mcq_correct_option: merged.mcq_correct_option,
                notification_enabled: Boolean(merged.notification_enabled),
                morning_reminder_enabled: Boolean(merged.morning_reminder_enabled),
                evening_reminder_enabled: Boolean(merged.evening_reminder_enabled),
                morning_reminder_time: merged.morning_reminder_time || '09:00',
                evening_reminder_time: merged.evening_reminder_time || '18:00',
            });
            if (!saveRes.success) {
                alert(
                    'File uploaded, but saving this day to the database failed. Your text fields are unchanged; click Save on the day card after checking the network or server.',
                );
                return;
            }
            await refreshSavedDayLogs();
        } catch (e) {
            console.error('Audio upload failed:', e);
            const msg = e instanceof Error ? e.message : 'Upload failed';
            alert(`Audio upload failed: ${msg}. Check file size (max 50MB), admin login, Vite proxy / API URL, and try again.`);
        } finally {
            setAudioUploadingDay(null);
            setAudioUploadPercent(0);
        }
    };

    const categories = [
        { key: 'subconscious' as const, label: 'BELIEF', empty: 'No belief activities' },
        { key: 'conscious' as const, label: 'FOCUS', empty: 'No focus activities' },
    ];

    const normalizedSearch = React.useMemo(() => (searchTerm ?? '').trim().toLowerCase(), [searchTerm]);

    const groupedByCategory = React.useMemo(() => {
        const filteredActivityTypes = !normalizedSearch
            ? activityTypes
            : activityTypes.filter((item) => {
                  const haystack = `${item.name ?? ''} ${item.description ?? ''} ${item.script_idea ?? ''} ${item.section_title ?? ''}`.toLowerCase();
                  return haystack.includes(normalizedSearch);
              });

        const result: Record<CategoryKey, SectionGroup[]> = { subconscious: [], conscious: [] };

        (['subconscious', 'conscious'] as const).forEach((category) => {
            const grouped = new Map<string, ActivityType[]>();
            filteredActivityTypes
                .filter((item) => item.category === category)
                .sort((a, b) =>
                    (a.section_order ?? 0) - (b.section_order ?? 0) ||
                    (a.item_order ?? 0) - (b.item_order ?? 0) ||
                    a.name.localeCompare(b.name)
                )
                .forEach((item) => {
                    const key = item.section_title || (category === 'subconscious' ? 'Belief' : 'Focus');
                    if (!grouped.has(key)) grouped.set(key, []);
                    grouped.get(key)!.push(item);
                });

            result[category] = Array.from(grouped.entries())
                .map(([title, items]) => ({ title, order: items[0]?.section_order ?? 999, items }))
                .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
        });

        return result;
    }, [activityTypes, normalizedSearch]);

    const sections = groupedByCategory[activeCategory];
    const currentSection = sections.find((s) => s.title === activeSection) ?? sections[0] ?? null;
    const selectedActivity = currentSection?.items.find((i) => i.id === activeActivityId) ?? currentSection?.items[0] ?? null;

    React.useEffect(() => {
        if (!sections.length) {
            setActiveSection('');
            return;
        }
        if (!sections.some((s) => s.title === activeSection)) {
            setActiveSection(sections[0].title);
        }
    }, [sections, activeSection]);

    React.useEffect(() => {
        const nextExpanded: Record<string, boolean> = {};
        sections.forEach((section) => {
            nextExpanded[section.title] = section.title === activeSection;
        });
        setExpandedSections(nextExpanded);
    }, [activeSection, sections]);

    React.useEffect(() => {
        if (!currentSection?.items.length) {
            setActiveActivityId(null);
            return;
        }
        if (!currentSection.items.some((i) => i.id === activeActivityId)) {
            setActiveActivityId(currentSection.items[0].id);
        }
    }, [currentSection, activeActivityId]);

    React.useEffect(() => {
        // Reset day navigation when switching activity
        setSelectedDayNumber(1);
        setDayDrafts({});
        setIsAddingDay(false);
        setIsEditingActivity(false);
        setActivityDraftName(selectedActivity?.name ?? '');
        setActivityDraftDescription(selectedActivity?.description ?? '');
        setActivityDraftScriptIdea(selectedActivity?.script_idea ?? '');
    }, [selectedActivity?.id]);

    const refreshSavedDayLogs = React.useCallback(async () => {
        if (!selectedActivity) {
            setSavedDayLogs([]);
            return;
        }
        setIsLoadingSavedDayLogs(true);
        const res = await apiClient.getActivityTypeDailyLogs(selectedActivity.id, 1, 365);
        if (res.success) {
            const normalized = (res.data || [])
                .map((entry) => ({
                    day_number: Number(entry.day_number ?? 0),
                    day_title: entry.day_title ?? null,
                    task_title: entry.task_title ?? null,
                    script_title: entry.script_title ?? null,
                    task_description: entry.task_description ?? null,
                    script_idea: entry.script_idea ?? null,
                    feedback: entry.feedback ?? null,
                    audio_url: entry.audio_url ?? null,
                    required_listen_percent: Number(entry.required_listen_percent ?? 0),
                    require_user_response: Boolean(entry.require_user_response ?? false),
                    notification_enabled: Boolean(entry.notification_enabled ?? false),
                    morning_reminder_enabled: Boolean(entry.morning_reminder_enabled ?? true),
                    evening_reminder_enabled: Boolean(entry.evening_reminder_enabled ?? true),
                    morning_reminder_time: entry.morning_reminder_time ?? '09:00',
                    evening_reminder_time: entry.evening_reminder_time ?? '18:00',
                    is_mcq: Boolean(entry.is_mcq ?? false),
                    mcq_question: entry.mcq_question ?? null,
                    mcq_options: typeof entry.mcq_options === 'string' ? JSON.parse(entry.mcq_options) : (entry.mcq_options ?? []),
                    mcq_correct_option: entry.mcq_correct_option != null ? Number(entry.mcq_correct_option) : null,
                }))
                .sort((a, b) => a.day_number - b.day_number);
            setSavedDayLogs(normalized);
        }
        setIsLoadingSavedDayLogs(false);
    }, [selectedActivity?.id]);

    React.useEffect(() => {
        refreshSavedDayLogs();
    }, [refreshSavedDayLogs]);

    React.useEffect(() => {
        // Reset expanded panel when switching activity
        setExpandedSavedDay(null);
        setTaskDescExpandedByDay({});
    }, [selectedActivity?.id]);

    const ensureDayDraftLoaded = React.useCallback(async (day: number) => {
        if (!selectedActivity) return;
        if (dayDrafts[day]) return;
        const res = await apiClient.getActivityTypeDailyLogs(selectedActivity.id, day, day);
        const entry = res.success ? (res.data?.[0] ?? null) : null;
        const prevTaskDesc = savedDayLogs.filter((x) => Number(x.day_number) < day).sort((a, b) => b.day_number - a.day_number)[0]?.task_description ?? '';
        const defaultTaskDesc = (prevTaskDesc || (selectedActivity.description ?? '')).toString().trim();
        setDayDrafts((prev) => ({
            ...prev,
            [day]: {
                day_title: (entry?.day_title ?? '').toString(),
                task_title: (entry?.task_title ?? '').toString(),
                script_title: (entry?.script_title ?? '').toString(),
                task_description: (entry?.task_description ?? defaultTaskDesc).toString(),
                script_idea: (entry?.script_idea ?? selectedActivity.script_idea ?? '').toString(),
                feedback: (entry?.feedback ?? '').toString(),
                audio_url: (entry?.audio_url ?? '').toString(),
                required_listen_percent: Number(entry?.required_listen_percent ?? 0),
                require_user_response: Boolean(entry?.require_user_response ?? false),
                notification_enabled: Boolean(entry?.notification_enabled ?? false),
                morning_reminder_enabled: Boolean(entry?.morning_reminder_enabled ?? true),
                evening_reminder_enabled: Boolean(entry?.evening_reminder_enabled ?? true),
                morning_reminder_time: formatTimeForInput(entry?.morning_reminder_time ?? '09:00'),
                evening_reminder_time: formatTimeForInput(entry?.evening_reminder_time ?? '18:00'),
                is_mcq: Boolean(entry?.is_mcq ?? false),
                mcq_question: (entry?.mcq_question ?? '').toString(),
                mcq_options: typeof entry?.mcq_options === 'string' ? JSON.parse(entry.mcq_options) : (entry?.mcq_options ?? []),
                mcq_correct_option: entry?.mcq_correct_option != null ? Number(entry.mcq_correct_option) : null,
            },
        }));
    }, [selectedActivity, dayDrafts, savedDayLogs]);

    const updateDayDraft = (day: number, patch: Partial<DailyLogDraft>) => {
        setDayDrafts((prev) => ({
            ...prev,
            [day]: {
                day_title: prev[day]?.day_title ?? '',
                task_title: prev[day]?.task_title ?? '',
                script_title: prev[day]?.script_title ?? '',
                task_description: prev[day]?.task_description ?? '',
                script_idea: prev[day]?.script_idea ?? '',
                feedback: prev[day]?.feedback ?? '',
                audio_url: prev[day]?.audio_url ?? '',
                required_listen_percent: prev[day]?.required_listen_percent ?? 0,
                require_user_response: prev[day]?.require_user_response ?? false,
                notification_enabled: prev[day]?.notification_enabled ?? false,
                morning_reminder_enabled: prev[day]?.morning_reminder_enabled ?? true,
                evening_reminder_enabled: prev[day]?.evening_reminder_enabled ?? true,
                morning_reminder_time: prev[day]?.morning_reminder_time ?? '09:00',
                evening_reminder_time: prev[day]?.evening_reminder_time ?? '18:00',
                is_mcq: prev[day]?.is_mcq ?? false,
                mcq_question: prev[day]?.mcq_question ?? '',
                mcq_options: prev[day]?.mcq_options ?? [],
                mcq_correct_option: prev[day]?.mcq_correct_option ?? null,
                ...patch,
            },
        }));
    };

    const saveDailyLogForDay = async (day: number) => {
        if (!selectedActivity) return;
        const draft = dayDraftsRef.current[day] ?? {
            day_title: '',
            task_title: '',
            script_title: '',
            task_description: '',
            script_idea: '',
            feedback: '',
            audio_url: '',
            required_listen_percent: 0,
            require_user_response: false,
            notification_enabled: false,
            morning_reminder_enabled: true,
            evening_reminder_enabled: true,
            morning_reminder_time: '09:00',
            evening_reminder_time: '18:00',
            is_mcq: false,
            mcq_question: '',
            mcq_options: [],
            mcq_correct_option: null,
        };
        setSavingDay(day);
        try {
            const res = await apiClient.upsertActivityTypeDailyLog(selectedActivity.id, day, {
                day_title: draft.day_title.trim(),
                task_title: draft.task_title.trim(),
                script_title: draft.script_title.trim(),
                task_description: draft.task_description.trim(),
                script_idea: draft.script_idea.trim(),
                feedback: draft.feedback.trim(),
                audio_url:
                    draft.audio_url.trim() === '' ? null : draft.audio_url.trim(),
                required_listen_percent: Math.max(0, Math.min(100, Number(draft.required_listen_percent || 0))),
                require_user_response: draft.require_user_response,
                notification_enabled: draft.notification_enabled,
                morning_reminder_enabled: draft.morning_reminder_enabled,
                evening_reminder_enabled: draft.evening_reminder_enabled,
                morning_reminder_time: draft.morning_reminder_time || '09:00',
                evening_reminder_time: draft.evening_reminder_time || '18:00',
                is_mcq: Boolean(draft.is_mcq),
                mcq_question: draft.mcq_question.trim() || null,
                mcq_options: draft.mcq_options,
                mcq_correct_option: draft.mcq_correct_option,
            });
            if (!res.success) {
                showSaveToast('Could not save this day. Try again or check the console.', 'error');
                return;
            }
            await refreshSavedDayLogs();
            showSaveToast(`Day ${day} saved`, 'success');
        } catch (e) {
            console.error('Save failed:', e);
            const msg = e instanceof Error ? e.message : 'Network or server error';
            showSaveToast(`Save failed: ${msg}`, 'error');
        } finally {
            setSavingDay(null);
        }
    };

    const exportTemplate = () => {
        if (!selectedActivity) return;
        
        // Headers mapping
        const headers = [
            'Day',
            'Day Title',
            'Task Title',
            'Task Description',
            'Question Title',
            'Question/Prompt',
            'Feedback',
            'Audio URL',
            'Required Listen %',
            'Require User Response (Yes/No)',
            'Morning Notify (Yes/No)',
            'Evening Notify (Yes/No)',
            'Morning Time (HH:MM)',
            'Evening Time (HH:MM)'
        ];

        let data = [];
        if (savedDayLogs.length > 0) {
            data = savedDayLogs.map(log => [
                log.day_number,
                log.day_title || `DAY ${log.day_number}`,
                log.task_title || 'TASK DESCRIPTION',
                log.task_description || '',
                log.script_title || 'QUESTION / PROMPT (OPTIONAL)',
                log.script_idea || '',
                log.feedback || '',
                log.audio_url || '',
                log.required_listen_percent || 0,
                log.require_user_response ? 'Yes' : 'No',
                log.morning_reminder_enabled ? 'Yes' : 'No',
                log.evening_reminder_enabled ? 'Yes' : 'No',
                log.morning_reminder_time || '09:00',
                log.evening_reminder_time || '18:00'
            ]);
        } else {
            // Add one empty row as example
            data = [[1, 'DAY 1', 'TASK DESCRIPTION', '', 'QUESTION / PROMPT (OPTIONAL)', '', '', '', 0, 'No', 'Yes', 'Yes', '09:00', '18:00']];
        }

        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Momentum Logs");
        XLSX.writeFile(wb, `${selectedActivity.name}_Template.xlsx`);
    };

    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedActivity) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
                
                if (rows.length < 2) {
                    alert('Excel sheet is empty or only contains headers.');
                    return;
                }

                const entries: any[] = [];
                // Skip header row
                for (let i = 1; i < rows.length; i++) {
                    const r = rows[i];
                    if (!r[0]) continue; // Skip rows without day number
                    
                    const dayNum = parseInt(r[0]);
                    if (isNaN(dayNum)) continue;

                    entries.push({
                        day_number: dayNum,
                        day_title: r[1] || `DAY ${dayNum}`,
                        task_title: r[2] || 'TASK DESCRIPTION',
                        task_description: r[3] || '',
                        script_title: r[4] || 'QUESTION / PROMPT (OPTIONAL)',
                        script_idea: r[5] || '',
                        feedback: r[6] || '',
                        audio_url: r[7] || '',
                        required_listen_percent: Math.max(0, Math.min(100, parseInt(r[8]) || 0)),
                        require_user_response: /^(yes|y|true|1)$/i.test((r[9] || '').toString()),
                        morning_reminder_enabled: /^(yes|y|true|1)$/i.test((r[10] || 'true').toString()),
                        evening_reminder_enabled: /^(yes|y|true|1)$/i.test((r[11] || 'true').toString()),
                        morning_reminder_time: r[12] || '09:00',
                        evening_reminder_time: r[13] || '18:00',
                        is_mcq: false,
                        notification_enabled: true
                    });
                }

                if (entries.length === 0) {
                    alert('No valid data found in Excel.');
                    return;
                }

                const res = await apiClient.bulkUpsertActivityTypeDailyLogs(selectedActivity.id, entries);
                if (res.success) {
                    await refreshSavedDayLogs();
                    setOpenBulkImport(false);
                    alert(`Successfully imported ${res.count} logs from Excel.`);
                }
            } catch (err) {
                console.error('Excel Import Error:', err);
                alert('Failed to parse Excel file. Please ensure it matches the template.');
            }
        };
        reader.readAsBinaryString(file);
        // Clear input so same file can be selected again
        if (bulkImportFileRef.current) bulkImportFileRef.current.value = '';
    };
    const importBulkDayLogs = async () => {
        if (!selectedActivity) return;
        if (!bulkDayLogText.trim()) return;

        const rows = bulkDayLogText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        const entries: Array<{
            day_number: number;
            day_title?: string;
            task_title?: string;
            script_title?: string;
            task_description?: string;
            script_idea?: string;
            feedback?: string;
            audio_url?: string;
            required_listen_percent?: number;
            require_user_response?: boolean;
            notification_enabled?: boolean;
            morning_reminder_enabled?: boolean;
            evening_reminder_enabled?: boolean;
            morning_reminder_time?: string;
            evening_reminder_time?: string;
            is_mcq?: boolean;
            mcq_question?: string | null;
            mcq_options?: string[] | null;
            mcq_correct_option?: number | null;
        }> = [];
        for (const row of rows) {
            const cols = row.split('\t').map((x) => x.trim());
            if (cols.length < 2) continue;

            const day = Number(cols[0]);
            if (!Number.isFinite(day) || day < 1) continue;

            // Supports:
            // 1) day \t script
            // 2) day \t task \t script
            // 3) day \t task \t script \t feedback
            if (cols.length === 2) {
                entries.push({
                    day_number: day,
                    day_title: `DAY ${day}`,
                    task_title: 'TASK DESCRIPTION',
                    script_title: 'QUESTION / PROMPT (OPTIONAL)',
                    task_description: (selectedActivity?.description || '').toString(),
                    script_idea: cols[1],
                    feedback: '',
                    audio_url: '',
                    required_listen_percent: 0,
                    require_user_response: false,
                    is_mcq: false,
                    notification_enabled: true,
                    morning_reminder_enabled: true,
                    evening_reminder_enabled: true,
                    morning_reminder_time: '09:00',
                    evening_reminder_time: '18:00',
                });
            } else {
                entries.push({
                    day_number: day,
                    day_title: cols[1] || `DAY ${day}`,
                    task_title: cols[2] || 'TASK DESCRIPTION',
                    script_title: cols[3] || 'QUESTION / PROMPT (OPTIONAL)',
                    task_description: cols[1] ?? (selectedActivity?.description || '').toString(),
                    script_idea: cols[2] || '',
                    feedback: cols[3] || '',
                    audio_url: cols[4] || '',
                    required_listen_percent: Math.max(0, Math.min(100, Number(cols[5] || 0))),
                    require_user_response: /^(1|true|yes|y)$/i.test((cols[6] || '').trim()),
                    is_mcq: false,
                    notification_enabled: true,
                    morning_reminder_enabled: /^(1|true|yes|y)$/i.test((cols[7] || 'true').trim()),
                    evening_reminder_enabled: /^(1|true|yes|y)$/i.test((cols[8] || 'true').trim()),
                    morning_reminder_time: formatTimeForInput(cols[9] || '09:00'),
                    evening_reminder_time: formatTimeForInput(cols[10] || '18:00'),
                });
            }
        }

        if (!entries.length) {
            alert('No valid rows found. Use tab-separated rows: day, task(optional), script, feedback(optional), audio_url(optional), listen%, has_resp, morning_en(true/false), evening_en(true/false), morning_time, evening_time.');
            return;
        }

        const res = await apiClient.bulkUpsertActivityTypeDailyLogs(selectedActivity.id, entries);
        if (!res.success) return;
        await refreshSavedDayLogs();
        setOpenBulkImport(false);
        alert(`Imported ${res.count} day logs for ${selectedActivity.name}`);
    };

    // Template loader removed (admin will enter content manually)

    const deleteActivity = async (item: ActivityType) => {
        setUiDialog({
            kind: 'confirm',
            title: 'Delete task',
            message: `Delete "${item.name}"?`,
            onConfirm: async () => {
                setUiDialog(null);
                const res = await apiClient.deleteActivityType(item.id);
                if (res.success) setActivityTypes((prev: any[]) => prev.filter((x) => x.id !== item.id));
            },
        });
    };

    const deleteGroup = async (section: SectionGroup) => {
        setUiDialog({
            kind: 'confirm',
            title: 'Delete day',
            message: `Delete "${section.title}" and all ${section.items.length} tasks?`,
            onConfirm: async () => {
                setUiDialog(null);
                for (const item of section.items) {
                    // eslint-disable-next-line no-await-in-loop
                    await apiClient.deleteActivityType(item.id);
                }
                setActivityTypes((prev: any[]) => prev.filter((x) => !(x.category === activeCategory && x.section_title === section.title)));
            },
        });
    };

    const addDay = async () => {
        setUiDialog({
            kind: 'prompt',
            title: 'Add day',
            label: 'Day title',
            value: '',
            placeholder: 'Day 1',
            onConfirm: async (value) => {
                const dayName = value.trim();
                setUiDialog(null);
                if (!dayName) return;
                const dayOrder = sections.length + 1;
                const res = await apiClient.createActivityType({
                    name: 'New Task',
                    description: '',
                    script_idea: '',
                    points: 5,
                    category: activeCategory,
                    section_title: dayName,
                    section_order: dayOrder,
                    item_order: 1,
                    icon: 'Activity',
                    is_global: true,
                    min_tier: 'Consultant',
                }, true);

                if (!res.success) return;
                setActivityTypes((prev: any[]) => [res.data, ...prev]);
                setActiveSection(dayName);
                setActiveActivityId(res.data.id);
            },
        });
    };

    const addTaskToDay = async (section: SectionGroup) => {
        setUiDialog({
            kind: 'prompt',
            title: 'Add task',
            label: `Task name for "${section.title}"`,
            value: 'New Task',
            placeholder: 'New Task',
            onConfirm: async (value) => {
                const taskName = value.trim();
                setUiDialog(null);
                if (!taskName) return;
                const res = await apiClient.createActivityType({
                    name: taskName,
                    description: '',
                    script_idea: '',
                    points: 5,
                    category: activeCategory,
                    section_title: section.title,
                    section_order: section.order,
                    item_order: section.items.length + 1,
                    icon: 'Activity',
                    is_global: true,
                    min_tier: 'Consultant',
                }, true);

                if (!res.success) return;
                setActivityTypes((prev: any[]) => [res.data, ...prev]);
                setActiveSection(section.title);
                setActiveActivityId(res.data.id);
            },
        });
    };

    const toggleSection = (title: string) => {
        setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
        setActiveSection(title);
    };

    const addNextDay = () => {
        const maxDay = savedDayLogs.reduce((acc, x) => Math.max(acc, Number(x.day_number || 0)), 0);
        const nextDay = Math.max(1, maxDay + 1);
        setNewDayNumber(nextDay);
        setIsAddingDay(true);
        if (!dayDrafts[nextDay]) {
            const prevTaskDesc = getPreviousDayTaskDescription(nextDay);
            setDayDrafts((prev) => ({
                ...prev,
                [nextDay]: {
                    day_title: '',
                    task_title: '',
                    script_title: '',
                    task_description: prevTaskDesc || (selectedActivity?.description ?? ''),
                    script_idea: selectedActivity?.script_idea ?? '',
                    feedback: '',
                    audio_url: '',
                    required_listen_percent: 0,
                    require_user_response: false,
                    notification_enabled: true,
                    morning_reminder_enabled: true,
                    evening_reminder_enabled: true,
                    morning_reminder_time: '09:00',
                    evening_reminder_time: '18:00',
                    is_mcq: false,
                    mcq_question: '',
                    mcq_options: [],
                    mcq_correct_option: null,
                },
            }));
        }
    };

    const saveNewDay = async () => {
        if (!selectedActivity) return;
        const day = Math.max(1, Number(newDayNumber || 1));
        await saveDailyLogForDay(day);
        setSelectedDayNumber(day);
        setExpandedSavedDay(day);
        setIsAddingDay(false);
    };

    const deleteDailyLogForDay = (day: number) => {
        if (!selectedActivity) return;
        setUiDialog({
            kind: 'confirm',
            title: `Delete Day ${day}`,
            message: `Delete saved content for Day ${day}? This cannot be undone.`,
            onConfirm: async () => {
                setUiDialog(null);
                setDeletingDay(day);
                try {
                    const res = await apiClient.deleteActivityTypeDailyLog(selectedActivity.id, day);
                    if (!res.success) {
                        showSaveToast(`Could not delete Day ${day}. ${res.message ? res.message : 'Try again.'}`, 'error');
                        return;
                    }
                    await refreshSavedDayLogs();
                    setDayDrafts((prev) => {
                        const next = { ...prev };
                        delete next[day];
                        return next;
                    });
                    setTaskDescExpandedByDay((prev) => {
                        const next = { ...prev };
                        delete next[day];
                        return next;
                    });
                    setScriptIdeaExpandedByDay((prev) => {
                        const next = { ...prev };
                        delete next[day];
                        return next;
                    });
                    setFeedbackExpandedByDay((prev) => {
                        const next = { ...prev };
                        delete next[day];
                        return next;
                    });
                    if (selectedDayNumber === day) setSelectedDayNumber(1);
                    if (expandedSavedDay === day) setExpandedSavedDay(null);
                    showSaveToast(`Day ${day} deleted`, 'success');
                } catch (e) {
                    console.error('Delete day failed:', e);
                    const msg = e instanceof Error ? e.message : 'Network or server error';
                    showSaveToast(`Delete failed: ${msg}`, 'error');
                } finally {
                    setDeletingDay(null);
                }
            },
        });
    };

    React.useEffect(() => {
        if (!currentSection) return;
        setSectionTitleDraft(currentSection.title);
        setIsEditingSectionTitle(false);
    }, [currentSection?.title]);

    const saveSectionTitle = async () => {
        if (!currentSection) return;
        const trimmed = sectionTitleDraft.trim();
        if (!trimmed || trimmed === currentSection.title) {
            setIsEditingSectionTitle(false);
            setSectionTitleDraft(currentSection.title);
            return;
        }

        setIsSavingSectionTitle(true);
        const res = await apiClient.updateActivityGroup({
            category: activeCategory,
            current_section_title: currentSection.title,
            section_title: trimmed,
            section_order: Number(currentSection.order ?? 1),
        });
        setIsSavingSectionTitle(false);

        if (!res.success) return;

        setActivityTypes((prev: any[]) =>
            prev.map((item) => {
                if (item.category === activeCategory && item.section_title === currentSection.title) {
                    return { ...item, section_title: trimmed };
                }
                return item;
            })
        );
        setActiveSection(trimmed);
        setIsEditingSectionTitle(false);
    };

    const saveSelectedActivityBasics = async () => {
        if (!selectedActivity) return;
        const activityId = selectedActivity.id;
        const trimmedName = activityDraftName.trim();
        if (!trimmedName) return;

        setIsSavingActivity(true);
        const res = await apiClient.updateActivityType(activityId, {
            name: trimmedName,
            description: activityDraftDescription,
            script_idea: activityDraftScriptIdea,
        });
        setIsSavingActivity(false);

        if (!res.success) return;

        setActivityTypes((prev: any[]) => prev.map((item) => (item.id === activityId ? res.data : item)));
        setIsEditingActivity(false);
    };

    return (
        <div className="view-container fade-in momentum-page">
            <input
                ref={singleAudioInputRef}
                type="file"
                accept="audio/*"
                style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
                onChange={onAudioFileSelected}
            />
            <div className="momentum-page-header">
                <div>
                    <h2 style={{ margin: 0, fontSize: 'clamp(1.15rem, 2.5vw, 1.5rem)' }}>Daily Task Library</h2>
                    <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: 'clamp(0.8rem, 1.8vw, 0.95rem)' }}>
                        Pick a task, then add day-wise popup content (what user sees before YES/NO).
                    </p>
                </div>
            </div>

            <div className="curriculum-layout momentum-curriculum-layout">
                <div className="curriculum-sidebar">
                    <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '15px' }}>
                        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                            {categories.filter(cat => cat.key === 'subconscious').map((cat) => (
                                <button
                                    key={cat.key}
                                    className={`filter-btn ${activeCategory === cat.key ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(cat.key)}
                                    style={{ flex: 1, padding: '6px 10px', fontSize: '0.72rem' }}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 15px 12px 15px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)' }}>MODULE</span>
                        <button onClick={addDay} className="add-lesson-mini-btn" title="Add Day">+</button>
                    </div>
                    <div className="sidebar-content">
                        {!sections.length ? (
                            <div style={{ color: 'var(--text-muted)' }}>
                                {categories.find((c) => c.key === activeCategory)?.empty}
                            </div>
                        ) : (
                            sections.map((section) => (
                                <div key={section.title} className={`module-item ${expandedSections[section.title] ? 'expanded' : 'collapsed'}`}>
                                    <div className="module-header" onClick={() => toggleSection(section.title)}>
                                        <h3>{section.title}</h3>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button
                                                className="add-lesson-mini-btn"
                                                title="Add task in this day"
                                                onClick={(e) => { e.stopPropagation(); addTaskToDay(section); }}
                                            >
                                                +
                                            </button>
                                            <button
                                                className="btn-sidebar-delete"
                                                title="Delete day"
                                                onClick={(e) => { e.stopPropagation(); deleteGroup(section); }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>

                                    <div className="sidebar-lessons">
                                        {section.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`lesson-item ${selectedActivity?.id === item.id ? 'active' : ''}`}
                                                onClick={() => {
                                                    setActiveSection(section.title);
                                                    setActiveActivityId(item.id);
                                                }}
                                            >
                                                <span>{item.name}</span>
                                                <button
                                                    className="btn-sidebar-delete"
                                                    title="Delete task"
                                                    onClick={(e) => { e.stopPropagation(); deleteActivity(item); }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="curriculum-main">
                    {!currentSection || !selectedActivity ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', color: 'var(--text-muted)' }}>
                            Select a day and task from left panel.
                        </div>
                    ) : (
                        <div className="lesson-editor">
                            <div className="lesson-content-viewport">
                                <div className="editor-card momentum-day-editor-card">
                                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <h3 style={{ margin: 0 }}>{openDayWiseEditor ? '▾' : '▸'} {currentSection.title}</h3>
                                            {!isEditingSectionTitle ? (
                                                <button
                                                    className="btn-premium-ghost"
                                                    style={{ padding: '6px 10px', fontSize: '0.72rem' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsEditingSectionTitle(true);
                                                    }}
                                                    title="Edit section title"
                                                >
                                                    ✎
                                                </button>
                                            ) : (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                                                >
                                                    <input
                                                        className="premium-input"
                                                        value={sectionTitleDraft}
                                                        onChange={(e) => setSectionTitleDraft(e.target.value)}
                                                        style={{ height: 34, padding: '0 10px', width: 280 }}
                                                    />
                                                    <button
                                                        className="btn-premium-primary"
                                                        style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                                                        onClick={saveSectionTitle}
                                                        disabled={isSavingSectionTitle}
                                                    >
                                                        {isSavingSectionTitle ? 'Saving...' : 'Save'}
                                                    </button>
                                                    <button
                                                        className="btn-premium-ghost"
                                                        style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                                                        onClick={() => {
                                                            setIsEditingSectionTitle(false);
                                                            setSectionTitleDraft(currentSection.title);
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                            {!isEditingActivity ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 800 }}>
                                                        {selectedActivity.name}
                                                    </span>
                                                    <button
                                                        className="btn-premium-ghost"
                                                        style={{ padding: '6px 10px', fontSize: '0.72rem' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsEditingActivity(true);
                                                            setActivityDraftName(selectedActivity.name ?? '');
                                                            setActivityDraftDescription(selectedActivity.description ?? '');
                                                            setActivityDraftScriptIdea(selectedActivity.script_idea ?? '');
                                                        }}
                                                        title="Edit visualization/activity"
                                                    >
                                                        ✎ Edit
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gap: 8, minWidth: 360 }}>
                                                    <input
                                                        className="premium-input"
                                                        value={activityDraftName}
                                                        onChange={(e) => setActivityDraftName(e.target.value)}
                                                        style={{ height: 34, padding: '0 10px' }}
                                                    />
                                                    <textarea
                                                        className="premium-input"
                                                        rows={2}
                                                        value={(activityDraftDescription ?? '').toString()}
                                                        onChange={(e) => setActivityDraftDescription(e.target.value)}
                                                        placeholder="Description"
                                                        style={{ resize: 'vertical' }}
                                                    />
                                                    <textarea
                                                        className="premium-input"
                                                        rows={2}
                                                        value={(activityDraftScriptIdea ?? '').toString()}
                                                        onChange={(e) => setActivityDraftScriptIdea(e.target.value)}
                                                        placeholder="Script idea"
                                                        style={{ resize: 'vertical' }}
                                                    />
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button
                                                            className="btn-premium-primary"
                                                            style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                saveSelectedActivityBasics();
                                                            }}
                                                            disabled={isSavingActivity}
                                                        >
                                                            {isSavingActivity ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button
                                                            className="btn-premium-ghost"
                                                            style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsEditingActivity(false);
                                                                setActivityDraftName(selectedActivity.name ?? '');
                                                                setActivityDraftDescription(selectedActivity.description ?? '');
                                                                setActivityDraftScriptIdea(selectedActivity.script_idea ?? '');
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div />
                                    </div>
                                    {openDayWiseEditor && (
                                        <div className="card-body">
                                        <div style={{ display: 'grid', gap: 14 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                                        (what user sees in popup before YES/NO)
                                                    </span>
                                                </div>
                                                 <div style={{ display: 'flex', gap: 10 }}>
                                                     <button
                                                         className="btn-premium-primary"
                                                         onClick={() => {
                                                             setOpenBulkImport(false);
                                                             addNextDay();
                                                         }}
                                                         style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: '0.85rem' }}
                                                     >
                                                         <span style={{ fontSize: '1.1rem' }}>+</span> 
                                                         <span>Add Individual Day</span>
                                                     </button>
                                                     <button
                                                         className="btn-premium-ghost"
                                                         onClick={() => {
                                                             setIsAddingDay(false);
                                                             setOpenBulkImport(true);
                                                         }}
                                                         style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.03)' }}
                                                     >
                                                         <span>📋</span>
                                                         <span>Bulk Add</span>
                                                     </button>
                                                 </div>
                                            </div>

                                            {(isAddingDay || openBulkImport) && (
                                                <div
                                                    style={{
                                                        border: '1px solid rgba(102,126,234,0.35)',
                                                        background: 'rgba(102,126,234,0.06)',
                                                        borderRadius: 12,
                                                        padding: 12,
                                                        display: 'grid',
                                                        gap: 12,
                                                    }}
                                                >
                                                    {!openBulkImport ? (
                                                        <>
                                                            <div
                                                                style={{
                                                                    position: 'sticky',
                                                                    top: 0,
                                                                    zIndex: 10,
                                                                    margin: '-12px -12px 16px -12px',
                                                                    padding: '16px 20px',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    gap: 16,
                                                                    flexWrap: 'wrap',
                                                                    background: 'rgba(15, 23, 42, 0.85)',
                                                                    backdropFilter: 'blur(12px)',
                                                                    WebkitBackdropFilter: 'blur(12px)',
                                                                    borderBottom: '1px solid rgba(102, 126, 234, 0.25)',
                                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                                                    borderTopLeftRadius: 12,
                                                                    borderTopRightRadius: 12,
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: '300px' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                        <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                                                            Day Number
                                                                        </label>
                                                                        <input
                                                                            className="premium-input text-center"
                                                                            type="number"
                                                                            value={newDayNumber}
                                                                            onChange={(e) => setNewDayNumber(Math.max(1, Number(e.target.value || 1)))}
                                                                            style={{ width: 80, height: 40, fontSize: '1.1rem', fontWeight: 800, background: 'rgba(255,255,255,0.05)' }}
                                                                        />
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                                                                        <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                                                            Custom Day Title
                                                                        </label>
                                                                        <input
                                                                            className="premium-input"
                                                                            value={dayDrafts[newDayNumber]?.day_title ?? ''}
                                                                            onChange={(e) => updateDayDraft(newDayNumber, { day_title: e.target.value })}
                                                                            placeholder="e.g. Identity Re-Awakening"
                                                                            style={{ height: 40, fontWeight: 700, fontSize: '14px', background: 'rgba(255,255,255,0.05)' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-premium-ghost"
                                                                        onClick={() => setIsAddingDay(false)}
                                                                        disabled={savingDay === newDayNumber}
                                                                        style={{ padding: '0 20px', height: 40, fontSize: '0.85rem' }}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-premium-primary"
                                                                        onClick={saveNewDay}
                                                                        disabled={savingDay === newDayNumber}
                                                                        style={{
                                                                            padding: '0 28px',
                                                                            height: 40,
                                                                            fontSize: '0.85rem',
                                                                            fontWeight: 700,
                                                                            boxShadow: '0 0 20px var(--primary-shadow)',
                                                                        }}
                                                                    >
                                                                        {savingDay === newDayNumber ? 'Saving…' : 'Save Day'}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                                                <div>
                                                                    <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <span>📝</span> TASK DESCRIPTION
                                                                    </label>
                                                                    <textarea
                                                                        className="premium-input"
                                                                        rows={5}
                                                                        value={(dayDrafts[newDayNumber]?.task_description ?? '').toString()}
                                                                        onChange={(e) => updateDayDraft(newDayNumber, { task_description: e.target.value })}
                                                                        placeholder="Describe the main task for this day..."
                                                                        style={{ resize: 'vertical', fontSize: '14px', lineHeight: '1.5' }}
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <span>💡</span> QUESTION / PROMPT (OPTIONAL)
                                                                    </label>
                                                                    <textarea
                                                                        className="premium-input"
                                                                        rows={5}
                                                                        value={(dayDrafts[newDayNumber]?.script_idea ?? '').toString()}
                                                                        onChange={(e) => updateDayDraft(newDayNumber, { script_idea: e.target.value })}
                                                                        placeholder="Optional question or video script idea..."
                                                                        style={{ resize: 'vertical', fontSize: '14px', lineHeight: '1.5' }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* MCQ Section Start */}
                                                            <div 
                                                                style={{ 
                                                                    background: dayDrafts[newDayNumber]?.is_mcq ? 'rgba(102,126,234,0.08)' : 'rgba(255,255,255,0.02)', 
                                                                    borderRadius: 16, 
                                                                    padding: 16, 
                                                                    border: dayDrafts[newDayNumber]?.is_mcq ? '1px solid rgba(102,126,234,0.3)' : '1px solid rgba(255,255,255,0.08)',
                                                                    transition: 'all 0.3s ease'
                                                                }}
                                                            >
                                                                <div 
                                                                    style={{ 
                                                                        display: 'flex', 
                                                                        alignItems: 'center', 
                                                                        justifyContent: 'space-between',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    onClick={() => updateDayDraft(newDayNumber, { is_mcq: !dayDrafts[newDayNumber]?.is_mcq })}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                        <div style={{ 
                                                                            width: 32, 
                                                                            height: 32, 
                                                                            borderRadius: 8, 
                                                                            background: dayDrafts[newDayNumber]?.is_mcq ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontSize: '14px'
                                                                        }}>
                                                                            🙋‍♂️
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>Enable MCQ for this day</div>
                                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Include a multiple-choice question to test user knowledge</div>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{
                                                                        width: 44,
                                                                        height: 24,
                                                                        borderRadius: 12,
                                                                        background: dayDrafts[newDayNumber]?.is_mcq ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                                                        position: 'relative',
                                                                        transition: 'background 0.2s ease'
                                                                    }}>
                                                                        <div style={{
                                                                            position: 'absolute',
                                                                            top: 3,
                                                                            left: dayDrafts[newDayNumber]?.is_mcq ? 23 : 3,
                                                                            width: 18,
                                                                            height: 18,
                                                                            borderRadius: '50%',
                                                                            background: '#fff',
                                                                            transition: 'left 0.2s ease',
                                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                                        }} />
                                                                    </div>
                                                                </div>

                                                                {dayDrafts[newDayNumber]?.is_mcq && (
                                                                    <div style={{ display: 'grid', gap: 14, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(102,126,234,0.15)' }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                            <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>QUESTION</label>
                                                                            <textarea
                                                                                className="premium-input"
                                                                                rows={2}
                                                                                placeholder="Enter the MCQ question..."
                                                                                value={dayDrafts[newDayNumber]?.mcq_question || ''}
                                                                                onChange={(e) => updateDayDraft(newDayNumber, { mcq_question: e.target.value })}
                                                                                style={{ fontSize: '14px' }}
                                                                            />
                                                                        </div>
                                                                        <div style={{ display: 'grid', gap: 8 }}>
                                                                            <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>OPTIONS (SELECT CIRCLE FOR CORRECT ANSWER)</label>
                                                                            {(dayDrafts[newDayNumber]?.mcq_options || []).map((opt, idx) => (
                                                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                                    <input
                                                                                        type="radio"
                                                                                        name={`mcq_correct_new`}
                                                                                        checked={dayDrafts[newDayNumber]?.mcq_correct_option === idx}
                                                                                        onChange={() => updateDayDraft(newDayNumber, { mcq_correct_option: idx })}
                                                                                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }}
                                                                                    />
                                                                                    <input
                                                                                        className="premium-input"
                                                                                        style={{ flex: 1, height: 38, fontSize: '14px', background: 'rgba(255,255,255,0.03)' }}
                                                                                        value={opt}
                                                                                        onChange={(e) => {
                                                                                            const next = [...(dayDrafts[newDayNumber]?.mcq_options || [])];
                                                                                            next[idx] = e.target.value;
                                                                                            updateDayDraft(newDayNumber, { mcq_options: next });
                                                                                        }}
                                                                                        placeholder={`Option ${idx + 1}`}
                                                                                    />
                                                                                    <button
                                                                                        className="btn-sidebar-delete"
                                                                                        onClick={() => {
                                                                                            const next = (dayDrafts[newDayNumber]?.mcq_options || []).filter((_, i) => i !== idx);
                                                                                            let nextCorrect = dayDrafts[newDayNumber]?.mcq_correct_option;
                                                                                            if (nextCorrect === idx) nextCorrect = null;
                                                                                            else if (nextCorrect != null && nextCorrect > idx) nextCorrect--;
                                                                                            updateDayDraft(newDayNumber, { mcq_options: next, mcq_correct_option: nextCorrect });
                                                                                        }}
                                                                                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                                    >
                                                                                        ×
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                            <button
                                                                                className="btn-premium-ghost"
                                                                                style={{ padding: '8px 16px', fontSize: '12px', alignSelf: 'flex-start', marginTop: 4, background: 'rgba(255,255,255,0.05)' }}
                                                                                onClick={() => {
                                                                                    const next = [...(dayDrafts[newDayNumber]?.mcq_options || []), ''];
                                                                                    updateDayDraft(newDayNumber, { mcq_options: next });
                                                                                }}
                                                                            >
                                                                                + Add Option
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* MCQ Section End */}
                                                            {/* MCQ Section End */}

                                                            <div
                                                                style={{
                                                                    background: 'rgba(30, 41, 59, 0.4)',
                                                                    border: '1px solid rgba(148,163,184,0.15)',
                                                                    borderRadius: 16,
                                                                    padding: '20px',
                                                                }}
                                                            >
                                                                <div style={{ marginBottom: 20 }}>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, marginBottom: 10 }}>
                                                                        <div>
                                                                            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                                                                                <span>📤</span> AUDIO ASSET (OPTIONAL)
                                                                            </label>
                                                                            <div style={{ display: 'flex', gap: 8 }}>
                                                                                <input
                                                                                    className="premium-input"
                                                                                    type="url"
                                                                                    value={(dayDrafts[newDayNumber]?.audio_url ?? '').toString()}
                                                                                    onChange={(e) => updateDayDraft(newDayNumber, { audio_url: e.target.value })}
                                                                                    placeholder="Paste URL or upload file..."
                                                                                    style={{ flex: 1, height: 42, fontSize: '13px' }}
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    className="btn-premium-primary"
                                                                                    disabled={audioUploadingDay === newDayNumber}
                                                                                    style={{
                                                                                        height: 42,
                                                                                        padding: '0 16px',
                                                                                        display: 'flex', 
                                                                                        alignItems: 'center', 
                                                                                        gap: 6,
                                                                                        fontSize: '13px'
                                                                                    }}
                                                                                    onClick={() => triggerAudioUpload(newDayNumber)}
                                                                                >
                                                                                    {audioUploadingDay === newDayNumber ? '💿' : '📤'}
                                                                                    <span>{audioUploadingDay === newDayNumber ? 'UPLOADING…' : 'UPLOAD'}</span>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                                            {(dayDrafts[newDayNumber]?.audio_url ?? '').trim() !== '' && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="btn-premium-ghost"
                                                                                    disabled={audioUploadingDay === newDayNumber}
                                                                                    title="Remove audio"
                                                                                    style={{
                                                                                        height: 42,
                                                                                        padding: '0 12px',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: 800,
                                                                                        color: 'var(--error)',
                                                                                        borderColor: 'rgba(238, 93, 80, 0.2)'
                                                                                    }}
                                                                                    onClick={() => updateDayDraft(newDayNumber, { audio_url: '' })}
                                                                                >
                                                                                    REMOVE
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {(dayDrafts[newDayNumber]?.audio_url ?? '').trim() !== '' && (
                                                                        <div style={{ 
                                                                            display: 'grid', 
                                                                            gridTemplateColumns: 'minmax(200px, 1fr) 300px', 
                                                                            gap: 16, 
                                                                            background: 'rgba(0,0,0,0.25)', 
                                                                            padding: '12px', 
                                                                            borderRadius: 10, 
                                                                            border: '1px solid rgba(255,255,255,0.06)',
                                                                            alignItems: 'center'
                                                                        }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                                <label style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                                                                                    REQUIRED LISTEN: <span style={{ color: 'var(--accent)' }}>{Number(dayDrafts[newDayNumber]?.required_listen_percent ?? 0)}%</span>
                                                                                </label>
                                                                                <input
                                                                                    type="range"
                                                                                    min={0}
                                                                                    max={100}
                                                                                    step={1}
                                                                                    value={Number(dayDrafts[newDayNumber]?.required_listen_percent ?? 0)}
                                                                                    onChange={(e) => {
                                                                                        const next = Math.max(0, Math.min(100, Number(e.target.value || 0)));
                                                                                        updateDayDraft(newDayNumber, { required_listen_percent: next });
                                                                                    }}
                                                                                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer', height: 12 }}
                                                                                />
                                                                            </div>
                                                                            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 16 }}>
                                                                                <PremiumAudioPlayer src={resolveAudioPlaybackUrl(dayDrafts[newDayNumber]?.audio_url ?? '')} />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                                                    <div
                                                                        onClick={() => updateDayDraft(newDayNumber, { require_user_response: !dayDrafts[newDayNumber]?.require_user_response })}
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'space-between',
                                                                            gap: 12,
                                                                            background: dayDrafts[newDayNumber]?.require_user_response ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                                                                            border: dayDrafts[newDayNumber]?.require_user_response ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--glass-border)',
                                                                            borderRadius: 12,
                                                                            padding: '12px 16px',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s ease'
                                                                        }}
                                                                    >
                                                                        <div>
                                                                            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>Require user response</div>
                                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>User must type response</div>
                                                                        </div>
                                                                        <div style={{
                                                                            width: 36,
                                                                            height: 20,
                                                                            borderRadius: 10,
                                                                            background: dayDrafts[newDayNumber]?.require_user_response ? '#10b981' : 'rgba(255,255,255,0.1)',
                                                                            position: 'relative',
                                                                            transition: 'background 0.2s ease'
                                                                        }}>
                                                                            <div style={{
                                                                                position: 'absolute',
                                                                                top: 2,
                                                                                left: dayDrafts[newDayNumber]?.require_user_response ? 18 : 2,
                                                                                width: 16,
                                                                                height: 16,
                                                                                borderRadius: '50%',
                                                                                background: '#fff',
                                                                                transition: 'left 0.2s ease'
                                                                            }} />
                                                                        </div>
                                                                    </div>

                                                                    <div
                                                                        onClick={() => updateDayDraft(newDayNumber, { notification_enabled: !dayDrafts[newDayNumber]?.notification_enabled })}
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'space-between',
                                                                            gap: 12,
                                                                            background: dayDrafts[newDayNumber]?.notification_enabled ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.02)',
                                                                            border: dayDrafts[newDayNumber]?.notification_enabled ? '1px solid rgba(139,92,246,0.3)' : '1px solid var(--glass-border)',
                                                                            borderRadius: 12,
                                                                            padding: '12px 16px',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s ease',
                                                                            opacity: dayDrafts[newDayNumber]?.notification_enabled ? 1 : 0.8
                                                                        }}
                                                                    >
                                                                        <div>
                                                                            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>Daily Notifications</div>
                                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Remind user daily</div>
                                                                        </div>
                                                                        <div style={{
                                                                            width: 36,
                                                                            height: 20,
                                                                            borderRadius: 10,
                                                                            background: dayDrafts[newDayNumber]?.notification_enabled ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                                                                            position: 'relative',
                                                                            transition: 'background 0.2s ease'
                                                                        }}>
                                                                            <div style={{
                                                                                position: 'absolute',
                                                                                top: 2,
                                                                                left: dayDrafts[newDayNumber]?.notification_enabled ? 18 : 2,
                                                                                width: 16,
                                                                                height: 16,
                                                                                borderRadius: '50%',
                                                                                background: '#fff',
                                                                                transition: 'left 0.2s ease'
                                                                            }} />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {dayDrafts[newDayNumber]?.notification_enabled && (
                                                                    <div style={{ 
                                                                        marginTop: 0, 
                                                                        display: 'grid', 
                                                                        gridTemplateColumns: '1fr 1fr', 
                                                                        gap: 16, 
                                                                        background: 'rgba(255,255,255,0.03)', 
                                                                        padding: '14px', 
                                                                        borderRadius: 12, 
                                                                        border: '1px solid rgba(255,255,255,0.05)',
                                                                        animation: 'fadeIn 0.3s ease'
                                                                    }}>
                                                                        <div>
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.05em' }}>
                                                                                    <span>🌅</span> MORNING
                                                                                </label>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => updateDayDraft(newDayNumber, { morning_reminder_enabled: !dayDrafts[newDayNumber]?.morning_reminder_enabled })}
                                                                                    className={`btn-toggle-mini ${dayDrafts[newDayNumber]?.morning_reminder_enabled ? 'active' : ''}`}
                                                                                    style={{ padding: '2px 8px', fontSize: '9px' }}
                                                                                >
                                                                                    {dayDrafts[newDayNumber]?.morning_reminder_enabled ? 'ON' : 'OFF'}
                                                                                </button>
                                                                            </div>
                                                                            <input
                                                                                type="time"
                                                                                className="premium-input clock-input"
                                                                                style={{ width: '100%', height: 42, fontSize: '16px', fontWeight: 700, textAlign: 'center', color: '#fff', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                                                                                value={dayDrafts[newDayNumber]?.morning_reminder_time || '09:00'}
                                                                                disabled={!dayDrafts[newDayNumber]?.morning_reminder_enabled}
                                                                                onChange={(e) => updateDayDraft(newDayNumber, { morning_reminder_time: e.target.value })}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.05em' }}>
                                                                                    <span>🌆</span> EVENING
                                                                                </label>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => updateDayDraft(newDayNumber, { evening_reminder_enabled: !dayDrafts[newDayNumber]?.evening_reminder_enabled })}
                                                                                    className={`btn-toggle-mini ${dayDrafts[newDayNumber]?.evening_reminder_enabled ? 'active' : ''}`}
                                                                                    style={{ padding: '2px 8px', fontSize: '9px' }}
                                                                                >
                                                                                    {dayDrafts[newDayNumber]?.evening_reminder_enabled ? 'ON' : 'OFF'}
                                                                                </button>
                                                                            </div>
                                                                            <input
                                                                                type="time"
                                                                                className="premium-input clock-input"
                                                                                style={{ width: '100%', height: 42, fontSize: '16px', fontWeight: 700, textAlign: 'center', color: '#fff', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                                                                                value={dayDrafts[newDayNumber]?.evening_reminder_time || '18:00'}
                                                                                disabled={!dayDrafts[newDayNumber]?.evening_reminder_enabled}
                                                                                onChange={(e) => updateDayDraft(newDayNumber, { evening_reminder_time: e.target.value })}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div style={{ marginTop: 10 }}>
                                                                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <span>📢</span> FEEDBACK (OPTIONAL)
                                                                </label>
                                                                <textarea
                                                                    className="premium-input"
                                                                    rows={3}
                                                                    value={(dayDrafts[newDayNumber]?.feedback ?? '').toString()}
                                                                    onChange={(e) => updateDayDraft(newDayNumber, { feedback: e.target.value })}
                                                                    placeholder="Optional note or extra instructions for the user..."
                                                                    style={{ resize: 'vertical', fontSize: '14px' }}
                                                                />
                                                            </div>
                                                            <div style={{ height: 20 }}></div>
                                                            <div style={{ height: 16 }}></div>

                                                            <div
                                                                style={{
                                                                    marginTop: 4,
                                                                    paddingTop: 16,
                                                                    borderTop: '1px solid rgba(102,126,234,0.35)',
                                                                    display: 'flex',
                                                                    justifyContent: 'flex-end',
                                                                    alignItems: 'center',
                                                                    gap: 10,
                                                                    flexWrap: 'wrap',
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className="btn-premium-primary"
                                                                    onClick={saveNewDay}
                                                                    disabled={savingDay === newDayNumber}
                                                                    style={{
                                                                        padding: '12px 28px',
                                                                        fontSize: '0.85rem',
                                                                        minWidth: 160,
                                                                        boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 10px 28px var(--primary-shadow)',
                                                                    }}
                                                                >
                                                                    {savingDay === newDayNumber ? 'Saving…' : 'Save day'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn-premium-ghost"
                                                                    onClick={() => setIsAddingDay(false)}
                                                                    disabled={savingDay === newDayNumber}
                                                                    style={{ padding: '12px 20px', fontSize: '0.82rem' }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                    <div style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1px', color: 'var(--text-muted)' }}>
                                                                        BULK OPERATIONS
                                                                    </div>
                                                                    <div style={{ width: 1, height: 16, background: 'var(--glass-border)' }} />
                                                                    <button
                                                                        className="btn-premium-primary"
                                                                        style={{ padding: '8px 16px', fontSize: '0.75rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                                                                        onClick={() => bulkImportFileRef.current?.click()}
                                                                    >
                                                                        <span>📥</span> IMPORT EXCEL
                                                                    </button>
                                                                    <button
                                                                        className="btn-premium-ghost"
                                                                        style={{ padding: '8px 16px', fontSize: '0.75rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                                                                        onClick={exportTemplate}
                                                                    >
                                                                        <span>📤</span> EXPORT TEMPLATE
                                                                    </button>
                                                                    <input
                                                                        type="file"
                                                                        ref={bulkImportFileRef}
                                                                        style={{ display: 'none' }}
                                                                        accept=".xlsx, .xls, .csv"
                                                                        onChange={handleExcelImport}
                                                                    />
                                                                </div>
                                                                <button
                                                                    className="btn-premium-ghost"
                                                                    style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                                                                    onClick={() => setOpenBulkImport(false)}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>

                                                            <div style={{ 
                                                                marginTop: 15, 
                                                                padding: '16px', 
                                                                background: 'rgba(0,0,0,0.2)', 
                                                                borderRadius: 14, 
                                                                border: '1px solid var(--glass-border)',
                                                                animation: 'fadeIn 0.4s ease'
                                                            }}>
                                                                <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.5px' }}>
                                                                    OR PASTE TAB-SEPARATED TEXT (LEGACY METHOD)
                                                                </div>
                                                                <textarea
                                                                    className="premium-input"
                                                                    rows={4}
                                                                    value={bulkDayLogText}
                                                                    onChange={(e) => setBulkDayLogText(e.target.value)}
                                                                    placeholder={"Example: 1\tDay Title\tTask Desc\tScript Idea\t..."}
                                                                    style={{ resize: 'vertical', fontSize: '13px' }}
                                                                />
                                                                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                                                                    <button
                                                                        className="btn-premium-primary"
                                                                        onClick={importBulkDayLogs}
                                                                        style={{ padding: '8px 20px', fontSize: '0.78rem' }}
                                                                    >
                                                                        Import Pasted Text
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 14 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block' }}>
                                                        DAYS
                                                    </label>
                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                        <select
                                                            className="premium-input"
                                                            value={dayFilterMode}
                                                            onChange={(e) => {
                                                                const next = (e.target.value as any) as 'all' | 'week' | 'month';
                                                                setDayFilterMode(next);
                                                                setDayFilterIndex(1);
                                                            }}
                                                            style={{ height: 32, padding: '0 10px', width: 120 }}
                                                        >
                                                            <option value="all">All</option>
                                                            <option value="week">Week</option>
                                                            <option value="month">Month</option>
                                                        </select>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                                            {savedDayLogs.length} day(s)
                                                        </span>
                                                    </div>
                                                </div>

                                                {isLoadingSavedDayLogs ? (
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Loading saved logs...</div>
                                                ) : savedDayLogs.length === 0 ? (
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                                        No saved days yet. Click “+ Add Day” to create one, or “Bulk Add” to import many days.
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'grid', gap: 12 }}>
                                                        {(() => {
                                                            const maxDay = savedDayLogs.reduce((acc, x) => Math.max(acc, Number(x.day_number || 0)), 0);
                                                            const periodSize = dayFilterMode === 'week' ? 7 : dayFilterMode === 'month' ? 30 : 0;
                                                            const periodCount = periodSize ? Math.max(1, Math.ceil(maxDay / periodSize)) : 1;
                                                            const safeIndex = Math.min(Math.max(1, dayFilterIndex), periodCount);
                                                            if (safeIndex !== dayFilterIndex) setDayFilterIndex(safeIndex);

                                                            const baseFiltered =
                                                                dayFilterMode === 'all'
                                                                    ? savedDayLogs
                                                                    : savedDayLogs.filter((x) => {
                                                                          const day = Number(x.day_number || 0);
                                                                          const start = (safeIndex - 1) * periodSize + 1;
                                                                          const end = safeIndex * periodSize;
                                                                          return day >= start && day <= end;
                                                                      });

                                                            const filtered = !normalizedSearch
                                                                ? baseFiltered
                                                                : baseFiltered.filter((x) => {
                                                                      const haystack = `${x.day_number ?? ''} ${x.task_description ?? ''} ${x.script_idea ?? ''} ${x.feedback ?? ''}`.toLowerCase();
                                                                      return haystack.includes(normalizedSearch);
                                                                  });

                                                            return (
                                                                <>
                                                                    {dayFilterMode !== 'all' && (
                                                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                                            <button
                                                                                className="btn-premium-ghost"
                                                                                disabled={safeIndex <= 1}
                                                                                onClick={() => setDayFilterIndex((i) => Math.max(1, i - 1))}
                                                                            >
                                                                                Prev
                                                                            </button>
                                                                            <div style={{ color: 'var(--text-muted)', fontSize: '12px', paddingTop: 6 }}>
                                                                                {dayFilterMode === 'week' ? 'Week' : 'Month'} {safeIndex}/{periodCount}
                                                                            </div>
                                                                            <button
                                                                                className="btn-premium-ghost"
                                                                                disabled={safeIndex >= periodCount}
                                                                                onClick={() => setDayFilterIndex((i) => Math.min(periodCount, i + 1))}
                                                                            >
                                                                                Next
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {filtered.map((entry) => (
                                                            <div
                                                                key={entry.day_number}
                                                                style={{
                                                                    background: selectedDayNumber === entry.day_number
                                                                        ? 'linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(15,23,42,0.6) 100%)'
                                                                        : 'rgba(255,255,255,0.03)',
                                                                    border: selectedDayNumber === entry.day_number
                                                                        ? '1.5px solid rgba(102,126,234,0.55)'
                                                                        : '1px solid rgba(148,163,184,0.1)',
                                                                    borderRadius: 18,
                                                                    textAlign: 'left',
                                                                    overflow: 'hidden',
                                                                    color: 'var(--text-main)',
                                                                    marginBottom: 16,
                                                                    boxShadow: selectedDayNumber === entry.day_number
                                                                        ? '0 8px 32px -8px rgba(102,126,234,0.35)'
                                                                        : '0 2px 12px -4px rgba(0,0,0,0.3)',
                                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                }}
                                                            >
                                                                {/* ━━━━━━━━ Card Header ━━━━━━━━ */}
                                                                <button
                                                                    onClick={async () => {
                                                                        setSelectedDayNumber(entry.day_number);
                                                                        setExpandedSavedDay((prev) => (prev === entry.day_number ? null : entry.day_number));
                                                                        await ensureDayDraftLoaded(entry.day_number);
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        background: 'transparent',
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        padding: '20px 24px 18px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 14,
                                                                        textAlign: 'left',
                                                                    }}
                                                                    title="Expand / collapse"
                                                                >
                                                                    {/* Day Number Badge */}
                                                                    <div style={{
                                                                        width: 46,
                                                                        height: 46,
                                                                        borderRadius: 13,
                                                                        flexShrink: 0,
                                                                        background: selectedDayNumber === entry.day_number
                                                                            ? 'linear-gradient(135deg, #667eea, #764ba2)'
                                                                            : 'rgba(255,255,255,0.06)',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        transition: 'all 0.3s ease',
                                                                        boxShadow: selectedDayNumber === entry.day_number ? '0 4px 14px rgba(102,126,234,0.5)' : 'none',
                                                                    }}>
                                                                        <span style={{ fontSize: '9px', fontWeight: 900, color: selectedDayNumber === entry.day_number ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', letterSpacing: '0.06em' }}>DAY</span>
                                                                        <span style={{ fontSize: '17px', fontWeight: 900, color: selectedDayNumber === entry.day_number ? '#fff' : 'var(--text-main)', lineHeight: 1 }}>{entry.day_number}</span>
                                                                    </div>

                                                                    {/* Title + meta */}
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                                                            <span style={{
                                                                                fontSize: '15px',
                                                                                fontWeight: 900,
                                                                                color: 'var(--text-main)',
                                                                                whiteSpace: 'nowrap',
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis',
                                                                                maxWidth: '420px',
                                                                            }}>
                                                                                {(dayDrafts[entry.day_number]?.day_title ?? entry.day_title ?? '').trim() || <span style={{color:'var(--text-muted)'}}>Untitled Day</span>}
                                                                            </span>
                                                                            <span style={{
                                                                                fontSize: '10px',
                                                                                fontWeight: 800,
                                                                                padding: '2px 8px',
                                                                                borderRadius: 99,
                                                                                background: ((entry.task_description || '').trim() || (entry.script_idea || '').trim())
                                                                                    ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                                                                                color: ((entry.task_description || '').trim() || (entry.script_idea || '').trim())
                                                                                    ? '#10b981' : 'var(--text-muted)',
                                                                                border: ((entry.task_description || '').trim() || (entry.script_idea || '').trim())
                                                                                    ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.08)',
                                                                                letterSpacing: '0.05em',
                                                                            }}>
                                                                                {((entry.task_description || '').trim() || (entry.script_idea || '').trim()) ? '✓ Saved' : 'Empty'}
                                                                            </span>
                                                                        </div>
                                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                            {(entry.task_description || '').trim() ? (
                                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
                                                                                    📝 {(entry.task_description || '').trim().slice(0, 80)}{(entry.task_description || '').length > 80 ? '…' : ''}
                                                                                </span>
                                                                            ) : (
                                                                                <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No task content yet</span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Expand chevron */}
                                                                    <div style={{
                                                                        width: 32,
                                                                        height: 32,
                                                                        borderRadius: 10,
                                                                        background: 'rgba(255,255,255,0.04)',
                                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        flexShrink: 0,
                                                                        fontSize: '13px',
                                                                        color: 'var(--text-muted)',
                                                                        transition: 'transform 0.25s ease',
                                                                        transform: expandedSavedDay === entry.day_number ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                    }}>
                                                                        ▾
                                                                    </div>
                                                                </button>

                                                                {expandedSavedDay === entry.day_number && (
                                                                    <div style={{ borderTop: '1px solid rgba(148,163,184,0.1)', padding: '20px 24px', display: 'grid', gap: 18 }}>
                                                                        <div>
                                                                            <button
                                                                                type="button"
                                                                                className="momentum-collapsible-trigger"
                                                                                onClick={() => toggleTaskDescExpanded(entry.day_number)}
                                                                                style={momentumCollapsibleHeaderStyle}
                                                                            >
                                                                                <span style={{ color: 'var(--text-main)' }}>
                                                                                    {taskDescExpandedByDay[entry.day_number] === true ? '▾' : '▸'}
                                                                                </span>
                                                                                <input
                                                                                    className="premium-input-minimal"
                                                                                    value={dayDrafts[entry.day_number]?.task_title || entry.task_title || 'TASK DESCRIPTION'}
                                                                                    onChange={(e) => updateDayDraft(entry.day_number, { task_title: e.target.value })}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    placeholder="TASK DESCRIPTION"
                                                                                    style={{ background: 'none', border: 'none', padding: 0, fontWeight: 'inherit', color: 'inherit', width: 'auto', flex: 1, letterSpacing: 'inherit' }}
                                                                                />
                                                                            </button>
                                                                            {taskDescExpandedByDay[entry.day_number] === true ? (
                                                                                <textarea
                                                                                    className="premium-input"
                                                                                    rows={6}
                                                                                    value={(dayDrafts[entry.day_number]?.task_description ?? '').toString()}
                                                                                    onChange={(e) => updateDayDraft(entry.day_number, { task_description: e.target.value })}
                                                                                    placeholder="Write task for this day..."
                                                                                    style={{ marginTop: 8, resize: 'vertical' }}
                                                                                />
                                                                            ) : (
                                                                                <div
                                                                                    style={momentumCollapsiblePreviewStyle}
                                                                                    title={(dayDrafts[entry.day_number]?.task_description ?? '').toString()}
                                                                                >
                                                                                    {(dayDrafts[entry.day_number]?.task_description ?? '').toString().trim() || '—'}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div>
                                                                            <button
                                                                                type="button"
                                                                                className="momentum-collapsible-trigger"
                                                                                onClick={() => toggleScriptIdeaExpanded(entry.day_number)}
                                                                                style={momentumCollapsibleHeaderStyle}
                                                                            >
                                                                                <span style={{ color: 'var(--text-main)' }}>
                                                                                    {scriptIdeaExpandedByDay[entry.day_number] === true ? '▾' : '▸'}
                                                                                </span>
                                                                                <input
                                                                                    className="premium-input-minimal"
                                                                                    value={dayDrafts[entry.day_number]?.script_title || entry.script_title || 'QUESTION / PROMPT (OPTIONAL)'}
                                                                                    onChange={(e) => updateDayDraft(entry.day_number, { script_title: e.target.value })}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    placeholder="QUESTION / PROMPT (OPTIONAL)"
                                                                                    style={{ background: 'none', border: 'none', padding: 0, fontWeight: 'inherit', color: 'inherit', width: 'auto', flex: 1, letterSpacing: 'inherit' }}
                                                                                />
                                                                            </button>
                                                                            {scriptIdeaExpandedByDay[entry.day_number] === true ? (
                                                                                <textarea
                                                                                    className="premium-input"
                                                                                    rows={5}
                                                                                    value={(dayDrafts[entry.day_number]?.script_idea ?? '').toString()}
                                                                                    onChange={(e) => updateDayDraft(entry.day_number, { script_idea: e.target.value })}
                                                                                    placeholder="Write script idea for this day..."
                                                                                    style={{ marginTop: 8, resize: 'vertical' }}
                                                                                />
                                                                            ) : (
                                                                                <div
                                                                                    style={momentumCollapsiblePreviewStyle}
                                                                                    title={(dayDrafts[entry.day_number]?.script_idea ?? '').toString()}
                                                                                >
                                                                                    {(dayDrafts[entry.day_number]?.script_idea ?? '').toString().trim() || '—'}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* MCQ Section for Saved Day Start */}
                                                                        <div style={{ background: 'rgba(102,126,234,0.05)', borderRadius: 12, padding: 12, border: '1px solid rgba(102,126,234,0.15)' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        id={`is_mcq_${entry.day_number}`}
                                                                                        checked={dayDrafts[entry.day_number]?.is_mcq || false}
                                                                                        onChange={(e) => updateDayDraft(entry.day_number, { is_mcq: e.target.checked })}
                                                                                    />
                                                                                    <label htmlFor={`is_mcq_${entry.day_number}`} style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-main)', cursor: 'pointer' }}>
                                                                                        ENABLE MCQ FOR THIS DAY
                                                                                    </label>
                                                                                </div>
                                                                            </div>

                                                                            {dayDrafts[entry.day_number]?.is_mcq && (
                                                                                <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                                                                                    <textarea
                                                                                        className="premium-input"
                                                                                        rows={2}
                                                                                        placeholder="Enter MCQ Question..."
                                                                                        value={dayDrafts[entry.day_number]?.mcq_question || ''}
                                                                                        onChange={(e) => updateDayDraft(entry.day_number, { mcq_question: e.target.value })}
                                                                                    />
                                                                                    <div style={{ display: 'grid', gap: 6 }}>
                                                                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>OPTIONS (SELECT CIRCLE FOR CORRECT ANSWER)</span>
                                                                                        {(dayDrafts[entry.day_number]?.mcq_options || []).map((opt, idx) => (
                                                                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                                <input
                                                                                                    type="radio"
                                                                                                    name={`mcq_correct_${entry.day_number}`}
                                                                                                    checked={dayDrafts[entry.day_number]?.mcq_correct_option === idx}
                                                                                                    onChange={() => updateDayDraft(entry.day_number, { mcq_correct_option: idx })}
                                                                                                />
                                                                                                <input
                                                                                                    className="premium-input"
                                                                                                    style={{ flex: 1, height: 32, fontSize: '13px' }}
                                                                                                    value={opt}
                                                                                                    onChange={(e) => {
                                                                                                        const next = [...(dayDrafts[entry.day_number]?.mcq_options || [])];
                                                                                                        next[idx] = e.target.value;
                                                                                                        updateDayDraft(entry.day_number, { mcq_options: next });
                                                                                                    }}
                                                                                                />
                                                                                                <button
                                                                                                    className="btn-sidebar-delete"
                                                                                                    onClick={() => {
                                                                                                        const next = (dayDrafts[entry.day_number]?.mcq_options || []).filter((_, i) => i !== idx);
                                                                                                        let nextCorrect = dayDrafts[entry.day_number]?.mcq_correct_option;
                                                                                                        if (nextCorrect === idx) nextCorrect = null;
                                                                                                        else if (nextCorrect != null && nextCorrect > idx) nextCorrect--;
                                                                                                        updateDayDraft(entry.day_number, { mcq_options: next, mcq_correct_option: nextCorrect });
                                                                                                    }}
                                                                                                >
                                                                                                    ×
                                                                                                </button>
                                                                                            </div>
                                                                                        ))}
                                                                                        <button
                                                                                            className="btn-premium-ghost"
                                                                                            style={{ padding: '4px 8px', fontSize: '11px', alignSelf: 'flex-start' }}
                                                                                            onClick={() => {
                                                                                                const next = [...(dayDrafts[entry.day_number]?.mcq_options || []), ''];
                                                                                                updateDayDraft(entry.day_number, { mcq_options: next });
                                                                                            }}
                                                                                        >
                                                                                            + Add Option
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {/* MCQ Section for Saved Day End */}

                                                                        <div
                                                                            style={{
                                                                                background: 'rgba(15,23,42,0.35)',
                                                                                border: '1px solid rgba(148,163,184,0.22)',
                                                                                borderRadius: 12,
                                                                                padding: '12px',
                                                                            }}
                                                                        >
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                                                                                <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.08em' }}>
                                                                                    INTERACTION & REMINDERS
                                                                                </div>
                                                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                                                    Audio, logic, and reminders
                                                                                </div>
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                                                                <input
                                                                                    className="premium-input"
                                                                                    type="url"
                                                                                    value={(dayDrafts[entry.day_number]?.audio_url ?? '').toString()}
                                                                                    onChange={(e) => updateDayDraft(entry.day_number, { audio_url: e.target.value })}
                                                                                    placeholder="Paste URL or upload file below"
                                                                                    style={{ flex: 1, minWidth: 200 }}
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    className="btn-premium-primary"
                                                                                    disabled={audioUploadingDay === entry.day_number}
                                                                                    style={{
                                                                                        margin: 0,
                                                                                        padding: '10px 16px',
                                                                                        opacity: audioUploadingDay === entry.day_number ? 0.7 : 1,
                                                                                    }}
                                                                                    onClick={() => triggerAudioUpload(entry.day_number)}
                                                                                >
                                                                                    {audioUploadingDay === entry.day_number
                                                                                        ? audioUploadPercent >= 3
                                                                                            ? `UPLOADING ${audioUploadPercent}%`
                                                                                            : 'UPLOADING…'
                                                                                        : 'UPLOAD AUDIO'}
                                                                                </button>
                                                                                {(dayDrafts[entry.day_number]?.audio_url ?? '').trim() !== '' && (
                                                                                    <button
                                                                                        type="button"
                                                                                        className="btn-premium-ghost"
                                                                                        disabled={audioUploadingDay === entry.day_number}
                                                                                        title="Clear audio URL from this day (click Save to persist)"
                                                                                        style={{
                                                                                            margin: 0,
                                                                                            padding: '10px 14px',
                                                                                            fontSize: '0.72rem',
                                                                                            fontWeight: 800,
                                                                                            letterSpacing: '0.04em',
                                                                                            opacity: audioUploadingDay === entry.day_number ? 0.5 : 1,
                                                                                        }}
                                                                                        onClick={() => updateDayDraft(entry.day_number, { audio_url: '' })}
                                                                                    >
                                                                                        REMOVE AUDIO
                                                                                    </button>
                                                                                )}
                                                                                {audioUploadingDay === entry.day_number && (
                                                                                    <div style={{ width: 120, height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                                                                                        <div style={{ width: `${audioUploadPercent}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s' }} />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            {(dayDrafts[entry.day_number]?.audio_url ?? '').trim() !== '' && (
                                                                                <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                                                                                    <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                                                                                        REQUIRED LISTEN %: {Number(dayDrafts[entry.day_number]?.required_listen_percent ?? 0)}%
                                                                                    </div>
                                                                                    <input
                                                                                        type="range"
                                                                                        min={0}
                                                                                        max={100}
                                                                                        step={1}
                                                                                        value={Number(dayDrafts[entry.day_number]?.required_listen_percent ?? 0)}
                                                                                        onChange={(e) => {
                                                                                            const next = Math.max(0, Math.min(100, Number(e.target.value || 0)));
                                                                                            updateDayDraft(entry.day_number, { required_listen_percent: next });
                                                                                        }}
                                                                                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                                                                                    />
                                                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                                                        0 = no minimum
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            <div
                                                                                style={{
                                                                                    marginTop: 10,
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'space-between',
                                                                                    gap: 12,
                                                                                    background: 'rgba(255,255,255,0.02)',
                                                                                    border: '1px solid var(--glass-border)',
                                                                                    borderRadius: 10,
                                                                                    padding: '10px 12px',
                                                                                }}
                                                                            >
                                                                                <div style={{ minWidth: 0 }}>
                                                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>
                                                                                        Require user response
                                                                                    </div>
                                                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                                                                                        User must type response before submit
                                                                                    </div>
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => updateDayDraft(entry.day_number, { require_user_response: !dayDrafts[entry.day_number]?.require_user_response })}
                                                                                    aria-label="Toggle require user response"
                                                                                    style={{
                                                                                        width: 54,
                                                                                        height: 30,
                                                                                        borderRadius: 999,
                                                                                        border: dayDrafts[entry.day_number]?.require_user_response
                                                                                            ? '1px solid rgba(16,185,129,0.55)'
                                                                                            : '1px solid var(--glass-border)',
                                                                                        background: dayDrafts[entry.day_number]?.require_user_response
                                                                                            ? 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(52,211,153,0.28))'
                                                                                            : 'rgba(255,255,255,0.05)',
                                                                                        position: 'relative',
                                                                                        cursor: 'pointer',
                                                                                        transition: 'all 0.2s ease',
                                                                                        flexShrink: 0,
                                                                                    }}
                                                                                >
                                                                                    <span
                                                                                        style={{
                                                                                            position: 'absolute',
                                                                                            top: 3,
                                                                                            left: dayDrafts[entry.day_number]?.require_user_response ? 27 : 3,
                                                                                            width: 22,
                                                                                            height: 22,
                                                                                            borderRadius: '50%',
                                                                                            background: dayDrafts[entry.day_number]?.require_user_response ? '#10b981' : 'rgba(255,255,255,0.75)',
                                                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                                                                                            transition: 'all 0.2s ease',
                                                                                        }}
                                                                                    />
                                                                                </button>
                                                                            </div>
                                                                            <div
                                                                                style={{
                                                                                    marginTop: 10,
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'space-between',
                                                                                    gap: 12,
                                                                                    background: 'rgba(255,255,255,0.02)',
                                                                                    border: '1px solid var(--glass-border)',
                                                                                    borderRadius: 10,
                                                                                    padding: '10px 12px',
                                                                                }}
                                                                            >
                                                                                <div style={{ minWidth: 0 }}>
                                                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>
                                                                                        Daily Notification Reminder
                                                                                    </div>
                                                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                                                                                        Remind user daily if task not completed
                                                                                    </div>
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => updateDayDraft(entry.day_number, { notification_enabled: !dayDrafts[entry.day_number]?.notification_enabled })}
                                                                                    aria-label="Toggle notification reminder"
                                                                                    style={{
                                                                                        width: 54,
                                                                                        height: 30,
                                                                                        borderRadius: 999,
                                                                                        border: dayDrafts[entry.day_number]?.notification_enabled
                                                                                            ? '1px solid rgba(139,92,246,0.55)'
                                                                                            : '1px solid var(--glass-border)',
                                                                                        background: dayDrafts[entry.day_number]?.notification_enabled
                                                                                            ? 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(167,139,250,0.28))'
                                                                                            : 'rgba(255,255,255,0.05)',
                                                                                        position: 'relative',
                                                                                        cursor: 'pointer',
                                                                                        transition: 'all 0.2s ease',
                                                                                        flexShrink: 0,
                                                                                    }}
                                                                                >
                                                                                    <span
                                                                                        style={{
                                                                                            position: 'absolute',
                                                                                            top: 3,
                                                                                            left: dayDrafts[entry.day_number]?.notification_enabled ? 27 : 3,
                                                                                            width: 22,
                                                                                            height: 22,
                                                                                            borderRadius: '50%',
                                                                                            background: dayDrafts[entry.day_number]?.notification_enabled ? '#8b5cf6' : 'rgba(255,255,255,0.75)',
                                                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                                                                                            transition: 'all 0.2s ease',
                                                                                        }}
                                                                                    />
                                                                                </button>
                                                                            </div>
                                                                            {dayDrafts[entry.day_number]?.notification_enabled && (
                                                                                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                                                                                    <div style={{ opacity: dayDrafts[entry.day_number]?.morning_reminder_enabled ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                                                                            <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.05em' }}>
                                                                                                <span>🌅</span> MORNING
                                                                                            </label>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => updateDayDraft(entry.day_number, { morning_reminder_enabled: !dayDrafts[entry.day_number]?.morning_reminder_enabled })}
                                                                                                className={`btn-toggle-mini ${dayDrafts[entry.day_number]?.morning_reminder_enabled ? 'active' : ''}`}
                                                                                                style={{ padding: '2px 8px', fontSize: '9px' }}
                                                                                            >
                                                                                                {dayDrafts[entry.day_number]?.morning_reminder_enabled ? 'ON' : 'OFF'}
                                                                                            </button>
                                                                                        </div>
                                                                                        <input
                                                                                            type="time"
                                                                                            className="premium-input clock-input"
                                                                                            style={{ width: '100%', height: 42, fontSize: '16px', fontWeight: 700, textAlign: 'center', color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                                                                                            value={formatTimeForInput(dayDrafts[entry.day_number]?.morning_reminder_time || '09:00')}
                                                                                            disabled={!dayDrafts[entry.day_number]?.morning_reminder_enabled}
                                                                                            onChange={(e) => updateDayDraft(entry.day_number, { morning_reminder_time: e.target.value })}
                                                                                        />
                                                                                    </div>
                                                                                    <div style={{ opacity: dayDrafts[entry.day_number]?.evening_reminder_enabled ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                                                                            <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.05em' }}>
                                                                                                <span>🌆</span> EVENING
                                                                                            </label>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => updateDayDraft(entry.day_number, { evening_reminder_enabled: !dayDrafts[entry.day_number]?.evening_reminder_enabled })}
                                                                                                className={`btn-toggle-mini ${dayDrafts[entry.day_number]?.evening_reminder_enabled ? 'active' : ''}`}
                                                                                                style={{ padding: '2px 8px', fontSize: '9px' }}
                                                                                            >
                                                                                                {dayDrafts[entry.day_number]?.evening_reminder_enabled ? 'ON' : 'OFF'}
                                                                                            </button>
                                                                                        </div>
                                                                                        <input
                                                                                            type="time"
                                                                                            className="premium-input clock-input"
                                                                                            style={{ width: '100%', height: 42, fontSize: '16px', fontWeight: 700, textAlign: 'center', color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                                                                                            value={formatTimeForInput(dayDrafts[entry.day_number]?.evening_reminder_time || '18:00')}
                                                                                            disabled={!dayDrafts[entry.day_number]?.evening_reminder_enabled}
                                                                                            onChange={(e) => updateDayDraft(entry.day_number, { evening_reminder_time: e.target.value })}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {(dayDrafts[entry.day_number]?.audio_url ?? '').trim() && (
                                                                                <div style={{ marginTop: 12 }}>
                                                                                    <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 6 }}>PREVIEW</div>
                                                                                    <PremiumAudioPlayer src={resolveAudioPlaybackUrl(dayDrafts[entry.day_number]?.audio_url ?? '')} />
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div>
                                                                            <button
                                                                                type="button"
                                                                                className="momentum-collapsible-trigger"
                                                                                onClick={() => toggleFeedbackExpanded(entry.day_number)}
                                                                                style={momentumCollapsibleHeaderStyle}
                                                                            >
                                                                                <span style={{ color: 'var(--text-main)' }}>
                                                                                    {feedbackExpandedByDay[entry.day_number] === true ? '▾' : '▸'}
                                                                                </span>
                                                                                FEEDBACK (OPTIONAL)
                                                                            </button>
                                                                            {feedbackExpandedByDay[entry.day_number] === true ? (
                                                                                <textarea
                                                                                    className="premium-input"
                                                                                    rows={4}
                                                                                    value={(dayDrafts[entry.day_number]?.feedback ?? '').toString()}
                                                                                    onChange={(e) => updateDayDraft(entry.day_number, { feedback: e.target.value })}
                                                                                    placeholder="Optional note for this day…"
                                                                                    style={{ marginTop: 8, resize: 'vertical' }}
                                                                                />
                                                                            ) : (
                                                                                <div
                                                                                    style={momentumCollapsiblePreviewStyle}
                                                                                    title={(dayDrafts[entry.day_number]?.feedback ?? '').toString()}
                                                                                >
                                                                                    {(dayDrafts[entry.day_number]?.feedback ?? '').toString().trim() || '—'}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                                            <button
                                                                                className="btn-premium-ghost"
                                                                                onClick={() => deleteDailyLogForDay(entry.day_number)}
                                                                                disabled={deletingDay === entry.day_number || savingDay === entry.day_number}
                                                                                title="Delete this day"
                                                                                style={{ color: 'rgba(248,113,113,0.95)', borderColor: 'rgba(248,113,113,0.35)' }}
                                                                            >
                                                                                {deletingDay === entry.day_number ? 'Deleting...' : 'Delete'}
                                                                            </button>
                                                                            <button
                                                                                className="btn-premium-primary"
                                                                                onClick={() => saveDailyLogForDay(entry.day_number)}
                                                                                disabled={savingDay === entry.day_number || deletingDay === entry.day_number}
                                                                            >
                                                                                {savingDay === entry.day_number ? 'Saving...' : 'Save'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                                    ))}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {saveToast && (
                <div
                    className="momentum-save-toast"
                    role="status"
                    aria-live="polite"
                    onClick={() => {
                        if (saveToastTimeoutRef.current) {
                            clearTimeout(saveToastTimeoutRef.current);
                            saveToastTimeoutRef.current = null;
                        }
                        setSaveToast(null);
                    }}
                    style={{
                        position: 'fixed',
                        bottom: 28,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10001,
                        maxWidth: 'min(440px, 92vw)',
                        padding: '16px 22px',
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 800,
                        letterSpacing: '0.03em',
                        lineHeight: 1.35,
                        boxShadow: '0 14px 44px rgba(0,0,0,0.45)',
                        border:
                            saveToast.variant === 'error'
                                ? '1px solid rgba(248,113,113,0.5)'
                                : '1px solid rgba(167,139,250,0.55)',
                        background: 'rgba(15,23,42,0.98)',
                        color: saveToast.variant === 'error' ? '#fecaca' : '#f1f5f9',
                        cursor: 'pointer',
                    }}
                >
                    {saveToast.message}
                    <div
                        style={{
                            marginTop: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            letterSpacing: '0.04em',
                        }}
                    >
                        Tap to dismiss
                    </div>
                </div>
            )}

            {uiDialog && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(2,6,23,0.72)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        zIndex: 9999,
                    }}
                    onMouseDown={() => setUiDialog(null)}
                >
                    <div
                        style={{
                            width: 'min(520px, 96vw)',
                            borderRadius: 16,
                            border: '1px solid rgba(255,255,255,0.10)',
                            background: 'rgba(15,23,42,0.95)',
                            boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
                            padding: 16,
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>
                            {uiDialog.title}
                        </div>

                        {uiDialog.kind === 'confirm' ? (
                            <>
                                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14, lineHeight: 1.35 }}>
                                    {uiDialog.message}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                    <button className="btn-premium-ghost" onClick={() => setUiDialog(null)}>Cancel</button>
                                    <button className="btn-premium-danger" onClick={uiDialog.onConfirm}>Delete</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 8 }}>
                                    {uiDialog.label}
                                </div>
                                <input
                                    className="premium-input"
                                    value={uiDialog.value}
                                    placeholder={uiDialog.placeholder}
                                    onChange={(e) => setUiDialog((prev) => (prev && prev.kind === 'prompt' ? { ...prev, value: e.target.value } : prev))}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                                    <button className="btn-premium-ghost" onClick={() => setUiDialog(null)}>Cancel</button>
                                    <button
                                        className="btn-premium-primary"
                                        onClick={() => uiDialog.onConfirm(uiDialog.value)}
                                    >
                                        Save
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MomentumPage;
