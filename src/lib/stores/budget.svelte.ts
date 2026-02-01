import { browser } from '$app/environment';

// Types
export type TaxMethod = 'tabelltrekk' | 'prosenttrekk';
export type AdjustmentType = 'bonus' | 'overtid' | 'annet';

export interface IncomeAdjustment {
	id: string;
	type: AdjustmentType;
	amount: number;
	month: number;              // 1-12
	description?: string;
	affectsFeriepenger: boolean;
}

export interface Income {
	id: string;
	name: string;
	yearlyAmount: number;      // Årslønn
	employeePercentage: number; // Stillingsprosent (0-100)
	taxMethod: TaxMethod;      // Tax calculation method
	customTaxPercentage?: number; // Only used when prosenttrekk
	trekkprosent?: number;     // Actual withholding % from payslip (tabelltrekk)
	periodType: 'fullYear' | 'custom';
	startDate?: string;        // ISO date string (YYYY-MM-DD)
	endDate?: string;          // ISO date string (YYYY-MM-DD)
	ferieUker: '4+1' | '5';    // Vacation weeks entitlement
	isOver60: boolean;         // 60+ age bracket for extra feriepenger rate
	adjustments: IncomeAdjustment[];  // Monthly adjustments (bonus, overtime, etc.)
}

export interface FreelanceIncome {
	id: string;
	client: string;           // Oppdrag - who it's for
	description: string;      // Kort beskrivelse
	amount: number;           // Base amount (ex. MVA)
	mva: number;              // MVA (25%)
}

export interface Expense {
	id: string;
	name: string;
	amount: number;
	category: ExpenseCategory;
}

export type ExpenseCategory = 'bolig' | 'transport' | 'mat' | 'forsikring' | 'annet';

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
	{ value: 'bolig', label: 'Bolig' },
	{ value: 'transport', label: 'Transport' },
	{ value: 'mat', label: 'Mat og dagligvarer' },
	{ value: 'forsikring', label: 'Forsikring' },
	{ value: 'annet', label: 'Annet' }
];

// Tax calculation for Norway (2026 rates)
export interface TaxBreakdown {
	grossIncome: number;
	trygdeavgift: number;        // Social security
	trinnskatt: number;          // Bracket tax (progressive)
	fellesskatt: number;         // 22% income tax
	totalTax: number;
	netIncome: number;
	effectiveRate: number;       // Percentage
}

// Combined tax breakdown for unified calculation
export interface CombinedTaxBreakdown {
	// Income breakdown
	lonnGross: number;            // All fast inntekt (lønn) brutto
	minstefradrag: number;        // 46% of lønn, max 95,700 (ONLY affects fellesskatt)
	enkGross: number;             // Freelance/ENK total
	enkExpenses: number;          // Business expenses
	enkNet: number;               // ENK net (brutto - expenses)
	totalPersoninntekt: number;   // Combined: brutto lønn + netto ENK (for trinnskatt)

	// Tax components (actual liability)
	trygdeavgiftLonn: number;     // 7.6% on GROSS lønn
	trygdeavgiftEnk: number;      // 10.8% on ENK net
	trinnskatt: number;           // On combined personinntekt (GROSS lønn + netto ENK)
	trinnskattBreakdown: { bracket: number; taxableAmount: number; amount: number }[];
	personfradrag: number;        // Standard deduction before fellesskatt
	alminneligInntekt: number;    // personinntekt - minstefradrag - personfradrag
	fellesskatt: number;          // 22% on alminnelig inntekt
	totalTax: number;             // Actual tax liability

	// Per-box totals for UI
	skattFraLonn: number;         // Box 1: trygdeavgiftLonn
	skattFraOppdrag: number;      // Box 2: trygdeavgiftEnk
	skattFraKombinert: number;    // Box 3: trinnskatt + fellesskatt

	// Withholding vs liability
	skattetrekk: number;          // What employer withholds
	difference: number;           // Positive = refund, negative = owe

	// Feriepenger (holiday pay)
	totalFeriepenger: number;     // Sum of all employer feriepenger

	// Results
	netIncome: number;
	effectiveRate: number;
}

// Tax constants 2026
export const TRINNSKATT_BRACKETS = [
	{ threshold: 0, rate: 0 },
	{ threshold: 226_100, rate: 0.017 },
	{ threshold: 318_300, rate: 0.040 },
	{ threshold: 725_050, rate: 0.137 },
	{ threshold: 980_100, rate: 0.168 },
	{ threshold: 1_467_200, rate: 0.178 }
];

const TRYGDEAVGIFT_LONN = 0.076;       // 7.6% for employment
const TRYGDEAVGIFT_NAERING = 0.108;    // 10.8% for ENK
const FELLESSKATT_RATE = 0.22;         // 22%
const PERSONFRADRAG = 114_540;         // Standard deduction 2026
const MINSTEFRADRAG_RATE = 0.46;       // 46% of lønn
const MINSTEFRADRAG_MAX = 95_700;      // Max minstefradrag 2026

// Helper: Calculate trinnskatt on given income with breakdown
function calculateTrinnskattWithBreakdown(income: number): { total: number; breakdown: { bracket: number; taxableAmount: number; amount: number }[] } {
	let total = 0;
	const breakdown: { bracket: number; taxableAmount: number; amount: number }[] = [];

	for (let i = 1; i < TRINNSKATT_BRACKETS.length; i++) {
		const lower = TRINNSKATT_BRACKETS[i].threshold;
		const rate = TRINNSKATT_BRACKETS[i].rate;
		const upper = TRINNSKATT_BRACKETS[i + 1]?.threshold ?? Infinity;

		if (income > lower) {
			const taxableInBracket = Math.min(income, upper) - lower;
			const taxAmount = Math.round(taxableInBracket * rate);
			total += taxAmount;
			if (taxAmount > 0) {
				breakdown.push({ bracket: i, taxableAmount: taxableInBracket, amount: taxAmount });
			}
		}
	}
	return { total, breakdown };
}

// Helper: Calculate trinnskatt on given income (simple version)
function calculateTrinnskatt(income: number): number {
	return calculateTrinnskattWithBreakdown(income).total;
}

// Helper: Calculate months worked based on period type and dates
export function getMonthsWorked(income: Income): number {
	if (income.periodType === 'fullYear' || !income.startDate || !income.endDate) {
		return 12;
	}

	const start = new Date(income.startDate);
	const end = new Date(income.endDate);

	// Calculate months between dates (inclusive)
	const months = (end.getFullYear() - start.getFullYear()) * 12
		+ (end.getMonth() - start.getMonth()) + 1;

	return Math.min(12, Math.max(1, months));
}

// Main combined tax calculation
export function calculateCombinedTax(): CombinedTaxBreakdown {
	// === Step 1: Calculate lønn (all fixed income + adjustments) - GROSS (prorated by period) ===
	const lonnGross = incomes.reduce((sum, i) => {
		const fullYearAmount = i.yearlyAmount * i.employeePercentage / 100;
		const months = getMonthsWorked(i);
		const baseSalary = fullYearAmount * months / 12;
		const adjustments = getTotalAdjustments(i);
		return sum + baseSalary + adjustments;
	}, 0);

	// === Step 2: Calculate ENK net ===
	const enkGross = freelanceIncomes.reduce((sum, f) => sum + f.amount, 0);
	const enkNet = Math.max(0, enkGross - enkExpenses);

	// === Step 3: Trygdeavgift (on GROSS amounts, NOT after minstefradrag) ===
	const trygdeavgiftLonn = lonnGross * TRYGDEAVGIFT_LONN;  // 7.6% on GROSS lønn
	const trygdeavgiftEnk = enkNet * TRYGDEAVGIFT_NAERING;   // 10.8% on netto ENK

	// === Step 4: Trinnskatt on combined personinntekt (GROSS lønn + netto ENK) ===
	const totalPersoninntekt = lonnGross + enkNet;  // GROSS lønn!
	const trinnskattResult = calculateTrinnskattWithBreakdown(totalPersoninntekt);

	// === Step 5: Fellesskatt (where minstefradrag and personfradrag apply) ===
	// Minstefradrag: 46% of lønn, max 95,700 - ONLY reduces fellesskatt base
	const minstefradrag = Math.min(lonnGross * MINSTEFRADRAG_RATE, MINSTEFRADRAG_MAX);
	const alminneligInntekt = Math.max(0, totalPersoninntekt - minstefradrag - PERSONFRADRAG);
	const fellesskatt = alminneligInntekt * FELLESSKATT_RATE;

	// === Per-box totals ===
	const skattFraLonn = trygdeavgiftLonn;
	const skattFraOppdrag = trygdeavgiftEnk;
	const skattFraKombinert = trinnskattResult.total + fellesskatt;

	// === Total actual tax liability ===
	const totalTax = trygdeavgiftLonn + trygdeavgiftEnk + trinnskattResult.total + fellesskatt;

	// === Withholding calculation (what employer withholds from lønn, prorated) ===
	const skattetrekk = incomes.reduce((sum, i) => {
		const fullYearAmount = i.yearlyAmount * i.employeePercentage / 100;
		const months = getMonthsWorked(i);
		const proratedAmount = fullYearAmount * months / 12;

		// Use GLOBAL tax method
		if (globalTaxMethod === 'prosenttrekk') {
			return sum + proratedAmount * globalTaxPercentage / 100;
		}

		// For tabelltrekk, use per-income trekkprosent if available
		if (i.trekkprosent !== undefined && i.trekkprosent > 0) {
			return sum + proratedAmount * i.trekkprosent / 100;
		}

		// Fallback: estimate based on effective rate (simplified)
		const effectiveWithholding = calculateEstimatedWithholding(proratedAmount);
		return sum + effectiveWithholding;
	}, 0);

	// Difference: positive = refund, negative = owe
	const difference = skattetrekk - totalTax;

	// Net income (based on actual tax, not withholding)
	const totalGross = lonnGross + enkGross - enkExpenses;
	const netIncome = totalGross - totalTax;

	// Feriepenger (holiday pay) - informational only, not part of tax
	const totalFeriepenger = incomes.reduce((sum, i) => sum + calculateFeriepenger(i), 0);

	return {
		lonnGross,
		minstefradrag,
		enkGross,
		enkExpenses,
		enkNet,
		totalPersoninntekt,
		trygdeavgiftLonn,
		trygdeavgiftEnk,
		trinnskatt: trinnskattResult.total,
		trinnskattBreakdown: trinnskattResult.breakdown,
		personfradrag: PERSONFRADRAG,
		alminneligInntekt,
		fellesskatt,
		totalTax,
		skattFraLonn,
		skattFraOppdrag,
		skattFraKombinert,
		skattetrekk,
		difference,
		totalFeriepenger,
		netIncome,
		effectiveRate: totalGross > 0 ? (totalTax / totalGross) * 100 : 0
	};
}

// Helper: Estimate withholding for tabelltrekk (simplified calculation)
function calculateEstimatedWithholding(grossIncome: number): number {
	// This is a simplified estimate - real tabelltrekk rates vary by tax class
	// Using a simple progressive estimate based on typical effective rates
	if (grossIncome <= 200_000) return grossIncome * 0.25;
	if (grossIncome <= 400_000) return grossIncome * 0.30;
	if (grossIncome <= 600_000) return grossIncome * 0.35;
	if (grossIncome <= 900_000) return grossIncome * 0.40;
	return grossIncome * 0.45;
}

// Calculate withholding for a single income entry (what employer takes from paycheck)
export function calculateWithholding(income: Income): { grossIncome: number; withheld: number; taxPercent: number } {
	const grossIncome = income.yearlyAmount * income.employeePercentage / 100;

	if (income.taxMethod === 'prosenttrekk') {
		const taxPercent = income.customTaxPercentage ?? 35;
		return {
			grossIncome,
			withheld: grossIncome * (taxPercent / 100),
			taxPercent
		};
	}

	// For tabelltrekk, use estimated withholding
	const withheld = calculateEstimatedWithholding(grossIncome);
	return {
		grossIncome,
		withheld,
		taxPercent: grossIncome > 0 ? (withheld / grossIncome) * 100 : 0
	};
}

export function calculateTax(income: Income): TaxBreakdown {
	const grossIncome = income.yearlyAmount * income.employeePercentage / 100;

	// Prosenttrekk: simple percentage calculation
	if (income.taxMethod === 'prosenttrekk') {
		const taxPercent = income.customTaxPercentage ?? 35;
		const totalTax = grossIncome * (taxPercent / 100);
		return {
			grossIncome,
			trygdeavgift: 0,
			trinnskatt: 0,
			fellesskatt: totalTax,
			totalTax,
			netIncome: grossIncome - totalTax,
			effectiveRate: taxPercent
		};
	}

	// For display: show what employer withholds
	const withheld = calculateEstimatedWithholding(grossIncome);

	return {
		grossIncome,
		trygdeavgift: 0,
		trinnskatt: 0,
		fellesskatt: withheld,  // Show total withholding
		totalTax: withheld,
		netIncome: grossIncome - withheld,
		effectiveRate: grossIncome > 0 ? (withheld / grossIncome) * 100 : 0
	};
}
const STORAGE_KEYS = {
	incomes: 'kapitalen_incomes',
	freelance: 'kapitalen_freelance',
	expenses: 'kapitalen_expenses',
	enkExpenses: 'kapitalen_enk_expenses',
	taxMethod: 'kapitalen_tax_method',
	taxPercentage: 'kapitalen_tax_percentage'
} as const;

// Helper: Load from LocalStorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
	if (!browser) return defaultValue;
	try {
		const stored = localStorage.getItem(key);
		return stored ? JSON.parse(stored) : defaultValue;
	} catch {
		return defaultValue;
	}
}

// Helper: Save to LocalStorage
function saveToStorage<T>(key: string, value: T): void {
	if (!browser) return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Ignore storage errors
	}
}

// Helper: Generate unique ID
function generateId(): string {
	return crypto.randomUUID();
}

// Helper: Migrate incomes from old format (add missing fields with defaults)
function migrateIncomes(stored: Income[]): Income[] {
	return stored.map(income => ({
		...income,
		periodType: income.periodType ?? 'fullYear',
		ferieUker: income.ferieUker ?? '5',
		isOver60: income.isOver60 ?? false,
		adjustments: income.adjustments ?? []
	}));
}

// Reactive state
let incomes = $state<Income[]>(migrateIncomes(loadFromStorage(STORAGE_KEYS.incomes, [])));
let freelanceIncomes = $state<FreelanceIncome[]>(loadFromStorage(STORAGE_KEYS.freelance, []));
let expenses = $state<Expense[]>(loadFromStorage(STORAGE_KEYS.expenses, []));
let enkExpenses = $state<number>(loadFromStorage(STORAGE_KEYS.enkExpenses, 0));
let globalTaxMethod = $state<TaxMethod>(loadFromStorage(STORAGE_KEYS.taxMethod, 'tabelltrekk'));
let globalTaxPercentage = $state<number>(loadFromStorage(STORAGE_KEYS.taxPercentage, 35));

// Persist to LocalStorage when state changes
$effect.root(() => {
	$effect(() => {
		saveToStorage(STORAGE_KEYS.incomes, incomes);
	});

	$effect(() => {
		saveToStorage(STORAGE_KEYS.freelance, freelanceIncomes);
	});

	$effect(() => {
		saveToStorage(STORAGE_KEYS.expenses, expenses);
	});

	$effect(() => {
		saveToStorage(STORAGE_KEYS.enkExpenses, enkExpenses);
	});

	$effect(() => {
		saveToStorage(STORAGE_KEYS.taxMethod, globalTaxMethod);
	});

	$effect(() => {
		saveToStorage(STORAGE_KEYS.taxPercentage, globalTaxPercentage);
	});
});

// Helper: Calculate monthly income for a single income entry (prorated)
export function getMonthlyIncome(income: Income): number {
	const fullYearAmount = income.yearlyAmount * income.employeePercentage / 100;
	const months = getMonthsWorked(income);
	const proratedYearly = fullYearAmount * months / 12;
	return proratedYearly / 12;
}

// Helper: Get prorated yearly amount (for UI display)
export function getProratedYearlyAmount(income: Income): number {
	const fullYearAmount = income.yearlyAmount * income.employeePercentage / 100;
	const months = getMonthsWorked(income);
	return fullYearAmount * months / 12;
}

// Feriepenger rates by vacation weeks and age bracket
const FERIEPENGER_RATES = {
	'4+1': { standard: 0.102, over60: 0.125 },
	'5':   { standard: 0.12,  over60: 0.143 }
};

export function getFeriepengerRate(income: Income): number {
	const rates = FERIEPENGER_RATES[income.ferieUker];
	return income.isOver60 ? rates.over60 : rates.standard;
}

// Helper: Get total adjustments for an income
export function getTotalAdjustments(income: Income): number {
	return (income.adjustments ?? []).reduce((sum, adj) => sum + adj.amount, 0);
}

// Helper: Get adjustments that affect feriepenger
export function getAdjustmentsForFeriepenger(income: Income): number {
	return (income.adjustments ?? []).reduce((sum, adj) =>
		adj.affectsFeriepenger ? sum + adj.amount : sum, 0);
}

export function calculateFeriepenger(income: Income): number {
	const proratedYearly = getProratedYearlyAmount(income);
	const adjustmentsForFerie = getAdjustmentsForFeriepenger(income);
	const rate = getFeriepengerRate(income);
	return (proratedYearly + adjustmentsForFerie) * rate;
}

// Derived calculations
export function getTotalGrossIncome(): number {
	return incomes.reduce((sum, i) => sum + getMonthlyIncome(i), 0);
}

export function getTotalNetIncome(): number {
	return incomes.reduce((sum, income) => {
		const tax = calculateTax(income);
		return sum + tax.netIncome / 12;
	}, 0);
}

export function getTotalExpenses(): number {
	return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getExpensesByCategory(category: ExpenseCategory): Expense[] {
	return expenses.filter((e) => e.category === category);
}

export function getCategoryTotal(category: ExpenseCategory): number {
	return getExpensesByCategory(category).reduce((sum, e) => sum + e.amount, 0);
}

export function getMonthlySavings(): number {
	return getTotalNetIncome() - getTotalExpenses();
}

export function getSavingsRate(): number {
	const netIncome = getTotalNetIncome();
	if (netIncome === 0) return 0;
	return (getMonthlySavings() / netIncome) * 100;
}

// Income actions
export function addIncome(
	name: string,
	yearlyAmount: number,
	employeePercentage: number,
	taxMethod: TaxMethod = 'tabelltrekk',
	customTaxPercentage?: number,
	trekkprosent?: number,
	periodType: 'fullYear' | 'custom' = 'fullYear',
	startDate?: string,
	endDate?: string,
	ferieUker: '4+1' | '5' = '5',
	isOver60: boolean = false
): void {
	incomes.push({
		id: generateId(),
		name,
		yearlyAmount,
		employeePercentage,
		taxMethod,
		customTaxPercentage: taxMethod === 'prosenttrekk' ? (customTaxPercentage ?? 35) : undefined,
		trekkprosent: taxMethod === 'tabelltrekk' ? trekkprosent : undefined,
		periodType,
		startDate: periodType === 'custom' ? startDate : undefined,
		endDate: periodType === 'custom' ? endDate : undefined,
		ferieUker,
		isOver60,
		adjustments: []
	});
}

export function updateIncome(
	id: string,
	name: string,
	yearlyAmount: number,
	employeePercentage: number,
	taxMethod: TaxMethod = 'tabelltrekk',
	customTaxPercentage?: number,
	trekkprosent?: number,
	periodType: 'fullYear' | 'custom' = 'fullYear',
	startDate?: string,
	endDate?: string,
	ferieUker: '4+1' | '5' = '5',
	isOver60: boolean = false
): void {
	const index = incomes.findIndex((i) => i.id === id);
	if (index !== -1) {
		incomes[index] = {
			...incomes[index],
			name,
			yearlyAmount,
			employeePercentage,
			taxMethod,
			customTaxPercentage: taxMethod === 'prosenttrekk' ? (customTaxPercentage ?? 35) : undefined,
			trekkprosent: taxMethod === 'tabelltrekk' ? trekkprosent : undefined,
			periodType,
			startDate: periodType === 'custom' ? startDate : undefined,
			endDate: periodType === 'custom' ? endDate : undefined,
			ferieUker,
			isOver60,
			adjustments: incomes[index].adjustments ?? []  // Preserve existing adjustments
		};
	}
}

export function removeIncome(id: string): void {
	const index = incomes.findIndex((i) => i.id === id);
	if (index !== -1) {
		incomes.splice(index, 1);
	}
}

// Adjustment actions
export function addAdjustment(
	incomeId: string,
	type: AdjustmentType,
	amount: number,
	month: number,
	description?: string,
	affectsFeriepenger?: boolean
): void {
	const income = incomes.find(i => i.id === incomeId);
	if (income) {
		// Default affectsFeriepenger based on type
		const defaultAffects = type !== 'annet';
		income.adjustments.push({
			id: generateId(),
			type,
			amount,
			month,
			description,
			affectsFeriepenger: affectsFeriepenger ?? defaultAffects
		});
	}
}

export function updateAdjustment(
	incomeId: string,
	adjustmentId: string,
	type: AdjustmentType,
	amount: number,
	month: number,
	description?: string,
	affectsFeriepenger?: boolean
): void {
	const income = incomes.find(i => i.id === incomeId);
	if (income) {
		const adjIndex = income.adjustments.findIndex(a => a.id === adjustmentId);
		if (adjIndex !== -1) {
			income.adjustments[adjIndex] = {
				...income.adjustments[adjIndex],
				type,
				amount,
				month,
				description,
				affectsFeriepenger: affectsFeriepenger ?? income.adjustments[adjIndex].affectsFeriepenger
			};
		}
	}
}

export function removeAdjustment(incomeId: string, adjustmentId: string): void {
	const income = incomes.find(i => i.id === incomeId);
	if (income) {
		const adjIndex = income.adjustments.findIndex(a => a.id === adjustmentId);
		if (adjIndex !== -1) {
			income.adjustments.splice(adjIndex, 1);
		}
	}
}

// Freelance income actions
export function addFreelanceIncome(client: string, description: string, amount: number): void {
	const mva = amount * 0.25;
	freelanceIncomes.push({ id: generateId(), client, description, amount, mva });
}

export function updateFreelanceIncome(id: string, client: string, description: string, amount: number): void {
	const index = freelanceIncomes.findIndex((f) => f.id === id);
	if (index !== -1) {
		const mva = amount * 0.25;
		freelanceIncomes[index] = { ...freelanceIncomes[index], client, description, amount, mva };
	}
}

export function removeFreelanceIncome(id: string): void {
	const index = freelanceIncomes.findIndex((f) => f.id === id);
	if (index !== -1) {
		freelanceIncomes.splice(index, 1);
	}
}

export function getTotalFreelanceIncome(): number {
	return freelanceIncomes.reduce((sum, f) => sum + f.amount, 0);
}

export function getTotalFreelanceMva(): number {
	return freelanceIncomes.reduce((sum, f) => sum + f.mva, 0);
}

// Expense actions
export function addExpense(name: string, amount: number, category: ExpenseCategory): void {
	expenses.push({ id: generateId(), name, amount, category });
}

export function updateExpense(
	id: string,
	name: string,
	amount: number,
	category: ExpenseCategory
): void {
	const index = expenses.findIndex((e) => e.id === id);
	if (index !== -1) {
		expenses[index] = { ...expenses[index], name, amount, category };
	}
}

export function removeExpense(id: string): void {
	const index = expenses.findIndex((e) => e.id === id);
	if (index !== -1) {
		expenses.splice(index, 1);
	}
}

// Getters for reactive state
export function getIncomes(): Income[] {
	return incomes;
}

export function getFreelanceIncomes(): FreelanceIncome[] {
	return freelanceIncomes;
}

export function getExpenses(): Expense[] {
	return expenses;
}

export function getEnkExpenses(): number {
	return enkExpenses;
}

export function setEnkExpenses(amount: number): void {
	enkExpenses = Math.max(0, amount);
}

export function getGlobalTaxMethod(): TaxMethod {
	return globalTaxMethod;
}

export function setGlobalTaxMethod(method: TaxMethod): void {
	globalTaxMethod = method;
}

export function getGlobalTaxPercentage(): number {
	return globalTaxPercentage;
}

export function setGlobalTaxPercentage(percentage: number): void {
	globalTaxPercentage = Math.max(0, Math.min(100, percentage));
}

// Format helpers
export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('nb-NO', {
		style: 'currency',
		currency: 'NOK',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
}

export function formatPercent(value: number): string {
	return new Intl.NumberFormat('nb-NO', {
		style: 'percent',
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	}).format(value / 100);
}
