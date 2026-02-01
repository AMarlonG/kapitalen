import { browser } from '$app/environment';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'kapitalen-theme';

function createThemeStore() {
	const getInitialTheme = (): Theme => {
		if (browser) {
			const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
			if (stored === 'light' || stored === 'dark') {
				return stored;
			}
		}
		return 'dark';
	};

	let theme = $state<Theme>(getInitialTheme());

	$effect.root(() => {
		$effect(() => {
			if (browser) {
				localStorage.setItem(STORAGE_KEY, theme);
				document.documentElement.dataset.theme = theme;
			}
		});
	});

	return {
		get current() {
			return theme;
		},
		toggle() {
			theme = theme === 'dark' ? 'light' : 'dark';
		},
		set(newTheme: Theme) {
			theme = newTheme;
		}
	};
}

export const themeStore = createThemeStore();
