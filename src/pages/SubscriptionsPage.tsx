import React, { useState } from 'react';
import type { SubscriptionPackage, UserSubscription, Coupon } from '../types';
import { apiClient } from '../api/client';
import ConfirmModal from '../components/modals/ConfirmModal';
import EditModal from '../components/modals/EditModal';

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
    // Filter out Admins
    const clientUsers = users.filter(u => !u.is_admin);

    // Calculate stats
    const titanUsers = clientUsers.filter(u => u.membership_tier === 'Titan').length;
    const rainmakerUsers = clientUsers.filter(u => u.membership_tier === 'Rainmaker').length;
    const consultantUsers = clientUsers.filter(u => !u.membership_tier || u.membership_tier === 'Consultant').length;

    const titanPrice = packages.find(p => p.name === 'Titan')?.price_monthly || 420;
    const rainmakerPrice = packages.find(p => p.name === 'Rainmaker')?.price_monthly || 210;
    const estimatedMRR = (titanUsers * titanPrice) + (rainmakerUsers * rainmakerPrice);

    const [selectedTierFilter, setSelectedTierFilter] = useState<'All' | 'Titan' | 'Rainmaker' | 'Consultant'>('All');
    const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

    const [editPackagePriceModal, setEditPackagePriceModal] = useState<{
        show: boolean;
        pkgId: number;
        pkgName: string;
        value: string;
    }>({ show: false, pkgId: 0, pkgName: '', value: '' });

    const [confirmRemovePackageModal, setConfirmRemovePackageModal] = useState<{
        show: boolean;
        pkgId: number;
        pkgName: string;
    }>({ show: false, pkgId: 0, pkgName: '' });

    const [addFeatureModal, setAddFeatureModal] = useState<{
        show: boolean;
        pkgId: number;
        pkgName: string;
        value: string;
    }>({ show: false, pkgId: 0, pkgName: '', value: '' });

    const activeTabStyle = {
        background: 'rgba(79, 70, 229, 0.1)',
        color: 'var(--primary)',
        borderColor: 'rgba(79, 70, 229, 0.2)'
    };

    return (
        <div className="view-container fade-in" style={{ padding: '0 40px 60px 40px' }}>
            
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingTop: '20px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div className="status-pulse"></div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase' }}>
                            Financial Infrastructure Active
                        </span>
                    </div>
                    <h1 className="text-outfit" style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, letterSpacing: '-1.2px' }}>
                        Revenue <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Engine</span>
                    </h1>
                </div>

                <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {['packages', 'subscribers', 'coupons', 'history', 'sandbox'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => setSubTab(tab)}
                            className="text-outfit"
                            style={{
                                padding: '10px 20px',
                                border: '1px solid transparent',
                                borderRadius: '10px',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                transition: 'all 0.2s',
                                ...(subTab === tab ? activeTabStyle : {})
                            }}
                        >
                            {tab === 'history' ? 'Transaction Log' : tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Aggregate Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
                <div className="glass-panel" onClick={() => { setSubTab('subscribers'); setSelectedTierFilter('All'); }} style={{ cursor: 'pointer' }}>
                    <div className="card-heading">Total MRR</div>
                    <div className="metric-value" style={{ color: 'var(--success)' }}>AED {estimatedMRR.toLocaleString()}</div>
                    <div className="metric-subtext">Estimated Monthly Recurring</div>
                </div>
                <div className="glass-panel" onClick={() => { setSubTab('subscribers'); setSelectedTierFilter('Titan'); }} style={{ cursor: 'pointer' }}>
                    <div className="card-heading">Titan Tier</div>
                    <div className="metric-value" style={{ color: '#F59E0B' }}>{titanUsers} <span style={{ fontSize: '0.9rem', opacity: 0.5 }}>Active</span></div>
                    <div className="metric-subtext">AED {(titanUsers * titanPrice).toLocaleString()}/mo</div>
                </div>
                <div className="glass-panel" onClick={() => { setSubTab('subscribers'); setSelectedTierFilter('Rainmaker'); }} style={{ cursor: 'pointer' }}>
                    <div className="card-heading">Rainmaker</div>
                    <div className="metric-value" style={{ color: '#94A3B8' }}>{rainmakerUsers} <span style={{ fontSize: '0.9rem', opacity: 0.5 }}>Active</span></div>
                    <div className="metric-subtext">AED {(rainmakerUsers * rainmakerPrice).toLocaleString()}/mo</div>
                </div>
                <div className="glass-panel" onClick={() => { setSubTab('subscribers'); setSelectedTierFilter('Consultant'); }} style={{ cursor: 'pointer' }}>
                    <div className="card-heading">Prospect Pool</div>
                    <div className="metric-value">{consultantUsers} <span style={{ fontSize: '0.9rem', opacity: 0.5 }}>Users</span></div>
                    <div className="metric-subtext">Tier 0 / Unsubscribed</div>
                </div>
            </div>

            {/* Content Zone */}
            {subTab === 'packages' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
                    <div 
                        className="glass-panel" 
                        style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            border: '2px dashed rgba(255,255,255,0.06)', 
                            background: 'transparent',
                            cursor: 'pointer',
                            minHeight: '400px'
                        }} 
                        onClick={() => setShowAddPackageModal(true)}
                    >
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </div>
                        <span className="text-outfit" style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.5px' }}>Create New Protocol</span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>Deploy a new membership tier</p>
                    </div>

                    {packages.map(pkg => {
                        const displayName = pkg.name.replace(/\s*-\s*GOLD/gi, '').replace(/\s*GOLD/gi, '');
                        const isTitan = pkg.name.toLowerCase().includes('titan');
                        const isRainmaker = pkg.name.toLowerCase().includes('rainmaker');
                        const tierColor = isTitan ? '#F59E0B' : isRainmaker ? '#94A3B8' : 'var(--primary)';
                        
                        return (
                            <div key={pkg.id} className="glass-panel" style={{ 
                                padding: '35px',
                                border: isTitan ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                                background: isTitan ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(21, 25, 71, 0.4) 100%)' : 'rgba(21, 25, 71, 0.4)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <div style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                                        PROTOCOL {pkg.tier_level}
                                    </div>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pkg.is_active ? '#00e096' : 'var(--error)', boxShadow: `0 0 10px ${pkg.is_active ? '#00e09640' : '#ee5d5040'}` }}></div>
                                </div>

                                <h3 className="text-outfit" style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 10px 0', color: tierColor }}>{displayName}</h3>
                                
                                <div style={{ marginBottom: '30px' }}>
                                    <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-1px' }}>AED {pkg.price_monthly}</span>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>/ cycle</span>
                                </div>

                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '30px', lineHeight: '1.6' }}>{pkg.description}</p>

                                <div style={{ marginBottom: '30px' }}>
                                    <div className="card-heading" style={{ fontSize: '0.6rem', marginBottom: '16px' }}>Included Modules</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {(pkg.features || []).map((f: string, i: number) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>
                                                <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'rgba(0, 224, 150, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00e096" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                </div>
                                                {f}
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => setAddFeatureModal({ show: true, pkgId: pkg.id, pkgName: pkg.name, value: '' })}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', padding: '0', textAlign: 'left', marginTop: '4px' }}
                                        >
                                            + AUTHORIZE ADDITIONAL MODULE
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button 
                                        onClick={() => setEditPackagePriceModal({ show: true, pkgId: pkg.id, pkgName: pkg.name, value: String(pkg.price_monthly) })}
                                        className="btn-view" style={{ flex: 1, padding: '12px', fontSize: '0.75rem', borderRadius: '12px' }}
                                    >
                                        RE-PRICE
                                    </button>
                                    <button 
                                        onClick={() => setConfirmRemovePackageModal({ show: true, pkgId: pkg.id, pkgName: pkg.name })}
                                        style={{ flex: 1, padding: '12px', background: 'rgba(238, 93, 80, 0.05)', color: 'var(--error)', border: '1px solid rgba(238, 93, 80, 0.1)', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                                    >
                                        VOID
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {subTab === 'subscribers' && (
                <div className="glass-panel" style={{ padding: '0' }}>
                    <div style={{ padding: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 className="text-outfit" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                                {selectedTierFilter === 'All' ? 'Global Practitioner Registry' : `${selectedTierFilter} Authorization Pool`}
                            </h3>
                        </div>
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px' }}>
                            {['All', 'Titan', 'Rainmaker', 'Consultant'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setSelectedTierFilter(f as any)}
                                    style={{
                                        padding: '6px 16px',
                                        background: selectedTierFilter === f ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                                        color: selectedTierFilter === f ? 'var(--primary)' : 'var(--text-muted)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        transition: '0.2s'
                                    }}
                                >
                                    {f.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ padding: '20px' }}>
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>OPERATOR IDENTITY</th>
                                    <th style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>STATUS</th>
                                    <th style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PROTOCOL</th>
                                    <th style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>EXPIRATION</th>
                                    <th style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>ACCUMULATED REVENUE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientUsers.filter(u => selectedTierFilter === 'All' || (u.membership_tier || 'Consultant') === selectedTierFilter).map(u => {
                                    const sub = activeSubscriptions.find(s => s.user?.id === u.id && s.status === 'active');
                                    const tier = u.membership_tier || 'Consultant';
                                    const isExpanded = expandedUserId === u.id;

                                    return (
                                        <React.Fragment key={u.id}>
                                            <tr onClick={() => setExpandedUserId(isExpanded ? null : u.id)} style={{ cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                                            {(u.name || 'U')[0]}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{u.name}</div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: u.status === 'active' ? 'rgba(0, 224, 150, 0.05)' : 'rgba(238, 93, 80, 0.05)', borderRadius: '8px' }}>
                                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: u.status === 'active' ? '#00e096' : 'var(--error)' }}></div>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: u.status === 'active' ? '#00e096' : 'var(--error)' }}>{u.status === 'active' ? 'OPERATIONAL' : 'INACTIVE'}</span>
                                                    </div>
                                                </td>
                                                <td><span className={`tier-pill ${tier.toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '4px 10px' }}>{tier.toUpperCase()}</span></td>
                                                <td style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{sub ? new Date(sub.expires_at).toLocaleDateString() : 'NO ACTIVE LEASE'}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 900, color: 'var(--text-main)', fontSize: '1rem' }}>AED {sub ? sub.amount_paid.toLocaleString() : 0}</td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={5} style={{ padding: '0' }}>
                                                        <div style={{ padding: '30px', background: 'rgba(0,0,0,0.15)', borderLeft: '3px solid var(--primary)', margin: '10px 20px', borderRadius: '0 12px 12px 0' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '30px' }}>
                                                                <div>
                                                                    <div className="card-heading" style={{ fontSize: '0.55rem' }}>Lease Authorization</div>
                                                                    <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{sub ? new Date(sub.started_at).toLocaleDateString() : 'N/A'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="card-heading" style={{ fontSize: '0.55rem' }}>Settlement Pathway</div>
                                                                    <div style={{ fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase' }}>{sub?.payment_method || 'Internal Transfer'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="card-heading" style={{ fontSize: '0.55rem' }}>Protocol Signature</div>
                                                                    <div style={{ fontWeight: 800, color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{sub?.payment_id || 'LOCALAUTH_00X'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="card-heading" style={{ fontSize: '0.55rem' }}>Engagement Tenure</div>
                                                                    <div className="text-outfit" style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                                                        {sub ? Math.ceil((new Date().getTime() - new Date(sub.started_at).getTime()) / (1000 * 3600 * 24 * 30)) + ' MONTHS' : '0 MONTHS'}
                                                                    </div>
                                                                </div>
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
                </div>
            )}

            {subTab === 'coupons' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr', gap: '30px' }}>
                    <div className="glass-panel" style={{ padding: '35px' }}>
                        <div className="card-heading" style={{ marginBottom: '25px' }}>Authorize Discount Protocol</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label className="card-heading" style={{ fontSize: '0.55rem' }}>PROTOCOL CODE</label>
                                <input placeholder="EX: ADMIN50" value={newCoupon.code} onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} className="form-input" style={{ width: '100%', marginTop: '8px' }} />
                            </div>
                            <div>
                                <label className="card-heading" style={{ fontSize: '0.55rem' }}>DEDUCTION PERCENTAGE (%)</label>
                                <input type="number" placeholder="25" value={newCoupon.discount_percentage} onChange={e => setNewCoupon({ ...newCoupon, discount_percentage: Number(e.target.value) })} className="form-input" style={{ width: '100%', marginTop: '8px' }} />
                            </div>
                            <button className="btn-view" style={{ width: '100%', padding: '16px', marginTop: '10px' }} onClick={() => {
                                apiClient.createCoupon(newCoupon).then(res => res.success && setCoupons([res.data, ...coupons]));
                                setNewCoupon({ code: '', discount_percentage: 10, max_uses: 100 });
                            }}>AUTHORIZE CODE</button>
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '0' }}>
                        <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="card-heading">Active Protocols</div>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <table className="data-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ fontSize: '0.65rem' }}>CODE</th>
                                        <th style={{ fontSize: '0.65rem' }}>DEDUCTION</th>
                                        <th style={{ fontSize: '0.65rem' }}>UTILIZATION</th>
                                        <th style={{ fontSize: '0.65rem' }}>STATUS</th>
                                        <th style={{ fontSize: '0.65rem', textAlign: 'right' }}>COMMAND</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupons.map(c => (
                                        <tr key={c.id}>
                                            <td style={{ fontWeight: 900, color: 'var(--accent)', letterSpacing: '1px' }}>{c.code}</td>
                                            <td style={{ fontWeight: 800, color: 'var(--text-main)' }}>{c.discount_percentage}% OFF</td>
                                            <td style={{ fontWeight: 600 }}>{c.used_count} / {c.max_uses || '∞'}</td>
                                            <td>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: c.is_active ? '#00e096' : 'var(--error)' }}>{c.is_active ? 'ACTIVE' : 'VOID'}</span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button onClick={() => apiClient.deleteCoupon(c.id).then(res => res.success && setCoupons((prev: any[]) => prev.filter(cp => cp.id !== c.id)))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--error)', opacity: 0.4 }}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/*Transaction Log, Sandbox, Modals remain functional but using standardized SaaS 2.0 styles... */}
            {/* Keeping simpler structure for those as they are secondary but ensuring buttons/inputs match */}

            {subTab === 'history' && (
                <div className="glass-panel" style={{ padding: '0' }}>
                    <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="card-heading">Global Transaction Log</div>
                    </div>
                    <div style={{ padding: '20px' }}>
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ fontSize: '0.65rem' }}>TERMINAL ID</th>
                                    <th style={{ fontSize: '0.65rem' }}>PRACTITIONER</th>
                                    <th style={{ fontSize: '0.65rem' }}>PROTOCOL</th>
                                    <th style={{ fontSize: '0.65rem' }}>SETTLEMENT</th>
                                    <th style={{ fontSize: '0.65rem' }}>VOLUME</th>
                                    <th style={{ fontSize: '0.65rem' }}>TIMESTAMP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeSubscriptions.map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.payment_id || 'INT_MIG_001'}</td>
                                        <td style={{ fontWeight: 800 }}>{s.user?.name}</td>
                                        <td><span className="tier-pill" style={{ fontSize: '0.6rem' }}>{s.package?.name.toUpperCase()}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-secondary)' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5 }}><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.723a1.603 1.603 0 0 1 1.581-1.353h10.354c2.253 0 3.96 1.84 3.763 4.075a3.868 3.868 0 0 1-3.722 3.535h-4.385c-.328 0-.613.23-.679.55l-1.464 7.15c-.066.32-.34.557-.666.557z"></path></svg>
                                                CREDIT_PATHWAY
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 800 }}>AED {s.amount_paid.toLocaleString()}</td>
                                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {subTab === 'sandbox' && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <div className="glass-panel" style={{ width: '420px', padding: '40px' }}>
                        <h3 className="text-outfit" style={{ margin: '0 0 30px 0', textAlign: 'center', fontWeight: 800, fontSize: '1.4rem' }}>Sandbox Checkout</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <label className="card-heading" style={{ fontSize: '0.55rem' }}>SELECT PROTOCOL LEVEL</label>
                                <select className="form-input" style={{ width: '100%', marginTop: '8px' }} onChange={(e) => setSandboxPurchase({ ...sandboxPurchase, package_id: Number(e.target.value) })}>
                                    <option value="0">Initialize Selection...</option>
                                    {packages.map(p => <option key={p.id} value={p.id}>{p.name} - AED {p.price_monthly}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="card-heading" style={{ fontSize: '0.55rem' }}>LEASE DURATION (MONTHS)</label>
                                <input type="number" value={sandboxPurchase.months} onChange={(e) => setSandboxPurchase({ ...sandboxPurchase, months: Number(e.target.value) })} className="form-input" style={{ width: '100%', marginTop: '8px' }} min="1" />
                            </div>
                            <div>
                                <label className="card-heading" style={{ fontSize: '0.55rem' }}>PROTOCOL DISCOUNT CODE</label>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                    <input placeholder="EX: ELITE20" value={sandboxPurchase.code} onChange={(e) => setSandboxPurchase({ ...sandboxPurchase, code: e.target.value.toUpperCase() })} className="form-input" style={{ flex: 1 }} />
                                    <button onClick={() => {
                                        if (!sandboxPurchase.code) return;
                                        apiClient.validateCoupon(sandboxPurchase.code).then(res => {
                                            if (res.success) {
                                                setSandboxPurchase({ ...sandboxPurchase, appliedCoupon: res.data });
                                            }
                                        });
                                    }} className="btn-view" style={{ padding: '0 20px', borderRadius: '12px' }}>Verify</button>
                                </div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '24px', borderRadius: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Initial Volume</span>
                                    <span style={{ fontWeight: 800 }}>AED {(packages.find(p => p.id === sandboxPurchase.package_id)?.price_monthly || 0) * sandboxPurchase.months}</span>
                                </div>
                                {sandboxPurchase.appliedCoupon && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem', color: '#00e096' }}>
                                        <span>Deduction ({sandboxPurchase.appliedCoupon.discount_percentage}%)</span>
                                        <span>-AED {((packages.find(p => p.id === sandboxPurchase.package_id)?.price_monthly || 0) * sandboxPurchase.months * (sandboxPurchase.appliedCoupon.discount_percentage / 100)).toFixed(2)}</span>
                                    </div>
                                )}
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '15px 0' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 900 }}>
                                    <span style={{ color: 'var(--text-main)' }}>Final Total</span>
                                    <span style={{ color: 'var(--primary)' }}>AED {(((packages.find(p => p.id === sandboxPurchase.package_id)?.price_monthly || 0) * sandboxPurchase.months) * (sandboxPurchase.appliedCoupon ? (1 - sandboxPurchase.appliedCoupon.discount_percentage / 100) : 1)).toFixed(2)}</span>
                                </div>
                            </div>
                            <button
                                className="btn-view"
                                style={{ height: '56px', background: '#0070ba', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                                onClick={async () => {
                                    if (!sandboxPurchase.package_id) return;
                                    const res = await apiClient.purchaseSubscription({
                                        package_id: sandboxPurchase.package_id,
                                        months: sandboxPurchase.months,
                                        coupon_id: sandboxPurchase.appliedCoupon?.id,
                                        payment_id: 'PAYID-' + Math.random().toString(36).substring(7).toUpperCase()
                                    });
                                    if (res.success) {
                                        setSubTab('subscribers');
                                        apiClient.getSubscriptions().then(r => r.success && setActiveSubscriptions(r.data));
                                    }
                                }}
                            >
                                <span style={{ fontWeight: 900 }}>PayPal</span> <span style={{ opacity: 0.8 }}>Checkout</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <EditModal
                show={editPackagePriceModal.show}
                title="Protocol Re-Pricing"
                label={`Update monthly volume for ${editPackagePriceModal.pkgName}`}
                value={editPackagePriceModal.value}
                onChange={(val) => setEditPackagePriceModal((prev) => ({ ...prev, value: val }))}
                onClose={() => setEditPackagePriceModal((prev) => ({ ...prev, show: false }))}
                onSave={(val) => {
                    const num = Number(val);
                    if (!Number.isFinite(num)) return;
                    apiClient.updatePackage(editPackagePriceModal.pkgId, { price_monthly: num }).then(res => {
                        if (res.success) setPackages((prev: any[]) => prev.map(p => p.id === editPackagePriceModal.pkgId ? res.data : p));
                        setEditPackagePriceModal((prev) => ({ ...prev, show: false }));
                    });
                }}
            />

            <ConfirmModal
                show={confirmRemovePackageModal.show}
                title="Protocol De-Authorization"
                message={`Permanently void "${confirmRemovePackageModal.pkgName}" protocol?`}
                onClose={() => setConfirmRemovePackageModal((prev) => ({ ...prev, show: false }))}
                onConfirm={() => {
                    apiClient.deletePackage(confirmRemovePackageModal.pkgId).then(res => {
                        if (res.success) setPackages((prev: any[]) => prev.filter(p => p.id !== confirmRemovePackageModal.pkgId));
                        setConfirmRemovePackageModal((prev) => ({ ...prev, show: false }));
                    });
                }}
            />

            {addFeatureModal.show && (
                <div className="modal-overlay" onClick={() => setAddFeatureModal((prev) => ({ ...prev, show: false }))}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '420px', padding: '35px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h3 className="text-outfit" style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem' }}>Authorize Module</h3>
                            <button onClick={() => setAddFeatureModal((prev) => ({ ...prev, show: false }))} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                        </div>
                        <label className="card-heading" style={{ fontSize: '0.55rem', marginBottom: '10px', display: 'block' }}>MODULE SPECIFICATION</label>
                        <input
                            type="text"
                            value={addFeatureModal.value}
                            onChange={(e) => setAddFeatureModal((prev) => ({ ...prev, value: e.target.value }))}
                            autoFocus
                            placeholder="EX: Priority Node Access"
                            className="form-input"
                            style={{ width: '100%', marginBottom: '24px' }}
                        />
                        <button
                            onClick={() => {
                                const feat = addFeatureModal.value.trim();
                                if (!feat) return;
                                const pkg = packages.find(p => p.id === addFeatureModal.pkgId);
                                const newFeatures = [...(pkg?.features || []), feat];
                                apiClient.updatePackage(addFeatureModal.pkgId, { features: newFeatures }).then(res => {
                                    if (res.success) setPackages((prev: any[]) => prev.map(p => p.id === addFeatureModal.pkgId ? res.data : p));
                                    setAddFeatureModal((prev) => ({ ...prev, show: false, value: '' }));
                                });
                            }}
                            className="btn-view"
                            style={{ width: '100%', padding: '16px' }}
                        >
                            COMMIT CHANGES
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionsPage;
