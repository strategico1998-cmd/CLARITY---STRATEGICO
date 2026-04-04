import { supabase } from '../lib/supabase'

/**
 * Módulo de API simulado para conexión con Marketing y OAuth.
 * Se comunica directamente con Supabase (Serverless auth).
 */

// 1. OAUTH Y CONEXIONES (INTEGRACIONES)

export async function connectIntegration(clientId, platform) {
  try {
    // Simulamos un flujo OAuth exitoso con un retraso de 1 segundo:
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const fakeAccessToken = `mock_access_token_${platform}_${Date.now()}`
    
    // Upsert a public.integrations
    const { data, error } = await supabase
      .from('integrations')
      .upsert({
        client_id: clientId,
        platform: platform,
        access_token: fakeAccessToken,
        account_id: `acc_${Math.floor(Math.random() * 10000)}`
      }, { onConflict: 'client_id,platform' })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error(`Error connectIntegration ${platform}:`, err)
    return { success: false, error: err.message }
  }
}

export async function disconnectIntegration(clientId, platform) {
  try {
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('client_id', clientId)
      .eq('platform', platform)
      
    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error(`Error disconnectIntegration ${platform}:`, err)
    return { success: false, error: err.message }
  }
}

export async function getIntegrations(clientId) {
  try {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('client_id', clientId)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err) {
    console.error("Error getIntegrations:", err)
    return { success: false, error: err.message }
  }
}

// 2. DASHBOARD DE MARKETING (DATOS)

export async function getMarketingData({ clientId, days = 30, platform = 'all' }) {
  try {
    let query = supabase
      .from('marketing_data')
      .select('*')
      .eq('client_id', clientId)

    if (platform !== 'all') {
      query = query.eq('platform', platform)
    }

    // Filtrar por fecha
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]
    
    query = query.gte('date', startDateStr)
    // Para simplificar ordenamos por date desc
    query = query.order('date', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    
    return { success: true, data: data || [] }
  } catch (err) {
    console.error("Error getMarketingData:", err)
    return { success: false, error: err.message, data: [] }
  }
}

// 3. SINCRONIZACIÓN AUTOMÁTICA (SIMULACIÓN DE JOB)

export async function syncMarketingData(clientId) {
  try {
    // Busca integraciones activas
    const { data: activeIntegrations, error: intError } = await supabase
      .from('integrations')
      .select('platform')
      .eq('client_id', clientId)
      
    if (intError) throw intError
    if (!activeIntegrations || activeIntegrations.length === 0) {
      return { success: true, msg: 'No hay integraciones conectadas para sincronizar.' }
    }

    // Simulamos generación de datos para las activas (últimos 90 días por si acaso)
    const newRecords = []
    
    activeIntegrations.forEach(int => {
      // Create some mock points backwards
      for(let i=0; i<90; i+= Math.floor(Math.random() * 3) + 1) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        
        newRecords.push({
          client_id: clientId,
          platform: int.platform,
          date: d.toISOString().split('T')[0],
          campaign_name: `Camp ${int.platform.toUpperCase()} - ${Math.floor(Math.random() * 5)}`,
          adset_name: `Adset ${i}`,
          ad_name: `Ad ${i}`,
          impressions: Math.floor(Math.random() * 5000) + 500,
          reach: Math.floor(Math.random() * 4000) + 300,
          clicks: Math.floor(Math.random() * 300) + 10,
          purchases: Math.floor(Math.random() * 10),
          conversions: Math.floor(Math.random() * 10),
          revenue: Math.floor(Math.random() * 500),
        })
      }
    })

    const { error: insertError } = await supabase
      .from('marketing_data')
      .insert(newRecords)

    if (insertError) throw insertError

    return { success: true, msg: `Sincronizados ${newRecords.length} registros.` }
  } catch (err) {
    console.error("Error syncMarketingData:", err)
    return { success: false, error: err.message }
  }
}
