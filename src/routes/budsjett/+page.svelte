<script lang="ts">
	import {
		getIncomes,
		getFreelanceIncomes,
		getEnkExpenses,
		setEnkExpenses,
		addIncome,
		updateIncome,
		removeIncome,
		addFreelanceIncome,
		updateFreelanceIncome,
		removeFreelanceIncome,
		calculateCombinedTax,
		getTotalFreelanceMva,
		formatCurrency,
		TRINNSKATT_BRACKETS,
		type TaxMethod
	} from '$lib/stores/budget.svelte';

	// Global tax method setting
	let globalTaxMethod = $state<TaxMethod>('tabelltrekk');
	let globalTaxPercentage = $state<number>(35);

	// Form state for income (no tax method - that's handled separately)
	let editingIncomeId = $state<string | null>(null);
	let newIncomeName = $state('');
	let newIncomeYearlyAmount = $state<number | null>(null);
	let newIncomePercentage = $state<number>(100);

	// Form state for freelance income
	let editingFreelanceId = $state<string | null>(null);
	let newFreelanceClient = $state('');
	let newFreelanceDescription = $state('');
	let newFreelanceAmount = $state<number | null>(null);

	// ENK expenses (local binding)
	let enkExpensesValue = $state(getEnkExpenses());

	function handleEnkExpensesChange(value: number | null) {
		const amount = value ?? 0;
		enkExpensesValue = amount;
		setEnkExpenses(amount);
	}

	function handleAddIncome(event: Event) {
		event.preventDefault();
		if (newIncomeName.trim() && newIncomeYearlyAmount && newIncomeYearlyAmount > 0) {
			if (editingIncomeId) {
				// Preserve existing tax settings when editing
				const existing = getIncomes().find(i => i.id === editingIncomeId);
				updateIncome(
					editingIncomeId,
					newIncomeName.trim(),
					newIncomeYearlyAmount,
					newIncomePercentage,
					existing?.taxMethod ?? globalTaxMethod,
					existing?.customTaxPercentage ?? globalTaxPercentage,
					existing?.trekkprosent
				);
				editingIncomeId = null;
			} else {
				addIncome(
					newIncomeName.trim(),
					newIncomeYearlyAmount,
					newIncomePercentage,
					globalTaxMethod,
					globalTaxPercentage
				);
			}
			newIncomeName = '';
			newIncomeYearlyAmount = null;
			newIncomePercentage = 100;
		}
	}

	function startEditIncome(income: {
		id: string;
		name: string;
		yearlyAmount: number;
		employeePercentage: number;
	}) {
		editingIncomeId = income.id;
		newIncomeName = income.name;
		newIncomeYearlyAmount = income.yearlyAmount;
		newIncomePercentage = income.employeePercentage;
	}

	function cancelEditIncome() {
		editingIncomeId = null;
		newIncomeName = '';
		newIncomeYearlyAmount = null;
		newIncomePercentage = 100;
	}

	function handleAddFreelance(event: Event) {
		event.preventDefault();
		if (newFreelanceClient.trim() && newFreelanceAmount && newFreelanceAmount > 0) {
			if (editingFreelanceId) {
				updateFreelanceIncome(editingFreelanceId, newFreelanceClient.trim(), newFreelanceDescription.trim(), newFreelanceAmount);
				editingFreelanceId = null;
			} else {
				addFreelanceIncome(newFreelanceClient.trim(), newFreelanceDescription.trim(), newFreelanceAmount);
			}
			newFreelanceClient = '';
			newFreelanceDescription = '';
			newFreelanceAmount = null;
		}
	}

	function startEditFreelance(freelance: { id: string; client: string; description: string; amount: number }) {
		editingFreelanceId = freelance.id;
		newFreelanceClient = freelance.client;
		newFreelanceDescription = freelance.description;
		newFreelanceAmount = freelance.amount;
	}

	function cancelEditFreelance() {
		editingFreelanceId = null;
		newFreelanceClient = '';
		newFreelanceDescription = '';
		newFreelanceAmount = null;
	}

	// Popover state - Arbeidsgivere
	let showArbeidsgiverPopover = $state(false);

	function openArbeidsgiverPopover() {
		showArbeidsgiverPopover = true;
	}

	function closeArbeidsgiverPopover() {
		showArbeidsgiverPopover = false;
		cancelEditIncome();
	}

	// Popover state - Trekkprosent (now in Oppgjør)
	let showTrekkprosentPopover = $state(false);

	function openTrekkprosentPopover() {
		showTrekkprosentPopover = true;
	}

	function closeTrekkprosentPopover() {
		showTrekkprosentPopover = false;
	}

	function updateIncomeTrekkprosent(incomeId: string, trekkprosent: number | undefined) {
		const income = getIncomes().find(i => i.id === incomeId);
		if (income) {
			updateIncome(
				incomeId,
				income.name,
				income.yearlyAmount,
				income.employeePercentage,
				'tabelltrekk',
				undefined,
				trekkprosent
			);
		}
	}

	function handleArbeidsgiverSubmit(event: Event) {
		handleAddIncome(event);
		if (newIncomeName === '' && newIncomeYearlyAmount === null) {
			// Form was successfully submitted and cleared
			showArbeidsgiverPopover = false;
		}
	}

	// Popover state - Oppdrag
	let showOppdragPopover = $state(false);
	let showUtgifterPopover = $state(false);

	function openOppdragPopover() {
		showOppdragPopover = true;
	}

	function closeOppdragPopover() {
		showOppdragPopover = false;
		cancelEditFreelance();
	}

	function openUtgifterPopover() {
		showUtgifterPopover = true;
	}

	function closeUtgifterPopover() {
		showUtgifterPopover = false;
	}

	function handleOppdragSubmit(event: Event) {
		handleAddFreelance(event);
		if (newFreelanceClient === '' && newFreelanceAmount === null) {
			// Form was successfully submitted and cleared
			// Don't close - let user add more or close manually
		}
	}

	// Derived: Combined tax calculation
	const combinedTax = $derived(calculateCombinedTax());

	// Computed withholding percentage for display
	const effectiveWithholdingPercent = $derived(() => {
		if (globalTaxMethod === 'prosenttrekk') {
			return globalTaxPercentage;
		}
		const allHaveTrekkprosent = getIncomes().length > 0 &&
			getIncomes().every(i => i.trekkprosent !== undefined && i.trekkprosent > 0);
		if (allHaveTrekkprosent && combinedTax.lonnGross > 0) {
			return Math.round(combinedTax.skattetrekk / combinedTax.lonnGross * 100);
		}
		return combinedTax.lonnGross > 0
			? Math.round((combinedTax.skattetrekk / combinedTax.lonnGross) * 100)
			: 30;
	});
</script>

<svelte:head>
	<title>Budsjett - Kapitalen</title>
</svelte:head>

<div class="container page">
	<header class="page-header">
		<h1>Inntekter og Skatt</h1>
		<p class="text-muted">Skatteberegning for 2026</p>
	</header>

	<!-- INNTEKTER Section -->
	<section class="section">
		<div class="section-header">
			<h2 class="section-title">Inntekter</h2>
		</div>

		<div class="inntekter-grid">
			<!-- Lønn Column -->
			<div class="card inntekt-card">
				<h3 class="inntekt-card-title">Lønn</h3>

				<div class="inntekt-list">
					{#if getIncomes().length > 0}
						<div class="inntekt-header">
							<span class="inntekt-col-label">Arbeidsgiver</span>
							<span class="inntekt-col-label text-right">Beløp</span>
						</div>
						{#each getIncomes() as income (income.id)}
							{@const computed = income.yearlyAmount * income.employeePercentage / 100}
							<div class="inntekt-row">
								<span>{income.name}</span>
								<span class="font-mono">{formatCurrency(computed)}</span>
							</div>
						{/each}
					{/if}
					<button
						type="button"
						class="btn-add-item"
						onclick={openArbeidsgiverPopover}
					>
						{getIncomes().length > 0 ? 'Administrer' : '+ Legg til arbeidsgiver'}
					</button>
				</div>

				{#if combinedTax.lonnGross > 0}
					<div class="inntekt-total">
						<span>Brutto lønn</span>
						<span class="font-mono">{formatCurrency(combinedTax.lonnGross)}</span>
					</div>
				{/if}
			</div>

			<!-- Næring Column -->
			<div class="card inntekt-card">
				<h3 class="inntekt-card-title">Næring</h3>

				<div class="inntekt-list">
					{#if getFreelanceIncomes().length > 0}
						<div class="inntekt-header naering-header">
							<span class="inntekt-col-label">Oppdragsgiver</span>
							<span class="inntekt-col-label text-right">Beløp</span>
						</div>
						{#each getFreelanceIncomes() as freelance (freelance.id)}
							<div class="inntekt-row">
								<span>{freelance.client}</span>
								<span class="font-mono">{formatCurrency(freelance.amount)}</span>
							</div>
						{/each}
					{/if}
					<button
						type="button"
						class="btn-add-item"
						onclick={openOppdragPopover}
					>
						{getFreelanceIncomes().length > 0 ? 'Administrer' : '+ Legg til oppdrag'}
					</button>
				</div>

				{#if combinedTax.enkGross > 0}
					<div class="naering-summary">
						<div class="summary-line">
							<span>Brutto</span>
							<span class="font-mono">{formatCurrency(combinedTax.enkGross)}</span>
						</div>
						<div class="summary-line utgift-line">
							<button type="button" class="btn-utgifter" onclick={openUtgifterPopover}>
								{combinedTax.enkExpenses > 0 ? 'Utgifter' : '+ Legg til utgifter'}
							</button>
							{#if combinedTax.enkExpenses > 0}
								<span class="font-mono">−{formatCurrency(combinedTax.enkExpenses)}</span>
							{/if}
						</div>
						<div class="inntekt-total">
							<span>Næringsinntekt</span>
							<span class="font-mono">{formatCurrency(combinedTax.enkNet)}</span>
						</div>
						<div class="mva-line">
							<span>MVA å betale</span>
							<span class="font-mono">{formatCurrency(getTotalFreelanceMva())}</span>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- SKATTEBEREGNING Section -->
	{#if combinedTax.totalPersoninntekt > 0}
		<section class="section">
			<div class="section-header">
				<h2 class="section-title">Skatteberegning</h2>
			</div>

			<div class="card">
				<!-- Total Personinntekt Summary -->
				<div class="personinntekt-summary">
					<div class="personinntekt-row">
						<span>Samlet personinntekt</span>
						<span class="font-mono">{formatCurrency(combinedTax.totalPersoninntekt)}</span>
					</div>
					<div class="personinntekt-breakdown">
						{#if combinedTax.lonnGross > 0}
							<span>Lønn {formatCurrency(combinedTax.lonnGross)}</span>
						{/if}
						{#if combinedTax.lonnGross > 0 && combinedTax.enkNet > 0}
							<span class="separator">+</span>
						{/if}
						{#if combinedTax.enkNet > 0}
							<span>Næringsinntekt {formatCurrency(combinedTax.enkNet)}</span>
						{/if}
					</div>
				</div>

				<details class="tax-details">
					<summary>Se full skatteutregning</summary>

					<!-- TRYGDEAVGIFT -->
					<div class="tax-section">
						<h3 class="tax-section-title">Trygdeavgift</h3>
					{#if combinedTax.lonnGross > 0}
						<div class="tax-calc-row">
							<span class="tax-calc-label">Lønn: {formatCurrency(combinedTax.lonnGross)} × 7,6%</span>
							<span class="font-mono">{formatCurrency(combinedTax.trygdeavgiftLonn)}</span>
						</div>
					{/if}
					{#if combinedTax.enkNet > 0}
						<div class="tax-calc-row">
							<span class="tax-calc-label">Næringsinntekt: {formatCurrency(combinedTax.enkNet)} × 10,8%</span>
							<span class="font-mono">{formatCurrency(combinedTax.trygdeavgiftEnk)}</span>
						</div>
					{/if}
					<div class="tax-subtotal">
						<span></span>
						<span class="font-mono">{formatCurrency(combinedTax.trygdeavgiftLonn + combinedTax.trygdeavgiftEnk)}</span>
					</div>
				</div>

				<!-- TRINNSKATT -->
				<div class="tax-section">
					<h3 class="tax-section-title">Trinnskatt <span class="tax-basis">(samlet personinntekt: {formatCurrency(combinedTax.totalPersoninntekt)})</span></h3>
					{#if combinedTax.trinnskattBreakdown.length > 0}
						{#each combinedTax.trinnskattBreakdown as bracket}
							{@const lowerThreshold = TRINNSKATT_BRACKETS[bracket.bracket].threshold}
							{@const upperThreshold = Math.min(TRINNSKATT_BRACKETS[bracket.bracket + 1]?.threshold ?? Infinity, combinedTax.totalPersoninntekt)}
							<div class="tax-calc-row">
								<span class="tax-calc-label">Trinn {bracket.bracket}: <span class="text-muted">{formatCurrency(lowerThreshold)} – {formatCurrency(upperThreshold)} ({formatCurrency(bracket.taxableAmount)} × {(TRINNSKATT_BRACKETS[bracket.bracket].rate * 100).toFixed(1)}%)</span></span>
								<span class="font-mono">{formatCurrency(bracket.amount)}</span>
							</div>
						{/each}
					{:else}
						<div class="tax-calc-row bracket-row text-muted">
							<span class="tax-calc-label">Under trinn 1-grensen ({formatCurrency(TRINNSKATT_BRACKETS[1].threshold)})</span>
							<span class="font-mono">{formatCurrency(0)}</span>
						</div>
					{/if}
					<div class="tax-subtotal">
						<span></span>
						<span class="font-mono">{formatCurrency(combinedTax.trinnskatt)}</span>
					</div>
				</div>

				<!-- SKATT PÅ ALMINNELIG INNTEKT -->
				<div class="tax-section">
					<h3 class="tax-section-title">Skatt på alminnelig inntekt</h3>
					<div class="tax-calc-row">
						<span class="tax-calc-label">Samlet personinntekt</span>
						<span class="font-mono">{formatCurrency(combinedTax.totalPersoninntekt)}</span>
					</div>
					<div class="tax-calc-row deduction-row">
						<span class="tax-calc-label">
							− Minstefradrag ({formatCurrency(combinedTax.lonnGross)} × 46%{combinedTax.lonnGross * 0.46 > 95700 ? ', maks 95 700' : ''})
						</span>
						<span class="font-mono">−{formatCurrency(combinedTax.minstefradrag)}</span>
					</div>
					<div class="tax-calc-row deduction-row">
						<span class="tax-calc-label">− Personfradrag</span>
						<span class="font-mono">−{formatCurrency(combinedTax.personfradrag)}</span>
					</div>
					<div class="tax-calc-row">
						<span class="tax-calc-label">Alminnelig inntekt</span>
						<span class="font-mono">{formatCurrency(combinedTax.alminneligInntekt)}</span>
					</div>
					<div class="tax-subtotal">
						<span class="tax-calc-label">{formatCurrency(combinedTax.alminneligInntekt)} × 22%</span>
						<span class="font-mono">{formatCurrency(combinedTax.fellesskatt)}</span>
					</div>
					</div>
				</details>

				<!-- TOTAL SKATT -->
				<div class="total-tax-section">
					<div class="total-tax-component">
						<span>Trygdeavgift</span>
						<span class="font-mono">{formatCurrency(combinedTax.trygdeavgiftLonn + combinedTax.trygdeavgiftEnk)}</span>
					</div>
					<div class="total-tax-component">
						<span>Trinnskatt</span>
						<span class="font-mono">{formatCurrency(combinedTax.trinnskatt)}</span>
					</div>
					<div class="total-tax-component">
						<span>Skatt på alminnelig inntekt</span>
						<span class="font-mono">{formatCurrency(combinedTax.fellesskatt)}</span>
					</div>
					<div class="total-tax-row">
						<span>Total skatt</span>
						<span class="font-mono">{formatCurrency(combinedTax.totalTax)}</span>
					</div>
					<div class="effective-rate-row">
						<span>Effektiv skatteprosent: <span class="text-muted">({formatCurrency(combinedTax.totalTax)} / {formatCurrency(combinedTax.totalPersoninntekt)})*100</span></span>
						<span class="font-mono">{combinedTax.effectiveRate.toFixed(1)}%</span>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- OPPGJØR Section -->
	{#if combinedTax.totalPersoninntekt > 0}
		<section class="section">
			<div class="section-header">
				<h2 class="section-title">Oppgjør</h2>
			</div>

			<div class="card oppgjor-card">
				<!-- Skattetrekk fra arbeidsgiver -->
				{#if combinedTax.lonnGross > 0}
					<div class="oppgjor-section">
						<h3 class="oppgjor-title">Skattetrekk fra arbeidsgiver</h3>
						<div class="trekkprosent-display">
							<button
								type="button"
								class="trekkprosent-button"
								onclick={openTrekkprosentPopover}
							>
								<span class="trekkprosent-label">Trekkprosent (fra lønnsslippen)</span>
								<span class="trekkprosent-value">{effectiveWithholdingPercent()}%</span>
							</button>
						</div>
						<div class="oppgjor-row">
							<span>Trukket i løpet av året</span>
							<span class="font-mono">{formatCurrency(combinedTax.skattetrekk)}</span>
						</div>
						<div class="oppgjor-row">
							<span>Faktisk skatt</span>
							<span class="font-mono">{formatCurrency(combinedTax.totalTax)}</span>
						</div>
						<div class="oppgjor-divider"></div>
						<div class="oppgjor-row result-row {combinedTax.difference >= 0 ? 'refund' : 'restskatt'}">
							<span>{combinedTax.difference >= 0 ? 'Tilbake på skatten' : 'Restskatt (må betales)'}</span>
							<span class="font-mono">{formatCurrency(Math.abs(combinedTax.difference))}</span>
						</div>
					</div>
				{/if}

				<!-- Netto Inntekt -->
				<div class="oppgjor-section netto-section">
					<h3 class="oppgjor-title">Netto inntekt</h3>
					<div class="oppgjor-row">
						<span>Brutto totalt (lønn + næringsinntekt)</span>
						<span class="font-mono">{formatCurrency(combinedTax.lonnGross + combinedTax.enkNet)}</span>
					</div>
					<div class="oppgjor-row deduction">
						<span>− Total skatt</span>
						<span class="font-mono">−{formatCurrency(combinedTax.totalTax)}</span>
					</div>
					<div class="oppgjor-divider"></div>
					<div class="netto-total">
						<div class="netto-row">
							<span>Netto (år)</span>
							<span class="font-mono">{formatCurrency(combinedTax.netIncome)}</span>
						</div>
						<div class="netto-row monthly">
							<span>Netto (måned)</span>
							<span class="font-mono">{formatCurrency(combinedTax.netIncome / 12)}</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- Trekkprosent Popover -->
	{#if showTrekkprosentPopover}
		<button type="button" class="popover-backdrop" onclick={closeTrekkprosentPopover} aria-label="Lukk"></button>
		<div class="popover popover-lg">
			<div class="popover-header">
				<h3>Trekkprosent</h3>
				<button type="button" class="btn-icon" onclick={closeTrekkprosentPopover}>✕</button>
			</div>

			<div class="trekk-method-section">
				<div class="tax-toggle-buttons">
					<button
						type="button"
						class="tax-toggle-btn"
						class:active={globalTaxMethod === 'tabelltrekk'}
						onclick={() => globalTaxMethod = 'tabelltrekk'}
					>
						Tabelltrekk
					</button>
					<button
						type="button"
						class="tax-toggle-btn"
						class:active={globalTaxMethod === 'prosenttrekk'}
						onclick={() => globalTaxMethod = 'prosenttrekk'}
					>
						Prosenttrekk
					</button>
				</div>
			</div>

			{#if globalTaxMethod === 'prosenttrekk'}
				<div class="form-group">
					<label class="form-label" for="global-prosenttrekk">Fast trekkprosent for all lønn</label>
					<input
						type="number"
						id="global-prosenttrekk"
						bind:value={globalTaxPercentage}
						min="0"
						max="100"
					/>
				</div>
			{:else}
				<div class="tabelltrekk-intro">
					<p>Skriv inn <strong>trekkprosenten</strong> fra lønnsslippen din. Dette er prosenten arbeidsgiver trekker i skatt hver måned.</p>
				</div>

				<div class="tabelltrekk-employers">
					{#each getIncomes() as income (income.id)}
						{@const computed = income.yearlyAmount * income.employeePercentage / 100}
						<div class="tabelltrekk-employer">
							<div class="tabelltrekk-employer-header">
								<span class="tabelltrekk-employer-name">{income.name}</span>
								<span class="tabelltrekk-employer-amount text-muted">{formatCurrency(computed)}/år</span>
							</div>

							<div class="tabelltrekk-input-section">
								<label class="form-label tabelltrekk-label" for="trekk-{income.id}">Trekkprosent</label>
								<div class="tabelltrekk-input-row">
									<input
										type="text"
										inputmode="decimal"
										id="trekk-{income.id}"
										class="tabelltrekk-number-input"
										value={income.trekkprosent ?? ''}
										min="0"
										max="100"
										oninput={(e) => {
											const val = (e.target as HTMLInputElement).value;
											updateIncomeTrekkprosent(income.id, val ? parseFloat(val) : undefined);
										}}
									/>
									<span class="tabelltrekk-fradrag-hint">%</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<div class="popover-footer">
				<button type="button" class="btn-primary" onclick={closeTrekkprosentPopover}>Ferdig</button>
			</div>
		</div>
	{/if}

	<!-- Arbeidsgiver Popover -->
	{#if showArbeidsgiverPopover}
		<button type="button" class="popover-backdrop" onclick={closeArbeidsgiverPopover} aria-label="Lukk"></button>
		<div class="popover popover-lg">
			<div class="popover-header">
				<h3>Administrer arbeidsgivere</h3>
				<button type="button" class="btn-icon" onclick={closeArbeidsgiverPopover}>✕</button>
			</div>

			{#if getIncomes().length > 0}
				<div class="popover-list">
					{#each getIncomes() as income (income.id)}
						{@const computed = income.yearlyAmount * income.employeePercentage / 100}
						<div class="popover-list-item" class:editing={editingIncomeId === income.id}>
							<div class="popover-list-info">
								<span class="popover-list-name">{income.name}</span>
								<span class="popover-list-details text-muted">
									{formatCurrency(income.yearlyAmount)} · {income.employeePercentage}% = {formatCurrency(computed)}
								</span>
							</div>
							<div class="popover-list-actions">
								<button
									type="button"
									class="btn-icon-sm"
									onclick={() => startEditIncome(income)}
									aria-label="Rediger {income.name}"
								>
									✎
								</button>
								<button
									type="button"
									class="btn-icon-sm"
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

			<form class="popover-form" onsubmit={handleArbeidsgiverSubmit}>
				<h4 class="popover-form-title">{editingIncomeId ? 'Rediger' : 'Legg til ny'}</h4>
				<div class="form-group">
					<label class="form-label" for="income-name">Arbeidsgiver</label>
					<input
						type="text"
						id="income-name"
						bind:value={newIncomeName}
						placeholder="F.eks. Equinor, NAV..."
					/>
				</div>
				<div class="form-row-2">
					<div class="form-group">
						<label class="form-label" for="income-yearly">Årslønn (kr)</label>
						<input
							type="number"
							id="income-yearly"
							bind:value={newIncomeYearlyAmount}
							placeholder="0"
							min="0"
						/>
					</div>
					<div class="form-group">
						<label class="form-label" for="income-percentage">Stillingsprosent</label>
						<input
							type="number"
							id="income-percentage"
							bind:value={newIncomePercentage}
							placeholder="100"
							min="0"
							max="100"
						/>
					</div>
				</div>
				<div class="form-group">
					<label class="form-label" for="income-computed">Beregnet brutto</label>
					<input
						type="text"
						id="income-computed"
						readonly
						value={formatCurrency((newIncomeYearlyAmount ?? 0) * newIncomePercentage / 100)}
					/>
				</div>
				<div class="popover-actions">
					{#if editingIncomeId}
						<button type="button" class="btn-secondary" onclick={cancelEditIncome}>Avbryt redigering</button>
					{/if}
					<button type="submit" class="btn-primary">{editingIncomeId ? 'Oppdater' : 'Legg til'}</button>
				</div>
			</form>

			<div class="popover-footer">
				<button type="button" class="btn-secondary" onclick={closeArbeidsgiverPopover}>Lukk</button>
			</div>
		</div>
	{/if}

	<!-- Utgifter Popover -->
	{#if showUtgifterPopover}
		<button type="button" class="popover-backdrop" onclick={closeUtgifterPopover} aria-label="Lukk"></button>
		<div class="popover popover-sm">
			<div class="popover-header">
				<h3>Utgifter</h3>
				<button type="button" class="btn-icon" onclick={closeUtgifterPopover}>✕</button>
			</div>
			<div class="form-group">
				<label class="form-label" for="enk-expenses">Totale utgifter (kr)</label>
				<input
					type="number"
					id="enk-expenses"
					value={enkExpensesValue}
					oninput={(e) => handleEnkExpensesChange(e.currentTarget.valueAsNumber)}
					placeholder="0"
					min="0"
				/>
				<span class="text-muted" style="font-size: 0.8rem; margin-top: var(--space-xs); display: block;">
					Utgifter knyttet til oppdragene dine
				</span>
			</div>
			<div class="popover-footer">
				<button type="button" class="btn-primary" onclick={closeUtgifterPopover}>Ferdig</button>
			</div>
		</div>
	{/if}

	<!-- Oppdrag Popover -->
	{#if showOppdragPopover}
		<button type="button" class="popover-backdrop" onclick={closeOppdragPopover} aria-label="Lukk"></button>
		<div class="popover popover-lg">
			<div class="popover-header">
				<h3>Administrer oppdrag</h3>
				<button type="button" class="btn-icon" onclick={closeOppdragPopover}>✕</button>
			</div>

			{#if getFreelanceIncomes().length > 0}
				<div class="popover-list">
					{#each getFreelanceIncomes() as freelance (freelance.id)}
						<div class="popover-list-item" class:editing={editingFreelanceId === freelance.id}>
							<div class="popover-list-info">
								<span class="popover-list-name">{freelance.client}</span>
								<span class="popover-list-details text-muted">
									{freelance.description ? `${freelance.description} · ` : ''}{formatCurrency(freelance.amount)} + {formatCurrency(freelance.mva)} MVA
								</span>
							</div>
							<div class="popover-list-actions">
								<button
									type="button"
									class="btn-icon-sm"
									onclick={() => startEditFreelance(freelance)}
									aria-label="Rediger {freelance.client}"
								>
									✎
								</button>
								<button
									type="button"
									class="btn-icon-sm"
									onclick={() => removeFreelanceIncome(freelance.id)}
									aria-label="Fjern {freelance.client}"
								>
									✕
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<form class="popover-form" onsubmit={handleOppdragSubmit}>
				<h4 class="popover-form-title">{editingFreelanceId ? 'Rediger' : 'Legg til nytt'}</h4>
				<div class="form-group">
					<label class="form-label" for="freelance-client">Oppdragsgiver</label>
					<input
						type="text"
						id="freelance-client"
						bind:value={newFreelanceClient}
						placeholder="F.eks. Kunde AS..."
					/>
				</div>
				<div class="form-group">
					<label class="form-label" for="freelance-description">Kort beskrivelse</label>
					<input
						type="text"
						id="freelance-description"
						bind:value={newFreelanceDescription}
						placeholder="F.eks. Webutvikling..."
					/>
				</div>
				<div class="form-group">
					<label class="form-label" for="freelance-amount">Beløp eks. MVA (kr)</label>
					<input
						type="number"
						id="freelance-amount"
						bind:value={newFreelanceAmount}
						placeholder="0"
						min="0"
					/>
				</div>
				<div class="popover-actions">
					{#if editingFreelanceId}
						<button type="button" class="btn-secondary" onclick={cancelEditFreelance}>Avbryt redigering</button>
					{/if}
					<button type="submit" class="btn-primary">{editingFreelanceId ? 'Oppdater' : 'Legg til'}</button>
				</div>
			</form>

			<div class="popover-footer">
				<button type="button" class="btn-secondary" onclick={closeOppdragPopover}>Lukk</button>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Inntekter Grid */
	.inntekter-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);
	}

	@media (max-width: 768px) {
		.inntekter-grid {
			grid-template-columns: 1fr;
		}
	}

	.inntekt-card {
		display: flex;
		flex-direction: column;
	}

	.inntekt-card-title {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border);
	}

	.inntekt-list {
		flex: 1;
	}

	.inntekt-header,
	.naering-header {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
		padding-bottom: var(--space-xs);
		border-bottom: 1px solid var(--color-border);
		margin-bottom: var(--space-xs);
	}

	.inntekt-col-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
	}

	.inntekt-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
		padding: var(--space-xs) 0;
		font-size: 0.9rem;
	}

	.inntekt-total {
		display: flex;
		justify-content: space-between;
		padding: var(--space-sm) 0;
		margin-top: var(--space-md);
		border-top: 1px solid var(--color-border);
		font-weight: 600;
	}

	.naering-summary {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border);
	}

	.summary-line {
		display: flex;
		justify-content: space-between;
		padding: var(--space-xs) 0;
	}

	.utgift-line {
		color: var(--color-text-muted);
	}

	.mva-line {
		display: flex;
		justify-content: space-between;
		padding: var(--space-sm) 0;
		margin-top: var(--space-sm);
		border-top: 1px solid var(--color-border);
		color: var(--color-warning);
		font-weight: 500;
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

	.btn-utgifter {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: var(--color-primary);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.btn-utgifter:hover {
		color: var(--color-primary-hover);
	}

	/* Skatteberegning Section */
	.personinntekt-summary {
		padding-bottom: var(--space-lg);
		margin-bottom: var(--space-md);
		border-bottom: 2px solid var(--color-border);
	}

	.personinntekt-row {
		display: flex;
		justify-content: space-between;
		font-size: 1.25rem;
		font-weight: 700;
	}

	.personinntekt-breakdown {
		display: flex;
		gap: var(--space-sm);
		margin-top: var(--space-xs);
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.personinntekt-breakdown .separator {
		color: var(--color-text-muted);
	}

	.tax-section {
		padding: var(--space-md) 0;
		border-bottom: 1px solid var(--color-border);
	}

	.tax-section:last-of-type {
		border-bottom: none;
	}

	.tax-section-title {
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
		margin-bottom: var(--space-md);
	}

	.tax-basis {
		font-weight: 400;
		text-transform: none;
		letter-spacing: normal;
	}

	.tax-calc-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-xs) 0;
	}

	.tax-calc-label {
		font-size: 0.9rem;
	}


	.deduction-row {
		color: var(--color-text-muted);
	}

	.tax-subtotal {
		display: flex;
		justify-content: space-between;
		padding: var(--space-sm) 0;
		margin-top: var(--space-xs);
		border-top: 1px solid var(--color-border);
		font-weight: 500;
	}

	.total-tax-section {
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 2px solid var(--color-border);
	}

	.tax-details {
		margin-top: var(--space-md);
	}

	.tax-details summary {
		cursor: pointer;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		padding: var(--space-xs) 0;
		list-style: revert;
	}

	.tax-details summary:hover {
		color: var(--color-text);
	}

	.total-tax-component {
		display: flex;
		justify-content: space-between;
		padding: var(--space-xs) 0;
	}

	.total-tax-row {
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border);
		display: flex;
		justify-content: space-between;
		font-size: 1.25rem;
		font-weight: 700;
	}

	.effective-rate-row {
		display: flex;
		justify-content: space-between;
		margin-top: var(--space-xs);
		color: var(--color-text-muted);
	}

	/* Oppgjør Section */
	.oppgjor-card {
		background: var(--color-surface);
	}

	.oppgjor-section {
		padding: var(--space-lg) 0;
		border-bottom: 1px solid var(--color-border);
	}

	.oppgjor-section:first-child {
		padding-top: 0;
	}

	.oppgjor-section:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.oppgjor-title {
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
		margin-bottom: var(--space-md);
	}

	.trekkprosent-display {
		margin-bottom: var(--space-md);
	}

	.trekkprosent-button {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		font: inherit;
	}

	.trekkprosent-button:hover {
		border-color: var(--color-primary);
	}

	.trekkprosent-label {
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}

	.trekkprosent-value {
		font-size: 1.25rem;
		font-weight: 600;
		font-family: var(--font-mono);
	}

	.oppgjor-row {
		display: flex;
		justify-content: space-between;
		padding: var(--space-xs) 0;
	}

	.oppgjor-row.deduction {
		color: var(--color-text-muted);
	}

	.oppgjor-divider {
		border-top: 1px solid var(--color-border);
		margin: var(--space-sm) 0;
	}

	.result-row {
		font-weight: 600;
		font-size: 1.1rem;
	}

	.result-row.refund {
		color: var(--color-success);
	}

	.result-row.restskatt {
		color: var(--color-warning);
	}

	.netto-section {
		background: var(--color-bg);
		margin: 0 calc(-1 * var(--space-lg)) calc(-1 * var(--space-lg));
		padding: var(--space-lg);
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
	}

	.netto-total {
		margin-top: var(--space-sm);
	}

	.netto-row {
		display: flex;
		justify-content: space-between;
		padding: var(--space-xs) 0;
	}

	.netto-row:first-child {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-success);
	}

	.netto-row.monthly {
		color: var(--color-text-muted);
	}

	/* Trekk method section */
	.trekk-method-section {
		margin-bottom: var(--space-lg);
	}

	.tax-toggle-buttons {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.tax-toggle-btn {
		flex: 1;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-surface);
		border: none;
		font: inherit;
		font-size: 0.9rem;
		cursor: pointer;
		color: var(--color-text-muted);
		transition: background 0.15s, color 0.15s;
	}

	.tax-toggle-btn:first-child {
		border-right: 1px solid var(--color-border);
	}

	.tax-toggle-btn:hover {
		background: var(--color-bg);
	}

	.tax-toggle-btn.active {
		background: var(--color-primary);
		color: white;
	}

	.tax-toggle-btn.active:hover {
		background: var(--color-primary-hover);
	}

	/* Tabelltrekk popover styles */
	.tabelltrekk-intro {
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border);
	}

	.tabelltrekk-intro p {
		margin: 0;
		line-height: 1.5;
	}

	.tabelltrekk-employers {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.tabelltrekk-employer {
		padding: var(--space-sm);
		background: var(--color-bg);
		border-radius: var(--radius-md);
	}

	.tabelltrekk-employer-header {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-bottom: var(--space-sm);
	}

	.tabelltrekk-employer-name {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.tabelltrekk-employer-amount {
		font-size: 0.8rem;
	}

	.tabelltrekk-input-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.tabelltrekk-label {
		font-size: 0.8rem;
	}

	.tabelltrekk-input-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.tabelltrekk-number-input {
		width: 70px;
		padding: var(--space-xs) var(--space-sm);
		font-family: var(--font-mono);
		font-size: 1rem;
		text-align: center;
	}

	.tabelltrekk-fradrag-hint {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	/* Popover styles */
	.popover-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 100;
		border: none;
		cursor: pointer;
	}

	.popover {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		padding: var(--space-lg);
		width: 90%;
		max-width: 400px;
		max-height: 90vh;
		overflow-y: auto;
		z-index: 101;
	}

	.popover-lg {
		max-width: 500px;
	}

	.popover-sm {
		max-width: 320px;
	}

	.popover-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-lg);
	}

	.popover-header h3 {
		margin: 0;
		font-size: 1.1rem;
	}

	.popover-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-row-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
	}

	.popover-list {
		margin-bottom: var(--space-lg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}

	.popover-list-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--color-border);
	}

	.popover-list-item:last-child {
		border-bottom: none;
	}

	.popover-list-item.editing {
		background: var(--color-bg);
	}

	.popover-list-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.popover-list-name {
		font-weight: 500;
	}

	.popover-list-details {
		font-size: 0.85rem;
	}

	.popover-list-actions {
		display: flex;
		gap: var(--space-xs);
	}

	.popover-form-title {
		font-size: 0.9rem;
		font-weight: 600;
		margin: 0 0 var(--space-md) 0;
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border);
	}

	.popover-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}

	.popover-footer {
		margin-top: var(--space-lg);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border);
		display: flex;
		justify-content: flex-end;
	}

	.btn-icon-sm {
		background: none;
		border: none;
		padding: var(--space-xs);
		cursor: pointer;
		color: var(--color-text-muted);
		font-size: 0.85rem;
		line-height: 1;
	}

	.btn-icon-sm:hover {
		color: var(--color-primary);
	}
</style>
