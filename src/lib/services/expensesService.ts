import { supabase } from '../supabase'
import type { WeeklyExpense, BudgetYtd, VYtdReport } from '../types'

// ============================================================
// Expenses Service — weekly_expenses + budget_ytd + v_ytd_report
// ============================================================

// --- GASTOS SEMANALES (MonthlyExpensesModule) ---

/**
 * Obtiene los gastos semanales de un mes específico.
 */
export async function getWeeklyExpenses(
  year: number,
  month: number
): Promise<WeeklyExpense[]> {
  const { data, error } = await supabase
    .from('weekly_expenses')
    .select('*')
    .eq('fiscal_year', year)
    .eq('fiscal_month', month)
    .order('account_code')

  if (error) throw new Error(`Error al obtener gastos semanales: ${error.message}`)
  return data ?? []
}

export type WeeklyExpenseInput = Omit<WeeklyExpense, 'id' | 'total_month'>

/**
 * Upsert de gastos semanales (inserta o actualiza por account_code + año + mes).
 */
export async function upsertWeeklyExpenses(rows: WeeklyExpenseInput[]): Promise<void> {
  const { error } = await supabase
    .from('weekly_expenses')
    .upsert(rows, { onConflict: 'account_code,fiscal_year,fiscal_month' })

  if (error) throw new Error(`Error al guardar gastos semanales: ${error.message}`)
}

// --- PRESUPUESTO YTD (YtdExpensesModule + BudgetExecutionModule) ---

/**
 * Obtiene todos los registros YTD hasta el mes indicado.
 * Usa la vista `v_ytd_report` que ya calcula los acumulados.
 */
export async function getYtdReport(
  year: number,
  upToMonth: number
): Promise<VYtdReport[]> {
  const { data, error } = await supabase
    .from('v_ytd_report')
    .select('*')
    .eq('fiscal_year', year)
    .lte('fiscal_month', upToMonth)
    .order('account_code')
    .order('fiscal_month')

  if (error) throw new Error(`Error al obtener reporte YTD: ${error.message}`)
  return data ?? []
}

/**
 * Obtiene el reporte YTD de un mes específico (para comparativo mensual).
 */
export async function getYtdReportByMonth(
  year: number,
  month: number
): Promise<VYtdReport[]> {
  const { data, error } = await supabase
    .from('v_ytd_report')
    .select('*')
    .eq('fiscal_year', year)
    .eq('fiscal_month', month)
    .order('account_code')

  if (error) throw new Error(`Error al obtener reporte mensual: ${error.message}`)
  return data ?? []
}

export type BudgetInput = Omit<BudgetYtd, 'id' | 'created_at'>

/**
 * Upsert de presupuesto (inserta o actualiza por account_code + año + mes).
 */
export async function upsertBudget(rows: BudgetInput[]): Promise<void> {
  const { error } = await supabase
    .from('budget_ytd')
    .upsert(rows, { onConflict: 'account_code,fiscal_year,fiscal_month' })

  if (error) throw new Error(`Error al guardar presupuesto: ${error.message}`)
}
