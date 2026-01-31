<script lang="ts">
	import {
		getTotalGrossIncome,
		getTotalNetIncome,
		getTotalExpenses,
		getMonthlySavings,
		getSavingsRate,
		formatCurrency,
		formatPercent
	} from '$lib/stores/budget.svelte';
</script>

<svelte:head>
	<title>Oversikt - Kapitalen</title>
</svelte:head>

<div class="container page">
	<header class="page-header">
		<h1>Oversikt</h1>
		<p class="text-muted">Din personlige økonomi på ett sted</p>
	</header>

	<!-- Financial Summary -->
	<section class="section">
		<h2 class="section-title" style="margin-bottom: var(--space-md);">Månedlig oversikt</h2>
		<div class="summary-grid">
			<div class="summary-card">
				<div class="summary-label">Brutto inntekt</div>
				<div class="summary-value">{formatCurrency(getTotalGrossIncome())}</div>
			</div>
			<div class="summary-card">
				<div class="summary-label">Netto inntekt</div>
				<div class="summary-value">{formatCurrency(getTotalNetIncome())}</div>
			</div>
			<div class="summary-card">
				<div class="summary-label">Utgifter</div>
				<div class="summary-value">{formatCurrency(getTotalExpenses())}</div>
			</div>
			<div class="summary-card">
				<div class="summary-label">Sparing</div>
				<div class="summary-value" class:text-success={getMonthlySavings() >= 0} class:text-danger={getMonthlySavings() < 0}>
					{formatCurrency(getMonthlySavings())}
				</div>
			</div>
			<div class="summary-card">
				<div class="summary-label">Sparerate</div>
				<div class="summary-value" class:text-success={getSavingsRate() >= 0} class:text-danger={getSavingsRate() < 0}>
					{formatPercent(getSavingsRate())}
				</div>
			</div>
		</div>
	</section>

	<!-- Quick Actions -->
	<section class="section">
		<h2 class="section-title" style="margin-bottom: var(--space-md);">Kom i gang</h2>
		<div class="grid grid-cols-2 gap-md">
			<a href="/budsjett" class="card quick-action">
				<h3>Budsjett</h3>
				<p class="text-muted">Legg til inntekter og utgifter</p>
			</a>
			<a href="/eiendeler" class="card quick-action">
				<h3>Eiendeler</h3>
				<p class="text-muted">Oversikt over verdier</p>
			</a>
		</div>
	</section>
</div>

<style>
	.quick-action {
		text-decoration: none;
		color: inherit;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.quick-action:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.quick-action h3 {
		margin-bottom: var(--space-xs);
	}
</style>
