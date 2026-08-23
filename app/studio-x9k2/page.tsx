'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/studio-x9k2/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1008 50%, #0a0a0a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Jost', 'Inter', sans-serif",
      padding: '2rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
      }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '60px', height: '60px',
            background: 'linear-gradient(135deg, #c9a84c, #8b6914)',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem',
          }}>🎨</div>
          <h1 style={{ color: '#c9a84c', fontSize: '1.5rem', fontWeight: 300, letterSpacing: '0.2em', margin: 0 }}>
            STUDIO
          </h1>
          <p style={{ color: '#666', fontSize: '0.75rem', letterSpacing: '0.15em', margin: '0.4rem 0 0' }}>
            ADMIN PORTAL
          </p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: '16px',
          padding: '2.5rem',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#999', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={{
                width: '100%', padding: '0.85rem 1rem',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.6)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#999', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '0.85rem 3rem 0.85rem 1rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '1rem',
                }}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.15)',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.9rem',
              background: loading
                ? 'rgba(201,168,76,0.4)'
                : 'linear-gradient(135deg, #c9a84c, #8b6914)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: 500,
              letterSpacing: '0.08em',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s, transform 0.1s',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget.style.opacity = '0.9'); }}
            onMouseLeave={e => { (e.currentTarget.style.opacity = '1'); }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#333', fontSize: '0.7rem', marginTop: '2rem' }}>
          ReenArt · Admin · Private Access
        </p>
      </div>
    </div>
  );
}
