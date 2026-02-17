import React from 'react';

interface EditModalProps {
    show: boolean;
    title: string;
    label: string;
    value: string;
    onSave: (val: string) => void;
    onClose: () => void;
    onChange: (val: string) => void;
}

const EditModal: React.FC<EditModalProps> = ({
    show,
    title,
    label,
    value,
    onSave,
    onClose,
    onChange
}) => {
    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
                <div style={{ padding: '25px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>{title}</h3>
                        <button
                            onClick={onClose}
                            style={{ background: 'var(--bg-app)', border: 'none', width: '30px', height: '30px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}
                        >✕</button>
                    </div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>{label}</label>
                    <input
                        type="number"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        autoFocus
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid var(--glass-border)', background: 'var(--bg-app)', fontWeight: 800, fontSize: '1.2rem', textAlign: 'center', color: 'var(--text-main)', boxSizing: 'border-box' }}
                    />
                    <button
                        onClick={() => onSave(value)}
                        className="btn-primary"
                        style={{ width: '100%', marginTop: '18px', padding: '12px', fontSize: '0.9rem' }}
                    >Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default EditModal;
