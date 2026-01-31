import { browser } from '$app/environment';

// Types
export interface Income {
	id: string;
	name: string;
	amount: number;
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

// Constants
const TAX_RATE = 0.35; // 35% average tax rate for Norway
const STORAGE_KEYS = {
	incomes: 'kapitalen_incomes',
	expenses: 'kapitalen_expenses'
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

// Reactive state
let incomes = $state<Income[]>(loadFromStorage(STORAGE_KEYS.incomes, []));
let expenses = $state<Expense[]>(loadFromStorage(STORAGE_KEYS.expenses, []));

// Persist to LocalStorage when state changes
$effect.root(() => {
	$effect(() => {
		saveToStorage(STORAGE_KEYS.incomes, incomes);
	});

	$effect(() => {
		saveToStorage(STORAGE_KEYS.expenses, expenses);
	});
});

// Derived calculations
export function getTotalGrossIncome(): number {
	return incomes.reduce((sum, i) => sum + i.amount, 0);
}

export function getTotalNetIncome(): number {
	return getTotalGrossIncome() * (1 - TAX_RATE);
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
export function addIncome(name: string, amount: number): void {
	incomes.push({ id: generateId(), name, amount });
}

export function updateIncome(id: string, name: string, amount: number): void {
	const index = incomes.findIndex((i) => i.id === id);
	if (index !== -1) {
		incomes[index] = { ...incomes[index], name, amount };
	}
}

export function removeIncome(id: string): void {
	const index = incomes.findIndex((i) => i.id === id);
	if (index !== -1) {
		incomes.splice(index, 1);
	}
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

export function getExpenses(): Expense[] {
	return expenses;
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
