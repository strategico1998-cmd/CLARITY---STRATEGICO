import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { AdminLayout } from '../../components/layout/Layout'

const PLAN_LIMITS = {
  free:   { sites: 1,  sessions: 1000,  events: 10000 },
  pro:    { sites: 5,  sessions: 50000, events: 500000 },
  agency: { sites: -1, sessions: -1,    events: -1 },
}

export default function AdminMonitoring() {
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data: clientsData } = await supabase
      .from('clients')
      .select(`
        id, nombre, plan, estado,
        sites(id, dominio,
          sessions(id,
            events(id)
          )
        )
      `)
      .order('nombre')

    // Calculate usage per client
    const enriched = (clientsData ?? []).map(c => {
      const sitesCount    = c.sites?.length ?? 0
      const sessionsCount = c.sites?.reduce((acc, s) => acc + (s.sessions?.length ?? 0), 0) ?? 0
      const eventsCount   = c.sites?.reduce((acc, s) =>
        acc + s.sessions?.reduce((a2, sess) => a2 + (sess.events?.length ?? 0), 0), 0) ?? 0

      const limits = PLAN_LIMITS[c.plan] ?? PLAN_LIMITS.free
      return { ...c, sitesCount, sessionsCount, eventsCount, limits }
    })

    setClients(enriched)
    setLoading(false)
  }

  function usagePct(current, limit) {
    if (limit === -1) return 0
    return Math.min((current / limit) * 100, 100)
  }

  function usageColor(pct) {
    if (pct >= 90) return 'var(--red)'
    if (pct >= 70) return 'var(--yellow)'
    return 'var(--green)'
  }

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Monitoreo</h1>
          <p className="page-subtitle">Uso de recursos por cliente</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}>Actualizar</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="loading-spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : clients.length === 0 ? (
        <div className="empty-state">
          <p>No hay clientes para monitorear</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {clients.map(c => {
            const sessionPct = usagePct(c.sessionsCount, c.limits.sessions)
            const eventPct   = usagePct(c.eventsCount, c.limits.events)
            const sitePct    = usagePct(c.sitesCount, c.limits.sites)

            return (
              <div key={c.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 'var(--radius-md)',
                      background: 'var(--white-2)', border: '1px solid var(--gray-1)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontWeight: 800, color: 'var(--black)'
                    }}>
                      {c.nombre?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{c.nombre}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <span className={`badge badge-${c.plan === 'free' ? 'gray' : c.plan === 'pro' ? 'blue' : 'yellow'}`}>{c.plan}</span>
                        <span className={`badge ${c.estado === 'active' ? 'badge-green' : 'badge-red'}`}>{c.estado}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 24, textAlign: 'right' }}>
                    {[
                      { label: 'Sitios', val: c.sitesCount },
                      { label: 'Sesiones', val: c.sessionsCount.toLocaleString() },
                      { label: 'Eventos', val: c.eventsCount.toLocaleString() },
                    ].map(m => (
                      <div key={m.label}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--black)' }}>{m.val}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-3)', textTransform: 'uppercase', letterSpacing: 1 }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Usage bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Sitios', current: c.sitesCount, limit: c.limits.sites, pct: sitePct },
                    { label: 'Sesiones', current: c.sessionsCount, limit: c.limits.sessions, pct: sessionPct },
                    { label: 'Eventos', current: c.eventsCount, limit: c.limits.events, pct: eventPct },
                  ].map(bar => (
                    <div key={bar.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                        <span style={{ color: 'var(--gray-3)', fontWeight: 500 }}>{bar.label}</span>
                        <span style={{ color: 'var(--black)', fontWeight: 700 }}>
                          {bar.limit === -1 ? `${bar.current.toLocaleString()} / ∞` : `${bar.current.toLocaleString()} / ${bar.limit.toLocaleString()}`}
                          {bar.limit !== -1 && ` (${Math.round(bar.pct)}%)`}
                        </span>
                      </div>
                      {bar.limit !== -1 && (
                        <div className="progress-bar" style={{ background: 'var(--white-2)', height: 8, borderRadius: 10, overflow: 'hidden' }}>
                          <div className="progress-fill" style={{ width: `${bar.pct}%`, background: 'var(--black)', height: '100%', borderRadius: 10 }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminLayout>
  )
}
