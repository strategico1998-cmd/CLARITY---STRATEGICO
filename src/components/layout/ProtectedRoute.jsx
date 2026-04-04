import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="loading-page">
      <div className="loading-spinner" />
      <p style={{ color: 'var(--gray-3)' }}>Cargando...</p>
    </div>
  )

  // Require authentication and correct role
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />

  return children
}

export function ClientRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="loading-page">
      <div className="loading-spinner" />
      <p style={{ color: 'var(--gray-3)' }}>Cargando...</p>
    </div>
  )

  // Require authentication
  if (!user) return <Navigate to="/login" replace />
  return children
}

export function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="loading-page">
      <div className="loading-spinner" />
    </div>
  )

  if (user) {
    if (profile?.role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/dashboard" replace />
  }

  return children
}
