import React from 'react';

interface HeaderProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    activeTab: string;
    theme: string;
    toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({
    searchTerm,
    setSearchTerm,
    activeTab,
    theme,
    toggleTheme
}) => {
    // Determine title based on active tab
    const getTabTitle = () => {
        switch (activeTab) {
            case 'dashboard': return 'OPERATIONAL OVERVIEW';
            case 'users': return 'PRACTITIONER REGISTRY';
            case 'momentum': return 'BEHAVIORAL DYNAMICS';
            case 'subscriptions': return 'REVENUE ENGINE';
            case 'settings': return 'SYSTEM CONFIGURATION';
            case 'user-profile': return 'PRACTITIONER DOSSIER';
            case 'courses': return 'EDUCATIONAL CONTENT';
            default: return activeTab.toUpperCase();
        }
    };

    return (
        <header className="top-bar">
            {/* Left Section: Operational Title */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: '250px' }}>
                <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                    {getTabTitle()}
                </h1>
            </div>

            {/* Center Section: Search Pillar */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 20px' }}>
                <div className="search-pillar" style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '450px'
                }}>
                    <input
                        type="text"
                        placeholder="Search operational data..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 20px 12px 48px',
                            background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '16px',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            outline: 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    />
                    <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                        <svg
                            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)"
                            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                </div>
            </div>

            {/* Right Section: System Status & Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: '250px', justifyContent: 'flex-end' }}>
                <div style={{
                    background: theme === 'dark' ? 'rgba(1, 181, 116, 0.1)' : 'rgba(1, 181, 116, 0.05)',
                    color: 'var(--success)',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    border: '1px solid rgba(1, 181, 116, 0.15)',
                    letterSpacing: '0.5px'
                }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--success)',
                        boxShadow: '0 0 12px var(--success)'
                    }}></span>
                    LIVE GATEWAY
                </div>

                <button
                    className="icon-button"
                    onClick={toggleTheme}
                    title="Switch Interface Environment"
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-main)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                >
                    {theme === 'light' ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    )}
                </button>
            </div>
        </header>
    );
};

export default Header;
