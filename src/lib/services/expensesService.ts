import { supabase } from '../supabase'
import type { WeeklyExpense, BudgetYtd, VYtdReport } from '../types'

// ============================================================
// Expenses Service
// ============================================================

// --- GASTOS SEMANALES (MonthlyExpensesModule) ---

/**
 * Lee los balances importados del mes y los pivota por semana del mes (week_of_month 1-5).
 * La columna week_of_month debe existir en import_batches (añadida via ALTER TABLE).
 */
export async function getWeeklyExpenses(
  year: number,
  month: number
): Promise<WeeklyExpense[]> {

  // 1. Batches del mes ordenados por semana
  const { data: batches, error: batchErr } = await supabase
    .from('import_batches')
    .select('id, week_of_month')
    .eq('fiscal_year', year)
    .eq('fiscal_month', month)
    .eq('source_type', 'PROFIT_BALANCE')
    .order('week_of_month')

  if (batchErr) throw new Error(`Error al obtener gastos semanales: ${batchErr.message}`)
  if (!batches || batches.length === 0) return []

  // 2. Mapa batch_id → semana del mes (1-5)
  const batchToWeek = new Map<string, number>(
    batches.map(b => [b.id as string, (b.week_of_month as number) ?? 1])
  )
  const batchIds = batches.map(b => b.id as string)

  // 3. Balances de esos batches
  const { data: balances, error: balErr } = await supabase
    .from('profit_balances')
    .select('batch_id, account_code, account_name_raw, debit, credit, final_balance')
    .in('batch_id', batchIds)

  if (balErr) throw new Error(`Error al obtener balances: ${balErr.message}`)
  if (!balances || balances.length === 0) return []

  // 4. Pivot por cuenta y semana del mes
  type AccEntry = {
    account_code: string | null
    account_name_raw: string | null
    weeks: Map<number, number>
  }

  const accountMap = new Map<string, AccEntry>()

  for (const bal of balances) {
    const weekNum = batchToWeek.get(bal.batch_id as string) ?? 1
    const key = (bal.account_code as string) || (bal.account_name_raw as string) || 'SIN_CUENTA'

    if (!accountMap.has(key)) {
      accountMap.set(key, {
        account_code: bal.account_code as string | null,
        account_name_raw: bal.account_name_raw as string | null,
        weeks: new Map(),
      })
    }

    const acc = accountMap.get(key)!
    // Usar saldo final como el monto de la semana para esa cuenta
    const amount = Math.abs(Number(bal.final_balance) || 0)
    acc.weeks.set(weekNum, (acc.weeks.get(weekNum) ?? 0) + amount)
  }

  // 5. Convertir al tipo WeeklyExpense
  const result: WeeklyExpense[] = Array.from(accountMap.entries()).map(([, acc], idx) => {
    const w1 = acc.weeks.get(1) ?? 0
    const w2 = acc.weeks.get(2) ?? 0
    const w3 = acc.weeks.get(3) ?? 0
    const w4 = acc.weeks.get(4) ?? 0
    const w5 = acc.weeks.get(5) ?? 0
    return {
      id: `${year}-${month}-${idx}`,
      account_code: acc.account_code,
      account_name: acc.account_name_raw || 'SIN DESCRIPCIÓN',
      fiscal_year: year,
      fiscal_month: month,
      expense_category: (acc.account_code && acc.account_code.startsWith('1.2')) ? 'COSTO_FIJO' : 'COSTO_VARIABLE',
      week_1: w1,
      week_2: w2,
      week_3: w3,
      week_4: w4,
      week_5: w5,
      total_month: w1 + w2 + w3 + w4 + w5,
    }
  })

  result.sort((a, b) =>
    (a.account_code ?? '').localeCompare(b.account_code ?? '')
  )

  return result
}

export type WeeklyExpenseInput = Omit<WeeklyExpense, 'id' | 'total_month'>

/**
 * Upsert de gastos semanales manuales (tabla weekly_expenses).
 */
export async function upsertWeeklyExpenses(rows: WeeklyExpenseInput[]): Promise<void> {
  const { error } = await supabase
    .from('weekly_expenses')
    .upsert(rows, { onConflict: 'account_code,fiscal_year,fiscal_month' })

  if (error) throw new Error(`Error al guardar gastos semanales: ${error.message}`)
}

// --- PRESUPUESTO YTD ---

export async function getYtdReport(year: number, upToMonth: number): Promise<VYtdReport[]> {
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

export async function getYtdReportByMonth(year: number, month: number): Promise<VYtdReport[]> {
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

export async function upsertBudget(rows: BudgetInput[]): Promise<void> {
  const { error } = await supabase
    .from('budget_ytd')
    .upsert(rows, { onConflict: 'account_code,fiscal_year,fiscal_month' })

  if (error) throw new Error(`Error al guardar presupuesto: ${error.message}`)
}
