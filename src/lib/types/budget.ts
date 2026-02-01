/**
 * Budget Types
 * All interfaces and type definitions for the budget system
 */

// Tax calculation method
export type TaxMethod = 'tabelltrekk' | 'prosenttrekk';

// Income adjustment types
export type AdjustmentType = 'bonus' | 'overtid' | 'annet';

// Work period type
export type PeriodType = 'fullYear' | 'custom';

// Vacation weeks entitlement
export type FerieUker = '4+1' | '5';

// Expense categories
export type ExpenseCategory = 'faste-utgifter' | 'abonnement' | 'mat-inne' | 'mat-ute' | 'diverse';

/**
 * Income adjustment (bonus, overtime, etc.)
 */
export interface IncomeAdjustment {
	id: string;
	type: AdjustmentType;
	amount: number;
	month: number; // 1-12
	description?: string;
	affectsFeriepenger: boolean;
}

/**
 * Regular employment income
 */
export interface Income {
	id: string;
	name: string;
	yearlyAmount: number; // Årslønn
	employeePercentage: number; // Stillingsprosent (0-100)
	taxMethod: TaxMethod;
	customTaxPercentage?: number; // Only used when prosenttrekk
	trekkprosent?: number; // Actual withholding % from payslip (tabelltrekk)
	periodType: PeriodType;
	startDate?: string; // ISO date string (YYYY-MM-DD)
	endDate?: string; // ISO date string (YYYY-MM-DD)
	ferieUker: FerieUker;
	isOver60: boolean; // 60+ age bracket for extra feriepenger rate
	adjustments: IncomeAdjustment[];
}

/**
 * Freelance/ENK income
 */
export interface FreelanceIncome {
	id: string;
	client: string; // Oppdrag - who it's for
	description: string; // Kort beskrivelse
	amount: number; // Base amount (ex. MVA)
	mva: number; // MVA (25%)
}

/**
 * Expense with monthly amounts
 */
export interface Expense {
	id: string;
	name: string;
	monthlyAmounts: number[]; // 12 values: index 0 = Jan, index 11 = Dec
	category: ExpenseCategory;
	frequency: 'monthly' | 'yearly';
}

/**
 * Tax breakdown for a single income
 */
export interface TaxBreakdown {
	grossIncome: number;
	trygdeavgift: number; // Social security
	trinnskatt: number; // Bracket tax (progressive)
	fellesskatt: number; // 22% income tax
	totalTax: number;
	netIncome: number;
	effectiveRate: number; // Percentage
}

/**
 * Trinnskatt bracket breakdown
 */
export interface TrinnskattBracket {
	bracket: number;
	taxableAmount: number;
	amount: number;
}

/**
 * Combined tax breakdown for unified calculation
 */
export interface CombinedTaxBreakdown {
	// Income breakdown
	lonnGross: number; // All fast inntekt (lønn) brutto
	minstefradrag: number; // 46% of lønn, max 95,700 (ONLY affects fellesskatt)
	enkGross: number; // Freelance/ENK total
	enkExpenses: number; // Business expenses
	enkNet: number; // ENK net (brutto - expenses)
	totalPersoninntekt: number; // Combined: brutto lønn + netto ENK (for trinnskatt)

	// Tax components (actual liability)
	trygdeavgiftLonn: number; // 7.6% on GROSS lønn
	trygdeavgiftEnk: number; // 10.8% on ENK net
	trinnskatt: number; // On combined personinntekt (GROSS lønn + netto ENK)
	trinnskattBreakdown: TrinnskattBracket[];
	personfradrag: number; // Standard deduction before fellesskatt
	alminneligInntekt: number; // personinntekt - minstefradrag - personfradrag
	fellesskatt: number; // 22% on alminnelig inntekt
	totalTax: number; // Actual tax liability

	// Per-box totals for UI
	skattFraLonn: number; // Box 1: trygdeavgiftLonn
	skattFraOppdrag: number; // Box 2: trygdeavgiftEnk
	skattFraKombinert: number; // Box 3: trinnskatt + fellesskatt

	// Withholding vs liability
	skattetrekk: number; // What employer withholds
	difference: number; // Positive = refund, negative = owe

	// Feriepenger (holiday pay)
	totalFeriepenger: number; // Sum of all employer feriepenger

	// Results
	netIncome: number;
	effectiveRate: number;
}

/**
 * Withholding calculation result
 */
export interface WithholdingResult {
	grossIncome: number;
	withheld: number;
	taxPercent: number;
}

/**
 * Expense category with label
 */
export interface ExpenseCategoryOption {
	value: ExpenseCategory;
	label: string;
}

/**
 * Food expenses with monthly amounts for inne (groceries) and ute (dining out)
 */
export interface FoodExpenses {
	inne: number[]; // 12 values (Jan-Dec)
	ute: number[]; // 12 values (Jan-Dec)
}

/**
 * Expense categories list
 */
export const EXPENSE_CATEGORIES: ExpenseCategoryOption[] = [
	{ value: 'faste-utgifter', label: 'Faste utgifter' },
	{ value: 'abonnement', label: 'Abonnement' },
	{ value: 'mat-inne', label: 'Mat - Inne' },
	{ value: 'mat-ute', label: 'Mat - Ute' },
	{ value: 'diverse', label: 'Diverse' }
];
