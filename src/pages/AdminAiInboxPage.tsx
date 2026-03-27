import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import type { AdminAiUserSummary, AiHumanTicket, ChatMessage, ChatSession, Course } from '../types';
import './AdminAiInboxPage.css';

type ChatCommand = {
    keyword: string;
    label?: string;
    description?: string;
};

type CoursePreview = {
    id?: number;
    title?: string;
};

function getErrorMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    return typeof e === 'string' ? e : 'Request failed.';
}

function safeParseStoredAssistantContent(content: string): { text: string; courses?: CoursePreview[]; commands?: ChatCommand[] } {
    if (!content || (content[0] ?? '') !== '{') return { text: content };
    try {
        const decoded: unknown = JSON.parse(content);
        if (decoded && typeof decoded === 'object' && 'text' in decoded) {
            const record = decoded as Record<string, unknown>;
            const textVal = record.text;
            const text = typeof textVal === 'string' ? textVal : String(textVal);

            const rawCourses = record.courses;
            const courses = Array.isArray(rawCourses)
                ? rawCourses
                    .map((c: unknown): CoursePreview | null => {
                        if (!c || typeof c !== 'object') return null;
                        const obj = c as Record<string, unknown>;
                        const id = typeof obj.id === 'number' ? obj.id : undefined;
                        const title = typeof obj.title === 'string' ? obj.title : undefined;
                        return { id, title };
                    })
                    .filter(Boolean) as CoursePreview[]
                : undefined;

            const rawCommands = record.commands;
            const commands = Array.isArray(rawCommands)
                ? rawCommands
                    .map((cmd: unknown): ChatCommand | null => {
                        if (!cmd || typeof cmd !== 'object') return null;
                        const obj = cmd as Record<string, unknown>;
                        const keyword = typeof obj.keyword === 'string' ? obj.keyword : '';
                        if (!keyword) return null;
                        const label = typeof obj.label === 'string' ? obj.label : undefined;
                        const description = typeof obj.description === 'string' ? obj.description : undefined;
                        return { keyword, label, description };
                    })
                    .filter(Boolean) as ChatCommand[]
                : undefined;

            return { text, courses, commands };
        }
        return { text: content };
    } catch {
        return { text: content };
    }
}

const AdminAiInboxPage: React.FC = () => {
    const [error, setError] = useState<string | null>(null);

    const [adminUsers, setAdminUsers] = useState<AdminAiUserSummary[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const [kb, setKb] = useState<{ tier: string; courses: Course[] } | null>(null);
    const [loadingKb, setLoadingKb] = useState(false);

    const [tickets, setTickets] = useState<AiHumanTicket[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);

    const [ticketRequest, setTicketRequest] = useState('');
    const [ticketCreateLoading, setTicketCreateLoading] = useState(false);

    const [resolutionByTicketId, setResolutionByTicketId] = useState<Record<number, string>>({});

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const selectedUser = useMemo(() => {
        if (selectedUserId === null) return null;
        return adminUsers.find(u => u.id === selectedUserId) ?? null;
    }, [adminUsers, selectedUserId]);

    const filteredTickets = useMemo(() => {
        if (selectedUserId === null) return [];
        return tickets.filter(t => t.user_id === selectedUserId);
    }, [tickets, selectedUserId]);

    const loadUsers = useCallback(async () => {
        setLoadingUsers(true);
        setError(null);
        try {
            const res = await apiClient.getAdminAiUsers();
            if (res.success && Array.isArray(res.data)) {
                setAdminUsers(res.data);
                if (res.data.length > 0) setSelectedUserId(res.data[0].id);
            } else {
                setError(res.message || 'Failed to load users for AI inbox.');
            }
        } catch (e: unknown) {
            setError(getErrorMessage(e));
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    const loadSessions = useCallback(async (userId: number) => {
        setLoadingSessions(true);
        setError(null);
        try {
            const res = await apiClient.getAdminAiUserSessions(userId);
            if (res.success && Array.isArray(res.data)) {
                setSessions(res.data);
                setSelectedSessionId(res.data.length > 0 ? res.data[0].id : null);
            } else {
                setSessions([]);
                setSelectedSessionId(null);
                setError(res.message || 'Failed to load chat sessions.');
            }
        } catch (e: unknown) {
            setSessions([]);
            setSelectedSessionId(null);
            setError(getErrorMessage(e));
        } finally {
            setLoadingSessions(false);
        }
    }, []);

    const loadMessages = useCallback(async (sessionId: number) => {
        setLoadingMessages(true);
        setError(null);
        try {
            const res = await apiClient.getAdminAiSessionMessages(sessionId);
            if (res.success && Array.isArray(res.data)) {
                setMessages(res.data);
            } else {
                setMessages([]);
                setError(res.message || 'Failed to load chat messages.');
            }
        } catch (e: unknown) {
            setMessages([]);
            setError(getErrorMessage(e));
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    const loadKb = useCallback(async (userId: number) => {
        setLoadingKb(true);
        setError(null);
        try {
            const res = await apiClient.getAdminAiUserKb(userId);
            if (res.success && res.data) {
                setKb(res.data);
            } else {
                setKb(null);
            }
        } catch (e: unknown) {
            setKb(null);
            setError(getErrorMessage(e));
        } finally {
            setLoadingKb(false);
        }
    }, []);

    const loadTickets = useCallback(async () => {
        setLoadingTickets(true);
        setError(null);
        try {
            const res = await apiClient.getAdminAiTickets();
            if (res.success && Array.isArray(res.data)) {
                setTickets(res.data);
            } else {
                setTickets([]);
            }
        } catch (e: unknown) {
            setTickets([]);
            setError(getErrorMessage(e));
        } finally {
            setLoadingTickets(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        if (selectedUserId === null) return;
        void loadSessions(selectedUserId);
        void loadKb(selectedUserId);
        void loadTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUserId]);

    useEffect(() => {
        if (selectedSessionId === null) {
            setMessages([]);
            return;
        }
        void loadMessages(selectedSessionId);
    }, [selectedSessionId, loadMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, loadingMessages]);

    const assistantMessageFooter = (m: ChatMessage) => {
        const parsed = safeParseStoredAssistantContent(m.content);
        if (parsed.commands && parsed.commands.length > 0) return null;
        if (parsed.courses && parsed.courses.length > 0) return null;
        return null;
    };

    const handleCreateTicket = async () => {
        if (selectedUserId === null) return;
        const trimmed = ticketRequest.trim();
        if (!trimmed) return;
        setTicketCreateLoading(true);
        setError(null);
        try {
            const res = await apiClient.createAdminAiTicket({
                user_id: selectedUserId,
                chat_session_id: selectedSessionId ?? null,
                request_message: trimmed,
            });
            if (!res.success) {
                setError(res.message || 'Failed to create ticket.');
                return;
            }
            setTicketRequest('');
            await loadTickets();
        } catch (e: unknown) {
            setError(getErrorMessage(e));
        } finally {
            setTicketCreateLoading(false);
        }
    };

    const handleResolveTicket = async (ticket: AiHumanTicket) => {
        if (!ticket.id) return;
        const resolution = (resolutionByTicketId[ticket.id] ?? '').trim();
        if (!resolution) return;
        setError(null);
        try {
            const res = await apiClient.resolveAdminAiTicket(ticket.id, resolution);
            if (!res.success) {
                setError(res.message || 'Failed to resolve ticket.');
                return;
            }
            setResolutionByTicketId(prev => ({ ...prev, [ticket.id]: '' }));
            await loadTickets();
        } catch (e: unknown) {
            setError(getErrorMessage(e));
        }
    };

    return (
        <div className="admin-ai-inbox-page fade-in">
            <div className="glass-panel admin-ai-inbox-shell">
                <div className="admin-ai-inbox-topbar">
                    <div>
                        <div className="admin-ai-inbox-title">AI INBOX</div>
                        <div className="admin-ai-inbox-subtitle">
                            Monitor user AI chats, token usage, enabled knowledge base, and human handoff tickets.
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div className="admin-ai-inbox-label">Selected</div>
                        <div style={{ fontWeight: 950, color: 'var(--text-main)' }}>
                            {selectedUser ? (selectedUser.name || selectedUser.email) : '—'}
                        </div>
                        {selectedUser ? (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, marginTop: 6 }}>
                                Tier: {selectedUser.membership_tier || 'Consultant'} • tokens today: {selectedUser.ai_tokens_today}
                            </div>
                        ) : null}
                    </div>
                </div>

                {error ? (
                    <div className="ai-agent-error" role="alert">
                        {error}
                    </div>
                ) : null}

                <div className="admin-ai-inbox-grid">
                    {/* Users */}
                    <div className="admin-ai-col">
                        <div className="admin-ai-section-title">Users</div>
                        {loadingUsers ? (
                            <div className="admin-ai-empty">Loading...</div>
                        ) : adminUsers.length === 0 ? (
                            <div className="admin-ai-empty">No users found.</div>
                        ) : (
                            <div className="admin-ai-scroll admin-ai-user-list">
                                {adminUsers.map(u => (
                                    <button
                                        key={u.id}
                                        type="button"
                                        className={`admin-ai-row ${u.id === selectedUserId ? 'active' : ''}`}
                                        onClick={() => setSelectedUserId(u.id)}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                                            <div style={{ fontWeight: 950, color: 'var(--text-main)', fontSize: 13 }}>
                                                {u.name || u.email}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800 }}>
                                                {u.membership_tier || 'Consultant'} • tokens today: {u.ai_tokens_today}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sessions */}
                    <div className="admin-ai-col">
                        <div className="admin-ai-section-title">Sessions</div>
                        {!selectedUserId ? (
                            <div className="admin-ai-empty">Select a user.</div>
                        ) : loadingSessions ? (
                            <div className="admin-ai-empty">Loading...</div>
                        ) : sessions.length === 0 ? (
                            <div className="admin-ai-empty">No sessions for this user.</div>
                        ) : (
                            <div className="admin-ai-scroll admin-ai-session-list">
                                {sessions.map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        className={`admin-ai-row ${s.id === selectedSessionId ? 'active' : ''}`}
                                        onClick={() => setSelectedSessionId(s.id)}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                                            <div style={{ fontWeight: 950, color: 'var(--text-main)', fontSize: 13 }}>
                                                {s.title || `Session #${s.id}`}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800 }}>
                                                {s.updated_at ? new Date(s.updated_at).toLocaleString() : '—'}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="admin-ai-col admin-ai-col-details">
                        <div className="admin-ai-details-kb">
                            <div className="admin-ai-section-title">Enabled Knowledge Base</div>
                            {loadingKb ? (
                                <div className="admin-ai-empty">Loading...</div>
                            ) : kb ? (
                                <div className="admin-ai-side-text" style={{ marginBottom: 0 }}>
                                    Tier: <strong style={{ color: 'var(--text-main)' }}>{kb.tier}</strong> • enabled courses: <strong style={{ color: 'var(--text-main)' }}>{kb.courses.length}</strong>
                                </div>
                            ) : (
                                <div className="admin-ai-side-text" style={{ marginBottom: 0 }}>No KB data.</div>
                            )}
                        </div>

                        <div className="admin-ai-details-messages">
                            <div className="admin-ai-section-title">Messages</div>
                            <div className="admin-ai-scroll admin-ai-messages">
                                {loadingMessages ? (
                                    <div className="admin-ai-empty">Loading...</div>
                                ) : messages.length === 0 ? (
                                    <div className="admin-ai-empty">No messages to show.</div>
                                ) : (
                                    messages.map(m => (
                                        <div key={m.id} className={`admin-ai-message ${m.role === 'user' ? 'from-user' : 'from-assistant'}`}>
                                            <div className="admin-ai-bubble">
                                                <div className="admin-ai-role">{m.role === 'user' ? 'User' : 'Reven'}</div>
                                                <div className="admin-ai-text">{m.role === 'assistant' ? safeParseStoredAssistantContent(m.content).text : m.content}</div>
                                                {m.role === 'assistant' && typeof m.total_tokens === 'number' ? (
                                                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 800 }}>
                                                        Tokens used: {m.total_tokens}{m.model ? ` (${m.model})` : ''}
                                                    </div>
                                                ) : null}
                                            </div>
                                            {m.role === 'assistant' ? assistantMessageFooter(m) : null}
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        <div className="admin-ai-details-tickets">
                            <div className="admin-ai-section-title">Human Handoff</div>

                            <div className="admin-ai-ticket-create">
                                <textarea
                                    className="admin-ai-textarea"
                                    placeholder="Add note for human support (create ticket for this user/session)..."
                                    value={ticketRequest}
                                    onChange={(e) => setTicketRequest(e.target.value)}
                                    rows={2}
                                    disabled={!selectedUserId}
                                />
                                <button
                                    className="btn-primary"
                                    type="button"
                                    onClick={() => void handleCreateTicket()}
                                    disabled={!selectedUserId || ticketCreateLoading || !ticketRequest.trim()}
                                >
                                    {ticketCreateLoading ? 'Creating...' : 'Create Ticket'}
                                </button>
                            </div>

                            {loadingTickets ? (
                                <div className="admin-ai-empty">Loading...</div>
                            ) : filteredTickets.length === 0 ? (
                                <div className="admin-ai-side-text" style={{ marginBottom: 0 }}>No tickets yet.</div>
                            ) : (
                                <div className="admin-ai-ticket-list">
                                    {filteredTickets.slice(0, 8).map(t => {
                                        const isResolved = t.status === 'resolved';
                                        const resolutionValue = resolutionByTicketId[t.id] ?? '';
                                        return (
                                            <div key={t.id} className="admin-ai-ticket-row">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 950, color: 'var(--text-main)' }}>
                                                            Ticket #{t.id} • {isResolved ? 'Resolved' : 'Open'}
                                                        </div>
                                                        {t.request_message ? (
                                                            <div className="admin-ai-muted" style={{ marginTop: 6 }}>
                                                                {t.request_message}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800 }}>
                                                        {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
                                                    </div>
                                                </div>

                                                {isResolved ? (
                                                    t.admin_resolution ? (
                                                        <div className="admin-ai-muted" style={{ marginTop: 10 }}>
                                                            Resolution: {t.admin_resolution}
                                                        </div>
                                                    ) : null
                                                ) : (
                                                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        <textarea
                                                            className="admin-ai-textarea"
                                                            value={resolutionValue}
                                                            onChange={(e) => setResolutionByTicketId(prev => ({ ...prev, [t.id]: e.target.value }))}
                                                            placeholder="Admin resolution / summary..."
                                                            rows={2}
                                                        />
                                                        <button
                                                            className="btn-view"
                                                            type="button"
                                                            onClick={() => void handleResolveTicket(t)}
                                                            disabled={!resolutionValue.trim()}
                                                            style={{ alignSelf: 'flex-end' }}
                                                        >
                                                            Resolve
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAiInboxPage;

