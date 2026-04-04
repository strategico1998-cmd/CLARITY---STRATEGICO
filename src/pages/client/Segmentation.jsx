import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { IconWeb, IconSearch } from '../../components/icons/Icons.jsx'

const COLORS = ['#000000', '#222222', '#444444', '#666666', '#888888', '#aaaaaa', '#cccccc', '#eeeeee']

export default function Segmentation() {
  const { user } = useAuth()
  const [siteId, setSiteId]   = useState(null)
  const [sites, setSites]     = useState([])
  const [byCountry, setByCountry] = useState([])
  const [byDevice, setByDevice]   = useState([])
  const [bySource, setBySource]   = useState([])
  const [sessionsData, setSessionsData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchSites() }, [user])
  useEffect(() => { if (siteId) fetchSegmentation() }, [siteId])

  async function fetchSites() {
    const { data: c } = await supabase.from('clients').select('id').eq('id', user.id).single()
    if (!c) return
    const { data: s } = await supabase.from('sites').select('id, dominio').eq('client_id', c.id)
    setSites(s ?? [])
    if (s?.[0]) setSiteId(s[0].id)
  }

  async function fetchSegmentation() {
    setLoading(true)
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, country, device, os, browser')
      .eq('site_id', siteId)
      
    setSessionsData(sessions || [])

    // Group by country
    const countryMap = {}
    sessions?.forEach(s => {
      const c = s.country ?? 'Unknown'
      countryMap[c] = (countryMap[c] ?? 0) + 1
    })
    setByCountry(
      Object.entries(countryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }))
    )

    // Group by device
    const deviceMap = {}
    sessions?.forEach(s => {
      const d = s.device ?? 'Unknown'
      deviceMap[d] = (deviceMap[d] ?? 0) + 1
    })
    setByDevice(Object.entries(deviceMap).map(([name, value]) => ({ name, value })))

    // Source from events metadata
    const { data: pgEvents } = await supabase
      .from('events')
      .select('metadata')
      .in('session_id', sessions?.map(s => s.id) ?? [])
      .eq('event_type', 'pageview')

    const sourceMap = {}
    pgEvents?.forEach(e => {
      const ref = e.metadata?.referrer ?? 'Direct'
      let src = 'Direct'
      if (ref.includes('google')) src = 'Google'
      else if (ref.includes('facebook') || ref.includes('instagram')) src = 'Social'
      else if (ref.includes('t.co') || ref.includes('twitter')) src = 'Twitter'
      else if (ref !== 'Direct') src = 'Referral'
      sourceMap[src] = (sourceMap[src] ?? 0) + 1
    })
    setBySource(Object.entries(sourceMap).map(([name, value]) => ({ name, value })))

    setLoading(false)
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="card card-sm" style={{ minWidth: 160, backgroundColor: 'var(--white)', borderColor: 'var(--gray-1)', boxShadow: 'var(--shadow-lg)' }}>
        <p style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--black)', marginBottom: 8 }}>{payload[0].name}</p>
        <p style={{ color: 'var(--gray-3)', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          <span>Sesiones:</span> <strong style={{ color: 'var(--black)' }}>{payload[0].value.toLocaleString()}</strong>
        </p>
      </div>
    )
  }

  // Fallback demo data
  const countries = byCountry.length > 0 ? byCountry : [
    { name: 'México', value: 455 }, { name: 'España', value: 312 },
    { name: 'Colombia', value: 198 }, { name: 'Argentina', value: 145 },
    { name: 'USA', value: 98 },
  ]
  const aggregate = (key) => {
    const map = {}
    sessionsData.forEach(s => {
      const val = s[key] ?? 'Unknown'
      map[val] = (map[val] ?? 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }

  const devicesData = aggregate('device')
  const osData = aggregate('os')
  const browsersData = aggregate('browser')

  return (
    <ClientLayout>
      <div className="page-header" style={{ marginBottom: 32, borderBottom: '1px solid var(--black-4)', paddingBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>Segmentación de Audiencia</h1>
          <p className="page-subtitle" style={{ color: 'var(--gray-3)', marginTop: 8 }}>
            Análisis demográfico y tecnológico de los visitantes.
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

      {loading ? (
        <div style={{ padding: 100, display: 'flex', justifyContent: 'center' }}>
          <div className="loading-spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : sessionsData.length === 0 ? (
        <div className="empty-state" style={{ padding: 80, border: '1px dashed var(--black-4)', background: 'var(--black-2)' }}>
          <div className="empty-icon" style={{ opacity: 0.2 }}>📊</div>
          <p style={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 16 }}>No hay datos suficientes</p>
          <p style={{ color: 'var(--gray-3)', marginTop: 8, fontSize: 14 }}>Se requiere que los usuarios interactúen con el sitio web.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, paddingBottom: 60 }}>
          {/* Dispositivos */}
          <div className="card" style={{ padding: 24, background: 'var(--black-2)', border: '1px solid var(--black-4)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gray-4)', marginBottom: 24 }}>Dispositivos</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={devicesData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value">
                    {devicesData.map((e, index) => <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--black)', border: '1px solid var(--black-4)', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', padding: '12px 16px' }}
                    itemStyle={{ color: 'var(--white)', fontSize: 14, fontWeight: 600, paddingTop: 4 }}
                    formatter={(value) => [`${value} sesiones`, null]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: 'var(--gray-3)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sistemas Operativos */}
          <div className="card" style={{ padding: 24, background: 'var(--black-2)', border: '1px solid var(--black-4)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gray-4)', marginBottom: 24 }}>Sistemas Operativos</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={osData} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--gray-3)', fontSize: 13, fontWeight: 600 }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ background: 'var(--black)', border: '1px solid var(--black-4)', borderRadius: 'var(--radius-lg)' }} 
                    itemStyle={{ color: 'var(--white)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {osData.map((e, i) => <Cell key={`os-${i}`} fill={COLORS[i % COLORS.length]} />)}
                    <LabelList dataKey="value" position="right" fill="var(--gray-3)" fontSize={12} fontWeight={700} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Navegadores */}
          <div className="card" style={{ padding: 24, background: 'var(--black-2)', border: '1px solid var(--black-4)', gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gray-4)', marginBottom: 24 }}>Navegadores ({sessionsData.length} sesiones)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {browsersData.map(({ name, value }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--black)', borderRadius: 'var(--radius-md)', border: '1px solid var(--black-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>{name}</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--gray-2)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ClientLayout>
  )
}
