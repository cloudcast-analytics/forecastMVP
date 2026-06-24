import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isDemo } from '../lib/supabase'
import { useApp } from '../context/AppContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (isDemo) {
      login('demo@cloudcast.be')
      navigate('/dashboard')
      return
    }

    try {
      const { error: authError, data } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError('Inloggen mislukt. Controleer je e-mailadres en wachtwoord.')
        setLoading(false)
      } else {
        login(data.user?.email)
        navigate('/dashboard')
      }
    } catch {
      setError('Verbindingsfout. Probeer opnieuw.')
      setLoading(false)
    }
  }

  function handleDemoLogin() {
    login('demo@cloudcast.be')
    navigate('/dashboard')
  }

  const disabled = loading || (!isDemo && (!email || !password))

  return (
    <div
      className="bg-mesh-login"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div className="animate-fadeUp" style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo + heading */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <img
            src="/logo-icon.png"
            alt="CloudCast"
            style={{
              height: '68px',
              display: 'block',
              margin: '0 auto 20px',
              filter: 'drop-shadow(0 4px 12px rgba(26, 68, 232, 0.15))',
            }}
          />
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '28px',
            fontWeight: 400,
            color: '#1a1f36',
            marginBottom: '8px',
          }}>
            CloudCast Analytics
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: 1.5 }}>
            {isDemo
              ? 'Demo-modus actief — log direct in'
              : 'Log in om verder te gaan'}
          </p>
        </div>

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="glass-strong"
          style={{ borderRadius: '24px', padding: '36px' }}
        >
          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#1a1f36',
              marginBottom: '8px',
            }}>
              E-mailadres
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jouw@bedrijf.nl"
              required={!isDemo}
              autoFocus
              className="glass-input"
              style={{
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                height: '48px',
                borderRadius: '14px',
                padding: '0 16px',
                fontSize: '15px',
                color: '#1a1f36',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#1a1f36',
              marginBottom: '8px',
            }}>
              Wachtwoord
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Uw wachtwoord"
              required={!isDemo}
              className="glass-input"
              style={{
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                height: '48px',
                borderRadius: '14px',
                padding: '0 16px',
                fontSize: '15px',
                color: '#1a1f36',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              marginBottom: '18px',
              background: 'rgba(254, 202, 202, 0.5)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(252, 165, 165, 0.5)',
              borderRadius: '14px',
              fontSize: '13px',
              color: '#991b1b',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={disabled}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              height: '52px',
              borderRadius: '16px',
              fontSize: '16px',
            }}
          >
            {loading && (
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(255,255,255,.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin .7s linear infinite',
              }} />
            )}
            {loading ? 'Inloggen...' : 'Inloggen'}
          </button>
        </form>

        {/* Demo shortcut */}
        {isDemo && (
          <button
            type="button"
            onClick={handleDemoLogin}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              marginTop: '16px',
              padding: '12px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: 'inherit',
              color: '#1a44e8',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Inloggen met demo-account
          </button>
        )}

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '12px',
          color: '#6b7280',
          opacity: 0.7,
        }}>
          CloudCast Analytics — Revenue Forecasting
        </p>
      </div>
    </div>
  )
}
