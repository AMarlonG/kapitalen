<script lang="ts">
	import {
		getExpenses,
		addExpense,
		updateExpense,
		removeExpense,
		getTotalExpenses,
		getMonthlyTotals,
		getMonthlyExpenseAmount,
		getYearlyExpenseAmount,
		expenseVaries
	} from '$lib/stores/budget.svelte';
	import { formatCurrency } from '$lib/utils/formatters';
	import type { ExpenseCategory } from '$lib/types/budget';

	// Month names in Norwegian (short)
	const MONTH_NAMES = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'Mai',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Okt',
		'Nov',
		'Des'
	];

	// UI card groups - visual grouping without changing data model
	type UICard = {
		id: string;
		title: string;
		categories: ExpenseCategory[];
		hasSubtype?: boolean;
		subtypeLabels?: Record<ExpenseCategory, string>;
	};

	const UI_CARDS: UICard[] = [
		{ id: 'faste', title: 'Faste utgifter', categories: ['faste-utgifter'] },
		{ id: 'abonnement', title: 'Abonnement', categories: ['abonnement'] },
		{
			id: 'mat',
			title: 'Mat',
			categories: ['mat-inne', 'mat-ute'],
			hasSubtype: true,
			subtypeLabels: { 'mat-inne': 'Inne', 'mat-ute': 'Ute' } as Record<ExpenseCategory, string>
		},
		{ id: 'diverse', title: 'Diverse', categories: ['diverse'] }
	];

	// Form state for expense
	let editingExpenseId = $state<string | null>(null);
	let newExpenseName = $state('');
	let newExpenseAmounts = $state<number[]>(Array(12).fill(0));
	let newExpenseCategory = $state<ExpenseCategory>('faste-utgifter');

	// Popover state - now tracks card id instead of category
	let showAddPopover = $state<string | null>(null);
	let showEditPopover = $state(false);

	// Summary dropdown state
	let showMonthlyBreakdown = $state(false);

	// Track which expense rows are expanded (by expense ID)
	let expandedExpenseIds = $state<Set<string>>(new Set());

	function toggleExpenseBreakdown(expenseId: string) {
		expandedExpenseIds = new Set(
			expandedExpenseIds.has(expenseId)
				? [...expandedExpenseIds].filter((id) => id !== expenseId)
				: [...expandedExpenseIds, expenseId]
		);
	}

	// Get the latest completed month index (0-11) for "siste" display
	// In February (1), show January (0). In January (0), show December (11).
	function getLatestCompletedMonth(): number {
		const currentMonth = new Date().getMonth();
		return currentMonth === 0 ? 11 : currentMonth - 1;
	}

	// Computed values for the form
	const formMonthlyAverage = $derived(newExpenseAmounts.reduce((a, b) => a + b, 0) / 12);
	const formYearlyTotal = $derived(newExpenseAmounts.reduce((a, b) => a + b, 0));

	function openAddPopover(card: UICard) {
		// Default to first category in the card
		newExpenseCategory = card.categories[0];
		showAddPopover = card.id;
	}

	function closeAddPopover() {
		showAddPopover = null;
		resetForm();
	}

	function openEditPopover(expense: {
		id: string;
		name: string;
		monthlyAmounts: number[];
		category: ExpenseCategory;
	}) {
		editingExpenseId = expense.id;
		newExpenseName = expense.name;
		newExpenseAmounts = [...expense.monthlyAmounts];
		newExpenseCategory = expense.category;
		showEditPopover = true;
	}

	function closeEditPopover() {
		showEditPopover = false;
		resetForm();
	}

	function resetForm() {
		editingExpenseId = null;
		newExpenseName = '';
		newExpenseAmounts = Array(12).fill(0);
		newExpenseCategory = 'faste-utgifter';
	}

	function handleAddSubmit(event: Event) {
		event.preventDefault();
		const hasAnyAmount = newExpenseAmounts.some((amt) => amt > 0);
		if (newExpenseName.trim() && hasAnyAmount) {
			addExpense(newExpenseName.trim(), newExpenseAmounts, newExpenseCategory);
			closeAddPopover();
		}
	}

	function handleEditSubmit(event: Event) {
		event.preventDefault();
		const hasAnyAmount = newExpenseAmounts.some((amt) => amt > 0);
		if (editingExpenseId && newExpenseName.trim() && hasAnyAmount) {
			updateExpense(editingExpenseId, newExpenseName.trim(), newExpenseAmounts, newExpenseCategory);
			closeEditPopover();
		}
	}

	// Fill all months with a single value
	function fillAllMonths(value: number) {
		newExpenseAmounts = Array(12).fill(value);
	}

	// Derived: yearly totals
	const totalMonthly = $derived(getTotalExpenses());
	const totalYearly = $derived(totalMonthly * 12);
</script>

<svelte:head>
	<title>Utgifter - Kapitalen</title>
</svelte:head>

<div class="container page">
	<header class="page-header">
		<h1>Utgifter</h1>
		<p class="text-muted">Administrer faste og variable utgifter</p>
	</header>

	<!-- Summary -->
	<section class="section" aria-labelledby="summary-heading">
		<h2 id="summary-heading" class="sr-only">Utgiftsoversikt</h2>
		<dl class="summary-grid summary-grid-single" aria-live="polite">
			<div class="summary-card summary-card-expandable">
				<button
					type="button"
					class="summary-card-toggle"
					onclick={() => (showMonthlyBreakdown = !showMonthlyBreakdown)}
					aria-expanded={showMonthlyBreakdown}
				>
					<dt class="summary-label">Totalt per år</dt>
					<span class="summary-hint">Klikk for å se hver måned</span>
					<dd class="summary-value">{formatCurrency(totalYearly)}</dd>
					<span class="toggle-icon">{showMonthlyBreakdown ? '▲' : '▼'}</span>
				</button>
				{#if showMonthlyBreakdown}
					{@const monthlyTotals = getMonthlyTotals()}
					<div class="monthly-breakdown">
						{#each MONTH_NAMES as month, i (i)}
							<div class="monthly-breakdown-row">
								<span>{month}</span>
								<span class="font-mono">{formatCurrency(monthlyTotals[i])}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</dl>
	</section>

	<!-- Utgifter Section -->
	<section class="section">
		<div class="section-header">
			<h2 class="section-title">Utgifter</h2>
		</div>

		<div class="utgifter-grid">
			{#each UI_CARDS as card (card.id)}
				{@const cardExpenses = getExpenses().filter((e) => card.categories.includes(e.category))}
				<div class="card utgift-card">
					<h3 class="utgift-card-title">{card.title}</h3>

					<div class="utgift-list">
						{#if cardExpenses.length > 0}
							{#each cardExpenses as expense (expense.id)}
								{@const monthly = getMonthlyExpenseAmount(expense)}
								{@const varies = expenseVaries(expense)}
								<div
									class="utgift-item"
									class:expanded={varies && expandedExpenseIds.has(expense.id)}
								>
									<div class="utgift-row">
										<span class="utgift-name">
											{expense.name}
											{#if card.hasSubtype && card.subtypeLabels}
												<span class="utgift-subtype">{card.subtypeLabels[expense.category]}</span>
											{/if}
										</span>
										<div class="utgift-actions">
											<button
												type="button"
												class="btn-icon-sm"
												onclick={() => openEditPopover(expense)}
												aria-label="Rediger {expense.name}"
											>
												&#9998;
											</button>
											<button
												type="button"
												class="btn-icon-sm btn-icon-danger"
												onclick={() => removeExpense(expense.id)}
												aria-label="Fjern {expense.name}"
											>
												&#10005;
											</button>
										</div>
										{#if varies}
											<button
												type="button"
												class="utgift-amount-toggle"
												onclick={() => toggleExpenseBreakdown(expense.id)}
												aria-expanded={expandedExpenseIds.has(expense.id)}
											>
												<span class="font-mono"
													>{formatCurrency(expense.monthlyAmounts[getLatestCompletedMonth()])}</span
												>
												<span class="utgift-period">siste</span>
												<span class="toggle-icon-sm"
													>{expandedExpenseIds.has(expense.id) ? '▲' : '▼'}</span
												>
											</button>
										{:else}
											<span class="utgift-amount-label">
												<span class="font-mono">{formatCurrency(monthly)}</span>
												<span class="utgift-period">/mnd</span>
											</span>
										{/if}
									</div>
									{#if varies && expandedExpenseIds.has(expense.id)}
										<div class="expense-monthly-breakdown">
											{#each MONTH_NAMES as month, i (i)}
												<div class="monthly-breakdown-row">
													<span>{month}</span>
													<span class="font-mono">{formatCurrency(expense.monthlyAmounts[i])}</span>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						{/if}
						<button type="button" class="btn-add-item" onclick={() => openAddPopover(card)}>
							+ Legg til
						</button>
					</div>

					{#if cardExpenses.length > 0}
						{@const cardYearlyTotal = cardExpenses.reduce(
							(sum, e) => sum + getYearlyExpenseAmount(e),
							0
						)}
						<dl class="utgift-summary">
							<div class="utgift-total-row">
								<dt>Totalt</dt>
								<dd class="font-mono">{formatCurrency(cardYearlyTotal)}/år</dd>
							</div>
						</dl>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<!-- Add Utgift Popover -->
	{#if showAddPopover}
		{@const activeCard = UI_CARDS.find((c) => c.id === showAddPopover)}
		<button type="button" class="popover-backdrop" onclick={closeAddPopover} aria-label="Lukk"
		></button>
		<div class="popover popover-xl" role="dialog" aria-labelledby="add-utgift-heading">
			<div class="popover-header">
				<h3 id="add-utgift-heading">Legg til utgift - {activeCard?.title ?? 'Utgift'}</h3>
				<button type="button" class="btn-icon" onclick={closeAddPopover} aria-label="Lukk"
					>&#10005;</button
				>
			</div>

			<form class="popover-form" onsubmit={handleAddSubmit}>
				<fieldset class="form-fieldset">
					<div class="form-group">
						<label class="form-label" for="add-expense-name">Beskrivelse</label>
						<input
							type="text"
							id="add-expense-name"
							bind:value={newExpenseName}
							placeholder="F.eks. Husleie, Netflix..."
						/>
					</div>

					{#if activeCard?.hasSubtype && activeCard.subtypeLabels}
						<div class="form-group">
							<label class="form-label" for="add-expense-subtype">Type</label>
							<div class="subtype-toggle">
								{#each activeCard.categories as cat (cat)}
									<button
										type="button"
										class="subtype-btn"
										class:active={newExpenseCategory === cat}
										onclick={() => (newExpenseCategory = cat)}
									>
										{activeCard.subtypeLabels[cat]}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<div class="form-group">
						<div class="month-grid-header">
							<span class="form-label">Beløp per måned (kr)</span>
							<div class="fill-all-group">
								<input
									type="number"
									class="fill-all-input"
									placeholder="Fyll alle"
									min="0"
									onfocus={(e) => e.currentTarget.select()}
									onchange={(e) => {
										const value = parseFloat(e.currentTarget.value) || 0;
										fillAllMonths(value);
										e.currentTarget.value = '';
									}}
								/>
							</div>
						</div>
						<div class="month-grid">
							{#each MONTH_NAMES as month, i (i)}
								<div class="month-input-group">
									<label class="month-label" for="add-month-{i}">{month}</label>
									<input
										type="number"
										id="add-month-{i}"
										class="month-input"
										bind:value={newExpenseAmounts[i]}
										placeholder="0"
										min="0"
										onfocus={(e) => e.currentTarget.select()}
									/>
								</div>
							{/each}
						</div>
					</div>

					<div class="form-computed-section">
						<div class="form-computed-row">
							<span class="form-computed-label">Snitt per måned</span>
							<span class="form-computed-value font-mono">{formatCurrency(formMonthlyAverage)}</span
							>
						</div>
						<div class="form-computed-row">
							<span class="form-computed-label">Totalt per år</span>
							<span class="form-computed-value font-mono">{formatCurrency(formYearlyTotal)}</span>
						</div>
					</div>

					<div class="popover-actions">
						<button type="button" class="btn-secondary" onclick={closeAddPopover}>Avbryt</button>
						<button type="submit" class="btn-primary">Legg til</button>
					</div>
				</fieldset>
			</form>
		</div>
	{/if}

	<!-- Edit Utgift Popover -->
	{#if showEditPopover && editingExpenseId}
		{@const editingExpense = getExpenses().find((e) => e.id === editingExpenseId)}
		<button type="button" class="popover-backdrop" onclick={closeEditPopover} aria-label="Lukk"
		></button>
		<div class="popover popover-xl" role="dialog" aria-labelledby="edit-utgift-heading">
			<div class="popover-header">
				<h3 id="edit-utgift-heading">Rediger {editingExpense?.name ?? 'utgift'}</h3>
				<button type="button" class="btn-icon" onclick={closeEditPopover} aria-label="Lukk"
					>&#10005;</button
				>
			</div>

			<form class="popover-form" onsubmit={handleEditSubmit}>
				<fieldset class="form-fieldset">
					<div class="form-group">
						<label class="form-label" for="edit-expense-name">Beskrivelse</label>
						<input
							type="text"
							id="edit-expense-name"
							bind:value={newExpenseName}
							placeholder="F.eks. Husleie, Netflix..."
						/>
					</div>
					<div class="form-group">
						<label class="form-label" for="edit-expense-category">Kategori</label>
						<select id="edit-expense-category" bind:value={newExpenseCategory}>
							{#each UI_CARDS as card (card.id)}
								{#if card.hasSubtype}
									<optgroup label={card.title}>
										{#each card.categories as cat (cat)}
											<option value={cat}>{card.subtypeLabels?.[cat] ?? cat}</option>
										{/each}
									</optgroup>
								{:else}
									<option value={card.categories[0]}>{card.title}</option>
								{/if}
							{/each}
						</select>
					</div>

					<div class="form-group">
						<div class="month-grid-header">
							<span class="form-label">Beløp per måned (kr)</span>
							<div class="fill-all-group">
								<input
									type="number"
									class="fill-all-input"
									placeholder="Fyll alle"
									min="0"
									onfocus={(e) => e.currentTarget.select()}
									onchange={(e) => {
										const value = parseFloat(e.currentTarget.value) || 0;
										fillAllMonths(value);
										e.currentTarget.value = '';
									}}
								/>
							</div>
						</div>
						<div class="month-grid">
							{#each MONTH_NAMES as month, i (i)}
								<div class="month-input-group">
									<label class="month-label" for="edit-month-{i}">{month}</label>
									<input
										type="number"
										id="edit-month-{i}"
										class="month-input"
										bind:value={newExpenseAmounts[i]}
										placeholder="0"
										min="0"
										onfocus={(e) => e.currentTarget.select()}
									/>
								</div>
							{/each}
						</div>
					</div>

					<div class="form-computed-section">
						<div class="form-computed-row">
							<span class="form-computed-label">Snitt per måned</span>
							<span class="form-computed-value font-mono">{formatCurrency(formMonthlyAverage)}</span
							>
						</div>
						<div class="form-computed-row">
							<span class="form-computed-label">Totalt per år</span>
							<span class="form-computed-value font-mono">{formatCurrency(formYearlyTotal)}</span>
						</div>
					</div>

					<div class="popover-actions">
						<button type="button" class="btn-secondary" onclick={closeEditPopover}>Avbryt</button>
						<button type="submit" class="btn-primary">Oppdater</button>
					</div>
				</fieldset>
			</form>
		</div>
	{/if}
</div>

<style>
	/* Utgifter Grid - 2x2 layout */
	.utgifter-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-lg);
	}

	@media (max-width: 768px) {
		.utgifter-grid {
			grid-template-columns: 1fr;
		}
	}

	.utgift-card {
		display: flex;
		flex-direction: column;
	}

	.utgift-card-title {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border);
	}

	.utgift-list {
		flex: 1;
	}

	.utgift-item {
		/* Container for row + optional breakdown */
	}

	.utgift-item.expanded {
		background: var(--color-bg);
		margin: 0 calc(-1 * var(--space-md));
		padding: 0 var(--space-md);
		border-radius: var(--radius-md);
	}

	.utgift-row {
		display: grid;
		grid-template-columns: 1fr auto auto;
		gap: var(--space-sm);
		align-items: center;
		padding: var(--space-xs) 0;
		font-size: 0.9rem;
	}

	.utgift-name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.utgift-subtype {
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-text-muted);
		background: var(--color-bg);
		padding: 0.1em 0.4em;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}

	.utgift-actions {
		display: flex;
		gap: 2px;
		opacity: 0.5;
		transition: opacity var(--duration-fast);
	}

	.utgift-row:hover .utgift-actions {
		opacity: 1;
	}

	.utgift-amount-label {
		display: flex;
		align-items: baseline;
		justify-content: flex-end;
		gap: 0;
		white-space: nowrap;
	}

	.utgift-period {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.utgift-amount-toggle {
		display: flex;
		align-items: baseline;
		gap: var(--space-xs);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font: inherit;
		color: inherit;
		justify-content: flex-end;
	}

	.utgift-amount-toggle:hover {
		color: var(--color-primary);
	}

	.toggle-icon-sm {
		font-size: 0.65rem;
		color: var(--color-text-muted);
		margin-left: 2px;
	}

	.expense-monthly-breakdown {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-xs) var(--space-md);
		padding: var(--space-sm) 0;
		margin-top: var(--space-xs);
		border-top: 1px solid var(--color-border);
		font-size: 0.85rem;
	}

	.expense-monthly-breakdown .monthly-breakdown-row {
		display: flex;
		justify-content: space-between;
		padding-right: var(--space-md);
		border-right: 1px solid var(--color-border);
	}

	.expense-monthly-breakdown .monthly-breakdown-row:nth-child(3n) {
		border-right: none;
		padding-right: 0;
	}

	.btn-icon-danger:hover {
		color: var(--color-danger);
	}

	.utgift-summary {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border);
	}

	.utgift-total-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
		font-weight: 600;
	}

	.btn-add-item {
		width: 100%;
		padding: var(--space-sm);
		margin-top: var(--space-sm);
		background: none;
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		cursor: pointer;
		font: inherit;
	}

	.btn-add-item:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	/* Override tight global popover form spacing */
	.popover-form .form-group {
		margin-bottom: var(--space-lg);
	}

	/* Month grid for 12-month input */
	.month-grid-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.month-grid-header .form-label {
		margin-bottom: 0;
	}

	.fill-all-group {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.fill-all-input {
		width: 100px;
		padding: var(--space-xs) var(--space-sm);
		font-size: 0.85rem;
		text-align: right;
	}

	.month-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 500px) {
		.month-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.month-input-group {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.month-label {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-text-muted);
		text-align: center;
	}

	.month-input {
		width: 100%;
		padding: var(--space-sm);
		text-align: center;
		font-size: 1rem;
	}

	/* Subtype toggle - similar to frequency toggle */
	.subtype-toggle {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.subtype-btn {
		flex: 1;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-surface);
		border: none;
		font: inherit;
		font-size: 0.9rem;
		cursor: pointer;
		color: var(--color-text-muted);
		transition:
			background var(--duration-fast),
			color var(--duration-fast);
	}

	.subtype-btn:not(:last-child) {
		border-right: 1px solid var(--color-border);
	}

	.subtype-btn:hover {
		background: var(--color-bg);
	}

	.subtype-btn.active {
		background: var(--color-primary);
		color: white;
	}

	.subtype-btn.active:hover {
		background: var(--color-primary-hover);
	}

	/* Computed section with visual separator */
	.form-computed-section {
		margin-top: var(--space-lg);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border);
	}

	/* Popover actions spacing */
	.popover-actions {
		margin-top: var(--space-lg);
	}

	/* Summary card expandable */
	.summary-card-expandable {
		position: relative;
	}

	.summary-card-toggle {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font: inherit;
		color: inherit;
		text-align: left;
	}

	.summary-card-toggle .summary-label {
		flex: 1 1 100%;
		color: var(--color-text-muted);
	}

	.summary-hint {
		flex: 1 1 100%;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		opacity: 0.7;
		margin-bottom: var(--space-xs);
	}

	.summary-card-toggle .summary-value {
		flex: 1;
		color: var(--color-text);
	}

	.toggle-icon {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-left: var(--space-sm);
	}

	.monthly-breakdown {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border);
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-xs) var(--space-md);
	}

	.monthly-breakdown-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		padding-right: var(--space-md);
		border-right: 1px solid var(--color-border);
	}

	/* Remove border on every 3rd item (last column) */
	.monthly-breakdown-row:nth-child(3n) {
		border-right: none;
		padding-right: 0;
	}
</style>
