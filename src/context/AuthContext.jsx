import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    // Desarrollo local: Bypass para ADMIN
    if (email === 'admin@clarity.app' && password === 'admin1234') {
      const mockUser = { id: 'admin-id', email: 'admin@clarity.app' }
      const mockProfile = { id: 'admin-id', email: 'admin@clarity.app', role: 'admin' }
      setUser(mockUser)
      setProfile(mockProfile)
      setLoading(false)
      return { user: mockUser, profile: mockProfile }
    }

    // Lógica para CLIENTES: Buscar en la tabla 'clients'
    const { data: clientData, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .eq('estado', 'active')
      .single()

    if (clientData && !clientErr) {
      // Si es un sub-usuario del equipo, su api_key contiene el ID del cliente padre.
      let assignedId = clientData.id
      let isSub = false
      if (clientData.api_key && clientData.api_key.startsWith('SUBACCOUNT:')) {
        assignedId = clientData.api_key.split(':')[1]
        isSub = true
      }

      const mockUser = { id: assignedId, email: clientData.email, sub_id: isSub ? clientData.id : null }
      const mockProfile = { ...clientData, role: 'client', isSubUser: isSub }
      setUser(mockUser)
      setProfile(mockProfile)
      setLoading(false)
      return { user: mockUser, profile: mockProfile }
    }

    if (clientErr) console.error('Login error:', clientErr)

    // Si falla lo anterior, intentar Auth real de Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error(`Acceso fallido: Verifica tu email y contraseña.`)
    }
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  // Real roles based on DB profile
  const isAdmin = profile?.role === 'admin'
  const isClient = profile?.role === 'client'

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isClient, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
