import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'

export default function Heatmaps() {
  const { user } = useAuth()
  const [sites, setSites]   = useState([])
  const [siteId, setSiteId] = useState(null)
  const [pages, setPages]   = useState([])
  const [selPage, setSelPage] = useState(null)
  const [clicks, setClicks] = useState([])
  const [scrolls, setScrolls] = useState([])
  const [mode, setMode]     = useState('clicks')
  const [loading, setLoading] = useState(false)
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
    const { data: evts } = await supabase
      .from('events')
      .select('metadata')
      .in('session_id', sids)
      .eq('event_type', 'pageview')
    const pageSet = new Set(evts?.map(e => e.metadata?.url ?? '/').filter(Boolean))
    setPages([...pageSet])
    if ([...pageSet][0]) setSelPage([...pageSet][0])
  }

  async function fetchHeatmapData() {
    setLoading(true)
    const { data: sessions } = await supabase.from('sessions').select('id').eq('site_id', siteId)
    const sids = sessions?.map(s => s.id) ?? []
    if (!sids.length) { setClicks([]); setScrolls([]); setLoading(false); return }

    if (mode === 'clicks') {
      const { data } = await supabase
        .from('events')
        .select('metadata')
        .in('session_id', sids)
        .eq('event_type', 'click')
      setClicks(data?.filter(e => e.metadata?.x && e.metadata?.y) ?? [])
    } else {
      const { data } = await supabase
        .from('events')
        .select('metadata')
        .in('session_id', sids)
        .eq('event_type', 'scroll')
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
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 30)
        grad.addColorStop(0, 'rgba(229, 57, 53, 0.8)')
        grad.addColorStop(0.5, 'rgba(229, 57, 53, 0.3)')
        grad.addColorStop(1, 'rgba(229, 57, 53, 0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, 30, 0, Math.PI * 2)
        ctx.fill()
      })
    } else {
      scrolls.forEach(e => {
        const y = ((e.metadata?.scrollY ?? 0) / 900) * canvas.height
        ctx.fillStyle = 'rgba(33, 150, 243, 0.04)'
        ctx.fillRect(0, y, canvas.width, 20)
      })
    }
  }

  const pageMock = [
    { url: '/inicio', clicks: 234 },
    { url: '/productos', clicks: 145 },
    { url: '/contacto', clicks: 89 },
  ]

  return (
    <ClientLayout>
      <div className="page-header" style={{ marginBottom: 32, borderBottom: '1px solid var(--black-4)', paddingBottom: 24 }}>
        <div>
          <h1 className="page-title">Heatmaps Insight</h1>
          <p className="page-subtitle" style={{ color: 'var(--gray-3)', marginTop: 8 }}>
            Analiza el comportamiento detallado. Visualiza interacciones clave y patrones de lectura.
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

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }}>
        {/* Page list Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-4)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>Rutas Analizadas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(pages.length > 0 ? pages : pageMock.map(p => p.url)).map(page => {
                const isActive = selPage === page;
                return (
                  <button
                    key={page}
                    onClick={() => setSelPage(page)}
                    style={{
                      background: isActive ? 'var(--white)' : 'var(--black-2)',
                      border: `1px solid ${isActive ? 'var(--white)' : 'var(--black-4)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      color: isActive ? 'var(--black)' : 'var(--gray-3)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 500,
                      transition: 'all 0.3s ease',
                      fontFamily: 'Courier New, monospace',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}
                  >
                    <span>{page}</span>
                    {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--black)', display: 'block' }}/>}
                  </button>
                )
              })}
            </div>
          </div>
          
          <div className="card" style={{ background: 'var(--black-2)', padding: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-4)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Resumen de Interacción</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--gray-3)' }}>Total Capturas:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)' }}>{clicks.length || 0}</span>
              </div>
              <div style={{ height: 1, background: 'var(--black-4)' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--gray-3)' }}>Última Actividad:</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>En tiempo real</span>
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap Viewer Area */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--black-4)', background: 'var(--black)' }}>
          {/* Controls Bar */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--black-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--black-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red-light)', display: 'block', boxShadow: '0 0 10px rgba(229,57,53,0.6)' }}/>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)', fontFamily: 'Courier New, monospace' }}>
                {selPage ?? '/*'}
              </p>
            </div>
            <div style={{ display: 'flex', background: 'var(--black-4)', borderRadius: 'var(--radius-full)', padding: 4 }}>
              <button 
                onClick={() => setMode('clicks')}
                style={{ 
                  padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.3s',
                  background: mode === 'clicks' ? 'var(--white)' : 'transparent',
                  color: mode === 'clicks' ? 'var(--black)' : 'var(--gray-3)'
                }}
              >🔴 Clicks</button>
              <button 
                onClick={() => setMode('scroll')}
                style={{ 
                  padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.3s',
                  background: mode === 'scroll' ? 'var(--white)' : 'transparent',
                  color: mode === 'scroll' ? 'var(--black)' : 'var(--gray-3)'
                }}
              >📜 Scroll</button>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div style={{ position: 'relative', background: 'var(--black)', minHeight: 560 }}>
            {/* Wireframe Mockup to simulate website */}
            <div style={{ position: 'absolute', inset: 0, padding: 32, opacity: 0.08, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ height: 60, width: '100%', border: '2px solid var(--white)', borderRadius: 8 }} />
              <div style={{ height: 240, width: '100%', background: 'var(--white)', borderRadius: 8 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 160, border: '2px dashed var(--white)', borderRadius: 8 }} />)}
              </div>
            </div>

            {/* Render Canvas */}
            <canvas
              ref={canvasRef}
              width={860}
              height={560}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 10 }}
            />

            {/* Empty States / Demo Instructions */}
            {mode === 'clicks' && clicks.length === 0 && !loading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, zIndex: 20 }}>
                <div style={{ padding: '16px 24px', background: 'var(--black-2)', border: '1px solid var(--black-4)', borderRadius: 40, backdropFilter: 'blur(10px)' }}>
                  <p style={{ color: 'var(--white)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    🔥 Esperando interacción del usuario...
                  </p>
                </div>
                {/* Visual Fake Heatmap Blobs for aesthetic value */}
                {[[200,150,0.8],[450,220,0.5],[120,400,0.4],[600,180,0.6],[380,380,0.5]].map(([x,y,op], i) => (
                  <div key={i} style={{
                    position: 'absolute', left: `${(x/860)*100}%`, top: `${(y/560)*100}%`,
                    width: 120, height: 120, borderRadius: '50%', pointerEvents: 'none',
                    background: `radial-gradient(circle, rgba(229,57,53,${op}) 0%, transparent 60%)`,
                    transform: 'translate(-50%,-50%)', opacity: 0.3
                  }} />
                ))}
              </div>
            )}

            {/* Loading Overlay */}
            {loading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', zIndex: 30, backdropFilter: 'blur(4px)' }}>
                <div className="loading-spinner" style={{ width: 40, height: 40 }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  )
}
