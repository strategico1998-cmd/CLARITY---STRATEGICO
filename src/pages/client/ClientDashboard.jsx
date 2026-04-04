import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { 
  IconMonitoring, IconRefresh, IconWeb 
} from '../../components/icons/Icons.jsx'

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);
const IconTime = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);
const IconBounce = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path></svg>
);
const IconPage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);

export default function ClientDashboard() {
  const { user } = useAuth()
  const [sites, setSites]   = useState([])
  const [stats, setStats]   = useState({ users: 0, sessions: 0, avgTime: 0, bounceRate: 0, pagesPerSession: 0 })
  const [chart, setChart]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSite, setSelectedSite] = useState(null)

  useEffect(() => {
    if (user) fetchAll()

    // Realtime subscription
    let channel;
    if (user && selectedSite) {
      channel = supabase
        .channel(`realtime-dashboard-${selectedSite}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'sessions',
          filter: `site_id=eq.${selectedSite}`
        }, (payload) => {
          console.log('New session detected!', payload)
          // Refrescar datos suavemente
          fetchAll()
          showPulse()
        })
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'events',
          filter: `site_id=eq.${selectedSite}`
        }, () => {
          fetchAll()
          showPulse()
        })
        .subscribe()
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [user, selectedSite])

  const [isLive, setIsLive] = useState(false)
  
  function showPulse() {
    setIsLive(true)
    setTimeout(() => setIsLive(false), 2000)
  }

  async function fetchAll() {
    setLoading(true)

    // Get client record
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!client) { setLoading(false); return }

    // Get sites
    const { data: sitesData } = await supabase
      .from('sites')
      .select('id, dominio')
      .eq('client_id', client.id)

    setSites(sitesData ?? [])
    const siteId = selectedSite ?? sitesData?.[0]?.id
    if (!siteId) { setLoading(false); return }

    // Get sessions
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, start_time, end_time, user_id')
      .eq('site_id', siteId)

    const totalSessions  = sessions?.length ?? 0
    const uniqueUsers    = new Set(sessions?.map(s => s.user_id)).size
    const avgTime        = sessions?.reduce((acc, s) => {
      if (!s.end_time || !s.start_time) return acc
      return acc + (new Date(s.end_time) - new Date(s.start_time))
    }, 0) / (totalSessions || 1) / 1000

    // Get events
    const sessionIds = sessions?.map(s => s.id) ?? []
    let events = []
    if (sessionIds.length > 0) {
      const { data } = await supabase
        .from('events')
        .select('id, session_id, event_type')
        .in('session_id', sessionIds)
      events = data ?? []
    }

    // Bounce rate = sessions with only 1 event
    const eventsPerSession = {}
    events.forEach(e => {
      eventsPerSession[e.session_id] = (eventsPerSession[e.session_id] ?? 0) + 1
    })
    const bounced = Object.values(eventsPerSession).filter(n => n <= 1).length
    const bounceRate = totalSessions > 0 ? Math.round((bounced / totalSessions) * 100) : 0

    setStats({
      users: uniqueUsers,
      sessions: totalSessions,
      avgTime: Math.round(avgTime),
      bounceRate,
      pagesPerSession: totalSessions > 0 ? (events.length / totalSessions).toFixed(1) : 0,
    })

    // Chart: last 7 days
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const dayStr = d.toISOString().split('T')[0]
      const daySessions = sessions?.filter(s => s.start_time?.startsWith(dayStr))
      return {
        day: d.toLocaleDateString('es', { weekday: 'short' }),
        sesiones: daySessions?.length ?? 0,
        usuarios: new Set(daySessions?.map(s => s.user_id)).size ?? 0,
      }
    })
    setChart(days)
    setLoading(false)
  }

  // BOTÓN DE SIMULACIÓN (MODO DEMO)
  async function simulateVisit() {
    if (!selectedSite) return;
    
    // 1. Crear sesión ficticia
    const { data: session } = await supabase
      .from('sessions')
      .insert({
        site_id: selectedSite,
        user_id: `demo-${Math.floor(Math.random() * 1000)}`,
        device: ['Desktop', 'Mobile', 'Tablet'][Math.floor(Math.random() * 3)],
        country: ['ES', 'MX', 'CO', 'US'][Math.floor(Math.random() * 4)],
        start_time: new Date().toISOString()
      })
      .select()
      .single()

    if (session) {
      // 2. Crear eventos (pageview + clicks)
      const events = [
        { session_id: session.id, site_id: selectedSite, event_type: 'pageview', timestamp: new Date().toISOString() },
        { session_id: session.id, site_id: selectedSite, event_type: 'click', timestamp: new Date().toISOString(), metadata: { target: 'Boton Demo' } }
      ]
      await supabase.from('events').insert(events)
    }
    
    // fetchAll() se llamará automáticamente vía Realtime subscription
  }

  const kpis = [
    { label: 'Usuarios únicos',   value: stats.users,           icon: <IconUser />, change: '+18%' },
    { label: 'Sesiones',          value: stats.sessions,        icon: <IconMonitoring />, change: '+23%' },
    { label: 'Tiempo promedio',   value: `${stats.avgTime}s`,   icon: <IconTime />, change: '-5%' },
    { label: 'Bounce rate',       value: `${stats.bounceRate}%`,icon: <IconBounce />, change: '-3%' },
    { label: 'Páginas / sesión',  value: stats.pagesPerSession, icon: <IconPage />, change: '+0.4' },
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ minWidth: 160, background: 'var(--black)', border: '1px solid var(--black-4)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
        <p style={{ color: 'var(--gray-4)', marginBottom: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color, fontSize: 13, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 500, color: 'var(--gray-2)' }}>{p.name}:</span> <strong style={{ color: 'var(--white)' }}>{p.value.toLocaleString()}</strong>
          </p>
        ))}
      </div>
    )
  }

  return (
    <ClientLayout>
      <div className="page-header" style={{ marginBottom: 32, borderBottom: '1px solid var(--black-4)', paddingBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 28, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 12 }}>
              Dashboard
              {isLive && (
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 6, 
                  fontSize: 10, 
                  fontWeight: 800, 
                  color: '#10b981', 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  padding: '4px 8px', 
                  borderRadius: 20,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  animation: 'pulse 2s infinite'
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span>
                  Live
                </span>
              )}
            </h1>
            <p className="page-subtitle" style={{ color: 'var(--gray-3)', marginTop: 4 }}>Análisis de comportamiento de tus usuarios</p>
          </div>
          
          <button 
            onClick={simulateVisit}
            style={{
              marginLeft: 'auto',
              background: 'var(--white)',
              color: 'var(--black)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.9'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            <IconRefresh /> Simular Tráfico
          </button>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--black-3)', padding: '6px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--black-4)', marginTop: 24 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-4)', textTransform: 'uppercase', letterSpacing: 1 }}>🌐 Filtrar por sitio:</span>
          {sites.length > 0 ? (
            <select
              style={{ background: 'transparent', border: 'none', color: 'var(--white)', fontWeight: 600, fontSize: 14, outline: 'none', cursor: 'pointer', padding: '4px 0' }}
              value={selectedSite ?? ''}
              onChange={e => { setSelectedSite(e.target.value); setTimeout(fetchAll, 100) }}
            >
              {sites.map(s => <option key={s.id} value={s.id}>{s.dominio}</option>)}
            </select>

          ) : (
            <span style={{ fontSize: 13, color: 'var(--gray-3)' }}>Sin sitios enlazados</span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 100, display: 'flex', justifyContent: 'center' }}>
          <div className="loading-spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : sites.length === 0 ? (
        <div className="empty-state" style={{ padding: 80, border: '1px dashed var(--black-4)', background: 'var(--black-2)', textAlign: 'center' }}>
          <div className="empty-icon" style={{ opacity: 0.2, marginBottom: 24 }}><IconWeb /></div>
          <h3 style={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 16 }}>No hay sitios registrados</h3>
          <p style={{ color: 'var(--gray-3)', marginTop: 8, fontSize: 14, marginBottom: 32 }}>Crea tu primer sitio para empezar el análisis de comportamiento.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            {kpis.map(k => (
              <div key={k.label} className="card" style={{ padding: 20, background: 'var(--black-2)', border: '1px solid var(--black-4)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ padding: 8, background: 'var(--black-3)', borderRadius: 8, color: 'var(--gray-3)', border: '1px solid var(--black-4)' }}>
                    {k.icon}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-3)' }}>{k.label}</div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--white)' }}>
                  {loading ? <div className="loading-spinner" style={{ width: 24, height: 24 }} /> : k.value}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-4)', marginTop: 8 }}>
                  {k.change} vs periodo ant.
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, paddingBottom: 60 }}>
            {/* Area Chart */}
            <div className="card" style={{ padding: 24, background: 'var(--black-2)', border: '1px solid var(--black-4)' }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gray-4)', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
                <IconMonitoring /> SESIONES SEMANALES
              </h2>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--white)" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="var(--white)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--black-4)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--gray-4)" fontSize={12} fontWeight={600} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="var(--gray-4)" fontSize={12} fontWeight={600} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--black-4)', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="sesiones" stroke="var(--white)" fill="url(#grad1)" strokeWidth={3} name="Sesiones" dot={{ r: 4, fill: 'var(--black-2)', stroke: 'var(--white)', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'var(--white)' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="card" style={{ padding: 24, background: 'var(--black-2)', border: '1px solid var(--black-4)' }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gray-4)', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
                <IconUser /> USUARIOS ÚNICOS
              </h2>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--black-4)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--gray-4)" fontSize={12} fontWeight={600} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="var(--gray-4)" fontSize={12} fontWeight={600} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--black-3)' }} />
                    <Bar dataKey="usuarios" fill="var(--gray-2)" radius={[4,4,0,0]} name="Usuarios" barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </ClientLayout>
  )
}
