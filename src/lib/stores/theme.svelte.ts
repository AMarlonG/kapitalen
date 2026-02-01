import { browser } from '$app/environment';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'kapitalen-theme';

function createThemeStore() {
	let theme = $state<Theme>('dark');

	if (browser) {
		const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
		if (stored === 'light' || stored === 'dark') {
			theme = stored;
		}
		// Apply theme to document
		document.documentElement.dataset.theme = theme;
	}

	return {
		get current() {
			return theme;
		},
		toggle() {
			theme = theme === 'dark' ? 'light' : 'dark';
			if (browser) {
				localStorage.setItem(STORAGE_KEY, theme);
				document.documentElement.dataset.theme = theme;
			}
		},
		set(newTheme: Theme) {
			theme = newTheme;
			if (browser) {
				localStorage.setItem(STORAGE_KEY, theme);
				document.documentElement.dataset.theme = theme;
			}
		}
	};
}

export const themeStore = createThemeStore();
