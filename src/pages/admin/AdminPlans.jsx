import { AdminLayout } from '../../components/layout/Layout'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    color: 'var(--gray-3)',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    limits: { sites: 1, sessions: 1000, events: 10000 },
    features: ['1 sitio web', '1,000 sesiones/mes', '10,000 eventos/mes', 'Dashboard básico', 'Soporte por email'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    color: 'var(--black)',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
    popular: true,
    limits: { sites: 5, sessions: 50000, events: 500000 },
    features: ['5 sitios web', '50,000 sesiones/mes', '500,000 eventos/mes', 'Heatmaps avanzados', 'Embudos de conversión', 'Segmentación', 'Soporte prioritario'],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '$99',
    color: 'var(--black)',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3"></path><path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5"></path></svg>,
    limits: { sites: -1, sessions: -1, events: -1 },
    features: ['Sitios ilimitados', 'Sesiones ilimitadas', 'Eventos ilimitadas', 'Multi-cliente', 'API access', 'White-label', 'SLA garantizado', 'Soporte 24/7'],
  },
]

export default function AdminPlans() {
  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Planes</h1>
          <p className="page-subtitle">Configuración de planes y límites del SaaS</p>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid-3 section">
        {PLANS.map(plan => (
          <div key={plan.id} className="card" style={{
            border: plan.popular ? `2px solid var(--black)` : '1px solid var(--gray-1)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {plan.popular && (
              <div style={{
                position: 'absolute', top: 12, right: -30,
                background: 'var(--black)', color: 'var(--white)',
                padding: '4px 32px', fontSize: 10, fontWeight: 700,
                transform: 'rotate(45deg)', transformOrigin: 'center',
                letterSpacing: 1, textTransform: 'uppercase'
              }}>POPULAR</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-sm)',
                background: 'var(--white-2)', border: '1px solid var(--gray-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--black)'
              }}>{plan.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{plan.name}</div>
                <div style={{ color: 'var(--black)', fontSize: 24, fontWeight: 600 }}>{plan.price}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--gray-3)' }}>/mes</span></div>
              </div>
            </div>

            {/* Limits */}
            <div style={{ marginBottom: 20 }}>
              {[
                { label: 'Sitios', value: plan.limits.sites === -1 ? '∞' : plan.limits.sites },
                { label: 'Sesiones/mes', value: plan.limits.sessions === -1 ? '∞' : plan.limits.sessions.toLocaleString() },
                { label: 'Eventos/mes', value: plan.limits.events === -1 ? '∞' : plan.limits.events.toLocaleString() },
              ].map(l => (
                <div key={l.label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--gray-1)',
                  fontSize: 13
                }}>
                  <span style={{ color: 'var(--gray-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>{l.label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--black)' }}>{l.value}</span>
                </div>
              ))}
            </div>

            {/* Features */}
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--gray-4)', fontWeight: 500 }}>
                  <span style={{ color: 'var(--black)', opacity: 0.3 }}>•</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Summary table */}
      <div className="card">
        <h2 className="section-title">DETALLES COMPARATIVOS</h2>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Característica</th>
                <th>Free</th>
                <th>Pro</th>
                <th>Agency</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Sitios', '1', '5', 'Ilimitados'],
                ['Sesiones/mes', '1,000', '50,000', 'Ilimitadas'],
                ['Eventos/mes', '10,000', '500,000', 'Ilimitados'],
                ['Heatmaps', '—', 'YES', 'YES'],
                ['Embudos', '—', 'YES', 'YES'],
                ['Segmentación', '—', 'YES', 'YES'],
                ['API Access', '—', '—', 'YES'],
                ['White-label', '—', '—', 'YES'],
                ['Soporte', 'Email', 'Prioritario', '24/7 SLA'],
              ].map(([feat, ...vals]) => (
                <tr key={feat}>
                  <td style={{ fontWeight: 600, color: 'var(--black)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{feat}</td>
                  {vals.map((v, i) => (
                    <td key={i} style={{ 
                      color: v === '—' ? 'var(--gray-2)' : v === 'YES' ? 'var(--black)' : 'var(--gray-4)',
                      fontWeight: v === 'YES' ? 700 : 500,
                      fontSize: 13
                    }}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
