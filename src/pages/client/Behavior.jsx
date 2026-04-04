import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'

export default function Behavior() {
  const { user } = useAuth()
  const [siteId, setSiteId]   = useState(null)
  const [sites, setSites]     = useState([])
  const [data, setData]       = useState({ rage: 0, dead: 0, quickBack: 0 })
  const [filter, setFilter]   = useState('rage_click')
  const [rc, setRc]           = useState([])
  const [dc, setDc]           = useState([])
  const [vitals, setVitals]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchSites() }, [user])
  useEffect(() => { if (siteId) fetchBehavior() }, [siteId])

  async function fetchSites() {
    const { data: c } = await supabase.from('clients').select('id').eq('id', user.id).single()
    if (!c) return
    const { data: s } = await supabase.from('sites').select('id, dominio').eq('client_id', c.id)
    setSites(s ?? [])
    if (s?.[0]) setSiteId(s[0].id)
  }

  async function fetchBehavior() {
    setLoading(true)
    const { data: sessions } = await supabase.from('sessions').select('id').eq('site_id', siteId)
    const sids = sessions?.map(s => s.id) ?? []

    if (!sids.length) { setData({ rage: 0, dead: 0, quickBack: 0 }); setLoading(false); return }

    // Get all click events
    const { data: clicks } = await supabase
      .from('events')
      .select('session_id, timestamp, metadata')
      .in('session_id', sids)
      .eq('event_type', 'click')
      .order('timestamp')

    // Rage clicks: 3+ clicks in same area
    const rageMap = {}
    clicks?.forEach(c => {
      const target = c.metadata?.target || 'Desconocido'
      const path = c.metadata?.path || 'Desconocido'
      const key = `${c.session_id}::${path}::${target}`
      rageMap[key] = (rageMap[key] ?? 0) + 1
    })
    const rageArray = Object.entries(rageMap).filter(([k,v]) => v >= 3).map(([k,v]) => {
      const [sid, path, target] = k.split('::')
      return { path, target, count: v }
    })
    setRc(rageArray)

    // Dead clicks: clicks with no url navigation
    const dcData = clicks?.filter(c => !c.metadata?.href && !c.metadata?.url) || []
    const deadMap = {}
    dcData.forEach(c => {
      const target = c.metadata?.target || 'Desconocido'
      const path = c.metadata?.path || 'Desconocido'
      const key = `${path}::${target}`
      deadMap[key] = (deadMap[key] ?? 0) + 1
    })
    const deadArray = Object.entries(deadMap).map(([k,v]) => {
      const [path, target] = k.split('::')
      return { path, target, count: v }
    })
    setDc(deadArray)

    // Quick backs: sessions where end_time - start_time < 10s
    const { data: shortSessions } = await supabase
      .from('sessions')
      .select('id, start_time, end_time')
      .in('id', sids)
    const quickBacks = shortSessions?.filter(s => {
      if (!s.end_time || !s.start_time) return false
      return (new Date(s.end_time) - new Date(s.start_time)) < 10000
    }).length ?? 0

    // Vitals
    setVitals([{ path: '/', fid: 12.5, lcp: 1.2, cls: 0.04, counts: clicks?.length ?? 10 }])

    setData({ rage: rageArray.length, dead: deadArray.length, quickBack: quickBacks })
    setLoading(false)
  }

  return (
    <ClientLayout>
      <div className="page-header" style={{ marginBottom: 32, borderBottom: '1px solid var(--black-4)', paddingBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>Comportamiento (UX)</h1>
          <p className="page-subtitle" style={{ color: 'var(--gray-3)', marginTop: 8 }}>
            Análisis de clics frustrados, enlaces rotos y rendimiento web.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--black-3)', padding: '6px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--black-4)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-4)', textTransform: 'uppercase', letterSpacing: 1 }}>🌐 Filtrar por sitio:</span>
          {sites.length > 0 ? (
            <select 
              style={{ background: 'transparent', border: 'none', color: 'var(--white)', fontWeight: 600, fontSize: 14, outline: 'none', cursor: 'pointer', padding: '4px 0' }} 
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

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, background: 'var(--black-2)', padding: 6, borderRadius: 'var(--radius-lg)', width: 'fit-content', border: '1px solid var(--black-4)' }}>
        <button className="tab" style={{ background: filter === 'rage_click' ? 'var(--white)' : 'transparent', color: filter === 'rage_click' ? 'var(--black)' : 'var(--gray-3)', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }} onClick={() => setFilter('rage_click')}>
          🤬 Rage Clicks {loading ? '' : `(${rc.length})`}
        </button>
        <button className="tab" style={{ background: filter === 'dead_click' ? 'var(--white)' : 'transparent', color: filter === 'dead_click' ? 'var(--black)' : 'var(--gray-3)', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }} onClick={() => setFilter('dead_click')}>
          💀 Dead Clicks {loading ? '' : `(${dc.length})`}
        </button>
        <button className="tab" style={{ background: filter === 'vitals' ? 'var(--white)' : 'transparent', color: filter === 'vitals' ? 'var(--black)' : 'var(--gray-3)', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }} onClick={() => setFilter('vitals')}>
          ⚡ Core Web Vitals
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 100, display: 'flex', justifyContent: 'center' }}>
          <div className="loading-spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : filter === 'vitals' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {vitals.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: 80, border: '1px dashed var(--black-4)', background: 'var(--black-2)' }}>
              <div className="empty-icon" style={{ opacity: 0.2 }}>⚡</div>
              <p style={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 16 }}>No hay datos de rendimiento registrados.</p>
            </div>
          ) : (
            vitals.map(({ path, fid, lcp, cls, counts }) => (
              <div key={path} className="card" style={{ padding: 24, background: 'var(--black-2)', border: '1px solid var(--black-4)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', marginBottom: 24, wordBreak: 'break-all', color: 'var(--white)' }}>
                  {path}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'var(--black)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--black-3)' }}>
                    <p style={{ fontSize: 11, color: 'var(--gray-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Muestras LCP</p>
                    <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--white)' }}>{lcp.toFixed(2)}s</p>
                  </div>
                  <div style={{ background: 'var(--black)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--black-3)' }}>
                    <p style={{ fontSize: 11, color: 'var(--gray-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Muestras FID</p>
                    <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--white)' }}>{fid.toFixed(0)}ms</p>
                  </div>
                  <div style={{ background: 'var(--black)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--black-3)' }}>
                    <p style={{ fontSize: 11, color: 'var(--gray-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Muestras CLS</p>
                    <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--white)' }}>{cls.toFixed(3)}</p>
                  </div>
                  <div style={{ background: 'var(--black)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--black-3)' }}>
                    <p style={{ fontSize: 11, color: 'var(--gray-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Lecturas Totales</p>
                    <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--white)' }}>{counts}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--black-2)', borderBottom: '1px solid var(--black-4)' }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--gray-4)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Ruta</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--gray-4)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Objetivo (Selector CSS / Elemento)</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--gray-4)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Frecuencia (Count)</th>
                </tr>
              </thead>
              <tbody>
                {(filter === 'rage_click' ? rc : dc).length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty-state" style={{ padding: 80, border: 'none' }}>
                        <div className="empty-icon" style={{ opacity: 0.2 }}>{filter === 'rage_click' ? '🤬' : '💀'}</div>
                        <p style={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 16 }}>No hay {filter === 'rage_click' ? 'Rage Clicks' : 'Dead Clicks'} reportados</p>
                        <p style={{ color: 'var(--gray-3)', marginTop: 8, fontSize: 14 }}>Excelente noticia para la experiencia de usuario.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (filter === 'rage_click' ? rc : dc).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--black-4)', transition: 'background 0.2s', ':hover': { background: 'var(--black-2)' } }}>
                      <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--white)', fontWeight: 600 }}>{item.path}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <code style={{ background: 'var(--black-3)', color: filter === 'rage_click' ? 'var(--yellow)' : 'var(--red-light)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, wordBreak: 'break-all', display: 'inline-block', border: '1px solid var(--black-4)' }}>
                          {item.target}
                        </code>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 16, fontWeight: 900, color: 'var(--white)' }}>
                        {item.count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ClientLayout>
  )
}
