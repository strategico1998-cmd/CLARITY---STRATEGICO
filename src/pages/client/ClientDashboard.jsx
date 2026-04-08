import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import { IconMonitoring, IconRefresh, IconWeb } from '../../components/icons/Icons.jsx'

/* ── Inline Icons ── */
const IconUser     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IconClock    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IconBounce   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
const IconRage     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15h8M9 9h.01M15 9h.01"/></svg>
const IconDead     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M12 14v4M8 20h8"/></svg>
const IconScroll   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 6 12 2 16 6"/><line x1="12" y1="2" x2="12" y2="20"/><polyline points="8 18 12 22 16 18"/></svg>
const IconArrowUp  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
const IconArrowDn  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
const IconError    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const IconGlobe    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
const IconFilter   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
const IconDesktop  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
const IconMobile   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>

/* ── Date range labels ── */
const ranges = ['Hoy', '7 días', '30 días', '90 días']

/* ── Mock JS errors ── */
const mockErrors = [
  { message: "TypeError: Cannot read properties of undefined (reading 'map')", count: 14, url: '/productos' },
  { message: "ReferenceError: supabase is not defined", count: 7, url: '/dashboard' },
  { message: "NetworkError: Failed to fetch", count: 3, url: '/api/data' },
]

export default function ClientDashboard() {
  const { user } = useAuth()
  const [sites,       setSites]       = useState([])
  const [stats,       setStats]       = useState({ users: 0, sessions: 0, avgTime: 0, bounceRate: 0, pagesPerSession: 0, scrollDepth: 0, rageclicks: 0, deadclicks: 0, quickbacks: 0 })
  const [chart,       setChart]       = useState([])
  const [topPages,    setTopPages]    = useState([])
  const [sources,     setSources]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [selectedSite,setSelectedSite]= useState(null)
  const [dateRange,   setDateRange]   = useState('7 días')
  const [isLive,      setIsLive]      = useState(false)

  const deviceData = useMemo(() => [
    { name: 'Desktop', value: 58, color: '#000000' },
    { name: 'Mobile',  value: 33, color: '#555555' },
    { name: 'Tablet',  value: 9,  color: '#cccccc' },
  ], [])

  const osData = useMemo(() => [
    { name: 'Windows', value: 41, color: '#222' },
    { name: 'iOS',     value: 27, color: '#444' },
    { name: 'Android', value: 20, color: '#666' },
    { name: 'macOS',   value: 12, color: '#999' },
  ], [])

  useEffect(() => {
    if (user) fetchAll()
    let channel
    if (user && selectedSite) {
      channel = supabase
        .channel(`rt-dash-${selectedSite}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions', filter: `site_id=eq.${selectedSite}` }, () => { fetchAll(); triggerLive() })
        .subscribe()
    }
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [user, selectedSite])

  function triggerLive() { setIsLive(true); setTimeout(() => setIsLive(false), 3000) }

  async function fetchAll() {
    setLoading(true)
    const { data: client } = await supabase.from('clients').select('id').eq('id', user.id).single()
    if (!client) { setLoading(false); return }

    const { data: sitesData } = await supabase.from('sites').select('id, dominio').eq('client_id', client.id)
    setSites(sitesData ?? [])
    const siteId = selectedSite ?? sitesData?.[0]?.id
    if (!siteId) { setLoading(false); return }

    const { data: sessions } = await supabase.from('sessions').select('id, start_time, end_time, user_id, device').eq('site_id', siteId)
    const totalSessions = sessions?.length ?? 0
    const uniqueUsers   = new Set(sessions?.map(s => s.user_id)).size
    const avgTime       = sessions?.reduce((a, s) => {
      if (!s.end_time || !s.start_time) return a
      return a + (new Date(s.end_time) - new Date(s.start_time))
    }, 0) / (totalSessions || 1) / 1000

    const sessionIds = sessions?.map(s => s.id) ?? []
    let events = []
    if (sessionIds.length > 0) {
      const { data } = await supabase.from('events').select('id, session_id, event_type, metadata').in('session_id', sessionIds)
      events = data ?? []
    }

    // Bounce rate
    const evMap = {}
    events.forEach(e => { evMap[e.session_id] = (evMap[e.session_id] ?? 0) + 1 })
    const bounced    = Object.values(evMap).filter(n => n <= 1).length
    const bounceRate = totalSessions > 0 ? Math.round((bounced / totalSessions) * 100) : 0

    // Quick backs
    const quickbacks = sessions?.filter(s => {
      if (!s.end_time || !s.start_time) return false
      return (new Date(s.end_time) - new Date(s.start_time)) < 10000
    }).length ?? 0

    // Rage clicks (3+ clicks on same target in session)
    const clicks = events.filter(e => e.event_type === 'click')
    const rageMap = {}
    clicks.forEach(c => {
      const k = `${c.session_id}::${c.metadata?.target ?? 'x'}`
      rageMap[k] = (rageMap[k] ?? 0) + 1
    })
    const rageclicks = Object.values(rageMap).filter(v => v >= 3).length

    // Dead clicks (clicks with no navigation)
    const deadclicks = clicks.filter(c => !c.metadata?.href && !c.metadata?.url).length

    // Top pages
    const pvs = events.filter(e => e.event_type === 'pageview')
    const pgMap = {}
    pvs.forEach(e => { const u = e.metadata?.url ?? '/'; pgMap[u] = (pgMap[u] ?? 0) + 1 })
    const top = Object.entries(pgMap).sort((a,b) => b[1] - a[1]).slice(0,6).map(([url, cnt]) => ({
      url, sessions: cnt, scrollDepth: Math.floor(Math.random() * 60) + 30
    }))
    setTopPages(top.length ? top : [{ url: '/inicio', sessions: 42, scrollDepth: 71 }, { url: '/servicios', sessions: 28, scrollDepth: 54 }, { url: '/contacto', sessions: 19, scrollDepth: 88 }])

    // Traffic sources mock
    setSources([
      { source: 'Búsqueda orgánica', sessions: Math.max(20, Math.floor(totalSessions * 0.42)), pct: 42 },
      { source: 'Directo', sessions: Math.max(8, Math.floor(totalSessions * 0.28)), pct: 28 },
      { source: 'Referido', sessions: Math.max(5, Math.floor(totalSessions * 0.18)), pct: 18 },
      { source: 'Email', sessions: Math.max(2, Math.floor(totalSessions * 0.08)), pct: 8 },
      { source: 'Social', sessions: Math.max(1, Math.floor(totalSessions * 0.04)), pct: 4 },
    ])

    setStats({
      users: uniqueUsers,
      sessions: totalSessions,
      avgTime: Math.round(avgTime),
      bounceRate,
      pagesPerSession: totalSessions > 0 ? (events.length / totalSessions).toFixed(1) : 0,
      scrollDepth: 62,
      rageclicks,
      deadclicks,
      quickbacks,
    })

    // Chart (7 days)
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const dayStr = d.toISOString().split('T')[0]
      const daySess = sessions?.filter(s => s.start_time?.startsWith(dayStr))
      return {
        day: d.toLocaleDateString('es', { weekday: 'short' }),
        sesiones: daySess?.length ?? 0,
        usuarios: new Set(daySess?.map(s => s.user_id)).size,
      }
    })
    setChart(days)
    setLoading(false)
  }

  async function simulateVisit() {
    if (!selectedSite) return
    const { data: session } = await supabase.from('sessions').insert({
      site_id: selectedSite,
      user_id: `demo-${Math.floor(Math.random() * 9999)}`,
      device: ['Desktop','Mobile','Tablet'][Math.floor(Math.random() * 3)],
      country: ['CO','MX','ES','US','AR'][Math.floor(Math.random() * 5)],
      start_time: new Date().toISOString()
    }).select().single()
    if (session) {
      await supabase.from('events').insert([
        { session_id: session.id, site_id: selectedSite, event_type: 'pageview', timestamp: new Date().toISOString(), metadata: { url: '/inicio' } },
        { session_id: session.id, site_id: selectedSite, event_type: 'click',    timestamp: new Date().toISOString(), metadata: { target: 'CTA button' } },
      ])
    }
    triggerLive()
    await fetchAll()
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#fff', border: '1.5px solid #eee', borderRadius: 10, padding: '10px 16px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
        <p style={{ color: '#999', marginBottom: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color, fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
            <span style={{ fontWeight: 500, color: '#555' }}>{p.name}</span>
            <strong style={{ color: '#000' }}>{p.value.toLocaleString()}</strong>
          </p>
        ))}
      </div>
    )
  }

  return (
    <ClientLayout>
      {/* ── Header ── */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            Dashboard
            {isLive && <span className="live-badge"><span className="live-dot pulse" />Live</span>}
          </h1>
          <p className="page-subtitle">Análisis de comportamiento de usuarios — {sites.find(s => s.id === selectedSite)?.dominio ?? 'Todos los sitios'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Date range */}
          <div className="tab-group">
            {ranges.map(r => (
              <button key={r} className={`tab-btn ${dateRange === r ? 'active' : ''}`} onClick={() => setDateRange(r)}>{r}</button>
            ))}
          </div>
          {/* Site filter */}
          {sites.length > 0 && (
            <div className="filter-bar" style={{ padding: '6px 14px' }}>
              <IconGlobe />
              <select
                style={{ border: 'none', background: 'transparent', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, color: 'var(--black)', outline: 'none', cursor: 'pointer', padding: 0 }}
                value={selectedSite ?? ''}
                onChange={e => setSelectedSite(e.target.value)}
              >
                {sites.map(s => <option key={s.id} value={s.id}>{s.dominio}</option>)}
              </select>
            </div>
          )}
          {/* Simulate */}
          <button className="btn btn-secondary btn-sm" onClick={simulateVisit} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconRefresh /> Demo
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="loading-spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : sites.length === 0 ? (
        <div className="card" style={{ padding: 0 }}>
          <div className="empty-state">
            <div className="empty-icon"><IconWeb /></div>
            <p className="empty-title">No hay sitios registrados</p>
            <p className="empty-sub">Conecta tu primer sitio para comenzar el análisis.</p>
          </div>
        </div>
      ) : (
        <div className="fade-in">

          {/* ── Row 1: KPI Cards ── */}
          <div className="section">
            <p className="section-title">Métricas de Sesión</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              {[
                { label: 'Sesiones', value: stats.sessions.toLocaleString(), icon: <IconMonitoring />, change: '+23%', dir: 'up' },
                { label: 'Usuarios únicos', value: stats.users.toLocaleString(), icon: <IconUser />, change: '+18%', dir: 'up' },
                { label: 'Tiempo activo', value: `${stats.avgTime}s`, icon: <IconClock />, change: '-5%', dir: 'down' },
                { label: 'Bounce rate', value: `${stats.bounceRate}%`, icon: <IconBounce />, change: '-3%', dir: 'up' },
                { label: 'Págs / sesión', value: stats.pagesPerSession, icon: <IconWeb />, change: '+0.4', dir: 'up' },
                { label: 'Profund. Scroll', value: `${stats.scrollDepth}%`, icon: <IconScroll />, change: '+8%', dir: 'up' },
              ].map(k => (
                <div key={k.label} className="stat-card">
                  <div className="stat-icon">{k.icon}</div>
                  <div className="stat-value">{k.value}</div>
                  <div className="stat-label">{k.label}</div>
                  <div className={`stat-change ${k.dir}`}>
                    {k.dir === 'up' ? <IconArrowUp /> : <IconArrowDn />}
                    {k.change} vs anterior
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Row 2: UX Problem Signals (RED) ── */}
          <div className="section">
            <p className="section-title">Señales de Problemas UX</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {[
                { label: 'Rage Clicks', value: stats.rageclicks, icon: <IconRage />, desc: 'Sesiones con frustración', note: 'Clics repetidos en un área sin respuesta' },
                { label: 'Dead Clicks', value: stats.deadclicks, icon: <IconDead />, desc: 'Elementos no interactivos', note: 'Clics en áreas sin acción asignada' },
                { label: 'Retrocesos rápidos', value: stats.quickbacks, icon: <IconBounce />, desc: 'Salidas en menos de 10s', note: 'El usuario no encontró lo que buscaba' },
              ].map(k => (
                <div key={k.label} className="stat-card critical" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: '100%', background: 'var(--red)', borderRadius: '0 14px 14px 0' }} />
                  <div className="stat-icon">{k.icon}</div>
                  <div className="stat-value">{k.value}</div>
                  <div className="stat-label">{k.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6, fontWeight: 500, opacity: 0.8 }}>{k.desc}</div>
                  <div style={{ fontSize: 10, color: 'var(--gray-3)', marginTop: 4, lineHeight: 1.4 }}>{k.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Row 3: Gráfico sesiones + Donuts ── */}
          <div className="section">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
              {/* Area Chart */}
              <div className="card card-flat">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray-3)' }}>Sesiones por día</p>
                    <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--black)', marginTop: 4 }}>{stats.sessions.toLocaleString()}</p>
                  </div>
                  <span className="badge badge-green">Esta semana</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#000000" stopOpacity={0.08} />
                        <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" vertical={false} />
                    <XAxis dataKey="day" stroke="#ccc" fontSize={10} axisLine={false} tickLine={false} dy={8} />
                    <YAxis stroke="#ccc" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#eee', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="sesiones" stroke="#000" fill="url(#grad1)" strokeWidth={2.5} name="Sesiones"
                      dot={{ r: 3, fill: '#fff', stroke: '#000', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                    <Area type="monotone" dataKey="usuarios" stroke="#E53935" fill="url(#grad1)" strokeWidth={2} name="Usuarios"
                      dot={{ r: 3, fill: '#fff', stroke: '#E53935', strokeWidth: 2 }} activeDot={{ r: 5 }} strokeDasharray="5 3" />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 20, marginTop: 16, justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--gray-4)', fontWeight: 600 }}>
                    <span style={{ width: 16, height: 2.5, background: '#000', borderRadius: 2, display: 'block' }} /> Sesiones
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--gray-4)', fontWeight: 600 }}>
                    <span style={{ width: 16, height: 2, background: '#E53935', borderRadius: 2, display: 'block', borderBottom: '2px dashed #E53935' }} /> Usuarios
                  </div>
                </div>
              </div>

              {/* Donuts panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Devices */}
                <div className="card card-flat" style={{ padding: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray-3)', marginBottom: 16 }}>Dispositivos</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <PieChart width={90} height={90}>
                      <Pie data={deviceData} cx={40} cy={40} innerRadius={28} outerRadius={42} dataKey="value" strokeWidth={0}>
                        {deviceData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                    <div style={{ flex: 1 }}>
                      {deviceData.map(d => (
                        <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: 'block', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'var(--gray-4)' }}>{d.name}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--black)' }}>{d.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* OS */}
                <div className="card card-flat" style={{ padding: 20, flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray-3)', marginBottom: 12 }}>Sistema Operativo</p>
                  {osData.map(d => (
                    <div key={d.name} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--gray-4)', fontWeight: 600 }}>{d.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--black)' }}>{d.value}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${d.value}%`, background: d.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 4: Top Páginas + Fuentes ── */}
          <div className="section">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Top Pages */}
              <div className="card card-flat" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1.5px solid var(--gray-1)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray-3)' }}>Páginas más visitadas</p>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>URL</th>
                      <th style={{ textAlign: 'right' }}>Sesiones</th>
                      <th style={{ textAlign: 'right' }}>Scroll %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPages.map((p, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--white-2)', border: '1px solid var(--gray-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--gray-3)', flexShrink: 0 }}>{i+1}</span>
                            <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--black)' }}>{p.url}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{p.sessions}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                            <div style={{ width: 40, height: 4, background: 'var(--gray-1)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${p.scrollDepth}%`, background: p.scrollDepth > 70 ? '#000' : '#aaa', transition: 'width 0.5s' }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: p.scrollDepth > 70 ? 'var(--black)' : 'var(--gray-3)' }}>{p.scrollDepth}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Traffic Sources */}
              <div className="card card-flat" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1.5px solid var(--gray-1)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray-3)' }}>Fuentes de tráfico</p>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {sources.map((s, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{s.source}</span>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--gray-3)' }}>{s.sessions} sesiones</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--black)' }}>{s.pct}%</span>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 5: Errores JS ── */}
          <div className="section">
            <div className="card card-flat" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1.5px solid var(--gray-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}>
                    <IconError />
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray-3)' }}>Errores de JavaScript detectados</p>
                </div>
                <span className="badge badge-red">{mockErrors.length} activos</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Mensaje de error</th>
                    <th style={{ textAlign: 'right' }}>URL</th>
                    <th style={{ textAlign: 'right' }}>Ocurrencias</th>
                  </tr>
                </thead>
                <tbody>
                  {mockErrors.map((err, i) => (
                    <tr key={i}>
                      <td>
                        <code style={{ fontSize: 12, color: 'var(--red)', background: 'var(--red-light)', padding: '3px 8px', borderRadius: 6, fontFamily: 'monospace', display: 'inline-block', maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {err.message}
                        </code>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 12, fontFamily: 'monospace', color: 'var(--gray-4)' }}>{err.url}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)' }}>{err.count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </ClientLayout>
  )
}
