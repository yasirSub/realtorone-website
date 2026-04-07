/** Parse Deal Room `notes` JSON on hot_lead results (same shape as mobile CRM). */
export function parseHotLeadNotesMeta(notesRaw: unknown): Record<string, unknown> {
    try {
        if (notesRaw == null) return {};
        if (typeof notesRaw === 'string') return JSON.parse(notesRaw || '{}') as Record<string, unknown>;
        if (typeof notesRaw === 'object') return notesRaw as Record<string, unknown>;
    } catch {
        /* ignore */
    }
    return {};
}

export function formatPipelineStage(leadStage: unknown): string {
    if (typeof leadStage !== 'string' || !leadStage.trim()) return '—';
    return leadStage
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

export function sourceBadgeMeta(sourceRaw: unknown): { label: string; icon: string; fg: string; bg: string } {
    const source = typeof sourceRaw === 'string' ? sourceRaw.trim().toLowerCase() : '';
    if (!source) return { label: 'Unknown', icon: 'source_default', fg: '#94a3b8', bg: 'rgba(148, 163, 184, 0.14)' };
    if (source.includes('whatsapp') || source === 'wa') return { label: 'WhatsApp', icon: 'source_whatsapp', fg: '#22c55e', bg: 'rgba(34, 197, 94, 0.16)' };
    if (source.includes('cold') || source.includes('call') || source.includes('phone')) return { label: 'Cold Call', icon: 'source_phone', fg: '#60a5fa', bg: 'rgba(59, 130, 246, 0.16)' };
    if (source.includes('insta')) return { label: 'Instagram', icon: 'source_instagram', fg: '#f472b6', bg: 'rgba(236, 72, 153, 0.16)' };
    if (source.includes('content')) return { label: 'Content', icon: 'source_content', fg: '#a78bfa', bg: 'rgba(139, 92, 246, 0.16)' };
    if (source.includes('referral')) return { label: 'Referral', icon: 'source_referral', fg: '#f59e0b', bg: 'rgba(245, 158, 11, 0.16)' };
    return { label: sourceRaw?.toString() || 'Source', icon: 'source_default', fg: '#94a3b8', bg: 'rgba(148, 163, 184, 0.14)' };
}

export const CRM_FLOW_KEYS = ['cold_calling', 'follow_up', 'client_meeting', 'deal_negotiation', 'deal_closure'] as const;

export const CRM_FLOW_DISPLAY: Record<string, string> = {
    cold_calling: 'Cold calling',
    follow_up: 'Follow-up',
    client_meeting: 'Client meeting',
    deal_negotiation: 'Deal negotiation',
    deal_closure: 'Deal closure',
};

const DAILY_ACTION_LABELS: Record<string, string> = {
    cold_calling: 'Cold calling',
    follow_up_back: 'Follow-up',
    follow_up: 'Follow-up',
    client_meeting: 'Client meeting',
    deal_negotiation: 'Deal negotiation',
    deal_closure: 'Deal closure',
    update_package: 'Package update',
};

export interface CrmTimelineRow {
    atMs: number;
    atLabel: string;
    phase: string;
    summary: string;
    detail?: string;
}

function coerceIsoDateTime(d: unknown): string | null {
    if (d == null) return null;
    const s = String(d).trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00`;
    return s;
}

function parseAtMs(at: unknown): number {
    const iso = coerceIsoDateTime(at);
    if (!iso) return 0;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : 0;
}

function formatWhen(at: unknown): string {
    const iso = coerceIsoDateTime(at);
    if (!iso) return '—';
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return String(at);
    return new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatTouchResultPhrase(result: string): string {
    const r = result.toLowerCase();
    const map: Record<string, string> = {
        interested: 'Interested (can move to follow-up)',
        exploring: 'Exploring (can move to follow-up)',
        not_interested: 'Not interested — retargeting / nurture',
        no_answer: 'No answer (call)',
        no_reply: 'No reply (WhatsApp)',
        ready_for_meeting: 'Ready for meeting',
        continue_touch: 'Continue / reschedule',
        advance_to_negotiation: 'Advanced to deal negotiation',
        advance_to_closure: 'Advanced to deal closure',
        lost: 'Deal marked lost',
    };
    return map[r] ?? result.replace(/_/g, ' ');
}

/** Chronological CRM activity for admin drill-down (from Deal Room `notes` JSON). */
export function buildCrmTimelineFromHotLead(resultRow: Record<string, unknown> | null | undefined): CrmTimelineRow[] {
    if (!resultRow) return [];
    const meta = parseHotLeadNotesMeta(resultRow.notes);
    const rows: CrmTimelineRow[] = [];

    const createdRaw = resultRow.created_at ?? resultRow.date;
    if (createdRaw != null) {
        const iso = coerceIsoDateTime(createdRaw);
        if (iso) {
            rows.push({
                atMs: parseAtMs(iso),
                atLabel: formatWhen(iso),
                phase: 'Record',
                summary: 'Hot lead added',
                detail: typeof resultRow.source === 'string' && resultRow.source ? `Source: ${resultRow.source}` : undefined,
            });
        }
    }

    const started = meta.crm_started_at;
    if (typeof started === 'string' && started.trim()) {
        rows.push({
            atMs: parseAtMs(started),
            atLabel: formatWhen(started),
            phase: 'CRM',
            summary: 'Pipeline tracking started',
        });
    }

    for (const flowKey of CRM_FLOW_KEYS) {
        const block = meta[flowKey];
        if (!block || typeof block !== 'object') continue;
        const b = block as Record<string, unknown>;
        const flowTitle = CRM_FLOW_DISPLAY[flowKey] ?? flowKey;
        const logs = b.touch_log;
        if (Array.isArray(logs)) {
            for (const entry of logs) {
                if (!entry || typeof entry !== 'object') continue;
                const e = entry as Record<string, unknown>;
                const at = e.at ?? b.last_touch_at;
                const mode = typeof e.mode === 'string' ? e.mode : '';
                const res = typeof e.result === 'string' ? e.result : '';
                const parts: string[] = [];
                if (mode) parts.push(`Channel: ${mode}`);
                if (res) parts.push(formatTouchResultPhrase(res));
                rows.push({
                    atMs: parseAtMs(at),
                    atLabel: formatWhen(at),
                    phase: flowTitle,
                    summary: parts.length ? parts.join(' · ') : 'Touch recorded',
                });
            }
        }
    }

    const da = meta.daily_actions;
    if (da && typeof da === 'object' && !Array.isArray(da)) {
        const dates = Object.keys(da as Record<string, unknown>).sort();
        for (const dateStr of dates) {
            const day = (da as Record<string, unknown>)[dateStr];
            if (!day || typeof day !== 'object') continue;
            const actions: string[] = [];
            for (const [k, v] of Object.entries(day as Record<string, unknown>)) {
                if (v === 'yes' || v === true) {
                    actions.push(DAILY_ACTION_LABELS[k] ?? k.replace(/_/g, ' '));
                }
            }
            if (actions.length === 0) continue;
            const dayIso = `${dateStr}T12:00:00`;
            rows.push({
                atMs: parseAtMs(dayIso),
                atLabel: dateStr,
                phase: 'Daily tasks',
                summary: `Tasks marked done: ${actions.join(', ')}`,
            });
        }
    }

    rows.sort((a, b) => {
        const ax = a.atMs || Number.MAX_SAFE_INTEGER;
        const bx = b.atMs || Number.MAX_SAFE_INTEGER;
        return ax - bx;
    });
    return rows;
}

export function collectNextContacts(meta: Record<string, unknown>): { flow: string; when: string; raw: string }[] {
    const out: { flow: string; when: string; raw: string }[] = [];
    for (const flowKey of CRM_FLOW_KEYS) {
        const block = meta[flowKey];
        if (!block || typeof block !== 'object') continue;
        const b = block as Record<string, unknown>;
        const next = b.next_contact_at;
        if (typeof next === 'string' && next.trim()) {
            out.push({
                flow: CRM_FLOW_DISPLAY[flowKey] ?? flowKey,
                when: formatWhen(next),
                raw: next.trim(),
            });
        }
    }
    return out;
}

/** Short hint when a flow bucket is not in_progress (retargeting, stalled, etc.). */
export function formatCrmFlowBucketsHint(meta: Record<string, unknown>): string | null {
    const parts: string[] = [];
    for (const k of CRM_FLOW_KEYS) {
        const block = meta[k];
        if (!block || typeof block !== 'object') continue;
        const b = (block as Record<string, unknown>).bucket;
        if (typeof b === 'string' && b && b !== 'in_progress') {
            const short = k === 'follow_up' ? 'FU' : k === 'cold_calling' ? 'Cold' : k === 'client_meeting' ? 'Meet' : k === 'deal_negotiation' ? 'Neg' : 'Close';
            parts.push(`${short}: ${b}`);
        }
    }
    return parts.length ? parts.join(' · ') : null;
}

export function formatCommission(v: number): string {
    if (v >= 1000000) return `AED ${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `AED ${(v / 1000).toFixed(0)}k`;
    return `AED ${v.toFixed(0)}`;
}
