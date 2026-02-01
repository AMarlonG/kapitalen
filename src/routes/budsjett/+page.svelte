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
		getGlobalTaxMethod,
		setGlobalTaxMethod,
		getGlobalTaxPercentage,
		setGlobalTaxPercentage,
		getMonthsWorked,
		getProratedYearlyAmount,
		calculateFeriepenger,
		getTotalAdjustments,
		getAdjustmentsForFeriepenger,
		addAdjustment,
		updateAdjustment,
		removeAdjustment,
		type AdjustmentType,
		type IncomeAdjustment
	} from '$lib/stores/budget.svelte';

	// Constants for adjustments
	const MONTHS_NO = [
		{ value: 1, label: 'Januar' },
		{ value: 2, label: 'Februar' },
		{ value: 3, label: 'Mars' },
		{ value: 4, label: 'April' },
		{ value: 5, label: 'Mai' },
		{ value: 6, label: 'Juni' },
		{ value: 7, label: 'Juli' },
		{ value: 8, label: 'August' },
		{ value: 9, label: 'September' },
		{ value: 10, label: 'Oktober' },
		{ value: 11, label: 'November' },
		{ value: 12, label: 'Desember' }
	];

	const ADJUSTMENT_TYPES = [
		{ value: 'bonus' as AdjustmentType, label: 'Bonus' },
		{ value: 'overtid' as AdjustmentType, label: 'Overtid' },
		{ value: 'annet' as AdjustmentType, label: 'Annet' }
	];

	// Form state for income (no tax method - that's handled separately)
	let editingIncomeId = $state<string | null>(null);
	let newIncomeName = $state('');
	let newIncomeYearlyAmount = $state<number | null>(null);
	let newIncomePercentage = $state<number>(100);
	let newIncomePeriodType = $state<'fullYear' | 'custom'>('fullYear');
	let newIncomeStartDate = $state('');
	let newIncomeEndDate = $state('');
	let newIncomeFerieUker = $state<'4+1' | '5'>('5');
	let newIncomeIsOver60 = $state(false);

	// Form state for collapsible sections
	let showFeriepenger = $state(false);
	let showAdjustments = $state(false);
	let editingAdjustmentId = $state<string | null>(null);
	let newAdjustmentType = $state<AdjustmentType>('bonus');
	let newAdjustmentMonth = $state<number>(new Date().getMonth() + 1);
	let newAdjustmentAmount = $state<number | null>(null);
	let newAdjustmentDescription = $state('');
	let newAdjustmentAffectsFerie = $state(true);

	// Auto-open sections when editing employer with non-default values
	$effect(() => {
		if (editingIncomeId) {
			const income = getIncomes().find(i => i.id === editingIncomeId);
			showAdjustments = (income?.adjustments?.length ?? 0) > 0;
			// Open feriepenger if non-default values
			showFeriepenger = income?.ferieUker === '4+1' || income?.isOver60 === true;
		}
	});

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
					existing?.taxMethod ?? getGlobalTaxMethod(),
					existing?.customTaxPercentage ?? getGlobalTaxPercentage(),
					existing?.trekkprosent,
					newIncomePeriodType,
					newIncomeStartDate || undefined,
					newIncomeEndDate || undefined,
					newIncomeFerieUker,
					newIncomeIsOver60
				);
				editingIncomeId = null;
			} else {
				addIncome(
					newIncomeName.trim(),
					newIncomeYearlyAmount,
					newIncomePercentage,
					getGlobalTaxMethod(),
					getGlobalTaxPercentage(),
					undefined,
					newIncomePeriodType,
					newIncomeStartDate || undefined,
					newIncomeEndDate || undefined,
					newIncomeFerieUker,
					newIncomeIsOver60
				);
			}
			newIncomeName = '';
			newIncomeYearlyAmount = null;
			newIncomePercentage = 100;
			newIncomePeriodType = 'fullYear';
			newIncomeStartDate = '';
			newIncomeEndDate = '';
			newIncomeFerieUker = '5';
			newIncomeIsOver60 = false;
		}
	}

	function startEditIncome(income: {
		id: string;
		name: string;
		yearlyAmount: number;
		employeePercentage: number;
		periodType: 'fullYear' | 'custom';
		startDate?: string;
		endDate?: string;
		ferieUker: '4+1' | '5';
		isOver60: boolean;
	}) {
		editingIncomeId = income.id;
		newIncomeName = income.name;
		newIncomeYearlyAmount = income.yearlyAmount;
		newIncomePercentage = income.employeePercentage;
		newIncomePeriodType = income.periodType;
		newIncomeStartDate = income.startDate ?? '';
		newIncomeEndDate = income.endDate ?? '';
		newIncomeFerieUker = income.ferieUker;
		newIncomeIsOver60 = income.isOver60;
		// Scroll popover to top so form is visible
		setTimeout(() => {
			document.querySelector('.popover')?.scrollTo({ top: 0, behavior: 'smooth' });
		}, 50);
	}

	function cancelEditIncome() {
		editingIncomeId = null;
		newIncomeName = '';
		newIncomeYearlyAmount = null;
		newIncomePercentage = 100;
		newIncomePeriodType = 'fullYear';
		newIncomeStartDate = '';
		newIncomeEndDate = '';
		newIncomeFerieUker = '5';
		newIncomeIsOver60 = false;
		// Reset collapsible sections
		showFeriepenger = false;
		showAdjustments = false;
		resetAdjustmentForm();
	}

	function resetAdjustmentForm() {
		editingAdjustmentId = null;
		newAdjustmentType = 'bonus';
		newAdjustmentMonth = new Date().getMonth() + 1;
		newAdjustmentAmount = null;
		newAdjustmentDescription = '';
		newAdjustmentAffectsFerie = true;
	}

	function handleAddAdjustment() {
		if (!editingIncomeId || !newAdjustmentAmount || newAdjustmentAmount <= 0) return;

		if (editingAdjustmentId) {
			updateAdjustment(
				editingIncomeId,
				editingAdjustmentId,
				newAdjustmentType,
				newAdjustmentAmount,
				newAdjustmentMonth,
				newAdjustmentDescription || undefined,
				newAdjustmentAffectsFerie
			);
		} else {
			addAdjustment(
				editingIncomeId,
				newAdjustmentType,
				newAdjustmentAmount,
				newAdjustmentMonth,
				newAdjustmentDescription || undefined,
				newAdjustmentAffectsFerie
			);
		}
		resetAdjustmentForm();
	}

	function startEditAdjustment(adjustment: IncomeAdjustment) {
		editingAdjustmentId = adjustment.id;
		newAdjustmentType = adjustment.type;
		newAdjustmentMonth = adjustment.month;
		newAdjustmentAmount = adjustment.amount;
		newAdjustmentDescription = adjustment.description ?? '';
		newAdjustmentAffectsFerie = adjustment.affectsFeriepenger;
	}

	function handleRemoveAdjustment(adjustmentId: string) {
		if (editingIncomeId) {
			removeAdjustment(editingIncomeId, adjustmentId);
			if (editingAdjustmentId === adjustmentId) {
				resetAdjustmentForm();
			}
		}
	}

	// Update default affectsFerie when type changes
	$effect(() => {
		if (!editingAdjustmentId) {
			// Only update default for new adjustments
			newAdjustmentAffectsFerie = newAdjustmentType !== 'annet';
		}
	});

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

	// Popover state - Arbeidsgivere (split into Add and Edit)
	let showAddPopover = $state(false);
	let showEditPopover = $state(false);

	function openAddPopover() {
		showAddPopover = true;
	}

	function closeAddPopover() {
		showAddPopover = false;
		cancelEditIncome();
	}

	function openEditPopover(income: {
		id: string;
		name: string;
		yearlyAmount: number;
		employeePercentage: number;
		periodType: 'fullYear' | 'custom';
		startDate?: string;
		endDate?: string;
		ferieUker: '4+1' | '5';
		isOver60: boolean;
	}) {
		startEditIncome(income);
		showEditPopover = true;
	}

	function closeEditPopover() {
		showEditPopover = false;
		cancelEditIncome();
	}

	// Popover state - Trekkprosent (in Lønn box)
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
				trekkprosent,
				income.periodType,
				income.startDate,
				income.endDate,
				income.ferieUker,
				income.isOver60
			);
		}
	}

	function handleAddSubmit(event: Event) {
		handleAddIncome(event);
		// Close popover on successful submission
		if (newIncomeName === '' && newIncomeYearlyAmount === null) {
			closeAddPopover();
		}
	}

	function handleEditSubmit(event: Event) {
		handleAddIncome(event);
		// Close popover on successful submission
		if (newIncomeName === '' && newIncomeYearlyAmount === null) {
			closeEditPopover();
		}
	}

	// Popover state - Oppdrag (split into Add and Edit)
	let showAddOppdragPopover = $state(false);
	let showEditOppdragPopover = $state(false);
	let showUtgifterPopover = $state(false);

	function openAddOppdragPopover() {
		showAddOppdragPopover = true;
	}

	function closeAddOppdragPopover() {
		showAddOppdragPopover = false;
		cancelEditFreelance();
	}

	function openEditOppdragPopover(freelance: { id: string; client: string; description: string; amount: number }) {
		startEditFreelance(freelance);
		showEditOppdragPopover = true;
	}

	function closeEditOppdragPopover() {
		showEditOppdragPopover = false;
		cancelEditFreelance();
	}

	function openUtgifterPopover() {
		showUtgifterPopover = true;
	}

	function closeUtgifterPopover() {
		showUtgifterPopover = false;
	}

	function handleAddOppdragSubmit(event: Event) {
		handleAddFreelance(event);
		// Close popover on successful submission
		if (newFreelanceClient === '' && newFreelanceAmount === null) {
			closeAddOppdragPopover();
		}
	}

	function handleEditOppdragSubmit(event: Event) {
		handleAddFreelance(event);
		// Close popover on successful submission
		if (newFreelanceClient === '' && newFreelanceAmount === null) {
			closeEditOppdragPopover();
		}
	}

	// Derived: Combined tax calculation
	const combinedTax = $derived(calculateCombinedTax());

	// Computed brutto for the add/edit income form (base salary only)
	const formComputedBrutto = $derived.by(() => {
		const fullYearAmount = (newIncomeYearlyAmount ?? 0) * newIncomePercentage / 100;

		if (newIncomePeriodType === 'custom' && newIncomeStartDate && newIncomeEndDate) {
			const start = new Date(newIncomeStartDate);
			const end = new Date(newIncomeEndDate);
			const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
			const clampedMonths = Math.min(12, Math.max(1, months));

			if (clampedMonths < 12) {
				const proratedAmount = fullYearAmount * clampedMonths / 12;
				return proratedAmount;
			}
		}

		return fullYearAmount;
	});

	// Get current adjustments total for the form
	const formAdjustmentsTotal = $derived.by(() => {
		if (!editingIncomeId) return 0;
		const income = getIncomes().find(i => i.id === editingIncomeId);
		return income ? getTotalAdjustments(income) : 0;
	});

	// Get adjustments that affect feriepenger for the form
	const formAdjustmentsForFerie = $derived.by(() => {
		if (!editingIncomeId) return 0;
		const income = getIncomes().find(i => i.id === editingIncomeId);
		return income ? getAdjustmentsForFeriepenger(income) : 0;
	});

	// Computed total brutto including adjustments
	const formComputedTotalBrutto = $derived(formComputedBrutto + formAdjustmentsTotal);

	// Computed feriepenger for the form (base + qualifying adjustments)
	const formComputedFeriepenger = $derived.by(() => {
		const RATES = {
			'4+1': { standard: 0.102, over60: 0.125 },
			'5':   { standard: 0.12,  over60: 0.143 }
		};
		const rates = RATES[newIncomeFerieUker];
		const rate = newIncomeIsOver60 ? rates.over60 : rates.standard;
		return (formComputedBrutto + formAdjustmentsForFerie) * rate;
	});

	// Format feriepenger rate as percentage
	const formFeriepengerRate = $derived.by(() => {
		const RATES = {
			'4+1': { standard: 10.2, over60: 12.5 },
			'5':   { standard: 12.0, over60: 14.3 }
		};
		const rates = RATES[newIncomeFerieUker];
		return newIncomeIsOver60 ? rates.over60 : rates.standard;
	});

	// Computed withholding percentage for display
	const effectiveWithholdingPercent = $derived.by(() => {
		if (getGlobalTaxMethod() === 'prosenttrekk') {
			return getGlobalTaxPercentage();
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
							{@const proratedAmount = getProratedYearlyAmount(income)}
							{@const months = getMonthsWorked(income)}
							{@const adjTotal = getTotalAdjustments(income)}
							<div class="inntekt-row">
								<span class="inntekt-name">{income.name}</span>
								<div class="inntekt-actions">
									<button
										type="button"
										class="btn-icon-sm"
										onclick={() => openEditPopover(income)}
										aria-label="Rediger {income.name}"
									>
										&#9998;
									</button>
									<button
										type="button"
										class="btn-icon-sm btn-icon-danger"
										onclick={() => removeIncome(income.id)}
										aria-label="Fjern {income.name}"
									>
										&#10005;
									</button>
								</div>
								<span class="font-mono inntekt-amount">
									{#if income.periodType === 'custom' && months < 12}
										<span class="text-muted" style="font-size: 0.85em">{months} mnd:</span>
									{/if}
									{formatCurrency(proratedAmount + adjTotal)}
								</span>
							</div>
						{/each}
					{/if}
					<button
						type="button"
						class="btn-add-item"
						onclick={openAddPopover}
					>
						+ Legg til arbeidsgiver
					</button>
				</div>

				{#if combinedTax.lonnGross > 0}
					<div class="trekkprosent-row">
						<button type="button" class="btn-trekkprosent" onclick={openTrekkprosentPopover}>
							Trekkprosent
						</button>
						<span class="font-mono">{effectiveWithholdingPercent}%</span>
					</div>
					<dl class="lonn-summary" aria-live="polite">
						<div class="lonn-row">
							<dt>Brutto lønn</dt>
							<dd class="font-mono">{formatCurrency(combinedTax.lonnGross)}</dd>
						</div>
						<div class="lonn-row skattetrekk-row">
							<dt>Sum skattetrekk</dt>
							<dd class="font-mono">−{formatCurrency(combinedTax.skattetrekk)}</dd>
						</div>
						<div class="lonn-row netto-row">
							<dt>Netto lønn</dt>
							<dd class="font-mono">{formatCurrency(combinedTax.lonnGross - combinedTax.skattetrekk)}</dd>
						</div>
						<div class="lonn-row netto-month-row">
							<dt>Utbetalt per måned</dt>
							<dd class="font-mono">{formatCurrency((combinedTax.lonnGross - combinedTax.skattetrekk) / 12)}</dd>
						</div>
						{#if combinedTax.totalFeriepenger > 0}
							<div class="lonn-row feriepenger-row">
								<dt>Feriepenger (neste år)</dt>
								<dd class="font-mono">{formatCurrency(combinedTax.totalFeriepenger)}</dd>
							</div>
						{/if}
					</dl>
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
								<span class="inntekt-name">{freelance.client}</span>
								<div class="inntekt-actions">
									<button
										type="button"
										class="btn-icon-sm"
										onclick={() => openEditOppdragPopover(freelance)}
										aria-label="Rediger {freelance.client}"
									>
										&#9998;
									</button>
									<button
										type="button"
										class="btn-icon-sm btn-icon-danger"
										onclick={() => removeFreelanceIncome(freelance.id)}
										aria-label="Fjern {freelance.client}"
									>
										&#10005;
									</button>
								</div>
								<span class="font-mono inntekt-amount">{formatCurrency(freelance.amount)}</span>
							</div>
						{/each}
					{/if}
					<button
						type="button"
						class="btn-add-item"
						onclick={openAddOppdragPopover}
					>
						+ Legg til oppdrag
					</button>
				</div>

				{#if combinedTax.enkGross > 0}
					<dl class="naering-summary" aria-live="polite">
						<div class="summary-line">
							<dt>Brutto</dt>
							<dd class="font-mono">{formatCurrency(combinedTax.enkGross)}</dd>
						</div>
						<div class="summary-line utgift-line">
							<dt>
								<button type="button" class="btn-trekkprosent" onclick={openUtgifterPopover}>
									Utgifter
								</button>
							</dt>
							<dd class="font-mono">−{formatCurrency(combinedTax.enkExpenses)}</dd>
						</div>
						<div class="inntekt-total">
							<dt>Næringsinntekt</dt>
							<dd class="font-mono">{formatCurrency(combinedTax.enkNet)}</dd>
						</div>
						<div class="mva-line">
							<dt>MVA å betale</dt>
							<dd class="font-mono">{formatCurrency(getTotalFreelanceMva())}</dd>
						</div>
					</dl>
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
				<dl class="personinntekt-summary">
					<div class="personinntekt-row">
						<dt>Samlet personinntekt</dt>
						<dd class="font-mono">{formatCurrency(combinedTax.totalPersoninntekt)}</dd>
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
				</dl>

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
				<dl class="total-tax-section" aria-live="polite">
					<div class="total-tax-component">
						<dt>Trygdeavgift</dt>
						<dd class="font-mono">{formatCurrency(combinedTax.trygdeavgiftLonn + combinedTax.trygdeavgiftEnk)}</dd>
					</div>
					<div class="total-tax-component">
						<dt>Trinnskatt</dt>
						<dd class="font-mono">{formatCurrency(combinedTax.trinnskatt)}</dd>
					</div>
					<div class="total-tax-component">
						<dt>Skatt på alminnelig inntekt</dt>
						<dd class="font-mono">{formatCurrency(combinedTax.fellesskatt)}</dd>
					</div>
					<div class="total-tax-row">
						<dt>Forventet skattetrekk</dt>
						<dd class="font-mono">{formatCurrency(combinedTax.totalTax)}</dd>
					</div>
					<div class="effective-rate-row">
						<dt>Effektiv skatteprosent: <span class="text-muted">({formatCurrency(combinedTax.totalTax)} / {formatCurrency(combinedTax.totalPersoninntekt)})*100</span></dt>
						<dd class="font-mono">{combinedTax.effectiveRate.toFixed(1)}%</dd>
					</div>

					{#if combinedTax.lonnGross > 0}
						<div class="oppgjor-section">
							<div class="oppgjor-row {combinedTax.difference >= 0 ? 'refund' : 'restskatt'}">
								<dt>{combinedTax.difference >= 0 ? 'Skatt tilgode' : 'Skyldig restskatt'}</dt>
								<dd class="font-mono">{formatCurrency(Math.abs(combinedTax.difference))}</dd>
							</div>
							<div class="total-tax-component">
								<dt>Faktisk skattetrekk</dt>
								<dd class="font-mono">{formatCurrency(combinedTax.skattetrekk)}</dd>
							</div>
							<div class="total-tax-component">
								<dt>Forventet skattetrekk</dt>
								<dd class="font-mono">{formatCurrency(combinedTax.totalTax)}</dd>
							</div>
						</div>
					{/if}
				</dl>
			</div>
		</section>
	{/if}

	<!-- Trekkprosent Popover -->
	{#if showTrekkprosentPopover}
		<button type="button" class="popover-backdrop" onclick={closeTrekkprosentPopover} aria-label="Lukk"></button>
		<div class="popover popover-lg" role="dialog" aria-labelledby="trekkprosent-heading">
			<div class="popover-header">
				<h3 id="trekkprosent-heading">Trekkprosent</h3>
				<button type="button" class="btn-icon" onclick={closeTrekkprosentPopover} aria-label="Lukk">✕</button>
			</div>

			<div class="trekk-method-section">
				<div class="tax-toggle-buttons">
					<button
						type="button"
						class="tax-toggle-btn"
						class:active={getGlobalTaxMethod() === 'tabelltrekk'}
						onclick={() => setGlobalTaxMethod('tabelltrekk')}
					>
						Tabelltrekk
					</button>
					<button
						type="button"
						class="tax-toggle-btn"
						class:active={getGlobalTaxMethod() === 'prosenttrekk'}
						onclick={() => setGlobalTaxMethod('prosenttrekk')}
					>
						Prosenttrekk
					</button>
				</div>
			</div>

			{#if getGlobalTaxMethod() === 'prosenttrekk'}
				<div class="form-group">
					<label class="form-label" for="global-prosenttrekk">Fast trekkprosent for all lønn</label>
					<input
						type="number"
						id="global-prosenttrekk"
						value={getGlobalTaxPercentage()}
						oninput={(e) => setGlobalTaxPercentage(e.currentTarget.valueAsNumber)}
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

	<!-- Add Arbeidsgiver Popover -->
	{#if showAddPopover}
		<button type="button" class="popover-backdrop" onclick={closeAddPopover} aria-label="Lukk"></button>
		<div class="popover popover-lg" role="dialog" aria-labelledby="add-arbeidsgiver-heading">
			<div class="popover-header">
				<h3 id="add-arbeidsgiver-heading">Legg til arbeidsgiver</h3>
				<button type="button" class="btn-icon" onclick={closeAddPopover} aria-label="Lukk">&#10005;</button>
			</div>

			<form class="popover-form" onsubmit={handleAddSubmit}>
				<fieldset class="form-fieldset">
					<div class="form-group">
						<label class="form-label" for="add-income-name">Arbeidsgiver</label>
						<input
							type="text"
							id="add-income-name"
							bind:value={newIncomeName}
							placeholder="Navn på arbeidsgiver"
						/>
					</div>
					<div class="form-row-2">
						<div class="form-group">
							<label class="form-label" for="add-income-yearly">Årslønn (kr)</label>
							<input
								type="number"
								id="add-income-yearly"
								bind:value={newIncomeYearlyAmount}
								placeholder="0"
								min="0"
							/>
						</div>
						<div class="form-group">
							<label class="form-label" for="add-income-percentage">Stillingsprosent</label>
							<input
								type="number"
								id="add-income-percentage"
								bind:value={newIncomePercentage}
								placeholder="100"
								min="0"
								max="100"
							/>
						</div>
					</div>
					<fieldset class="form-group" style="border: none; padding: 0; margin-bottom: var(--space-md);">
						<legend class="form-label">Periode</legend>
						<div class="period-selector">
							<label class="period-option">
								<input
									type="radio"
									name="add-period-type"
									value="fullYear"
									bind:group={newIncomePeriodType}
								/>
								Hele året
							</label>
							<label class="period-option">
								<input
									type="radio"
									name="add-period-type"
									value="custom"
									bind:group={newIncomePeriodType}
								/>
								Angi periode
							</label>
						</div>
						{#if newIncomePeriodType === 'custom'}
							<div class="period-dates">
								<div class="form-group" style="margin-bottom: 0;">
									<label class="form-label" for="add-income-start-date">Fra</label>
									<input
										type="date"
										id="add-income-start-date"
										bind:value={newIncomeStartDate}
									/>
								</div>
								<div class="form-group" style="margin-bottom: 0;">
									<label class="form-label" for="add-income-end-date">Til</label>
									<input
										type="date"
										id="add-income-end-date"
										bind:value={newIncomeEndDate}
									/>
								</div>
							</div>
						{/if}
					</fieldset>
					<!-- Feriepenger Section (collapsible) -->
					<div class="collapsible-section">
						<button
							type="button"
							class="collapsible-toggle"
							onclick={() => showFeriepenger = !showFeriepenger}
							aria-expanded={showFeriepenger}
						>
							<span class="collapsible-toggle-icon">{showFeriepenger ? '▾' : '▸'}</span>
							<span>Feriepenger</span>
							<span class="collapsible-summary text-muted">
								{newIncomeFerieUker === '5' ? '5 uker' : '4+1 uker'}{newIncomeIsOver60 ? ' · 60+' : ''} ({formFeriepengerRate}%)
							</span>
						</button>

						{#if showFeriepenger}
							<div class="collapsible-content">
								<fieldset style="border: none; padding: 0; margin: 0;">
									<legend class="sr-only">Feriepenger</legend>
									<div class="period-selector">
										<label class="period-option">
											<input
												type="radio"
												name="add-ferie-uker"
												value="5"
												bind:group={newIncomeFerieUker}
											/>
											5 uker (12%)
										</label>
										<label class="period-option">
											<input
												type="radio"
												name="add-ferie-uker"
												value="4+1"
												bind:group={newIncomeFerieUker}
											/>
											4+1 uker (10,2%)
										</label>
									</div>
									<label class="checkbox-option">
										<input
											type="checkbox"
											bind:checked={newIncomeIsOver60}
										/>
										Arbeidstaker er 60+ år (+2,3%)
									</label>
								</fieldset>
							</div>
						{/if}
					</div>

					<div class="form-computed-section">
						<div class="form-computed-row">
							<span class="form-computed-label">Brutto lønn</span>
							<span class="form-computed-value font-mono">{formatCurrency(formComputedBrutto)}</span>
						</div>
						<div class="form-computed-row">
							<span class="form-computed-label">Feriepenger ({formFeriepengerRate}%)</span>
							<span class="form-computed-value font-mono">{formatCurrency(formComputedFeriepenger)}</span>
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

	<!-- Edit Arbeidsgiver Popover -->
	{#if showEditPopover && editingIncomeId}
		{@const editingIncome = getIncomes().find(i => i.id === editingIncomeId)}
		<button type="button" class="popover-backdrop" onclick={closeEditPopover} aria-label="Lukk"></button>
		<div class="popover popover-lg" role="dialog" aria-labelledby="edit-arbeidsgiver-heading">
			<div class="popover-header">
				<h3 id="edit-arbeidsgiver-heading">Rediger {editingIncome?.name ?? 'arbeidsgiver'}</h3>
				<button type="button" class="btn-icon" onclick={closeEditPopover} aria-label="Lukk">&#10005;</button>
			</div>

			<form class="popover-form" onsubmit={handleEditSubmit}>
				<fieldset class="form-fieldset">
					<div class="form-group">
						<label class="form-label" for="edit-income-name">Arbeidsgiver</label>
						<input
							type="text"
							id="edit-income-name"
							bind:value={newIncomeName}
							placeholder="Navn på arbeidsgiver"
						/>
					</div>
					<div class="form-row-2">
						<div class="form-group">
							<label class="form-label" for="edit-income-yearly">Årslønn (kr)</label>
							<input
								type="number"
								id="edit-income-yearly"
								bind:value={newIncomeYearlyAmount}
								placeholder="0"
								min="0"
							/>
						</div>
						<div class="form-group">
							<label class="form-label" for="edit-income-percentage">Stillingsprosent</label>
							<input
								type="number"
								id="edit-income-percentage"
								bind:value={newIncomePercentage}
								placeholder="100"
								min="0"
								max="100"
							/>
						</div>
					</div>
					<fieldset class="form-group" style="border: none; padding: 0; margin-bottom: var(--space-md);">
						<legend class="form-label">Periode</legend>
						<div class="period-selector">
							<label class="period-option">
								<input
									type="radio"
									name="edit-period-type"
									value="fullYear"
									bind:group={newIncomePeriodType}
								/>
								Hele året
							</label>
							<label class="period-option">
								<input
									type="radio"
									name="edit-period-type"
									value="custom"
									bind:group={newIncomePeriodType}
								/>
								Angi periode
							</label>
						</div>
						{#if newIncomePeriodType === 'custom'}
							<div class="period-dates">
								<div class="form-group" style="margin-bottom: 0;">
									<label class="form-label" for="edit-income-start-date">Fra</label>
									<input
										type="date"
										id="edit-income-start-date"
										bind:value={newIncomeStartDate}
									/>
								</div>
								<div class="form-group" style="margin-bottom: 0;">
									<label class="form-label" for="edit-income-end-date">Til</label>
									<input
										type="date"
										id="edit-income-end-date"
										bind:value={newIncomeEndDate}
									/>
								</div>
							</div>
						{/if}
					</fieldset>
					<!-- Feriepenger Section (collapsible) -->
					<div class="collapsible-section">
						<button
							type="button"
							class="collapsible-toggle"
							onclick={() => showFeriepenger = !showFeriepenger}
							aria-expanded={showFeriepenger}
						>
							<span class="collapsible-toggle-icon">{showFeriepenger ? '▾' : '▸'}</span>
							<span>Feriepenger</span>
							<span class="collapsible-summary text-muted">
								{newIncomeFerieUker === '5' ? '5 uker' : '4+1 uker'}{newIncomeIsOver60 ? ' · 60+' : ''} ({formFeriepengerRate}%)
							</span>
						</button>

						{#if showFeriepenger}
							<div class="collapsible-content">
								<fieldset style="border: none; padding: 0; margin: 0;">
									<legend class="sr-only">Feriepenger</legend>
									<div class="period-selector">
										<label class="period-option">
											<input
												type="radio"
												name="edit-ferie-uker"
												value="5"
												bind:group={newIncomeFerieUker}
											/>
											5 uker (12%)
										</label>
										<label class="period-option">
											<input
												type="radio"
												name="edit-ferie-uker"
												value="4+1"
												bind:group={newIncomeFerieUker}
											/>
											4+1 uker (10,2%)
										</label>
									</div>
									<label class="checkbox-option">
										<input
											type="checkbox"
											bind:checked={newIncomeIsOver60}
										/>
										Arbeidstaker er 60+ år (+2,3%)
									</label>
								</fieldset>
							</div>
						{/if}
					</div>

					<!-- Adjustments Section (only in edit popover) -->
					<div class="adjustments-section">
						<button
							type="button"
							class="adjustments-toggle"
							onclick={() => showAdjustments = !showAdjustments}
							aria-expanded={showAdjustments}
						>
							<span class="adjustments-toggle-icon">{showAdjustments ? '▾' : '▸'}</span>
							Tillegg og bonus ({editingIncome?.adjustments?.length ?? 0} registrert)
						</button>

						{#if showAdjustments}
							<div class="adjustments-content">
								<!-- Existing adjustments list -->
								{#if (editingIncome?.adjustments?.length ?? 0) > 0}
									<ul class="adjustments-list">
										{#each editingIncome?.adjustments ?? [] as adjustment (adjustment.id)}
											{@const monthLabel = MONTHS_NO.find(m => m.value === adjustment.month)?.label ?? ''}
											{@const typeLabel = ADJUSTMENT_TYPES.find(t => t.value === adjustment.type)?.label ?? ''}
											<li class="adjustment-item" class:editing={editingAdjustmentId === adjustment.id}>
												<div class="adjustment-info">
													<span class="adjustment-month">{monthLabel}:</span>
													<span class="adjustment-type">{typeLabel}</span>
													<span class="adjustment-amount font-mono">{formatCurrency(adjustment.amount)}</span>
													{#if !adjustment.affectsFeriepenger}
														<span class="adjustment-no-ferie" title="Påvirker ikke feriepenger">&#10005; ferie</span>
													{/if}
												</div>
												<div class="adjustment-actions">
													<button
														type="button"
														class="btn-icon-sm"
														onclick={() => startEditAdjustment(adjustment)}
														aria-label="Rediger tillegg"
													>
														&#9998;
													</button>
													<button
														type="button"
														class="btn-icon-sm"
														onclick={() => handleRemoveAdjustment(adjustment.id)}
														aria-label="Fjern tillegg"
													>
														&#10005;
													</button>
												</div>
											</li>
										{/each}
									</ul>
								{/if}

								<!-- Add/Edit adjustment form -->
								<div class="adjustment-form">
									<div class="adjustment-form-row">
										<div class="form-group" style="margin-bottom: 0;">
											<label class="form-label" for="adj-type">Type</label>
											<select id="adj-type" bind:value={newAdjustmentType}>
												{#each ADJUSTMENT_TYPES as type}
													<option value={type.value}>{type.label}</option>
												{/each}
											</select>
										</div>
										<div class="form-group" style="margin-bottom: 0;">
											<label class="form-label" for="adj-month">Måned</label>
											<select id="adj-month" bind:value={newAdjustmentMonth}>
												{#each MONTHS_NO as month}
													<option value={month.value}>{month.label}</option>
												{/each}
											</select>
										</div>
									</div>
									<div class="form-group">
										<label class="form-label" for="adj-amount">Beløp (kr)</label>
										<input
											type="number"
											id="adj-amount"
											bind:value={newAdjustmentAmount}
											placeholder="0"
											min="0"
										/>
									</div>
									<label class="checkbox-option" style="margin-top: 0;">
										<input
											type="checkbox"
											bind:checked={newAdjustmentAffectsFerie}
										/>
										Påvirker feriepenger
									</label>
									<div class="adjustment-form-actions">
										{#if editingAdjustmentId}
											<button type="button" class="btn-secondary btn-sm" onclick={resetAdjustmentForm}>Avbryt</button>
										{/if}
										<button
											type="button"
											class="btn-primary btn-sm"
											onclick={handleAddAdjustment}
											disabled={!newAdjustmentAmount || newAdjustmentAmount <= 0}
										>
											{editingAdjustmentId ? 'Oppdater' : '+ Legg til'}
										</button>
									</div>
								</div>
							</div>
						{/if}
					</div>

					<div class="form-computed-section">
						<div class="form-computed-row">
							<span class="form-computed-label">Brutto lønn</span>
							<span class="form-computed-value font-mono">{formatCurrency(formComputedBrutto)}</span>
						</div>
						{#if formAdjustmentsTotal > 0}
							<div class="form-computed-row form-computed-adjustment">
								<span class="form-computed-label">+ Tillegg/bonus</span>
								<span class="form-computed-value font-mono">+{formatCurrency(formAdjustmentsTotal)}</span>
							</div>
							<div class="form-computed-row form-computed-total">
								<span class="form-computed-label">= Total</span>
								<span class="form-computed-value font-mono">{formatCurrency(formComputedTotalBrutto)}</span>
							</div>
						{/if}
						<div class="form-computed-row">
							<span class="form-computed-label">Feriepenger ({formFeriepengerRate}%)</span>
							<span class="form-computed-value font-mono">{formatCurrency(formComputedFeriepenger)}</span>
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

	<!-- Utgifter Popover -->
	{#if showUtgifterPopover}
		<button type="button" class="popover-backdrop" onclick={closeUtgifterPopover} aria-label="Lukk"></button>
		<div class="popover popover-sm" role="dialog" aria-labelledby="utgifter-heading">
			<div class="popover-header">
				<h3 id="utgifter-heading">Utgifter</h3>
				<button type="button" class="btn-icon" onclick={closeUtgifterPopover} aria-label="Lukk">✕</button>
			</div>
			<fieldset class="form-fieldset">
				<legend class="sr-only">Næringsutgifter</legend>
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
			</fieldset>
			<div class="popover-footer">
				<button type="button" class="btn-primary" onclick={closeUtgifterPopover}>Ferdig</button>
			</div>
		</div>
	{/if}

	<!-- Add Oppdrag Popover -->
	{#if showAddOppdragPopover}
		<button type="button" class="popover-backdrop" onclick={closeAddOppdragPopover} aria-label="Lukk"></button>
		<div class="popover popover-lg" role="dialog" aria-labelledby="add-oppdrag-heading">
			<div class="popover-header">
				<h3 id="add-oppdrag-heading">Legg til oppdrag</h3>
				<button type="button" class="btn-icon" onclick={closeAddOppdragPopover} aria-label="Lukk">&#10005;</button>
			</div>

			<form class="popover-form" onsubmit={handleAddOppdragSubmit}>
				<fieldset class="form-fieldset">
					<div class="form-group">
						<label class="form-label" for="add-freelance-client">Oppdragsgiver</label>
						<input
							type="text"
							id="add-freelance-client"
							bind:value={newFreelanceClient}
							placeholder="F.eks. Kunde AS..."
						/>
					</div>
					<div class="form-group">
						<label class="form-label" for="add-freelance-description">Kort beskrivelse</label>
						<input
							type="text"
							id="add-freelance-description"
							bind:value={newFreelanceDescription}
							placeholder="F.eks. Webutvikling..."
						/>
					</div>
					<div class="form-group">
						<label class="form-label" for="add-freelance-amount">Beløp eks. MVA (kr)</label>
						<input
							type="number"
							id="add-freelance-amount"
							bind:value={newFreelanceAmount}
							placeholder="0"
							min="0"
						/>
					</div>
					<div class="popover-actions">
						<button type="button" class="btn-secondary" onclick={closeAddOppdragPopover}>Avbryt</button>
						<button type="submit" class="btn-primary">Legg til</button>
					</div>
				</fieldset>
			</form>
		</div>
	{/if}

	<!-- Edit Oppdrag Popover -->
	{#if showEditOppdragPopover && editingFreelanceId}
		{@const editingFreelance = getFreelanceIncomes().find(f => f.id === editingFreelanceId)}
		<button type="button" class="popover-backdrop" onclick={closeEditOppdragPopover} aria-label="Lukk"></button>
		<div class="popover popover-lg" role="dialog" aria-labelledby="edit-oppdrag-heading">
			<div class="popover-header">
				<h3 id="edit-oppdrag-heading">Rediger {editingFreelance?.client ?? 'oppdrag'}</h3>
				<button type="button" class="btn-icon" onclick={closeEditOppdragPopover} aria-label="Lukk">&#10005;</button>
			</div>

			<form class="popover-form" onsubmit={handleEditOppdragSubmit}>
				<fieldset class="form-fieldset">
					<div class="form-group">
						<label class="form-label" for="edit-freelance-client">Oppdragsgiver</label>
						<input
							type="text"
							id="edit-freelance-client"
							bind:value={newFreelanceClient}
							placeholder="F.eks. Kunde AS..."
						/>
					</div>
					<div class="form-group">
						<label class="form-label" for="edit-freelance-description">Kort beskrivelse</label>
						<input
							type="text"
							id="edit-freelance-description"
							bind:value={newFreelanceDescription}
							placeholder="F.eks. Webutvikling..."
						/>
					</div>
					<div class="form-group">
						<label class="form-label" for="edit-freelance-amount">Beløp eks. MVA (kr)</label>
						<input
							type="number"
							id="edit-freelance-amount"
							bind:value={newFreelanceAmount}
							placeholder="0"
							min="0"
						/>
					</div>
					<div class="popover-actions">
						<button type="button" class="btn-secondary" onclick={closeEditOppdragPopover}>Avbryt</button>
						<button type="submit" class="btn-primary">Oppdater</button>
					</div>
				</fieldset>
			</form>
		</div>
	{/if}
</div>

<style>
	/* Inntekter Grid - Intrinsic layout */
	.inntekter-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
		gap: var(--space-lg);
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
		grid-template-columns: 1fr auto auto;
		gap: var(--space-sm);
		align-items: center;
		padding: var(--space-xs) 0;
		font-size: 0.9rem;
	}

	.inntekt-name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.inntekt-actions {
		display: flex;
		gap: 2px;
		opacity: 0.5;
		transition: opacity var(--duration-fast);
	}

	.inntekt-row:hover .inntekt-actions {
		opacity: 1;
	}

	.inntekt-amount {
		text-align: right;
	}

	.btn-icon-danger:hover {
		color: var(--color-danger);
	}

	.inntekt-total {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		margin-top: var(--space-md);
		border-top: 1px solid var(--color-border);
		font-weight: 600;
	}

	.lonn-summary {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border);
	}

	.lonn-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
		padding: var(--space-xs) 0;
	}

	.lonn-row:first-child {
		font-weight: 600;
	}

	.skattetrekk-row {
		color: var(--color-text-muted);
	}

	.netto-row {
		margin-top: var(--space-xs);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border);
		font-weight: 600;
	}

	.netto-month-row {
		font-size: 0.85rem;
		font-weight: 400;
		color: var(--color-text-muted);
	}

	.feriepenger-row {
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-weight: 500;
	}

	.naering-summary {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border);
	}

	.summary-line {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
		padding: var(--space-xs) 0;
	}

	.utgift-line {
		color: var(--color-text-muted);
	}

	.mva-line {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
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

	/* Skatteberegning Section */
	.personinntekt-summary {
		padding-bottom: var(--space-lg);
		margin-bottom: var(--space-md);
		border-bottom: 2px solid var(--color-border);
	}

	.personinntekt-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
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
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-xs) 0;
	}

	.tax-calc-label {
		font-size: 0.9rem;
	}


	.deduction-row {
		color: var(--color-text-muted);
	}

	.tax-subtotal {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
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
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
		padding: var(--space-xs) 0;
	}

	.total-tax-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border);
		font-size: 1.25rem;
		font-weight: 700;
	}

	.effective-rate-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
		margin-top: var(--space-xs);
		color: var(--color-text-muted);
	}

	.oppgjor-section {
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border);
	}

	.oppgjor-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-md);
		font-size: 1.25rem;
		font-weight: 700;
	}

	.oppgjor-row.refund {
		color: var(--color-success);
	}

	.oppgjor-row.restskatt {
		color: var(--color-danger);
	}

	.trekkprosent-row {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		margin-top: var(--space-sm);
	}

	.btn-trekkprosent {
		width: max-content;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-xs) var(--space-sm);
		color: var(--color-text-muted);
		cursor: pointer;
		font-size: 0.875rem;
		font-family: inherit;
	}

	.btn-trekkprosent:hover {
		border-color: var(--color-text-muted);
		color: var(--color-text);
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
		transition: background var(--duration-fast), color var(--duration-fast);
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

	/* Popover styles are now in app.css */
</style>
