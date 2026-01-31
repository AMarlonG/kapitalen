<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Kapitalen - Personlig økonomi</title>
</svelte:head>

<nav class="nav">
	<div class="nav-content">
		<a href="/" class="nav-brand">Kapitalen</a>
		<div class="nav-tabs">
			<a href="/" class="nav-tab" class:active={page.url.pathname === '/'}>Oversikt</a>
			<a
				href="/budsjett"
				class="nav-tab"
				class:active={page.url.pathname.startsWith('/budsjett')}
			>
				Budsjett
			</a>
			<a
				href="/eiendeler"
				class="nav-tab"
				class:active={page.url.pathname.startsWith('/eiendeler')}
			>
				Eiendeler
			</a>
		</div>
	</div>
</nav>

<main>
	{@render children()}
</main>
