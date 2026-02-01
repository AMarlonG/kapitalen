# Kapitalen - Claude Code Instructions

## Dev Server Workflow

**IMPORTANT:** The Vite dev server has Hot Module Replacement (HMR). Changes are reflected instantly without restarting.

- Start the dev server **once** at the beginning of a session (if not already running)
- Use `npm run build` to check for TypeScript/compilation errors (does NOT start a server)
- **NEVER** run `npm run dev` to "verify changes work" - HMR handles this automatically
- If you need to check a port, use `lsof -i :5173` instead of starting a new server

## Project Stack
- SvelteKit with Svelte 5 (runes)
- TypeScript
- Vite

## Norwegian Tax Resources (Skatteetaten)

Essential resources for tax calculations:

- **Trekktabell Calculator**: https://trekktabell.formueinntekt.skatt.skatteetaten.no/
- **Trekktabell GitHub (Java)**: https://github.com/Skatteetaten/trekktabell - Official calculation logic for tabelltrekk
- **Tax Tables (Text Format)**: https://www.skatteetaten.no/en/rates/deduction-tables-in-text-format/ - Downloadable data files
- **Table Number Overview 2025+**: https://www.skatteetaten.no/en/business-and-organisation/employer/tax-deduction-cards-and-tax-deductions/as-an-employer-you-are-obliged-to-make-withholding-tax-deductions/overview-over-the-table-steps-for-deduction-tables-2025/

**Note:** Table numbers changed in 2025:
- Old: 7100-7133
- New: 8000-8400 (deduction tables), 9010-9400 (supplementary tables)
- The number indicates deductions in thousands (e.g., 8130 = 130,000 kr in deductions)
