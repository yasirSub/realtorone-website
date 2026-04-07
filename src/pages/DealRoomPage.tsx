import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { apiClient } from '../api/client';
import type { User } from '../types';
import DealRoomIconSvg from '../components/DealRoomIconSvg';
import HotLeadFlowModal from '../components/HotLeadFlowModal';
import {
    parseHotLeadNotesMeta,
    formatPipelineStage,
    sourceBadgeMeta,
    formatCrmFlowBucketsHint,
    formatCommission,
} from '../lib/dealRoomFormatters';

interface DealRoomPageProps {
    user: User;
    onBackToProfile: () => void;
    onBackToRegistry: () => void;
}

interface RevenueMetrics {
    hot_leads: number;
    deals_closed: number;
    total_commission: number;
    top_source: string | null;
    recent_activity: any[];
}

const DealRoomPage: React.FC<DealRoomPageProps> = ({ user, onBackToProfile, onBackToRegistry }) => {
    const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
    const [resultsHotLeads, setResultsHotLeads] = useState<any[]>([]);
    const [resultsDealsClosed, setResultsDealsClosed] = useState<any[]>([]);
    const [hotLeadFlowModal, setHotLeadFlowModal] = useState<Record<string, unknown> | null>(null);
    const [dealRoomExcelMenuOpen, setDealRoomExcelMenuOpen] = useState(false);
    const [dealRoomExcelImporting, setDealRoomExcelImporting] = useState(false);
    const dealRoomExcelInputRef = useRef<HTMLInputElement>(null);
    const dealRoomExcelMenuRef = useRef<HTMLDivElement>(null);

    const loadAll = async () => {
        try {
            const [revRes, hotRes, dealRes] = await Promise.all([
                apiClient.getUserRevenueMetrics(user.id).catch(() => ({ success: false, data: null })),
                apiClient.getUserResults(user.id, { type: 'hot_lead' }).catch(() => ({ success: false, data: [] })),
                apiClient.getUserResults(user.id, { type: 'deal_closed' }).catch(() => ({ success: false, data: [] })),
            ]);
            if (revRes.success && revRes.data) setRevenueMetrics(revRes.data);
            if (hotRes.success) setResultsHotLeads(hotRes.data ?? []);
            if (dealRes.success) setResultsDealsClosed(dealRes.data ?? []);
        } catch (e) {
            console.error('DealRoomPage load', e);
        }
    };

    useEffect(() => {
        loadAll();
        const id = window.setInterval(loadAll, 5000);
        return () => window.clearInterval(id);
    }, [user.id]);

    useEffect(() => {
        if (!dealRoomExcelMenuOpen) return;
        const onDoc = (ev: MouseEvent) => {
            const el = dealRoomExcelMenuRef.current;
            if (el && !el.contains(ev.target as Node)) setDealRoomExcelMenuOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [dealRoomExcelMenuOpen]);

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
                if (rev.success && rev.data) setRevenueMetrics(rev.data);
                await loadAll();
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

    const exportDealRoomExcel = async () => {
        try {
            let rows = resultsHotLeads;
            if (!rows.length) {
                const res = await apiClient.getUserResults(user.id, { type: 'hot_lead' });
                if (res.success) rows = res.data ?? [];
            }

            const exportRows = rows.map((r: any) => {
                const meta = parseHotLeadNotesMeta(r.notes);
                const contact = typeof meta.contact === 'string' ? meta.contact : '';
                const email = typeof meta.email === 'string' ? meta.email : '';
                const leadSource = typeof r.source === 'string' && r.source.trim() ? r.source : 'Excel';
                const leadStage = typeof meta.lead_stage === 'string' ? meta.lead_stage : '';
                const leadType = typeof meta.lead_type === 'string' ? meta.lead_type : '';
                return {
                    'Name': typeof r.client_name === 'string' ? r.client_name : '',
                    'Contact number': contact,
                    'Email': email,
                    'Lead Source': leadSource,
                    'Lead Stage': leadStage,
                    'Lead Type': leadType,
                };
            });

            const ws = XLSX.utils.json_to_sheet(exportRows, {
                header: ['Name', 'Contact number', 'Email', 'Lead Source', 'Lead Stage', 'Lead Type'],
            });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Deal Room Data');
            const safeName = (user.name || `user_${user.id}`).replace(/[^\w\-]+/g, '_');
            XLSX.writeFile(wb, `Deal_Room_Data_${safeName}.xlsx`);
            setDealRoomExcelMenuOpen(false);
        } catch (err) {
            console.error(err);
            window.alert('Export failed.');
        }
    };

    const metrics = [
        { key: 'hot_leads' as const, label: 'Hot leads', value: revenueMetrics?.hot_leads ?? '—', iconKey: 'hot_leads', color: 'var(--primary)' },
        { key: 'deals_closed' as const, label: 'Deals closed', value: revenueMetrics?.deals_closed ?? '—', iconKey: 'deals_closed', color: '#a855f7' },
        { key: 'commission' as const, label: 'Net commission', value: revenueMetrics != null ? formatCommission(revenueMetrics.total_commission) : '—', iconKey: 'commission', color: 'var(--success)' },
        { key: 'top_source' as const, label: 'Top source', value: revenueMetrics?.top_source ?? '—', iconKey: 'top_source', color: '#f59e0b' },
    ];

    return (
        <>
            <div className="view-container fade-in" style={{ maxWidth: 'min(1440px, 100%)', margin: '0 auto', padding: '0 24px 48px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                        <button type="button" className="btn-view" onClick={onBackToProfile} style={{ padding: '10px 18px', fontWeight: 800, fontSize: '0.72rem' }}>
                            ← Back to profile
                        </button>
                        <button type="button" className="btn-view" onClick={onBackToRegistry} style={{ padding: '10px 18px', fontWeight: 700, fontSize: '0.68rem', opacity: 0.85 }}>
                            Registry
                        </button>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 950, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Practitioner</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 950, letterSpacing: '-0.02em' }}>{user.name || user.email}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{user.email}</div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '32px 28px', marginBottom: 28, border: '1px solid rgba(16, 185, 129, 0.28)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06), transparent)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
                        <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 950, letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Deal Room · full workspace</div>
                            <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '1.65rem', fontWeight: 950, margin: 0, letterSpacing: '-0.03em' }}>
                                <span style={{ width: 5, height: 22, background: 'var(--success)', borderRadius: 8 }} />
                                CRM pipeline &amp; revenue
                            </h1>
                            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '12px 0 0', maxWidth: 640, lineHeight: 1.5, fontWeight: 600 }}>
                                Same data as the mobile Deal Room. Review every hot lead, stage, source, and closed deal for this user. Import Excel or open a lead for the full CRM timeline.
                            </p>
                        </div>
                        <div ref={dealRoomExcelMenuRef} style={{ position: 'relative' }}>
                            <input ref={dealRoomExcelInputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: 'none' }} onChange={onDealRoomExcelFileChange} />
                            <button
                                type="button"
                                disabled={dealRoomExcelImporting}
                                onClick={() => setDealRoomExcelMenuOpen((o) => !o)}
                                style={{
                                    padding: '12px 18px',
                                    borderRadius: 14,
                                    border: '1px solid rgba(99, 102, 241, 0.4)',
                                    background: 'rgba(99, 102, 241, 0.12)',
                                    color: 'var(--primary)',
                                    fontWeight: 900,
                                    fontSize: '0.75rem',
                                    cursor: dealRoomExcelImporting ? 'wait' : 'pointer',
                                }}
                            >
                                {dealRoomExcelImporting ? 'Importing…' : 'Excel · template / import'}
                            </button>
                            {dealRoomExcelMenuOpen && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 'calc(100% + 8px)',
                                        zIndex: 50,
                                        minWidth: 220,
                                        padding: 10,
                                        borderRadius: 12,
                                        border: '1px solid var(--glass-border)',
                                        background: 'var(--bg-card)',
                                        boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const url = new URL('deal-room-clients-template.xlsx', `${window.location.origin}${import.meta.env.BASE_URL || '/'}`).href;
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = 'RealtorOne_Deal_Room_Clients_Template.xlsx';
                                            a.rel = 'noopener';
                                            document.body.appendChild(a);
                                            a.click();
                                            a.remove();
                                            setDealRoomExcelMenuOpen(false);
                                        }}
                                        style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                                    >
                                        Download sheet template
                                    </button>
                                    <button
                                        type="button"
                                        disabled={dealRoomExcelImporting}
                                        onClick={() => dealRoomExcelInputRef.current?.click()}
                                        style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                                    >
                                        Import .xlsx for this user
                                    </button>
                                    <button
                                        type="button"
                                        disabled={dealRoomExcelImporting}
                                        onClick={exportDealRoomExcel}
                                        style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none', background: 'rgba(14, 165, 233, 0.15)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                                    >
                                        Export current clients (.xlsx)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: 20,
                        }}
                    >
                        {metrics.map((m) => (
                            <div
                                key={m.key}
                                className="glass-panel"
                                style={{
                                    padding: '22px 22px 24px',
                                    border: `1px solid ${m.color}35`,
                                    minHeight: 132,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 950, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{m.label}</span>
                                    <DealRoomIconSvg name={m.iconKey} color={m.color} size={22} />
                                </div>
                                <div style={{ fontSize: '2.1rem', fontWeight: 950, color: m.color, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{m.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '28px', marginBottom: 24 }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 950, margin: '0 0 18px', letterSpacing: '-0.02em' }}>Hot leads ({resultsHotLeads.length})</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {resultsHotLeads.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No hot leads yet.</p>
                        ) : (
                            resultsHotLeads.map((r: any, i: number) => {
                                const meta = parseHotLeadNotesMeta(r.notes);
                                const stage = formatPipelineStage(meta.lead_stage);
                                const bucketHint = formatCrmFlowBucketsHint(meta);
                                const sourceMeta = sourceBadgeMeta(r.source);
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            padding: '14px 16px',
                                            background: 'var(--bg-app)',
                                            borderRadius: 14,
                                            border: '1px solid var(--glass-border)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                onClick={() => setHotLeadFlowModal(r as Record<string, unknown>)}
                                                style={{
                                                    fontWeight: 900,
                                                    textAlign: 'left',
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    color: 'var(--primary)',
                                                    textDecoration: 'underline',
                                                    fontSize: '1rem',
                                                }}
                                            >
                                                {r.client_name || '—'}
                                            </button>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--primary)' }}>{stage}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '4px 10px',
                                                    borderRadius: 999,
                                                    fontSize: '0.68rem',
                                                    fontWeight: 800,
                                                    color: sourceMeta.fg,
                                                    background: sourceMeta.bg,
                                                }}
                                            >
                                                <DealRoomIconSvg name={sourceMeta.icon} color={sourceMeta.fg} size={12} />
                                                {sourceMeta.label}
                                            </span>
                                            {bucketHint ? (
                                                <span style={{ fontSize: '0.68rem', color: 'var(--warning, #d97706)', fontWeight: 700 }}>{bucketHint}</span>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '28px', marginBottom: 24 }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 950, margin: '0 0 18px', letterSpacing: '-0.02em' }}>Deals closed ({resultsDealsClosed.length})</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {resultsDealsClosed.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No closed deals recorded.</p>
                        ) : (
                            resultsDealsClosed.map((r: any, i: number) => {
                                let notes: Record<string, any> = {};
                                try {
                                    notes = typeof r.notes === 'string' ? JSON.parse(r.notes || '{}') : (r.notes || {});
                                } catch {
                                    notes = {};
                                }
                                const amt = notes.commission ?? notes.deal_amount ?? 0;
                                return (
                                    <div key={i} style={{ padding: '12px 16px', background: 'var(--bg-app)', borderRadius: 12, border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontWeight: 800 }}>{r.client_name || '—'}</span>
                                        <span style={{ color: 'var(--success)', fontWeight: 900 }}>{typeof amt === 'number' ? formatCommission(amt) : amt || '—'}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {revenueMetrics?.recent_activity && revenueMetrics.recent_activity.length > 0 ? (
                    <div className="glass-panel" style={{ padding: '28px' }}>
                        <h2 style={{ fontSize: '1.05rem', fontWeight: 950, margin: '0 0 12px' }}>Recent Deal Room activity</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {revenueMetrics.recent_activity.slice(0, 20).map((raw: any, i: number) => {
                                const row = raw && typeof raw === 'object' ? raw : {};
                                const typeRaw = typeof row.type === 'string' ? row.type : '';
                                const typeLabel = typeRaw
                                    ? typeRaw.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                                    : 'Activity';
                                const client = typeof row.client_name === 'string' && row.client_name.trim()
                                    ? row.client_name
                                    : '—';
                                const source = typeof row.source === 'string' && row.source.trim()
                                    ? row.source
                                    : '—';
                                const dateRaw = typeof row.date === 'string' ? row.date : '';
                                const parsedDate = dateRaw ? new Date(dateRaw) : null;
                                const dateLabel = parsedDate && !Number.isNaN(parsedDate.getTime())
                                    ? parsedDate.toLocaleDateString()
                                    : '—';
                                const amountNum = Number(row.value ?? 0);
                                const amountLabel = Number.isFinite(amountNum) && amountNum > 0
                                    ? formatCommission(amountNum)
                                    : '—';
                                const isDeal = typeRaw === 'deal_closed' || typeRaw === 'commission';
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: 12,
                                            border: '1px solid var(--glass-border)',
                                            background: 'var(--bg-app)',
                                            display: 'grid',
                                            gridTemplateColumns: 'minmax(120px, 170px) minmax(160px, 1fr) minmax(120px, 170px) minmax(120px, 160px)',
                                            gap: 10,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <span style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--primary)' }}>{typeLabel}</span>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{client}</span>
                                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>Source: {source}</span>
                                        <span style={{ fontSize: '0.76rem', color: isDeal ? 'var(--success)' : 'var(--text-muted)', fontWeight: 800, textAlign: 'right' }}>
                                            {isDeal ? amountLabel : dateLabel}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
            <HotLeadFlowModal lead={hotLeadFlowModal} onClose={() => setHotLeadFlowModal(null)} />
        </>
    );
};

export default DealRoomPage;
