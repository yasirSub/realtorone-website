import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import type { Tab } from '../../types';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    setMobileMenuOpen: (open: boolean) => void;
    handleLogout: () => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    theme: string;
    toggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({
    children,
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setMobileMenuOpen,
    handleLogout,
    searchTerm,
    setSearchTerm,
    theme,
    toggleTheme
}) => {
    return (
        <div className="app-layout">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
                setMobileMenuOpen={setMobileMenuOpen}
                handleLogout={handleLogout}
            />

            <main className="main-viewport">
                <Header
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    activeTab={activeTab}
                    theme={theme}
                    toggleTheme={toggleTheme}
                />

                <div className="content-scrollable">
                    {children}
                </div>
            </main>

        </div>
    );
};

export default Layout;
