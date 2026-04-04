import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { AdminRoute, ClientRoute, PublicRoute } from './components/layout/ProtectedRoute.jsx'

// Auth
import Login from './pages/Login.jsx'

// Admin pages
import AdminDashboard  from './pages/admin/AdminDashboard.jsx'
import AdminClients    from './pages/admin/AdminClients.jsx'
import AdminPlans      from './pages/admin/AdminPlans.jsx'
import AdminMonitoring from './pages/admin/AdminMonitoring.jsx'
import AdminSecurity   from './pages/admin/AdminSecurity.jsx'

// Client pages
import ClientDashboard from './pages/client/ClientDashboard.jsx'
import Onboarding      from './pages/client/Onboarding.jsx'
import Heatmaps        from './pages/client/Heatmaps.jsx'
import Events          from './pages/client/Events.jsx'
import Funnels         from './pages/client/Funnels.jsx'
import Behavior        from './pages/client/Behavior.jsx'
import Segmentation    from './pages/client/Segmentation.jsx'
import ClientTeam      from './pages/client/ClientTeam.jsx'
import Integrations    from './pages/client/Integrations.jsx'
import MarketingDashboard from './pages/client/MarketingDashboard.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin" element={
          <AdminRoute><AdminDashboard /></AdminRoute>
        } />
        <Route path="/admin/clients" element={
          <AdminRoute><AdminClients /></AdminRoute>
        } />
        <Route path="/admin/plans" element={
          <AdminRoute><AdminPlans /></AdminRoute>
        } />
        <Route path="/admin/monitoring" element={
          <AdminRoute><AdminMonitoring /></AdminRoute>
        } />
        <Route path="/admin/security" element={
          <AdminRoute><AdminSecurity /></AdminRoute>
        } />

        {/* Client routes */}
        <Route path="/dashboard" element={
          <ClientRoute><ClientDashboard /></ClientRoute>
        } />
        <Route path="/onboarding" element={
          <ClientRoute><Onboarding /></ClientRoute>
        } />
        <Route path="/heatmaps" element={
          <ClientRoute><Heatmaps /></ClientRoute>
        } />
        <Route path="/events" element={
          <ClientRoute><Events /></ClientRoute>
        } />
        <Route path="/funnels" element={
          <ClientRoute><Funnels /></ClientRoute>
        } />
        <Route path="/behavior" element={
          <ClientRoute><Behavior /></ClientRoute>
        } />
        <Route path="/segmentation" element={
          <ClientRoute><Segmentation /></ClientRoute>
        } />
        <Route path="/team" element={
          <ClientRoute><ClientTeam /></ClientRoute>
        } />
        <Route path="/integrations" element={
          <ClientRoute><Integrations /></ClientRoute>
        } />
        <Route path="/marketing" element={
          <ClientRoute><MarketingDashboard /></ClientRoute>
        } />

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
