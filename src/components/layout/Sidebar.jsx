import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { 
  IconDashboard, IconClients, IconPlans, IconMonitoring, 
  IconSecurity, IconWeb, IconHeatmap, IconFunnel, 
  IconBehavior, IconSearch, IconLogout 
} from '../icons/Icons.jsx'

const IconRecording = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
)
import './Sidebar.css'

const adminNav = [
  { to: '/admin',           label: 'Dashboard',    icon: <IconDashboard /> },
  { to: '/admin/clients',   icon: <IconClients />, label: 'Clientes' },
  { to: '/admin/monitoring',icon: <IconMonitoring />, label: 'Monitoreo' },
  { to: '/admin/security',  icon: <IconSecurity />, label: 'Seguridad' },
]

const clientNav = [
  { to: '/dashboard',       label: 'Dashboard',      icon: <IconDashboard /> },
  { to: '/onboarding',      label: 'Sitios',         icon: <IconWeb /> },
  { to: '/heatmaps',        label: 'Heatmaps',       icon: <IconHeatmap /> },
  { to: '/recordings',      label: 'Grabaciones',    icon: <IconRecording /> },
  { to: '/events',          label: 'Eventos',        icon: <IconPlans /> },
  { to: '/funnels',         label: 'Embudos',        icon: <IconFunnel /> },
  { to: '/behavior',        label: 'Comportamiento', icon: <IconBehavior /> },
  { to: '/segmentation',    label: 'Segmentación',   icon: <IconSearch /> },
  { to: '/integrations',    label: 'Integraciones',  icon: <IconWeb /> },
  { to: '/marketing',       label: 'Marketing Data', icon: <IconDashboard /> },
  { to: '/team',            label: 'Equipo y Accesos', icon: <IconClients /> },
]

export default function Sidebar({ role = 'client' }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const navItems = role === 'admin' ? adminNav : clientNav

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">S</div>
        <div>
          <span className="sidebar-logo-name">Sapiens</span>
          <span className="sidebar-logo-tag">{role === 'admin' ? 'Admin' : 'Analytics'}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">
          {role === 'admin' ? 'ADMINISTRACIÓN' : 'ANALÍTICA'}
        </p>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin' || item.to === '/dashboard'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {profile?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="sidebar-user-info">
            <p className="sidebar-user-name">{profile?.email ?? 'Usuario'}</p>
            <p className="sidebar-user-role">{role}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sidebar-logout" onClick={toggleTheme} title="Cambiar Tema">
            {theme === 'light' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="18.36" x2="5.64" y2="16.92"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            )}
          </button>
          <button className="sidebar-logout" onClick={handleSignOut} title="Cerrar sesión">
            <IconLogout />
          </button>
        </div>
      </div>
    </aside>
  )
}
