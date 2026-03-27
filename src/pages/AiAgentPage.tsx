import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import type { ChatMessage, ChatSession } from '../types';
import './AiAgentPage.css';

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
                ? rawCourses.map((c: unknown): CoursePreview | null => {
                    if (!c || typeof c !== 'object') return null;
                    const obj = c as Record<string, unknown>;
                    const id = typeof obj.id === 'number' ? obj.id : undefined;
                    const title = typeof obj.title === 'string' ? obj.title : undefined;
                    return { id, title };
                }).filter(Boolean) as CoursePreview[]
                : undefined;

            const rawCommands = record.commands;
            const commands = Array.isArray(rawCommands)
                ? rawCommands.map((cmd: unknown): ChatCommand | null => {
                    if (!cmd || typeof cmd !== 'object') return null;
                    const obj = cmd as Record<string, unknown>;
                    const keyword = typeof obj.keyword === 'string' ? obj.keyword : '';
                    if (!keyword) return null;
                    const label = typeof obj.label === 'string' ? obj.label : undefined;
                    const description = typeof obj.description === 'string' ? obj.description : undefined;
                    return { keyword, label, description };
                }).filter(Boolean) as ChatCommand[]
                : undefined;

            return { text, courses, commands };
        }
        return { text: content };
    } catch {
        return { text: content };
    }
}

const AiAgentPage: React.FC = () => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sessionsLoaded, setSessionsLoaded] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [input, setInput] = useState('');

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const quickPrompts = useMemo(
        () => [
            { label: 'Help / Commands', keyword: 'help' },
            { label: 'Courses', keyword: 'courses' },
            { label: 'Tasks / Dashboard', keyword: 'tasks' },
            { label: 'Badges / Leaderboard', keyword: 'badges' },
            { label: 'Profile / Account', keyword: 'profile' },
            { label: 'Cold Calling Tips', keyword: 'cold calling tips' },
        ],
        []
    );

    const loadSessions = useCallback(async () => {
        setError(null);
        try {
            const res = await apiClient.getAiChatSessions();
            if (res.success && Array.isArray(res.sessions)) {
                const sessionList = res.sessions;
                setSessions(res.sessions);
                // If we don't have a selected session, pick the most recent for convenience.
                setSessionId(prev => {
                    if (prev !== null) return prev;
                    if (sessionList.length === 0) return prev;
                    return sessionList[0].id;
                });
            } else {
                setError(res.message || 'Failed to load chat sessions.');
            }
        } catch (e: unknown) {
            setError(getErrorMessage(e));
        } finally {
            setSessionsLoaded(true);
        }
    }, []);

    const loadMessages = async (id: number) => {
        setLoadingMessages(true);
        setError(null);
        try {
            const res = await apiClient.getAiChatMessages(id);
            if (res.success && Array.isArray(res.messages)) {
                setMessages(res.messages);
            } else {
                setMessages([]);
                setError(res.message || 'Failed to load chat history.');
            }
        } catch (e: unknown) {
            setMessages([]);
            setError(getErrorMessage(e));
        } finally {
            setLoadingMessages(false);
        }
    };

    useEffect(() => {
        void loadSessions();
    }, [loadSessions]);

    useEffect(() => {
        if (sessionId === null) {
            setMessages([]);
            return;
        }
        void loadMessages(sessionId);
    }, [sessionId]);

    useEffect(() => {
        // Keep the newest assistant reply visible.
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, loadingMessages]);

    const handleNewChat = async () => {
        setError(null);
        setMessages([]);
        setSessionId(null);
        setSessionsLoaded(true);
    };

    const handleDeleteSession = async () => {
        if (sessionId === null) return;
        setError(null);
        try {
            const res = await apiClient.deleteAiChatSession(sessionId);
            if (!res.success) {
                setError(res.message || 'Failed to delete chat session.');
                return;
            }
            setSessionId(null);
            setMessages([]);
            await loadSessions();
        } catch (e: unknown) {
            setError(getErrorMessage(e));
        }
    };

    const handleSend = async (overrideText?: string) => {
        const text = (overrideText ?? input).trim();
        if (!text || sending) return;

        setSending(true);
        setError(null);
        const pendingUserMessage: ChatMessage = {
            id: Date.now(),
            role: 'user',
            content: text,
        };
        setMessages(prev => [...prev, pendingUserMessage]);
        setInput('');

        try {
            const res = await apiClient.sendAiChatMessage({
                message: text,
                session_id: sessionId,
            });

            if (!res.success) {
                setError(res.message || 'AI request failed.');
                return;
            }

            // Refresh session/messages from the backend so history parsing stays accurate.
            if (typeof res.session_id === 'number') {
                setSessionId(res.session_id);
            }
            await loadSessions();
            if (typeof res.session_id === 'number') {
                await loadMessages(res.session_id);
            }
        } catch (e: unknown) {
            setError(getErrorMessage(e));
        } finally {
            setSending(false);
        }
    };

    const assistantMessageFooter = (m: ChatMessage) => {
        const parsed = safeParseStoredAssistantContent(m.content);
        if (parsed.commands && parsed.commands.length > 0) {
            return (
                <div className="ai-agent-commands">
                    {parsed.commands.slice(0, 6).map((c, idx) => (
                        <button
                            key={idx}
                            className="ai-agent-chip"
                            type="button"
                            onClick={() => void handleSend(c.keyword)}
                            title={c.description || c.keyword}
                        >
                            {c.label || c.keyword}
                        </button>
                    ))}
                </div>
            );
        }

        if (parsed.courses && parsed.courses.length > 0) {
            const first = parsed.courses.slice(0, 5);
            return (
                <div className="ai-agent-courses">
                    <div className="ai-agent-subtle">Courses found: {parsed.courses.length}</div>
                    <div className="ai-agent-course-list">
                        {first.map((c, idx) => (
                            <button
                                key={c.id ?? c.title ?? idx}
                                className="ai-agent-link"
                                type="button"
                                onClick={() => void handleSend(`courses ${c.title ?? ''}`)}
                            >
                                {c.title || 'Untitled course'}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="ai-agent-page fade-in">
            <div className="glass-panel ai-agent-shell">
                <div className="ai-agent-topbar">
                    <div className="ai-agent-topbar-left">
                        <div className="ai-agent-title">AI AGENT</div>
                        <div className="ai-agent-subtitle">Reven chat for courses, tasks, badges, and support-style guidance.</div>
                    </div>

                    <div className="ai-agent-topbar-right">
                        <div className="ai-agent-select-wrap">
                            <label className="ai-agent-label">Session</label>
                            <select
                                className="ai-agent-select"
                                value={sessionId ?? ''}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (!v) {
                                        setSessionId(null);
                                        return;
                                    }
                                    setSessionId(Number(v));
                                }}
                            >
                                <option value="">New chat (created on send)</option>
                                {sessions.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.title || `Session #${s.id}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button className="btn-view ai-agent-btn" type="button" onClick={() => void handleNewChat()}>
                            New chat
                        </button>
                        <button
                            className="btn-view ai-agent-btn"
                            type="button"
                            onClick={() => void handleDeleteSession()}
                            disabled={sessionId === null}
                            title={sessionId === null ? 'Select a session first' : 'Delete this session'}
                        >
                            Delete
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="ai-agent-error" role="alert">
                        {error}
                    </div>
                )}

                <div className="ai-agent-grid">
                    <div className="ai-agent-chat glass-panel">
                        <div className="ai-agent-messages" aria-live="polite">
                            {!sessionsLoaded || loadingMessages ? (
                                <div className="ai-agent-empty">Loading...</div>
                            ) : messages.length === 0 ? (
                                <div className="ai-agent-empty">
                                    Start a chat. Try one of the quick prompts on the right.
                                </div>
                            ) : (
                                messages.map(m => (
                                    <div
                                        key={m.id}
                                        className={`ai-agent-message ${m.role === 'user' ? 'from-user' : 'from-assistant'}`}
                                    >
                                        <div className="ai-agent-bubble">
                                            <div className="ai-agent-role">{m.role === 'user' ? 'You' : 'Reven'}</div>
                                            <div className="ai-agent-text">{m.role === 'assistant' ? safeParseStoredAssistantContent(m.content).text : m.content}</div>
                                        </div>
                                        {m.role === 'assistant' ? assistantMessageFooter(m) : null}
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="ai-agent-inputbar">
                            <textarea
                                className="ai-agent-textarea"
                                placeholder="Ask Reven..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        void handleSend();
                                    }
                                }}
                                rows={2}
                            />
                            <button
                                className="btn-primary ai-agent-send"
                                type="button"
                                onClick={() => void handleSend()}
                                disabled={sending || !input.trim()}
                                title={sending ? 'Sending...' : 'Send message'}
                            >
                                {sending ? 'Sending...' : 'Send'}
                            </button>
                        </div>
                    </div>

                    <div className="ai-agent-side glass-panel">
                        <div className="ai-agent-side-title">Knowledge & Support</div>
                        <div className="ai-agent-side-text">
                            This agent can help with RealtorOne courses, training content, daily tasks, momentum, badges/leaderboard, and account/profile actions.
                        </div>

                        <div className="ai-agent-side-section">
                            <div className="ai-agent-side-subtitle">Quick prompts</div>
                            <div className="ai-agent-chips">
                                {quickPrompts.map(p => (
                                    <button
                                        key={p.keyword}
                                        className="ai-agent-chip"
                                        type="button"
                                        onClick={() => void handleSend(p.keyword)}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="ai-agent-side-section">
                            <div className="ai-agent-side-subtitle">Other questions</div>
                            <div className="ai-agent-side-text">
                                If your question is outside RealtorOne training scope, Reven will politely redirect and keep help focused.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiAgentPage;

