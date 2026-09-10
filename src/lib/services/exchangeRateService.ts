import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import type { AppExchangeRates, DolarApiRate } from '../types'

// ============================================================
// Exchange Rate Service — DolarAPI + Supabase
// ============================================================

const DOLAR_API_URL = 'https://ve.dolarapi.com/v1/cotizaciones'

/**
 * Obtiene las tasas oficiales BCV (USD y EUR) desde DolarAPI.
 * Retorna la tasa de venta (precio oficial al que vende el BCV).
 */
export async function fetchRatesFromAPI(): Promise<AppExchangeRates> {
  const response = await fetch(DOLAR_API_URL)

  if (!response.ok) {
    throw new Error(`Error al contactar DolarAPI: ${response.status}`)
  }

  const rates: DolarApiRate[] = await response.json()

  const usdRate = rates.find((r) =>
    r.nombre.toLowerCase().includes('dólar') ||
    r.nombre.toLowerCase().includes('dolar')
  )
  const eurRate = rates.find((r) =>
    r.nombre.toLowerCase().includes('euro')
  )

  if (!usdRate) {
    throw new Error('No se encontró la tasa del Dólar en la respuesta de DolarAPI.')
  }

  return {
    bcvRate: usdRate.promedio,
    eurRate: eurRate?.promedio ?? usdRate.promedio * 1.08, // fallback si no hay EUR
    lastUpdated: usdRate.fechaActualizacion,
  }
}

/**
 * Guarda la tasa del día en la tabla `exchange_rates` de Supabase.
 * Usa upsert para no duplicar si ya existe el registro del día.
 */
export async function saveRateToSupabase(rates: AppExchangeRates): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('exchange_rates')
    .upsert(
      {
        rate_date: today,
        rate_bcv: rates.bcvRate,
      },
      { onConflict: 'rate_date' }
    )

  if (error) {
    // No lanzamos el error — no queremos que falle el login por esto
    console.warn('No se pudo guardar la tasa en Supabase:', error.message)
  }
}

/**
 * Hook React para obtener las tasas de cambio al montar.
 * Primero consulta DolarAPI, con fallback al último registro en Supabase.
 */
export function useExchangeRates() {
  const [rates, setRates] = useState<AppExchangeRates>({
    bcvRate: 36.42,   // fallback mientras carga
    eurRate: 39.33,   // fallback
    lastUpdated: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRates = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Primero intenta DolarAPI (fuente primaria)
      const fresh = await fetchRatesFromAPI()
      setRates(fresh)
      // Guarda en Supabase en segundo plano (no esperamos)
      saveRateToSupabase(fresh)
    } catch (apiErr) {
      console.warn('DolarAPI no disponible, usando Supabase como fallback:', apiErr)

      // Fallback: último registro en Supabase
      try {
        const { data, error: sbError } = await supabase
          .from('exchange_rates')
          .select('rate_date, rate_bcv')
          .order('rate_date', { ascending: false })
          .limit(1)
          .single()

        if (sbError || !data) throw new Error('Sin datos históricos en Supabase')

        setRates({
          bcvRate: Number(data.rate_bcv),
          eurRate: Number(data.rate_bcv) * 1.08,
          lastUpdated: data.rate_date,
        })
      } catch {
        setError('No se pudo obtener la tasa BCV. Usando valor aproximado.')
        // Mantiene el fallback hardcodeado del estado inicial
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRates()
  }, [loadRates])

  return { ...rates, isLoading, error, refresh: loadRates }
}
