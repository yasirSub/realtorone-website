import React from 'react';
import type { ActivityType } from '../types';
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
type DailyLogEntry = { day_number: number; task_description: string | null; script_idea: string | null; feedback: string | null; audio_url: string | null };
type DailyLogDraft = { task_description: string; script_idea: string; feedback: string; audio_url: string };
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
    React.useEffect(() => {
        dayDraftsRef.current = dayDrafts;
    }, [dayDrafts]);

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
                task_description: '',
                script_idea: '',
                feedback: '',
                audio_url: '',
            };
            const base = dayDraftsRef.current[day] ?? defaultDraft;
            const merged: DailyLogDraft = { ...base, audio_url: storedUrl };
            setDayDrafts((prev) => ({
                ...prev,
                [day]: { ...(prev[day] ?? defaultDraft), audio_url: storedUrl },
            }));

            const saveRes = await apiClient.upsertActivityTypeDailyLog(selectedActivity.id, day, {
                task_description: merged.task_description.trim(),
                script_idea: merged.script_idea.trim(),
                feedback: merged.feedback.trim(),
                audio_url: storedUrl,
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
        { key: 'subconscious' as const, label: 'SUBCONSCIOUS', empty: 'No subconscious activities' },
        { key: 'conscious' as const, label: 'CONSCIOUS', empty: 'No conscious activities' },
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
                    const key = item.section_title || (category === 'subconscious' ? 'Mindset & Inner Strength' : 'Conscious');
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
                    task_description: entry.task_description ?? null,
                    script_idea: entry.script_idea ?? null,
                    feedback: entry.feedback ?? null,
                    audio_url: entry.audio_url ?? null,
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
                task_description: (entry?.task_description ?? defaultTaskDesc).toString(),
                script_idea: (entry?.script_idea ?? selectedActivity.script_idea ?? '').toString(),
                feedback: (entry?.feedback ?? '').toString(),
                audio_url: (entry?.audio_url ?? '').toString(),
            },
        }));
    }, [selectedActivity, dayDrafts, savedDayLogs]);

    const updateDayDraft = (day: number, patch: Partial<DailyLogDraft>) => {
        setDayDrafts((prev) => ({
            ...prev,
            [day]: {
                task_description: prev[day]?.task_description ?? '',
                script_idea: prev[day]?.script_idea ?? '',
                feedback: prev[day]?.feedback ?? '',
                audio_url: prev[day]?.audio_url ?? '',
                ...patch,
            },
        }));
    };

    const saveDailyLogForDay = async (day: number) => {
        if (!selectedActivity) return;
        const draft = dayDraftsRef.current[day] ?? {
            task_description: '',
            script_idea: '',
            feedback: '',
            audio_url: '',
        };
        setSavingDay(day);
        try {
            const res = await apiClient.upsertActivityTypeDailyLog(selectedActivity.id, day, {
                task_description: draft.task_description.trim(),
                script_idea: draft.script_idea.trim(),
                feedback: draft.feedback.trim(),
                audio_url:
                    draft.audio_url.trim() === '' ? null : draft.audio_url.trim(),
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

    const importBulkDayLogs = async () => {
        if (!selectedActivity) return;
        if (!bulkDayLogText.trim()) return;

        const rows = bulkDayLogText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        const entries: Array<{ day_number: number; task_description?: string; script_idea?: string; feedback?: string; audio_url?: string }> = [];
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
                    task_description: selectedActivity?.description || '',
                    script_idea: cols[1],
                    feedback: '',
                    audio_url: '',
                });
            } else {
                entries.push({
                    day_number: day,
                    task_description: cols[1] || '',
                    script_idea: cols[2] || '',
                    feedback: cols[3] || '',
                    audio_url: cols[4] || '',
                });
            }
        }

        if (!entries.length) {
            alert('No valid rows found. Use tab-separated rows: day, task(optional), script, feedback(optional).');
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
                    task_description: prevTaskDesc || (selectedActivity?.description ?? ''),
                    script_idea: selectedActivity?.script_idea ?? '',
                    feedback: '',
                    audio_url: '',
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
                            {categories.map((cat) => (
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
                        <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)' }}>DAYS</span>
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
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button
                                                        className="btn-premium-primary"
                                                        onClick={() => {
                                                            setOpenBulkImport(false);
                                                            addNextDay();
                                                        }}
                                                    >
                                                        + Add Day
                                                    </button>
                                                    <button
                                                        className="btn-premium-primary"
                                                        onClick={() => {
                                                            setIsAddingDay(false);
                                                            setOpenBulkImport(true);
                                                        }}
                                                    >
                                                        Bulk Add
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
                                                                    zIndex: 5,
                                                                    margin: '-12px -12px 12px -12px',
                                                                    padding: '12px 12px 10px',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    gap: 12,
                                                                    flexWrap: 'wrap',
                                                                    background: 'linear-gradient(180deg, rgba(15,23,42,0.97) 70%, rgba(15,23,42,0.88) 100%)',
                                                                    borderBottom: '1px solid rgba(102,126,234,0.4)',
                                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px', minWidth: 0 }}>
                                                                    <div style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1px', color: 'var(--text-muted)', flexShrink: 0 }}>
                                                                        NEW DAY
                                                                    </div>
                                                                    <input
                                                                        className="premium-input"
                                                                        type="number"
                                                                        value={newDayNumber}
                                                                        onChange={(e) => setNewDayNumber(Math.max(1, Number(e.target.value || 1)))}
                                                                        style={{ width: 120, height: 36, flexShrink: 0 }}
                                                                    />
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-premium-primary"
                                                                        onClick={saveNewDay}
                                                                        disabled={savingDay === newDayNumber}
                                                                        style={{
                                                                            padding: '12px 22px',
                                                                            fontSize: '0.82rem',
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
                                                                        style={{ padding: '12px 18px', fontSize: '0.82rem' }}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <button
                                                                    type="button"
                                                                    className="momentum-collapsible-trigger"
                                                                    onClick={() => toggleTaskDescExpanded(newDayNumber)}
                                                                    style={momentumCollapsibleHeaderStyle}
                                                                >
                                                                    <span style={{ color: 'var(--text-main)' }}>
                                                                        {taskDescExpandedByDay[newDayNumber] === true ? '▾' : '▸'}
                                                                    </span>
                                                                    TASK DESCRIPTION
                                                                </button>
                                                                {taskDescExpandedByDay[newDayNumber] === true ? (
                                                                    <textarea
                                                                        className="premium-input"
                                                                        rows={3}
                                                                        value={(dayDrafts[newDayNumber]?.task_description ?? '').toString()}
                                                                        onChange={(e) => updateDayDraft(newDayNumber, { task_description: e.target.value })}
                                                                        placeholder="Write task for this day..."
                                                                        style={{ marginTop: 8, resize: 'vertical' }}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        style={momentumCollapsiblePreviewStyle}
                                                                        title={(dayDrafts[newDayNumber]?.task_description ?? '').toString()}
                                                                    >
                                                                        {(dayDrafts[newDayNumber]?.task_description ?? '').toString().trim() || '—'}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                                                                    VIDEO/REEL SCRIPT IDEA
                                                                </div>
                                                                <textarea
                                                                    className="premium-input"
                                                                    rows={3}
                                                                    value={(dayDrafts[newDayNumber]?.script_idea ?? '').toString()}
                                                                    onChange={(e) => updateDayDraft(newDayNumber, { script_idea: e.target.value })}
                                                                    placeholder="Write script idea for this day..."
                                                                    style={{ marginTop: 8, resize: 'vertical' }}
                                                                />
                                                            </div>

                                                            <div>
                                                                <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 8 }}>
                                                                    AUDIO
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                                                    <input
                                                                        className="premium-input"
                                                                        type="url"
                                                                        value={(dayDrafts[newDayNumber]?.audio_url ?? '').toString()}
                                                                        onChange={(e) => updateDayDraft(newDayNumber, { audio_url: e.target.value })}
                                                                        placeholder="Paste URL or upload file below"
                                                                        style={{ flex: 1, minWidth: 200 }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="btn-premium-primary"
                                                                        disabled={audioUploadingDay === newDayNumber}
                                                                        style={{
                                                                            margin: 0,
                                                                            padding: '10px 16px',
                                                                            opacity: audioUploadingDay === newDayNumber ? 0.7 : 1,
                                                                        }}
                                                                        onClick={() => triggerAudioUpload(newDayNumber)}
                                                                    >
                                                                        {audioUploadingDay === newDayNumber
                                                                            ? audioUploadPercent >= 3
                                                                                ? `UPLOADING ${audioUploadPercent}%`
                                                                                : 'UPLOADING…'
                                                                            : 'UPLOAD AUDIO'}
                                                                    </button>
                                                                    {(dayDrafts[newDayNumber]?.audio_url ?? '').trim() !== '' && (
                                                                        <button
                                                                            type="button"
                                                                            className="btn-premium-ghost"
                                                                            disabled={audioUploadingDay === newDayNumber}
                                                                            title="Clear audio URL from this day (click Save to persist)"
                                                                            style={{
                                                                                margin: 0,
                                                                                padding: '10px 14px',
                                                                                fontSize: '0.72rem',
                                                                                fontWeight: 800,
                                                                                letterSpacing: '0.04em',
                                                                                opacity: audioUploadingDay === newDayNumber ? 0.5 : 1,
                                                                            }}
                                                                            onClick={() => updateDayDraft(newDayNumber, { audio_url: '' })}
                                                                        >
                                                                            REMOVE AUDIO
                                                                        </button>
                                                                    )}
                                                                    {audioUploadingDay === newDayNumber && (
                                                                        <div style={{ width: 120, height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                                                                            <div style={{ width: `${audioUploadPercent}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s' }} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {(dayDrafts[newDayNumber]?.audio_url ?? '').trim() && (
                                                                    <div style={{ marginTop: 10 }}>
                                                                        <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 6 }}>PREVIEW</div>
                                                                        <PremiumAudioPlayer src={resolveAudioPlaybackUrl(dayDrafts[newDayNumber]?.audio_url ?? '')} />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <button
                                                                    type="button"
                                                                    className="momentum-collapsible-trigger"
                                                                    onClick={() => toggleFeedbackExpanded(newDayNumber)}
                                                                    style={momentumCollapsibleHeaderStyle}
                                                                >
                                                                    <span style={{ color: 'var(--text-main)' }}>
                                                                        {feedbackExpandedByDay[newDayNumber] === true ? '▾' : '▸'}
                                                                    </span>
                                                                    FEEDBACK (OPTIONAL)
                                                                </button>
                                                                {feedbackExpandedByDay[newDayNumber] === true ? (
                                                                    <textarea
                                                                        className="premium-input"
                                                                        rows={2}
                                                                        value={(dayDrafts[newDayNumber]?.feedback ?? '').toString()}
                                                                        onChange={(e) => updateDayDraft(newDayNumber, { feedback: e.target.value })}
                                                                        placeholder="Optional note for this day…"
                                                                        style={{ marginTop: 8, resize: 'vertical' }}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        style={momentumCollapsiblePreviewStyle}
                                                                        title={(dayDrafts[newDayNumber]?.feedback ?? '').toString()}
                                                                    >
                                                                        {(dayDrafts[newDayNumber]?.feedback ?? '').toString().trim() || '—'}
                                                                    </div>
                                                                )}
                                                            </div>

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
                                                                <div style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1px', color: 'var(--text-muted)' }}>
                                                                    BULK IMPORT (TAB-SEPARATED)
                                                                </div>
                                                                <button
                                                                    className="btn-premium-ghost"
                                                                    style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                                                                    onClick={() => setOpenBulkImport(false)}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                            <textarea
                                                                className="premium-input"
                                                                rows={6}
                                                                value={bulkDayLogText}
                                                                onChange={(e) => setBulkDayLogText(e.target.value)}
                                                                placeholder={"Examples:\n1\tTask description\tVideo/Reel script idea\tFeedback(optional)\tAudio URL(optional)\n2\tTask description\tVideo/Reel script idea\t\thttps://..."}
                                                                style={{ resize: 'vertical' }}
                                                            />
                                                            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                                <button
                                                                    className="btn-premium-primary"
                                                                    onClick={importBulkDayLogs}
                                                                >
                                                                    Import Bulk Day Logs
                                                                </button>
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
                                                    <div style={{ maxHeight: 420, overflowY: 'auto', display: 'grid', gap: 8 }}>
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
                                                                    background: selectedDayNumber === entry.day_number ? 'rgba(102,126,234,0.12)' : 'rgba(255,255,255,0.02)',
                                                                    border: selectedDayNumber === entry.day_number ? '1px solid rgba(102,126,234,0.5)' : '1px solid var(--glass-border)',
                                                                    borderRadius: 10,
                                                                    textAlign: 'left',
                                                                    padding: '10px 12px',
                                                                    color: 'var(--text-main)',
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                                                    <button
                                                                        onClick={async () => {
                                                                            setSelectedDayNumber(entry.day_number);
                                                                            setExpandedSavedDay((prev) => (prev === entry.day_number ? null : entry.day_number));
                                                                            await ensureDayDraftLoaded(entry.day_number);
                                                                        }}
                                                                        style={{
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            color: 'var(--text-main)',
                                                                            cursor: 'pointer',
                                                                            padding: 0,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 8,
                                                                            fontWeight: 900,
                                                                        }}
                                                                        title="Expand / collapse"
                                                                    >
                                                                        <span style={{ color: 'var(--text-muted)', fontWeight: 900 }}>
                                                                            {expandedSavedDay === entry.day_number ? '▾' : '▸'}
                                                                        </span>
                                                                        Day {entry.day_number}
                                                                    </button>

                                                                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                                                        {((entry.task_description || '').trim() || (entry.script_idea || '').trim()) ? 'Saved' : 'Empty'}
                                                                    </span>
                                                                </div>

                                                                {expandedSavedDay === entry.day_number && (
                                                                    <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
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
                                                                                TASK DESCRIPTION
                                                                            </button>
                                                                            {taskDescExpandedByDay[entry.day_number] === true ? (
                                                                                <textarea
                                                                                    className="premium-input"
                                                                                    rows={3}
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
                                                                            <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                                                                                VIDEO/REEL SCRIPT IDEA
                                                                            </div>
                                                                            <textarea
                                                                                className="premium-input"
                                                                                rows={3}
                                                                                value={(dayDrafts[entry.day_number]?.script_idea ?? '').toString()}
                                                                                onChange={(e) => updateDayDraft(entry.day_number, { script_idea: e.target.value })}
                                                                                placeholder="Write script idea for this day..."
                                                                                style={{ marginTop: 8, resize: 'vertical' }}
                                                                            />
                                                                        </div>

                                                                        <div>
                                                                            <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 8 }}>
                                                                                AUDIO
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
                                                                            {(dayDrafts[entry.day_number]?.audio_url ?? '').trim() && (
                                                                                <div style={{ marginTop: 10 }}>
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
                                                                                    rows={2}
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

                                                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                                            <button
                                                                                className="btn-premium-primary"
                                                                                onClick={() => saveDailyLogForDay(entry.day_number)}
                                                                                disabled={savingDay === entry.day_number}
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
