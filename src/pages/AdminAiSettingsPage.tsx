import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import type { AdminAiUserSummary } from '../types';

type Tier = 'Consultant' | 'Rainmaker' | 'Titan';
type KbBlock = { id: string; title: string; content: string; enabled: boolean };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `kb_${Date.now()}_${Math.random().toString(16).slice(2)}`);
const defaultModelsForProvider = (p: string): string[] => {
  switch (p) {
    case 'openai':
      return ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4.1'];
    case 'openrouter':
      return ['openai/gpt-4o-mini', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash'];
    case 'groq':
      return ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
    case 'together':
      return ['meta-llama/Llama-3.1-70B-Instruct-Turbo', 'meta-llama/Llama-3.1-8B-Instruct-Turbo', 'Qwen/Qwen2.5-72B-Instruct-Turbo'];
    case 'deepseek':
      return ['deepseek-chat', 'deepseek-reasoner'];
    case 'mistral':
      return ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'];
    case 'fireworks':
      return ['accounts/fireworks/models/llama-v3p1-70b-instruct', 'accounts/fireworks/models/qwen2p5-72b-instruct', 'accounts/fireworks/models/deepseek-v3'];
    case 'xai':
      return ['grok-2-latest', 'grok-2-mini-latest'];
    default:
      return [];
  }
};

const AdminAiSettingsPage: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [provider, setProvider] = useState<'openai' | 'openrouter' | 'groq' | 'together' | 'deepseek' | 'mistral' | 'fireworks' | 'xai' | 'disabled'>('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [kbCustomEnabled, setKbCustomEnabled] = useState(true);
  const [kbCoursesEnabled, setKbCoursesEnabled] = useState(true);
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [kbBlocks, setKbBlocks] = useState<KbBlock[]>([]);
  const [behavior, setBehavior] = useState('');

  const [tierAllow, setTierAllow] = useState<Record<Tier, boolean>>({
    Consultant: true,
    Rainmaker: true,
    Titan: true,
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfMsg, setPdfMsg] = useState('');
  const [blockPdfUploadingId, setBlockPdfUploadingId] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminAiUserSummary[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [testUserId, setTestUserId] = useState<number | null>(null);
  const [testPrompt, setTestPrompt] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testReply, setTestReply] = useState('');

  const load = useCallback(async () => {
    setMsg('');
    try {
      const res = await apiClient.getAdminAiSettings();
      if (res.success && res.data) {
        const p = (res.data.provider || 'openai') as any;
        setProvider((p === 'openai' || p === 'openrouter' || p === 'groq' || p === 'together' || p === 'deepseek' || p === 'mistral' || p === 'fireworks' || p === 'xai' || p === 'disabled') ? p : 'openai');
        setModel(res.data.model ?? 'gpt-4o-mini');
        setBaseUrl(res.data.base_url ?? '');
        setApiKey(res.data.api_key ?? '');
        setKnowledgeBase(res.data.knowledge_base ?? '');
        const blocks = Array.isArray(res.data.kb_blocks) ? res.data.kb_blocks : [];
        setKbBlocks(blocks.map((b) => ({
          id: String(b.id || newId()),
          title: String(b.title ?? ''),
          content: String(b.content ?? ''),
          enabled: Boolean(b.enabled ?? true),
        })));
        setBehavior(String(res.data.behavior ?? ''));
        setKbCustomEnabled(res.data.kb_sources?.custom ?? true);
        setKbCoursesEnabled(res.data.kb_sources?.courses ?? true);
        setTierAllow({
          Consultant: res.data.tier_allow?.Consultant ?? true,
          Rainmaker: res.data.tier_allow?.Rainmaker ?? true,
          Titan: res.data.tier_allow?.Titan ?? true,
        });
      }
    } catch {
      // silent
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await apiClient.getAdminAiUsers();
      if (res.success && res.data) {
        setUsers(res.data);
        if (res.data.length > 0) setTestUserId(res.data[0].id);
      }
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadUsers();
  }, [load, loadUsers]);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await apiClient.updateAdminAiSettings({
        provider,
        model: model.trim(),
        base_url: baseUrl.trim(),
        api_key: apiKey.trim(),
        knowledge_base: knowledgeBase,
        kb_blocks: kbBlocks.map((b) => ({ id: b.id, title: b.title, content: b.content, enabled: b.enabled })),
        behavior,
        kb_sources: { custom: kbCustomEnabled, courses: kbCoursesEnabled },
        tier_allow: { ...tierAllow },
      });
      setMsg(res.success ? 'Saved.' : (res.message ?? 'Failed to save.'));
    } catch {
      setMsg('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const uploadPdf = async (mode: 'append' | 'replace') => {
    if (!pdfFile) return;
    setPdfUploading(true);
    setPdfMsg('');
    try {
      const res = await apiClient.uploadAdminAiKnowledgeBasePdf({ pdf: pdfFile, mode });
      if (res.success && res.data?.knowledge_base != null) {
        setKnowledgeBase(res.data.knowledge_base);
        const blocks = (res.data as any)?.kb_blocks;
        if (Array.isArray(blocks)) {
          setKbBlocks(blocks.map((b: any) => ({
            id: String(b.id || newId()),
            title: String(b.title ?? ''),
            content: String(b.content ?? ''),
            enabled: Boolean(b.enabled ?? true),
          })));
        }
        setPdfMsg('PDF ingested into knowledge base.');
      } else {
        setPdfMsg(res.message || 'Failed to ingest PDF.');
      }
    } catch {
      setPdfMsg('Failed to ingest PDF.');
    } finally {
      setPdfUploading(false);
    }
  };

  const sendTest = async () => {
    if (!testUserId) return;
    const p = testPrompt.trim();
    if (!p) return;
    setTestSending(true);
    setTestReply('');
    try {
      const res = await apiClient.adminAiSendForUser({ user_id: testUserId, message: p, session_id: null });
      if (res.success) setTestReply(res.reply ?? '');
      else setTestReply(res.message ?? 'Failed to send.');
    } catch {
      setTestReply('Failed to send.');
    } finally {
      setTestSending(false);
    }
  };

  const totals = useMemo(() => {
    const todayTokens = users.reduce((acc, u) => acc + (u.ai_tokens_today || 0), 0);
    const todayCalls = users.reduce((acc, u) => acc + (u.ai_calls_today || 0), 0);
    return { todayTokens, todayCalls };
  }, [users]);

  const tokenLimitForBar = 50000; // UI-only reference cap

  return (
    <div className="view-container fade-in" style={{ padding: '0 40px 60px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 26, paddingTop: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div className="status-pulse"></div>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase' }}>
              AI Runtime Control Center
            </span>
          </div>
          <h1 className="text-outfit" style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, letterSpacing: '-1.2px' }}>
            AI Settings <span style={{ color: 'var(--primary)', fontWeight: 600 }}>&amp; Usage</span>
          </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="card-heading" style={{ marginBottom: 6 }}>Today</div>
          <div className="text-outfit" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
            {totals.todayTokens.toLocaleString()} <span style={{ fontSize: '0.75rem', opacity: 0.55 }}>TOKENS</span> · {totals.todayCalls.toLocaleString()} <span style={{ fontSize: '0.75rem', opacity: 0.55 }}>CALLS</span>
          </div>
          <button
            className="btn-command primary"
            type="button"
            onClick={save}
            disabled={saving}
            style={{ marginTop: 10, minWidth: 180, height: 42, fontSize: '0.74rem', padding: '0 14px' }}
          >
            {saving ? 'SAVING…' : 'SAVE SETTINGS'}
          </button>
          {msg ? (
            <div style={{ marginTop: 8, fontSize: '0.74rem', fontWeight: 750, color: msg.toLowerCase().includes('saved') || msg === 'Saved.' ? 'var(--success)' : 'var(--warning, #f59e0b)' }}>
              {msg}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="glass-panel" style={{ padding: 24, borderLeft: '4px solid var(--primary)' }}>
            <div className="card-heading" style={{ marginBottom: 14 }}>Runtime Provider</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Provider</label>
              <select className="form-input" value={provider} onChange={(e) => setProvider(e.target.value as any)}>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="openrouter">OpenRouter</option>
                <option value="groq">Groq</option>
                <option value="together">Together</option>
                <option value="deepseek">DeepSeek</option>
                <option value="mistral">Mistral</option>
                <option value="fireworks">Fireworks</option>
                <option value="xai">xAI</option>
                <option value="disabled">Disabled (basic replies)</option>
              </select>

              <label style={{ marginTop: 6, fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Model</label>
              <input
                className="form-input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={provider === 'disabled'}
                placeholder="Pick from list or type custom model…"
                list="ai-model-suggestions"
              />
              <datalist id="ai-model-suggestions">
                {defaultModelsForProvider(provider).map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>

              <label style={{ marginTop: 6, fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Base URL (optional)</label>
              <input className="form-input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} disabled={provider === 'disabled'} placeholder="Leave empty to use provider default" />

              <label style={{ marginTop: 6, fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>API Key</label>
              <input className="form-input" type="password" placeholder="Provider API key…" value={apiKey} onChange={(e) => setApiKey(e.target.value)} disabled={provider === 'disabled'} />
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 24 }}>
            <div className="card-heading" style={{ marginBottom: 14 }}>Access Control (by Tier)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              {(['Consultant', 'Rainmaker', 'Titan'] as Tier[]).map((t) => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{t}</div>
                  <input
                    type="checkbox"
                    checked={tierAllow[t]}
                    onChange={(e) => setTierAllow((prev) => ({ ...prev, [t]: e.target.checked }))}
                    style={{ width: 18, height: 18 }}
                  />
                </label>
              ))}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 650, opacity: 0.85 }}>
                When OFF, users in that tier will get basic replies (no AI calls / no token usage).
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 24 }}>
            <div className="card-heading" style={{ marginBottom: 14 }}>Knowledge Sources</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>Use Custom Knowledge Base</span>
                <input type="checkbox" checked={kbCustomEnabled} onChange={(e) => setKbCustomEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>Use Courses Knowledge</span>
                <input type="checkbox" checked={kbCoursesEnabled} onChange={(e) => setKbCoursesEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              </label>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 24 }}>
            <div className="card-heading" style={{ marginBottom: 14 }}>Save Settings</div>
            <button className="btn-command primary" type="button" onClick={save} disabled={saving} style={{ width: '100%', height: 48, fontSize: '0.78rem', padding: 0 }}>
              {saving ? 'SAVING…' : 'SAVE AI SETTINGS'}
            </button>
            {msg ? (
              <div style={{ marginTop: 10, fontSize: '0.78rem', fontWeight: 750, color: msg.toLowerCase().includes('saved') || msg === 'Saved.' ? 'var(--success)' : 'var(--warning, #f59e0b)' }}>
                {msg}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="glass-panel" style={{ padding: 24 }}>
            <div className="card-heading" style={{ marginBottom: 14 }}>AI Behavior / Role</div>
            <textarea
              className="form-input"
              value={behavior}
              onChange={(e) => setBehavior(e.target.value)}
              placeholder="Example: Be concise. Use bullet points. Always greet the user by name. Do not mention internal system. If user asks for pricing, answer with our offers…"
              style={{ width: '100%', minHeight: 120, background: 'rgba(0,0,0,0.15)' }}
            />
          </div>

          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 14 }}>
              <div className="card-heading">Knowledge Base Datasets</div>
              <button
                type="button"
                className="btn-command"
                onClick={() => setKbBlocks((prev) => [{ id: newId(), title: 'New dataset', content: '', enabled: true }, ...prev])}
                style={{ height: 38, fontSize: '0.72rem', padding: '0 12px' }}
              >
                + ADD DATASET
              </button>
            </div>

            {kbBlocks.length === 0 ? (
              <div style={{ padding: '18px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontWeight: 650 }}>
                No datasets yet. Add one (text) or upload PDFs below.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {kbBlocks.map((b, idx) => (
                  <div key={b.id} style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
                        <input
                          className="form-input"
                          value={b.title}
                          onChange={(e) => {
                            const v = e.target.value;
                            setKbBlocks((prev) => prev.map((x) => x.id === b.id ? { ...x, title: v } : x));
                          }}
                          placeholder="Dataset title"
                          style={{ flex: 1 }}
                        />
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800 }}>
                          Enabled
                          <input
                            type="checkbox"
                            checked={b.enabled}
                            onChange={(e) => setKbBlocks((prev) => prev.map((x) => x.id === b.id ? { ...x, enabled: e.target.checked } : x))}
                            style={{ width: 16, height: 16 }}
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        className="btn-command"
                        onClick={async () => {
                          const ok = window.confirm(`Delete dataset "${b.title || 'Untitled'}"? This will remove it from the AI knowledge base.`);
                          if (!ok) return;
                          try {
                            const res = await apiClient.deleteAdminAiKbBlock(b.id);
                            const blocks = (res.data as any)?.kb_blocks;
                            if (res.success && Array.isArray(blocks)) {
                              setKbBlocks(blocks.map((bb: any) => ({
                                id: String(bb.id || newId()),
                                title: String(bb.title ?? ''),
                                content: String(bb.content ?? ''),
                                enabled: Boolean(bb.enabled ?? true),
                              })));
                            } else {
                              window.alert(res.message ?? 'Failed to delete dataset.');
                            }
                          } catch {
                            window.alert('Failed to delete dataset.');
                          }
                        }}
                        style={{ height: 38, fontSize: '0.72rem', padding: '0 12px' }}
                      >
                        DELETE
                      </button>
                    </div>
                    <textarea
                      className="form-input"
                      value={b.content}
                      onChange={(e) => {
                        const v = e.target.value;
                        setKbBlocks((prev) => prev.map((x) => x.id === b.id ? { ...x, content: v } : x));
                      }}
                      placeholder="Paste text, policies, FAQs, offers, scripts…"
                      style={{ width: '100%', minHeight: 120, background: 'rgba(0,0,0,0.15)' }}
                    />
                    <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={async (e) => {
                          const f = e.target.files?.[0] ?? null;
                          e.currentTarget.value = '';
                          if (!f) return;
                          setBlockPdfUploadingId(b.id);
                          try {
                            const res = await apiClient.replaceAdminAiKbBlockPdf({ block_id: b.id, pdf: f, title: b.title });
                            const blocks = (res.data as any)?.kb_blocks;
                            if (res.success && Array.isArray(blocks)) {
                              setKbBlocks(blocks.map((bb: any) => ({
                                id: String(bb.id || newId()),
                                title: String(bb.title ?? ''),
                                content: String(bb.content ?? ''),
                                enabled: Boolean(bb.enabled ?? true),
                              })));
                            } else {
                              window.alert(res.message ?? 'Failed to update dataset.');
                            }
                          } catch {
                            window.alert('Failed to update dataset.');
                          } finally {
                            setBlockPdfUploadingId(null);
                          }
                        }}
                        className="form-input"
                        style={{ flex: 1, minWidth: 220 }}
                      />
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 750, opacity: 0.9 }}>
                        {blockPdfUploadingId === b.id ? 'Updating dataset from PDF…' : 'Update this dataset from a new PDF'}
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 750, opacity: 0.85 }}>
                      Dataset #{idx + 1} · {b.content.length.toLocaleString()} chars
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => { setPdfFile(e.target.files?.[0] ?? null); setPdfMsg(''); }}
                className="form-input"
                style={{ flex: 1, minWidth: 220 }}
              />
              <button className="btn-command" type="button" disabled={pdfUploading || !pdfFile} onClick={() => void uploadPdf('append')} style={{ height: 42, fontSize: '0.72rem', padding: '0 14px' }}>
                {pdfUploading ? 'INGESTING…' : 'APPEND PDF'}
              </button>
              <button className="btn-command" type="button" disabled={pdfUploading || !pdfFile} onClick={() => void uploadPdf('replace')} style={{ height: 42, fontSize: '0.72rem', padding: '0 14px' }}>
                REPLACE KB
              </button>
            </div>
            {pdfMsg ? (
              <div style={{ marginTop: 10, fontSize: '0.78rem', fontWeight: 750, color: pdfMsg.includes('ingested') ? 'var(--success)' : 'var(--warning, #f59e0b)' }}>
                {pdfMsg}
              </div>
            ) : null}
          </div>

          <div className="glass-panel" style={{ padding: 24 }}>
            <div className="card-heading" style={{ marginBottom: 14 }}>Test Prompt</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              <select className="form-input" value={testUserId ?? ''} onChange={(e) => setTestUserId(e.target.value ? parseInt(e.target.value, 10) : null)}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email} · {(u.membership_tier || 'Consultant')}</option>
                ))}
              </select>
              <textarea
                className="form-input"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Write a prompt and test the current provider/model/key + KB settings…"
                style={{ width: '100%', minHeight: 92, background: 'rgba(0,0,0,0.15)' }}
              />
              <button className="btn-command primary" type="button" onClick={sendTest} disabled={testSending || !testPrompt.trim() || !testUserId} style={{ height: 46, fontSize: '0.78rem', padding: 0 }}>
                {testSending ? 'TESTING…' : 'RUN TEST'}
              </button>
              {testReply ? (
                <div style={{ padding: '14px 14px', borderRadius: 14, background: 'rgba(79, 70, 229, 0.08)', border: '1px solid rgba(79, 70, 229, 0.18)', color: 'var(--text-main)', fontWeight: 650, lineHeight: 1.6 }}>
                  {testReply}
                </div>
              ) : null}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-heading">User Token Usage</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 750 }}>
                {loadingUsers ? 'Loading…' : `${users.length} users`}
              </div>
            </div>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {users.map((u) => {
                const frac = clamp01((u.ai_tokens_today || 0) / tokenLimitForBar);
                return (
                  <div key={u.id} style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 850, color: 'var(--text-main)' }}>{u.name || u.email}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 850 }}>
                        {u.ai_tokens_today.toLocaleString()} TK today · {u.ai_calls_today.toLocaleString()} calls
                      </div>
                    </div>
                    <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round(frac * 100)}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, rgba(79,70,229,0.9), rgba(0,224,150,0.85))' }} />
                    </div>
                    <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 750 }}>
                      Tier: {(u.membership_tier || 'Consultant')} · Total: {u.ai_tokens_total.toLocaleString()} TK
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAiSettingsPage;

