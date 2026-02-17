import React, { useState } from 'react';
import type { SubscriptionPackage, UserSubscription, Coupon } from '../types';
import { apiClient } from '../api/client';

interface SubscriptionsPageProps {
    subTab: string;
    setSubTab: (tab: any) => void;
    packages: SubscriptionPackage[];
    setPackages: (pkgs: any) => void;
    activeSubscriptions: UserSubscription[];
    setActiveSubscriptions: (subs: any) => void;
    coupons: Coupon[];
    setCoupons: (coupons: any) => void;
    setShowAddPackageModal: (show: boolean) => void;
    newCoupon: any;
    setNewCoupon: (coupon: any) => void;
    sandboxPurchase: any;
    setSandboxPurchase: (p: any) => void;
    users: import('../types').User[];
}

const SubscriptionsPage: React.FC<SubscriptionsPageProps> = ({
    subTab,
    setSubTab,
    packages,
    setPackages,
    activeSubscriptions,
    setActiveSubscriptions,
    coupons,
    setCoupons,
    setShowAddPackageModal,
    newCoupon,
    setNewCoupon,
    sandboxPurchase,
    setSandboxPurchase,
    users = []
}) => {
    // Filter out Admins (Root & System) - Revenue Engine should only track Clients
    const clientUsers = users.filter(u => u.email !== 'rhaenyratargaryen@gmail.com' && u.email !== 'admin@realtorone.com' && !u.is_admin);

    // Calculate stats
    const diamondUsers = clientUsers.filter(u => u.membership_tier === 'Diamond').length;
    const goldUsers = clientUsers.filter(u => u.membership_tier === 'Gold').length;
    const silverUsers = clientUsers.filter(u => u.membership_tier === 'Silver').length;
    const freeUsers = clientUsers.filter(u => !u.membership_tier || u.membership_tier === 'Free').length;

    // Estimate revenue (assuming standard pricing if dynamic data isn't perfect)
    const diamondPrice = packages.find(p => p.name === 'Diamond')?.price_monthly || 299;
    const goldPrice = packages.find(p => p.name === 'Gold')?.price_monthly || 99;
    const silverPrice = packages.find(p => p.name === 'Silver')?.price_monthly || 49;
    const estimatedMRR = (diamondUsers * diamondPrice) + (goldUsers * goldPrice) + (silverUsers * silverPrice);

    // State for filtering and expansion
    const [selectedTierFilter, setSelectedTierFilter] = useState<'All' | 'Diamond' | 'Gold' | 'Silver' | 'Free'>('All');
    const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

    return (
        <div className="view-container fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '30px' }}>
                <div onClick={() => { setSubTab('subscribers'); setSelectedTierFilter('All'); }} className="glass-panel" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '5px', cursor: 'pointer', transition: 'transform 0.2s', transform: subTab === 'subscribers' && selectedTierFilter === 'All' ? 'scale(1.02)' : 'none', border: subTab === 'subscribers' && selectedTierFilter === 'All' ? '1px solid var(--primary)' : '1px solid transparent' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Revenue</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)' }}>${estimatedMRR.toLocaleString()}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Monthly Recurring</div>
                </div>
                <div onClick={() => { setSubTab('subscribers'); setSelectedTierFilter('Diamond'); }} className="glass-panel" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '5px', cursor: 'pointer', transition: 'transform 0.2s', transform: subTab === 'subscribers' && selectedTierFilter === 'Diamond' ? 'scale(1.02)' : 'none', border: subTab === 'subscribers' && selectedTierFilter === 'Diamond' ? '1px solid #7E22CE' : '1px solid transparent' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Diamond Icons</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7E22CE' }}>{diamondUsers}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>${(diamondUsers * diamondPrice).toLocaleString()}/mo</div>
                </div>
                <div onClick={() => { setSubTab('subscribers'); setSelectedTierFilter('Gold'); }} className="glass-panel" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '5px', cursor: 'pointer', transition: 'transform 0.2s', transform: subTab === 'subscribers' && selectedTierFilter === 'Gold' ? 'scale(1.02)' : 'none', border: subTab === 'subscribers' && selectedTierFilter === 'Gold' ? '1px solid var(--accent)' : '1px solid transparent' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Gold Elite</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent)' }}>{goldUsers}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>${(goldUsers * goldPrice).toLocaleString()}/mo</div>
                </div>
                <div onClick={() => { setSubTab('subscribers'); setSelectedTierFilter('Silver'); }} className="glass-panel" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '5px', cursor: 'pointer', transition: 'transform 0.2s', transform: subTab === 'subscribers' && selectedTierFilter === 'Silver' ? 'scale(1.02)' : 'none', border: subTab === 'subscribers' && selectedTierFilter === 'Silver' ? '1px solid var(--primary)' : '1px solid transparent' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Silver Pro</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{silverUsers}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>${(silverUsers * silverPrice).toLocaleString()}/mo</div>
                </div>
                <div onClick={() => { setSubTab('subscribers'); setSelectedTierFilter('Free'); }} className="glass-panel" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '5px', cursor: 'pointer', transition: 'transform 0.2s', transform: subTab === 'subscribers' && selectedTierFilter === 'Free' ? 'scale(1.02)' : 'none', border: subTab === 'subscribers' && selectedTierFilter === 'Free' ? '1px solid var(--text-muted)' : '1px solid transparent' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Prospects</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-muted)' }}>{freeUsers}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Upsell Pool</div>
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Infrastructure & Subs</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Management Plane for Platform Monetization.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="filter-btn active" style={{ opacity: subTab === 'packages' ? 1 : 0.5 }} onClick={() => setSubTab('packages')}>Packages</button>
                    <button className="filter-btn active" style={{ opacity: subTab === 'subscribers' ? 1 : 0.5 }} onClick={() => setSubTab('subscribers')}>Subscribers</button>
                    <button className="filter-btn active" style={{ opacity: subTab === 'coupons' ? 1 : 0.5 }} onClick={() => setSubTab('coupons')}>Coupons</button>
                    <button className="filter-btn active" style={{ opacity: subTab === 'history' ? 1 : 0.5 }} onClick={() => setSubTab('history')}>Transaction Log</button>
                    <button className="filter-btn active" style={{ opacity: subTab === 'sandbox' ? 1 : 0.5, border: '1px solid var(--accent)' }} onClick={() => setSubTab('sandbox')}>Sandbox checkout</button>
                </div>
            </div>

            {subTab === 'packages' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px dashed var(--glass-border)', cursor: 'pointer' }} onClick={() => setShowAddPackageModal(true)}>
                        <div style={{ padding: '15px', background: 'var(--primary)15', borderRadius: '50%', marginBottom: '10px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </div>
                        <span style={{ fontWeight: 800 }}>Create New Package</span>
                    </div>
                    {packages.map(pkg => (
                        <div key={pkg.id} className="glass-panel" style={{ padding: '25px', border: pkg.name === 'Gold' ? '2px solid var(--accent)' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tier {pkg.tier_level}</span>
                                <div className={`status-indicator ${pkg.is_active ? 'active' : ''}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: pkg.is_active ? 'var(--success)' : 'var(--error)' }}></div>
                            </div>
                            <h3 style={{ margin: '10px 0', fontSize: '1.5rem', fontWeight: 900 }}>{pkg.name}</h3>
                            <div style={{ marginBottom: '20px' }}>
                                <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>${pkg.price_monthly}</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/mo</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '20px', lineHeight: '1.5' }}>{pkg.description}</p>

                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Included Features</h4>
                                <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                                    {(pkg.features || []).map((f: string, i: number) => (
                                        <li key={i} style={{ fontSize: '0.8rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            {f}
                                        </li>
                                    ))}
                                    <button style={{ border: 'none', background: 'none', color: 'var(--primary)', fontWeight: 800, fontSize: '0.7rem', padding: 0, cursor: 'pointer' }} onClick={() => {
                                        const feat = prompt('Add feature to ' + pkg.name);
                                        if (feat) {
                                            const newFeatures = [...(pkg.features || []), feat];
                                            apiClient.updatePackage(pkg.id, { features: newFeatures }).then(res => res.success && setPackages((prev: any[]) => prev.map(p => p.id === pkg.id ? res.data : p)));
                                        }
                                    }}>+ Add Access Item</button>
                                </ul>
                            </div>

                            <div style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
                                <button className="btn-primary" style={{ flex: 1, padding: '8px', background: 'var(--bg-app)', color: 'var(--text-main)', border: 'none' }} onClick={() => {
                                    const newPrice = prompt('New monthly price for ' + pkg.name, String(pkg.price_monthly));
                                    if (newPrice) apiClient.updatePackage(pkg.id, { price_monthly: Number(newPrice) }).then(res => res.success && setPackages((prev: any[]) => prev.map(p => p.id === pkg.id ? res.data : p)));
                                }}>Change Price</button>
                                <button className="btn-primary" style={{ flex: 1, padding: '8px', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: 'none' }} onClick={() => {
                                    if (confirm('Delete infrastructure element ' + pkg.name + '?')) apiClient.deletePackage(pkg.id).then(res => res.success && setPackages((prev: any[]) => prev.filter(p => p.id !== pkg.id)));
                                }}>Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {subTab === 'subscribers' && (
                <div className="glass-panel">
                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{selectedTierFilter === 'All' ? 'Global Subscriber Base' : `${selectedTierFilter} Tier Operators`}</h3>
                        <div className="filter-group">
                            <button className={`filter-btn ${selectedTierFilter === 'All' ? 'active' : ''}`} onClick={() => setSelectedTierFilter('All')}>All</button>
                            <button className={`filter-btn ${selectedTierFilter === 'Diamond' ? 'active' : ''}`} onClick={() => setSelectedTierFilter('Diamond')}>Diamond</button>
                            <button className={`filter-btn ${selectedTierFilter === 'Gold' ? 'active' : ''}`} onClick={() => setSelectedTierFilter('Gold')}>Gold</button>
                            <button className={`filter-btn ${selectedTierFilter === 'Silver' ? 'active' : ''}`} onClick={() => setSelectedTierFilter('Silver')}>Silver</button>
                            <button className={`filter-btn ${selectedTierFilter === 'Free' ? 'active' : ''}`} onClick={() => setSelectedTierFilter('Free')}>Free</button>
                        </div>
                    </div>
                    <table className="data-table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Practitioner</th>
                                <th>Status</th>
                                <th>Package</th>
                                <th>Expires</th>
                                <th>Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientUsers.filter(u => selectedTierFilter === 'All' || (u.membership_tier || 'Free') === selectedTierFilter).map(u => {
                                const sub = activeSubscriptions.find(s => s.user?.id === u.id && s.status === 'active');
                                const tier = u.membership_tier || 'Free';
                                const isExpanded = expandedUserId === u.id;

                                return (
                                    <React.Fragment key={u.id}>
                                        <tr onClick={() => setExpandedUserId(isExpanded ? null : u.id)} style={{ cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div className="avatar-chip" style={{ width: '30px', height: '30px', fontSize: '0.8rem' }}>{(u.name || 'U')[0]}</div>
                                                    <div>
                                                        <span style={{ fontWeight: 800, display: 'block' }}>{u.name}</span>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span style={{ background: u.status === 'active' ? 'var(--success)15' : 'var(--error)15', color: u.status === 'active' ? 'var(--success)' : 'var(--error)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 900 }}>{u.status === 'active' ? 'OPERATIONAL' : 'INACTIVE'}</span></td>
                                            <td><span className={`tier-pill ${tier.toLowerCase()}`}>{tier}</span></td>
                                            <td style={{ fontWeight: 600 }}>{sub ? new Date(sub.expires_at).toLocaleDateString() : 'N/A'}</td>
                                            <td style={{ fontWeight: 900, color: 'var(--primary)' }}>${sub ? sub.amount_paid : 0}</td>
                                        </tr>
                                        {isExpanded && (
                                            <tr style={{ background: 'rgba(0,0,0,0.05)' }}>
                                                <td colSpan={5} style={{ padding: '20px' }}>
                                                    <div style={{ display: 'flex', gap: '30px' }}>
                                                        <div>
                                                            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subscription Start</span>
                                                            <span style={{ fontWeight: 800 }}>{sub ? new Date(sub.started_at).toLocaleDateString() : 'N/A'}</span>
                                                        </div>
                                                        <div>
                                                            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Payment Method</span>
                                                            <span style={{ fontWeight: 800 }}>{sub ? (sub.payment_method || 'Unknown').toUpperCase() : 'N/A'}</span>
                                                        </div>
                                                        <div>
                                                            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transaction ID</span>
                                                            <span style={{ fontWeight: 800, fontFamily: 'monospace' }}>{sub ? (sub.payment_id || 'N/A') : 'N/A'}</span>
                                                        </div>
                                                        <div>
                                                            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tenure</span>
                                                            <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                                                {sub
                                                                    ? Math.ceil((new Date().getTime() - new Date(sub.started_at).getTime()) / (1000 * 3600 * 24 * 30)) + ' Months'
                                                                    : '0 Months'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {subTab === 'coupons' && (
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
                    <div className="glass-panel" style={{ padding: '20px' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', fontWeight: 800 }}>Issue Coupon</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input placeholder="CODE10" value={newCoupon.code} onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} className="form-input" />
                            <input type="number" placeholder="Discount %" value={newCoupon.discount_percentage} onChange={e => setNewCoupon({ ...newCoupon, discount_percentage: Number(e.target.value) })} className="form-input" />
                            <button className="btn-primary" onClick={() => {
                                apiClient.createCoupon(newCoupon).then(res => res.success && setCoupons([res.data, ...coupons]));
                                setNewCoupon({ code: '', discount_percentage: 10, max_uses: 100 });
                            }}>Authorize Code</button>
                        </div>
                    </div>
                    <div className="glass-panel">
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Discount</th>
                                    <th>Usage</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {coupons.map(c => (
                                    <tr key={c.id}>
                                        <td style={{ fontWeight: 900, color: 'var(--accent)' }}>{c.code}</td>
                                        <td style={{ fontWeight: 800 }}>{c.discount_percentage}% OFF</td>
                                        <td>{c.used_count} / {c.max_uses || '∞'}</td>
                                        <td>{c.is_active ? 'ACTIVE' : 'VOID'}</td>
                                        <td>
                                            <button onClick={() => apiClient.deleteCoupon(c.id).then(res => res.success && setCoupons((prev: any[]) => prev.filter(cp => cp.id !== c.id)))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--error)', opacity: 0.6, display: 'flex', alignItems: 'center' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {subTab === 'history' && (
                <div className="glass-panel">
                    <table className="data-table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Transaction ID</th>
                                <th>User</th>
                                <th>Package</th>
                                <th>Method</th>
                                <th>Amount</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeSubscriptions.map(s => (
                                <tr key={s.id}>
                                    <td style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{s.payment_id || 'INTERNAL_MIGRATION'}</td>
                                    <td style={{ fontWeight: 800 }}>{s.user?.name}</td>
                                    <td>{s.package?.name}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 900 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#0070ba' }}><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.723a1.603 1.603 0 0 1 1.581-1.353h10.354c2.253 0 3.96 1.84 3.763 4.075a3.868 3.868 0 0 1-3.722 3.535h-4.385c-.328 0-.613.23-.679.55l-1.464 7.15c-.066.32-.34.557-.666.557z"></path></svg>
                                            PAYPAL
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 900 }}>${s.amount_paid}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {subTab === 'sandbox' && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 20px 0', textAlign: 'center', fontWeight: 900 }}>PayPal Sandbox Checkout</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label className="form-label">SELECT INFRASTRUCTURE LEVEL</label>
                                <select className="form-input" style={{ width: '100%' }} onChange={(e) => setSandboxPurchase({ ...sandboxPurchase, package_id: Number(e.target.value) })}>
                                    <option value="0">Choose Tier...</option>
                                    {packages.map(p => <option key={p.id} value={p.id}>{p.name} - ${p.price_monthly}/mo</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="form-label">DURATION (MONTHS)</label>
                                <input type="number" value={sandboxPurchase.months} onChange={(e) => setSandboxPurchase({ ...sandboxPurchase, months: Number(e.target.value) })} className="form-input" min="1" />
                            </div>

                            <div>
                                <label className="form-label">COUPON CODE</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input placeholder="SIR20" value={sandboxPurchase.code} onChange={(e) => setSandboxPurchase({ ...sandboxPurchase, code: e.target.value.toUpperCase() })} className="form-input" />
                                    <button onClick={() => {
                                        if (!sandboxPurchase.code) return;
                                        apiClient.validateCoupon(sandboxPurchase.code).then(res => {
                                            if (res.success) {
                                                setSandboxPurchase({ ...sandboxPurchase, appliedCoupon: res.data });
                                                alert('Coupon applied: ' + res.data.discount_percentage + '% OFF');
                                            } else {
                                                alert(res.message);
                                            }
                                        });
                                    }} className="btn-primary" style={{ padding: '0 15px' }}>Apply</button>
                                </div>
                            </div>

                            <div style={{ background: 'var(--bg-app)', padding: '20px', borderRadius: '15px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                                    <span>Subtotal</span>
                                    <span style={{ fontWeight: 800 }}>${(packages.find(p => p.id === sandboxPurchase.package_id)?.price_monthly || 0) * sandboxPurchase.months}</span>
                                </div>
                                {sandboxPurchase.appliedCoupon && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--success)' }}>
                                        <span>Discount ({sandboxPurchase.appliedCoupon.discount_percentage}%)</span>
                                        <span>-${((packages.find(p => p.id === sandboxPurchase.package_id)?.price_monthly || 0) * sandboxPurchase.months * (sandboxPurchase.appliedCoupon.discount_percentage / 100)).toFixed(2)}</span>
                                    </div>
                                )}
                                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '15px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 900 }}>
                                    <span>Total</span>
                                    <span style={{ color: 'var(--primary)' }}>${(((packages.find(p => p.id === sandboxPurchase.package_id)?.price_monthly || 0) * sandboxPurchase.months) * (sandboxPurchase.appliedCoupon ? (1 - sandboxPurchase.appliedCoupon.discount_percentage / 100) : 1)).toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                className="btn-primary"
                                style={{ height: '60px', background: '#0070ba', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1rem' }}
                                onClick={async () => {
                                    if (!sandboxPurchase.package_id) return alert('Select a package');
                                    try {
                                        const res = await apiClient.purchaseSubscription({
                                            package_id: sandboxPurchase.package_id,
                                            months: sandboxPurchase.months,
                                            coupon_id: sandboxPurchase.appliedCoupon?.id,
                                            payment_id: 'PAYID-SANDBOX-' + Math.random().toString(36).substring(7).toUpperCase()
                                        });
                                        if (res.success) {
                                            alert('Purchase successful! Tier upgraded.');
                                            setSubTab('subscribers');
                                            apiClient.getSubscriptions().then(r => r.success && setActiveSubscriptions(r.data));
                                        }
                                    } catch {
                                        alert('Simulated payment failed (Sandbox Reject)');
                                    }
                                }}
                            >
                                <span style={{ fontWeight: 900 }}><i>Pay</i>Pal</span> <span>Checkout</span>
                            </button>
                            <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>* This is a sandbox simulation for development.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionsPage;
