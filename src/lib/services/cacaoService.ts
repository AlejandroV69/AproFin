import { supabase } from '../supabase'
import type { CacaoPurchase, CacaoSale } from '../types'

// ============================================================
// Cacao Service — cacao_purchases + cacao_sales
// ============================================================

export interface CacaoFilters {
  year?: number
  weekNumber?: number
  articleCode?: string
}

// --- COMPRAS ---

/**
 * Obtiene compras de cacao con filtros opcionales.
 */
export async function getPurchases(filters: CacaoFilters = {}): Promise<CacaoPurchase[]> {
  let query = supabase
    .from('cacao_purchases')
    .select('*')
    .order('issue_date', { ascending: false })

  if (filters.weekNumber) query = query.eq('week_number', filters.weekNumber)
  if (filters.articleCode) query = query.eq('article_code', filters.articleCode)
  if (filters.year) {
    const start = `${filters.year}-01-01`
    const end = `${filters.year}-12-31`
    query = query.gte('issue_date', start).lte('issue_date', end)
  }

  const { data, error } = await query
  if (error) throw new Error(`Error al obtener compras: ${error.message}`)
  return data ?? []
}

export interface PurchaseInput {
  doc_number: string
  line_number?: number
  issue_date: string
  week_number: number
  supplier_code: string
  warehouse_code: string
  article_code: string
  quantity_kg: number
  unit_cost_bs: number
  net_amount_bs: number
  unit_cost_usd?: number
  net_amount_usd?: number
  batch_id?: string
}

/**
 * Asegura que los códigos de artículos (ej: CAC200, CAC201) existan en la tabla `cacao_articles`
 * para evitar violaciones de clave foránea (FK) al guardar compras o ventas.
 */
export async function ensureCacaoArticles(articleCodes: string[]): Promise<void> {
  const uniqueCodes = Array.from(new Set(articleCodes.filter(Boolean)));
  if (uniqueCodes.length === 0) return;

  const rows = uniqueCodes.map(code => ({
    code,
    description: code === 'CAC201' ? 'CACAO FINO DE AROMA' : 'CACAO CORRIENTE'
  }));

  const { error } = await supabase
    .from('cacao_articles')
    .upsert(rows, { onConflict: 'code', ignoreDuplicates: true });

  if (error) {
    console.warn('Advertencia al verificar cacao_articles:', error.message);
  }
}

/**
 * Inserta múltiples compras de cacao (insert masivo con upsert por doc+línea).
 */
export async function savePurchases(rows: PurchaseInput[]): Promise<void> {
  if (rows.length === 0) return;
  await ensureCacaoArticles(rows.map(r => r.article_code));

  const { error } = await supabase
    .from('cacao_purchases')
    .upsert(rows, { onConflict: 'doc_number,line_number' })

  if (error) throw new Error(`Error al guardar compras: ${error.message}`)
}

// --- VENTAS ---

/**
 * Obtiene ventas de cacao con filtros opcionales.
 */
export async function getSales(filters: CacaoFilters = {}): Promise<CacaoSale[]> {
  let query = supabase
    .from('cacao_sales')
    .select('*')
    .order('issue_date', { ascending: false })

  if (filters.weekNumber) query = query.eq('week_number', filters.weekNumber)
  if (filters.articleCode) query = query.eq('article_code', filters.articleCode)
  if (filters.year) {
    const start = `${filters.year}-01-01`
    const end = `${filters.year}-12-31`
    query = query.gte('issue_date', start).lte('issue_date', end)
  }

  const { data, error } = await query
  if (error) throw new Error(`Error al obtener ventas: ${error.message}`)
  return data ?? []
}

export interface SaleInput {
  doc_number: string
  line_number?: number
  issue_date: string
  week_number: number
  customer_code: string
  salesman_code?: string
  warehouse_code: string
  article_code: string
  quantity_kg: number
  unit_price_bs: number
  net_amount_bs: number
  unit_price_usd?: number
  net_amount_usd?: number
  batch_id?: string
}

/**
 * Inserta múltiples ventas de cacao (upsert por doc+línea).
 */
export async function saveSales(rows: SaleInput[]): Promise<void> {
  if (rows.length === 0) return;
  await ensureCacaoArticles(rows.map(r => r.article_code));

  const { error } = await supabase
    .from('cacao_sales')
    .upsert(rows, { onConflict: 'doc_number,line_number' })

  if (error) throw new Error(`Error al guardar ventas: ${error.message}`)
}
