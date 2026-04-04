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
      <div className="page-header" style={{ marginBottom: 32, borderBottom: '1px solid var(--black-4)', paddingBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Marketing Data</h1>
            <p className="page-subtitle" style={{ color: 'var(--gray-3)', marginTop: 8 }}>
              Rendimiento unificado de tus campañas publicitarias.
            </p>
          </div>
          <button 
            onClick={handleSync}
            disabled={syncing || !clientId}
            style={{
              padding: '8px 16px', borderRadius: '8px', 
              background: 'var(--white)', color: 'var(--black)', 
              border: 'none', cursor: syncing ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: 13, transition: 'all 0.2s'
            }}
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar APIs'}
          </button>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 16, marginTop: 24, alignItems: 'center' }}>
          <select 
            value={days} onChange={e => setDays(Number(e.target.value))}
            style={{ 
              background: 'var(--black-2)', color: 'var(--white)', border: '1px solid var(--black-4)',
              padding: '8px 16px', borderRadius: '6px', fontSize: 13, outline: 'none'
            }}
          >
            <option value={30}>Últimos 30 días</option>
            <option value={60}>Últimos 60 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>

          <select 
            value={platform} onChange={e => setPlatform(e.target.value)}
            style={{ 
              background: 'var(--black-2)', color: 'var(--white)', border: '1px solid var(--black-4)',
              padding: '8px 16px', borderRadius: '6px', fontSize: 13, outline: 'none'
            }}
          >
            <option value="all">Todas las plataformas</option>
            <option value="facebook">Facebook / Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="linkedin">LinkedIn</option>
            <option value="google_ads">Google Ads</option>
            <option value="google_analytics">Google Analytics</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--gray-3)', fontSize: 14 }}>Cargando datos métricos...</div>
      ) : data.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: 'var(--black-2)', border: '1px solid var(--black-4)', borderRadius: 12 }}>
          <p style={{ color: 'var(--gray-3)', fontSize: 14 }}>Sin datos en este rango o no hay plataformas conectadas.</p>
          <p style={{ color: 'var(--gray-4)', fontSize: 13, marginTop: 8 }}>Usa el botón [Sincronizar APIs] o ve a Integraciones primero.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {/* Main Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            <MetricCard title="Alcance" value={metrics.reach.toLocaleString()} />
            <MetricCard title="Frecuencia" value={metrics.frequency} suffix="x" />
            <MetricCard title="CPM" prefix="$" value={metrics.cpm} />
            <MetricCard title="CTR" value={metrics.ctr} suffix="%" />
            <MetricCard title="Clics de Enlace" value={metrics.clicks.toLocaleString()} />
            <MetricCard title="Compras" value={metrics.purchases.toLocaleString()} />
            <MetricCard title="Visitas (GA / Ads)" value={metrics.sessions.toLocaleString()} />
            <MetricCard title="Gasto Estimado" prefix="$" value={metrics.revenue.toLocaleString()} />
          </div>

          {/* Gráfica */}
          <div className="card" style={{ background: 'var(--black-2)', padding: '24px', border: '1px solid var(--black-4)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)', marginBottom: 24 }}>Evolución (Clicks vs Conversiones)</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" tick={{fill: '#888', fontSize: 11}} tickMargin={10} axisLine={false} tickLine={false}/>
                  <YAxis yAxisId="left" stroke="#666" tick={{fill: '#888', fontSize: 11}} tickMargin={10} axisLine={false} tickLine={false}/>
                  <YAxis yAxisId="right" orientation="right" stroke="#666" tick={{fill: '#888', fontSize: 11}} tickMargin={10} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12, color: '#fff' }} />
                  <Line yAxisId="left" type="monotone" dataKey="clicks" name="Clics" stroke="var(--white)" strokeWidth={2} dot={{r: 0}} activeDot={{r: 4}} />
                  <Line yAxisId="right" type="monotone" dataKey="conversions" name="Conversiones" stroke="var(--green)" strokeWidth={2} dot={{r: 0}} activeDot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ background: 'var(--black)', padding: '24px', border: '1px solid var(--black-4)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)', marginBottom: 16 }}>Desglose por Campaña</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--black-3)' }}>
                    <th style={{ padding: '12px 8px', color: 'var(--gray-4)', fontWeight: 600 }}>Fecha</th>
                    <th style={{ padding: '12px 8px', color: 'var(--gray-4)', fontWeight: 600 }}>Plataforma</th>
                    <th style={{ padding: '12px 8px', color: 'var(--gray-4)', fontWeight: 600 }}>Campaña</th>
                    <th style={{ padding: '12px 8px', color: 'var(--gray-4)', fontWeight: 600, textAlign: 'right' }}>Alcance</th>
                    <th style={{ padding: '12px 8px', color: 'var(--gray-4)', fontWeight: 600, textAlign: 'right' }}>Clics</th>
                    <th style={{ padding: '12px 8px', color: 'var(--gray-4)', fontWeight: 600, textAlign: 'right' }}>Conversiones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 50).map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--black-3)' }}>
                      <td style={{ padding: '12px 8px', color: 'var(--white)' }}>{row.date}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--gray-3)', textTransform: 'capitalize' }}>{row.platform.replace('_',' ')}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--white)' }}>{row.campaign_name || 'N/A'}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--gray-2)', textAlign: 'right' }}>{row.reach?.toLocaleString()}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--gray-2)', textAlign: 'right' }}>{row.clicks?.toLocaleString()}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--green)', textAlign: 'right', fontWeight: 600 }}>{row.conversions?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length > 50 && (
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--gray-4)' }}>
                Mostrando 50 de {data.length} registros.
              </p>
            )}
          </div>

        </div>
      )}
    </ClientLayout>
  )
}

function MetricCard({ title, value, prefix = '', suffix = '' }) {
  return (
    <div style={{ background: 'var(--black-2)', padding: '20px', borderRadius: '12px', border: '1px solid var(--black-4)' }}>
      <p style={{ fontSize: 13, color: 'var(--gray-4)', marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--white)' }}>
        {prefix}{value}{suffix}
      </p>
    </div>
  )
}
