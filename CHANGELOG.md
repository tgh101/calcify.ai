# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
