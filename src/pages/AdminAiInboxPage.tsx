import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import type { AdminAiUserSummary, AiHumanTicket, ChatMessage, ChatSession, Course } from '../types';

function safeParseStoredAssistantContent(content: string): { text: string; courses?: any[]; commands?: any[] } {
    if (!content || (content[0] ?? '') !== '{') return { text: content };
    try {
        const decoded = JSON.parse(content);
        if (decoded && typeof decoded === 'object' && 'text' in decoded) {
            return { 
                text: decoded.text, 
                courses: Array.isArray(decoded.courses) ? decoded.courses : undefined,
                commands: Array.isArray(decoded.commands) ? decoded.commands : undefined
            };
        }
    } catch { /* skip */ }
    return { text: content };
}

const AdminAiInboxPage: React.FC = () => {
    const [adminUsers, setAdminUsers] = useState<AdminAiUserSummary[]>([]);
    const [, setLoadingUsers] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [, setLoadingSessions] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [kb, setKb] = useState<{ tier: string; courses: Course[] } | null>(null);
    const [, setLoadingKb] = useState(false);
    const [, setTickets] = useState<AiHumanTicket[]>([]);
    const [, setLoadingTickets] = useState(false);
    const [ticketRequest, setTicketRequest] = useState('');
    const [ticketCreateLoading, setTicketCreateLoading] = useState(false);
    const [centerDraft, setCenterDraft] = useState('');
    const [centerSending, setCenterSending] = useState(false);
    // Settings are handled in /ai-settings
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const loadUsers = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const res = await apiClient.getAdminAiUsers();
            if (res.success && res.data) {
                setAdminUsers(res.data);
                if (res.data.length > 0) setSelectedUserId(res.data[0].id);
            }
        } finally { setLoadingUsers(false); }
    }, []);

    const loadSessions = useCallback(async (userId: number) => {
        setLoadingSessions(true);
        try {
            const res = await apiClient.getAdminAiUserSessions(userId);
            if (res.success && res.data) {
                setSessions(res.data);
                setSelectedSessionId(res.data.length > 0 ? res.data[0].id : null);
            }
        } finally { setLoadingSessions(false); }
    }, []);

    const loadMessages = useCallback(async (sessionId: number) => {
        setLoadingMessages(true);
        try {
            const res = await apiClient.getAdminAiSessionMessages(sessionId);
            if (res.success && res.data) setMessages(res.data);
        } finally { setLoadingMessages(false); }
    }, []);

    const loadKb = useCallback(async (userId: number) => {
        setLoadingKb(true);
        try {
            const res = await apiClient.getAdminAiUserKb(userId);
            if (res.success && res.data) setKb(res.data);
        } finally { setLoadingKb(false); }
    }, []);

    const loadTickets = useCallback(async () => {
        setLoadingTickets(true);
        try {
            const res = await apiClient.getAdminAiTickets();
            if (res.success && res.data) setTickets(res.data);
        } finally { setLoadingTickets(false); }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);
    useEffect(() => {
        if (selectedUserId === null) return;
        void loadSessions(selectedUserId);
        void loadKb(selectedUserId);
        void loadTickets();
    }, [selectedUserId, loadSessions, loadKb, loadTickets]);
    useEffect(() => {
        if (selectedSessionId === null) { setMessages([]); return; }
        void loadMessages(selectedSessionId);
    }, [selectedSessionId, loadMessages]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, loadingMessages]);

    const handleCreateTicket = async () => {
        if (selectedUserId === null || !ticketRequest.trim()) return;
        setTicketCreateLoading(true);
        try {
            const res = await apiClient.createAdminAiTicket({
                user_id: selectedUserId,
                chat_session_id: selectedSessionId ?? null,
                request_message: ticketRequest.trim(),
            });
            if (res.success) { setTicketRequest(''); await loadTickets(); }
        } finally { setTicketCreateLoading(false); }
    };

    const handleCenterSend = async () => {
        if (selectedUserId === null) return;
        const msg = centerDraft.trim();
        if (!msg) return;
        setCenterSending(true);
        try {
            const res = await apiClient.adminAiSendForUser({
                user_id: selectedUserId,
                session_id: selectedSessionId ?? null,
                message: msg,
            });
            if (res.success && typeof res.session_id === 'number') {
                setCenterDraft('');
                if (selectedSessionId !== res.session_id) {
                    setSelectedSessionId(res.session_id);
                    await loadSessions(selectedUserId);
                }
                await loadMessages(res.session_id);
            }
        } finally {
            setCenterSending(false);
        }
    };

    return (
        <div className="view-container fade-in" style={{ padding: '0 40px 60px 40px' }}>
            
            {/* Neural Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingTop: '20px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div className="status-pulse"></div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase' }}>
                            Neural Intelligence Core Online
                        </span>
                    </div>
                    <h1 className="text-outfit" style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, letterSpacing: '-1.2px' }}>
                        AI Intelligence <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Center</span>
                    </h1>
                </div>

                <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                    <a
                        href="/ai-settings"
                        className="btn-command"
                        style={{ height: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', padding: '0 14px', textDecoration: 'none' }}
                    >
                        AI SETTINGS →
                    </a>
                    <div style={{ textAlign: 'right' }}>
                        <div className="card-heading" style={{ marginBottom: '4px' }}>System Velocity</div>
                        <div className="text-outfit" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{adminUsers.reduce((acc, u) => acc + u.ai_tokens_today, 0).toLocaleString()} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>TOKENS today</span></div>
                    </div>
                    <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.06)' }}></div>
                    <div style={{ textAlign: 'right' }}>
                        <div className="card-heading" style={{ marginBottom: '4px' }}>Neural Streams</div>
                        <div className="text-outfit" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{sessions.length} ACTIVE</div>
                    </div>
                </div>
            </div>

            {/* Neural Matrix Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 4.2fr minmax(320px, 1.2fr)', gap: '20px', height: 'calc(100vh - 280px)' }}>
                
                {/* Operator Registry (Left) */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '0' }}>
                    <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="card-heading">Operator Registry</div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {adminUsers.map(u => {
                                const tier = u.membership_tier || 'Consultant';
                                const tierColor =
                                    tier === 'Titan' ? '#facc15' :
                                    tier === 'Rainmaker' ? '#22c55e' :
                                    '#6366f1';
                                return (
                                <button
                                    key={u.id}
                                    onClick={() => setSelectedUserId(u.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px',
                                        padding: '16px',
                                        background: u.id === selectedUserId ? 'rgba(79, 70, 229, 0.1)' : 'rgba(255,255,255,0.02)',
                                        border: u.id === selectedUserId ? '1px solid rgba(79, 70, 229, 0.2)' : '1px solid transparent',
                                        borderRadius: '16px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--text-main)' }}>
                                        {(u.name || u.email)[0].toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>{u.name || u.email}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                                                <span style={{ color: tierColor }}>{tier}</span>
                                            </span>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 850, color: 'var(--text-muted)' }}>
                                                {u.ai_tokens_today.toLocaleString()} TK today
                                            </span>
                                        </div>
                                    </div>
                                    {u.id === selectedUserId && <div style={{ width: '4px', height: '20px', background: 'var(--primary)', borderRadius: '10px' }}></div>}
                                </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Intelligent Neural Stream (Center) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', background: 'rgba(5, 7, 26, 0.4)' }}>
                        <div style={{ padding: '20px 30px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div className="card-heading" style={{ marginBottom: '4px' }}>Neural Transmission Feed</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                    {sessions.find(s => s.id === selectedSessionId)?.title || 'Standard Transmission'}
                                </div>
                            </div>
                            <div style={{ padding: '6px 12px', background: 'rgba(0, 224, 150, 0.1)', borderRadius: '8px', color: '#00e096', fontSize: '0.65rem', fontWeight: 900, border: '1px solid rgba(0, 224, 150, 0.2)' }}>ENCRYPTED</div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '26px 30px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                {loadingMessages ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontWeight: 700 }}>Initializing Message Protocol...</div>
                                ) : messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '100px 40px', color: 'var(--text-muted)', fontWeight: 700, opacity: 0.3 }}>No neural activity detected in this stream.</div>
                                ) : (
                                    messages.map(m => (
                                        <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                                            <div style={{ 
                                                padding: '20px', 
                                                borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                                background: m.role === 'user' ? 'rgba(255,255,255,0.03)' : 'rgba(79, 70, 229, 0.1)',
                                                border: m.role === 'user' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(79, 70, 229, 0.2)',
                                                boxShadow: m.role === 'user' ? 'none' : '0 10px 30px rgba(79, 70, 229, 0.05)'
                                            }}>
                                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: m.role === 'user' ? 'var(--text-muted)' : 'var(--primary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>
                                                    {m.role === 'user' ? 'Operator' : 'AI Strategic Core'}
                                                </div>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.6' }}>
                                                    {m.role === 'assistant' ? safeParseStoredAssistantContent(m.content).text : m.content}
                                                </div>
                                                {(m.total_tokens ?? 0) > 0 && (
                                                    <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.03)', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '15px', fontWeight: 800 }}>
                                                        <span>COMPUTE: {m.total_tokens} TK</span>
                                                        <span>MODEL: {m.model?.toUpperCase() || 'CORE-GEN-3'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 18px', background: 'rgba(0,0,0,0.12)' }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                                <textarea
                                    value={centerDraft}
                                    onChange={(e) => setCenterDraft(e.target.value)}
                                    placeholder={selectedUserId ? 'Reply from here… (sends as selected user for testing)' : 'Select a user to reply…'}
                                    className="form-input"
                                    style={{ flex: 1, minHeight: 44, maxHeight: 120, background: 'rgba(0,0,0,0.15)', resize: 'vertical' }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            void handleCenterSend();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleCenterSend}
                                    disabled={centerSending || selectedUserId === null || !centerDraft.trim()}
                                    className="btn-command primary"
                                    style={{ width: 130, height: 44, fontSize: '0.72rem', padding: 0 }}
                                >
                                    {centerSending ? 'SENDING…' : 'SEND'}
                                </button>
                            </div>
                            <div style={{ marginTop: 8, fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, opacity: 0.8 }}>
                                Tip: Press Enter to send, Shift+Enter for a new line.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mediation Hub (Right) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    {/* AI Runtime Settings (moved to AI Settings page) */}
                    <div className="glass-panel" style={{ padding: '26px', borderLeft: '4px solid var(--primary)' }}>
                        <div className="card-heading" style={{ marginBottom: '10px' }}>AI Settings</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.55, marginBottom: 14 }}>
                            Provider, model, API key, knowledge datasets/PDFs, behavior/role, tier gating, and test prompt are managed in one place.
                        </div>
                        <a
                            href="/ai-settings"
                            className="btn-command primary"
                            style={{ height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', padding: '0 14px', textDecoration: 'none', width: '100%' }}
                        >
                            OPEN AI SETTINGS →
                        </a>
                    </div>
                    
                    {/* Knowledge Projections */}
                    <div className="glass-panel" style={{ padding: '30px' }}>
                        <div className="card-heading" style={{ marginBottom: '20px' }}>Knowledge Projection</div>
                        {kb ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Clearance Tier</span>
                                    <span className="tier-pill titan" style={{ fontSize: '0.65rem' }}>{kb.tier.toUpperCase()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Neural Nodes</span>
                                    <span style={{ color: 'var(--text-main)', fontWeight: 800 }}>{kb.courses.length} Active</span>
                                </div>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '5px 0' }}></div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                    {kb.courses.slice(0, 8).map((_, i) => (
                                        <div key={i} style={{ height: '6px', background: 'var(--primary)', borderRadius: '10px', opacity: 0.3 + (i * 0.1) }}></div>
                                    ))}
                                </div>
                            </div>
                        ) : <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No projection data available.</div>}
                    </div>

                    {/* Neural Streams History */}
                    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0' }}>
                        <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="card-heading">Stream History</div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {sessions.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedSessionId(s.id)}
                                        style={{
                                            padding: '16px',
                                            background: s.id === selectedSessionId ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            border: s.id === selectedSessionId ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: '0.2s'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>{s.title || `Stream #${s.id}`}</div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>{s.updated_at ? new Date(s.updated_at).toLocaleTimeString() : '—'}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Handoff Mediation */}
                    <div className="glass-panel" style={{ padding: '30px', borderLeft: '4px solid var(--accent)' }}>
                        <div className="card-heading" style={{ marginBottom: '20px' }}>Strategic Handoff</div>
                        <textarea
                            value={ticketRequest}
                            onChange={(e) => setTicketRequest(e.target.value)}
                            className="form-input"
                            placeholder="Specify mediation requirements..."
                            style={{ width: '100%', marginBottom: '15px', minHeight: '80px', background: 'rgba(0,0,0,0.15)' }}
                        ></textarea>
                        <button 
                            onClick={handleCreateTicket}
                            disabled={ticketCreateLoading || !ticketRequest.trim()}
                            className="btn-command primary"
                            style={{ width: '100%', height: '50px', fontSize: '0.75rem', padding: 0 }}
                        >
                            {ticketCreateLoading ? 'AUTHORIZING...' : 'AUTHORIZE HUMAN MEDIATION'}
                        </button>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default AdminAiInboxPage;
