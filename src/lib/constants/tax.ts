/**
 * Tax Constants for Norway (2026)
 * All tax-related magic numbers consolidated here
 */

// ============================================
// TRINNSKATT (Progressive bracket tax)
// ============================================
export const TRINNSKATT_BRACKETS = [
	{ threshold: 0, rate: 0 },
	{ threshold: 226_100, rate: 0.017 },
	{ threshold: 318_300, rate: 0.040 },
	{ threshold: 725_050, rate: 0.137 },
	{ threshold: 980_100, rate: 0.168 },
	{ threshold: 1_467_200, rate: 0.178 }
] as const;

// ============================================
// TRYGDEAVGIFT (Social security tax)
// ============================================
export const TRYGDEAVGIFT_RATE_LONN = 0.076; // 7.6% for employment
export const TRYGDEAVGIFT_RATE_NAERING = 0.108; // 10.8% for self-employment (ENK)

// ============================================
// FELLESSKATT (Common tax)
// ============================================
export const FELLESSKATT_RATE = 0.22; // 22%

// ============================================
// DEDUCTIONS
// ============================================
export const PERSONFRADRAG_2026 = 114_540; // Standard deduction 2026
export const MINSTEFRADRAG_RATE = 0.46; // 46% of lønn
export const MINSTEFRADRAG_MAX_2026 = 95_700; // Max minstefradrag 2026
export const MINSTEFRADRAG_MIN = 31_800; // Minimum minstefradrag

// ============================================
// FERIEPENGER (Holiday pay)
// ============================================
export const FERIEPENGER_RATE_4_WEEKS = 0.102; // 10.2% for 4+1 weeks
export const FERIEPENGER_RATE_5_WEEKS = 0.12; // 12% for 5 weeks
export const FERIEPENGER_AGE_THRESHOLD = 60; // Age threshold for senior rate
export const FERIEPENGER_SENIOR_EXTRA = 0.023; // +2.3% extra for 60+ (4+1 weeks: 12.5%, 5 weeks: 14.3%)

// Feriepenger rates by vacation weeks and age bracket
export const FERIEPENGER_RATES = {
	'4+1': { standard: 0.102, over60: 0.125 },
	'5': { standard: 0.12, over60: 0.143 }
} as const;

// ============================================
// WITHHOLDING ESTIMATE BRACKETS
// Simplified brackets for estimating tabelltrekk
// until real tax table implementation
// ============================================
export const WITHHOLDING_BRACKETS = [
	{ threshold: 0, rate: 0.25 },
	{ threshold: 200_000, rate: 0.30 },
	{ threshold: 400_000, rate: 0.35 },
	{ threshold: 600_000, rate: 0.40 },
	{ threshold: 900_000, rate: 0.45 }
] as const;

// ============================================
// MVA (Value Added Tax)
// ============================================
export const MVA_RATE = 0.25; // 25%

// ============================================
// DEFAULT VALUES
// ============================================
export const DEFAULT_TAX_PERCENTAGE = 35; // Default prosenttrekk percentage
export const DEFAULT_EMPLOYEE_PERCENTAGE = 100; // Full-time employment

// ============================================
// STORAGE KEYS
// ============================================
export const STORAGE_KEYS = {
	incomes: 'kapitalen_incomes',
	freelance: 'kapitalen_freelance',
	expenses: 'kapitalen_expenses',
	enkExpenses: 'kapitalen_enk_expenses',
	taxMethod: 'kapitalen_tax_method',
	taxPercentage: 'kapitalen_tax_percentage'
} as const;
