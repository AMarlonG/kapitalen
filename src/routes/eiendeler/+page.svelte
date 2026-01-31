<script lang="ts">
	import { formatCurrency } from '$lib/stores/budget.svelte';
</script>

<svelte:head>
	<title>Eiendeler - Kapitalen</title>
</svelte:head>

<div class="container page">
	<header class="page-header">
		<h1>Eiendeler</h1>
		<p class="text-muted">Oversikt over dine verdier</p>
	</header>

	<!-- Placeholder Content -->
	<section class="section">
		<div class="card placeholder-card">
			<div class="placeholder-icon">📊</div>
			<h2>Kommer snart</h2>
			<p class="text-muted">
				Her vil du kunne registrere og følge med på verdiene dine, som bankkontoer, fond, aksjer,
				eiendom og andre eiendeler.
			</p>
			<a href="/budsjett" class="btn-primary" style="margin-top: var(--space-md); display: inline-block;">
				Gå til budsjett
			</a>
		</div>
	</section>
</div>

<style>
	.placeholder-card {
		text-align: center;
		padding: var(--space-2xl);
	}

	.placeholder-icon {
		font-size: 3rem;
		margin-bottom: var(--space-md);
	}

	.placeholder-card h2 {
		margin-bottom: var(--space-sm);
	}

	.placeholder-card p {
		max-width: 400px;
		margin: 0 auto;
	}
</style>
