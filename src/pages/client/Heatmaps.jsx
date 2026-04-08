import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'

/* ── Icons ── */
const IconDesktop  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
const IconMobile   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>

const elementsMock = [
  { selector: '#cta-principal', clicks: 234, pct: 38 },
  { selector: '.nav-menu a:nth-child(1)', clicks: 189, pct: 31 },
  { selector: '.hero-button', clicks: 145, pct: 24 },
  { selector: '.precio-card:first-child', clicks: 98, pct: 16 },
  { selector: '.footer-link', clicks: 54, pct: 9 },
  { selector: '#formulario-contacto', clicks: 41, pct: 7 },
]

export default function Heatmaps() {
  const { user } = useAuth()
  const [sites,    setSites]   = useState([])
  const [siteId,   setSiteId]  = useState(null)
  const [pages,    setPages]   = useState([])
  const [selPage,  setSelPage] = useState(null)
  const [clicks,   setClicks]  = useState([])
  const [scrolls,  setScrolls] = useState([])
  const [mode,     setMode]    = useState('clicks')
  const [device,   setDevice]  = useState('Desktop')
  const [loading,  setLoading] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => { if (user) fetchSites() }, [user])
  useEffect(() => { if (siteId) fetchPages() }, [siteId])
  useEffect(() => { if (selPage) fetchHeatmapData() }, [selPage, mode])
  useEffect(() => { drawHeatmap() }, [clicks, scrolls, mode])

  async function fetchSites() {
    const { data: c } = await supabase.from('clients').select('id').eq('id', user.id).single()
    if (!c) return
    const { data: s } = await supabase.from('sites').select('id, dominio').eq('client_id', c.id)
    setSites(s ?? [])
    if (s?.[0]) setSiteId(s[0].id)
  }

  async function fetchPages() {
    const { data: sessions } = await supabase.from('sessions').select('id').eq('site_id', siteId)
    const sids = sessions?.map(s => s.id) ?? []
    if (!sids.length) return
    const { data: evts } = await supabase.from('events').select('metadata').in('session_id', sids).eq('event_type', 'pageview')
    const pageSet = new Set(evts?.map(e => e.metadata?.url ?? '/').filter(Boolean))
    const pArr = [...pageSet]
    setPages(pArr)
    if (pArr[0]) setSelPage(pArr[0])
    else setSelPage('/inicio')
  }

  async function fetchHeatmapData() {
    setLoading(true)
    const { data: sessions } = await supabase.from('sessions').select('id').eq('site_id', siteId)
    const sids = sessions?.map(s => s.id) ?? []
    if (!sids.length) { setClicks([]); setScrolls([]); setLoading(false); return }

    if (mode === 'clicks' || mode === 'attention') {
      const { data } = await supabase.from('events').select('metadata').in('session_id', sids).eq('event_type', 'click')
      setClicks(data?.filter(e => e.metadata?.x && e.metadata?.y) ?? [])
    } else {
      const { data } = await supabase.from('events').select('metadata').in('session_id', sids).eq('event_type', 'scroll')
      setScrolls(data ?? [])
    }
    setLoading(false)
  }

  function drawHeatmap() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (mode === 'clicks') {
      clicks.forEach(e => {
        const x = (e.metadata.x / 1440) * canvas.width
        const y = (e.metadata.y / 900) * canvas.height
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 32)
        grad.addColorStop(0,   'rgba(229,57,53,0.85)')
        grad.addColorStop(0.4, 'rgba(229,57,53,0.4)')
        grad.addColorStop(1,   'rgba(229,57,53,0)')
        ctx.fillStyle = grad
        ctx.beginPath(); ctx.arc(x, y, 32, 0, Math.PI * 2); ctx.fill()
      })
      // demo blobs when no data
      if (clicks.length === 0) {
        [[200,150,0.8],[450,220,0.7],[120,400,0.5],[600,180,0.6],[380,330,0.55],[280,480,0.4]].forEach(([x,y,op]) => {
          const gx = (x / 860) * canvas.width, gy = (y / 560) * canvas.height
          const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 60)
          g.addColorStop(0, `rgba(229,57,53,${op})`); g.addColorStop(1, 'rgba(229,57,53,0)')
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, 60, 0, Math.PI * 2); ctx.fill()
        })
      }
    } else if (mode === 'scroll') {
      // scroll depth gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0,   'rgba(0,0,0,0.35)')
      gradient.addColorStop(0.3, 'rgba(0,0,0,0.2)')
      gradient.addColorStop(0.65,'rgba(0,0,0,0.08)')
      gradient.addColorStop(1,   'rgba(0,0,0,0.02)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Fold line at 62%
      const foldY = canvas.height * 0.62
      ctx.strokeStyle = 'rgba(229,57,53,0.8)'
      ctx.setLineDash([8, 4])
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, foldY); ctx.lineTo(canvas.width, foldY); ctx.stroke()
      ctx.setLineDash([])

      // Label
      ctx.fillStyle = 'rgba(229,57,53,0.9)'
      ctx.font = '11px Poppins, sans-serif'
      ctx.fillText('62% usuarios llegan aquí', canvas.width - 220, foldY - 8)

    } else if (mode === 'attention') {
      // Attention heatmap (different color — amber/gold tones)
      const attnSpots = [[300,200,0.9],[450,300,0.7],[200,400,0.6],[550,200,0.5],[350,440,0.4]]
      attnSpots.forEach(([x,y,op]) => {
        const gx = (x / 860) * canvas.width, gy = (y / 560) * canvas.height
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 80)
        g.addColorStop(0, `rgba(0,0,0,${op * 0.6})`)
        g.addColorStop(0.5, `rgba(0,0,0,${op * 0.2})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, 80, 0, Math.PI * 2); ctx.fill()
      })
    }
  }

  const displayPages = pages.length > 0 ? pages : ['/inicio', '/productos', '/contacto']

  return (
    <ClientLayout>
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Mapas de Calor</h1>
          <p className="page-subtitle">Visualiza dónde hacen clic, cómo navegan y dónde pierden interés tus usuarios</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 200px', gap: 20, alignItems: 'start' }}>

        {/* Left: Page list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray-3)', marginBottom: 10 }}>Páginas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {displayPages.map(page => {
                const active = selPage === page
                return (
                  <button key={page} onClick={() => setSelPage(page)} style={{
                    background: active ? 'var(--black)' : 'var(--white)',
                    border: `1.5px solid ${active ? 'var(--black)' : 'var(--gray-1)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 12px',
                    color: active ? 'var(--white)' : 'var(--gray-4)',
                    cursor: 'pointer', textAlign: 'left', fontSize: 12,
                    fontWeight: active ? 700 : 500, transition: 'all 0.2s',
                    fontFamily: 'monospace',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <span>{page}</span>
                    {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', display: 'block' }} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Stats card */}
          <div className="card card-flat" style={{ padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray-3)', marginBottom: 12 }}>Resumen</p>
            {[
              { label: 'Capturas', value: `${clicks.length || '124'}` },
              { label: 'Profund. Scroll', value: '62%' },
              { label: 'Tiempo en pág.', value: '1m 48s' },
              { label: 'Actualizando', value: <span style={{ color: 'var(--red)', fontWeight: 700 }}>En vivo</span> },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--gray-3)' }}>{m.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--black)' }}>{m.value}</span>
              </div>
            ))}
          </div>

          {/* Device selector */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray-3)', marginBottom: 10 }}>Dispositivo</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['Desktop', 'Mobile', 'Tablet'].map(d => (
                <button key={d} onClick={() => setDevice(d)} style={{
                  background: device === d ? 'var(--black)' : 'var(--white)',
                  border: `1.5px solid ${device === d ? 'var(--black)' : 'var(--gray-1)'}`,
                  color: device === d ? 'var(--white)' : 'var(--gray-4)',
                  borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6
                }}>
                  {d === 'Desktop' ? <IconDesktop /> : d === 'Mobile' ? <IconMobile /> : <span style={{ fontSize: 10 }}>⬜</span>}
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Heatmap Viewer */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1.5px solid var(--gray-1)' }}>
          {/* Toolbar */}
          <div style={{ padding: '12px 20px', borderBottom: '1.5px solid var(--gray-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--white-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'block', boxShadow: '0 0 6px var(--red)' }} />
              <code style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--gray-4)' }}>{selPage ?? '/'}</code>
            </div>
            <div className="tab-group">
              {[
                { id: 'clicks',    label: '🔴 Clicks' },
                { id: 'scroll',    label: '📜 Scroll' },
                { id: 'attention', label: '👁 Atención' },
              ].map(m => (
                <button key={m.id}
                  className={`tab-btn ${mode === m.id ? (m.id === 'clicks' ? 'active-red' : 'active') : ''}`}
                  onClick={() => setMode(m.id)}
                  style={{ fontSize: 11 }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas area */}
          <div style={{ position: 'relative', background: 'var(--white)', minHeight: 500 }}>
            {/* Wireframe bg */}
            <div style={{ position: 'absolute', inset: 0, padding: 28, opacity: 0.07, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ height: 50, width: '100%', border: '2px solid var(--black)', borderRadius: 6 }} />
              <div style={{ height: 200, width: '100%', background: 'var(--black)', borderRadius: 6, opacity: 0.5 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 120, border: '2px dashed var(--black)', borderRadius: 6 }} />)}
              </div>
              <div style={{ height: 40, width: '60%', border: '2px solid var(--black)', borderRadius: 6, margin: '0 auto' }} />
            </div>

            <canvas ref={canvasRef} width={840} height={520}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 10 }} />

            {loading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.85)', zIndex: 30 }}>
                <div className="loading-spinner" style={{ width: 32, height: 32 }} />
              </div>
            )}
          </div>

          {/* Legend */}
          {mode === 'clicks' && (
            <div style={{ padding: '10px 20px', borderTop: '1.5px solid var(--gray-1)', display: 'flex', gap: 20, alignItems: 'center', background: 'var(--white-2)' }}>
              <span style={{ fontSize: 10, color: 'var(--gray-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Intensidad:</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {['rgba(229,57,53,0.1)','rgba(229,57,53,0.3)','rgba(229,57,53,0.6)','rgba(229,57,53,0.9)'].map((c, i) => (
                  <div key={i} style={{ width: 20, height: 8, background: c, borderRadius: 2 }} />
                ))}
                <span style={{ fontSize: 9, color: 'var(--gray-3)', marginLeft: 4 }}>→ Mayor interacción</span>
              </div>
            </div>
          )}
          {mode === 'scroll' && (
            <div style={{ padding: '10px 20px', borderTop: '1.5px solid var(--gray-1)', background: 'var(--white-2)', display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--gray-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Leyenda:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 2, background: 'var(--red)', borderRadius: 2, borderTop: '2px dashed var(--red)' }} />
                <span style={{ fontSize: 10, color: 'var(--gray-4)' }}>Límite de scroll promedio</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Top Elements panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-flat" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1.5px solid var(--gray-1)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray-3)' }}>Top Elementos</p>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {elementsMock.map((el, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <code style={{ fontSize: 10, color: 'var(--black)', background: 'var(--white-2)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--gray-1)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {el.selector}
                    </code>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--black)' }}>{el.pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill red" style={{ width: `${el.pct}%`, background: i === 0 ? 'var(--red)' : `rgba(229,57,53,${0.8 - i * 0.1})` }} />
                  </div>
                  <p style={{ fontSize: 9, color: 'var(--gray-3)', marginTop: 2 }}>{el.clicks} clics</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-flat" style={{ padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray-3)', marginBottom: 12 }}>Clics por tipo</p>
            {[
              { label: 'Total', value: '1,234', color: 'var(--black)' },
              { label: 'Fallidos (Dead)', value: '187', color: 'var(--gray-3)' },
              { label: 'Frustración (Rage)', value: '43', color: 'var(--red)' },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--gray-4)' }}>{m.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: m.color }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ClientLayout>
  )
}
