import { useEffect, useState, useMemo } from 'react'
import { ClientLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'
import { getMarketingData, syncMarketingData } from '../../api/marketing'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function MarketingDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [clientId, setClientId] = useState(null)
  
  // Filtros
  const [days, setDays] = useState(30)
  const [platform, setPlatform] = useState('all')

  useEffect(() => {
    if (user) {
      import('../../lib/supabase').then(({ supabase }) => {
        supabase.from('clients').select('id').eq('owner_id', user.id).single()
          .then(({ data }) => {
            if (data?.id) setClientId(data.id)
            else setClientId(user.id)
          })
      })
    }
  }, [user])

  useEffect(() => {
    if (clientId) fetchData()
  }, [clientId, days, platform])

  async function fetchData() {
    setLoading(true)
    const res = await getMarketingData({ clientId, days, platform })
    if (res.success) {
      setData(res.data)
    }
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    const res = await syncMarketingData(clientId)
    if (res.success) {
      alert("Sincronización exitosa: " + res.msg)
      await fetchData()
    } else {
      alert("Error al sincronizar: " + res.error)
    }
    setSyncing(false)
  }

  // Agregaciones
  const metrics = useMemo(() => {
    const agg = {
      impressions: 0, reach: 0, clicks: 0, landing_page_views: 0,
      add_to_cart: 0, checkout: 0, purchases: 0, revenue: 0,
      conversions: 0, users: 0, sessions: 0, 
    }
    data.forEach(d => {
      Object.keys(agg).forEach(k => {
        if (d[k]) agg[k] += Number(d[k])
      })
    })

    // Calcular promedios para tasas
    const ctr = agg.impressions > 0 ? ((agg.clicks / agg.impressions) * 100).toFixed(2) : 0
    const frequency = agg.reach > 0 ? (agg.impressions / agg.reach).toFixed(2) : 0
    const cpm = agg.impressions > 0 ? ((agg.revenue / (agg.impressions / 1000))).toFixed(2) : 0

    return { ...agg, ctr, frequency, cpm }
  }, [data])

  // Datos para gráfica agrupados por fecha
  const chartData = useMemo(() => {
    const map = {}
    data.forEach(d => {
      if (!map[d.date]) map[d.date] = { date: d.date, clicks: 0, purchases: 0, conversions: 0 }
      map[d.date].clicks += Number(d.clicks || 0)
      map[d.date].purchases += Number(d.purchases || 0)
      map[d.date].conversions += Number(d.conversions || 0)
    })
    return Object.values(map).sort((a,b) => new Date(a.date) - new Date(b.date))
  }, [data])

  return (
    <ClientLayout>
      <div className="page-header fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h1 className="page-title">Marketing Hub</h1>
            <p className="page-subtitle">
              Visualización unificada de rendimiento publicitario multicanal.
            </p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={handleSync}
            disabled={syncing || !clientId}
            style={{ padding: '12px 24px', letterSpacing: '0.05em' }}
          >
            {syncing ? (
              <>
                <span className="shimmer" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #fff' }}></span>
                Sincronizando...
              </>
            ) : 'Actualizar Datos'}
          </button>
        </div>
      </div>

      {/* Filtros Premium */}
      <div className="fade-in" style={{ display: 'flex', gap: 12, marginBottom: 40, padding: '4px', background: 'var(--white-2)', borderRadius: '12px', width: 'fit-content' }}>
        {[30, 60, 90].map(d => (
          <button 
            key={d} 
            onClick={() => setDays(d)}
            style={{ 
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: days === d ? 'var(--black)' : 'transparent',
              color: days === d ? 'var(--white)' : 'var(--gray-3)',
              fontSize: 12, fontWeight: 600, transition: 'all 0.3s'
            }}
          >
            {d} Días
          </button>
        ))}
        <div style={{ width: 1, background: 'var(--gray-1)', margin: '4px 8px' }}></div>
        <select 
          value={platform} onChange={e => setPlatform(e.target.value)}
          style={{ 
            background: 'transparent', color: 'var(--black)', border: 'none',
            padding: '8px 12px', fontSize: 12, fontWeight: 600, outline: 'none', borderRadius: '8px'
          }}
        >
          <option value="all">Todas las Fuentes</option>
          <option value="facebook">Meta Ads</option>
          <option value="tiktok">TikTok Ads</option>
          <option value="linkedin">LinkedIn</option>
          <option value="google_ads">Google Ads</option>
        </select>
      </div>

      {loading ? (
        <div className="grid-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="card card-glass shimmer" style={{ height: 120 }}></div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="card card-glass fade-in" style={{ padding: 80, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>🔌</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--black)' }}>Sin Datos Disponibles</h2>
          <p style={{ color: 'var(--gray-3)', marginTop: 12, maxWidth: 400, marginInline: 'auto' }}>
            Conecta tus plataformas en la sección de Integraciones para comenzar a visualizar tu rendimiento.
          </p>
          <button className="btn btn-secondary" style={{ marginTop: 32 }} onClick={() => window.location.href='/integrations'}>
            Ir a Integraciones
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {/* Dashboard Metrics Grid */}
          <div className="grid-4 fade-in">
            <MetricCard title="Alcance Total" value={metrics.reach.toLocaleString()} trend="+12.4%" />
            <MetricCard title="Clicks" value={metrics.clicks.toLocaleString()} trend="+5.2%" />
            <MetricCard title="Conversiones" value={metrics.conversions.toLocaleString()} trend="+8.1%" color="var(--success)" />
            <MetricCard title="Inversión" prefix="$" value={metrics.revenue.toLocaleString()} trend="-2.4%" />
          </div>

          <div className="grid-3 fade-in" style={{ gridTemplateColumns: '1fr 2fr' }}>
            <div className="card card-glass" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-3)', marginBottom: 24 }}>Rendimiento Secundario</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <SmallMetric label="CTR Promedio" value={`${metrics.ctr}%`} />
                <SmallMetric label="Frecuencia" value={`${metrics.frequency}x`} />
                <SmallMetric label="CPM Promedio" value={`$${metrics.cpm}`} />
                <SmallMetric label="ROAS Est." value="3.4x" />
              </div>
            </div>

            {/* Chart Area */}
            <div className="card card-glass" style={{ padding: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)' }}>Tendencia de Clics y Conversiones</h3>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--gray-3)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--black)' }}></div> Clics
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--gray-3)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></div> Conversiones
                  </div>
                </div>
              </div>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <defs>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--black)" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="var(--black)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-1)" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', backdropFilter: 'blur(10px)', color: '#fff', fontSize: '11px' }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{ stroke: 'var(--gray-1)' }}
                    />
                    <Line type="monotone" dataKey="clicks" stroke="var(--black)" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="conversions" stroke="var(--success)" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="card card-glass fade-in" style={{ padding: '0' }}>
            <div style={{ padding: 24, borderBottom: '1px solid var(--gray-1)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)' }}>Desglose de Campañas</h3>
            </div>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Plataforma</th>
                    <th>Campaña</th>
                    <th style={{ textAlign: 'right' }}>Alcance</th>
                    <th style={{ textAlign: 'right' }}>Conversiones</th>
                    <th style={{ textAlign: 'right' }}>ROI (Inversión)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 15).map((row) => (
                    <tr key={row.id}>
                      <td style={{ color: 'var(--gray-3)' }}>{row.date}</td>
                      <td>
                        <span className="badge" style={{ textTransform: 'capitalize' }}>{row.platform}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{row.campaign_name}</td>
                      <td style={{ textAlign: 'right' }}>{row.reach.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 700 }}>{row.conversions}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>${Number(row.revenue).toFixed(2)}</td>
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

function MetricCard({ title, value, prefix = '', trend = '', color = 'var(--black)' }) {
  return (
    <div className="card card-glass" style={{ padding: 24, borderLeft: `4px solid ${color}` }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>{title}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--black)', letterSpacing: '-0.04em' }}>
          {prefix}{value}
        </h2>
        {trend && (
          <span style={{ 
            fontSize: 11, fontWeight: 700, color: trend.startsWith('+') ? '#00c853' : '#ff3d00',
            background: trend.startsWith('+') ? '#00c85310' : '#ff3d0010',
            padding: '2px 8px', borderRadius: '4px'
          }}>
            {trend}
          </span>
        )}
      </div>
    </div>
  )
}

function SmallMetric({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--gray-3)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>{value}</span>
    </div>
  )
}
