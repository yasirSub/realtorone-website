import React, { useEffect } from 'react';
import {
    parseHotLeadNotesMeta,
    formatPipelineStage,
    buildCrmTimelineFromHotLead,
    collectNextContacts,
    CRM_FLOW_KEYS,
    CRM_FLOW_DISPLAY,
} from '../lib/dealRoomFormatters';

interface HotLeadFlowModalProps {
    lead: Record<string, unknown> | null;
    onClose: () => void;
}

const HotLeadFlowModal: React.FC<HotLeadFlowModalProps> = ({ lead, onClose }) => {
    useEffect(() => {
        if (!lead) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [lead, onClose]);

    if (!lead) return null;

    const meta = parseHotLeadNotesMeta(lead.notes);
    const timeline = buildCrmTimelineFromHotLead(lead);
    const nextContacts = collectNextContacts(meta);
    const stage = formatPipelineStage(meta.lead_stage);
    const name = typeof lead.client_name === 'string' ? lead.client_name : '—';
    const src = typeof lead.source === 'string' ? lead.source : '—';

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hot-lead-flow-title"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'rgba(0,0,0,0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="glass-panel"
                style={{
                    maxWidth: 520,
                    width: '100%',
                    maxHeight: '85vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 18,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
                }}
            >
                <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                        <h2 id="hot-lead-flow-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 950, letterSpacing: '-0.02em' }}>{name}</h2>
                        <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.4 }}>
                            Source: {src} · Current stage: {stage}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-view"
                        style={{
                            padding: '8px 14px',
                            fontSize: '0.65rem',
                            fontWeight: 950,
                            letterSpacing: '0.06em',
                            flexShrink: 0,
                            cursor: 'pointer',
                        }}
                    >
                        Close
                    </button>
                </div>
                <div style={{ padding: '14px 20px 18px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 950, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                            Pipeline snapshot · 5 stages
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                            {CRM_FLOW_KEYS.map((flowKey) => {
                                const block = meta[flowKey] as Record<string, unknown> | undefined;
                                if (!block || typeof block !== 'object') {
                                    return (
                                        <div
                                            key={flowKey}
                                            style={{
                                                padding: '8px 10px',
                                                borderRadius: 10,
                                                border: '1px solid var(--glass-border)',
                                                background: 'var(--bg-app)',
                                                opacity: 0.7,
                                            }}
                                        >
                                            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                {CRM_FLOW_DISPLAY[flowKey] ?? flowKey}
                                            </div>
                                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>No touches yet</div>
                                        </div>
                                    );
                                }
                                const touchCount = Number(block.touch_count ?? block.call_attempt ?? block.wa_attempt ?? 0);
                                const bucket = typeof block.bucket === 'string' && block.bucket ? block.bucket : 'in_progress';
                                const next = typeof block.next_contact_at === 'string' ? block.next_contact_at : '';
                                const bucketLabel = bucket === 'in_progress' ? 'In progress' : bucket.replace(/_/g, ' ');
                                return (
                                    <div
                                        key={flowKey}
                                        style={{
                                            padding: '8px 10px',
                                            borderRadius: 10,
                                            border: '1px solid var(--glass-border)',
                                            background: 'var(--bg-app)',
                                        }}
                                    >
                                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                                            {CRM_FLOW_DISPLAY[flowKey] ?? flowKey}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                            Touches: {Number.isFinite(touchCount) && touchCount >= 0 ? touchCount : '—'}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: bucket === 'in_progress' ? 'var(--text-muted)' : 'var(--warning, #d97706)', marginTop: 2, fontWeight: 700 }}>
                                            Status: {bucketLabel}
                                        </div>
                                        {next ? (
                                            <div style={{ fontSize: '0.68rem', color: 'var(--primary)', marginTop: 2 }}>
                                                Next: {new Date(next).toLocaleString()}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 950, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>
                        CRM activity (newest at bottom)
                    </div>
                    {timeline.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                            No CRM touch history in stored notes yet. Stage and flow flags above reflect the latest saved state from the app.
                        </p>
                    ) : (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {timeline.map((row, i) => (
                                <li
                                    key={i}
                                    style={{
                                        padding: '10px 12px',
                                        background: 'var(--bg-app)',
                                        borderRadius: 10,
                                        border: '1px solid var(--glass-border)',
                                    }}
                                >
                                    <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{row.phase}</div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4, lineHeight: 1.35 }}>{row.summary}</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--primary)', marginTop: 6, fontWeight: 700 }}>{row.atLabel}</div>
                                    {row.detail ? (
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.35 }}>{row.detail}</div>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                    {nextContacts.length > 0 ? (
                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--glass-border)' }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 950, letterSpacing: '0.08em', color: 'var(--warning, #d97706)', marginBottom: 8, textTransform: 'uppercase' }}>
                                Next contact scheduled
                            </div>
                            {nextContacts.map((n, i) => (
                                <div key={i} style={{ fontSize: '0.75rem', marginBottom: 6, fontWeight: 600, color: 'var(--text-main)' }}>
                                    <span style={{ color: 'var(--primary)' }}>{n.flow}</span>
                                    {' — '}
                                    {n.when}
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default HotLeadFlowModal;
