import React, { useEffect, useState } from 'react';

interface PromptModalProps {
    title: string;
    message: string;
    defaultValue?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
    type: 'input' | 'confirm';
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
}

const PromptModal: React.FC<PromptModalProps> = ({
    title,
    message,
    defaultValue = '',
    onConfirm,
    onCancel,
    type,
    placeholder = 'Enter value...',
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}) => {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
            if (e.key === 'Enter' && type === 'input') onConfirm(value);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCancel, onConfirm, value, type]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={onCancel}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                background: 'rgba(0,0,0,0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                backdropFilter: 'blur(4px)',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="glass-panel"
                style={{
                    maxWidth: 400,
                    width: '100%',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 20,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                    background: 'rgba(23, 23, 23, 0.8)',
                }}
            >
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 950, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>{title}</h3>
                    <p style={{ margin: '10px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.5 }}>
                        {message}
                    </p>
                </div>

                {type === 'input' && (
                    <input
                        autoFocus
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 12,
                            color: 'var(--text-main)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            outline: 'none',
                        }}
                    />
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 20px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 12,
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => onConfirm(value)}
                        className="btn-command primary"
                        style={{
                            padding: '10px 24px',
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                            borderRadius: 12,
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromptModal;
