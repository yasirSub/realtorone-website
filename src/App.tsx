import { useEffect, useState } from 'react'
import './App.css'
import { apiClient } from './api/client'
import type { Tab, User, ActivityType, SubscriptionPackage, UserSubscription, Coupon } from './types'

// Components
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import MomentumPage from './pages/MomentumPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import SettingsPage from './pages/SettingsPage'
import UserProfilePage from './pages/UserProfilePage'
import { CoursesPage } from './pages/CoursesPage'
import LeaderboardPage from './pages/LeaderboardPage'
import BadgesPage from './pages/BadgesPage'

// Modals
import ConfirmModal from './components/modals/ConfirmModal'
import EditModal from './components/modals/EditModal'
import AddActivityModal from './components/modals/AddActivityModal'
import AddPackageModal from './components/modals/AddPackageModal'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('adminToken'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({ total_users: 0, active_today: 0, total_activities: 0, db_connected: false })
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  // Initialize from URL or default
  const getInitialTab = (): Tab => {
    const path = window.location.pathname.replace('/', '') as Tab;
    const validTabs: Tab[] = ['dashboard', 'users', 'settings', 'momentum', 'user-profile', 'subscriptions', 'courses', 'leaderboard', 'badges'];
    return validTabs.includes(path) ? path : 'dashboard';
  };
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab())

  // Sync URL with tab
  useEffect(() => {
    if (activeTab) {
      window.history.pushState(null, '', `/${activeTab}`);
    }
  }, [activeTab]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const [activeTier, setActiveTier] = useState<'All' | 'Free' | 'Silver' | 'Gold' | 'Diamond'>('All')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true')

  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [showAddActivityModal, setShowAddActivityModal] = useState(false)
  const [newActivity, setNewActivity] = useState({ name: '', points: 5, category: 'conscious' as const, icon: 'Activity', is_global: true, min_tier: 'Free' })
  const [userActivityPoints, setUserActivityPoints] = useState(20)

  const [packages, setPackages] = useState<SubscriptionPackage[]>([])
  const [activeSubscriptions, setActiveSubscriptions] = useState<UserSubscription[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [subTab, setSubTab] = useState<'packages' | 'subscribers' | 'history' | 'coupons' | 'sandbox'>('packages')

  const [showAddPackageModal, setShowAddPackageModal] = useState(false)
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_percentage: 10, max_uses: 100 })
  const [sandboxPurchase, setSandboxPurchase] = useState({ package_id: 0, months: 1, code: '', appliedCoupon: null as any })

  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void }>({ show: false, title: '', message: '', onConfirm: () => { } })
  const [editModal, setEditModal] = useState<{ show: boolean; title: string; label: string; value: string; onSave: (val: string) => void }>({ show: false, title: '', label: '', value: '', onSave: () => { } })

  const filteredUsers = users.filter(u => {
    if (u.is_admin || u.email === 'admin@realtorone.com' || (u.name || '').toLowerCase().includes('admin')) return false;
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTier = activeTier === 'All' || (u.membership_tier || 'Free') === activeTier
    return matchesSearch && matchesTier
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    console.log('Initiating Auth sequence for:', email);
    try {
      const data = await apiClient.login(email, password);
      console.log('Auth response received:', data);
      if (data.status === 'ok') {
        localStorage.setItem('adminToken', data.token);
        setIsLoggedIn(true);
        // Force refresh to ensure all state is hydrated properly from localStorage
        window.location.reload();
      } else {
        setLoginError(data.message || 'Identity verification failed')
      }
    } catch (err) {
      console.error('Network or Gateway Error:', err);
      setLoginError('Security gateway timed out. Check if backend is running.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    setIsLoggedIn(false)
  }

  const handleStatusToggle = async (userId: number) => {
    try {
      await apiClient.toggleUserStatus(userId)
      const updatedUsers = await apiClient.getUsers()
      setUsers(updatedUsers)
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, status: prev.status === 'inactive' ? 'active' : 'inactive' } : null)
      }
    } catch (error) {
      console.error('Failed to toggle status:', error)
    }
  }

  const handleDeleteUser = async (userId: number, userName: string) => {
    setConfirmModal({
      show: true,
      title: 'Purge Practitioner Identity',
      message: `Are you absolutely certain you wish to delete ${userName}? This will permanently wipe all growth records and mindset scores from the global database.`,
      onConfirm: async () => {
        try {
          await apiClient.deleteUser(userId)
          setUsers(users.filter(u => u.id !== userId))
          setConfirmModal({ ...confirmModal, show: false })
          setSelectedUser(null)
        } catch (error) {
          console.error('Failed to delete user:', error)
        }
      }
    })
  }


  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isLoggedIn) return;
      setIsLoading(true);
      try {
        const [statsRes, usersRes] = await Promise.allSettled([
          apiClient.getStats(),
          apiClient.getUsers()
        ]);

        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (usersRes.status === 'fulfilled') setUsers(usersRes.value);

        Promise.all([
          apiClient.getActivityTypes().then(res => res.success && setActivityTypes(res.data)).catch(() => { }),
          apiClient.getUserActivityPoints().then(res => res.success && setUserActivityPoints(res.points)).catch(() => { }),
          apiClient.getPackages().then(res => res.success && setPackages(res.data)).catch(() => { }),
          apiClient.getSubscriptions().then(res => res.success && setActiveSubscriptions(res.data)).catch(() => { }),
          apiClient.getCoupons().then(res => res.success && setCoupons(res.data)).catch(() => { }),
          apiClient.getCourses().then(res => res.success && setCourses(res.data)).catch(() => { }),
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <LoginPage
        handleLogin={handleLogin}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        loginError={loginError}
      />
    )
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      setMobileMenuOpen={() => { }}
      handleLogout={handleLogout}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      theme={theme}
      toggleTheme={toggleTheme}
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div className="loader"></div>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && <DashboardPage stats={stats} />}
          {activeTab === 'users' && (
            <UsersPage
              filteredUsers={filteredUsers}
              activeTier={activeTier}
              setActiveTier={setActiveTier}
              onUserClick={(u) => {
                setSelectedUser(u);
                setActiveTab('user-profile');
              }}
              onQuickLook={(u) => {
                setSelectedUser(u);
                setActiveTab('user-profile');
              }}
              onDelete={handleDeleteUser}
              onToggleStatus={handleStatusToggle}
            />
          )}
          {activeTab === 'momentum' && (
            <MomentumPage
              activityTypes={activityTypes}
              userActivityPoints={userActivityPoints}
              setShowAddActivityModal={setShowAddActivityModal}
              setUserActivityPoints={setUserActivityPoints}
              setActivityTypes={setActivityTypes}
            />
          )}
          {activeTab === 'subscriptions' && (
            <SubscriptionsPage
              subTab={subTab}
              setSubTab={setSubTab}
              packages={packages}
              setPackages={setPackages}
              activeSubscriptions={activeSubscriptions}
              setActiveSubscriptions={setActiveSubscriptions}
              coupons={coupons}
              setCoupons={setCoupons}
              setShowAddPackageModal={setShowAddPackageModal}
              newCoupon={newCoupon}
              setNewCoupon={setNewCoupon}
              sandboxPurchase={sandboxPurchase}
              setSandboxPurchase={setSandboxPurchase}
              users={users}
            />
          )}
          {activeTab === 'courses' && <CoursesPage courses={courses} setCourses={setCourses} />}
          {activeTab === 'settings' && (
            <SettingsPage
              activityTypes={activityTypes}
              setActivityTypes={setActivityTypes}
              packages={packages}
              setPackages={setPackages}
              userActivityPoints={userActivityPoints}
              setUserActivityPoints={setUserActivityPoints}
            />
          )}
          {activeTab === 'user-profile' && selectedUser && (
            <UserProfilePage
              user={selectedUser}
              setActiveTab={setActiveTab}
              onBack={() => {
                setSelectedUser(null);
                setActiveTab('users');
              }}
            />
          )}
          {activeTab === 'leaderboard' && <LeaderboardPage />}
          {activeTab === 'badges' && <BadgesPage />}
        </>
      )}

      {/* Modals */}
      {/* Modals */}
      {selectedUser && activeTab !== 'user-profile' && (
        // <UserDetailModal
        //   user={selectedUser}
        //   onClose={() => setSelectedUser(null)}
        //   onViewDossier={() => { setActiveTab('user-profile'); }}
        // />
        null
      )}

      <ConfirmModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal({ ...confirmModal, show: false })}
      />

      <EditModal
        show={editModal.show}
        title={editModal.title}
        label={editModal.label}
        value={editModal.value}
        onChange={(val) => setEditModal({ ...editModal, value: val })}
        onSave={editModal.onSave}
        onClose={() => setEditModal({ ...editModal, show: false })}
      />

      <AddActivityModal
        show={showAddActivityModal}
        onClose={() => setShowAddActivityModal(false)}
        newActivity={newActivity}
        setNewActivity={setNewActivity}
        setActivityTypes={setActivityTypes}
      />

      <AddPackageModal
        show={showAddPackageModal}
        onClose={() => setShowAddPackageModal(false)}
        setPackages={setPackages}
      />
    </Layout>
  )
}

export default App
