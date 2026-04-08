import { useState, useMemo } from 'react'
import { ClientLayout } from '../../components/layout/Layout'

/* ── Icons ── */
const IconPlay    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const IconDesktop = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
const IconMobile  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
const IconTablet  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
const IconClose   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconFilter  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
const IconRage    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15h8M9 9h.01M15 9h.01"/></svg>
const IconSearch  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconDownload= () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>

/* ── Mock data ── */
const countries = ['Colombia', 'México', 'España', 'Argentina', 'Chile', 'Perú', 'Brasil', 'Estados Unidos']
const browsers  = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Samsung Internet']
const devices   = ['Desktop', 'Mobile', 'Tablet']
const pages     = ['/inicio', '/productos', '/contacto', '/servicios', '/checkout', '/nosotros', '/blog']

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randomBetween(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a }

function generateSessions(n = 60) {
  return Array.from({ length: n }, (_, i) => {
    const hasRage = Math.random() < 0.18
    const hasDead = Math.random() < 0.22
    const duration = randomBetween(4, 480)
    const pageCount = randomBetween(1, 8)
    const hoursAgo  = randomBetween(0, 72)
    const date = new Date(Date.now() - hoursAgo * 3600 * 1000)
    return {
      id: `sess-${i + 1}`,
      userId: `user-${randomBetween(100, 9999)}`,
      device: randomItem(devices),
      browser: randomItem(browsers),
      country: randomItem(countries),
      duration,
      pages: pageCount,
      entryPage: randomItem(pages),
      exitPage: randomItem(pages),
      hasRage,
      hasDead,
      scrollDepth: randomBetween(10, 100),
      date,
      events: Array.from({ length: pageCount * 4 + randomBetween(2, 10) }, (_, ei) => ({
        type: randomItem(['pageview', 'click', 'scroll', 'click', 'pageview']),
        time: randomBetween(0, duration),
        label: randomItem(['Nav click', 'CTA click', 'Scroll 50%', 'Pageview', 'Form submit', 'Rage click'])
      })).sort((a, b) => a.time - b.time)
    }
  }).sort((a, b) => b.date - a.date)
}

const ALL_SESSIONS = generateSessions(60)

const DeviceIcon = ({ d }) => d === 'Desktop' ? <IconDesktop /> : d === 'Mobile' ? <IconMobile /> : <IconTablet />

function fmtDuration(secs) {
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs/60)}m ${secs%60}s`
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - date) / 1000)
  if (diff < 60)   return `hace ${diff}s`
  if (diff < 3600) return `hace ${Math.floor(diff/60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff/3600)}h`
  return `hace ${Math.floor(diff/86400)}d`
}

export default function Recordings() {
  const [deviceFilter,  setDeviceFilter]  = useState('Todos')
  const [behaviorFilter,setBehaviorFilter]= useState('Todos')
  const [searchQ,       setSearchQ]       = useState('')
  const [selectedSess,  setSelectedSess]  = useState(null)
  const [playerProgress,setPlayerProgress]= useState(0)
  const [isPlaying,     setIsPlaying]     = useState(false)

  const filtered = useMemo(() => {
    return ALL_SESSIONS.filter(s => {
      if (deviceFilter !== 'Todos' && s.device !== deviceFilter) return false
      if (behaviorFilter === 'Rage Clicks' && !s.hasRage) return false
      if (behaviorFilter === 'Dead Clicks' && !s.hasDead) return false
      if (behaviorFilter === 'Cortas (<30s)' && s.duration >= 30) return false
      if (searchQ && !s.userId.includes(searchQ) && !s.country.toLowerCase().includes(searchQ.toLowerCase()) && !s.entryPage.includes(searchQ)) return false
      return true
    })
  }, [deviceFilter, behaviorFilter, searchQ])

  function openSession(s) {
    setSelectedSess(s)
    setPlayerProgress(0)
    setIsPlaying(false)
  }

  function togglePlay() {
    setIsPlaying(p => !p)
    if (!isPlaying) {
      let prog = playerProgress
      const iv = setInterval(() => {
        prog += 1
        setPlayerProgress(prog)
        if (prog >= 100) { clearInterval(iv); setIsPlaying(false) }
      }, 80)
    }
  }

  const behaviorFilters = ['Todos', 'Rage Clicks', 'Dead Clicks', 'Cortas (<30s)']
  const deviceFilters   = ['Todos', 'Desktop', 'Mobile', 'Tablet']

  return (
    <ClientLayout>
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Grabaciones de Sesiones</h1>
          <p className="page-subtitle">Observa cómo navegan tus usuarios en tiempo real</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            <IconDownload /> Exportar
          </button>
          <span className="badge badge-dark">{filtered.length} sesiones</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 300 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-3)' }}><IconSearch /></div>
          <input
            placeholder="Buscar por usuario, país, URL..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{ paddingLeft: 36, paddingTop: 9, paddingBottom: 9, fontSize: 13 }}
          />
        </div>

        {/* Device filter */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 4 }}>Dispositivo:</span>
          <div className="tab-group">
            {deviceFilters.map(f => (
              <button key={f} className={`tab-btn ${deviceFilter === f ? 'active' : ''}`} onClick={() => setDeviceFilter(f)} style={{ padding: '6px 12px', fontSize: 11 }}>
                {f === 'Desktop' ? <><IconDesktop /> Desktop</> : f === 'Mobile' ? <><IconMobile /> Mobile</> : f === 'Tablet' ? <><IconTablet /> Tablet</> : f}
              </button>
            ))}
          </div>
        </div>

        {/* Behavior filter */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 4 }}>Comportamiento:</span>
          <div className="tab-group">
            {behaviorFilters.map(f => (
              <button key={f} className={`tab-btn ${behaviorFilter === f ? (f !== 'Todos' ? 'active-red' : 'active') : ''}`} onClick={() => setBehaviorFilter(f)} style={{ padding: '6px 12px', fontSize: 11 }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content: List + Side Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedSess ? '1fr 420px' : '1fr', gap: 20, alignItems: 'start' }}>
        {/* Sessions List */}
        <div className="card card-flat" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Dispositivo</th>
                <th>País</th>
                <th>Duración</th>
                <th style={{ textAlign: 'center' }}>Páginas</th>
                <th style={{ textAlign: 'center' }}>Problemas</th>
                <th style={{ textAlign: 'right' }}>Hace</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-icon">🎬</div>
                    <p className="empty-title">Sin grabaciones</p>
                    <p className="empty-sub">Prueba cambiando los filtros</p>
                  </div>
                </td></tr>
              ) : filtered.map(s => (
                <tr
                  key={s.id}
                  onClick={() => openSession(s)}
                  style={{
                    cursor: 'pointer',
                    background: selectedSess?.id === s.id ? 'var(--white-2)' : undefined,
                    borderLeft: selectedSess?.id === s.id ? '3px solid var(--black)' : '3px solid transparent',
                  }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--white-2)', border: '1.5px solid var(--gray-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--gray-4)', flexShrink: 0 }}>
                        {s.userId.slice(-2).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--black)' }}>{s.userId}</p>
                        <p style={{ fontSize: 10, color: 'var(--gray-3)', fontFamily: 'monospace' }}>{s.entryPage}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-4)', fontSize: 12 }}>
                      <DeviceIcon d={s.device} />{s.device}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--gray-4)' }}>{s.country}</td>
                  <td style={{ fontSize: 12, fontWeight: 600 }}>{fmtDuration(s.duration)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{s.pages}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {s.hasRage && <span className="badge badge-red" style={{ padding: '2px 6px', fontSize: 9 }}><IconRage /> Rage</span>}
                      {s.hasDead && <span className="badge badge-yellow" style={{ padding: '2px 6px', fontSize: 9 }}>Dead</span>}
                      {!s.hasRage && !s.hasDead && <span style={{ fontSize: 10, color: 'var(--gray-2)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 11, color: 'var(--gray-3)' }}>{timeAgo(s.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Side Panel — Session Detail */}
        {selectedSess && (
          <div className="card card-flat slide-in-right" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: 16 }}>
            {/* Panel Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1.5px solid var(--gray-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--white-2)' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--black)' }}>{selectedSess.userId}</p>
                <p style={{ fontSize: 10, color: 'var(--gray-3)', marginTop: 2 }}>{selectedSess.date.toLocaleString('es')}</p>
              </div>
              <button onClick={() => setSelectedSess(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--gray-3)', display: 'flex', padding: 4 }}>
                <IconClose />
              </button>
            </div>

            {/* Player */}
            <div style={{ background: '#000', padding: '24px 20px', position: 'relative' }}>
              {/* Screen wireframe */}
              <div style={{ background: '#111', borderRadius: 8, aspectRatio: '16/9', position: 'relative', overflow: 'hidden', border: '1px solid #222' }}>
                <div style={{ position: 'absolute', inset: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.15 }}>
                  <div style={{ height: 20, background: '#fff', borderRadius: 4, width: '100%' }} />
                  <div style={{ flex: 1, background: '#fff', borderRadius: 4, opacity: 0.5 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[1,2,3].map(i => <div key={i} style={{ height: 40, background: '#fff', borderRadius: 4, opacity: 0.3 }} />)}
                  </div>
                </div>
                {/* Cursor simulation */}
                <div style={{
                  position: 'absolute',
                  left: `${20 + playerProgress * 0.5}%`,
                  top: `${30 + Math.sin(playerProgress * 0.1) * 20}%`,
                  width: 10, height: 10, background: 'var(--red)',
                  borderRadius: '50%', boxShadow: '0 0 8px rgba(229,57,53,0.8)',
                  transition: 'left 0.1s, top 0.1s', pointerEvents: 'none'
                }} />
                {/* Page label */}
                <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                  {selectedSess.entryPage}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: 12 }}>
                <div style={{ height: 3, background: '#333', borderRadius: 3, cursor: 'pointer' }}
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setPlayerProgress(Math.round(((e.clientX - rect.left) / rect.width) * 100))
                  }}>
                  <div style={{ height: '100%', width: `${playerProgress}%`, background: 'var(--red)', borderRadius: 3, transition: 'width 0.08s linear', position: 'relative' }}>
                    <div style={{ position: 'absolute', right: -4, top: -4, width: 11, height: 11, borderRadius: '50%', background: 'var(--red)', border: '2px solid #000' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: '#555' }}>{fmtDuration(Math.floor(selectedSess.duration * playerProgress / 100))}</span>
                  <span style={{ fontSize: 9, color: '#555' }}>{fmtDuration(selectedSess.duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <button onClick={togglePlay} style={{ display: 'flex', alignItems: 'center', gap: 8, background: isPlaying ? '#E53935' : '#fff', color: isPlaying ? '#fff' : '#000', border: 'none', padding: '8px 18px', borderRadius: 8, fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, cursor: 'pointer', gap: 6 }}>
                  <IconPlay /> {isPlaying ? 'Pausar' : 'Reproducir'}
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['1x','2x','4x','8x'].map(sp => (
                    <button key={sp} style={{ background: '#222', color: '#888', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>{sp}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Session events timeline */}
            <div style={{ padding: '16px 20px', maxHeight: 240, overflowY: 'auto' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray-3)', marginBottom: 12 }}>Eventos de sesión</p>
              {selectedSess.events.slice(0, 20).map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--gray-3)', width: 28, flexShrink: 0, paddingTop: 2 }}>{fmtDuration(ev.time)}</div>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: ev.type === 'click' ? '#000' : ev.type === 'pageview' ? 'var(--red)' : 'var(--gray-2)' }} />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--black)' }}>{ev.label}</p>
                    <p style={{ fontSize: 10, color: 'var(--gray-3)' }}>{ev.type}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Session metadata */}
            <div style={{ padding: '16px 20px', borderTop: '1.5px solid var(--gray-1)', background: 'var(--white-2)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray-3)', marginBottom: 12 }}>Información del usuario</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'País', value: selectedSess.country },
                  { label: 'Dispositivo', value: selectedSess.device },
                  { label: 'Navegador', value: selectedSess.browser },
                  { label: 'Scroll máx.', value: `${selectedSess.scrollDepth}%` },
                  { label: 'Entrada', value: selectedSess.entryPage },
                  { label: 'Salida', value: selectedSess.exitPage },
                ].map(m => (
                  <div key={m.label}>
                    <p style={{ fontSize: 9, color: 'var(--gray-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{m.label}</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--black)', fontFamily: m.label === 'Entrada' || m.label === 'Salida' ? 'monospace' : 'inherit' }}>{m.value}</p>
                  </div>
                ))}
              </div>
              {selectedSess.hasRage && (
                <div style={{ marginTop: 12, padding: 10, background: 'var(--red-light)', borderRadius: 8, border: '1px solid var(--red-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <IconRage />
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)' }}>Esta sesión contiene Rage Clicks detectados</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  )
}
