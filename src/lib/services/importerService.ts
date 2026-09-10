import { supabase } from '../supabase'
import type { ImportBatch, ProfitBalance, ImportBatchSourceType } from '../types'

// ============================================================
// Importer Service — import_batches + profit_balances
// ============================================================

export interface CreateBatchInput {
  source_type: ImportBatchSourceType
  file_name: string
  fiscal_year: number
  fiscal_month: number
  week_number?: number
  total_debit: number
  total_credit: number
}

/**
 * Crea un lote de importación. Retorna el batch con su ID generado.
 */
export async function createImportBatch(
  input: CreateBatchInput,
  userId: string
): Promise<ImportBatch> {
  const isBalanced = Math.abs(input.total_debit - input.total_credit) < 0.01

  const { data, error } = await supabase
    .from('import_batches')
    .insert({
      ...input,
      week_number: input.week_number ?? null,
      is_balanced: isBalanced,
      uploaded_by: userId,
    })
    .select()
    .single()

  if (error) throw new Error(`Error al crear lote: ${error.message}`)
  return data
}

export interface BalanceEntryInput {
  account_code?: string
  account_name_raw: string
  initial_balance?: number
  debit: number
  credit: number
  final_balance: number
}

/**
 * Guarda las cuentas del balance de comprobación asociadas a un lote.
 */
export async function saveBalanceEntries(
  batchId: string,
  entries: BalanceEntryInput[]
): Promise<void> {
  const rows = entries.map((e) => ({
    batch_id: batchId,
    account_code: e.account_code ?? null,
    account_name_raw: e.account_name_raw,
    initial_balance: e.initial_balance ?? 0,
    debit: e.debit,
    credit: e.credit,
    final_balance: e.final_balance,
  }))

  const { error } = await supabase.from('profit_balances').insert(rows)
  if (error) throw new Error(`Error al guardar cuentas: ${error.message}`)
}

/**
 * Lista los últimos lotes importados (para el historial de importaciones).
 */
export async function getRecentBatches(limit = 10): Promise<ImportBatch[]> {
  const { data, error } = await supabase
    .from('import_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Error al obtener lotes: ${error.message}`)
  return data ?? []
}

/**
 * Obtiene las cuentas de un lote específico.
 */
export async function getBatchEntries(batchId: string): Promise<ProfitBalance[]> {
  const { data, error } = await supabase
    .from('profit_balances')
    .select('*')
    .eq('batch_id', batchId)
    .order('account_code')

  if (error) throw new Error(`Error al obtener cuentas: ${error.message}`)
  return data ?? []
}
