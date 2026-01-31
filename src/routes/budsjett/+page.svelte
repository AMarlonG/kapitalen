<script lang="ts">
	import {
		getIncomes,
		getExpenses,
		addIncome,
		removeIncome,
		addExpense,
		removeExpense,
		getTotalGrossIncome,
		getTotalNetIncome,
		getTotalExpenses,
		getMonthlySavings,
		getSavingsRate,
		getCategoryTotal,
		formatCurrency,
		formatPercent,
		EXPENSE_CATEGORIES,
		type ExpenseCategory
	} from '$lib/stores/budget.svelte';

	// Form state for income
	let newIncomeName = $state('');
	let newIncomeAmount = $state<number | null>(null);

	// Form state for expense
	let newExpenseName = $state('');
	let newExpenseAmount = $state<number | null>(null);
	let newExpenseCategory = $state<ExpenseCategory>('annet');

	function handleAddIncome(event: Event) {
		event.preventDefault();
		if (newIncomeName.trim() && newIncomeAmount && newIncomeAmount > 0) {
			addIncome(newIncomeName.trim(), newIncomeAmount);
			newIncomeName = '';
			newIncomeAmount = null;
		}
	}

	function handleAddExpense(event: Event) {
		event.preventDefault();
		if (newExpenseName.trim() && newExpenseAmount && newExpenseAmount > 0) {
			addExpense(newExpenseName.trim(), newExpenseAmount, newExpenseCategory);
			newExpenseName = '';
			newExpenseAmount = null;
			newExpenseCategory = 'annet';
		}
	}
</script>

<svelte:head>
	<title>Budsjett - Kapitalen</title>
</svelte:head>

<div class="container page">
	<header class="page-header">
		<h1>Budsjett</h1>
		<p class="text-muted">Administrer inntekter og utgifter</p>
	</header>

	<!-- Summary Cards -->
	<section class="section">
		<div class="summary-grid">
			<div class="summary-card">
				<div class="summary-label">Brutto inntekt</div>
				<div class="summary-value">{formatCurrency(getTotalGrossIncome())}</div>
			</div>
			<div class="summary-card">
				<div class="summary-label">Netto inntekt (etter skatt)</div>
				<div class="summary-value">{formatCurrency(getTotalNetIncome())}</div>
			</div>
			<div class="summary-card">
				<div class="summary-label">Totale utgifter</div>
				<div class="summary-value">{formatCurrency(getTotalExpenses())}</div>
			</div>
			<div class="summary-card">
				<div class="summary-label">Månedlig sparing</div>
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

	<!-- Income Section -->
	<section class="section">
		<div class="section-header">
			<h2 class="section-title">Inntekter</h2>
		</div>

		<div class="card">
			<form class="form-row" onsubmit={handleAddIncome}>
				<div class="form-group">
					<label class="form-label" for="income-name">Beskrivelse</label>
					<input
						type="text"
						id="income-name"
						bind:value={newIncomeName}
						placeholder="F.eks. Lønn, Bonus..."
					/>
				</div>
				<div class="form-group">
					<label class="form-label" for="income-amount">Månedlig beløp (kr)</label>
					<input
						type="number"
						id="income-amount"
						bind:value={newIncomeAmount}
						placeholder="0"
						min="0"
					/>
				</div>
				<button type="submit" class="btn-primary">Legg til</button>
			</form>

			{#if getIncomes().length > 0}
				<div class="list" style="margin-top: var(--space-lg);">
					{#each getIncomes() as income (income.id)}
						<div class="list-item">
							<span class="list-item-name">{income.name}</span>
							<div class="flex items-center gap-md">
								<span class="list-item-value">{formatCurrency(income.amount)}</span>
								<button
									type="button"
									class="btn-icon"
									onclick={() => removeIncome(income.id)}
									aria-label="Fjern {income.name}"
								>
									✕
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</section>

	<!-- Expenses Section -->
	<section class="section">
		<div class="section-header">
			<h2 class="section-title">Utgifter</h2>
		</div>

		<div class="card">
			<form class="form-row" onsubmit={handleAddExpense}>
				<div class="form-group">
					<label class="form-label" for="expense-name">Beskrivelse</label>
					<input
						type="text"
						id="expense-name"
						bind:value={newExpenseName}
						placeholder="F.eks. Husleie, Strøm..."
					/>
				</div>
				<div class="form-group">
					<label class="form-label" for="expense-amount">Månedlig beløp (kr)</label>
					<input
						type="number"
						id="expense-amount"
						bind:value={newExpenseAmount}
						placeholder="0"
						min="0"
					/>
				</div>
				<div class="form-group">
					<label class="form-label" for="expense-category">Kategori</label>
					<select id="expense-category" bind:value={newExpenseCategory}>
						{#each EXPENSE_CATEGORIES as category (category.value)}
							<option value={category.value}>{category.label}</option>
						{/each}
					</select>
				</div>
				<button type="submit" class="btn-primary">Legg til</button>
			</form>
		</div>

		<!-- Expenses by Category -->
		{#each EXPENSE_CATEGORIES as category (category.value)}
			{@const categoryExpenses = getExpenses().filter((e) => e.category === category.value)}
			{#if categoryExpenses.length > 0}
				<div class="card" style="margin-top: var(--space-md);">
					<div class="section-header">
						<h3 class="section-title">{category.label}</h3>
						<span class="text-muted font-mono">{formatCurrency(getCategoryTotal(category.value))}</span>
					</div>
					<div class="list">
						{#each categoryExpenses as expense (expense.id)}
							<div class="list-item">
								<span class="list-item-name">{expense.name}</span>
								<div class="flex items-center gap-md">
									<span class="list-item-value">{formatCurrency(expense.amount)}</span>
									<button
										type="button"
										class="btn-icon"
										onclick={() => removeExpense(expense.id)}
										aria-label="Fjern {expense.name}"
									>
										✕
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	</section>
</div>
