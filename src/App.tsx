import { useEffect, useState } from 'react'
import './App.css'
import { apiClient } from './api/client'
import type { HealthStatus, User } from './api/client'

type Tab = 'dashboard' | 'users' | 'settings'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('adminToken'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [stats, setStats] = useState({ total_users: 0, active_today: 0, total_activities: 0, db_connected: false })
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const [activeTier, setActiveTier] = useState<'All' | 'Free' | 'Silver' | 'Gold'>('All')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true')

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTier = activeTier === 'All' || u.membership_tier === activeTier
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
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000/api' : '/api');
      const response = await fetch(`${baseUrl}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await response.json()
      if (response.ok) {
        setIsLoggedIn(true)
        localStorage.setItem('adminToken', data.token)
      } else {
        setLoginError(data.message || 'Identity verification failed')
      }
    } catch {
      setLoginError('Security gateway timed out')
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
        setSelectedUser({ ...selectedUser, status: selectedUser.status === 'inactive' ? 'active' : 'inactive' })
      }
    } catch {
      alert('Action intercepted')
    }
  }

  const handleUserDelete = async (userId: number) => {
    if (!window.confirm('Retire professional profile permanently?')) return
    try {
      await apiClient.deleteUser(userId)
      const [statsData, usersData] = await Promise.all([
        apiClient.getStats(),
        apiClient.getUsers()
      ])
      setStats(statsData)
      setUsers(usersData)
      if (selectedUser?.id === userId) setSelectedUser(null)
    } catch {
      alert('Decommission failed')
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return
    const fetchData = () => {
      apiClient.getHealth().then(setHealth).catch(() => { });
      apiClient.getStats().then(setStats).catch(() => { });
      apiClient.getUsers().then(setUsers).catch(() => { });
    }
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [isLoggedIn])

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card fade-in">
          <div className="login-header" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
            <h1 className="logo" style={{ fontSize: '2.4rem' }}>Realtor<span>One</span></h1>
            <p>Administrative Vault Login</p>
          </div>
          <form className="login-form" onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {loginError && <div style={{ color: 'var(--error)', fontSize: '0.85rem', fontWeight: 800, textAlign: 'center', background: 'rgba(255,100,100,0.1)', padding: '10px', borderRadius: '10px' }}>{loginError}</div>}
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)' }}>EMAIL ADDRESS</label>
              <input type="email" placeholder="admin@realtorone.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="form-input" />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)' }}>PASSCODE</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="form-input" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '1.2rem' }}>
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Enter Control Plane</button>
          </form>
          <button className="debug-fab" onClick={() => { setEmail('admin@realtorone.com'); setPassword('password123'); }}
            style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'var(--primary)', color: '#fff', width: '50px', height: '50px', borderRadius: '50%', border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px var(--primary-glow)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚡</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Floating Kora Sidebar */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          {!isSidebarCollapsed && <h1 className="logo">Realtor<span>One</span></h1>}
          <button
            className="collapse-btn"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-label">Management</div>
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span className="icon">🏠</span> <span>Dashboard</span>
          </button>
          <button className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <span className="icon">👥</span> <span>Management</span>
          </button>
          <div className="nav-label">Platform</div>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <span className="icon">⚙️</span> <span>Settings</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile-mini">
            <div className="avatar-chip">RA</div>
            <div className="user-info">
              <span style={{ fontWeight: 800, fontSize: '0.9rem', display: 'block' }}>Root Admin</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Administrator</span>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: '100%', marginTop: '15px', padding: '10px', borderRadius: '12px', border: 'none', background: 'white', color: 'var(--error)', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>Logout Session</button>
        </div>
      </aside>

      <main className="main-viewport">
        {/* Floating Top Bar */}
        <header className="top-bar">
          <div className="breadcrumb" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Pages / {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
          </div>

          <div className="icon-btn-container">
            <div className="search-pill">
              <span className="icon">🔍</span>
              <input
                type="text"
                placeholder="Search professionals, metrics or insights..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="theme-toggle-btn" onClick={toggleTheme}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <div style={{ position: 'relative' }}>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>🔔</button>
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%', border: '2px solid white' }}></span>
            </div>
            <div className="avatar-chip" style={{ width: '35px', height: '35px', borderRadius: '50%' }}>RA</div>
          </div>
        </header>

        <div className="content-scrollable">
          {activeTab === 'dashboard' && (
            <div className="view-container fade-in">
              <div className="hero-section" style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '10px 0', color: 'var(--text-main)' }}>Good Morning, Admin</h1>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '600px', lineHeight: '1.6' }}>Here is your daily briefing. You have <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{filteredUsers.length} active professionals</span> under your management.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <button className="filter-btn" style={{ background: 'white' }}>View Reports</button>
                    <button className="btn-primary" style={{ padding: '8px 20px' }}>+ New Professional</button>
                  </div>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="card-icon-wrap" style={{ color: 'var(--primary)', background: '#F4F7FE' }}>👥</div>
                  <div className="card-info">
                    <span className="label">Total Realtors</span>
                    <span className="value">{stats.total_users}</span>
                    <span className="trend" style={{ color: 'var(--success)' }}>+2.5%</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="card-icon-wrap" style={{ color: 'var(--accent)', background: '#F4F7FE' }}>⚡</div>
                  <div className="card-info">
                    <span className="label">Active Sessions</span>
                    <span className="value">{stats.active_today}</span>
                    <span className="trend" style={{ color: 'var(--success)' }}>Live</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="card-icon-wrap" style={{ color: '#01B574', background: '#F4F7FE' }}>📈</div>
                  <div className="card-info">
                    <span className="label">Avg Growth</span>
                    <span className="value">
                      {users.length > 0 ? (users.reduce((a, b) => a + (b.growth_score || 0), 0) / users.length).toFixed(0) : 0}%
                    </span>
                    <span className="trend" style={{ color: 'var(--success)' }}>+14%</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="card-icon-wrap" style={{ color: '#FFB547', background: '#F4F7FE' }}>🎯</div>
                  <div className="card-info">
                    <span className="label">DB Status</span>
                    <span className="value" style={{ fontSize: '1rem', color: (health?.db.ok || stats.db_connected) ? 'var(--success)' : 'var(--error)' }}>
                      {(health?.db.ok || stats.db_connected) ? 'SYNCED' : 'OFFLINE'}
                    </span>
                    <span className="trend">Real-time</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0 }}>Revenue Overview</h3>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="filter-btn active">Daily</button>
                        <button className="filter-btn">Weekly</button>
                        <button className="filter-btn">Monthly</button>
                      </div>
                    </div>
                    <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '20px 0' }}>
                      {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                        <div key={i} style={{ width: '40px', height: `${h}%`, background: i === 3 ? 'var(--primary)' : 'rgba(109, 40, 217, 0.2)', borderRadius: '10px', transition: 'height 1s' }}></div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0 }}>Recent Enrollees</h3>
                      <button onClick={() => setActiveTab('users')} style={{ padding: '8px 15px', borderRadius: '12px', border: 'none', background: 'var(--bg-app)', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer' }}>View All</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {users.slice(0, 5).map(u => (
                        <div key={u.id} className="activity-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'var(--bg-app)', borderRadius: '15px' }}>
                          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div className="avatar-chip" style={{ width: '40px', height: '40px' }}>{(u.name || 'U').substring(0, 1)}</div>
                            <div>
                              <span style={{ fontWeight: 800, display: 'block' }}>{u.name}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.membership_tier || 'Free'}</span>
                            </div>
                          </div>
                          <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{u.growth_score || 0}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="action-cards-grid">
                    <div className="action-card"><span>📦 Products</span></div>
                    <div className="action-card"><span>📄 Invoices</span></div>
                    <div className="action-card"><span>📊 Reports</span></div>
                    <div className="action-card"><span>👥 Users</span></div>
                  </div>

                  <div className="glass-panel">
                    <h3 style={{ margin: '0 0 20px 0' }}>Core Performance</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {['Branding', 'Lead Gen', 'Sales', 'Mindset'].map(p => {
                        const key = p.toLowerCase().replace(' ', '_');
                        const avg = users.length > 0 ? Math.round(users.reduce((a, b) => a + (b.diagnosis_scores?.[key as keyof typeof b.diagnosis_scores] || 0), 0) / users.length) : 0;
                        return (
                          <div key={p}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 800 }}>
                              <span style={{ color: 'var(--text-muted)' }}>{p}</span>
                              <span>{avg}%</span>
                            </div>
                            <div className="progress-track" style={{ height: '8px', background: '#F4F7FE' }}>
                              <div className="progress-fill" style={{ width: `${avg}%`, background: 'var(--primary)' }}></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="view-container fade-in">
              <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Professional Registry</h2>
                <div className="filter-group">
                  {(['All', 'Free', 'Silver', 'Gold'] as const).map(t => (
                    <button key={t} className={`filter-btn ${activeTier === t ? 'active' : ''}`} onClick={() => setActiveTier(t)}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="glass-panel">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Entity</th>
                      <th style={{ textAlign: 'left' }}>Growth</th>
                      <th style={{ textAlign: 'left' }}>License</th>
                      <th style={{ textAlign: 'left' }}>Tier</th>
                      <th style={{ textAlign: 'left' }}>Operational</th>
                      <th style={{ textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} onClick={() => setSelectedUser(u)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div className="avatar-chip" style={{ width: '40px', height: '40px' }}>{(u.name || 'U').substring(0, 1)}</div>
                            <div>
                              <span style={{ fontWeight: 800, display: 'block' }}>{u.name}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="progress-track" style={{ width: '60px', height: '6px', background: '#F4F7FE' }}>
                              <div className="progress-fill" style={{ width: `${u.growth_score || 0}%`, background: 'var(--primary)' }}></div>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{u.growth_score || 0}%</span>
                          </div>
                        </td>
                        <td style={{ opacity: 0.6 }}>{u.license_number || 'PENDING'}</td>
                        <td><span className={`tier-pill ${(u.membership_tier || 'Free').toLowerCase()}`}>{u.membership_tier || 'Free'}</span></td>
                        <td>
                          <div className="status-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: u.status === 'inactive' ? 'var(--error)' : 'var(--success)' }}></span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{u.status || 'Active'}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '10px' }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleStatusToggle(u.id)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>🔄</button>
                            <button onClick={() => handleUserDelete(u.id)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="view-container fade-in">
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '30px' }}>System Infrastructure</h2>
              <div className="glass-panel" style={{ maxWidth: '800px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '10px' }}>CORE API ENDPOINT</label>
                    <input type="text" value={import.meta.env.VITE_API_BASE_URL || 'DYNAMIC_CLOUD'} readOnly
                      style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '2px solid var(--bg-app)', background: 'var(--bg-app)', fontWeight: 800, color: 'var(--primary)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                    <div style={{ background: 'var(--bg-app)', padding: '20px', borderRadius: '20px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', display: 'block' }}>HEALTH</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>OPERATIONAL</span>
                    </div>
                    <div style={{ background: 'var(--bg-app)', padding: '20px', borderRadius: '20px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', display: 'block' }}>SECURITY</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>ENCRYPTED</span>
                    </div>
                    <div style={{ background: 'var(--bg-app)', padding: '20px', borderRadius: '20px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', display: 'block' }}>VERSION</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>v1.4.6</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Pro Detail Modal (Fixed & Compact Kora Style) */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px', display: 'grid', gridTemplateColumns: '1fr' }}>
            {/* Compact Premium Header */}
            <div style={{ position: 'relative', height: '110px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', padding: '20px' }}>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ position: 'absolute', right: '15px', top: '15px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800 }}
              >✕</button>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', position: 'absolute', bottom: '-40px', left: '25px' }}>
                <div className="avatar-chip" style={{ width: '80px', height: '80px', fontSize: '2.2rem', borderRadius: '25px', border: '4px solid var(--bg-modal)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>{(selectedUser.name || 'U').substring(0, 1)}</div>
                <div style={{ paddingBottom: '10px' }}>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: 'white', textShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>{selectedUser.name}</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px' }}>
                    <span className={`tier-pill ${(selectedUser.membership_tier || 'Free').toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '3px 10px' }}>{selectedUser.membership_tier || 'Free'} Member</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{selectedUser.email}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '55px 25px 25px 25px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="glass-panel" style={{ padding: '15px', background: 'var(--bg-app)', border: 'none' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Growth Score</span>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-1px' }}>{selectedUser.growth_score || 0}%</span>
                  <div className="progress-track" style={{ height: '8px', marginTop: '8px' }}>
                    <div className="progress-fill" style={{ width: `${selectedUser.growth_score || 0}%`, background: 'var(--primary)' }}></div>
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '15px', background: 'var(--bg-app)', border: 'none' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Account Tier</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, display: 'block' }}>{selectedUser.membership_tier || 'Standard'}</span>
                  <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700, marginTop: '8px' }}>● ACTIVE</div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800 }}>Performance Pillars</h3>
                <div className="pillar-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { l: 'Branding', k: 'branding' as const, i: '🎨' },
                    { l: 'Lead Gen', k: 'lead_gen' as const, i: '🎯' },
                    { l: 'Sales', k: 'sales' as const, i: '🤝' },
                    { l: 'Mindset', k: 'mindset' as const, i: '🧠' }
                  ].map(p => {
                    const scores = selectedUser.diagnosis_scores;
                    const score = scores ? (scores[p.k] || 0) : 0;
                    return (
                      <div key={p.k} style={{ padding: '12px', borderRadius: '15px', background: 'var(--bg-app)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.75rem' }}>{p.i} {p.l}</span>
                          <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '0.85rem' }}>{score}%</span>
                        </div>
                        <div className="progress-track" style={{ height: '5px', background: 'white' }}>
                          <div className="progress-fill" style={{ width: `${score}%`, background: score > 70 ? 'var(--success)' : (score > 40 ? 'var(--primary)' : 'var(--error)') }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px', padding: '15px', background: 'var(--bg-app)', borderRadius: '15px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '3px' }}>LICENSE</span>
                  <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{selectedUser.license_number || 'UP-99281'}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '3px' }}>JOINED</span>
                  <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : '02/09/2026'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }} onClick={() => selectedUser && handleStatusToggle(selectedUser.id)}>
                  {selectedUser.status === 'inactive' ? 'Restore Access' : 'Suspend Access'}
                </button>
                <button className="btn-primary" style={{ padding: '10px 15px', background: 'var(--error)', fontSize: '0.8rem' }} onClick={() => selectedUser && handleUserDelete(selectedUser.id)}>🗑️</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
