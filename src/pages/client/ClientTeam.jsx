import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'

export default function ClientTeam() {
  const { user, profile } = useAuth()
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  
  const [form, setForm] = useState({
    nombre: '', email: '', password: ''
  })

  // user.id here is the parent client id, perfectly matching subaccount logic
  useEffect(() => { if (user) fetchTeam() }, [user])

  async function fetchTeam() {
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('api_key', `SUBACCOUNT:${user.id}`)
      .order('created_at', { ascending: false })
    
    setTeam(data ?? [])
    setLoading(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    
    // We create a new "client" row but with API key as SUBACCOUNT pointer
    const { error } = await supabase.from('clients').insert({
      nombre: form.nombre,
      email: form.email,
      password: form.password,
      plan: profile.plan || 'free', // match parent plan just in case
      estado: 'active',
      api_key: `SUBACCOUNT:${user.id}`,
    })
    
    setSaving(false)
    if (error) { 
      showToast(`Error: ${error.message}`, 'error')
      return 
    }
    
    showToast('Usuario agregado correctamente')
    setModal(false)
    setForm({ nombre: '', email: '', password: '' })
    fetchTeam()
  }

  async function handleDelete(memberId) {
    if (!confirm('¿Estás seguro de eliminar a este usuario? Ya no podrá acceder al panel.')) return
    
    const { error } = await supabase.from('clients').delete().eq('id', memberId)
    if (error) {
      showToast(`Error: ${error.message}`, 'error')
      return
    }
    showToast('Usuario eliminado')
    fetchTeam()
  }

  return (
    <ClientLayout>
      <div className="page-header" style={{ marginBottom: 32, borderBottom: '1px solid var(--black-4)', paddingBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>Mi Equipo</h1>
          <p className="page-subtitle" style={{ color: 'var(--gray-3)', marginTop: 8 }}>Administra quién tiene acceso a la información de tus sitios.</p>
        </div>
        {!profile.isSubUser && (
          <button className="btn btn-primary" style={{ background: 'var(--white)', color: 'var(--black)', fontWeight: 700 }} onClick={() => setModal(true)}>
            + Agregar Miembro
          </button>
        )}
      </div>

      {profile.isSubUser ? (
        <div className="empty-state" style={{ padding: 40, background: 'var(--black-2)', border: '1px solid var(--black-4)' }}>
          <p style={{ color: 'var(--gray-3)', fontSize: 14 }}>No tienes permisos para agregar usuarios al equipo.</p>
        </div>
      ) : (
        <div className="card" style={{ background: 'var(--black-2)', border: '1px solid var(--black-4)' }}>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--gray-4)' }}>Nombre</th>
                  <th style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--gray-4)' }}>Email</th>
                  <th style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--gray-4)' }}>Acceso Creado</th>
                  <th style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--gray-4)', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }} />
                  </td></tr>
                ) : team.length === 0 ? (
                  <tr><td colSpan={4}>
                    <div className="empty-state" style={{ padding: 60, border: '1px dashed var(--black-4)', background: 'transparent' }}>
                      <p style={{ color: 'var(--gray-3)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Aún no has invitado a nadie a tu equipo</p>
                    </div>
                  </td></tr>
                ) : team.map(member => (
                  <tr key={member.id} style={{ borderBottom: '1px solid var(--black-4)' }}>
                    <td style={{ fontWeight: 600, color: 'var(--white)' }}>{member.nombre}</td>
                    <td style={{ color: 'var(--gray-3)' }}>{member.email}</td>
                    <td style={{ color: 'var(--gray-4)' }}>
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-sm" style={{ border: '1px solid var(--black-4)', background: 'transparent', color: 'var(--white)' }} onClick={() => handleDelete(member.id)}>
                        Remover Acceso
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal" style={{ background: 'var(--black-2)', border: '1px solid var(--black-4)' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--white)' }}>Invitar a un usuario</h2>
              <button className="modal-close" style={{ color: 'var(--white)' }} onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--gray-3)' }}>Nombre</label>
                <input 
                  style={{ background: 'var(--black-3)', border: '1px solid var(--black-4)', color: 'var(--white)' }}
                  value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Juan Pérez" required 
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--gray-3)' }}>Email</label>
                <input 
                  type="email" style={{ background: 'var(--black-3)', border: '1px solid var(--black-4)', color: 'var(--white)' }}
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="juan@empresa.com" required 
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--gray-3)' }}>Contraseña</label>
                <input 
                  type="text" style={{ background: 'var(--black-3)', border: '1px solid var(--black-4)', color: 'var(--white)' }}
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Definir contraseña temporal" required 
                />
              </div>
              <div className="form-actions" style={{ marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" style={{ background: 'transparent', border: '1px solid var(--black-4)', color: 'var(--gray-3)' }} onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--white)', color: 'var(--black)' }} disabled={saving}>
                  {saving ? <span className="loading-spinner" style={{ width: 16, height: 16 }} /> : 'Dar Acceso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`} style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--black-4)', background: 'var(--white)', color: 'var(--black)' }}>
             {toast.msg}
          </div>
        </div>
      )}
    </ClientLayout>
  )
}
