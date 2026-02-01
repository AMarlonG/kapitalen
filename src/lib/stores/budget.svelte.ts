/**
 * Budget Store
 * Reactive state management for income, expenses, and tax calculations
 */

import type {
	TaxMethod,
	AdjustmentType,
	ExpenseCategory,
	IncomeAdjustment,
	Income,
	FreelanceIncome,
	Expense,
	CombinedTaxBreakdown
} from '../types/budget';

import { untrack } from 'svelte';
import { browser } from '$app/environment';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../services/storage';
import { MVA_RATE, DEFAULT_TAX_PERCENTAGE } from '../constants/tax';
import {
	calculateCombinedTax as calculateCombinedTaxInternal,
	calculateTax,
	getMonthlyIncome
} from '../services/tax-calculator';

// ============================================
// STATE
// ============================================

function generateId(): string {
	return crypto.randomUUID();
}

function migrateIncomes(stored: Income[]): Income[] {
	return stored.map((income) => ({
		...income,
		periodType: income.periodType ?? 'fullYear',
		ferieUker: income.ferieUker ?? '5',
		isOver60: income.isOver60 ?? false,
		adjustments: income.adjustments ?? []
	}));
}

let incomes = $state<Income[]>(migrateIncomes(loadFromStorage(STORAGE_KEYS.incomes, [])));
let freelanceIncomes = $state<FreelanceIncome[]>(loadFromStorage(STORAGE_KEYS.freelance, []));
let expenses = $state<Expense[]>(loadFromStorage(STORAGE_KEYS.expenses, []));
let enkExpenses = $state<number>(loadFromStorage(STORAGE_KEYS.enkExpenses, 0));
let globalTaxMethod = $state<TaxMethod>(loadFromStorage(STORAGE_KEYS.taxMethod, 'tabelltrekk'));
let globalTaxPercentage = $state<number>(loadFromStorage(STORAGE_KEYS.taxPercentage, DEFAULT_TAX_PERCENTAGE));

// Rehydrate from localStorage on client before effects run
// This prevents SSR defaults from overwriting real user data
if (browser) {
	untrack(() => {
		incomes = migrateIncomes(loadFromStorage(STORAGE_KEYS.incomes, []));
		freelanceIncomes = loadFromStorage(STORAGE_KEYS.freelance, []);
		expenses = loadFromStorage(STORAGE_KEYS.expenses, []);
		enkExpenses = loadFromStorage(STORAGE_KEYS.enkExpenses, 0);
		globalTaxMethod = loadFromStorage(STORAGE_KEYS.taxMethod, 'tabelltrekk');
		globalTaxPercentage = loadFromStorage(STORAGE_KEYS.taxPercentage, DEFAULT_TAX_PERCENTAGE);
	});
}

// ============================================
// PERSISTENCE
// ============================================

$effect.root(() => {
	$effect(() => {
		try { saveToStorage(STORAGE_KEYS.incomes, incomes); }
		catch (e) { console.warn('Failed to save incomes:', e); }
	});

	$effect(() => {
		try { saveToStorage(STORAGE_KEYS.freelance, freelanceIncomes); }
		catch (e) { console.warn('Failed to save freelance incomes:', e); }
	});

	$effect(() => {
		try { saveToStorage(STORAGE_KEYS.expenses, expenses); }
		catch (e) { console.warn('Failed to save expenses:', e); }
	});

	$effect(() => {
		try { saveToStorage(STORAGE_KEYS.enkExpenses, enkExpenses); }
		catch (e) { console.warn('Failed to save ENK expenses:', e); }
	});

	$effect(() => {
		try { saveToStorage(STORAGE_KEYS.taxMethod, globalTaxMethod); }
		catch (e) { console.warn('Failed to save tax method:', e); }
	});

	$effect(() => {
		try { saveToStorage(STORAGE_KEYS.taxPercentage, globalTaxPercentage); }
		catch (e) { console.warn('Failed to save tax percentage:', e); }
	});
});

// ============================================
// COMBINED TAX CALCULATION
// ============================================

export function calculateCombinedTax(): CombinedTaxBreakdown {
	const freelanceGross = freelanceIncomes.reduce((sum, f) => sum + f.amount, 0);
	return calculateCombinedTaxInternal({
		incomes,
		freelanceGross,
		enkExpenses,
		globalTaxMethod,
		globalTaxPercentage
	});
}

// ============================================
// DERIVED CALCULATIONS
// ============================================

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
	return netIncome === 0 ? 0 : (getMonthlySavings() / netIncome) * 100;
}

export function getTotalFreelanceIncome(): number {
	return freelanceIncomes.reduce((sum, f) => sum + f.amount, 0);
}

export function getTotalFreelanceMva(): number {
	return freelanceIncomes.reduce((sum, f) => sum + f.mva, 0);
}

// ============================================
// INCOME CRUD
// ============================================

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
		customTaxPercentage: taxMethod === 'prosenttrekk' ? (customTaxPercentage ?? DEFAULT_TAX_PERCENTAGE) : undefined,
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
			customTaxPercentage: taxMethod === 'prosenttrekk' ? (customTaxPercentage ?? DEFAULT_TAX_PERCENTAGE) : undefined,
			trekkprosent: taxMethod === 'tabelltrekk' ? trekkprosent : undefined,
			periodType,
			startDate: periodType === 'custom' ? startDate : undefined,
			endDate: periodType === 'custom' ? endDate : undefined,
			ferieUker,
			isOver60,
			adjustments: incomes[index].adjustments ?? []
		};
	}
}

export function removeIncome(id: string): void {
	const index = incomes.findIndex((i) => i.id === id);
	if (index !== -1) {
		incomes.splice(index, 1);
	}
}

// ============================================
// ADJUSTMENT CRUD
// ============================================

export function addAdjustment(
	incomeId: string,
	type: AdjustmentType,
	amount: number,
	month: number,
	description?: string,
	affectsFeriepenger?: boolean
): void {
	const income = incomes.find((i) => i.id === incomeId);
	if (income) {
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
	const income = incomes.find((i) => i.id === incomeId);
	if (income) {
		const adjIndex = income.adjustments.findIndex((a) => a.id === adjustmentId);
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
	const income = incomes.find((i) => i.id === incomeId);
	if (income) {
		const adjIndex = income.adjustments.findIndex((a) => a.id === adjustmentId);
		if (adjIndex !== -1) {
			income.adjustments.splice(adjIndex, 1);
		}
	}
}

// ============================================
// FREELANCE CRUD
// ============================================

export function addFreelanceIncome(client: string, description: string, amount: number): void {
	const mva = amount * MVA_RATE;
	freelanceIncomes.push({ id: generateId(), client, description, amount, mva });
}

export function updateFreelanceIncome(id: string, client: string, description: string, amount: number): void {
	const index = freelanceIncomes.findIndex((f) => f.id === id);
	if (index !== -1) {
		const mva = amount * MVA_RATE;
		freelanceIncomes[index] = { ...freelanceIncomes[index], client, description, amount, mva };
	}
}

export function removeFreelanceIncome(id: string): void {
	const index = freelanceIncomes.findIndex((f) => f.id === id);
	if (index !== -1) {
		freelanceIncomes.splice(index, 1);
	}
}

// ============================================
// EXPENSE CRUD
// ============================================

export function addExpense(name: string, amount: number, category: ExpenseCategory): void {
	expenses.push({ id: generateId(), name, amount, category });
}

export function updateExpense(id: string, name: string, amount: number, category: ExpenseCategory): void {
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

// ============================================
// STATE GETTERS/SETTERS
// ============================================

export function getIncomes(): Income[] { return incomes; }
export function getFreelanceIncomes(): FreelanceIncome[] { return freelanceIncomes; }
export function getExpenses(): Expense[] { return expenses; }
export function getEnkExpenses(): number { return enkExpenses; }
export function setEnkExpenses(amount: number): void { enkExpenses = Math.max(0, amount); }
export function getGlobalTaxMethod(): TaxMethod { return globalTaxMethod; }
export function setGlobalTaxMethod(method: TaxMethod): void { globalTaxMethod = method; }
export function getGlobalTaxPercentage(): number { return globalTaxPercentage; }
export function setGlobalTaxPercentage(percentage: number): void {
	globalTaxPercentage = Math.max(0, Math.min(100, percentage));
}
