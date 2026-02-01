<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { themeStore } from '$lib/stores/theme.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Kapitalen - Personlig økonomi</title>
</svelte:head>

<nav class="nav" aria-label="Hovednavigasjon">
	<div class="nav-content">
		<a href="/" class="nav-brand">Kapitalen</a>
		<ul class="nav-tabs">
			<li>
				<button
					class="theme-toggle"
					onclick={() => themeStore.toggle()}
					aria-label={themeStore.current === 'dark' ? 'Bytt til lyst tema' : 'Bytt til mørkt tema'}
				>
					{#if themeStore.current === 'dark'}
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<circle cx="12" cy="12" r="5"></circle>
							<path
								d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
							></path>
						</svg>
					{:else}
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
						</svg>
					{/if}
				</button>
			</li>
			<li>
				<a
					href="/"
					class="nav-tab"
					class:active={page.url.pathname === '/'}
					aria-current={page.url.pathname === '/' ? 'page' : undefined}
				>
					Oversikt
				</a>
			</li>
			<li>
				<a
					href="/budsjett"
					class="nav-tab"
					class:active={page.url.pathname.startsWith('/budsjett')}
					aria-current={page.url.pathname.startsWith('/budsjett') ? 'page' : undefined}
				>
					Inntekter
				</a>
			</li>
			<li>
				<a
					href="/utgifter"
					class="nav-tab"
					class:active={page.url.pathname.startsWith('/utgifter')}
					aria-current={page.url.pathname.startsWith('/utgifter') ? 'page' : undefined}
				>
					Utgifter
				</a>
			</li>
			<li>
				<a
					href="/eiendeler"
					class="nav-tab"
					class:active={page.url.pathname.startsWith('/eiendeler')}
					aria-current={page.url.pathname.startsWith('/eiendeler') ? 'page' : undefined}
				>
					Eiendeler
				</a>
			</li>
		</ul>
	</div>
</nav>

<main>
	{@render children()}
</main>
