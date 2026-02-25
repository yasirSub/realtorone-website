import React from 'react';

interface LoginPageProps {
    handleLogin: (e: React.FormEvent) => void;
    email: string;
    setEmail: (val: string) => void;
    password: string;
    setPassword: (val: string) => void;
    showPassword: boolean;
    setShowPassword: (val: boolean) => void;
    loginError: string;
}

const LoginPage: React.FC<LoginPageProps> = ({
    handleLogin,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    loginError
}) => {
    return (
        <div className="login-container">
            <div
                className="debug-credits"
                title="Fill Admin Credentials"
                onClick={() => {
                    setEmail('admin@realtorone.com');
                    setPassword('password123');
                }}
            >
                🪲
            </div>

            <div className="login-card fade-in">
                <div className="login-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div className="logo-spark" style={{ fontSize: '3rem', marginBottom: '10px' }}>⚡</div>
                    <h1 className="logo-text" style={{ fontSize: '2.5rem', marginBottom: '5px' }}>Realtor<span>One</span></h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Administrative Overwatch</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <div className="form-group" style={{ textAlign: 'left' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '10px',
                            fontSize: '1rem',
                            fontWeight: 900,
                            color: '#0b1437',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>Identity Email</label>
                        <input
                            type="email"
                            placeholder="admin@realtorone.com"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group" style={{ textAlign: 'left' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '10px',
                            fontSize: '1rem',
                            fontWeight: 900,
                            color: '#0b1437',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>Passcode</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••••••"
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}
                            >
                                {showPassword ? '👁️' : '🔒'}
                            </button>
                        </div>
                    </div>

                    {loginError && (
                        <div className="fade-in" style={{ padding: '15px', borderRadius: '15px', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', fontSize: '0.85rem', fontWeight: 800, textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                            ⚠️ {loginError}
                        </div>
                    )}

                    <button type="submit" className="login-btn" style={{ marginTop: '10px', height: '60px' }}>
                        Infiltrate Control Plane
                    </button>

                </form>
            </div>
        </div>
    );
};

export default LoginPage;
