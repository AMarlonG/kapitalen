/**
 * Tax Calculator Service
 * Pure tax calculation functions for Norwegian taxes (2026)
 */

import type {
	Income,
	TaxBreakdown,
	CombinedTaxBreakdown,
	TrinnskattBracket,
	WithholdingResult,
	TaxMethod,
	FerieUker
} from '../types/budget';
import {
	TRINNSKATT_BRACKETS,
	TRYGDEAVGIFT_RATE_LONN,
	TRYGDEAVGIFT_RATE_NAERING,
	FELLESSKATT_RATE,
	PERSONFRADRAG_2026,
	MINSTEFRADRAG_RATE,
	MINSTEFRADRAG_MAX_2026,
	FERIEPENGER_RATES,
	WITHHOLDING_BRACKETS,
	DEFAULT_TAX_PERCENTAGE
} from '../constants/tax';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate months worked based on period type and dates
 */
export function getMonthsWorked(income: Income): number {
	if (income.periodType === 'fullYear' || !income.startDate || !income.endDate) {
		return 12;
	}

	const start = new Date(income.startDate);
	const end = new Date(income.endDate);

	// Calculate months between dates (inclusive)
	const months =
		(end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

	return Math.min(12, Math.max(1, months));
}

/**
 * Get monthly income for a single income entry (prorated)
 */
export function getMonthlyIncome(income: Income): number {
	const fullYearAmount = (income.yearlyAmount * income.employeePercentage) / 100;
	const months = getMonthsWorked(income);
	const proratedYearly = (fullYearAmount * months) / 12;
	return proratedYearly / 12;
}

/**
 * Get prorated yearly amount (for UI display)
 */
export function getProratedYearlyAmount(income: Income): number {
	const fullYearAmount = (income.yearlyAmount * income.employeePercentage) / 100;
	const months = getMonthsWorked(income);
	return (fullYearAmount * months) / 12;
}

/**
 * Get total adjustments for an income
 */
export function getTotalAdjustments(income: Income): number {
	return (income.adjustments ?? []).reduce((sum, adj) => sum + adj.amount, 0);
}

/**
 * Get adjustments that affect feriepenger
 */
export function getAdjustmentsForFeriepenger(income: Income): number {
	return (income.adjustments ?? []).reduce(
		(sum, adj) => (adj.affectsFeriepenger ? sum + adj.amount : sum),
		0
	);
}

// ============================================
// TRINNSKATT (Progressive bracket tax)
// ============================================

interface TrinnskattResult {
	total: number;
	breakdown: TrinnskattBracket[];
}

/**
 * Calculate trinnskatt with detailed breakdown
 */
export function calculateTrinnskattWithBreakdown(income: number): TrinnskattResult {
	let total = 0;
	const breakdown: TrinnskattBracket[] = [];

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

/**
 * Calculate trinnskatt total only
 */
export function calculateTrinnskatt(income: number): number {
	return calculateTrinnskattWithBreakdown(income).total;
}

// ============================================
// TRYGDEAVGIFT (Social security tax)
// ============================================

/**
 * Calculate trygdeavgift for employment income
 */
export function calculateTrygdeavgiftLonn(grossLonn: number): number {
	return grossLonn * TRYGDEAVGIFT_RATE_LONN;
}

/**
 * Calculate trygdeavgift for self-employment (ENK)
 */
export function calculateTrygdeavgiftEnk(netEnk: number): number {
	return netEnk * TRYGDEAVGIFT_RATE_NAERING;
}

// ============================================
// FELLESSKATT (Common tax)
// ============================================

/**
 * Calculate minstefradrag (employment deduction)
 */
export function calculateMinstefradrag(grossLonn: number): number {
	return Math.min(grossLonn * MINSTEFRADRAG_RATE, MINSTEFRADRAG_MAX_2026);
}

/**
 * Calculate alminnelig inntekt (ordinary income for fellesskatt)
 */
export function calculateAlminneligInntekt(
	totalPersoninntekt: number,
	minstefradrag: number
): number {
	return Math.max(0, totalPersoninntekt - minstefradrag - PERSONFRADRAG_2026);
}

/**
 * Calculate fellesskatt
 */
export function calculateFellesskatt(alminneligInntekt: number): number {
	return alminneligInntekt * FELLESSKATT_RATE;
}

// ============================================
// WITHHOLDING ESTIMATES
// ============================================

/**
 * Estimate withholding for tabelltrekk (simplified calculation)
 * This is a simplified estimate - real tabelltrekk rates vary by tax class
 */
export function calculateEstimatedWithholding(grossIncome: number): number {
	// Find applicable bracket (iterate from highest to lowest)
	for (let i = WITHHOLDING_BRACKETS.length - 1; i >= 0; i--) {
		if (grossIncome > WITHHOLDING_BRACKETS[i].threshold) {
			return grossIncome * WITHHOLDING_BRACKETS[i].rate;
		}
	}
	return grossIncome * WITHHOLDING_BRACKETS[0].rate;
}

/**
 * Calculate withholding for a single income entry
 */
export function calculateWithholding(income: Income): WithholdingResult {
	const grossIncome = (income.yearlyAmount * income.employeePercentage) / 100;

	if (income.taxMethod === 'prosenttrekk') {
		const taxPercent = income.customTaxPercentage ?? DEFAULT_TAX_PERCENTAGE;
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

// ============================================
// FERIEPENGER (Holiday pay)
// ============================================

/**
 * Get feriepenger rate based on vacation weeks and age
 */
export function getFeriepengerRate(ferieUker: FerieUker, isOver60: boolean): number {
	const rates = FERIEPENGER_RATES[ferieUker];
	return isOver60 ? rates.over60 : rates.standard;
}

/**
 * Calculate feriepenger for an income
 */
export function calculateFeriepenger(income: Income): number {
	const proratedYearly = getProratedYearlyAmount(income);
	const adjustmentsForFerie = getAdjustmentsForFeriepenger(income);
	const rate = getFeriepengerRate(income.ferieUker, income.isOver60);
	return (proratedYearly + adjustmentsForFerie) * rate;
}

// ============================================
// SINGLE INCOME TAX CALCULATION
// ============================================

/**
 * Calculate tax for a single income (legacy method for display)
 */
export function calculateTax(income: Income): TaxBreakdown {
	const grossIncome = (income.yearlyAmount * income.employeePercentage) / 100;

	// Prosenttrekk: simple percentage calculation
	if (income.taxMethod === 'prosenttrekk') {
		const taxPercent = income.customTaxPercentage ?? DEFAULT_TAX_PERCENTAGE;
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
		fellesskatt: withheld, // Show total withholding
		totalTax: withheld,
		netIncome: grossIncome - withheld,
		effectiveRate: grossIncome > 0 ? (withheld / grossIncome) * 100 : 0
	};
}

// ============================================
// COMBINED TAX CALCULATION
// ============================================

interface CombinedTaxInput {
	incomes: Income[];
	freelanceGross: number;
	enkExpenses: number;
	globalTaxMethod: TaxMethod;
	globalTaxPercentage: number;
}

/**
 * Main combined tax calculation
 * Calculates total tax liability across all income sources
 */
export function calculateCombinedTax(input: CombinedTaxInput): CombinedTaxBreakdown {
	const { incomes, freelanceGross, enkExpenses, globalTaxMethod, globalTaxPercentage } = input;

	// === Step 1: Calculate lønn (all fixed income + adjustments) - GROSS (prorated by period) ===
	const lonnGross = incomes.reduce((sum, i) => {
		const fullYearAmount = (i.yearlyAmount * i.employeePercentage) / 100;
		const months = getMonthsWorked(i);
		const baseSalary = (fullYearAmount * months) / 12;
		const adjustments = getTotalAdjustments(i);
		return sum + baseSalary + adjustments;
	}, 0);

	// === Step 2: Calculate ENK net ===
	const enkGross = freelanceGross;
	const enkNet = Math.max(0, enkGross - enkExpenses);

	// === Step 3: Trygdeavgift (on GROSS amounts, NOT after minstefradrag) ===
	const trygdeavgiftLonn = calculateTrygdeavgiftLonn(lonnGross);
	const trygdeavgiftEnk = calculateTrygdeavgiftEnk(enkNet);

	// === Step 4: Trinnskatt on combined personinntekt (GROSS lønn + netto ENK) ===
	const totalPersoninntekt = lonnGross + enkNet;
	const trinnskattResult = calculateTrinnskattWithBreakdown(totalPersoninntekt);

	// === Step 5: Fellesskatt (where minstefradrag and personfradrag apply) ===
	const minstefradrag = calculateMinstefradrag(lonnGross);
	const alminneligInntekt = calculateAlminneligInntekt(totalPersoninntekt, minstefradrag);
	const fellesskatt = calculateFellesskatt(alminneligInntekt);

	// === Per-box totals ===
	const skattFraLonn = trygdeavgiftLonn;
	const skattFraOppdrag = trygdeavgiftEnk;
	const skattFraKombinert = trinnskattResult.total + fellesskatt;

	// === Total actual tax liability ===
	const totalTax = trygdeavgiftLonn + trygdeavgiftEnk + trinnskattResult.total + fellesskatt;

	// === Withholding calculation (what employer withholds from lønn, prorated) ===
	const skattetrekk = incomes.reduce((sum, i) => {
		const fullYearAmount = (i.yearlyAmount * i.employeePercentage) / 100;
		const months = getMonthsWorked(i);
		const proratedAmount = (fullYearAmount * months) / 12;

		// Use GLOBAL tax method
		if (globalTaxMethod === 'prosenttrekk') {
			return sum + (proratedAmount * globalTaxPercentage) / 100;
		}

		// For tabelltrekk, use per-income trekkprosent if available
		if (i.trekkprosent !== undefined && i.trekkprosent > 0) {
			return sum + (proratedAmount * i.trekkprosent) / 100;
		}

		// Fallback: estimate based on effective rate (simplified)
		return sum + calculateEstimatedWithholding(proratedAmount);
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
		personfradrag: PERSONFRADRAG_2026,
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
