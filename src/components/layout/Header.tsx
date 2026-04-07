import React from 'react';

interface HeaderProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    activeTab: string;
    setActiveTab?: (tab: any) => void;
    theme: string;
    toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
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
            case 'courses': return 'COURSE LIBRARY';
            case 'notifications': return 'PUSH NOTIFICATIONS';
            case 'ai-agent': return 'AI INBOX';
            case 'admin-notifications': return 'SYSTEM LOGS';
            default: return activeTab.toUpperCase();
        }
    };

    return (
        <header className="top-bar">
            {/* Left Section: Operational Title */}
            <div style={{ display: 'flex', alignItems: 'center', minWidth: '250px', gap: '10px' }}>
                <div style={{ width: '4px', height: '22px', background: 'var(--primary)', borderRadius: '4px' }}></div>
                <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.2px' }}>
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
                        className="search-input"
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
                <button
                    className="header-icon-btn"
                    onClick={() => setActiveTab?.('admin-notifications')}
                    title="Operational Audit Center"
                    style={{
                        color: activeTab === 'notifications' ? 'var(--primary)' : 'var(--text-main)',
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        width: '8px',
                        height: '8px',
                        background: 'var(--primary)',
                        borderRadius: '50%',
                        border: '2px solid var(--bg-card)',
                        boxShadow: '0 0 10px rgba(79, 70, 229, 0.4)'
                    }}></div>
                </button>

                <button
                    className="header-icon-btn"
                    onClick={toggleTheme}
                    title="Switch Interface Environment"
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
