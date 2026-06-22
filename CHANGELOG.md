# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Amortization calculator page (`amortization-calculator.html`) with loan amount, term (years+months), interest rate inputs, optional extra payments section with dynamic system date, pie chart (principal vs interest), line chart, amortization tables, and educational content
- Amortization calculator logic (`js/amortization-calculator.js`)
- Unit tests for amortization calculator (`tests/amortization-calculator.test.js`)

### Added
- Mortgage calculator page (`mortgage-calculator.html`) with full form, SVG pie/line charts, amortisation tables, biweekly comparison, and educational content
- Mortgage calculator logic (`js/mortgage-calculator.js`) with 10 exported pure functions: calculateMonthlyPayment, buildAmortizationSchedule, calculateBiweeklyPayment, formatCurrency, computeTotalCosts, generatePieChartData, buildAnnualTableHTML, buildMonthlyTableHTML, insertComma2, proComma2, cunitchange
- Unit tests for mortgage calculator (`tests/mortgage-calculator.test.js`) — 24 tests covering 7 modules
- Box-shadow effect on all calculator form input fields and select boxes
- Input field unit symbols: permanent $ and % indicators inside input fields for better UX

### Changed
- Input field unit symbols now toggle visibility when user changes between $ and % units
- Result table now conditionally displays Annual Tax & Cost parameters only when values are non-zero
- Extra payment information now appears in the table when user sets positive values
- Added conditional display logic for result table rows based on non-zero values

### Fixed
- Yearly extra payment month selector ID mismatch: JS `mortgage-calculator.js` reads `cexysmm` but HTML had `cexysm`, silently ignoring user-selected month and defaulting to loan start month. Fix: renamed HTML element ID to `cexysmm` so yearly extra payments apply in the correct calendar month.
- Line chart now shows cumulative interest and cumulative payment (running total over full term) instead of per-year values
- Line chart Y-axis labels now show in "K" format (e.g. 200K, 400K) without dollar sign
- Line chart increased to 350×220 for better readability
- Line chart legend placed at top-left of plot area with larger 13px font to avoid overlapping lines
- Line chart X-axis now dynamically reflects actual mortgage payment years (not fixed to Loan Term)
- Clear button now only clears input fields to empty without affecting results section or collapsing panels
- Calculator panel padding reduced for tighter width matching amortization table
- Biweekly table now uses same styling as House Price summary table (gray rows, bold rows, white border-bottom)
- Biweekly Payback Results header now reads "(without extra payment)" and uses same bold/gray styling as House Price header
- Biweekly Payment row is now normal text (no bold/gray)
- "Payoff in approx." now shows just "years" once
- Added margin between calculator panel and "Amortization schedule" title
- `mcvsblegend` font size increased to 13px for readability
- Pie chart now shows all percentage labels (including small slices)
- Pie chart legend font size increased to 14px
- Removed "Annual Tax & Cost" header text below "Include Taxes & Costs Below" checkbox
- Input field unit symbols CSS positioning to prevent text overlap with symbols
- Downpayment field unit symbols now initialize correctly when page loads
- Fixed initial HTML display state of unit symbols to match selector defaults (cpropertytaxes, chomeins, cpmi, choa, cothercost)
- Widen Home Price input width from 75px to 110px so 1,000,000 fits without hiding digits
- Remove .inhalf { padding-left: 20px } rule so % fields keep value flush left inside input box
- Reduce .indollar padding-left from 20px to 2px and move .unit-prefix from left: 6px to left: 1px so $ symbol sits 1px from input border with 2px gap to first digit
- Start Date month `<select>` misaligned with other row inputs — wrapped month+year in a 110px `.input-unit-wrapper` inside column 2 so month select left edge aligns with Home Price / Interest Rate inputs
- Down payment default value corrupted from 20% to 0.005% on page load — replaced `cunitchange('cdownpayment', ...)` init call with direct symbol/class toggling that doesn't recalculate the field value

### Changed
- All calculator form input fields now left-aligned (was right-aligned)
- Box-shadow changed from inset (inner shadow) to outer shadow on all input fields and selects
- Tax/cost checkbox toggle now uses `visibility` instead of `display` to prevent input field shifting when toggling
- Biweekly "Payoff in approx." no longer shows dollar sign
- Amortization table cells more compact (padding reduced to 1px 4px, white-space: nowrap)
- Tooltip icons replaced from calculator-white.svg to help.svg (question mark in circle icon)
- Help icon (help.svg) positioned inline between label text and input box using flex layout
- Other calculator category page (`other-calculator.html`)
- Math calculator category page (`math-calculator.html`)
- Fitness & Health calculator category page (`fitness-calculator.html`)
- Financial calculator category page (`financial-calculator.html`) with two-column grid layout, 71 calculator links across 6 subcategories, sidebar search and popular calculators
- Category page styles (`css/category.css`) for subcategory grids, sidebar, breadcrumbs, and responsive breakpoints
- Category page JS behaviour (`js/financial-calculator.js`) with debounced search filtering, DOM manipulation, and keyboard support
- Unit tests for financial category page (`tests/financial-calculator.test.js`) — 6 tests covering filter, DOM behaviour, and init
- Homepage (`index.html`) with category grid, search bar, CTA, footer, JSON-LD
- CSS design system: `css/base.css` (variables, reset, typography)
- Layout styles: `css/layout.css` (header, sub-header, footer, grid, responsive breakpoints)
- Client-side search: `js/search.js` (prefix-based filtering with keyword matching)
- SVG logo icon: `img/svg/calculator-white.svg`
- Category images (`img/financial-calculator.png`, etc.)
- Unit tests for search functionality: `tests/homepage.test.js` (15 tests)
- Updated `.eslintrc.json` with Vitest globals for test files
- Sub-header section below blue bar with lighter background for search
- Search button next to search input in sub-header
- CTA button "All Calculators" moved to sub-header, right-aligned
- "Contact Us" and "FAQ" links added to footer

### Changed
- Fixed `css/category.css`: added `flex: 1` to `.top-nav` so it fills header space and centers correctly between logo and sign-in link
- Fixed `css/category.css`: ensured `#site-footer.category-page-footer { padding: 0 }` overrides layout.css default to keep footer nav + copyright in one row
- Restored "Terms of Use" link in category page footer
- Increased footer font size from `--text-xs` (12px) to `--text-sm` (14px) for better readability
- Fixed footer alignment: added `margin-bottom: 0` to `.category-page-footer .footer-links` to override `layout.css` default, ensuring copyright stays inline with links
- Added padding to category page footer (`var(--space-md) 0`) for spacing between footer content and borders, and separation from body
- Added `margin-top: var(--space-xl)` to category page footer for spacing between footer and main page content
- Increased sub-header height to 1.5x by using `padding: calc(var(--space-xl) * 1.5) 0` (54px instead of 36px)
- Fixed search bug: 2-character queries (e.g. "mo") no longer match keywords, preventing false positives like "Average Calculator" matching via keyword "mode". Keyword matching now requires 3+ characters.
- Set all category heading colors to accent orange (--color-accent) — a unified, non-blue color for all category names
- Simplified all "View All" category links from "View All XXX Calculators →" to just "View All"
- Changed category heading color from blue (--color-primary) to dark gray (--color-text) — unified to a non-blue color
- Aligned disclaimer text to start at same left edge as logo by removing its `max-width` constraint, so it spans the full container width and aligns with the logo start and "All Calculators" button end
- Removed "Skip to main content" skip link and its CSS rules
- Unified all category heading colors to use --color-primary (removed per-category colors)
- Unified all "View All" link colors to use --color-primary (removed per-category colors)
- Added `white-space: nowrap` to "View All" links to ensure they fit on one line
- Increased Calcify.ai logo text font size to --text-xl (48px)
- Aligned footer disclaimer text to left (was center)
- Doubled entire type scale to 32px base font (--text-xs: 20px, --text-sm: 24px, --text-base: 32px, --text-md: 36px, --text-lg: 40px, --text-xl: 48px, --text-2xl: 56px, --text-3xl: 64px); spacing scaled for comfortable layout
- Widened `.container` max-width to 1400px to prevent overflow with 32px+ text
- Increased logo icon size to 48×48px to match larger text
- Widened search input to 600px (was 450px) with `max-width: 100%` for responsive fitting
- Added `overflow: hidden; text-overflow: ellipsis` to category headings to prevent text overflow
- Added `min-width: 0` to category cards and body to allow proper grid shrinking
- Category headings now stay on a single line (white-space: nowrap)
- Category titles use unique semantic colors: Financial=green (#2e7d32), Fitness=teal (#00796b), Math=purple (#7b1fa2), Other=deep orange (#e65100)
- "View All" links made more distinguishable: bold, underlined, matching category color, larger font
- Increased base font size to 16px and scaled type scale proportionally (--text-sm: 14px, --text-md: 18px, --text-lg: 20px, --text-xl: 22px, --text-2xl: 26px, --text-3xl: 32px)
- Enlarged search bar and button to approximately 3x original size (padding, font-size, border-width, width)
- Removed sticky positioning from header and sub-header so the entire page scrolls together as one unit
- Made "All Calculators" button a rectangle (border-radius: 0)
- Reduced category images to 135×135px (was 200×150px) with left-alignment
- Search moved to sub-header with interactive dropdown
- Search logic: 1-char queries match only by name prefix; 2+ char queries match by word prefix in name/keywords
- Intro paragraph moved to footer disclaimer area
- All ad slots removed from homepage
- Category images wrapped in clickable `<a>` tags linking to category pages
- Category heading `<h2>` elements wrapped in `<a>` tags with larger font, primary colour, left-aligned
- Category grid displayed as single row (4 columns) with no borders, left-aligned
- Removed sidebar layout from homepage
- Removed nav category links from header
- Renamed `initSearch` to `initHeaderSearch`
- Removed `.svg` placeholder images in favour of `.png` images
- CTA button text changed from "Browse All 40+ Free Calculators →" to "All Calculators"
- Sub-header height increased to 4x original (`padding: var(--space-xl) 0`)
- Search dropdown background made transparent
- "All Calculators" CTA button moved from sub-header to header (blue bar), right-aligned
- CTA link changed from `all-calculators.html` to `sitemap.html`
- Category images restored to original size (200×150, fixed)
- Sub-header height increased to 5x original (`padding: 160px 0`)
- Search input and button now have rounded corners with gap between them (`margin-left: var(--space-sm)`)
- Added vertical spacing between sub-header and category grid (`margin-top: var(--space-2xl)`)
