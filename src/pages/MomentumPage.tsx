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
type DailyLogEntry = { day_number: number; task_description: string | null; script_idea: string | null; feedback: string | null };
type DailyLogDraft = { task_description: string; script_idea: string; feedback: string };
type UiDialog =
    | null
    | { kind: 'confirm'; title: string; message: string; onConfirm: () => void }
    | { kind: 'prompt'; title: string; label: string; value: string; placeholder?: string; onConfirm: (value: string) => void };

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

    // Edit selected activity (e.g. Visualization item) basics.
    const [isEditingActivity, setIsEditingActivity] = React.useState(false);
    const [activityDraftName, setActivityDraftName] = React.useState('');
    const [activityDraftDescription, setActivityDraftDescription] = React.useState('');
    const [activityDraftScriptIdea, setActivityDraftScriptIdea] = React.useState('');
    const [isSavingActivity, setIsSavingActivity] = React.useState(false);

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
    }, [selectedActivity?.id]);

    const ensureDayDraftLoaded = React.useCallback(async (day: number) => {
        if (!selectedActivity) return;
        if (dayDrafts[day]) return;
        const res = await apiClient.getActivityTypeDailyLogs(selectedActivity.id, day, day);
        const entry = res.success ? (res.data?.[0] ?? null) : null;
        setDayDrafts((prev) => ({
            ...prev,
            [day]: {
                task_description: (entry?.task_description ?? selectedActivity.description ?? '').toString(),
                script_idea: (entry?.script_idea ?? selectedActivity.script_idea ?? '').toString(),
                feedback: (entry?.feedback ?? '').toString(),
            },
        }));
    }, [selectedActivity?.id, dayDrafts]);

    const updateDayDraft = (day: number, patch: Partial<DailyLogDraft>) => {
        setDayDrafts((prev) => ({
            ...prev,
            [day]: {
                task_description: prev[day]?.task_description ?? '',
                script_idea: prev[day]?.script_idea ?? '',
                feedback: prev[day]?.feedback ?? '',
                ...patch,
            },
        }));
    };

    const saveDailyLogForDay = async (day: number) => {
        if (!selectedActivity) return;
        const draft = dayDrafts[day] ?? { task_description: '', script_idea: '', feedback: '' };
        setSavingDay(day);
        const res = await apiClient.upsertActivityTypeDailyLog(selectedActivity.id, day, {
            task_description: draft.task_description.trim(),
            script_idea: draft.script_idea.trim(),
            feedback: draft.feedback.trim(),
        });
        setSavingDay(null);
        if (!res.success) return;
        await refreshSavedDayLogs();
    };

    const importBulkDayLogs = async () => {
        if (!selectedActivity) return;
        if (!bulkDayLogText.trim()) return;

        const rows = bulkDayLogText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        const entries: Array<{ day_number: number; task_description?: string; script_idea?: string; feedback?: string }> = [];
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
                });
            } else {
                entries.push({
                    day_number: day,
                    task_description: cols[1] || '',
                    script_idea: cols[2] || '',
                    feedback: cols[3] || '',
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
            setDayDrafts((prev) => ({
                ...prev,
                [nextDay]: {
                    task_description: selectedActivity?.description ?? '',
                    script_idea: selectedActivity?.script_idea ?? '',
                    feedback: '',
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
        <div className="view-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Daily Task Library</h2>
                    <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)' }}>
                        Pick a task, then add day-wise popup content (what user sees before YES/NO).
                    </p>
                </div>
            </div>

            <div className="curriculum-layout" style={{ height: 'calc(100vh - 220px)' }}>
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
                                <div className="editor-card">
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
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                    <div style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1px', color: 'var(--text-muted)' }}>
                                                                        NEW DAY
                                                                    </div>
                                                                    <input
                                                                        className="premium-input"
                                                                        type="number"
                                                                        value={newDayNumber}
                                                                        onChange={(e) => setNewDayNumber(Math.max(1, Number(e.target.value || 1)))}
                                                                        style={{ width: 120, height: 36 }}
                                                                    />
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 8 }}>
                                                                    <button className="btn-premium-primary" onClick={saveNewDay}>
                                                                        Save Day
                                                                    </button>
                                                                    <button
                                                                        className="btn-premium-ghost"
                                                                        onClick={() => setIsAddingDay(false)}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                                                                    TASK DESCRIPTION
                                                                </div>
                                                                <textarea
                                                                    className="premium-input"
                                                                    rows={3}
                                                                    value={(dayDrafts[newDayNumber]?.task_description ?? '').toString()}
                                                                    onChange={(e) => updateDayDraft(newDayNumber, { task_description: e.target.value })}
                                                                    placeholder="Write task for this day..."
                                                                    style={{ marginTop: 8, resize: 'vertical' }}
                                                                />
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
                                                                <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                                                                    FEEDBACK (OPTIONAL)
                                                                </div>
                                                                <input
                                                                    className="premium-input"
                                                                    value={(dayDrafts[newDayNumber]?.feedback ?? '').toString()}
                                                                    onChange={(e) => updateDayDraft(newDayNumber, { feedback: e.target.value })}
                                                                    placeholder="Optional note"
                                                                    style={{ marginTop: 8 }}
                                                                />
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
                                                                placeholder={"Examples:\n1\tTask description\tVideo/Reel script idea\tFeedback(optional)\n2\tTask description\tVideo/Reel script idea"}
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
                                                                            <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                                                                                TASK DESCRIPTION
                                                                            </div>
                                                                            <textarea
                                                                                className="premium-input"
                                                                                rows={3}
                                                                                value={(dayDrafts[entry.day_number]?.task_description ?? '').toString()}
                                                                                onChange={(e) => updateDayDraft(entry.day_number, { task_description: e.target.value })}
                                                                                placeholder="Write task for this day..."
                                                                                style={{ marginTop: 8, resize: 'vertical' }}
                                                                            />
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
                                                                            <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                                                                                FEEDBACK (OPTIONAL)
                                                                            </div>
                                                                            <input
                                                                                className="premium-input"
                                                                                value={(dayDrafts[entry.day_number]?.feedback ?? '').toString()}
                                                                                onChange={(e) => updateDayDraft(entry.day_number, { feedback: e.target.value })}
                                                                                placeholder="Optional note"
                                                                                style={{ marginTop: 8 }}
                                                                            />
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
