import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function Authentication() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState();
  const [message, setMessage] = useState();
  const [formState, setFormState] = useState(0);
  const [open, setOpen] = useState(false);

  const { handleRegister, handleLogin } = useContext(AuthContext);

  const handleAuth = async () => {
    try {
      if (formState === 0) {
        await handleLogin(username, password);
      } else if (formState === 1) {
        const result = await handleRegister(name, username, password);
        setUsername('');
        setMessage(result);
        setOpen(true);
        setError('');
        setFormState(0);
        setPassword('');
      }
    } catch (err) {
      console.error(err);
      const serverMessage = err?.response?.data?.message || 'Authentication failed';
      setError(serverMessage);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="hero-container max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-4">
            🔒
          </div>

          <div className="flex gap-2 mb-4">
            <button
              className={`${formState === 0 ? 'cta-light' : 'cta-dark'}`}
              onClick={() => setFormState(0)}
            >
              Sign In
            </button>
            <button
              className={`${formState === 1 ? 'cta-light' : 'cta-dark '}`}
              onClick={() => setFormState(1)}
            >
              Sign Up
            </button>
          </div>

          <form className="w-full" onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
            {formState === 1 && (
              <div className="mb-3">
                <label className="block text-sm text-white/70 mb-1">Full name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 rounded bg-black/30 border border-white/10 text-white" />
              </div>
            )}

            <div className="mb-3">
              <label className="block text-sm text-white/70 mb-1">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-2 rounded bg-black/30 border border-white/10 text-white" />
            </div>

            <div className="mb-3">
              <label className="block text-sm text-white/70 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 rounded bg-black/30 border border-white/10 text-white" />
            </div>

            {error && <div className="text-sm text-red-400 mb-2">{error}</div>}

            <button type="submit" className="w-full cta-dark">
              {formState === 0 ? 'Login' : 'Register'}
            </button>
          </form>

          {open && (
            <div className="mt-4 p-2 bg-white/10 rounded text-sm text-white">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}