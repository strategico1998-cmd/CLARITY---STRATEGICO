import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'

const EVENT_TYPES = ['all', 'pageview', 'click', 'scroll', 'conversion']
const TYPE_COLORS = {
  pageview: 'badge-blue',
  click: 'badge-red',
  scroll: 'badge-gray',
  conversion: 'badge-green',
}

export default function Events() {
  const { user }    = useAuth()
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]   = useState('')
  const [siteId, setSiteId]   = useState(null)
  const [sites, setSites]     = useState([])

  useEffect(() => { if (user) fetchSites() }, [user])
  useEffect(() => { if (siteId) fetchEvents() }, [siteId, filter, dateFrom, dateTo])

  async function fetchSites() {
    const { data: c } = await supabase.from('clients').select('id').eq('id', user.id).single()
    if (!c) return
    const { data: s } = await supabase.from('sites').select('id, dominio').eq('client_id', c.id)
    setSites(s ?? [])
    if (s?.[0]) setSiteId(s[0].id)
  }

  async function fetchEvents() {
    setLoading(true)
    const { data: sessions } = await supabase.from('sessions').select('id').eq('site_id', siteId)
    const sids = sessions?.map(s => s.id) ?? []

    if (!sids.length) { setEvents([]); setLoading(false); return }

    let query = supabase
      .from('events')
      .select('id, event_type, timestamp, metadata, session_id')
      .in('session_id', sids)
      .order('timestamp', { ascending: false })
      .limit(200)

    if (filter !== 'all') query = query.eq('event_type', filter)
    if (dateFrom) query = query.gte('timestamp', dateFrom)
    if (dateTo)   query = query.lte('timestamp', dateTo + 'T23:59:59')

    const { data } = await query
    setEvents(data ?? [])
    setLoading(false)
  }

  function formatMeta(meta) {
    if (!meta) return '—'
    const parts = []
    if (meta.url) parts.push(`📄 ${meta.url}`)
    if (meta.x !== undefined) parts.push(`📍 (${meta.x}, ${meta.y})`)
    if (meta.scrollY !== undefined) parts.push(`📜 ${meta.scrollY}px`)
    if (meta.name) parts.push(`🎯 ${meta.name}`)
    return parts.join(' · ') || JSON.stringify(meta)
  }

  return (
    <ClientLayout>
      <div className="page-header" style={{ marginBottom: 32, borderBottom: '1px solid var(--black-4)', paddingBottom: 24 }}>
        <div>
          <h1 className="page-title">Historial de Eventos</h1>
          <p className="page-subtitle" style={{ color: 'var(--gray-3)', marginTop: 8 }}>
            Registro en tiempo real. Mostrando {events.length} interacciones cargadas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--black-3)', padding: '6px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--black-4)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-4)', textTransform: 'uppercase', letterSpacing: 1 }}>🌐 Filtrar por sitio:</span>
          {sites.length > 0 ? (
            <select 
              style={{ 
                background: 'transparent', border: 'none', color: 'var(--white)', 
                fontWeight: 600, fontSize: 14, outline: 'none', cursor: 'pointer', padding: '4px 0'
              }} 
              value={siteId ?? ''} 
              onChange={e => setSiteId(e.target.value)}
            >
              {sites.map(s => <option key={s.id} value={s.id}>{s.dominio}</option>)}
            </select>
          ) : (
             <span style={{ fontSize: 13, color: 'var(--gray-3)' }}>Sin sitios enlazados</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="tabs" style={{ margin: 0, padding: 4, background: 'var(--black-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--black-4)' }}>
          {EVENT_TYPES.map(t => (
            <button 
              key={t} 
              style={{ 
                border: 'none', background: filter === t ? 'var(--white)' : 'transparent',
                color: filter === t ? 'var(--black)' : 'var(--gray-3)',
                padding: '6px 16px', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s ease', fontSize: 13, textTransform: 'capitalize'
              }} 
              onClick={() => setFilter(t)}
            >
              {t === 'all' ? '🔍 Todos' : t}
            </button>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input 
            type="date" 
            value={dateFrom} 
            onChange={e => setDateFrom(e.target.value)} 
            style={{ width: 140, background: 'var(--black-2)', border: '1px solid var(--black-4)', color: 'var(--white)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: 13 }} 
          />
          <span style={{ color: 'var(--gray-4)', fontSize: 12 }}>hasta</span>
          <input 
            type="date" 
            value={dateTo} 
            onChange={e => setDateTo(e.target.value)} 
            style={{ width: 140, background: 'var(--black-2)', border: '1px solid var(--black-4)', color: 'var(--white)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: 13 }} 
          />
        </div>

        {(dateFrom || dateTo) && (
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', fontSize: 13 }} onClick={() => { setDateFrom(''); setDateTo('') }}>
            ✕ Limpiar Fechas
          </button>
        )}
      </div>

      {/* Events table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--black-2)', borderBottom: '1px solid var(--black-4)' }}>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--gray-4)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Tipo</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--gray-4)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Metadata</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--gray-4)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Sesión</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--gray-4)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 60 }}>
                  <div className="loading-spinner" style={{ margin: '0 auto', width: 24, height: 24 }} />
                </td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={4}>
                  <div className="empty-state" style={{ padding: 60, border: 'none' }}>
                    <div className="empty-icon" style={{ opacity: 0.2 }}>⚡</div>
                    <p style={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 16 }}>No hay eventos con estos filtros</p>
                  </div>
                </td></tr>
              ) : events.map(ev => (
                <tr key={ev.id} style={{ borderBottom: '1px solid var(--black-4)', transition: 'background 0.2s', ':hover': { background: 'var(--black-2)' } }}>
                  <td style={{ padding: '16px 24px' }}>
                    <span className={`badge ${TYPE_COLORS[ev.event_type] ?? 'badge-gray'}`} style={{ fontWeight: 600, padding: '4px 10px', textTransform: 'capitalize' }}>
                      {ev.event_type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--gray-3)', fontSize: 13, maxWidth: 350 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {formatMeta(ev.metadata).split(' · ').map((pill, idx) => (
                        <span key={idx} style={{ background: 'var(--black-3)', border: '1px solid var(--black-4)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap' }}>
                          {pill}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ background: 'var(--white-2)', color: 'var(--white)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'monospace' }}>
                      {ev.session_id?.slice(0, 8)}...
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--gray-3)', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ClientLayout>
  )
}
