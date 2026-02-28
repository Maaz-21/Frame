import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Snackbar from '../components/Snackbar';

export default function Authentication() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', variant: 'info' });
  const [formState, setFormState] = useState(0); // 0 = login, 1 = register
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { handleRegister, handleLogin } = useContext(AuthContext);

  const handleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      if (formState === 0) {
        if (!username || !password) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        await handleLogin(username, password);
      } else {
        if (!name || !username || !password) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        const result = await handleRegister(name, username, password);
        setSnack({ open: true, message: result || 'Account created!', variant: 'success' });
        setFormState(0);
        setName('');
        setPassword('');
      }
    } catch (err) {
      const serverMessage = err?.response?.data?.message || 'Authentication failed';
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const switchForm = (state) => {
    setFormState(state);
    setError('');
    setName('');
    setPassword('');
    setUsername('');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar showAuth={false} />

      <div className="auth-overlay">
        {/* Decorative brand panel */}
        <div className="auth-brand-panel">
          <div className="relative z-10 text-center p-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6)', boxShadow: '0 0 40px rgba(52,211,153,0.3)' }}>
              <span className="material-symbols-rounded text-white text-3xl">frame_source</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Frame</h2>
            <p className="text-sm max-w-xs mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Connect with anyone, anywhere. Crystal-clear video calls with built-in collaboration tools.
            </p>

            {/* Floating feature tags */}
            <div className="flex flex-wrap gap-2 justify-center mt-8 max-w-xs mx-auto">
              {['HD Video', 'Screen Share', 'Live Chat', 'Reactions', 'Secure'].map((tag, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs"
                  style={{
                    background: 'rgba(52,211,153,0.08)',
                    border: '1px solid rgba(52,211,153,0.15)',
                    color: 'rgba(255,255,255,0.5)',
                    animationDelay: `${i * 0.1}s`
                  }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="auth-form-panel">
          <div className="auth-card fade-in relative">
            {/* Animated conic border */}
            <div className="auth-card-border" />

            {/* Header */}
            <div className="flex flex-col items-center mb-6 relative z-10">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 lg:hidden"
                style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6)', boxShadow: '0 0 30px rgba(52,211,153,0.2)' }}>
                <span className="material-symbols-rounded text-white text-xl">videocam</span>
              </div>
              <h2 className="text-xl font-semibold text-white">
                {formState === 0 ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {formState === 0 ? 'Sign in to continue to Frame' : 'Get started with Frame'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 p-1 rounded-xl relative z-10" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                className={formState === 0 ? 'auth-tab-active flex-1' : 'auth-tab flex-1'}
                onClick={() => switchForm(0)}
              >
                Sign In
              </button>
              <button
                className={formState === 1 ? 'auth-tab-active flex-1' : 'auth-tab flex-1'}
                onClick={() => switchForm(1)}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form className="space-y-4 relative z-10" onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
              {formState === 1 && (
                <div className="fade-in">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Full name</label>
                  <div className="relative">
                    <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'rgba(255,255,255,0.15)' }}>person</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="input-field pl-10"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Username</label>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'rgba(255,255,255,0.15)' }}>alternate_email</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your_username"
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Password</label>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'rgba(255,255,255,0.15)' }}>lock</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="input-field pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                    style={{ color: 'rgba(255,255,255,0.25)' }}
                  >
                    <span className="material-symbols-rounded text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{
                  background: 'rgba(244,63,94,0.06)',
                  border: '1px solid rgba(244,63,94,0.12)',
                  color: '#fb7185'
                }}>
                  <span className="material-symbols-rounded text-sm">error</span>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="cta-glow w-full flex items-center justify-center gap-2 py-3">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-rounded text-lg">
                      {formState === 0 ? 'login' : 'person_add'}
                    </span>
                    {formState === 0 ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <Snackbar
        message={snack.message}
        variant={snack.variant}
        isOpen={snack.open}
        onClose={() => setSnack({ ...snack, open: false })}
      />
    </div>
  );
}