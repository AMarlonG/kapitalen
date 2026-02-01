/**
 * Validation Service
 * Input validation utilities for budget data
 */

import type { Income, IncomeAdjustment, Expense } from '../types/budget';

/**
 * Validation result with error message
 */
export interface ValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Validates an ISO date string (YYYY-MM-DD)
 * @returns Valid Date object or null if invalid
 */
export function validateDate(dateString: string | undefined): Date | null {
	if (!dateString) return null;

	const date = new Date(dateString);
	if (isNaN(date.getTime())) return null;

	// Check if it matches YYYY-MM-DD format
	const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!isoRegex.test(dateString)) return null;

	return date;
}

/**
 * Validates that end date is >= start date
 */
export function validateDateRange(
	startDate: string | undefined,
	endDate: string | undefined
): ValidationResult {
	const start = validateDate(startDate);
	const end = validateDate(endDate);

	if (!start || !end) {
		return { valid: false, error: 'Invalid date format. Expected YYYY-MM-DD.' };
	}

	if (end < start) {
		return { valid: false, error: 'End date must be on or after start date.' };
	}

	return { valid: true };
}

/**
 * Validates a numeric amount (non-negative)
 */
export function validateAmount(amount: number): ValidationResult {
	if (typeof amount !== 'number' || isNaN(amount)) {
		return { valid: false, error: 'Amount must be a valid number.' };
	}

	if (amount < 0) {
		return { valid: false, error: 'Amount cannot be negative.' };
	}

	return { valid: true };
}

/**
 * Validates a percentage value (0-100)
 */
export function validatePercentage(percentage: number): ValidationResult {
	if (typeof percentage !== 'number' || isNaN(percentage)) {
		return { valid: false, error: 'Percentage must be a valid number.' };
	}

	if (percentage < 0 || percentage > 100) {
		return { valid: false, error: 'Percentage must be between 0 and 100.' };
	}

	return { valid: true };
}

/**
 * Validates a month value (1-12)
 */
export function validateMonth(month: number): ValidationResult {
	if (!Number.isInteger(month) || month < 1 || month > 12) {
		return { valid: false, error: 'Month must be an integer between 1 and 12.' };
	}

	return { valid: true };
}

/**
 * Validates a non-empty string
 */
export function validateNonEmptyString(value: string, fieldName: string): ValidationResult {
	if (!value || typeof value !== 'string' || value.trim().length === 0) {
		return { valid: false, error: `${fieldName} cannot be empty.` };
	}

	return { valid: true };
}

/**
 * Validates an income object
 */
export function validateIncome(income: Partial<Income>): ValidationResult {
	// Required fields
	if (!income.name?.trim()) {
		return { valid: false, error: 'Income name is required.' };
	}

	// Validate yearly amount
	const amountResult = validateAmount(income.yearlyAmount ?? -1);
	if (!amountResult.valid) {
		return { valid: false, error: `Yearly amount: ${amountResult.error}` };
	}

	// Validate employee percentage
	const percentResult = validatePercentage(income.employeePercentage ?? -1);
	if (!percentResult.valid) {
		return { valid: false, error: `Employee percentage: ${percentResult.error}` };
	}

	// Validate custom dates if periodType is custom
	if (income.periodType === 'custom') {
		const dateRangeResult = validateDateRange(income.startDate, income.endDate);
		if (!dateRangeResult.valid) {
			return dateRangeResult;
		}
	}

	// Validate custom tax percentage if prosenttrekk
	if (income.taxMethod === 'prosenttrekk' && income.customTaxPercentage !== undefined) {
		const taxPercentResult = validatePercentage(income.customTaxPercentage);
		if (!taxPercentResult.valid) {
			return { valid: false, error: `Tax percentage: ${taxPercentResult.error}` };
		}
	}

	return { valid: true };
}

/**
 * Validates an income adjustment
 */
export function validateAdjustment(adjustment: Partial<IncomeAdjustment>): ValidationResult {
	// Validate amount
	const amountResult = validateAmount(adjustment.amount ?? -1);
	if (!amountResult.valid) {
		return { valid: false, error: `Adjustment amount: ${amountResult.error}` };
	}

	// Validate month
	const monthResult = validateMonth(adjustment.month ?? 0);
	if (!monthResult.valid) {
		return monthResult;
	}

	// Validate type
	const validTypes = ['bonus', 'overtid', 'annet'];
	if (!adjustment.type || !validTypes.includes(adjustment.type)) {
		return { valid: false, error: 'Invalid adjustment type.' };
	}

	return { valid: true };
}

/**
 * Validates an expense object
 */
export function validateExpense(expense: Partial<Expense>): ValidationResult {
	// Required fields
	if (!expense.name?.trim()) {
		return { valid: false, error: 'Expense name is required.' };
	}

	// Validate amount
	const amountResult = validateAmount(expense.amount ?? -1);
	if (!amountResult.valid) {
		return { valid: false, error: `Expense amount: ${amountResult.error}` };
	}

	// Validate category
	const validCategories = ['bolig', 'transport', 'mat', 'forsikring', 'annet'];
	if (!expense.category || !validCategories.includes(expense.category)) {
		return { valid: false, error: 'Invalid expense category.' };
	}

	return { valid: true };
}
