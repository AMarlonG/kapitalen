<script lang="ts">
	import {
		getExpenses,
		addExpense,
		updateExpense,
		removeExpense,
		getTotalExpenses,
		getCategoryTotal
	} from '$lib/stores/budget.svelte';
	import { formatCurrency } from '$lib/utils/formatters';
	import { EXPENSE_CATEGORIES, type ExpenseCategory } from '$lib/types/budget';

	// Form state for expense
	let editingExpenseId = $state<string | null>(null);
	let newExpenseName = $state('');
	let newExpenseAmount = $state<number | null>(null);
	let newExpenseCategory = $state<ExpenseCategory>('annet');

	function handleAddExpense(event: Event) {
		event.preventDefault();
		if (newExpenseName.trim() && newExpenseAmount && newExpenseAmount > 0) {
			if (editingExpenseId) {
				updateExpense(editingExpenseId, newExpenseName.trim(), newExpenseAmount, newExpenseCategory);
				editingExpenseId = null;
			} else {
				addExpense(newExpenseName.trim(), newExpenseAmount, newExpenseCategory);
			}
			newExpenseName = '';
			newExpenseAmount = null;
			newExpenseCategory = 'annet';
		}
	}

	function startEditExpense(expense: { id: string; name: string; amount: number; category: ExpenseCategory }) {
		editingExpenseId = expense.id;
		newExpenseName = expense.name;
		newExpenseAmount = expense.amount;
		newExpenseCategory = expense.category;
	}

	function cancelEditExpense() {
		editingExpenseId = null;
		newExpenseName = '';
		newExpenseAmount = null;
		newExpenseCategory = 'annet';
	}
</script>

<svelte:head>
	<title>Utgifter - Kapitalen</title>
</svelte:head>

<div class="container page">
	<header class="page-header">
		<h1>Utgifter</h1>
		<p class="text-muted">Administrer månedlige utgifter</p>
	</header>

	<!-- Summary -->
	<section class="section" aria-labelledby="summary-heading">
		<h2 id="summary-heading" class="sr-only">Utgiftsoversikt</h2>
		<dl class="summary-grid" aria-live="polite">
			<div class="summary-card">
				<dt class="summary-label">Totale utgifter</dt>
				<dd class="summary-value">{formatCurrency(getTotalExpenses())}</dd>
			</div>
			{#each EXPENSE_CATEGORIES as category (category.value)}
				{@const total = getCategoryTotal(category.value)}
				{#if total > 0}
					<div class="summary-card">
						<dt class="summary-label">{category.label}</dt>
						<dd class="summary-value">{formatCurrency(total)}</dd>
					</div>
				{/if}
			{/each}
		</dl>
	</section>

	<!-- Add Expense Form -->
	<section class="section">
		<div class="card">
			<form class="form-row" onsubmit={handleAddExpense}>
				<fieldset class="form-fieldset">
					<legend class="section-title">{editingExpenseId ? 'Rediger utgift' : 'Legg til utgift'}</legend>
					<div class="form-row">
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
						{#if editingExpenseId}
							<button type="submit" class="btn-primary">Oppdater</button>
							<button type="button" class="btn-secondary" onclick={cancelEditExpense}>Avbryt</button>
						{:else}
							<button type="submit" class="btn-primary">Legg til</button>
						{/if}
					</div>
				</fieldset>
			</form>
		</div>
	</section>

	<!-- Expenses by Category -->
	{#each EXPENSE_CATEGORIES as category (category.value)}
		{@const categoryExpenses = getExpenses().filter((e) => e.category === category.value)}
		{#if categoryExpenses.length > 0}
			<section class="section" aria-labelledby="category-{category.value}">
				<div class="card">
					<div class="section-header">
						<h3 id="category-{category.value}" class="section-title">{category.label}</h3>
						<span class="text-muted font-mono">{formatCurrency(getCategoryTotal(category.value))}</span>
					</div>
					<ul class="list" role="list">
						{#each categoryExpenses as expense (expense.id)}
							<li class="list-item">
								<span class="list-item-name">{expense.name}</span>
								<div class="flex items-center gap-md">
									<span class="list-item-value">{formatCurrency(expense.amount)}</span>
									<button
										type="button"
										class="btn-icon"
										onclick={() => startEditExpense(expense)}
										aria-label="Rediger {expense.name}"
									>
										✎
									</button>
									<button
										type="button"
										class="btn-icon"
										onclick={() => removeExpense(expense.id)}
										aria-label="Fjern {expense.name}"
									>
										✕
									</button>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			</section>
		{/if}
	{/each}
</div>
