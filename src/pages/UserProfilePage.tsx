import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import type { User } from '../types';
import { MomentumChart } from '../components/MomentumChart';
import HotLeadFlowModal from '../components/HotLeadFlowModal';
import {
    parseHotLeadNotesMeta,
    formatPipelineStage,
    sourceBadgeMeta,
    formatCrmFlowBucketsHint,
    formatCommission,
} from '../lib/dealRoomFormatters';

interface UserProfilePageProps {
    user: User;
    setActiveTab: (tab: any) => void;
    onBack: () => void;
}

interface RevenueMetrics {
    hot_leads: number;
    deals_closed: number;
    total_commission: number;
    top_source: string | null;
    recent_activity: any[];
}

type LearningFilter = 'all' | 'courses' | 'exams' | 'materials';

const MOMENTUM_CHART_LS = 'realtorone-momentum-chart-variant';

const UserProfilePage: React.FC<UserProfilePageProps> = ({ user, onBack, setActiveTab }) => {
    const [performance, setPerformance] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
    const [aiUsage, setAiUsage] = useState<{ ai_tokens_today: number; ai_calls_today: number; ai_tokens_total: number; ai_calls_total: number } | null>(null);
    const [resultsHotLeads, setResultsHotLeads] = useState<any[]>([]);
    const [resultsDealsClosed, setResultsDealsClosed] = useState<any[]>([]);
    const [expandedMetric, setExpandedMetric] = useState<'hot_leads' | 'deals_closed' | 'commission' | 'top_source' | null>(null);
    const [, setLoading] = useState(false);
    const [viewRange, setViewRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [momentumChartVariant, setMomentumChartVariant] = useState<'bars' | 'lines'>(() => {
        if (typeof window === 'undefined') return 'bars';
        try {
            const v = window.localStorage.getItem(MOMENTUM_CHART_LS);
            if (v === 'bars' || v === 'lines') return v;
        } catch {
            /* ignore */
        }
        return 'bars';
    });
    const [expandedDays, setExpandedDays] = useState<string[]>([]);
    const [learningData, setLearningData] = useState<{
        subscription: { package_name: string; expires_at: string } | null;
        course_progress: any[];
        exam_attempts: any[];
        material_progress: any[];
    } | null>(null);
    const [learningFilter, setLearningFilter] = useState<LearningFilter>('all');
    const [hotLeadFlowModal, setHotLeadFlowModal] = useState<Record<string, unknown> | null>(null);
    const [dealRoomExcelMenuOpen, setDealRoomExcelMenuOpen] = useState(false);
    const [dealRoomExcelImporting, setDealRoomExcelImporting] = useState(false);
    const [userTimezone, setUserTimezone] = useState(user.timezone || 'UTC');
    const [savingTimezone, setSavingTimezone] = useState(false);
    const dealRoomExcelInputRef = useRef<HTMLInputElement>(null);
    const dealRoomExcelMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!dealRoomExcelMenuOpen) return;
        const onDoc = (ev: MouseEvent) => {
            const el = dealRoomExcelMenuRef.current;
            if (el && !el.contains(ev.target as Node)) {
                setDealRoomExcelMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [dealRoomExcelMenuOpen]);

    useEffect(() => {
        try {
            window.localStorage.setItem(MOMENTUM_CHART_LS, momentumChartVariant);
        } catch {
            /* ignore */
        }
    }, [momentumChartVariant]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const emptyLearningData = {
                    subscription: null,
                    course_progress: [],
                    exam_attempts: [],
                    material_progress: [],
                };

                const [perfRes, actRes, revRes, courseRes, aiRes] = await Promise.all([
                    apiClient.getUserPerformance(user.id),
                    apiClient.getUserActivities(user.id),
                    apiClient.getUserRevenueMetrics(user.id).catch(() => ({ success: false, data: null })),
                    apiClient.getUserCourseDetail(user.id).catch(() => ({ success: false, data: null })),
                    apiClient.getAdminAiUserUsage(user.id).catch(() => ({ success: false, data: null })),
                ]);

                if (perfRes.success) {
                    setPerformance(perfRes.data.reverse());
                }
                if (actRes.success) {
                    setActivities(actRes.data);
                }
                if (revRes.success && revRes.data) {
                    setRevenueMetrics(revRes.data);
                }
                if (courseRes.success && courseRes.data) {
                    setLearningData(courseRes.data);
                } else {
                    // Prevent the "Loading learning data…" state from staying forever.
                    setLearningData((prev) => prev ?? emptyLearningData);
                }
                if ((aiRes as any)?.success && (aiRes as any)?.data) {
                    setAiUsage((aiRes as any).data);
                }
            } catch (error) {
                console.error('Failed to sync operator data', error);
            } finally {
                setLoading(false);
            }
        };
        
        // Initial fetch
        fetchData();
        
        // Auto-refresh every 3 seconds to sync with mobile app updates
        const intervalId = setInterval(fetchData, 3000);
        
        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
    }, [user.id]);

    const fetchMetricDetails = async (metric: 'hot_leads' | 'deals_closed') => {
        try {
            const res = await apiClient.getUserResults(user.id, { type: metric === 'hot_leads' ? 'hot_lead' : 'deal_closed' });
            if (res.success) {
                if (metric === 'hot_leads') setResultsHotLeads(res.data);
                else setResultsDealsClosed(res.data);
            }
        } catch (e) {
            console.error('Failed to fetch metric details', e);
        }
    };

    const toggleMetricExpand = (metric: 'hot_leads' | 'deals_closed' | 'commission' | 'top_source') => {
        if (expandedMetric === metric) {
            setExpandedMetric(null);
        } else {
            setExpandedMetric(metric);
            if (metric === 'hot_leads') fetchMetricDetails('hot_leads');
            if (metric === 'deals_closed' || metric === 'commission') fetchMetricDetails('deals_closed');
        }
    };

    const onDealRoomExcelFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.xlsx')) {
            window.alert('Please choose an Excel .xlsx file.');
            return;
        }
        setDealRoomExcelImporting(true);
        try {
            const res = await apiClient.adminImportDealRoomExcel(user.id, file);
            if (res.success) {
                const rev = await apiClient.getUserRevenueMetrics(user.id);
                if (rev.success && rev.data) {
                    setRevenueMetrics(rev.data);
                }
                await fetchMetricDetails('hot_leads');
                setExpandedMetric('hot_leads');
                window.alert(res.message ?? 'Import complete.');
            } else {
                window.alert(res.message ?? 'Import failed.');
            }
        } catch (err) {
            console.error(err);
            window.alert('Import failed.');
        } finally {
            setDealRoomExcelImporting(false);
            setDealRoomExcelMenuOpen(false);
        }
    };

    const toggleDay = (date: string) => {
        setExpandedDays(prev =>
            prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
        );
    };

    const handleTimezoneChange = async (newTz: string) => {
        setUserTimezone(newTz);
        setSavingTimezone(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${apiClient.getBaseUrl()}/admin/users/${user.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ timezone: newTz })
            });
            const data = await res.json();
            if (data.success) {
                // profile updated
            } else {
                alert('Failed to update timezone');
            }
        } catch (e) {
            console.error(e);
            alert('Error updating timezone');
        } finally {
            setSavingTimezone(false);
        }
    };

    const getChartData = () => {
        if (performance.length === 0) return [];

        const chronological = [...performance].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        if (viewRange === 'daily') {
            const last7 = chronological.slice(-7);
            return last7.map(p => {
                const dt = new Date(p.date);
                return {
                    label: dt.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
                    sublabel: dt.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
                    value: p.total_momentum_score,
                    subco: p.subconscious_score,
                    conscious: p.conscious_score,
                    date: p.date
                };
            });
        }

        if (viewRange === 'weekly') {
            const weeks: any[] = [];
            for (let i = 0; i < chronological.length; i += 7) {
                const slice = chronological.slice(i, i + 7);
                if (slice.length === 0) continue;
                const avgSub = Math.round(slice.reduce((acc, curr) => acc + curr.subconscious_score, 0) / slice.length);
                const avgCon = Math.round(slice.reduce((acc, curr) => acc + curr.conscious_score, 0) / slice.length);
                const avgTotal = Math.round(slice.reduce((acc, curr) => acc + curr.total_momentum_score, 0) / slice.length);
                weeks.push({
                    label: `WEEK ${weeks.length + 1}`,
                    sublabel: '',
                    value: avgTotal,
                    subco: avgSub,
                    conscious: avgCon
                });
            }
            return weeks.slice(-10);
        }

        if (viewRange === 'monthly') {
            const months: { [key: string]: { rows: any[]; sortKey: number } } = {};
            chronological.forEach(p => {
                const dt = new Date(p.date);
                const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
                if (!months[key]) {
                    months[key] = { rows: [], sortKey: dt.getTime() };
                }
                months[key].rows.push(p);
            });
            return Object.values(months)
                .sort((a, b) => a.sortKey - b.sortKey)
                .map(({ rows, sortKey }) => {
                    const dt = new Date(sortKey);
                    const name = dt.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                    return {
                        label: name,
                        sublabel: String(dt.getFullYear()),
                        value: Math.round(rows.reduce((acc, curr) => acc + curr.total_momentum_score, 0) / rows.length),
                        subco: Math.round(rows.reduce((acc, curr) => acc + curr.subconscious_score, 0) / rows.length),
                        conscious: Math.round(rows.reduce((acc, curr) => acc + curr.conscious_score, 0) / rows.length)
                    };
                });
        }

        return [];
    };

    const activityData = getChartData();
    /** Scores are 0–100%; use one Y scale so both tracks are comparable and bars use the full plot height. */
    const chartYMax = Math.max(
        100,
        ...activityData.map((d: any) => Math.max(Number(d.conscious ?? 0), Number(d.subco ?? 0), 0))
    );

    const getTierColor = (tier?: string) => {
        switch (tier?.toLowerCase()) {
            case 'titan':
            case 'titan - gold':
            case 'titan-gold':
                return '#F59E0B'; // Gold color
            case 'rainmaker':
                return '#94a3b8'; // Silver/Gray color
            case 'consultant':
                return '#64748B'; // Default gray
            // Legacy support
            case 'diamond': return '#7C3AED';
            case 'platinum': return '#D946EF';
            case 'gold': return '#F59E0B';
            case 'silver': return '#94a3b8';
            default: return 'var(--text-muted)';
        }
    };

    const IconSvg: React.FC<{ name: string; color?: string; size?: number }> = ({ name, color = 'currentColor', size = 18 }) => {
        const common = {
            width: size,
            height: size,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: color,
            strokeWidth: 2,
            strokeLinecap: 'round' as const,
            strokeLinejoin: 'round' as const,
            style: { display: 'block' as const },
        };

        switch (name) {
            case 'growth':
                return (
                    <svg {...common}>
                        <polyline points="3 17 9 11 13 15 21 7" />
                        <polyline points="21 7 21 13 15 13" />
                        <path d="M3 17v4h4" />
                    </svg>
                );
            case 'execution':
                return (
                    <svg {...common}>
                        <path d="M13 2L3 14h8l-1 10 10-12h-8l1-10z" />
                    </svg>
                );
            case 'mindset':
                return (
                    <svg {...common}>
                        <path d="M9 18h6" />
                        <path d="M10 22h4" />
                        <path d="M8 2c-1.5 1-2 3-2 5 0 2 1 3 1 4 0 1-1 2-1 3 0 3 3 4 4 4" />
                        <path d="M16 2c1.5 1 2 3 2 5 0 2-1 3-1 4 0 1 1 2 1 3 0 3-3 4-4 4" />
                        <path d="M12 6v6" />
                    </svg>
                );
            case 'streak':
                return (
                    <svg {...common}>
                        <path d="M12 2s4 4 4 8-4 6-4 12-8-4-8-10 8-10 8-10z" />
                        <path d="M12 22c3 0 6-3 6-6" />
                    </svg>
                );
            case 'hot_leads':
                return (
                    <svg {...common}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                        <circle cx="10" cy="7" r="4" />
                        <path d="M20 8v6" />
                        <path d="M23 11h-6" />
                    </svg>
                );
            case 'deals_closed':
                return (
                    <svg {...common}>
                        <path d="M12 1l7 7-7 7-7-7 7-7z" />
                        <path d="M5 18l-2 3h8l-2-3" />
                        <path d="M19 18l2 3h-8l2-3" />
                    </svg>
                );
            case 'commission':
                return (
                    <svg {...common}>
                        <path d="M12 1v22" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                );
            case 'top_source':
                return (
                    <svg {...common}>
                        <path d="M3 3v18h18" />
                        <path d="M7 14l4-4 4 4 4-6" />
                    </svg>
                );
            case 'package':
                return (
                    <svg {...common}>
                        <path d="M21 16V8a2 2 0 0 0-1-1.73L13 3a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73L11 21a2 2 0 0 0 2 0l7-3.27a2 2 0 0 0 1-1.73z" />
                        <path d="M3.3 7.3L12 12l8.7-4.7" />
                        <path d="M12 22V12" />
                    </svg>
                );
            case 'book':
                return (
                    <svg {...common}>
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M20 22V4a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 4.5v15" />
                        <path d="M8 6h8" />
                        <path d="M8 10h8" />
                    </svg>
                );
            case 'source_whatsapp':
                return (
                    <svg {...common}>
                        <path d="M20 12a8 8 0 0 1-11.8 7l-3.2 1 1-3.2A8 8 0 1 1 20 12z" />
                        <path d="M9.5 9.5c.3 2.2 2.3 4.1 4.5 4.5" />
                        <path d="M14.8 14.5l-1.3.7a1 1 0 0 1-1-.1 9.2 9.2 0 0 1-3.6-3.6 1 1 0 0 1-.1-1l.7-1.3" />
                        <path d="M14 18.3l1.3 1.2 2.6-2.4" />
                    </svg>
                );
            case 'source_phone':
                return (
                    <svg {...common}>
                        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3 19.3 19.3 0 0 1-6-6A19.7 19.7 0 0 1 2.2 4.3 2 2 0 0 1 4.2 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 3a2 2 0 0 1-.5 2.1L8.1 10a16 16 0 0 0 5.9 5.9l1.2-1.3a2 2 0 0 1 2.1-.5c1 .4 2 .6 3 .7A2 2 0 0 1 22 16.9z" />
                    </svg>
                );
            case 'source_instagram':
                return (
                    <svg {...common}>
                        <rect x="3" y="3" width="18" height="18" rx="5" />
                        <circle cx="12" cy="12" r="4" />
                        <circle cx="17.5" cy="6.5" r="1" />
                    </svg>
                );
            case 'source_content':
                return (
                    <svg {...common}>
                        <rect x="3" y="4" width="18" height="15" rx="2" />
                        <path d="M8 10l3 3 5-5" />
                        <path d="M8 19v2h8v-2" />
                    </svg>
                );
            case 'source_referral':
                return (
                    <svg {...common}>
                        <circle cx="9" cy="8" r="3" />
                        <path d="M3 20c.7-2.7 2.8-4 6-4 2.2 0 3.9.6 5 2" />
                        <path d="M15 8h6" />
                        <path d="M18 5l3 3-3 3" />
                    </svg>
                );
            case 'source_default':
                return (
                    <svg {...common}>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 3" />
                    </svg>
                );
            default:
                return <span style={{ fontWeight: 900, color }}>{name}</span>;
        }
    };

    const hotLeadTimelineModal = <HotLeadFlowModal lead={hotLeadFlowModal} onClose={() => setHotLeadFlowModal(null)} />;

    return (
        <>
        <div className="view-container fade-in userprofile-page">
            {user.deletion_requested_at ? (
                <div
                    className="glass-panel"
                    style={{
                        marginBottom: '20px',
                        padding: '16px 20px',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(15, 23, 42, 0.6))',
                    }}
                >
                    <div style={{ fontSize: '0.72rem', fontWeight: 950, letterSpacing: '1px', color: '#fecaca', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Data removal requested (app)
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        This practitioner submitted an account deletion request from the mobile app on{' '}
                        <strong style={{ color: 'var(--text-main)' }}>
                            {new Date(user.deletion_requested_at).toLocaleString()}
                        </strong>
                        . Their account is inactive until you complete your privacy process (purge data or re-open the account from Registry).
                    </p>
                </div>
            ) : null}
            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                <button
                    onClick={onBack}
                    className="btn-view"
                    style={{
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '16px',
                        color: 'var(--text-main)',
                        fontWeight: 950,
                        fontSize: '0.7rem',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    REGISTRY ARCHIVE
                </button>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '10px 20px', borderRadius: '15px', border: '1px solid var(--glass-border)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '1px' }}>
                        SYSTEM STATUS: <span style={{ color: user.status === 'active' ? 'var(--success)' : 'var(--error)' }}>{user.status?.toUpperCase()}</span>
                    </div>
                </div>
            </div>

            <div className="userprofile-grid">
                {/* Left Tactical Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass-panel" style={{ 
                        padding: '32px 24px', 
                        textAlign: 'center', 
                        position: 'relative',
                        background: `linear-gradient(135deg, ${getTierColor(user.membership_tier)}08, transparent)`,
                        border: `1px solid ${getTierColor(user.membership_tier)}30`
                    }}>
                        <div style={{ 
                            position: 'absolute', 
                            inset: 0, 
                            opacity: 0.05, 
                            pointerEvents: 'none', 
                            background: `radial-gradient(circle at top right, ${getTierColor(user.membership_tier)}, transparent)` 
                        }}></div>

                        <div style={{ 
                            width: '140px', 
                            height: '140px', 
                            margin: '0 auto 25px auto', 
                            borderRadius: '30%', 
                            background: `linear-gradient(135deg, ${getTierColor(user.membership_tier)}30, ${getTierColor(user.membership_tier)}10)`, 
                            padding: '4px', 
                            border: `2px solid ${getTierColor(user.membership_tier)}50`,
                            boxShadow: `0 8px 30px ${getTierColor(user.membership_tier)}30`,
                            position: 'relative'
                        }}>
                            <div className="avatar-chip" style={{ 
                                width: '100%', 
                                height: '100%', 
                                borderRadius: 'inherit', 
                                fontSize: '3.8rem', 
                                fontWeight: 950, 
                                boxShadow: 'none',
                                background: 'var(--bg-card)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: getTierColor(user.membership_tier)
                            }}>
                                {(user.name || 'U').substring(0, 1)}
                            </div>
                        </div>

                        <h2 style={{ 
                            fontSize: '1.9rem', 
                            fontWeight: 950, 
                            margin: '0 0 8px 0', 
                            letterSpacing: '-0.5px',
                            background: `linear-gradient(135deg, ${getTierColor(user.membership_tier)}, var(--text-main))`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>{user.name}</h2>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '25px' }}>{user.email}</span>

                        <div style={{ 
                            display: 'inline-flex', 
                            padding: '10px 24px', 
                            borderRadius: '30px', 
                            background: `${getTierColor(user.membership_tier)}20`, 
                            border: `2px solid ${getTierColor(user.membership_tier)}50`, 
                            color: getTierColor(user.membership_tier), 
                            fontSize: '0.7rem', 
                            fontWeight: 950, 
                            letterSpacing: '1.5px', 
                            marginBottom: '40px',
                            boxShadow: `0 4px 15px ${getTierColor(user.membership_tier)}30`,
                            textTransform: 'uppercase'
                        }}>
                            {user.membership_tier?.replace(' - ', '-').toUpperCase() || 'CONSULTANT'} OPERATOR
                        </div>

                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '20px', padding: '30px 0', borderTop: '1px solid var(--glass-border)' }}>
                            <div style={{ opacity: 0.8 }}>
                                <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Contact Intelligence</span>
                                <div style={{ fontSize: '1rem', fontWeight: 950, letterSpacing: '0.5px' }}>{user.phone_number || 'SECURE_UNKNOWN'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>OPERATOR_UID: {user.id}</div>
                            </div>
                            <div style={{ opacity: 0.8 }}>
                                <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Operational License</span>
                                <div style={{ fontSize: '1rem', fontWeight: 950, letterSpacing: '0.5px' }}>{user.license_number || 'PENDING_VERIFICATION'}</div>
                            </div>
                            <div style={{ opacity: 0.8 }}>
                                <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Registry Entry</span>
                                <div style={{ fontSize: '1rem', fontWeight: 950, letterSpacing: '0.5px' }}>{user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'LEGACY_ARCHIVE'}</div>
                            </div>
                            <div style={{ opacity: 0.9 }}>
                                <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Operational Timezone</span>
                                <div style={{ position: 'relative' }}>
                                    <select 
                                        value={userTimezone} 
                                        onChange={(e) => handleTimezoneChange(e.target.value)}
                                        disabled={savingTimezone}
                                        className="premium-input-mini"
                                        style={{ 
                                            width: '100%', 
                                            fontSize: '0.85rem', 
                                            fontWeight: 700,
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            padding: '8px 12px',
                                            borderRadius: '10px'
                                        }}
                                    >
                                        <option value="UTC">UTC (Universal)</option>
                                        <option value="America/New_York">Eastern (ET)</option>
                                        <option value="America/Chicago">Central (CT)</option>
                                        <option value="America/Denver">Mountain (MT)</option>
                                        <option value="America/Los_Angeles">Pacific (PT)</option>
                                        <option value="Europe/London">London (GMT/BST)</option>
                                        <option value="Asia/Karachi">Karachi (PKT)</option>
                                        <option value="Asia/Kolkata">India (IST)</option>
                                        <option value="Asia/Dubai">Dubai (GST)</option>
                                        <option value="Australia/Sydney">Sydney (AEST)</option>
                                    </select>
                                    {savingTimezone && (
                                        <div style={{ position: 'absolute', right: 10, top: 10, fontSize: '10px', color: 'var(--primary)' }}>Saving...</div>
                                    )}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4, fontWeight: 700 }}>Reminders will adjust to this local time</div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ 
                        padding: '28px',
                        background: `linear-gradient(135deg, ${getTierColor(user.membership_tier)}05, transparent)`,
                        border: `1px solid ${getTierColor(user.membership_tier)}20`
                    }}>
                        <h4 style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px', 
                            fontSize: '0.7rem', 
                            fontWeight: 950, 
                            marginBottom: '22px', 
                            textTransform: 'uppercase', 
                            letterSpacing: '2px', 
                            color: getTierColor(user.membership_tier)
                        }}>
                            <div style={{ 
                                width: '4px', 
                                height: '12px', 
                                background: getTierColor(user.membership_tier), 
                                borderRadius: '10px',
                                boxShadow: `0 0 8px ${getTierColor(user.membership_tier)}50`
                            }}></div>
                            System Diagnostics
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {[
                                { l: 'Professional Branding', k: 'branding' as const, c: 'var(--primary)' },
                                { l: 'Lead Gen System', k: 'lead_gen' as const, c: '#a855f7' },
                                { l: 'Sales Conversion', k: 'sales' as const, c: 'var(--success)' },
                                { l: 'Mental Infrastructure', k: 'mindset' as const, c: '#f59e0b' }
                            ].map(p => {
                                const score = user.diagnosis_scores ? (user.diagnosis_scores[p.k] || 0) : 0;
                                return (
                                    <div key={p.k}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'flex-end' }}>
                                            <span style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--text-main)' }}>{p.l}</span>
                                            <span style={{ fontWeight: 950, color: p.c, fontSize: '0.85rem' }}>{score}%</span>
                                        </div>
                                        <div style={{ height: '8px', width: '100%', background: 'var(--bg-app)', borderRadius: '10px', padding: '2px', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ height: '100%', width: `${score}%`, background: p.c, borderRadius: 'inherit', boxShadow: `0 0 15px ${p.c}40` }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="glass-panel" style={{
                        padding: '22px 24px',
                        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), transparent)',
                        border: '1px solid rgba(79, 70, 229, 0.22)',
                    }}>
                        <h4 style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '0.7rem',
                            fontWeight: 950,
                            marginBottom: '16px',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            color: 'var(--primary)'
                        }}>
                            <div style={{
                                width: '4px',
                                height: '12px',
                                background: 'var(--primary)',
                                borderRadius: '10px',
                                boxShadow: '0 0 10px rgba(79, 70, 229, 0.55)'
                            }}></div>
                            AI Usage
                        </h4>
                        {aiUsage ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
                                    <div style={{ fontWeight: 950, color: 'var(--text-main)' }}>
                                        {aiUsage.ai_tokens_today.toLocaleString()} TK <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800 }}>today</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 850 }}>
                                        {aiUsage.ai_calls_today.toLocaleString()} calls
                                    </div>
                                </div>
                                <div style={{ height: 8, width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(100, Math.round((aiUsage.ai_tokens_today / 50000) * 100))}%`, background: 'linear-gradient(90deg, rgba(79,70,229,0.9), rgba(0,224,150,0.85))', borderRadius: 999 }} />
                                </div>
                                <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 750 }}>
                                    Total: {aiUsage.ai_tokens_total.toLocaleString()} TK · {aiUsage.ai_calls_total.toLocaleString()} calls
                                </div>
                            </>
                        ) : (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.75 }}>No AI usage data.</div>
                        )}
                    </div>
                </div>

                {/* Main Performance Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                        {[
                            { label: 'AGGREGATE GROWTH', value: `${user.growth_score ?? 0}%`, hint: 'Overall momentum score (0–100%) on the user record.', iconKey: 'growth', color: 'var(--primary)' },
                            { label: 'EXECUTION RATE', value: `${user.execution_rate ?? 0}%`, hint: 'Task completion rate (0–100%) updated as they log activities.', iconKey: 'execution', color: 'var(--success)' },
                            { label: 'MINDSET INDEX', value: user.mindset_index ?? 0, hint: 'Identity / mindset track index.', iconKey: 'mindset', color: '#f59e0b' },
                            { label: 'CURRENT STREAK', value: `${user.current_streak ?? 0}D`, hint: 'Consecutive days with logged activity.', iconKey: 'streak', color: '#ef4444' },
                        ].map((stat, i) => (
                            <div key={i} className="glass-panel" style={{ 
                                padding: '25px', 
                                border: `1px solid ${stat.color}30`, 
                                background: `linear-gradient(135deg, ${stat.color}08, transparent)`,
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = `0 8px 25px ${stat.color}30`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            title={stat.hint}
                            >
                                <div style={{ 
                                    position: 'absolute', 
                                    top: -20, 
                                    right: -20, 
                                    width: '80px', 
                                    height: '80px', 
                                    borderRadius: '50%', 
                                    background: `radial-gradient(circle, ${stat.color}10, transparent)`,
                                    opacity: 0.5
                                }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', position: 'relative' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--text-muted)', letterSpacing: '1px' }}>{stat.label}</span>
                                    <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
                                        <IconSvg name={stat.iconKey} color={stat.color} size={18} />
                                    </span>
                                </div>
                                {/* Solid color — gradient text clip was invisible for some CSS-variable colors (looked “empty” at 0%). */}
                                <div style={{ 
                                    fontSize: '2.4rem', 
                                    fontWeight: 950, 
                                    letterSpacing: '-1px',
                                    color: stat.color,
                                    position: 'relative',
                                    lineHeight: 1.1,
                                }}>{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Learning & courses — clean layout: package, courses, exams, materials */}
                    <div className="glass-panel" style={{
                        padding: '28px 32px',
                        background: 'linear-gradient(160deg, rgba(99, 102, 241, 0.08) 0%, transparent 50%)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '20px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ width: '4px', height: '20px', background: '#6366f1', borderRadius: '4px' }} />
                                    Learning & courses
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: 500 }}>Package, course progress, exams, and video watch status</p>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-app)', padding: '4px', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                                {(['all', 'courses', 'exams', 'materials'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setLearningFilter(f)}
                                        style={{
                                            padding: '10px 18px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            background: learningFilter === f ? '#6366f1' : 'transparent',
                                            color: learningFilter === f ? '#fff' : 'var(--text-muted)',
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {f === 'all' ? 'All' : f === 'courses' ? 'Courses' : f === 'exams' ? 'Exams' : 'Watching'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!learningData ? (
                            <div style={{
                                padding: '48px 24px',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                fontSize: '0.9rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '14px'
                            }}>
                                <div className="loader" style={{ width: '36px', height: '36px', borderWidth: '3px', borderColor: 'var(--glass-border)', borderTopColor: '#6366f1' }} />
                                <span>Loading learning data…</span>
                            </div>
                        ) : (
                            <>
                                {/* Package — only when All or Courses */}
                                {(learningFilter === 'all' || learningFilter === 'courses') && learningData.subscription && (
                                    <div style={{
                                        marginBottom: '24px',
                                        padding: '16px 20px',
                                        background: 'rgba(99, 102, 241, 0.12)',
                                        borderRadius: '14px',
                                        border: '1px solid rgba(99, 102, 241, 0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <IconSvg name="package" color="#6366f1" size={20} />
                                            </span>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Current package</div>
                                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#6366f1' }}>{learningData.subscription.package_name}</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                            Expires {new Date(learningData.subscription.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </div>
                                )}

                                {/* Course progress — table-style */}
                                {(learningFilter === 'all' || learningFilter === 'courses') && learningData.course_progress.length > 0 && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Course progress</div>
                                        <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                <thead>
                                                    <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)' }}>Course</th>
                                                        <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', width: '90px' }}>Progress</th>
                                                        <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', width: '120px' }}>Status</th>
                                                        <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', width: '110px' }}>Last accessed</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {learningData.course_progress.map((p: any, i: number) => (
                                                        <tr key={i} style={{ borderBottom: i < learningData.course_progress.length - 1 ? '1px solid var(--glass-border)' : 'none', background: 'var(--bg-card)' }}>
                                                            <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)' }}>{p.course_title}</td>
                                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                                <span style={{ fontWeight: 800, color: '#6366f1' }}>{p.progress_percent}%</span>
                                                            </td>
                                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    padding: '4px 12px',
                                                                    borderRadius: '20px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 700,
                                                                    background: p.is_completed ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-app)',
                                                                    color: p.is_completed ? 'var(--success)' : 'var(--text-muted)'
                                                                }}>
                                                                    {p.is_completed ? 'Completed' : 'In progress'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                {p.last_accessed_at ? new Date(p.last_accessed_at).toLocaleDateString() : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Exam attempts — table-style */}
                                {(learningFilter === 'all' || learningFilter === 'exams') && learningData.exam_attempts.length > 0 && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Exam attempts</div>
                                        <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                <thead>
                                                    <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)' }}>Course</th>
                                                        <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', width: '80px' }}>Score</th>
                                                        <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', width: '100px' }}>Result</th>
                                                        <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', width: '140px' }}>Submitted</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {learningData.exam_attempts.map((a: any, i: number) => (
                                                        <tr key={i} style={{ borderBottom: i < learningData.exam_attempts.length - 1 ? '1px solid var(--glass-border)' : 'none', background: 'var(--bg-card)' }}>
                                                            <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)' }}>{a.course_title}</td>
                                                            <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: a.passed ? 'var(--success)' : '#f59e0b' }}>{a.score_percent}%</td>
                                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    padding: '4px 12px',
                                                                    borderRadius: '20px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 700,
                                                                    background: a.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                                                    color: a.passed ? 'var(--success)' : '#f59e0b'
                                                                }}>
                                                                    {a.passed ? 'Passed' : 'Not passed'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                {new Date(a.submitted_at).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Materials / watching — table-style */}
                                {(learningFilter === 'all' || learningFilter === 'materials') && learningData.material_progress.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Videos & materials (watch status)</div>
                                        <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--glass-border)', maxHeight: '320px', overflowY: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-app)' }}>
                                                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                        <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)' }}>Course · Module</th>
                                                        <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)' }}>Material</th>
                                                        <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', width: '70px' }}>Type</th>
                                                        <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted)', width: '100px' }}>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {learningData.material_progress.map((m: any, i: number) => (
                                                        <tr key={i} style={{ borderBottom: i < learningData.material_progress.length - 1 ? '1px solid var(--glass-border)' : 'none', background: 'var(--bg-card)' }}>
                                                            <td style={{ padding: '12px 16px' }}>
                                                                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{m.course_title}</div>
                                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{m.module_title}</div>
                                                            </td>
                                                            <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-main)' }}>{m.material_title || m.material_type}</td>
                                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                                <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '8px', background: m.material_type === 'Video' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-app)', color: '#6366f1', fontWeight: 700 }}>{m.material_type}</span>
                                                            </td>
                                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                                {m.is_completed ? (
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)' }}>✓ Done</span>
                                                                ) : (
                                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Watched {Math.floor((m.progress_seconds || 0) / 60)} min</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Empty states */}
                                {learningFilter === 'all' && !learningData.subscription && learningData.course_progress.length === 0 && learningData.exam_attempts.length === 0 && learningData.material_progress.length === 0 && (
                                    <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        <div style={{ marginBottom: '10px', opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <IconSvg name="book" color="var(--primary)" size={40} />
                                        </div>
                                        <div style={{ fontWeight: 600 }}>No course or exam activity yet</div>
                                        <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>Progress and exam attempts will appear here once the user starts learning.</div>
                                    </div>
                                )}
                                {learningFilter === 'courses' && !learningData.subscription && learningData.course_progress.length === 0 && (
                                    <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No course progress for this filter.</div>
                                )}
                                {learningFilter === 'exams' && learningData.exam_attempts.length === 0 && (
                                    <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No exam attempts for this filter.</div>
                                )}
                                {learningFilter === 'materials' && learningData.material_progress.length === 0 && (
                                    <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No video or material watch data for this filter.</div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="glass-panel" style={{ padding: '22px 24px 28px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
                            <div style={{ minWidth: 0 }}>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 950, margin: 0, letterSpacing: '-0.5px' }}>Behavioral Momentum Path</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 600, lineHeight: 1.4 }}>{
                                    viewRange === 'daily' ? 'Last 7 days · conscious vs identity completion (%)' :
                                        viewRange === 'weekly' ? 'Weekly averages · strategic momentum' :
                                            'Monthly averages · long-term arc'
                                }</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '5px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                        {(['daily', 'weekly', 'monthly'] as const).map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setViewRange(r)}
                                                style={{
                                                    padding: '8px 18px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 950,
                                                    background: viewRange === r ? 'var(--primary)' : 'transparent',
                                                    color: viewRange === r ? 'white' : 'var(--text-muted)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    textTransform: 'uppercase',
                                                    transition: 'all 0.3s'
                                                }}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                    <div
                                        style={{ display: 'flex', background: 'var(--bg-app)', padding: '5px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}
                                        title="Switch between grouped bars and momentum curves"
                                    >
                                        {([
                                            ['bars', 'Bars'] as const,
                                            ['lines', 'Curve'] as const,
                                        ]).map(([key, label]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setMomentumChartVariant(key)}
                                                style={{
                                                    padding: '8px 16px',
                                                    fontSize: '0.68rem',
                                                    fontWeight: 950,
                                                    background: momentumChartVariant === key ? 'linear-gradient(135deg, #7e22ce, #d946ef)' : 'transparent',
                                                    color: momentumChartVariant === key ? 'white' : 'var(--text-muted)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.04em',
                                                    transition: 'all 0.25s',
                                                }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', fontWeight: 950 }} title="Conscious / business track">
                                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#7e22ce' }}></div> CONSCIOUS
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', fontWeight: 950 }} title="Identity / mindset track">
                                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#d946ef' }}></div> IDENTITY
                                    </div>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', opacity: 0.85 }}>Y: 0–{chartYMax}%</span>
                                </div>
                            </div>
                        </div>

                        {activityData.length === 0 ? (
                            <div style={{ padding: '48px 16px', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>No performance data yet.</div>
                        ) : (
                            <MomentumChart
                                variant={momentumChartVariant}
                                yMax={chartYMax}
                                data={activityData.map((d: { label: string; sublabel?: string; conscious: number; subco: number }) => ({
                                    label: d.label,
                                    sublabel: d.sublabel,
                                    conscious: Number(d.conscious ?? 0),
                                    subco: Number(d.subco ?? 0),
                                }))}
                            />
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
                        <div className="glass-panel" style={{ 
                            padding: '28px', 
                            background: `linear-gradient(135deg, ${getTierColor(user.membership_tier)}08, transparent)`,
                            border: `1px solid ${getTierColor(user.membership_tier)}30`,
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ 
                                position: 'absolute', 
                                top: -50, 
                                right: -50, 
                                width: '200px', 
                                height: '200px', 
                                borderRadius: '50%', 
                                background: `radial-gradient(circle, ${getTierColor(user.membership_tier)}15, transparent)`,
                                opacity: 0.5
                            }}></div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 950, marginBottom: '40px', letterSpacing: '0.5px', position: 'relative' }}>Global Ranking Status</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '40px', position: 'relative' }}>
                                <div style={{
                                    width: '120px',
                                    height: '120px',
                                    borderRadius: '30%',
                                    background: `linear-gradient(135deg, ${getTierColor(user.membership_tier)}20, ${getTierColor(user.membership_tier)}05)`,
                                    border: `2px solid ${getTierColor(user.membership_tier)}40`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: `0 8px 30px ${getTierColor(user.membership_tier)}30`,
                                    position: 'relative'
                                }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '4px' }}>TIER</span>
                                    <div style={{ 
                                        fontSize: '1.8rem', 
                                        fontWeight: 950, 
                                        color: getTierColor(user.membership_tier), 
                                        lineHeight: 1,
                                        textAlign: 'center',
                                        letterSpacing: '-0.5px'
                                    }}>
                                        {user.membership_tier ? user.membership_tier.split(' ').map((w: string) => w.charAt(0)).join('') : 'CN'}
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.5rem', 
                                        fontWeight: 900, 
                                        color: getTierColor(user.membership_tier),
                                        marginTop: '4px',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {user.membership_tier?.toUpperCase().replace(' - ', '-') || 'CONSULTANT'}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ 
                                        fontSize: '2.5rem', 
                                        fontWeight: 950, 
                                        letterSpacing: '-1px',
                                        background: `linear-gradient(135deg, ${getTierColor(user.membership_tier)}, ${getTierColor(user.membership_tier)}80)`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    }}>
                                        Top {Math.min(100, Math.max(1, Math.round(100 - ((user.growth_score || 0) / 100) * 100)))}%
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.85rem', 
                                        color: 'var(--text-muted)', 
                                        fontWeight: 600, 
                                        marginTop: '12px',
                                        lineHeight: '1.5'
                                    }}>
                                        Positioned in the <span style={{ 
                                            color: getTierColor(user.membership_tier), 
                                            fontWeight: 900,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>{user.membership_tier || 'Consultant'}</span> quadrant
                                    </div>
                                    <div style={{ 
                                        height: '6px', 
                                        width: '100%', 
                                        background: 'var(--bg-app)', 
                                        borderRadius: '10px', 
                                        marginTop: '20px',
                                        border: '1px solid var(--glass-border)',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{ 
                                            height: '100%', 
                                            width: `${Math.min(100, user.growth_score || 0)}%`, 
                                            background: `linear-gradient(90deg, ${getTierColor(user.membership_tier)}, ${getTierColor(user.membership_tier)}80)`, 
                                            borderRadius: 'inherit',
                                            boxShadow: `0 0 10px ${getTierColor(user.membership_tier)}50`,
                                            transition: 'width 0.5s ease'
                                        }}></div>
                                    </div>
                                    {user.rank && (
                                        <div style={{ 
                                            fontSize: '0.7rem', 
                                            color: 'var(--text-muted)', 
                                            fontWeight: 700, 
                                            marginTop: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span>Global Rank:</span>
                                            <span style={{ color: getTierColor(user.membership_tier), fontWeight: 950 }}>#{user.rank}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ 
                        padding: '28px',
                            background: `linear-gradient(135deg, var(--success)08, transparent)`,
                            border: '1px solid var(--success)30'
                        }}>
                            <h3 style={{ 
                                fontSize: '1rem', 
                                fontWeight: 950, 
                                marginBottom: '22px', 
                                letterSpacing: '0.5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <div style={{ 
                                    width: '4px', 
                                    height: '12px', 
                                    background: 'var(--success)', 
                                    borderRadius: '10px',
                                    boxShadow: '0 0 8px var(--success)50'
                                }}></div>
                                Security Verification
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {[
                                    { label: 'Account Integrity', value: 'VERIFIED', color: 'var(--success)', icon: '✓' },
                                    { label: 'Login Context', value: 'MOBILE_GATEWAY', color: getTierColor(user.membership_tier), icon: '📱' },
                                    { label: 'Last Activity', value: user.last_activity_date ? new Date(user.last_activity_date).toLocaleTimeString() : 'LIVE_SYNC', color: 'var(--text-main)', icon: '🔄' }
                                ].map((row, idx) => (
                                    <div key={idx} style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        padding: '12px 15px',
                                        paddingBottom: '12px', 
                                        borderBottom: idx < 2 ? '1px solid var(--glass-border)' : 'none',
                                        background: idx === 0 ? `${row.color}10` : 'transparent',
                                        borderRadius: idx === 0 ? '12px' : '0',
                                        border: idx === 0 ? `1px solid ${row.color}30` : 'none'
                                    }}>
                                        <span style={{ 
                                            fontSize: '0.8rem', 
                                            color: 'var(--text-muted)', 
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span>{row.icon}</span>
                                            {row.label}
                                        </span>
                                        <span style={{ 
                                            fontSize: '0.8rem', 
                                            fontWeight: 950, 
                                            color: row.color,
                                            textTransform: idx === 0 ? 'uppercase' : 'none',
                                            letterSpacing: idx === 0 ? '0.5px' : '0'
                                        }}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Deal Room metrics + pipeline (stacked with Activity Log — same “business / conscious” context) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass-panel" style={{
                        padding: '28px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06), transparent)',
                        border: '1px solid rgba(16, 185, 129, 0.25)'
                    }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', marginBottom: '6px' }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 950, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deal Room · pipeline snapshot</div>
                            <button
                                type="button"
                                onClick={() => setActiveTab('deal-room')}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: 999,
                                    border: '1px solid rgba(99, 102, 241, 0.45)',
                                    background: 'rgba(99, 102, 241, 0.12)',
                                    color: 'var(--primary)',
                                    fontWeight: 900,
                                    fontSize: '0.68rem',
                                    letterSpacing: '0.04em',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                See more →
                            </button>
                        </div>
                        <h3 style={{ fontSize: '1.08rem', fontWeight: 950, marginBottom: '8px', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '4px', height: '14px', background: 'var(--success)', borderRadius: '10px' }}></div>
                            Clients &amp; revenue outcomes
                        </h3>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 18px 0', lineHeight: 1.45, fontWeight: 600 }}>
                            Same notes as the mobile Deal Room. Expand <strong style={{ color: 'var(--text-main)' }}>HOT LEADS</strong> for stage + flow flags, or open the <strong style={{ color: 'var(--text-main)' }}>full Deal Room</strong> for every client &amp; commission. Below, the Activity Log shows daily <strong style={{ color: 'var(--text-main)' }}>Conscious</strong> / <strong style={{ color: 'var(--text-main)' }}>Identity</strong> task completion.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                            {[
                                { key: 'hot_leads' as const, label: 'HOT LEADS', value: revenueMetrics?.hot_leads ?? '—', iconKey: 'hot_leads', color: 'var(--primary)' },
                                { key: 'deals_closed' as const, label: 'DEALS CLOSED', value: revenueMetrics?.deals_closed ?? '—', iconKey: 'deals_closed', color: '#a855f7' },
                                { key: 'commission' as const, label: 'NET COMMISSION EARNED', value: revenueMetrics != null ? formatCommission(revenueMetrics.total_commission) : '—', iconKey: 'commission', color: 'var(--success)' },
                                { key: 'top_source' as const, label: 'TOP SOURCE', value: revenueMetrics?.top_source ?? '—', iconKey: 'top_source', color: '#f59e0b' },
                            ].map((m) => (
                                <div
                                    key={m.key}
                                    onClick={() => toggleMetricExpand(m.key)}
                                    className="glass-panel"
                                    style={{
                                        padding: '20px',
                                        border: `1px solid ${m.color}30`,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        background: expandedMetric === m.key ? `${m.color}10` : 'transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = `0 6px 20px ${m.color}25`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 950, color: 'var(--text-muted)', letterSpacing: '1px' }}>{m.label}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {m.key === 'hot_leads' ? (
                                                <>
                                                    <input
                                                        ref={dealRoomExcelInputRef}
                                                        type="file"
                                                        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                                        style={{ display: 'none' }}
                                                        onChange={onDealRoomExcelFileChange}
                                                    />
                                                    <div ref={dealRoomExcelMenuRef} style={{ position: 'relative' }}>
                                                        <button
                                                            type="button"
                                                            title="Download Deal Room template or import Excel for this user"
                                                            disabled={dealRoomExcelImporting}
                                                            onClick={(ev) => {
                                                                ev.stopPropagation();
                                                                setDealRoomExcelMenuOpen((o) => !o);
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: 30,
                                                                height: 30,
                                                                padding: 0,
                                                                borderRadius: 10,
                                                                border: '1px solid rgba(99, 102, 241, 0.35)',
                                                                background: 'rgba(99, 102, 241, 0.12)',
                                                                cursor: dealRoomExcelImporting ? 'wait' : 'pointer',
                                                                color: 'var(--primary)',
                                                            }}
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                                                <circle cx="9" cy="7" r="4" />
                                                                <line x1="19" y1="8" x2="19" y2="14" />
                                                                <line x1="22" y1="11" x2="16" y2="11" />
                                                            </svg>
                                                        </button>
                                                        {dealRoomExcelMenuOpen && (
                                                            <div
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: 0,
                                                                    top: 'calc(100% + 6px)',
                                                                    zIndex: 50,
                                                                    minWidth: 200,
                                                                    padding: '8px',
                                                                    borderRadius: 12,
                                                                    border: '1px solid var(--glass-border)',
                                                                    background: 'var(--bg-card)',
                                                                    boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '6px',
                                                                }}
                                                                onClick={(ev) => ev.stopPropagation()}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const url = new URL(
                                                                            'deal-room-clients-template.xlsx',
                                                                            `${window.location.origin}${import.meta.env.BASE_URL || '/'}`
                                                                        ).href;
                                                                        const a = document.createElement('a');
                                                                        a.href = url;
                                                                        a.download = 'RealtorOne_Deal_Room_Clients_Template.xlsx';
                                                                        a.rel = 'noopener';
                                                                        document.body.appendChild(a);
                                                                        a.click();
                                                                        a.remove();
                                                                        setDealRoomExcelMenuOpen(false);
                                                                    }}
                                                                    style={{
                                                                        textAlign: 'left',
                                                                        padding: '8px 10px',
                                                                        borderRadius: 8,
                                                                        border: 'none',
                                                                        background: 'rgba(16, 185, 129, 0.12)',
                                                                        color: 'var(--text-main)',
                                                                        fontWeight: 700,
                                                                        fontSize: '0.78rem',
                                                                        cursor: 'pointer',
                                                                    }}
                                                                >
                                                                    Download sheet template
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={dealRoomExcelImporting}
                                                                    onClick={() => {
                                                                        dealRoomExcelInputRef.current?.click();
                                                                    }}
                                                                    style={{
                                                                        textAlign: 'left',
                                                                        padding: '8px 10px',
                                                                        borderRadius: 8,
                                                                        border: 'none',
                                                                        background: 'rgba(99, 102, 241, 0.15)',
                                                                        color: 'var(--text-main)',
                                                                        fontWeight: 700,
                                                                        fontSize: '0.78rem',
                                                                        cursor: dealRoomExcelImporting ? 'wait' : 'pointer',
                                                                    }}
                                                                >
                                                                    {dealRoomExcelImporting ? 'Importing…' : 'Import .xlsx for this user'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <IconSvg name={m.iconKey} color={m.color} size={18} />
                                            )}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 950, color: m.color }}>{m.value}</div>
                                    {expandedMetric === m.key && (
                                        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)', maxHeight: '200px', overflowY: 'auto' }}>
                                            {m.key === 'hot_leads' && resultsHotLeads.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                                                    {resultsHotLeads.slice(0, 20).map((r: any, i: number) => {
                                                        const meta = parseHotLeadNotesMeta(r.notes);
                                                        const stage = formatPipelineStage(meta.lead_stage);
                                                        const bucketHint = formatCrmFlowBucketsHint(meta);
                                                        const sourceMeta = sourceBadgeMeta(r.source);
                                                        return (
                                                            <div
                                                                key={i}
                                                                style={{
                                                                    padding: '7px 9px',
                                                                    background: 'var(--bg-app)',
                                                                    borderRadius: '8px',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '5px',
                                                                    textAlign: 'left',
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setHotLeadFlowModal(r as Record<string, unknown>);
                                                                        }}
                                                                        style={{
                                                                            fontWeight: 800,
                                                                            textAlign: 'left',
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            padding: 0,
                                                                            margin: 0,
                                                                            cursor: 'pointer',
                                                                            color: 'var(--primary)',
                                                                            textDecoration: 'underline',
                                                                            textUnderlineOffset: '2px',
                                                                            fontSize: 'inherit',
                                                                            fontFamily: 'inherit',
                                                                        }}
                                                                        title="View CRM activity timeline"
                                                                    >
                                                                        {r.client_name || '—'}
                                                                    </button>
                                                                    <span
                                                                        style={{
                                                                            fontSize: '0.62rem',
                                                                            fontWeight: 900,
                                                                            letterSpacing: '0.04em',
                                                                            color: 'var(--primary)',
                                                                            whiteSpace: 'nowrap',
                                                                            maxWidth: '52%',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                        }}
                                                                        title={stage}
                                                                    >
                                                                        {stage}
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                                    <span
                                                                        style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '5px',
                                                                            padding: '2px 7px',
                                                                            borderRadius: '999px',
                                                                            fontSize: '0.62rem',
                                                                            fontWeight: 800,
                                                                            letterSpacing: '0.01em',
                                                                            color: sourceMeta.fg,
                                                                            background: sourceMeta.bg,
                                                                        }}
                                                                        title={`Source: ${r.source || '—'}`}
                                                                    >
                                                                        <IconSvg name={sourceMeta.icon} color={sourceMeta.fg} size={11} />
                                                                        {sourceMeta.label}
                                                                    </span>
                                                                    {typeof meta.lead_package === 'string' && meta.lead_package ? (
                                                                        <span
                                                                            style={{
                                                                                textTransform: 'uppercase',
                                                                                fontWeight: 800,
                                                                                fontSize: '0.62rem',
                                                                                color: '#93c5fd',
                                                                                background: 'rgba(59, 130, 246, 0.12)',
                                                                                padding: '2px 7px',
                                                                                borderRadius: '999px',
                                                                            }}
                                                                        >
                                                                            Pkg: {meta.lead_package}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                                {bucketHint ? (
                                                                    <div style={{ fontSize: '0.6rem', color: 'var(--warning, #d97706)', fontWeight: 700, opacity: 0.95 }} title={bucketHint}>
                                                                        {bucketHint}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        );
                                                    })}
                                                    {resultsHotLeads.length > 20 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+{resultsHotLeads.length - 20} more</span>}
                                                </div>
                                            )}
                                            {m.key === 'deals_closed' && resultsDealsClosed.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                                                    {resultsDealsClosed.slice(0, 20).map((r: any, i: number) => {
                                                        let notes: Record<string, any> = {};
                                                        try { notes = typeof r.notes === 'string' ? JSON.parse(r.notes || '{}') : (r.notes || {}); } catch { notes = {}; }
                                                        const amt = notes.commission ?? notes.deal_amount ?? 0;
                                                        return (
                                                            <div key={i} style={{ padding: '6px 10px', background: 'var(--bg-app)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                                                <span>{r.client_name || '—'}</span>
                                                                <span style={{ color: 'var(--success)', fontWeight: 800 }}>{typeof amt === 'number' ? formatCommission(amt) : amt}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    {resultsDealsClosed.length > 20 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+{resultsDealsClosed.length - 20} more</span>}
                                                </div>
                                            )}
                                            {m.key === 'top_source' && revenueMetrics?.top_source && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Most common source when adding clients</div>
                                            )}
                                            {m.key === 'commission' && resultsDealsClosed.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                                                    {resultsDealsClosed.slice(0, 15).map((r: any, i: number) => {
                                                        let notes: Record<string, any> = {};
                                                        try { notes = typeof r.notes === 'string' ? JSON.parse(r.notes || '{}') : (r.notes || {}); } catch { notes = {}; }
                                                        const amt = notes.commission ?? notes.deal_amount ?? 0;
                                                        if (!amt) return null;
                                                        return (
                                                            <div key={i} style={{ padding: '6px 10px', background: 'var(--bg-app)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                                                <span>{r.client_name || '—'}</span>
                                                                <span style={{ color: 'var(--success)', fontWeight: 800 }}>{typeof amt === 'number' ? formatCommission(amt) : String(amt)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {(m.key === 'hot_leads' && resultsHotLeads.length === 0) || (m.key === 'deals_closed' && resultsDealsClosed.length === 0) ? (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No data</span>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
                            <div>
                                <div style={{ fontSize: '0.62rem', fontWeight: 950, letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Daily execution · task log</div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 950, margin: 0, letterSpacing: '-0.5px' }}>Activity Log</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 600, lineHeight: 1.45 }}>
                                    <strong style={{ color: 'var(--text-main)', fontWeight: 800 }}>Identity</strong> (mindset / audio) and <strong style={{ color: 'var(--text-main)', fontWeight: 800 }}>Conscious</strong> (business &amp; revenue blocks). Expand a day for per-task detail — this complements the Deal Room snapshot above.
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '2px' }}>Recent System Entries</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {performance.slice().reverse().slice(0, 14).map((day, idx) => {
                                const isExpanded = expandedDays.includes(day.date);
                                const dayDateStr = day.date.substring(0, 10);
                                const dayActivities = activities.filter(a => a.scheduled_at && a.scheduled_at.substring(0, 10) === dayDateStr);

                                return (
                                    <div key={idx} style={{
                                        background: 'var(--bg-app)',
                                        borderRadius: '18px',
                                        border: isExpanded ? `1px solid ${getTierColor(user.membership_tier)}40` : '1px solid var(--glass-border)',
                                        overflow: 'hidden',
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: isExpanded ? '0 10px 40px rgba(0,0,0,0.2)' : 'none'
                                    }}>
                                        <div style={{ padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleDay(day.date)}>
                                            <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                                                <div style={{ textAlign: 'center', minWidth: '60px', padding: '10px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 950, color: 'var(--text-muted)', letterSpacing: '1px' }}>{new Date(day.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</div>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--text-main)', marginTop: '2px' }}>{new Date(day.date).getDate()}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '1rem', fontWeight: 950, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>Daily Tactical Execution</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
                                                        <span style={{ fontSize: '0.65rem', padding: '4px 12px', background: 'rgba(126, 34, 206, 0.1)', color: '#a855f7', borderRadius: '30px', fontWeight: 950, border: '1px solid rgba(126, 34, 206, 0.2)' }} title="Conscious / business track completion">CONSCIOUS: {day.conscious_score}%</span>
                                                        <span style={{ fontSize: '0.65rem', padding: '4px 12px', background: 'rgba(217, 70, 239, 0.1)', color: '#d946ef', borderRadius: '30px', fontWeight: 950, border: '1px solid rgba(217, 70, 239, 0.2)' }} title="Identity / mindset track completion">IDENTITY: {day.subconscious_score}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '25px' }}>
                                                <div>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--primary)', lineHeight: 1 }}>+{day.total_momentum_score}</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--text-muted)', marginTop: '4px' }}>POINTS EARNED</div>
                                                </div>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
                                                    <svg style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'all 0.4s' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="6 9 12 15 18 9"></polyline>
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="fade-in" style={{ padding: '0 25px 25px 25px', background: 'rgba(0,0,0,0.1)' }}>
                                                <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0 0 25px 0' }}></div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                                    <div>
                                                        <h5 style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginBottom: '16px' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', fontWeight: 950, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                                <span style={{ width: '3px', height: '10px', background: '#a855f7', borderRadius: '10px', flexShrink: 0 }} />
                                                                Conscious track
                                                                <span style={{ marginLeft: 'auto', fontSize: '0.58rem', opacity: 0.75, fontWeight: 900 }}>Max 45 pts</span>
                                                            </span>
                                                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', paddingLeft: '11px', lineHeight: 1.35 }}>
                                                                Business &amp; revenue tasks (cold calling, follow-up, meetings, etc.)
                                                            </span>
                                                        </h5>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            {dayActivities.filter(a => a.category === 'task' || a.category === 'conscious').map((a, i) => (
                                                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 15px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                                                    <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: a.is_completed ? 'var(--success)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                                                        {a.is_completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                                    </div>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <span style={{ fontWeight: 800, fontSize: '0.8rem', opacity: a.is_completed ? 1 : 0.6 }}>{a.title}</span>
                                                                        {(() => {
                                                                            let notes: Record<string, unknown> = {};
                                                                            try {
                                                                                notes = typeof a.notes === 'string'
                                                                                    ? JSON.parse(a.notes || '{}')
                                                                                    : (a.notes || {});
                                                                            } catch {
                                                                                notes = {};
                                                                            }
                                                                            const listened = Number(notes.audio_listened_percent ?? NaN);
                                                                            const required = Number(notes.audio_required_percent ?? NaN);
                                                                            const hasListenData = (Number.isFinite(listened) && listened > 0) || (Number.isFinite(required) && required > 0);
                                                                            const met = Boolean(notes.audio_requirement_met);
                                                                            if (!hasListenData) return null;
                                                                            return (
                                                                                <div style={{
                                                                                    marginTop: 6,
                                                                                    fontSize: '0.68rem',
                                                                                    fontWeight: 800,
                                                                                    color: met ? '#10b981' : '#f59e0b',
                                                                                    padding: '6px 8px',
                                                                                    background: met ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                                                                    border: met ? '1px solid rgba(16,185,129,0.28)' : '1px solid rgba(245,158,11,0.28)',
                                                                                    borderRadius: 8,
                                                                                    display: 'inline-block',
                                                                                }}>
                                                                                    Audio: {Number.isFinite(listened) ? `${Math.max(0, Math.min(100, Math.round(listened)))}%` : '--'}
                                                                                    {' / '}required {Number.isFinite(required) ? `${Math.max(0, Math.min(100, Math.round(required)))}%` : '--'}
                                                                                    {Number.isFinite(required) && required > 0 ? (met ? '  (met)' : '  (below)') : ''}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                        {a.description && (
                                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, padding: '8px 10px', background: 'rgba(0,0,0,0.08)', borderRadius: 8, lineHeight: 1.4, fontStyle: 'italic' }}>
                                                                                <span style={{ fontWeight: 700, color: 'var(--text-muted)', marginRight: 4 }}>Response:</span>{a.description}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {a.min_tier && a.min_tier !== 'Consultant' && (
                                                                        <span style={{
                                                                            fontSize: '0.55rem',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '6px',
                                                                            background: `${getTierColor(a.min_tier)}20`,
                                                                            color: getTierColor(a.min_tier),
                                                                            border: `1px solid ${getTierColor(a.min_tier)}40`,
                                                                            fontWeight: 900,
                                                                            letterSpacing: '0.5px',
                                                                            marginRight: '8px'
                                                                        }}>
                                                                            {a.min_tier.toUpperCase()}
                                                                        </span>
                                                                    )}

                                                                    <span style={{ fontSize: '0.7rem', fontWeight: 950, color: a.is_completed ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }}>{a.is_completed ? `+${a.points}` : `(${a.points})`}</span>
                                                                </div>
                                                            ))}
                                                            {dayActivities.filter(a => a.category === 'task' || a.category === 'conscious').length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>No operational data recorded</span>}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginBottom: '16px' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', fontWeight: 950, color: '#d946ef', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                                <span style={{ width: '3px', height: '10px', background: '#d946ef', borderRadius: '10px', flexShrink: 0 }} />
                                                                Identity track
                                                                <span style={{ marginLeft: 'auto', fontSize: '0.58rem', opacity: 0.75, fontWeight: 900 }}>Max 40 pts</span>
                                                            </span>
                                                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', paddingLeft: '11px', lineHeight: 1.35 }}>
                                                                Mindset &amp; conditioning (visualization, affirmations, audio goals)
                                                            </span>
                                                        </h5>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            {dayActivities.filter(a => a.category === 'subconscious').map((a, i) => (
                                                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 15px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                                                    <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: a.is_completed ? 'var(--accent)' : 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                                                        {a.is_completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                                    </div>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <span style={{ fontWeight: 800, fontSize: '0.8rem', opacity: a.is_completed ? 1 : 0.6 }}>{a.title}</span>
                                                                        {(() => {
                                                                            let notes: Record<string, unknown> = {};
                                                                            try {
                                                                                notes = typeof a.notes === 'string'
                                                                                    ? JSON.parse(a.notes || '{}')
                                                                                    : (a.notes || {});
                                                                            } catch {
                                                                                notes = {};
                                                                            }
                                                                            const listened = Number(notes.audio_listened_percent ?? NaN);
                                                                            const required = Number(notes.audio_required_percent ?? NaN);
                                                                            const hasListenData = (Number.isFinite(listened) && listened > 0) || (Number.isFinite(required) && required > 0);
                                                                            const met = Boolean(notes.audio_requirement_met);
                                                                            if (!hasListenData) return null;
                                                                            return (
                                                                                <div style={{
                                                                                    marginTop: 6,
                                                                                    fontSize: '0.68rem',
                                                                                    fontWeight: 800,
                                                                                    color: met ? '#10b981' : '#f59e0b',
                                                                                    padding: '6px 8px',
                                                                                    background: met ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                                                                    border: met ? '1px solid rgba(16,185,129,0.28)' : '1px solid rgba(245,158,11,0.28)',
                                                                                    borderRadius: 8,
                                                                                    display: 'inline-block',
                                                                                }}>
                                                                                    Audio: {Number.isFinite(listened) ? `${Math.max(0, Math.min(100, Math.round(listened)))}%` : '--'}
                                                                                    {' / '}required {Number.isFinite(required) ? `${Math.max(0, Math.min(100, Math.round(required)))}%` : '--'}
                                                                                    {Number.isFinite(required) && required > 0 ? (met ? '  (met)' : '  (below)') : ''}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                        {a.description && (
                                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, padding: '8px 10px', background: 'rgba(0,0,0,0.08)', borderRadius: 8, lineHeight: 1.4, fontStyle: 'italic' }}>
                                                                                <span style={{ fontWeight: 700, color: 'var(--text-muted)', marginRight: 4 }}>Response:</span>{a.description}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {a.min_tier && a.min_tier !== 'Consultant' && (
                                                                        <span style={{
                                                                            fontSize: '0.55rem',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '6px',
                                                                            background: `${getTierColor(a.min_tier)}20`,
                                                                            color: getTierColor(a.min_tier),
                                                                            border: `1px solid ${getTierColor(a.min_tier)}40`,
                                                                            fontWeight: 900,
                                                                            letterSpacing: '0.5px',
                                                                            marginRight: '8px'
                                                                        }}>
                                                                            {a.min_tier.toUpperCase()}
                                                                        </span>
                                                                    )}

                                                                    <span style={{ fontSize: '0.7rem', fontWeight: 950, color: a.is_completed ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>{a.is_completed ? `+${a.points}` : `(${a.points})`}</span>
                                                                </div>
                                                            ))}
                                                            {dayActivities.filter(a => a.category === 'subconscious').length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>No identity conditioning protocols detected</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
        {hotLeadTimelineModal}
        </>
    );
};

export default UserProfilePage;
