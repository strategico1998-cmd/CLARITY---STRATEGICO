import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import './Login.css'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn(email, password)
      // AuthContext will handle redirect via PublicRoute
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Background grid */}
      <div className="login-grid" />

      <div className="login-card fade-in">
        {/* Logo */}
        <div className="login-header">
          <div className="login-logo">S</div>
          <h1 className="login-title">Sapiens Analytics</h1>
          <p className="login-subtitle">Panel de control de analítica web</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              placeholder="admin@tuempresa.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="login-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', height: '44px' }}
            disabled={loading}
          >
            {loading ? <span className="loading-spinner" style={{ width: 18, height: 18 }} /> : 'Iniciar sesión'}
          </button>
        </form>

        <p className="login-footer">
          Plataforma SaaS © 2025 Sapiens Analytics
        </p>
      </div>
    </div>
  )
}
