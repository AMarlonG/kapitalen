# Kapitalen

Personal finance application for tracking income, expenses, and investments.

## Tech Stack

- **Framework:** SvelteKit
- **Language:** TypeScript
- **Styling:** Vanilla CSS with custom properties
- **Database:** Supabase

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/amarlong/Kapitalen.git
cd Kapitalen
npm install
```

## Development

```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # TypeScript check
```

## Project Structure

See [PROJECT_GUIDE.md](PROJECT_GUIDE.md) for detailed architecture, design system, and specifications.

## Norwegian Tax Resources

Essential Skatteetaten resources for tax calculations:

- [Trekktabell Calculator](https://trekktabell.formueinntekt.skatt.skatteetaten.no/) - Interactive tax table lookup
- [Trekktabell GitHub](https://github.com/Skatteetaten/trekktabell) - Official Java calculation logic
- [Tax Tables (Text Format)](https://www.skatteetaten.no/en/rates/deduction-tables-in-text-format/) - Downloadable data files
- [Table Numbers 2025+](https://www.skatteetaten.no/en/business-and-organisation/employer/tax-deduction-cards-and-tax-deductions/as-an-employer-you-are-obliged-to-make-withholding-tax-deductions/overview-over-the-table-steps-for-deduction-tables-2025/) - Overview of table brackets

> **Note:** Table numbers changed in 2025. Old series (7100-7133) replaced by 8000-8400 (deduction tables) and 9010-9400 (supplementary tables).

## License

**All Rights Reserved**

Copyright (c) 2025. This software and its source code are proprietary. No part of this project may be reproduced, distributed, or used without explicit written permission from the copyright holder.
