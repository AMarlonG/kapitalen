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
		expenseVaries,
		getFoodExpenses,
		updateFoodMonth
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
	};

	const UI_CARDS: UICard[] = [
		{ id: 'faste', title: 'Faste utgifter', categories: ['faste-utgifter'] },
		{ id: 'abonnement', title: 'Abonnement', categories: ['abonnement'] },
		{ id: 'mat', title: 'Mat', categories: [] }, // Placeholder for grid position, rendered separately
		{ id: 'diverse', title: 'Diverse', categories: ['diverse'] }
	];

	// Form state for expense
	let editingExpenseId = $state<string | null>(null);
	let newExpenseName = $state('');
	let newExpenseAmounts = $state<(number | null)[]>(Array(12).fill(null));
	let newExpenseCategory = $state<ExpenseCategory>('faste-utgifter');

	// Payment frequency state
	let paymentFrequency = $state<'monthly' | 'yearly'>('monthly');
	let yearlyAmount = $state<number | null>(null);
	let yearlyPaymentMonth = $state<number>(0); // 0 = January

	// Popover state - now tracks card id instead of category
	let showAddPopover = $state<string | null>(null);
	let showEditPopover = $state(false);

	// Summary dropdown state
	let showMonthlyBreakdown = $state(false);

	// Track which expense rows are expanded (by expense ID)
	let expandedExpenseIds = $state<Set<string>>(new Set());

	// Track which mat month rows are expanded (by month index)
	let expandedMatMonths = $state<Set<number>>(new Set());

	// Mat popover state
	let showMatPopover = $state(false);
	let editingMatMonth = $state<number | null>(null); // null = adding, 0-11 = editing
	let matInneAmount = $state<number | null>(null);
	let matUteAmount = $state<number | null>(null);
	let selectedMatMonth = $state<number>(0);

	function toggleExpenseBreakdown(expenseId: string) {
		expandedExpenseIds = new Set(
			expandedExpenseIds.has(expenseId)
				? [...expandedExpenseIds].filter((id) => id !== expenseId)
				: [...expandedExpenseIds, expenseId]
		);
	}

	function toggleMatMonthBreakdown(monthIndex: number) {
		expandedMatMonths = new Set(
			expandedMatMonths.has(monthIndex)
				? [...expandedMatMonths].filter((idx) => idx !== monthIndex)
				: [...expandedMatMonths, monthIndex]
		);
	}

	function removeMatMonth(monthIndex: number) {
		updateFoodMonth('inne', monthIndex, 0);
		updateFoodMonth('ute', monthIndex, 0);
	}

	// Get the latest completed month index (0-11) for "siste" display
	// In February (1), show January (0). In January (0), show December (11).
	function getLatestCompletedMonth(): number {
		const currentMonth = new Date().getMonth();
		return currentMonth === 0 ? 11 : currentMonth - 1;
	}

	function getPreviousMonth(monthIndex: number): number {
		return monthIndex === 0 ? 11 : monthIndex - 1;
	}

	function getMonthChangePercent(current: number, previous: number): number {
		if (previous === 0) return 0;
		return Math.round(((current - previous) / previous) * 100);
	}

	// Helper to get yearly expense info (payment month and amount)
	function getYearlyExpenseInfo(amounts: number[]): { month: number; amount: number } {
		const nonZero = amounts.map((amt, i) => ({ amt, i })).filter(({ amt }) => amt > 0);
		if (nonZero.length >= 1) {
			return { month: nonZero[0].i, amount: nonZero[0].amt };
		}
		return { month: 0, amount: 0 };
	}

	// Computed values for the form
	const formYearlyTotal = $derived(
		paymentFrequency === 'yearly'
			? (yearlyAmount ?? 0)
			: newExpenseAmounts.reduce((a, b) => a + (b ?? 0), 0)
	);

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
		frequency: 'monthly' | 'yearly';
	}) {
		editingExpenseId = expense.id;
		newExpenseName = expense.name;
		// Convert 0s to null so they show as empty placeholders
		newExpenseAmounts = expense.monthlyAmounts.map((amt) => (amt === 0 ? null : amt));
		newExpenseCategory = expense.category;

		// Use stored frequency directly
		paymentFrequency = expense.frequency;
		if (expense.frequency === 'yearly') {
			const yearlyInfo = getYearlyExpenseInfo(expense.monthlyAmounts);
			yearlyAmount = yearlyInfo.amount;
			yearlyPaymentMonth = yearlyInfo.month;
		}

		showEditPopover = true;
	}

	function closeEditPopover() {
		showEditPopover = false;
		resetForm();
	}

	function openMatPopover(monthIndex?: number) {
		const food = getFoodExpenses();
		if (monthIndex !== undefined) {
			// Editing existing month
			editingMatMonth = monthIndex;
			selectedMatMonth = monthIndex;
			matInneAmount = food.inne[monthIndex] || null;
			matUteAmount = food.ute[monthIndex] || null;
		} else {
			// Adding new month - find first month without data
			editingMatMonth = null;
			const firstEmptyMonth = food.inne.findIndex((v, i) => v === 0 && food.ute[i] === 0);
			selectedMatMonth = firstEmptyMonth >= 0 ? firstEmptyMonth : 0;
			matInneAmount = null;
			matUteAmount = null;
		}
		showMatPopover = true;
	}

	function closeMatPopover() {
		showMatPopover = false;
		editingMatMonth = null;
		matInneAmount = null;
		matUteAmount = null;
		selectedMatMonth = 0;
	}

	function handleMatSubmit(event: Event) {
		event.preventDefault();
		const inne = matInneAmount ?? 0;
		const ute = matUteAmount ?? 0;

		if (inne > 0 || ute > 0) {
			updateFoodMonth('inne', selectedMatMonth, inne);
			updateFoodMonth('ute', selectedMatMonth, ute);
		}
		closeMatPopover();
	}

	function resetForm() {
		editingExpenseId = null;
		newExpenseName = '';
		newExpenseAmounts = Array(12).fill(null);
		newExpenseCategory = 'faste-utgifter';
		paymentFrequency = 'monthly';
		yearlyAmount = null;
		yearlyPaymentMonth = 0;
	}

	function handleAddSubmit(event: Event) {
		event.preventDefault();

		let amounts: number[];
		if (paymentFrequency === 'yearly') {
			if (!yearlyAmount || yearlyAmount <= 0) return;
			amounts = Array(12).fill(0);
			amounts[yearlyPaymentMonth] = yearlyAmount;
		} else {
			const hasAnyAmount = newExpenseAmounts.some((amt) => amt !== null && amt > 0);
			if (!hasAnyAmount) return;
			amounts = newExpenseAmounts.map((amt) => amt ?? 0);
		}

		if (newExpenseName.trim()) {
			addExpense(newExpenseName.trim(), amounts, newExpenseCategory, paymentFrequency);
			closeAddPopover();
		}
	}

	function handleEditSubmit(event: Event) {
		event.preventDefault();

		let amounts: number[];
		if (paymentFrequency === 'yearly') {
			if (!yearlyAmount || yearlyAmount <= 0) return;
			amounts = Array(12).fill(0);
			amounts[yearlyPaymentMonth] = yearlyAmount;
		} else {
			const hasAnyAmount = newExpenseAmounts.some((amt) => amt !== null && amt > 0);
			if (!hasAnyAmount) return;
			amounts = newExpenseAmounts.map((amt) => amt ?? 0);
		}

		if (editingExpenseId && newExpenseName.trim()) {
			updateExpense(
				editingExpenseId,
				newExpenseName.trim(),
				amounts,
				newExpenseCategory,
				paymentFrequency
			);
			closeEditPopover();
		}
	}

	// Fill all months with a single value
	function fillAllMonths(value: number) {
		newExpenseAmounts = Array(12).fill(value || null);
	}

	// Derived: yearly totals
	const totalMonthly = $derived(getTotalExpenses());
	const totalYearly = $derived(totalMonthly * 12);

	// Derived: total last month and change percentage
	const totalLastMonth = $derived.by(() => {
		const latestMonth = getLatestCompletedMonth();
		return getMonthlyTotals()[latestMonth];
	});

	const totalPrevMonth = $derived.by(() => {
		const latestMonth = getLatestCompletedMonth();
		const prevMonth = getPreviousMonth(latestMonth);
		return getMonthlyTotals()[prevMonth];
	});

	const totalChangePercent = $derived(getMonthChangePercent(totalLastMonth, totalPrevMonth));
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
					<div class="summary-overview-row summary-overview-row-main">
						<dt>Totalt per år</dt>
						<dd class="font-mono">{formatCurrency(totalYearly)}</dd>
					</div>
					<div class="summary-overview-row">
						<dt>Totalt siste mnd</dt>
						<dd>
							<span class="font-mono">{formatCurrency(totalLastMonth)}</span>
							<span
								class="change-indicator"
								class:change-positive={totalChangePercent > 0}
								class:change-negative={totalChangePercent < 0}
								class:change-neutral={totalChangePercent === 0}
							>
								{#if totalChangePercent > 0}↑{totalChangePercent}%{:else if totalChangePercent < 0}↓{Math.abs(totalChangePercent)}%{:else}0%{/if}
							</span>
						</dd>
					</div>
					<div class="summary-overview-footer">
						<span class="summary-hint">Klikk for å se hver måned</span>
						<span class="toggle-icon">{showMonthlyBreakdown ? '▲' : '▼'}</span>
					</div>
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
				{#if card.id === 'mat'}
					<!-- Mat Card (popover-based flow) -->
					{@const food = getFoodExpenses()}
					{@const monthsWithData = MONTH_NAMES.map((name, i) => ({
						index: i,
						name,
						inne: food.inne[i],
						ute: food.ute[i],
						total: food.inne[i] + food.ute[i]
					})).filter((m) => m.inne > 0 || m.ute > 0)}
					{@const matYearlyTotal = food.inne.reduce((a, b) => a + b, 0) + food.ute.reduce((a, b) => a + b, 0)}
					<div class="card utgift-card mat-card">
						<h3 class="utgift-card-title">Mat</h3>

						<div class="utgift-list">
							{#if monthsWithData.length > 0}
								{#each monthsWithData as month (month.index)}
									{@const prevIdx = getPreviousMonth(month.index)}
									{@const prevInne = food.inne[prevIdx]}
									{@const prevUte = food.ute[prevIdx]}
									{@const prevTotal = prevInne + prevUte}
									{@const inneChg = getMonthChangePercent(month.inne, prevInne)}
									{@const uteChg = getMonthChangePercent(month.ute, prevUte)}
									{@const totalChg = getMonthChangePercent(month.total, prevTotal)}
									<div
										class="utgift-item"
										class:expanded={expandedMatMonths.has(month.index)}
									>
										<div class="utgift-row">
											<span class="utgift-name">{month.name}</span>
											<div class="utgift-actions">
												<button
													type="button"
													class="btn-icon-sm"
													onclick={() => openMatPopover(month.index)}
													aria-label="Rediger {month.name}"
												>
													&#9998;
												</button>
												<button
													type="button"
													class="btn-icon-sm btn-icon-danger"
													onclick={() => removeMatMonth(month.index)}
													aria-label="Fjern {month.name}"
												>
													&#10005;
												</button>
											</div>
											<button
												type="button"
												class="utgift-amount-toggle"
												onclick={() => toggleMatMonthBreakdown(month.index)}
												aria-expanded={expandedMatMonths.has(month.index)}
											>
												<span class="font-mono">{formatCurrency(month.total)}</span>
												<span
													class="change-indicator"
													class:change-positive={totalChg > 0}
													class:change-negative={totalChg < 0}
													class:change-neutral={totalChg === 0}
												>
													{#if totalChg > 0}↑{totalChg}%{:else if totalChg < 0}↓{Math.abs(
															totalChg
														)}%{:else}0%{/if}
												</span>
												<span class="toggle-icon-sm"
													>{expandedMatMonths.has(month.index) ? '▲' : '▼'}</span
												>
											</button>
										</div>
										{#if expandedMatMonths.has(month.index)}
											<div class="mat-month-breakdown">
												<div class="mat-breakdown-row">
													<span class="mat-breakdown-label">Inne</span>
													<span class="font-mono">{formatCurrency(month.inne)}</span>
													<span
														class="change-indicator"
														class:change-positive={inneChg > 0}
														class:change-negative={inneChg < 0}
														class:change-neutral={inneChg === 0}
													>
														{#if inneChg > 0}↑{inneChg}%{:else if inneChg < 0}↓{Math.abs(
																inneChg
															)}%{:else}0%{/if}
													</span>
												</div>
												<div class="mat-breakdown-row">
													<span class="mat-breakdown-label">Ute</span>
													<span class="font-mono">{formatCurrency(month.ute)}</span>
													<span
														class="change-indicator"
														class:change-positive={uteChg > 0}
														class:change-negative={uteChg < 0}
														class:change-neutral={uteChg === 0}
													>
														{#if uteChg > 0}↑{uteChg}%{:else if uteChg < 0}↓{Math.abs(
																uteChg
															)}%{:else}0%{/if}
													</span>
												</div>
											</div>
										{/if}
									</div>
								{/each}
							{/if}
							<button type="button" class="btn-add-item" onclick={() => openMatPopover()}>
								+ Legg til måned
							</button>
						</div>

						<dl class="utgift-summary">
							<div class="utgift-total-row">
								<dt>Totalt i år</dt>
								<dd class="font-mono">{formatCurrency(matYearlyTotal)}</dd>
							</div>
							<div class="utgift-subtotal-row">
								<dt>Inne i år</dt>
								<dd class="font-mono">{formatCurrency(food.inne.reduce((a, b) => a + b, 0))}</dd>
							</div>
							<div class="utgift-subtotal-row">
								<dt>Ute i år</dt>
								<dd class="font-mono">{formatCurrency(food.ute.reduce((a, b) => a + b, 0))}</dd>
							</div>
						</dl>
					</div>
				{:else}
					{@const cardExpenses = getExpenses().filter((e) => card.categories.includes(e.category))}
					<div class="card utgift-card">
						<h3 class="utgift-card-title">{card.title}</h3>

						<div class="utgift-list">
							{#if cardExpenses.length > 0}
								{#each cardExpenses as expense (expense.id)}
									{@const monthly = getMonthlyExpenseAmount(expense)}
									{@const varies = expenseVaries(expense)}
									{@const yearlyInfo = getYearlyExpenseInfo(expense.monthlyAmounts)}
									{@const latestMonth = getLatestCompletedMonth()}
									{@const prevMonth = getPreviousMonth(latestMonth)}
									{@const changePercent = getMonthChangePercent(
										expense.monthlyAmounts[latestMonth],
										expense.monthlyAmounts[prevMonth]
									)}
									<div
										class="utgift-item"
										class:expanded={varies && expandedExpenseIds.has(expense.id)}
									>
										<div class="utgift-row">
											<span class="utgift-name">{expense.name}</span>
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
											{#if expense.frequency === 'yearly'}
												<span class="utgift-amount-label">
													<span class="utgift-period"
														>betalt {MONTH_NAMES[yearlyInfo.month].toLowerCase()}</span
													>
													<span class="font-mono">{formatCurrency(yearlyInfo.amount)}</span>
													<span class="change-indicator change-neutral">0%</span>
												</span>
											{:else if varies}
												<button
													type="button"
													class="utgift-amount-toggle"
													onclick={() => toggleExpenseBreakdown(expense.id)}
													aria-expanded={expandedExpenseIds.has(expense.id)}
												>
													<span class="utgift-period">siste mnd:</span>
													<span class="font-mono"
														>{formatCurrency(expense.monthlyAmounts[latestMonth])}</span
													>
													<span
														class="change-indicator"
														class:change-positive={changePercent > 0}
														class:change-negative={changePercent < 0}
														class:change-neutral={changePercent === 0}
													>
														{#if changePercent > 0}↑{changePercent}%{:else if changePercent < 0}↓{Math.abs(
																changePercent
															)}%{:else}0%{/if}
													</span>
													<span class="toggle-icon-sm"
														>{expandedExpenseIds.has(expense.id) ? '▲' : '▼'}</span
													>
												</button>
											{:else}
												<span class="utgift-amount-label">
													<span class="utgift-period">siste mnd:</span>
													<span class="font-mono">{formatCurrency(monthly)}</span>
													<span
														class="change-indicator"
														class:change-positive={changePercent > 0}
														class:change-negative={changePercent < 0}
														class:change-neutral={changePercent === 0}
													>
														{#if changePercent > 0}↑{changePercent}%{:else if changePercent < 0}↓{Math.abs(
																changePercent
															)}%{:else}0%{/if}
													</span>
												</span>
											{/if}
										</div>
										{#if varies && expandedExpenseIds.has(expense.id)}
											<div class="expense-monthly-breakdown">
												{#each MONTH_NAMES as month, i (i)}
													<div class="monthly-breakdown-row">
														<span>{month}</span>
														<span class="font-mono"
															>{formatCurrency(expense.monthlyAmounts[i])}</span
														>
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
							{@const latestMonth = getLatestCompletedMonth()}
							{@const prevMonth = getPreviousMonth(latestMonth)}
							{@const cardMonthlyTotal = cardExpenses.reduce(
								(sum, e) => sum + e.monthlyAmounts[latestMonth],
								0
							)}
							{@const cardPrevMonthTotal = cardExpenses.reduce(
								(sum, e) => sum + e.monthlyAmounts[prevMonth],
								0
							)}
							{@const cardChangePercent = getMonthChangePercent(
								cardMonthlyTotal,
								cardPrevMonthTotal
							)}
							{@const cardYearlyTotal = cardExpenses.reduce(
								(sum, e) => sum + getYearlyExpenseAmount(e),
								0
							)}
							<dl class="utgift-summary">
								<div class="utgift-total-row">
									<dt>Totalt siste mnd</dt>
									<dd>
										<span class="font-mono">{formatCurrency(cardMonthlyTotal)}</span>
										<span
											class="change-indicator"
											class:change-positive={cardChangePercent > 0}
											class:change-negative={cardChangePercent < 0}
											class:change-neutral={cardChangePercent === 0}
										>
											{#if cardChangePercent > 0}↑{cardChangePercent}%{:else if cardChangePercent < 0}↓{Math.abs(
													cardChangePercent
												)}%{:else}0%{/if}
										</span>
									</dd>
								</div>
								<div class="utgift-total-row">
									<dt>Totalt i år</dt>
									<dd class="font-mono">{formatCurrency(cardYearlyTotal)}</dd>
								</div>
							</dl>
						{/if}
					</div>
				{/if}
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

					<div class="form-group">
						<span class="form-label">Betalingsfrekvens</span>
						<div class="frequency-toggle" role="group" aria-label="Betalingsfrekvens">
							<button
								type="button"
								class="frequency-btn"
								class:active={paymentFrequency === 'monthly'}
								onclick={() => (paymentFrequency = 'monthly')}
							>
								Månedlig
							</button>
							<button
								type="button"
								class="frequency-btn"
								class:active={paymentFrequency === 'yearly'}
								onclick={() => (paymentFrequency = 'yearly')}
							>
								Årlig
							</button>
						</div>
					</div>

					<div class="frequency-content">
					<div class="frequency-panel" class:active={paymentFrequency === 'yearly'}>
						<div class="form-group">
							<label class="form-label" for="add-yearly-amount">Årlig beløp</label>
							<div class="yearly-input">
								<input
									type="number"
									id="add-yearly-amount"
									bind:value={yearlyAmount}
									placeholder="0"
									min="0"
									onfocus={(e) => e.currentTarget.select()}
								/>
								<span class="yearly-input-label">kr betales i</span>
								<select bind:value={yearlyPaymentMonth} aria-label="Betalingsmåned">
									{#each MONTH_NAMES as month, i (i)}
										<option value={i}>{month}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>
					<div class="frequency-panel" class:active={paymentFrequency === 'monthly'}>
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
					</div>
				</div>

					<div class="form-computed-section">
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
								<option value={card.categories[0]}>{card.title}</option>
							{/each}
						</select>
					</div>

					<div class="form-group">
						<span class="form-label">Betalingsfrekvens</span>
						<div class="frequency-toggle" role="group" aria-label="Betalingsfrekvens">
							<button
								type="button"
								class="frequency-btn"
								class:active={paymentFrequency === 'monthly'}
								onclick={() => (paymentFrequency = 'monthly')}
							>
								Månedlig
							</button>
							<button
								type="button"
								class="frequency-btn"
								class:active={paymentFrequency === 'yearly'}
								onclick={() => (paymentFrequency = 'yearly')}
							>
								Årlig
							</button>
						</div>
					</div>

					<div class="frequency-content">
					<div class="frequency-panel" class:active={paymentFrequency === 'yearly'}>
						<div class="form-group">
							<label class="form-label" for="edit-yearly-amount">Årlig beløp</label>
							<div class="yearly-input">
								<input
									type="number"
									id="edit-yearly-amount"
									bind:value={yearlyAmount}
									placeholder="0"
									min="0"
									onfocus={(e) => e.currentTarget.select()}
								/>
								<span class="yearly-input-label">kr betales i</span>
								<select bind:value={yearlyPaymentMonth} aria-label="Betalingsmåned">
									{#each MONTH_NAMES as month, i (i)}
										<option value={i}>{month}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>
					<div class="frequency-panel" class:active={paymentFrequency === 'monthly'}>
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
					</div>
				</div>

					<div class="form-computed-section">
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

	<!-- Mat Popover -->
	{#if showMatPopover}
		<button type="button" class="popover-backdrop" onclick={closeMatPopover} aria-label="Lukk"
		></button>
		<div class="popover" role="dialog" aria-labelledby="mat-popover-heading">
			<div class="popover-header">
				<h3 id="mat-popover-heading">
					{editingMatMonth !== null ? `Rediger ${MONTH_NAMES[editingMatMonth].toLowerCase()}` : 'Legg til matutgifter'}
				</h3>
				<button type="button" class="btn-icon" onclick={closeMatPopover} aria-label="Lukk"
					>&#10005;</button
				>
			</div>

			<form class="popover-form" onsubmit={handleMatSubmit}>
				<fieldset class="form-fieldset">
					<div class="form-group">
						<label class="form-label" for="mat-month-select">Måned</label>
						<select id="mat-month-select" bind:value={selectedMatMonth}>
							{#each MONTH_NAMES as month, i (i)}
								<option value={i}>{month}</option>
							{/each}
						</select>
					</div>

					<div class="form-group">
						<label class="form-label" for="mat-inne-amount">Mat inne (dagligvarer)</label>
						<div class="input-with-suffix">
							<input
								type="number"
								id="mat-inne-amount"
								bind:value={matInneAmount}
								placeholder="0"
								min="0"
								onfocus={(e) => e.currentTarget.select()}
							/>
							<span class="input-suffix">kr</span>
						</div>
					</div>

					<div class="form-group">
						<label class="form-label" for="mat-ute-amount">Mat ute (restaurant/takeaway)</label>
						<div class="input-with-suffix">
							<input
								type="number"
								id="mat-ute-amount"
								bind:value={matUteAmount}
								placeholder="0"
								min="0"
								onfocus={(e) => e.currentTarget.select()}
							/>
							<span class="input-suffix">kr</span>
						</div>
					</div>

					<div class="popover-actions">
						<button type="button" class="btn-secondary" onclick={closeMatPopover}>Avbryt</button>
						<button type="submit" class="btn-primary">Lagre</button>
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
		gap: var(--space-xs);
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

	.change-indicator {
		font-size: 0.75rem;
		margin-left: var(--space-xs);
	}

	.change-positive {
		/* costs went up = bad */
		color: var(--color-danger);
	}

	.change-negative {
		/* costs went down = good */
		color: var(--color-success);
	}

	.change-neutral {
		color: var(--color-text-muted);
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

	.utgift-subtotal-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}

	.utgift-total-row-separator {
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border);
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

	/* Frequency toggle */
	.frequency-toggle {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.frequency-btn {
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

	.frequency-btn:not(:last-child) {
		border-right: 1px solid var(--color-border);
	}

	.frequency-btn:hover {
		background: var(--color-bg);
	}

	.frequency-btn.active {
		background: var(--color-primary);
		color: white;
	}

	.frequency-btn.active:hover {
		background: var(--color-primary-hover);
	}

	/* Yearly input */
	.yearly-input {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.yearly-input input {
		width: 150px;
		text-align: right;
	}

	.yearly-input-label {
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	.yearly-input select {
		width: auto;
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

	/* Overview summary rows */
	.summary-overview-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		width: 100%;
		font-size: 1rem;
		padding: var(--space-xs) 0;
	}

	.summary-overview-row dt {
		color: var(--color-text-muted);
	}

	.summary-overview-row dd {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		font-size: 1.25rem;
		font-weight: 600;
	}

	.summary-overview-row-main {
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border);
		margin-bottom: var(--space-xs);
	}

	.summary-overview-row-main dd {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.summary-overview-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border);
	}

	.summary-hint {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		opacity: 0.7;
	}

	.toggle-icon {
		font-size: 0.75rem;
		color: var(--color-text-muted);
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

	/* Mat Month Breakdown (inne/ute when expanded) */
	.mat-month-breakdown {
		padding: var(--space-sm) 0;
		margin-top: var(--space-xs);
		border-top: 1px solid var(--color-border);
	}

	.mat-breakdown-row {
		display: grid;
		grid-template-columns: 1fr auto auto;
		gap: var(--space-sm);
		align-items: baseline;
		font-size: 0.85rem;
		padding: 2px 0;
	}

	.mat-breakdown-label {
		color: var(--color-text-muted);
	}

	/* Input with suffix */
	.input-with-suffix {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.input-with-suffix input {
		flex: 1;
		text-align: right;
	}

	.input-suffix {
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	/* Stack both panels in same grid cell - container takes size of larger child */
	.frequency-content {
		display: grid;
	}

	.frequency-content > .frequency-panel {
		grid-area: 1 / 1;
		transition: opacity var(--duration-fast) ease-in-out;
	}

	.frequency-panel:not(.active) {
		opacity: 0;
		pointer-events: none;
	}
</style>
