import React from 'react';

interface ConfirmModalProps {
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onClose: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    show,
    title,
    message,
    onConfirm,
    onClose
}) => {
    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
                <div style={{ padding: '25px', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⚠️</div>
                    <h3 style={{ margin: '0 0 10px 0', fontWeight: 800 }}>{title}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '25px' }}>{message}</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={onClose}
                            className="btn-primary"
                            style={{ flex: 1, background: 'var(--bg-app)', color: 'var(--text-main)', border: 'none' }}
                        >Cancel</button>
                        <button
                            onClick={onConfirm}
                            className="btn-primary"
                            style={{ flex: 1, background: 'var(--error)', boxShadow: '0 10px 20px rgba(239,68,68,0.2)' }}
                        >Confirm Delete</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
