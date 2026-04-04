import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase.js'
import { AdminLayout } from '../../components/layout/Layout.jsx'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { 
  IconClients, IconWeb, IconMonitoring, IconPlans, IconRefresh 
} from '../../components/icons/Icons.jsx'

export default function AdminDashboard() {
  const [stats, setStats]   = useState({ clients: 0, sites: 0, sessions: 0, events: 0 })
  const [growth, setGrowth] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Novedad: Filtrado por cliente
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('all')

  useEffect(() => {
    fetchBaseData()
  }, [])

  useEffect(() => {
    fetchStats()
  }, [selectedClientId])

  async function fetchBaseData() {
    const { data } = await supabase.from('clients').select('id, nombre').order('nombre', { ascending: true })
    if (data) setClients(data)
  }

  async function fetchStats() {
    setLoading(true)

    // Si miramos a uno en especifico, no buscamos en toda la tabla
    const isGlobal = selectedClientId === 'all'

    if (isGlobal) {
      const [
        { count: clientsCount },
        { count: sitesCount },
        { count: sessionsCount },
        { count: eventsCount },
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('sites').select('*', { count: 'exact', head: true }),
        supabase.from('sessions').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
      ])
      setStats({ clients: clientsCount ?? 0, sites: sitesCount ?? 0, sessions: sessionsCount ?? 0, events: eventsCount ?? 0 })
    } else {
      // Data para un solo client_id
      const { data: sData } = await supabase.from('sites').select('id').eq('client_id', selectedClientId)
      const siteIds = sData?.map(s => s.id) ?? []

      if (siteIds.length === 0) {
        setStats({ clients: 1, sites: 0, sessions: 0, events: 0 })
      } else {
        const [
          { count: sessionsCount },
          { count: eventsCount },
        ] = await Promise.all([
          supabase.from('sessions').select('id', { count: 'exact', head: true }).in('site_id', siteIds),
          // para optimizar, si eventos tuviera un array muy grande in('session_id') fallaría, 
          // usaremos una aproximación simple si es MVP, o consultamos filtrando las sessions.
          // Para no hacer un query masivo en IN vamos directo a events filtrando localmente o ignorando la cuenta exacta de eventos si la db crece,
          // pero Supabase aguanta unos miles de UUIDS en 'in'. 
          supabase.from('events').select('id', { count: 'exact', head: true }) 
          // nota: en DB events no tiene site_id, solo session_id, asi que el count de eventos reales de un cliente requiere saber sus sessions.
          // Por simplicidad calcularemos sumando.
        ])
        
        // Count events manual with a sub-query match locally
        const { data: sessData } = await supabase.from('sessions').select('id').in('site_id', siteIds)
        const sIds = sessData?.map(s => s.id) ?? []
        
        let exactEvents = 0
        if (sIds.length > 0 && sIds.length < 500) {
           const { count } = await supabase.from('events').select('id', { count: 'exact', head: true }).in('session_id', sIds)
           exactEvents = count ?? 0
        }

        setStats({ clients: 1, sites: siteIds.length, sessions: sessionsCount ?? 0, events: exactEvents })
      }
    }

    // Build growth chart from last 7 days mock (replace with real query)
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return {
        day: d.toLocaleDateString('es', { weekday: 'short' }),
        sessions: Math.floor(Math.random() * 500 + 100),
        events: Math.floor(Math.random() * 2000 + 300),
      }
    })
    setGrowth(days)
    setLoading(false)
  }

  const statCards = [
    { label: 'Clientes', value: stats.clients, icon: <IconClients />, change: '+12%' },
    { label: 'Sitios',   value: stats.sites,   icon: <IconWeb />, change: '+8%' },
    { label: 'Sesiones', value: stats.sessions, icon: <IconMonitoring />, change: '+23%' },
    { label: 'Eventos',  value: stats.events,  icon: <IconPlans />, change: '+31%' },
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="card card-sm" style={{ minWidth: 160, backgroundColor: 'var(--white)', borderColor: 'var(--gray-1)', boxShadow: 'var(--shadow-lg)' }}>
        <p style={{ color: 'var(--black)', marginBottom: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color, fontSize: 13, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 500 }}>{p.name}:</span> <strong style={{ color: 'var(--black)' }}>{p.value.toLocaleString()}</strong>
          </p>
        ))}
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="page-header" style={{ marginBottom: 24, borderBottom: '1px solid var(--gray-1)', paddingBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Panel de Control</h1>
            <p className="page-subtitle">Métricas globales y por cliente del ecosistema Strategic</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--white)', padding: '6px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-1)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-4)', textTransform: 'uppercase', letterSpacing: 1 }}>👤 Analizar Cliente:</span>
              <select 
                style={{ background: 'transparent', border: 'none', color: 'var(--black)', fontWeight: 600, fontSize: 13, outline: 'none', cursor: 'pointer' }}
                value={selectedClientId} 
                onChange={e => setSelectedClientId(e.target.value)}
              >
                <option value="all">Global (Todos)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={fetchStats} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <IconRefresh />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4 section">
        {statCards.map(card => (
          <div key={card.label} className="stat-card">
            <div className="stat-icon">
              {card.icon}
            </div>
            <div>
              <div className="stat-value">
                {loading ? <span className="loading-spinner" /> : card.value.toLocaleString()}
              </div>
              <div className="stat-label">{card.label}</div>
            </div>
            <div className="stat-change up">
              {card.change} Incremento
            </div>
          </div>
        ))}
      </div>

      {/* Growth Chart */}
      <div className="card section">
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconMonitoring /> Crecimiento Semanal
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={growth} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="sessionsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#000000" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#000000" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="eventsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#888888" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#888888" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-1)" vertical={false} />
            <XAxis dataKey="day" stroke="var(--gray-3)" fontSize={10} axisLine={false} tickLine={false} dy={10} />
            <YAxis stroke="var(--gray-3)" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--gray-2)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="sessions" stroke="#000000" fill="url(#sessionsGrad)" strokeWidth={3} name="Sesiones" dot={false} activeDot={{ r: 6, fill: '#000000' }} />
            <Area type="monotone" dataKey="events" stroke="#888888" fill="url(#eventsGrad)" strokeWidth={3} name="Eventos" dot={false} activeDot={{ r: 6, fill: '#888888' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick actions */}
      <div className="grid-3">
        {[
          { label: 'Nuevo cliente', icon: <IconClients />, href: '/admin/clients' },
          { label: 'Ver monitoreo', icon: <IconMonitoring />, href: '/admin/monitoring' },
          { label: 'Gestionar planes', icon: <IconPlans />, href: '/admin/plans' },
        ].map(a => (
          <a key={a.label} href={a.href} className="card" 
             style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', textDecoration: 'none' }}>
            <div style={{ color: 'var(--black)', opacity: 0.6 }}>{a.icon}</div>
            <span style={{ fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--black)' }}>{a.label}</span>
          </a>
        ))}
      </div>
    </AdminLayout>
  )
}
