# Kapitalen - Project Guide

## Overview
Personal finance web application for tracking income, expenses, and investments. Built with SvelteKit, TypeScript, and vanilla CSS.

**See also:** [CLAUDE.md](./CLAUDE.md) for Claude Code-specific workflow instructions (dev server, HMR).

## Tech Stack
- **Framework:** SvelteKit
- **Language:** TypeScript
- **Styling:** Vanilla CSS with custom properties
- **Data:** Supabase

## Principles
- **Minimize JavaScript** - Always prioritize HTML/CSS solutions first. Only use JS when HTML/CSS cannot solve the problem. When JS is required, explain why.

## Agents
Expert agents for best practices guidance (`.claude/agents/`):
- `svelte-sveltekit-expert` - Svelte 5 runes, SvelteKit routing and patterns
- `supabase-expert` - Database, auth, RLS, storage, realtime
- `typescript-expert` - Type system, generics, utility types
- `html-webapi-expert` - Semantic HTML, DOM, Fetch, Storage, Events
- `css-expert` - Grid-first layouts, custom properties, fluid design
- `skatteetaten-expert` - Norwegian tax, Skatteetaten, trinnskatt, trygdeavgift

## Project Structure
```
kapitalen/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte        # Navigation between tabs
│   │   ├── +page.svelte          # Oversikt (Dashboard)
│   │   ├── okonomi/
│   │   │   └── +page.svelte      # Økonomi tab (Income/Expenses)
│   │   └── verdier/
│   │       └── +page.svelte      # Verdier tab (Assets/Portfolio)
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Navigation.svelte
│   │   │   ├── StatCard.svelte
│   │   │   ├── ExpenseRow.svelte
│   │   │   ├── AssetCard.svelte
│   │   │   └── RebalanceCalc.svelte
│   │   ├── data/
│   │   │   └── mockData.ts
│   │   └── utils/
│   │       └── calculations.ts
│   └── app.css                   # Global styles
├── static/
└── package.json
```

## Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

## Key Values (from Excel)

| Metric | Value |
|--------|-------|
| Gross monthly | 54,167 kr |
| Tax (25%) | 13,542 kr |
| Net monthly | 40,625 kr |
| Fixed expenses | 17,149 kr |
| Food budget | 6,000 kr |
| Total expenses | 23,149 kr |
| Monthly savings | 13,500 kr |
| Buffer target | 69,447 kr (3 months) |
| Investment split | 70% market / 30% metals |

## Design System

### Colors
```css
--color-green: #22c55e;    /* Good/On track */
--color-yellow: #eab308;   /* Warning/Attention */
--color-red: #ef4444;      /* Over budget/Alert */
--color-bg: #f8fafc;       /* Background */
--color-surface: #ffffff;  /* Cards */
--color-text: #1e293b;     /* Primary text */
--color-muted: #64748b;    /* Secondary text */
```

### Traffic Light Status
- **Green:** Within 5% of target
- **Yellow:** 5-15% deviation
- **Red:** Over 15% deviation or over budget

## Tabs

### 1. Økonomi (Income/Expenses)
- Income section: Gross → Tax (25%) → Net (auto-calculated)
- Fixed expenses (rent, utilities, internet)
- Variable expenses (food with budget vs actual)
- Subscriptions
- Monthly cashflow summary

### 2. Verdier (Assets/Portfolio)
- Market portfolio: ETFs, stocks (with tickers)
- Precious metals: Gold, Silver
- Pension tracking
- Buffer/cash balance
- Rebalancing calculator (70% market / 30% metals target)

### 3. Oversikt (Dashboard)
- Key metrics: Net worth, monthly savings, budget status
- Traffic light indicators
- Action alerts
- Month-over-month comparison

## Calculations

### Tax Calculation
```typescript
effectiveTaxRate = 0.25  // 25%
netIncome = grossIncome * (1 - effectiveTaxRate)
```

### Savings
```typescript
monthlySavings = netIncome - totalExpenses
```

### Rebalancing
```typescript
targetMarket = 0.70  // 70%
targetMetals = 0.30  // 30%
deviation = Math.abs(actualPercent - targetPercent)
```

## Phase 1 Scope (Current)
- [x] Project setup
- [ ] Mock data
- [ ] Layout & navigation
- [ ] Økonomi tab
- [ ] Verdier tab
- [ ] Oversikt tab
- [ ] Polish & testing

## Out of Scope (Phase 2+)
- Charts/visualizations (Chart.js)
- Supabase database
- API integrations (Yahoo Finance, Norges Bank)
- Authentication
- Data export/import
