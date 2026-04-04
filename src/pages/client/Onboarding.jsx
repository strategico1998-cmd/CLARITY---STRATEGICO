import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientLayout } from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'

export default function Onboarding() {
  const { user } = useAuth()
  const [client, setClient]   = useState(null)
  const [sites, setSites]     = useState([])
  const [modal, setModal]     = useState(false)
  const [delModal, setDelModal] = useState(null)
  const [dominio, setDominio] = useState('')
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState(null)
  const [copied, setCopied]   = useState(null)
  const [expanded, setExpanded] = useState({}) // {siteId: boolean}

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    const { data: c } = await supabase
      .from('clients')
      .select('*')
      .eq('id', user.id)
      .single()
    setClient(c)

    if (c) {
      const { data: s } = await supabase
        .from('sites')
        .select('*')
        .eq('client_id', c.id)
        .order('created_at', { ascending: false })
      setSites(s ?? [])
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCreateSite(e) {
    e.preventDefault()
    if (!client) return
    setSaving(true)
    const { error } = await supabase.from('sites').insert({
      client_id: client.id,
      dominio: dominio.replace(/https?:\/\//, '').replace(/\/$/, ''),
    })
    setSaving(false)
    if (error) { showToast('Error al crear sitio', 'error'); return }
    showToast('Sitio creado correctamente')
    setModal(false)
    setDominio('')
    fetchData()
  }

  async function deleteSite(id) {
    await supabase.from('sites').delete().eq('id', id)
    showToast('Sitio eliminado')
    setDelModal(null)
    fetchData()
  }

  function copyToClipboard(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function getScript(apiKey) {
    // Si estás en desarrollo usa localhost, pero asegúrate de que el cliente final use tu URL de producción
    const domain = window.location.origin.includes('localhost') 
      ? 'https://TU-DOMINIO-REAL.vercel.app' // << REEMPLAZA ESTO CON TU URL DE PRODUCCIÓN
      : window.location.origin;

    return `<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="${domain}/tracker.js?id="+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${apiKey}");
</script>`
  }

  return (
    <ClientLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sitios web</h1>
          <p className="page-subtitle">Gestiona tus dominios y obtén el script de integración</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          ➕ Agregar sitio
        </button>
      </div>

      {/* API Key card */}
      {client && (
        <div className="card section" style={{ background: 'linear-gradient(135deg, var(--black-3) 0%, var(--black-2) 100%)', borderColor: 'var(--black-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>🔑</span>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--white)' }}>Tu API Key</p>
              <p style={{ fontSize: 12, color: 'var(--gray-3)' }}>Usa esta clave en el script de tracking</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <code style={{
              flex: 1, background: 'var(--black)', border: '1px solid var(--black-5)',
              borderRadius: 'var(--radius-md)', padding: '10px 14px',
              color: 'var(--white)', fontSize: 13, fontFamily: 'Courier New, monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {client.api_key ?? 'Sin API key asignada'}
            </code>
            <button
              className="btn btn-secondary"
              onClick={() => copyToClipboard(client.api_key, 'apikey')}
            >
              {copied === 'apikey' ? '✅ Copiado' : '📋 Copiar'}
            </button>
          </div>
        </div>
      )}

      {/* Sites list */}
      {sites.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌐</div>
          <p>No tienes sitios registrados aún</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModal(true)}>
            Crear primer sitio
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sites.map(site => (
            <div key={site.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)',
                    background: 'var(--black-4)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 20
                  }}>🌐</div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 16 }}>{site.dominio}</p>
                    <p style={{ fontSize: 12, color: 'var(--gray-3)' }}>
                      ID: {site.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => setDelModal(site)}>
                  🗑️ Eliminar
                </button>
              </div>

              {/* Integration script section - Collapsible */}
              <div style={{ marginTop: 12 }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => toggleExpand(site.id)}
                  style={{ 
                    width: '100%', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'var(--black-3)',
                    border: '1px solid var(--black-4)',
                    color: 'var(--gray-3)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontSize: 11
                  }}
                >
                  <span>{expanded[site.id] ? '🔼 Ocultar Script' : '🔽 Ver Script de Integración'}</span>
                  <span style={{ fontSize: 10, opacity: 0.5 }}>{expanded[site.id] ? 'COLAPSAR' : 'DESPLEGAR'}</span>
                </button>

                {expanded[site.id] && (
                  <div style={{ 
                    marginTop: 16, 
                    padding: '20px', 
                    background: 'var(--black)', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--black-4)',
                    animation: 'slideDown 0.3s ease-out'
                  }}>
                    <div className="code-block" style={{ position: 'relative' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, zIndex: 10 }}
                        onClick={() => copyToClipboard(getScript(client?.api_key), `script-${site.id}`)}
                      >
                        {copied === `script-${site.id}` ? '✅ Copiado' : '📋'}
                      </button>
                      <pre style={{ 
                        whiteSpace: 'pre-wrap', 
                        color: 'var(--white)', 
                        fontSize: 12, 
                        maxHeight: 400, 
                        overflowY: 'auto',
                        paddingRight: 40
                      }}>
                        {getScript(client?.api_key ?? 'TU_API_KEY')}
                      </pre>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--gray-3)', marginTop: 16 }}>
                      📌 Pega este script dentro de <code style={{ color: 'var(--red-light)' }}>&lt;head&gt;</code> de tu sitio web
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        </div>
      )}

      {/* Create modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title">Agregar sitio web</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSite}>
              <div className="form-group">
                <label className="form-label">Dominio</label>
                <input
                  value={dominio}
                  onChange={e => setDominio(e.target.value)}
                  placeholder="miempresa.com"
                  required
                />
                <p style={{ fontSize: 11, color: 'var(--gray-3)', marginTop: 4 }}>
                  Sin https:// ni www
                </p>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="loading-spinner" style={{ width: 16, height: 16 }} /> : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {delModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title">⚠️ Eliminar sitio</h2>
              <button className="modal-close" onClick={() => setDelModal(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--gray-3)', marginBottom: 24 }}>
              ¿Eliminar <strong style={{ color: 'var(--white)' }}>{delModal.dominio}</strong>? Se perderán todas las sesiones y eventos.
            </p>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setDelModal(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => deleteSite(delModal.id)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </ClientLayout>
  )
}
