import { AdminLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'

export default function AdminSecurity() {
  const { profile } = useAuth()

  const roles = [
    { name: 'admin', description: 'Acceso total al sistema. Gestión de clientes, planes y monitoreo.', color: 'var(--red-light)', icon: '🔐' },
    { name: 'client', description: 'Acceso solo a sus propios sitios, sesiones y eventos.', color: 'var(--blue)', icon: '👤' },
  ]

  const policies = [
    { table: 'clients', policy: 'Admin ve todos. Cliente ve solo el suyo (owner_id = user_id).' },
    { table: 'sites', policy: 'Admin ve todos. Cliente ve solo sus sitios.' },
    { table: 'sessions', policy: 'Filtrado por site_id perteneciente al cliente.' },
    { table: 'events', policy: 'Filtrado por session_id → site_id → client_id del usuario.' },
  ]

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Seguridad</h1>
          <p className="page-subtitle">Roles, permisos y políticas de Row Level Security</p>
        </div>
        <span className="badge badge-green" style={{ padding: '8px 16px', fontSize: 12 }}>
          ✅ RLS Activo
        </span>
      </div>

      {/* Current user */}
      <div className="card section" style={{ background: 'var(--red-muted)', border: '1px solid rgba(229,57,53,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 32 }}>🛡️</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>Sesión activa</p>
            <p style={{ color: 'var(--gray-4)', marginTop: 4 }}>
              {profile?.email} — rol: <strong style={{ color: 'var(--red-light)' }}>{profile?.role ?? 'admin'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Roles */}
      <div className="section">
        <h2 className="section-title">👥 Roles del sistema</h2>
        <div className="grid-2">
          {roles.map(r => (
            <div key={r.name} className="card" style={{ borderLeft: `3px solid ${r.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{r.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: r.color, textTransform: 'capitalize' }}>{r.name}</span>
              </div>
              <p style={{ color: 'var(--gray-4)', fontSize: 13 }}>{r.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RLS Policies */}
      <div className="section">
        <h2 className="section-title">🔒 Políticas RLS por tabla</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tabla</th>
                <th>Política de acceso</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {policies.map(p => (
                <tr key={p.table}>
                  <td><code style={{ color: 'var(--red-light)', background: 'var(--red-muted)', padding: '2px 8px', borderRadius: 4 }}>{p.table}</code></td>
                  <td style={{ color: 'var(--gray-4)' }}>{p.policy}</td>
                  <td><span className="badge badge-green">Activa</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security features */}
      <div className="grid-3">
        {[
          { icon: '🔑', title: 'API Keys', desc: 'Generadas criptográficamente por cliente. Único acceso al tracker.' },
          { icon: '🛡️', title: 'Row Level Security', desc: 'Aislamiento total entre clientes a nivel de base de datos.' },
          { icon: '🔐', title: 'JWT Auth', desc: 'Autenticación vía Supabase Auth con tokens firmados.' },
        ].map(f => (
          <div key={f.title} className="card">
            <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: 'var(--gray-4)' }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
