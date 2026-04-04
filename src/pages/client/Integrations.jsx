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
      <div className="page-header" style={{ marginBottom: 32, borderBottom: '1px solid var(--black-4)', paddingBottom: 24 }}>
        <div>
          <h1 className="page-title">Integraciones</h1>
          <p className="page-subtitle" style={{ color: 'var(--gray-3)', marginTop: 8 }}>
            Conecta tus fuentes de datos para unificar tus métricas de marketing.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--gray-3)', fontSize: 14 }}>Cargando integraciones...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {PLATFORMS.map(plat => {
            const connected = isConnected(plat.id)
            const isProcessing = actionLoading === plat.id

            return (
              <div key={plat.id} className="card" style={{ 
                background: 'var(--black-2)', 
                border: '1px solid var(--black-4)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ 
                    width: 48, height: 48, borderRadius: '12px', 
                    background: connected ? `${plat.color}15` : 'var(--black-3)',
                    border: `1px solid ${connected ? plat.color : 'var(--black-4)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24
                  }}>
                    {plat.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--white)' }}>{plat.name}</h3>
                    <p style={{ fontSize: 13, color: connected ? 'var(--green)' : 'var(--gray-4)', marginTop: 4, fontWeight: connected ? 600 : 400 }}>
                      {connected ? '● Conectado' : '○ No conectado'}
                    </p>
                  </div>
                </div>

                <div style={{ flex: 1 }}></div>

                {connected ? (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleDisconnect(plat.id)}
                    disabled={isProcessing}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    {isProcessing ? 'Desconectando...' : 'Desconectar'}
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleConnect(plat.id)}
                    disabled={isProcessing}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    {isProcessing ? 'Conectando...' : 'Conectar Cuenta'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </ClientLayout>
  )
}
