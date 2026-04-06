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
    const daysToSync = 90
    
    activeIntegrations.forEach(int => {
      // Configuramos multiplicadores básicos por plataforma para realismo
      const multipliers = {
        facebook: { reach: 1, cpc: 0.8, conv: 0.02 },
        tiktok: { reach: 1.5, cpc: 0.4, conv: 0.015 },
        google_ads: { reach: 0.8, cpc: 1.2, conv: 0.035 },
        linkedin: { reach: 0.4, cpc: 4.5, conv: 0.01 },
        google_analytics: { reach: 1, cpc: 0, conv: 0.025 }
      }[int.platform] || { reach: 1, cpc: 1, conv: 0.02 };

      // Generamos puntos hacia atrás
      for(let i=0; i<daysToSync; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        
        const baseReach = Math.floor(Math.random() * 5000 * multipliers.reach) + 500
        const clicks = Math.floor(baseReach * (0.01 + Math.random() * 0.02)) // 1-3% CTR
        const conv = Math.floor(clicks * multipliers.conv * (0.8 + Math.random() * 0.4))
        const spent = clicks * multipliers.cpc * (0.9 + Math.random() * 0.2)
        
        newRecords.push({
          client_id: clientId,
          platform: int.platform,
          date: d.toISOString().split('T')[0],
          campaign_name: `Camp ${int.platform.toUpperCase()} - ${1 + (i % 3)}`,
          adset_name: `Adset ${1 + (i % 5)}`,
          ad_name: `Creative ${1 + (i % 10)}`,
          impressions: Math.floor(baseReach * 1.2),
          reach: baseReach,
          clicks: clicks,
          purchases: Math.floor(conv * 0.7),
          conversions: conv,
          revenue: spent, // En este contexto revenue = gasto/inversión para el dashboard
        })
      }
    })

    const { error: insertError } = await supabase
      .from('marketing_data')
      .upsert(newRecords, { onConflict: 'client_id,platform,date,campaign_name,adset_name,ad_name' })

    if (insertError) throw insertError

    return { success: true, msg: `Sincronizados ${newRecords.length} registros.` }
  } catch (err) {
    console.error("Error syncMarketingData:", err)
    return { success: false, error: err.message }
  }
}
