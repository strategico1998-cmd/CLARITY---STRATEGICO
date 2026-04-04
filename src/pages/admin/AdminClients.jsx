import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { AdminLayout } from '../../components/layout/Layout'
import { 
  IconSearch, IconClients, IconRefresh 
} from '../../components/icons/Icons.jsx'

const PLANS = ['free', 'pro', 'agency']
const ESTADOS = ['active', 'inactive']

export default function AdminClients() {
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null) // 'create' | 'edit' | 'delete' | 'script'
  const [selected, setSelected] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(null)

  const [form, setForm] = useState({
    nombre: '', email: '', password: '', plan: 'free', estado: 'active'
  })

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    setLoading(true)
    
    // Intento 1: Todo completo
    const { data, error } = await supabase
      .from('clients')
      .select('*, sites(count), integrations(count)')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error("Error with integrations:", error)
      
      // Intento 2: Solo sitios (como estaba antes)
      const { data: fData, error: fError } = await supabase
        .from('clients')
        .select('*, sites(count)')
        .order('created_at', { ascending: false })
        
      if (fError) {
        console.error("Error with sites (fallback):", fError)
        
        // Intento 3: Solo datos básicos (si todo falla)
        const { data: rawData, error: rawError } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false })
          
        if (rawError) console.error("Critical error:", rawError);
        setClients(rawData ?? [])
      } else {
        setClients(fData ?? [])
      }
    } else {
      setClients(data ?? [])
    }
    setLoading(false)
  }

  function openCreate() {
    setForm({ nombre: '', email: '', password: '', plan: 'free', estado: 'active' })
    setModal('create')
  }

  function openEdit(client) {
    setSelected(client)
    setForm({ 
      nombre: client.nombre, 
      email: client.email, 
      password: client.password || '', 
      plan: client.plan, 
      estado: client.estado 
    })
    setModal('edit')
  }

  function openDelete(client) {
    setSelected(client)
    setModal('delete')
  }

  function openScript(client) {
    setSelected(client)
    setModal('script')
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function generateApiKey() {
    const arr = new Uint8Array(24)
    crypto.getRandomValues(arr)
    return 'ck_' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    const api_key = await generateApiKey()
    const { error } = await supabase.from('clients').insert({
      nombre: form.nombre,
      email: form.email,
      password: form.password,
      plan: form.plan,
      estado: form.estado,
      api_key,
    })
    setSaving(false)
    if (error) { 
      showToast(`Error: ${error.message}`, 'error')
      return 
    }
    showToast('Cliente creado correctamente')
    setModal(null)
    fetchClients()
  }

  async function handleEdit(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('clients')
      .update({ 
        nombre: form.nombre, 
        email: form.email, 
        password: form.password,
        plan: form.plan, 
        estado: form.estado 
      })
      .eq('id', selected.id)
    setSaving(false)
    if (error) { showToast('Error al editar', 'error'); return }
    showToast('Cliente actualizado')
    setModal(null)
    fetchClients()
  }

  async function handleDelete() {
    setSaving(true)
    const { error } = await supabase.from('clients').delete().eq('id', selected.id)
    setSaving(false)
    if (error) { showToast(`Error: ${error.message}`, 'error'); return }
    showToast('Cliente eliminado')
    setModal(null)
    fetchClients()
  }

  async function toggleEstado(client) {
    const newEstado = client.estado === 'active' ? 'inactive' : 'active'
    await supabase.from('clients').update({ estado: newEstado }).eq('id', client.id)
    showToast(`Cliente ${newEstado === 'active' ? 'activado' : 'desactivado'}`)
    fetchClients()
  }

  const planColor = { free: 'badge-gray', pro: 'badge-blue', agency: 'badge-yellow' }
  const filtered = clients.filter(c =>
    c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDownloadExcel(client) {
    setLoading(true)
    showToast(`Generando excel para ${client ? client.nombre : 'Todos los clientes'}...`)
    try {
      let queryClients = client ? [client] : clients

      let csv = "--- REPORTE STRATEGIC ANALYTICS ---\n"
      csv += `Fecha de extraccion: ${new Date().toLocaleDateString()}\n\n`

      for (const c of queryClients) {
        const { data: sites } = await supabase.from('sites').select('*').eq('client_id', c.id)
        const siteIds = sites?.map(s => s.id) || []
        
        let sessions = []
        if (siteIds.length > 0) {
          const { data: sData } = await supabase.from('sessions').select('*').in('site_id', siteIds)
          sessions = sData || []
        }
        
        const sessionIds = sessions.map(s => s.id)
        let exactEvents = 0
        if (sessionIds.length > 0 && sessionIds.length <= 500) {
          const { count } = await supabase.from('events').select('id', { count: 'exact', head: true }).in('session_id', sessionIds)
          exactEvents = count ?? 0
        }

        csv += `==============================================\n`
        csv += `CLIENTE: ${c.nombre} (${c.email})\n`
        csv += `Plan: ${c.plan} | Estado: ${c.estado}\n`
        csv += `==============================================\n`
        csv += `Total Sitios, ${sites?.length || 0}\n`
        csv += `Total Sesiones Activas, ${sessions.length}\n`
        csv += `Total Eventos Ingresados, ${exactEvents}\n\n`
        
        csv += `-> DETALLE DE SITIOS Web\n`
        csv += `ID Sitio, Dominio (Referencia), Creado En, Sesiones Capturadas\n`
        sites?.forEach(s => {
          const s_sessions = sessions.filter(sess => sess.site_id === s.id).length
          csv += `"${s.id}", "Registrado", "${new Date(s.created_at).toLocaleDateString()}", ${s_sessions}\n`
        })
        csv += `\n`
      }

      // Add BOM to fix encoding in MS Excel
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Reporte_Mensual_${client ? client.nombre.replace(/\s+/g, '_') : 'Global'}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast('Reporte(s) generado(s) correctamente', 'success')
    } catch(err) {
      showToast('Error generando archivo', 'error')
    }
    setLoading(false)
  }

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Clientes</h1>
          <p className="page-subtitle">{clients.length} clientes registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="search-bar" style={{ border: '1px solid var(--gray-1)', background: 'var(--white)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ opacity: 0.3 }}><IconSearch /></div>
            <input
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ color: 'var(--black)' }}
            />
          </div>
          <button className="btn btn-secondary" onClick={() => handleDownloadExcel(null)} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--gray-1)', background: 'var(--white)' }} title="Descargar reporte global en Excel/CSV">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--black)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Reporte Global
          </button>
          <button className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconClients /> Nuevo cliente
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Sitios</th>
              <th>Integraciones</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>
                <div className="loading-spinner" style={{ margin: '0 auto' }} />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="empty-icon" style={{ opacity: 0.2 }}><IconClients /></div>
                  <p style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 11, color: 'var(--gray-3)' }}>No hay clientes registrados</p>
                </div>
              </td></tr>
            ) : filtered.map(client => (
              <tr key={client.id}>
                <td style={{ fontWeight: 600 }}>{client.nombre}</td>
                <td style={{ color: 'var(--gray-4)' }}>{client.email}</td>
                <td><span className={`badge ${planColor[client.plan] ?? 'badge-gray'}`}>{client.plan}</span></td>
                <td>{client.sites?.[0]?.count ?? 0}</td>
                <td>{client.integrations?.[0]?.count ?? 0}</td>
                <td>
                  <span className={`badge ${client.estado === 'active' ? 'badge-green' : 'badge-red'}`}>
                    {client.estado}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(client)} title="Editar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDownloadExcel(client)} title="Descargar Metricas Excel">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleEstado(client)} 
                      title={client.estado === 'active' ? 'Desactivar' : 'Activar'}>
                      {client.estado === 'active' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      )}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openScript(client)} title="Ver Código">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => openDelete(client)} title="Eliminar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`} style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-1)', background: 'var(--white)', color: 'var(--black)', boxShadow: 'var(--shadow-lg)', fontWeight: 600, fontSize: 12 }}>
             {toast.msg}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{modal === 'create' ? 'Nuevo cliente' : 'Editar cliente'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={modal === 'create' ? handleCreate : handleEdit}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Empresa Inc." required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="cliente@empresa.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña de acceso</label>
                <input type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Definir contraseña" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Plan</label>
                  <select value={form.plan} onChange={e => setForm({...form, plan: e.target.value})}>
                    {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                    {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="loading-spinner" style={{ width: 16, height: 16 }} /> : modal === 'create' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {modal === 'delete' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title">⚠️ Eliminar cliente</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--gray-3)', marginBottom: 24, fontSize: 13, fontWeight: 500 }}>
              ¿CONFIRMAS LA ELIMINACIÓN DE <strong style={{ color: 'var(--black)' }}>{selected?.nombre}</strong>?
            </p>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setModal(null)} style={{ border: '1px solid var(--gray-1)' }}>CANCELAR</button>
              <button className="btn btn-primary" style={{ background: 'var(--gray-5)', color: 'var(--white)' }} onClick={handleDelete} disabled={saving}>
                {saving ? <span className="loading-spinner" style={{ width: 16, height: 16 }} /> : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script Modal */}
      {modal === 'script' && selected && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
              <h2 className="modal-title">Código de Integración</h2>
              <button className="modal-close" onClick={() => setModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <p style={{ color: 'var(--gray-3)', marginBottom: 24, fontSize: 13 }}>
              Copia este código y pégalo justo antes del cierre de la etiqueta <code>&lt;/head&gt;</code> en el sitio web de <strong style={{color: 'var(--black)'}}>{selected.nombre}</strong>.
            </p>
            <div style={{ background: 'var(--white-2)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-1)', overflowX: 'auto', marginBottom: 24 }}>
              <pre style={{ margin: 0, fontSize: 12, color: 'var(--black)' }}>
{`<script>
  window.STRATEGIC_ANALYTICS_CLIENT_ID = "${selected.id}";
  window.STRATEGIC_ANALYTICS_API_KEY = "${selected.api_key}";
</script>
<script src="https://cdntracker.strategic.com/v1/tracker.js" async></script>`}
              </pre>
            </div>
            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => {
                navigator.clipboard.writeText(`<script>\n  window.STRATEGIC_ANALYTICS_CLIENT_ID = "${selected.id}";\n  window.STRATEGIC_ANALYTICS_API_KEY = "${selected.api_key}";\n</script>\n<script src="https://cdntracker.strategic.com/v1/tracker.js" async></script>`)
                showToast('Código copiado al portapapeles')
                setModal(null)
              }}>
                Copiar Código
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
