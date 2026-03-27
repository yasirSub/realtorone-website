import React from 'react';
import { apiClient } from '../api/client';
import type { DiagnosisQuestion, DiagnosisQuestionOption } from '../types';

const blockerOptions: DiagnosisQuestionOption['blocker_type'][] = ['leadGeneration', 'confidence', 'closing', 'discipline'];

const emptyOption = (): DiagnosisQuestionOption => ({ text: '', blocker_type: 'leadGeneration', score: 0 });
const emptyQuestion = (): DiagnosisQuestion => ({
    id: Date.now(),
    question_text: '',
    display_order: 1,
    is_active: true,
    options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
});

const actionButtonBaseStyle: React.CSSProperties = {
    minWidth: 96,
    height: 40,
    borderRadius: 12,
    border: 'none',
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: 0.2,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
};

export default function SignupQuestionsPage() {
    const [loading, setLoading] = React.useState(true);
    const [savingId, setSavingId] = React.useState<number | null>(null);
    const [questions, setQuestions] = React.useState<DiagnosisQuestion[]>([]);
    const [error, setError] = React.useState('');

    const loadQuestions = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await apiClient.getAdminDiagnosisQuestions();
            if (!res.success) throw new Error(res.message || 'Failed to load questions');
            setQuestions((res.data || []).map(q => ({
                ...q,
                options: Array.isArray(q.options) && q.options.length > 0 ? q.options : [emptyOption(), emptyOption()],
            })));
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load';
            setError(`${msg}. If response contains HTML/DOCTYPE, backend route may be unavailable or server needs restart.`);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    const updateQuestion = (id: number, patch: Partial<DiagnosisQuestion>) => {
        setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...patch } : q)));
    };

    const updateOption = (id: number, index: number, patch: Partial<DiagnosisQuestionOption>) => {
        setQuestions(prev => prev.map(q => {
            if (q.id !== id) return q;
            const next = [...q.options];
            next[index] = { ...next[index], ...patch };
            return { ...q, options: next };
        }));
    };

    const addQuestion = () => {
        setQuestions(prev => [...prev, { ...emptyQuestion(), display_order: prev.length + 1 }]);
    };

    const saveQuestion = async (q: DiagnosisQuestion) => {
        setSavingId(q.id);
        setError('');
        try {
            const payload = {
                question_text: q.question_text.trim(),
                display_order: Number(q.display_order) || 1,
                is_active: !!q.is_active,
                options: q.options.map(o => ({
                    text: o.text.trim(),
                    blocker_type: o.blocker_type,
                    score: Number(o.score) || 0,
                })),
            };
            if (!payload.question_text) throw new Error('Question text is required');
            if (payload.options.some(o => !o.text)) throw new Error('All option texts are required');

            if (q.id > 1000000000) {
                const res = await apiClient.createAdminDiagnosisQuestion(payload);
                if (!res.success) throw new Error(res.message || 'Create failed');
                await loadQuestions();
            } else {
                const res = await apiClient.updateAdminDiagnosisQuestion(q.id, payload);
                if (!res.success) throw new Error(res.message || 'Update failed');
                await loadQuestions();
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Save failed');
        } finally {
            setSavingId(null);
        }
    };

    const deleteQuestion = async (q: DiagnosisQuestion) => {
        if (q.id > 1000000000) {
            setQuestions(prev => prev.filter(x => x.id !== q.id));
            return;
        }
        if (!window.confirm('Delete this signup question?')) return;
        setSavingId(q.id);
        setError('');
        try {
            const res = await apiClient.deleteAdminDiagnosisQuestion(q.id);
            if (!res.success) throw new Error(res.message || 'Delete failed');
            await loadQuestions();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed');
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid var(--border-color)',
                background: 'linear-gradient(180deg, rgba(124,58,237,0.10), rgba(124,58,237,0.03))'
            }}>
                <div>
                    <h2 style={{ margin: 0 }}>Signup Questions</h2>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>
                        Configure the questions shown during app signup diagnosis.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={addQuestion} style={{ minWidth: 130 }}>+ Add Question</button>
            </div>

            {error && (
                <div style={{
                    color: '#ffb4b4',
                    marginBottom: 12,
                    border: '1px solid rgba(255,107,107,0.4)',
                    background: 'rgba(255,107,107,0.08)',
                    borderRadius: 10,
                    padding: '10px 12px'
                }}>
                    {error}
                </div>
            )}
            {loading ? <div>Loading...</div> : (
                <div style={{ display: 'grid', gap: 14 }}>
                    {questions.sort((a, b) => a.display_order - b.display_order).map((q) => (
                        <div
                            key={q.id}
                            className="premium-card"
                            style={{
                                padding: 14,
                                border: '1px solid var(--border-color)',
                                borderRadius: 14,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.14)'
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 10
                            }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                                    Question #{q.display_order}
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                    <input
                                        type="checkbox"
                                        checked={q.is_active}
                                        onChange={(e) => updateQuestion(q.id, { is_active: e.target.checked })}
                                    />
                                    Active
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10, marginBottom: 10 }}>
                                <div>
                                    <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-muted)' }}>Question Text</div>
                                    <input
                                        className="premium-input"
                                        value={q.question_text}
                                        onChange={(e) => updateQuestion(q.id, { question_text: e.target.value })}
                                        placeholder="Enter question text"
                                    />
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-muted)' }}>Order</div>
                                    <input
                                        className="premium-input"
                                        type="number"
                                        min={1}
                                        value={q.display_order}
                                        onChange={(e) => updateQuestion(q.id, { display_order: Number(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: 8 }}>
                                {q.options.map((o, idx) => (
                                    <div
                                        key={`${q.id}-${idx}`}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '70px 1fr 180px 90px',
                                            gap: 8,
                                            alignItems: 'end',
                                            padding: '8px 10px',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            borderRadius: 10,
                                            background: 'rgba(255,255,255,0.01)'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-muted)' }}>Option</div>
                                            <div style={{ fontWeight: 700 }}>#{idx + 1}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-muted)' }}>Option Text</div>
                                            <input
                                                className="premium-input"
                                                value={o.text}
                                                onChange={(e) => updateOption(q.id, idx, { text: e.target.value })}
                                                placeholder={`Option ${idx + 1}`}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-muted)' }}>Blocker Type</div>
                                            <select
                                                className="premium-input"
                                                value={o.blocker_type}
                                                onChange={(e) => updateOption(q.id, idx, { blocker_type: e.target.value as DiagnosisQuestionOption['blocker_type'] })}
                                            >
                                                {blockerOptions.map(type => <option key={type} value={type}>{type}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-muted)' }}>Score</div>
                                            <input
                                                className="premium-input"
                                                type="number"
                                                min={0}
                                                max={10}
                                                value={o.score}
                                                onChange={(e) => updateOption(q.id, idx, { score: Number(e.target.value) || 0 })}
                                                placeholder="Score"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                <button
                                    onClick={() => deleteQuestion(q)}
                                    disabled={savingId === q.id}
                                    style={{
                                        ...actionButtonBaseStyle,
                                        color: '#ffd9d9',
                                        background: 'rgba(239,68,68,0.12)',
                                        border: '1px solid rgba(239,68,68,0.35)',
                                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                                        opacity: savingId === q.id ? 0.6 : 1,
                                    }}
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => saveQuestion(q)}
                                    disabled={savingId === q.id}
                                    style={{
                                        ...actionButtonBaseStyle,
                                        color: '#ffffff',
                                        background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 60%, #A855F7 100%)',
                                        boxShadow: '0 8px 20px rgba(124,58,237,0.35)',
                                        opacity: savingId === q.id ? 0.7 : 1,
                                    }}
                                >
                                    {savingId === q.id ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
