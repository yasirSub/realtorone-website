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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000/api`;
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
        setLoginError(data.message || 'Login failed')
      }
    } catch (err) {
      setLoginError('Could not connect to server')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    setIsLoggedIn(false)
  }

  const handleStatusToggle = async (userId: number) => {
    try {
      await apiClient.toggleUserStatus(userId)
      // Refresh user list
      const updatedUsers = await apiClient.getUsers()
      setUsers(updatedUsers)
    } catch (err) {
      alert('Could not update user status')
    }
  }

  const handleUserDelete = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    try {
      await apiClient.deleteUser(userId)
      // Refresh data
      const [statsData, usersData] = await Promise.all([
        apiClient.getStats(),
        apiClient.getUsers()
      ])
      setStats(statsData)
      setUsers(usersData)
    } catch (err) {
      alert('Could not delete user')
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return
    const fetchData = async () => {
      // Fetch health
      apiClient.getHealth().then(setHealth).catch(err => console.error('Health fetch failed', err));

      // Fetch stats
      apiClient.getStats().then(setStats).catch(err => console.error('Stats fetch failed', err));

      // Fetch users
      apiClient.getUsers().then(setUsers).catch(err => console.error('Users fetch failed', err));
    }
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [isLoggedIn])

  return (
    !isLoggedIn ? (
      <div className="login-container">
        {/* Decorative Background Elements */}
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>

        <div className="glass-card login-card">
          <div className="login-header">
            <h1 className="logo large">Realtor<span>One</span></h1>
            <div className="divider"></div>
            <p className="subtitle">Enterprise Admin Portal</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            {loginError && <div className="error-message">{loginError}</div>}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-login">Unlock Dashboard</button>
          </form>
        </div>

        {/* DEBUG AUTOFILL BUTTON */}
        <button
          className="debug-fab"
          onClick={() => {
            setEmail('admin@realtorone.com');
            setPassword('password123');
          }}
        >
          <span>🛠️</span> Autofill Admin
        </button>
      </div>
    ) : (
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <h1 className="logo">Realtor<span>One</span></h1>
            <p className="subtitle">Admin Management</p>
          </div>

          <nav className="sidebar-nav">
            <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <span className="icon">○</span> Overview
            </button>
            <button className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              <span className="icon">○</span> Users
            </button>
            <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <span className="icon">○</span> System
            </button>
          </nav>

          <div className="sidebar-footer">
            <button className="nav-item" onClick={handleLogout} style={{ width: '100%', marginBottom: '1rem', color: '#ef4444' }}>
              <span className="icon">✕</span> Sign Out
            </button>
            <div className="status-indicator">
              <span className={`dot ${(health?.status === 'ok' || stats.total_users > 0) ? 'online' : 'offline'}`}></span>
              {(health?.status === 'ok' || stats.total_users > 0) ? 'Server: Connected' : 'Server: Connecting...'}
            </div>
          </div>
        </aside>

        <main className="content-area">
          <header className="content-header">
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search everything..."
              />
            </div>
            <div className="header-actions">
              <button className="btn-icon">🔔</button>
              <div className="profile-badge">Admin</div>
            </div>
          </header>

          <section className="content-body">
            {activeTab === 'dashboard' && (
              <div className="view-container">
                <h2 className="view-title">Platform Overview</h2>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <label>Total Users</label>
                    <div className="value">{stats.total_users.toLocaleString()}</div>
                    <div className="trend positive">Live from Database</div>
                  </div>
                  <div className="metric-card">
                    <label>Database Status</label>
                    <div className={`value ${(health?.db.ok || stats.db_connected) ? 'text-success' : 'text-error'}`}>
                      {(health?.db.ok || stats.db_connected) ? 'Running' : 'Connecting...'}
                    </div>
                    <div className="trend">System Verified</div>
                  </div>
                </div>

                <div className="charts-placeholder">
                  <div className="glass-panel">
                    <h3>Recent Signups</h3>
                    <div className="mini-user-list">
                      {users.slice(0, 5).map(u => (
                        <div key={u.id} className="mini-user-item">
                          <div className="avatar-chip">{u.name.substring(0, 1)}</div>
                          <div className="info">
                            <div className="name">{u.name}</div>
                            <div className="time">{new Date(u.created_at || '').toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="view-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 className="view-title" style={{ margin: 0 }}>User Management</h2>
                  <div className="search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Find users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Rank</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u =>
                      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map(user => (
                      <tr key={user.id} onClick={() => setSelectedUser(user)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {user.profile_picture ? (
                              <img src={user.profile_picture} alt="" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
                            ) : (
                              <div className="avatar-chip" style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}>{user.name.substring(0, 1)}</div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600 }}>{user.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.phone_number || 'No phone'}</div>
                            </div>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600 }}>{user.rank || 'Agent'}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>Growth: {user.growth_score || 0}%</span>
                          </div>
                        </td>
                        <td><span className={`badge ${user.status === 'inactive' ? 'error' : 'success'}`}>
                          {user.status || 'Active'}
                        </span></td>
                        <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn-small secondary"
                            onClick={() => handleStatusToggle(user.id)}
                          >
                            {user.status === 'inactive' ? 'Activate' : 'Suspend'}
                          </button>
                          <button
                            className="btn-small danger"
                            onClick={() => handleUserDelete(user.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center' }}>No users found in database</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}


            {activeTab === 'settings' && (
              <div className="view-container">
                <h2 className="view-title">Platform Settings</h2>
                <div className="settings-form">
                  <div className="form-group">
                    <label>API Endpoint</label>
                    <input type="text" value="http://localhost:8000/api" readOnly />
                  </div>
                  <div className="form-group">
                    <label>Diagnostic Threshold</label>
                    <input type="range" min="0" max="100" defaultValue="75" />
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>

        {/* User Detail Modal */}
        {selectedUser && (
          <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  {selectedUser.profile_picture ? (
                    <img src={selectedUser.profile_picture} alt="" style={{ width: '80px', height: '80px', borderRadius: '24px', objectFit: 'cover' }} />
                  ) : (
                    <div className="avatar-chip" style={{ width: '80px', height: '80px', fontSize: '2rem', borderRadius: '24px' }}>{selectedUser.name.substring(0, 1)}</div>
                  )}
                  <div>
                    <h2 style={{ margin: 0 }}>{selectedUser.name}</h2>
                    <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0' }}>{selectedUser.email}</p>
                    <span className={`badge ${selectedUser.is_premium ? 'success' : 'secondary'}`}>
                      {selectedUser.is_premium ? 'Premium Member' : 'Free Plan'}
                    </span>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => setSelectedUser(null)}>✕</button>
              </div>

              <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="metric-card" style={{ padding: '1.25rem' }}>
                  <label style={{ fontSize: '0.7rem' }}>Rank</label>
                  <div className="value" style={{ fontSize: '1.5rem' }}>{selectedUser.rank || 'N/A'}</div>
                </div>
                <div className="metric-card" style={{ padding: '1.25rem' }}>
                  <label style={{ fontSize: '0.7rem' }}>Streak</label>
                  <div className="value" style={{ fontSize: '1.5rem' }}>{selectedUser.current_streak || 0} Days</div>
                </div>
                <div className="metric-card" style={{ padding: '1.25rem' }}>
                  <label style={{ fontSize: '0.7rem' }}>Mindset</label>
                  <div className="value" style={{ fontSize: '1.5rem' }}>{selectedUser.mindset_index || 0}%</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <h4 style={{ marginTop: 0 }}>Onboarding Info</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <div><strong>Full Name:</strong> {selectedUser.first_name} {selectedUser.last_name}</div>
                    <div><strong>Phone:</strong> {selectedUser.phone_number || 'Not provided'}</div>
                    <div><strong>Joined:</strong> {new Date(selectedUser.created_at || '').toLocaleDateString()}</div>
                    <div><strong>Step:</strong> Onboarding Stage {selectedUser.onboarding_step || 0}</div>
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <h4 style={{ marginTop: 0 }}>Performance</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <div><strong>Growth Score:</strong> {selectedUser.growth_score || 0}%</div>
                    <div><strong>Execution Rate:</strong> {selectedUser.execution_rate || 0}%</div>
                    <div><strong>Status:</strong> {selectedUser.status}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  )
}

export default App
