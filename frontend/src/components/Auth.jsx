import React, { useState } from 'react';

export default function Auth({ onLogin, apiBase }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const body = mode === 'signup'
        ? { name, email, password }
        : { email, password };

      const res = await fetch(`${apiBase}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      onLogin(data);

    } catch (err) {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="logo" style={{ justifyContent: 'center', marginBottom: '8px' }}>
          <span className="logo-icon">◈</span>
          <span className="logo-text">VoiceTask</span>
        </div>
        <p className="auth-subtitle">Voice-controlled task manager</p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Login
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        {mode === 'signup' && (
          <div className="auth-field">
            <label>Name</label>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        )}

        <div className="auth-field">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button
          className="auth-submit"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}