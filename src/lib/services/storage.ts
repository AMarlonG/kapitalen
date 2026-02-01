/**
 * Storage Service
 * LocalStorage abstraction with error handling
 */

import { browser } from '$app/environment';
import { STORAGE_KEYS } from '../constants/tax';

export { STORAGE_KEYS };

/**
 * Load data from LocalStorage
 * @returns Parsed value or default if not found/invalid
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
	if (!browser) return defaultValue;

	try {
		const stored = localStorage.getItem(key);
		if (stored === null) return defaultValue;

		const parsed = JSON.parse(stored);
		return parsed as T;
	} catch (error) {
		console.warn(`Failed to load from storage key "${key}":`, error);
		return defaultValue;
	}
}

/**
 * Save data to LocalStorage
 * @returns true if save succeeded, false otherwise
 */
export function saveToStorage<T>(key: string, value: T): boolean {
	if (!browser) return false;

	try {
		const serialized = JSON.stringify(value);
		localStorage.setItem(key, serialized);
		return true;
	} catch (error) {
		console.warn(`Failed to save to storage key "${key}":`, error);
		return false;
	}
}

/**
 * Remove data from LocalStorage
 * @returns true if removal succeeded, false otherwise
 */
export function removeFromStorage(key: string): boolean {
	if (!browser) return false;

	try {
		localStorage.removeItem(key);
		return true;
	} catch (error) {
		console.warn(`Failed to remove storage key "${key}":`, error);
		return false;
	}
}

/**
 * Check if a key exists in LocalStorage
 */
export function hasStorageKey(key: string): boolean {
	if (!browser) return false;

	try {
		return localStorage.getItem(key) !== null;
	} catch {
		return false;
	}
}

/**
 * Create a debounced save function
 * Prevents rapid writes to LocalStorage
 */
export function createDebouncedSave<T>(key: string, delayMs: number = 300): (value: T) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return (value: T) => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			saveToStorage(key, value);
			timeoutId = null;
		}, delayMs);
	};
}

/**
 * Clear all app-related storage
 */
export function clearAllAppStorage(): boolean {
	if (!browser) return false;

	try {
		Object.values(STORAGE_KEYS).forEach((key) => {
			localStorage.removeItem(key);
		});
		return true;
	} catch (error) {
		console.warn('Failed to clear app storage:', error);
		return false;
	}
}
