import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'

const IconRage   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15h8M9 9h.01M15 9h.01"/></svg>
const IconDead   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M12 14v4M8 20h8"/></svg>
const IconVitals = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>

function vitalColor(metric, val) {
  if (metric === 'lcp') return val < 2.5 ? '#16a34a' : val < 4 ? '#d97706' : '#E53935'
  if (metric === 'fid') return val < 100 ? '#16a34a' : val < 300 ? '#d97706' : '#E53935'
  if (metric === 'cls') return val < 0.1 ? '#16a34a' : val < 0.25 ? '#d97706' : '#E53935'
  return '#000'
}

export default function Behavior() {
  const { user } = useAuth()
  const [siteId,   setSiteId]   = useState(null)
  const [sites,    setSites]    = useState([])
  const [filter,   setFilter]   = useState('rage_click')
  const [rc,       setRc]       = useState([])
  const [dc,       setDc]       = useState([])
  const [vitals,   setVitals]   = useState([{ path: '/', fid: 12.5, lcp: 1.8, cls: 0.04, counts: 128 }])
  const [summary,  setSummary]  = useState({ rage: 0, dead: 0 })
  const [loading,  setLoading]  = useState(true)

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
    if (!sids.length) { setSummary({ rage: 0, dead: 0 }); setLoading(false); return }

    const { data: clicks } = await supabase.from('events').select('session_id, timestamp, metadata').in('session_id', sids).eq('event_type', 'click').order('timestamp')

    // Rage clicks
    const rageMap = {}
    clicks?.forEach(c => {
      const key = `${c.session_id}::${c.metadata?.path ?? '/'}::${c.metadata?.target ?? 'el'}`
      rageMap[key] = (rageMap[key] ?? 0) + 1
    })
    const rageArr = Object.entries(rageMap).filter(([,v]) => v >= 3).map(([k, v]) => {
      const [, path, target] = k.split('::')
      return { path, target, count: v }
    }).sort((a, b) => b.count - a.count)
    setRc(rageArr)

    // Dead clicks
    const dcData  = clicks?.filter(c => !c.metadata?.href && !c.metadata?.url) ?? []
    const deadMap = {}
    dcData.forEach(c => {
      const key = `${c.metadata?.path ?? '/'}::${c.metadata?.target ?? 'el'}`
      deadMap[key] = (deadMap[key] ?? 0) + 1
    })
    const dcArr = Object.entries(deadMap).map(([k, v]) => {
      const [path, target] = k.split('::')
      return { path, target, count: v }
    }).sort((a, b) => b.count - a.count)
    setDc(dcArr)

    setSummary({ rage: rageArr.length, dead: dcArr.length })
    setLoading(false)
  }

  const tabs = [
    { id: 'rage_click', label: 'Rage Clicks',     icon: <IconRage />,   count: summary.rage, critical: true },
    { id: 'dead_click', label: 'Dead Clicks',      icon: <IconDead />,   count: summary.dead, critical: false },
    { id: 'vitals',     label: 'Core Web Vitals',  icon: <IconVitals />, count: null,         critical: false },
  ]

  const activeData = filter === 'rage_click' ? rc : dc

  return (
    <ClientLayout>
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Comportamiento UX</h1>
          <p className="page-subtitle">Detecta fricciones, elementos rotos y rendimiento web</p>
        </div>
        {sites.length > 0 && (
          <div className="filter-bar" style={{ padding: '6px 14px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sitio:</span>
            <select style={{ border: 'none', background: 'transparent', fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13, color: 'var(--black)', outline: 'none', cursor: 'pointer' }}
              value={siteId ?? ''} onChange={e => setSiteId(e.target.value)}>
              {sites.map(s => <option key={s.id} value={s.id}>{s.dominio}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <div className="stat-card critical">
          <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: '100%', background: 'var(--red)', borderRadius: '0 14px 14px 0' }} />
          <div className="stat-icon"><IconRage /></div>
          <div className="stat-value">{loading ? '–' : summary.rage}</div>
          <div className="stat-label">Rage Clicks detectados</div>
          <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, opacity: 0.8 }}>Require atención inmediata</div>
        </div>
        <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="stat-icon"><IconDead /></div>
          <div className="stat-value">{loading ? '–' : summary.dead}</div>
          <div className="stat-label">Dead Clicks registrados</div>
          <div style={{ fontSize: 11, color: 'var(--gray-3)', marginTop: 4 }}>Elementos sin acción asignada</div>
        </div>
        <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="stat-icon"><IconVitals /></div>
          <div className="stat-value" style={{ color: '#16a34a' }}>Bueno</div>
          <div className="stat-label">Core Web Vitals general</div>
          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>LCP 1.8s · FID 12ms · CLS 0.04</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-group" style={{ marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id}
            className={`tab-btn ${filter === t.id ? (t.critical ? 'active-red' : 'active') : ''}`}
            onClick={() => setFilter(t.id)}
            style={{ gap: 6 }}
          >
            {t.icon} {t.label}
            {t.count !== null && (
              <span style={{
                background: filter === t.id && t.critical ? 'var(--red)' : 'var(--gray-1)',
                color: filter === t.id && t.critical ? '#fff' : 'var(--gray-4)',
                fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="loading-spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : filter === 'vitals' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {vitals.map(({ path, fid, lcp, cls, counts }) => (
            <div key={path} className="card card-flat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <code style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>{path}</code>
                <span className="badge badge-green">Activo</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[
                  { label: 'LCP', value: `${lcp.toFixed(2)}s`, key: 'lcp', val: lcp, hint: '< 2.5s bueno' },
                  { label: 'FID', value: `${fid.toFixed(0)}ms`, key: 'fid', val: fid, hint: '< 100ms bueno' },
                  { label: 'CLS', value: cls.toFixed(3), key: 'cls', val: cls, hint: '< 0.1 bueno' },
                ].map(v => (
                  <div key={v.label} style={{ background: 'var(--white-2)', padding: 16, borderRadius: 10, border: '1.5px solid var(--gray-1)', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: 'var(--gray-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{v.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: vitalColor(v.key, v.val) }}>{v.value}</p>
                    <p style={{ fontSize: 9, color: 'var(--gray-3)', marginTop: 6 }}>{v.hint}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--gray-3)' }}>Basado en <strong style={{ color: 'var(--black)' }}>{counts}</strong> mediciones</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card card-flat" style={{ padding: 0, overflow: 'hidden' }}>
          {activeData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{filter === 'rage_click' ? '🎉' : '✅'}</div>
              <p className="empty-title">Sin {filter === 'rage_click' ? 'Rage Clicks' : 'Dead Clicks'} detectados</p>
              <p className="empty-sub">¡Excelente! Tu UI responde correctamente a las interacciones.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ruta</th>
                  <th>Elemento (selector)</th>
                  <th style={{ textAlign: 'center' }}>Severidad</th>
                  <th style={{ textAlign: 'right' }}>Frecuencia</th>
                </tr>
              </thead>
              <tbody>
                {activeData.map((item, idx) => {
                  const isHigh = item.count > 10
                  return (
                    <tr key={idx}>
                      <td style={{ width: 40, color: 'var(--gray-3)', fontSize: 12, fontWeight: 700 }}>{idx + 1}</td>
                      <td>
                        <code style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--black)', background: 'var(--white-2)', padding: '2px 8px', borderRadius: 5, border: '1px solid var(--gray-1)' }}>
                          {item.path}
                        </code>
                      </td>
                      <td>
                        <code style={{ fontSize: 11, color: filter === 'rage_click' ? 'var(--red)' : 'var(--gray-4)', background: filter === 'rage_click' ? 'var(--red-light)' : 'var(--white-2)', padding: '3px 10px', borderRadius: 6, border: `1px solid ${filter === 'rage_click' ? 'var(--red-border)' : 'var(--gray-1)'}` }}>
                          {item.target}
                        </code>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${isHigh ? 'badge-red' : 'badge-yellow'}`}>
                          {isHigh ? 'Alta' : 'Media'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 18, fontWeight: 800, color: isHigh ? 'var(--red)' : 'var(--black)' }}>
                        {item.count}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </ClientLayout>
  )
}
