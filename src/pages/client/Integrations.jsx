import { useEffect, useState } from 'react'
import { ClientLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'
import { connectIntegration, disconnectIntegration, getIntegrations } from '../../api/marketing'

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook Ads (Meta)', icon: '🟦', color: '#1877F2' },
  { id: 'tiktok', name: 'TikTok Ads', icon: '⬛', color: '#000000' },
  { id: 'linkedin', name: 'LinkedIn Ads', icon: '💼', color: '#0077b5' },
  { id: 'google_analytics', name: 'Google Analytics 4', icon: '📊', color: '#F4B400' },
  { id: 'google_ads', name: 'Google Ads', icon: '📈', color: '#4285F4' },
]

export default function Integrations() {
  const { user } = useAuth()
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  // Use the owner_id lookup from 'clients' just in case, or default to user.id if clients map 1:1.
  // Assuming the user.id is tied to client_id logic, let's pass user.id to API where it queries based on client_id logic.
  // Note: the backend uses user.id as owner_id to find client, so our API functions need the actual client UUID.
  const [clientId, setClientId] = useState(user?.id || null)

  useEffect(() => {
    if (user) {
      setClientId(user.id)
    }
  }, [user])

  useEffect(() => {
    if (clientId) fetchSetup()
  }, [clientId])

  async function fetchSetup() {
    setLoading(true)
    const res = await getIntegrations(clientId)
    if (res.success) {
      setIntegrations(res.data)
    }
    setLoading(false)
  }

  async function handleConnect(platformId) {
    setActionLoading(platformId)
    // Invoca OAuth (mocked)
    const res = await connectIntegration(clientId, platformId)
    if (res.success) {
      await fetchSetup()
    } else {
      alert("Error al conectar: " + res.error)
    }
    setActionLoading(null)
  }

  async function handleDisconnect(platformId) {
    setActionLoading(platformId)
    const res = await disconnectIntegration(clientId, platformId)
    if (res.success) {
      await fetchSetup()
    } else {
      alert("Error al desconectar: " + res.error)
    }
    setActionLoading(null)
  }

  const isConnected = (pid) => integrations.some(i => i.platform === pid)

  return (
    <ClientLayout>
      <div className="page-header fade-in">
        <div>
          <h1 className="page-title">Integraciones</h1>
          <p className="page-subtitle">
            Conecta tus fuentes de datos para unificar tus métricas de marketing en un solo lugar.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--gray-3)' }}>
          <div className="shimmer" style={{ width: 24, height: 24, borderRadius: '50%' }}></div>
          Cargando configuración...
        </div>
      ) : (
        <div className="grid-3 fade-in" style={{ marginTop: 8 }}>
          {PLATFORMS.map((plat, idx) => {
            const connected = isConnected(plat.id)
            const isProcessing = actionLoading === plat.id

            return (
              <div key={plat.id} className="card card-glass fade-in" style={{ 
                animationDelay: `${idx * 0.1}s`,
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: 56, height: 56, borderRadius: '16px', 
                    background: connected ? `${plat.color}20` : 'var(--white-2)',
                    border: `1px solid ${connected ? plat.color : 'var(--gray-1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                    boxShadow: connected ? `0 0 20px ${plat.color}30` : 'none',
                    transition: 'all 0.4s ease'
                  }}>
                    {plat.icon}
                  </div>
                  <div className={`badge ${connected ? 'badge-green' : ''}`} style={{ 
                    background: connected ? 'var(--success)' : 'transparent',
                    borderColor: connected ? 'var(--success)' : 'var(--gray-1)',
                    color: connected ? 'var(--black)' : 'var(--gray-3)'
                  }}>
                    {connected ? 'Activo' : 'Disponible'}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--black)', letterSpacing: '-0.02em' }}>
                    {plat.name}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--gray-3)', marginTop: 4, lineHeight: 1.4 }}>
                    Sincroniza campañas, anuncios y conversiones de {plat.name} automáticamente.
                  </p>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {connected ? (
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDisconnect(plat.id)}
                      disabled={isProcessing}
                      style={{ width: '100%', textTransform: 'none', letterSpacing: '0' }}
                    >
                      {isProcessing ? 'Desconectando...' : 'Gestionar Conexión'}
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleConnect(plat.id)}
                      disabled={isProcessing}
                      style={{ width: '100%', background: plat.color, borderColor: plat.color }}
                    >
                      {isProcessing ? 'Iniciando OAuth...' : 'Conectar Cuenta'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ClientLayout>
  )
}
