import React from 'react';
import type { ActivityType } from '../types';
import { apiClient } from '../api/client';
import '../components/courses/CurriculumEditor.css';

interface MomentumPageProps {
    activityTypes: ActivityType[];
    userActivityPoints: number;
    setShowAddActivityModal: (show: boolean) => void;
    setUserActivityPoints: (points: number) => void;
    setActivityTypes: (types: any) => void;
}

type CategoryKey = 'subconscious' | 'conscious';
type SectionGroup = { title: string; order: number; items: ActivityType[] };
type DailyLogEntry = { day_number: number; task_description: string | null; script_idea: string | null; feedback: string | null };

const MomentumPage: React.FC<MomentumPageProps> = ({
    activityTypes,
    userActivityPoints,
    setShowAddActivityModal,
    setUserActivityPoints,
    setActivityTypes,
}) => {
    const [activeCategory, setActiveCategory] = React.useState<CategoryKey>('subconscious');
    const [activeSection, setActiveSection] = React.useState('');
    const [activeActivityId, setActiveActivityId] = React.useState<number | null>(null);
    const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});
    const [groupDraft, setGroupDraft] = React.useState({ section_title: '', section_order: 1 });
    const [activityDraft, setActivityDraft] = React.useState({
        name: '',
        description: '',
        script_idea: '',
        points: 0,
        section_title: '',
        section_order: 1,
        item_order: 1,
    });
    const [selectedDayNumber, setSelectedDayNumber] = React.useState(1);
    const [dayLogDraft, setDayLogDraft] = React.useState({
        task_description: '',
        script_idea: '',
        feedback: '',
    });
    const [bulkDayLogText, setBulkDayLogText] = React.useState('');
    const [openTaskEditor, setOpenTaskEditor] = React.useState(true);
    const [openDayWiseEditor, setOpenDayWiseEditor] = React.useState(true);
    const [openBulkImport, setOpenBulkImport] = React.useState(false);
    const [savedDayLogs, setSavedDayLogs] = React.useState<DailyLogEntry[]>([]);
    const [isLoadingSavedDayLogs, setIsLoadingSavedDayLogs] = React.useState(false);

    const categories = [
        { key: 'subconscious' as const, label: 'SUBCONSCIOUS', empty: 'No subconscious activities' },
        { key: 'conscious' as const, label: 'CONSCIOUS', empty: 'No conscious activities' },
    ];

    const groupedByCategory = React.useMemo(() => {
        const result: Record<CategoryKey, SectionGroup[]> = { subconscious: [], conscious: [] };

        (['subconscious', 'conscious'] as const).forEach((category) => {
            const grouped = new Map<string, ActivityType[]>();
            activityTypes
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
    }, [activityTypes]);

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
        if (!currentSection) return;
        setGroupDraft({
            section_title: currentSection.title,
            section_order: Number(currentSection.order ?? 1),
        });
    }, [currentSection?.title, currentSection?.order]);

    React.useEffect(() => {
        if (!selectedActivity || !currentSection) return;
        setActivityDraft({
            name: selectedActivity.name || '',
            description: selectedActivity.description || '',
            script_idea: selectedActivity.script_idea || '',
            points: Number(selectedActivity.points ?? 0),
            section_title: String(selectedActivity.section_title || currentSection.title),
            section_order: Number(selectedActivity.section_order ?? currentSection.order ?? 1),
            item_order: Number(selectedActivity.item_order ?? 1),
        });
    }, [selectedActivity?.id, currentSection?.title, currentSection?.order]);

    React.useEffect(() => {
        if (!selectedActivity) return;
        let cancelled = false;

        const loadDayLog = async () => {
            const res = await apiClient.getActivityTypeDailyLogs(
                selectedActivity.id,
                selectedDayNumber,
                selectedDayNumber
            );
            if (cancelled) return;

            const entry = res.success ? (res.data?.[0] ?? null) : null;
            setDayLogDraft({
                task_description: entry?.task_description ?? selectedActivity.description ?? '',
                script_idea: entry?.script_idea ?? selectedActivity.script_idea ?? '',
                feedback: entry?.feedback ?? '',
            });
        };

        loadDayLog();
        return () => {
            cancelled = true;
        };
    }, [selectedActivity?.id, selectedDayNumber]);

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

    const saveGroup = async () => {
        if (!currentSection) return;
        const nextTitle = groupDraft.section_title.trim();
        if (!nextTitle) return;

        const res = await apiClient.updateActivityGroup({
            category: activeCategory,
            current_section_title: currentSection.title,
            section_title: nextTitle,
            section_order: Number(groupDraft.section_order || 0),
        });

        if (!res.success) return;

        setActivityTypes((prev: any[]) =>
            prev.map((item) => {
                if (item.category === activeCategory && item.section_title === currentSection.title) {
                    return { ...item, section_title: nextTitle, section_order: Number(groupDraft.section_order || 0) };
                }
                return item;
            })
        );
        setActiveSection(nextTitle);
    };

    const saveActivity = async () => {
        if (!selectedActivity) return;
        const res = await apiClient.updateActivityType(selectedActivity.id, {
            name: activityDraft.name.trim(),
            description: activityDraft.description.trim(),
            script_idea: activityDraft.script_idea.trim(),
            points: Number(activityDraft.points || 0),
            section_title: activityDraft.section_title.trim(),
            section_order: Number(activityDraft.section_order || 0),
            item_order: Number(activityDraft.item_order || 0),
        });

        if (!res.success) return;
        setActivityTypes((prev: any[]) => prev.map((item) => (item.id === selectedActivity.id ? res.data : item)));
    };

    const saveDailyLogForDay = async () => {
        if (!selectedActivity) return;
        const res = await apiClient.upsertActivityTypeDailyLog(
            selectedActivity.id,
            selectedDayNumber,
            {
                task_description: dayLogDraft.task_description.trim(),
                script_idea: dayLogDraft.script_idea.trim(),
                feedback: dayLogDraft.feedback.trim(),
            }
        );
        if (!res.success) return;
        await refreshSavedDayLogs();
        alert(`Saved day ${selectedDayNumber} log for ${selectedActivity.name}`);
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
                    task_description: activityDraft.description || '',
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
        alert(`Imported ${res.count} day logs for ${selectedActivity.name}`);
    };

    const loadVisualization60DayTemplate = () => {
        const visualizationTask = 'Imagine confidently handling a real estate scenario. Describe your response.';
        const scripts = [
            'Founder explains a real client situation and asks users to visualize handling it professionally.',
            'Describe how a confident realtor handles a first investor call professionally.',
            'Visualize presenting Dubai real estate opportunities to a global investor.',
            'Explain how to respond when a client says they want to "wait for the market to settle".',
            'Walk through a scenario where you confidently close a property conversation.',
        ];

        const lines = Array.from({ length: 60 }, (_, index) => {
            const day = index + 1;
            const script = scripts[index % scripts.length];
            return `${day}\t${visualizationTask}\t${script}`;
        });

        setBulkDayLogText(lines.join('\n'));
        setOpenBulkImport(true);
    };

    const deleteActivity = async (item: ActivityType) => {
        if (!confirm(`Delete "${item.name}"?`)) return;
        const res = await apiClient.deleteActivityType(item.id);
        if (res.success) setActivityTypes((prev: any[]) => prev.filter((x) => x.id !== item.id));
    };

    const deleteGroup = async (section: SectionGroup) => {
        if (!confirm(`Delete group "${section.title}" and all ${section.items.length} activities?`)) return;
        for (const item of section.items) {
            // eslint-disable-next-line no-await-in-loop
            await apiClient.deleteActivityType(item.id);
        }
        setActivityTypes((prev: any[]) => prev.filter((x) => !(x.category === activeCategory && x.section_title === section.title)));
    };

    const addDay = async () => {
        const dayName = prompt('Enter day title (example: Day 1)');
        if (!dayName) return;

        const dayOrder = sections.length + 1;
        const res = await apiClient.createActivityType({
            name: 'New Task',
            description: '',
            script_idea: '',
            points: 5,
            category: activeCategory,
            section_title: dayName.trim(),
            section_order: dayOrder,
            item_order: 1,
            icon: 'Activity',
            is_global: true,
            min_tier: 'Consultant',
        }, true);

        if (!res.success) return;
        setActivityTypes((prev: any[]) => [res.data, ...prev]);
        setActiveSection(dayName.trim());
        setActiveActivityId(res.data.id);
    };

    const addTaskToDay = async (section: SectionGroup) => {
        const taskName = prompt(`Task name for "${section.title}"`, 'New Task');
        if (!taskName) return;

        const res = await apiClient.createActivityType({
            name: taskName.trim(),
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
    };

    const toggleSection = (title: string) => {
        setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
        setActiveSection(title);
    };

    return (
        <div className="view-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Daily Task Library</h2>
                    <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)' }}>
                        Manage daily tasks like modules/lessons: Day on left, task editor on right.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        className="btn-view"
                        onClick={() => {
                            const value = prompt('Set global reward cap', String(userActivityPoints));
                            if (value) {
                                apiClient.setUserActivityPoints(Number(value)).then((res) => {
                                    if (res.success) setUserActivityPoints(res.points);
                                });
                            }
                        }}
                    >
                        Reward Cap: {userActivityPoints}
                    </button>
                    <button className="btn-primary" onClick={() => setShowAddActivityModal(true)}>
                        + Add Activity
                    </button>
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
                                    <div className="card-header">
                                        <h3>Day Settings</h3>
                                    </div>
                                    <div className="card-body">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: 12 }}>
                                            <input
                                                className="premium-input"
                                                value={groupDraft.section_title}
                                                onChange={(e) => setGroupDraft((p) => ({ ...p, section_title: e.target.value }))}
                                                placeholder="Day title (example: Day 1)"
                                            />
                                            <input
                                                className="premium-input"
                                                type="number"
                                                value={groupDraft.section_order}
                                                onChange={(e) => setGroupDraft((p) => ({ ...p, section_order: Number(e.target.value) }))}
                                                placeholder="Order"
                                            />
                                            <button className="btn-premium-primary" onClick={saveGroup}>Update Day</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="editor-card">
                                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, cursor: 'pointer' }} onClick={() => setOpenTaskEditor((prev) => !prev)}>
                                        <h3>{openTaskEditor ? '▾' : '▸'} Task Editor</h3>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button
                                                className="btn-premium-ghost"
                                                style={{ padding: '8px 14px', fontSize: '0.75rem' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenTaskEditor((prev) => !prev);
                                                }}
                                            >
                                                {openTaskEditor ? 'Hide' : 'Expand'}
                                            </button>
                                            <button
                                                className="btn-premium-danger"
                                                style={{ padding: '8px 14px', fontSize: '0.75rem' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteActivity(selectedActivity);
                                                }}
                                            >
                                                Delete Task
                                            </button>
                                        </div>
                                    </div>
                                    {openTaskEditor && (
                                        <div className="card-body">
                                        <div style={{ display: 'grid', gap: 14 }}>
                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
                                                    ACTIVITY
                                                </label>
                                                <input
                                                    className="premium-input"
                                                    value={activityDraft.name}
                                                    onChange={(e) => setActivityDraft((p) => ({ ...p, name: e.target.value }))}
                                                    placeholder="Visualization"
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
                                                    TASK DESCRIPTION
                                                </label>
                                                <textarea
                                                    className="premium-input"
                                                    rows={3}
                                                    value={activityDraft.description}
                                                    onChange={(e) => setActivityDraft((p) => ({ ...p, description: e.target.value }))}
                                                    placeholder="Write task instructions for the user..."
                                                    style={{ resize: 'vertical' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
                                                    VIDEO/REEL SCRIPT IDEA
                                                </label>
                                                <textarea
                                                    className="premium-input"
                                                    rows={3}
                                                    value={activityDraft.script_idea}
                                                    onChange={(e) => setActivityDraft((p) => ({ ...p, script_idea: e.target.value }))}
                                                    placeholder="Founder explains a client scenario..."
                                                    style={{ resize: 'vertical' }}
                                                />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px 120px', gap: 12 }}>
                                                <div>
                                                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
                                                        DAY TITLE
                                                    </label>
                                                    <input
                                                        className="premium-input"
                                                        value={activityDraft.section_title}
                                                        onChange={(e) => setActivityDraft((p) => ({ ...p, section_title: e.target.value }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
                                                        POINTS
                                                    </label>
                                                    <input
                                                        className="premium-input"
                                                        type="number"
                                                        value={activityDraft.points}
                                                        onChange={(e) => setActivityDraft((p) => ({ ...p, points: Number(e.target.value) }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
                                                        DAY ORDER
                                                    </label>
                                                    <input
                                                        className="premium-input"
                                                        type="number"
                                                        value={activityDraft.section_order}
                                                        onChange={(e) => setActivityDraft((p) => ({ ...p, section_order: Number(e.target.value) }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
                                                        ITEM ORDER
                                                    </label>
                                                    <input
                                                        className="premium-input"
                                                        type="number"
                                                        value={activityDraft.item_order}
                                                        onChange={(e) => setActivityDraft((p) => ({ ...p, item_order: Number(e.target.value) }))}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <button className="btn-premium-primary" onClick={saveActivity}>Update Task</button>
                                            </div>
                                        </div>
                                    </div>
                                    )}
                                </div>

                                <div className="editor-card">
                                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, cursor: 'pointer' }} onClick={() => setOpenDayWiseEditor((prev) => !prev)}>
                                        <h3>{openDayWiseEditor ? '▾' : '▸'} Day-wise Popup Content</h3>
                                        <button
                                            className="btn-premium-ghost"
                                            style={{ padding: '8px 14px', fontSize: '0.75rem' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDayWiseEditor((prev) => !prev);
                                            }}
                                        >
                                            {openDayWiseEditor ? 'Hide' : 'Expand'}
                                        </button>
                                    </div>
                                    {openDayWiseEditor && (
                                        <div className="card-body">
                                        <div style={{ display: 'grid', gap: 14 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '180px auto', gap: 12, alignItems: 'end' }}>
                                                <div>
                                                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
                                                        DAY NUMBER
                                                    </label>
                                                    <input
                                                        className="premium-input"
                                                        type="number"
                                                        value={selectedDayNumber}
                                                        onChange={(e) => setSelectedDayNumber(Math.max(1, Number(e.target.value || 1)))}
                                                    />
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '12px', paddingBottom: 8 }}>
                                                    This content shows in app popup when user opens this activity on the selected day.
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
                                                    TASK DESCRIPTION (DAY {selectedDayNumber})
                                                </label>
                                                <textarea
                                                    className="premium-input"
                                                    rows={3}
                                                    value={dayLogDraft.task_description}
                                                    onChange={(e) => setDayLogDraft((p) => ({ ...p, task_description: e.target.value }))}
                                                    placeholder="Imagine confidently handling a real estate scenario..."
                                                    style={{ resize: 'vertical' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
                                                    VIDEO/REEL SCRIPT IDEA (DAY {selectedDayNumber})
                                                </label>
                                                <textarea
                                                    className="premium-input"
                                                    rows={3}
                                                    value={dayLogDraft.script_idea}
                                                    onChange={(e) => setDayLogDraft((p) => ({ ...p, script_idea: e.target.value }))}
                                                    placeholder="Founder explains a real client situation..."
                                                    style={{ resize: 'vertical' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
                                                    FEEDBACK (OPTIONAL)
                                                </label>
                                                <input
                                                    className="premium-input"
                                                    value={dayLogDraft.feedback}
                                                    onChange={(e) => setDayLogDraft((p) => ({ ...p, feedback: e.target.value }))}
                                                    placeholder="Optional coach note"
                                                />
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <button className="btn-premium-primary" onClick={saveDailyLogForDay}>
                                                    Save Day {selectedDayNumber} Content
                                                </button>
                                            </div>

                                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 14 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block' }}>
                                                        BULK IMPORT (TAB-SEPARATED)
                                                    </label>
                                                    <button
                                                        className="btn-premium-ghost"
                                                        style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                                                        onClick={() => setOpenBulkImport((prev) => !prev)}
                                                    >
                                                        {openBulkImport ? 'Hide Bulk' : 'Expand Bulk'}
                                                    </button>
                                                </div>

                                                {openBulkImport && (
                                                    <>
                                                        {selectedActivity?.name?.toLowerCase().includes('visual') && (
                                                            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'flex-end' }}>
                                                                <button className="btn-premium-ghost" onClick={loadVisualization60DayTemplate}>
                                                                    Load 60-Day Visualization Template
                                                                </button>
                                                            </div>
                                                        )}
                                                        <textarea
                                                            className="premium-input"
                                                            rows={6}
                                                            value={bulkDayLogText}
                                                            onChange={(e) => setBulkDayLogText(e.target.value)}
                                                            placeholder={"Examples:\n1\tTask description\tVideo/Reel script idea\tFeedback(optional)\n2\tTask description\tVideo/Reel script idea"}
                                                            style={{ resize: 'vertical' }}
                                                        />
                                                        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                                                            <button className="btn-premium-ghost" onClick={importBulkDayLogs}>
                                                                Import Bulk Day Logs
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 14 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', display: 'block' }}>
                                                        SAVED DAY LOGS
                                                    </label>
                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                                            {savedDayLogs.length} day(s)
                                                        </span>
                                                        <button className="btn-premium-ghost" style={{ padding: '6px 12px', fontSize: '0.72rem' }} onClick={refreshSavedDayLogs}>
                                                            Refresh
                                                        </button>
                                                    </div>
                                                </div>

                                                {isLoadingSavedDayLogs ? (
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Loading saved logs...</div>
                                                ) : savedDayLogs.length === 0 ? (
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                                        No saved day logs yet. Save day 1/day 2 and they will appear here.
                                                    </div>
                                                ) : (
                                                    <div style={{ maxHeight: 300, overflowY: 'auto', display: 'grid', gap: 8 }}>
                                                        {savedDayLogs.map((entry) => (
                                                            <button
                                                                key={entry.day_number}
                                                                onClick={() => setSelectedDayNumber(entry.day_number)}
                                                                style={{
                                                                    background: selectedDayNumber === entry.day_number ? 'rgba(102,126,234,0.12)' : 'rgba(255,255,255,0.02)',
                                                                    border: selectedDayNumber === entry.day_number ? '1px solid rgba(102,126,234,0.5)' : '1px solid var(--glass-border)',
                                                                    borderRadius: 10,
                                                                    textAlign: 'left',
                                                                    padding: '10px 12px',
                                                                    cursor: 'pointer',
                                                                    color: 'var(--text-main)',
                                                                }}
                                                                title="Click to load this day into editor"
                                                            >
                                                                <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: 4 }}>
                                                                    Day {entry.day_number}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                    {(entry.task_description || '').slice(0, 90) || '(No task description)'}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 3 }}>
                                                                    {(entry.script_idea || '').slice(0, 90) || '(No script idea)'}
                                                                </div>
                                                            </button>
                                                        ))}
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
        </div>
    );
};

export default MomentumPage;
