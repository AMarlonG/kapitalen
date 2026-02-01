/**
 * Formatters Utility
 * Currency, percent, and date formatting for Norwegian locale
 */

/**
 * Format amount as Norwegian currency (NOK)
 */
export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('nb-NO', {
		style: 'currency',
		currency: 'NOK',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
}

/**
 * Format amount as compact currency (e.g., "1,2 mill")
 */
export function formatCurrencyCompact(amount: number): string {
	if (Math.abs(amount) >= 1_000_000) {
		return new Intl.NumberFormat('nb-NO', {
			style: 'currency',
			currency: 'NOK',
			notation: 'compact',
			maximumFractionDigits: 1
		}).format(amount);
	}
	return formatCurrency(amount);
}

/**
 * Format number without currency symbol
 */
export function formatNumber(amount: number): string {
	return new Intl.NumberFormat('nb-NO', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
}

/**
 * Format value as percentage (input is 0-100 scale)
 */
export function formatPercent(value: number): string {
	return new Intl.NumberFormat('nb-NO', {
		style: 'percent',
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	}).format(value / 100);
}

/**
 * Format value as percentage with decimal input (0-1 scale)
 */
export function formatPercentDecimal(value: number): string {
	return new Intl.NumberFormat('nb-NO', {
		style: 'percent',
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	}).format(value);
}

/**
 * Format month index (0-11) as Norwegian month name
 */
export function formatMonth(monthIndex: number): string {
	const months = [
		'Januar',
		'Februar',
		'Mars',
		'April',
		'Mai',
		'Juni',
		'Juli',
		'August',
		'September',
		'Oktober',
		'November',
		'Desember'
	];
	return months[monthIndex] ?? '';
}

/**
 * Format month number (1-12) as Norwegian month name
 */
export function formatMonthNumber(month: number): string {
	return formatMonth(month - 1);
}

/**
 * Format date as Norwegian date string
 */
export function formatDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return new Intl.DateTimeFormat('nb-NO', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}).format(d);
}

/**
 * Format date as short Norwegian date (DD.MM.YYYY)
 */
export function formatDateShort(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return new Intl.DateTimeFormat('nb-NO', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(d);
}

/**
 * Format ISO date string for display (YYYY-MM-DD to DD.MM.YYYY)
 */
export function formatIsoDate(isoDate: string): string {
	const [year, month, day] = isoDate.split('-');
	return `${day}.${month}.${year}`;
}
