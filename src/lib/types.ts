// ============================================================
// Tipos TypeScript — mapeo exacto del esquema Supabase
// ============================================================

// --- Tablas maestras ---

export interface Account {
  id: string
  code: string
  name: string
  cost_center: string | null
  parent_code: string | null
  account_type: 'ACTIVO' | 'PASIVO' | 'GASTO' | 'COSTO'
  is_auxiliary: boolean
  created_at: string
}

export interface CacaoArticle {
  code: string
  description: string
  unit: string
}

export interface ExchangeRate {
  rate_date: string      // DATE → 'YYYY-MM-DD'
  rate_bcv: number
  eur_bcv?: number       // Agregamos EUR para DolarAPI
  created_at: string
}

// --- Lotes de importación ---

export type ImportBatchSourceType =
  | 'PROFIT_BALANCE'
  | 'COMPRAS_CACAO'
  | 'VENTAS_CACAO'

export interface ImportBatch {
  id: string
  source_type: ImportBatchSourceType
  file_name: string
  fiscal_year: number
  fiscal_month: number
  week_number: number | null
  week_of_month: number | null
  total_debit: number
  total_credit: number
  is_balanced: boolean
  uploaded_by: string | null
  created_at: string
}

export interface ProfitBalance {
  id: string
  batch_id: string
  account_code: string | null
  account_name_raw: string | null
  initial_balance: number
  debit: number
  credit: number
  final_balance: number
  created_at: string
}

// --- Operativa de cacao ---

export interface CacaoPurchase {
  id: string
  batch_id: string | null
  doc_number: string
  line_number: number
  issue_date: string
  week_number: number
  supplier_code: string
  warehouse_code: string
  article_code: string | null
  quantity_kg: number
  unit_cost_bs: number
  net_amount_bs: number
  unit_cost_usd: number | null
  net_amount_usd: number | null
  created_at: string
}

export interface CacaoSale {
  id: string
  batch_id: string | null
  doc_number: string
  line_number: number
  issue_date: string
  week_number: number
  customer_code: string
  salesman_code: string | null
  warehouse_code: string
  article_code: string | null
  quantity_kg: number
  unit_price_bs: number
  net_amount_bs: number
  unit_price_usd: number | null
  net_amount_usd: number | null
  created_at: string
}

// --- Gastos semanales ---

export interface WeeklyExpense {
  id: string
  account_code: string | null
  account_name?: string | null
  fiscal_year: number
  fiscal_month: number
  expense_category: 'COSTO_VARIABLE' | 'COSTO_FIJO' | 'ADMINISTRACION'
  week_1: number
  week_2: number
  week_3: number
  week_4: number
  week_5: number
  total_month: number   // columna generada
}

// --- Presupuesto YTD ---

export interface BudgetYtd {
  id: string
  account_code: string | null
  fiscal_year: number
  fiscal_month: number
  budget_usd: number
  actual_usd: number
  created_at: string
}

// Vista v_ytd_report
export interface VYtdReport {
  fiscal_year: number
  fiscal_month: number
  account_code: string
  account_name: string
  cost_center: string | null
  budget_usd: number
  actual_usd: number
  variance_usd: number
  variance_pct: number
  budget_accumulated_ytd: number
  actual_accumulated_ytd: number
  variance_accumulated_ytd: number
}

// --- DolarAPI response ---

export interface DolarApiRate {
  nombre: string         // 'Dólar' | 'Euro'
  compra: number
  venta: number
  promedio: number
  fechaActualizacion: string
}

// Tasas de cambio resueltas para la app
export interface AppExchangeRates {
  bcvRate: number        // USD → VES
  eurRate: number        // EUR → VES
  lastUpdated: string
}
