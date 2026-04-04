import Sidebar from './Sidebar.jsx'
import './Layout.css'

export function AdminLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar role="admin" />
      <main className="app-main">
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  )
}

export function ClientLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar role="client" />
      <main className="app-main">
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  )
}
