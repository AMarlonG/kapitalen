<script lang="ts">
	import {
		getTotalGrossIncome,
		getTotalNetIncome,
		getTotalExpenses,
		getMonthlySavings,
		getSavingsRate
	} from '$lib/stores/budget.svelte';
	import { formatCurrency, formatPercent } from '$lib/utils/formatters';
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
	<section class="section" aria-labelledby="summary-heading">
		<h2 id="summary-heading" class="section-title" style="margin-bottom: var(--space-md);">Månedlig oversikt</h2>
		<dl class="summary-grid">
			<div class="summary-card">
				<dt class="summary-label">Brutto inntekt</dt>
				<dd class="summary-value">{formatCurrency(getTotalGrossIncome())}</dd>
			</div>
			<div class="summary-card">
				<dt class="summary-label">Netto inntekt</dt>
				<dd class="summary-value">{formatCurrency(getTotalNetIncome())}</dd>
			</div>
			<div class="summary-card">
				<dt class="summary-label">Utgifter</dt>
				<dd class="summary-value">{formatCurrency(getTotalExpenses())}</dd>
			</div>
			<div class="summary-card">
				<dt class="summary-label">Sparing</dt>
				<dd class="summary-value" class:text-success={getMonthlySavings() >= 0} class:text-danger={getMonthlySavings() < 0}>
					{formatCurrency(getMonthlySavings())}
				</dd>
			</div>
			<div class="summary-card">
				<dt class="summary-label">Sparerate</dt>
				<dd class="summary-value" class:text-success={getSavingsRate() >= 0} class:text-danger={getSavingsRate() < 0}>
					{formatPercent(getSavingsRate())}
				</dd>
			</div>
		</dl>
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
		transition: transform var(--duration-fast) ease, box-shadow var(--duration-fast) ease;
	}

	.quick-action:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.quick-action h3 {
		margin-bottom: var(--space-xs);
	}
</style>
