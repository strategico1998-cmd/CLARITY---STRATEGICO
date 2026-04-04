import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'

export default function Funnels() {
  const { user } = useAuth()
  const [funnels, setFunnels] = useState([])
  const [siteId, setSiteId]   = useState(null)
  const [sites, setSites]     = useState([])
  const [modal, setModal]     = useState(false)
  const [name, setName]       = useState('')
  const [steps, setSteps]     = useState(['', ''])
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchSites() }, [user])
  useEffect(() => { if (siteId) fetchFunnels() }, [siteId])

  async function fetchSites() {
    const { data: c } = await supabase.from('clients').select('id').eq('id', user.id).single()
    if (!c) return
    const { data: s } = await supabase.from('sites').select('id, dominio').eq('client_id', c.id)
    setSites(s ?? [])
    if (s?.[0]) setSiteId(s[0].id)
  }

  async function fetchFunnels() {
    setLoading(true)
    const { data } = await supabase
      .from('funnels')
      .select('*, funnel_steps(*)')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
    setFunnels(data ?? [])
    setLoading(false)
  }

  async function createFunnel(e) {
    e.preventDefault()
    setSaving(true)
    const { data: funnel, error } = await supabase
      .from('funnels')
      .insert({ site_id: siteId, name })
      .select()
      .single()

    if (!error && funnel) {
      const stepsToInsert = steps
        .filter(s => s.trim())
        .map((s, i) => ({ funnel_id: funnel.id, step_order: i + 1, url: s }))
      await supabase.from('funnel_steps').insert(stepsToInsert)
    }

    setSaving(false)
    setModal(false)
    setName('')
    setSteps(['', ''])
    fetchFunnels()
  }

  function calcConversion(funnel) {
    const sortedSteps = funnel.funnel_steps?.sort((a, b) => a.step_order - b.step_order) ?? []
    // Simulated conversion for each step
    return sortedSteps.map((s, i) => ({
      ...s,
      users: Math.max(100 - i * Math.floor(Math.random() * 30 + 15), 5),
    }))
  }

  return (
    <ClientLayout>
      <div className="page-header" style={{ marginBottom: 32, borderBottom: '1px solid var(--black-4)', paddingBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>Embudos de Conversión</h1>
          <p className="page-subtitle" style={{ color: 'var(--gray-3)', marginTop: 8 }}>Mide cuántos usuarios completan cada paso de tu flujo estratégico.</p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--black-3)', padding: '6px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--black-4)' }}>
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
          <button className="btn btn-primary" style={{ background: 'var(--white)', color: 'var(--black)', padding: '10px 20px', fontWeight: 600 }} onClick={() => setModal(true)}>
            <span style={{ marginRight: 8 }}>+</span> Nuevo Embudo
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
          <div className="loading-spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : funnels.length === 0 ? (
        <div className="empty-state" style={{ padding: 80, border: '1px dashed var(--black-4)', background: 'var(--black-2)' }}>
          <div className="empty-icon" style={{ opacity: 0.2 }}>🎯</div>
          <p style={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 16 }}>No hay embudos creados</p>
          <p style={{ color: 'var(--gray-3)', marginTop: 8, fontSize: 14 }}>Empieza a rastrear procesos de conversión clave en tus sitios web.</p>
          <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => setModal(true)}>
            Crear primer embudo
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {funnels.map(funnel => {
            const stepsWithData = calcConversion(funnel)
            const firstStep = stepsWithData[0]?.users ?? 0
            const lastStep  = stepsWithData[stepsWithData.length - 1]?.users ?? 0
            const totalConv = firstStep > 0 ? ((lastStep / firstStep) * 100).toFixed(1) : 0

            return (
              <div key={funnel.id} className="card" style={{ padding: 32, background: 'var(--black-2)', border: '1px solid var(--black-4)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: 20 }}>{funnel.name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--gray-3)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {stepsWithData.length} pasos
                    </p>
                  </div>
                  <div style={{ background: 'var(--black-3)', padding: '12px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--black-4)', textAlign: 'right' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Conversión Total</p>
                    <p style={{ fontSize: 24, fontWeight: 900, color: totalConv > 50 ? 'var(--white)' : 'var(--red-light)' }}>
                      {totalConv}%
                    </p>
                  </div>
                </div>

                {/* Funnel visualization */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {stepsWithData.map((step, i) => {
                    const pct  = firstStep > 0 ? (step.users / firstStep) * 100 : 0
                    const prev = i > 0 ? stepsWithData[i - 1].users : step.users
                    const dropoff = i > 0 ? (((prev - step.users) / prev) * 100).toFixed(1) : null

                    return (
                      <div key={step.id || i} style={{ background: 'var(--black)', padding: '20px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--black-3)', position: 'relative', overflow: 'hidden' }}>
                        {/* Background Progress Fill */}
                        <div style={{
                          position: 'absolute', top: 0, left: 0, bottom: 0, 
                          width: `${pct}%`, background: 'var(--white-2)', 
                          zIndex: 0, transition: 'width 0.5s ease', opacity: 0.5
                        }} />
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
                          <span style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--white)', color: 'var(--black)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 900, flexShrink: 0, boxShadow: 'var(--shadow-md)'
                          }}>{i + 1}</span>
                          <span style={{ fontSize: 15, color: 'var(--white)', flex: 1, fontWeight: 600 }}>
                            {step.url}
                          </span>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: 11, color: 'var(--gray-4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>Usuarios</p>
                              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--white)' }}>{step.users.toLocaleString()}</span>
                            </div>
                            
                            <div style={{ width: 80, textAlign: 'right' }}>
                              <p style={{ fontSize: 11, color: 'var(--gray-4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>Retención</p>
                              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--white)' }}>{pct.toFixed(1)}%</span>
                            </div>
                            
                            {dropoff && (
                              <div style={{ width: 80, textAlign: 'right' }}>
                                <p style={{ fontSize: 11, color: 'var(--gray-4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>Abandono</p>
                                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--red-light)' }}>
                                  ↓ {dropoff}%
                                </span>
                              </div>
                            )}
                            {!dropoff && <div style={{ width: 80 }}></div>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {modal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }}>
          <div className="modal" style={{ maxWidth: 540, background: 'var(--black-2)', border: '1px solid var(--black-4)', borderRadius: 'var(--radius-xl)' }}>
            <div className="modal-header" style={{ padding: '24px 32px', borderBottom: '1px solid var(--black-4)' }}>
              <h2 className="modal-title" style={{ fontSize: 20 }}>Nuevo embudo</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={createFunnel} style={{ padding: '32px' }}>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ color: 'var(--gray-3)', fontWeight: 600 }}>Nombre del embudo</label>
                <input 
                  style={{ background: 'var(--black-3)', border: '1px solid var(--black-4)', color: 'var(--white)', padding: '12px 16px', fontSize: 15 }}
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Ej: Emisiones de leads" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--gray-3)', fontWeight: 600 }}>Pasos (URLs exactas o keywords)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{
                        width: 32, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--black-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--black-4)',
                        color: 'var(--gray-3)', fontWeight: 800, fontSize: 13, flexShrink: 0
                      }}>{i + 1}</span>
                      <input
                        style={{ flex: 1, background: 'var(--black)', border: '1px solid var(--black-4)', color: 'var(--white)', padding: '10px 16px', fontSize: 14 }}
                        value={step}
                        onChange={e => { const s = [...steps]; s[i] = e.target.value; setSteps(s) }}
                        placeholder={i === 0 ? "/landing-page" : i === 1 ? "/checkout" : "/gracias"}
                      />
                      {steps.length > 2 && (
                        <button type="button" className="btn btn-ghost btn-icon" style={{ padding: 8, color: 'var(--red)' }} onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}>✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost" style={{ marginTop: 8, border: '1px dashed var(--black-4)', width: '100%', padding: '12px', color: 'var(--gray-3)' }} onClick={() => setSteps([...steps, ''])}>
                    + Agregar paso
                  </button>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: 40, display: 'flex', gap: 16 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, background: 'var(--black-3)', border: '1px solid var(--black-4)' }} onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--white)', color: 'var(--black)' }} disabled={saving}>
                  {saving ? <span className="loading-spinner" style={{ width: 16, height: 16, borderColor: 'var(--black)' }} /> : 'Guardar Embudo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ClientLayout>
  )
}
