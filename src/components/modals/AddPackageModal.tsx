import React, { useState } from 'react';
import { apiClient } from '../../api/client';

interface AddPackageModalProps {
    show: boolean;
    onClose: () => void;
    setPackages: (val: any) => void;
}

const AddPackageModal: React.FC<AddPackageModalProps> = ({
    show,
    onClose,
    setPackages
}) => {
    const [newPackage, setNewPackage] = useState({
        name: '',
        tier_level: 1,
        price_monthly: 0,
        description: '',
        features: [] as string[],
        bundle_discount_3_month: 10,
        bundle_discount_6_month: 20,
        bundle_discount_12_month: 30
    });
    const [featureInput, setFeatureInput] = useState('');

    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '500px' }}>
                <div style={{ padding: '30px' }}>
                    <h3 style={{ margin: '0 0 25px 0', fontSize: '1.4rem', fontWeight: 900 }}>Forge New Membership Tier</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                            <div>
                                <label className="form-label">TIER NAME</label>
                                <input placeholder="Platinum Elite" value={newPackage.name} onChange={e => setNewPackage({ ...newPackage, name: e.target.value })} className="form-input" />
                            </div>
                            <div>
                                <label className="form-label">TIER LEVEL</label>
                                <input type="number" value={newPackage.tier_level} onChange={e => setNewPackage({ ...newPackage, tier_level: Number(e.target.value) })} className="form-input" />
                            </div>
                        </div>

                        <div>
                            <label className="form-label">BASE MONTHLY PRICE (AED)</label>
                            <input type="number" value={newPackage.price_monthly} onChange={e => setNewPackage({ ...newPackage, price_monthly: Number(e.target.value) })} className="form-input" />
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>This base price is used to calculate bundle prices for 3, 6, and 12 month billing cycles.</div>
                        </div>

                        <div>
                            <label className="form-label">BUNDLE DISCOUNTS (%)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>3 MONTH</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={newPackage.bundle_discount_3_month}
                                        onChange={e => setNewPackage({ ...newPackage, bundle_discount_3_month: Number(e.target.value) })}
                                        className="form-input"
                                        placeholder="10"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>6 MONTH</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={newPackage.bundle_discount_6_month}
                                        onChange={e => setNewPackage({ ...newPackage, bundle_discount_6_month: Number(e.target.value) })}
                                        className="form-input"
                                        placeholder="20"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>12 MONTH</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={newPackage.bundle_discount_12_month}
                                        onChange={e => setNewPackage({ ...newPackage, bundle_discount_12_month: Number(e.target.value) })}
                                        className="form-input"
                                        placeholder="30"
                                    />
                                </div>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>Discount percentages applied to the base monthly price for bundled billing cycles.</div>
                        </div>

                        <div>
                            <label className="form-label">VALUE PROPOSITION (DESCRIPTION)</label>
                            <textarea
                                placeholder="High-frequency trading alerts and masterminds..."
                                value={newPackage.description}
                                onChange={e => setNewPackage({ ...newPackage, description: e.target.value })}
                                className="form-input"
                                style={{ height: '80px', resize: 'none' }}
                            />
                        </div>

                        <div>
                            <label className="form-label">INCLUDED ENTITLEMENTS (FEATURES)</label>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <input
                                    placeholder="24/7 Priority Support"
                                    value={featureInput}
                                    onChange={e => setFeatureInput(e.target.value)}
                                    className="form-input"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && featureInput) {
                                            setNewPackage({ ...newPackage, features: [...newPackage.features, featureInput] });
                                            setFeatureInput('');
                                        }
                                    }}
                                />
                                <button
                                    className="btn-primary"
                                    onClick={() => {
                                        if (featureInput) {
                                            setNewPackage({ ...newPackage, features: [...newPackage.features, featureInput] });
                                            setFeatureInput('');
                                        }
                                    }}
                                    style={{ width: '50px' }}
                                >+</button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {newPackage.features.map((f, i) => (
                                    <span key={i} style={{ background: 'var(--bg-app)', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {f} <button onClick={() => setNewPackage({ ...newPackage, features: newPackage.features.filter((_, idx) => idx !== i) })} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <button className="btn-primary" style={{ marginTop: '10px', height: '50px' }} onClick={() => {
                            if (!newPackage.name) return alert('Name required');
                            apiClient.createPackage(newPackage).then(res => {
                                if (res.success) {
                                    setPackages((prev: any[]) => [...prev, res.data]);
                                    onClose();
                                    setNewPackage({
                                        name: '',
                                        tier_level: 1,
                                        price_monthly: 0,
                                        description: '',
                                        features: [],
                                        bundle_discount_3_month: 10,
                                        bundle_discount_6_month: 20,
                                        bundle_discount_12_month: 30
                                    });
                                }
                            });
                        }}>Deploy Package to Production</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddPackageModal;
