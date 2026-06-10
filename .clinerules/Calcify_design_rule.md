# Calculator.net Clone — Cline Project Rules
# Drop this file as `.clinerules` in your project root.
# Cline will follow these rules for every file it generates.

---

## 1. PROJECT OVERVIEW

Clone the design, layout, and UX patterns of calculator.net — a high-traffic, ad-monetized
online calculator directory. The goal is a pixel-faithful structural clone (not a copy
of branding) that is production-ready, SEO-optimised, and monetisation-ready from day one.

---

## 2. REVERSE-ENGINEERED TECH STACK (calculator.net)

Detected from HTTP headers, HTML source, CDN fingerprints, and asset patterns:

| Layer              | Technology                                      | Evidence / Notes                                      |
|--------------------|--------------------------------------------------|-------------------------------------------------------|
| Frontend           | Vanilla HTML + CSS + JavaScript (no framework)   | No React/Vue/Angular bundle detected; plain <script>  |
| CSS                | Custom hand-written CSS (no Tailwind/Bootstrap)  | No utility-class fingerprints; bespoke class names    |
| CDN / Assets       | Amazon CloudFront                                | Assets served from d26tpo4cm8sb6k.cloudfront.net      |
| Hosting            | Custom server (likely Apache or Nginx on AWS)    | CloudFront distribution in front                      |
| Backend / Pages    | Server-side rendered (PHP most likely)           | .html extensions on all pages — static or PHP output  |
| Analytics          | Google Analytics (UA / GA4)                      | Standard analytics integration on high-traffic sites  |
| Advertising        | Google AdSense / Google Ad Manager               | Primary revenue; banner + in-content ad slots         |
| Images / Icons     | SVG + optimised JPEG (CloudFront-served)          | Category thumbnails are 200×150 JPEGs via CDN         |
| Search             | Client-side JS filter or server-side PHP search  | Search bar on homepage                                |
| Fonts              | System font stack (no Google Fonts detected)     | Arial / sans-serif fallback — keeps load fast         |
| Structured Data    | JSON-LD (FAQPage, BreadcrumbList, WebApplication) | SEO schema for calculator pages                       |

### Key architectural insight
calculator.net is deliberately technology-minimal. No JS framework, no heavy CSS library.
Every page is a self-contained HTML file with inline or same-page <script> blocks.
This gives sub-1s TTFB and excellent Core Web Vitals — critical for ad RPM and SEO rank.
**Your clone must follow the same philosophy: zero runtime frameworks.**

---

## 3. CLONE TECH STACK (what YOU will build)

| Layer              | Choice                   | Rationale                                              |
|--------------------|--------------------------|--------------------------------------------------------|
| HTML               | Semantic HTML5           | SEO, accessibility, and speed                          |
| CSS                | Custom CSS (no Tailwind) | Full control; mirrors original architecture            |
| JavaScript         | Vanilla ES6+             | No bundler needed; keeps pages self-contained          |
| Build tooling      | None (optional Vite)     | Optional; keep it optional and not required at runtime |
| Backend (optional) | PHP 8.x or Node/Express  | For dynamic routing if needed; otherwise pure static   |
| CDN                | Cloudflare (free tier)   | Mirrors original CloudFront strategy                   |
| Ads                | Google AdSense           | Same monetisation layer                                |
| Analytics          | GA4 (gtag.js)            | Standard                                               |
| Hosting            | VPS (Hetzner / DigitalOcean) or Cloudflare Pages | Fast, cheap                          |

---

## 4. FILE & FOLDER STRUCTURE

```
/
├── index.html                  ← Homepage (calculator directory)
├── financial-calculator.html   ← Category landing page
├── mortgage-calculator.html    ← Individual calculator page
├── ... (one .html per calculator)
├── css/
│   ├── base.css                ← Reset, typography, CSS variables
│   ├── layout.css              ← Header, footer, grid
│   ├── calculator.css          ← Shared calculator widget styles
│   └── ads.css                 ← Ad slot sizing/spacing
├── js/
│   ├── calc-core.js            ← Shared calculation utilities
│   ├── search.js               ← Homepage search filter
│   └── [calc-name].js          ← Per-calculator logic
├── img/
│   ├── financial-calculator.jpg
│   ├── fitness-calculator.jpg
│   ├── math-calculator.jpg
│   └── svg/
│       └── calculator-white.svg
├── sitemap.xml
├── robots.txt
└── .clinerules                 ← This file
```

---

## 5. DESIGN SYSTEM (from visual analysis)

### 5.1 Colour Palette

```css
:root {
  /* Primary */
  --color-primary:        #3d7ebf;   /* Header blue / links */
  --color-primary-dark:   #2c5f8f;   /* Hover state */
  --color-primary-light:  #e8f1fb;   /* Subtle backgrounds */

  /* Neutrals */
  --color-bg:             #ffffff;
  --color-surface:        #f5f5f5;   /* Sidebar / alt rows */
  --color-border:         #cccccc;
  --color-text:           #333333;
  --color-text-muted:     #666666;
  --color-text-light:     #999999;

  /* Accent */
  --color-accent:         #e87722;   /* CTA buttons, highlights */
  --color-accent-dark:    #c45e0c;

  /* Ads */
  --color-ad-bg:          #f9f9f9;
  --color-ad-border:      #e0e0e0;
}
```

### 5.2 Typography

```css
:root {
  /* System font stack — zero web font latency */
  --font-body: Arial, Helvetica, sans-serif;
  --font-mono: "Courier New", Courier, monospace;

  /* Scale */
  --text-xs:   11px;
  --text-sm:   12px;
  --text-base: 13px;   /* calculator.net uses 13px body — deliberately compact */
  --text-md:   14px;
  --text-lg:   16px;
  --text-xl:   18px;
  --text-2xl:  22px;
  --text-3xl:  26px;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-text);
  line-height: 1.5;
}
```

### 5.3 Layout

- **Max content width:** 1000px centred (not full-bleed)
- **Main layout:** Left content column (≈68%) + Right sidebar (≈30%) with gutter
- **Homepage grid:** 2-column category card grid on desktop, 1-column on mobile
- **Header:** Full-width blue bar, logo left, search right
- **Footer:** Thin, plain text links, copyright

```
┌──────────────────────────────────────────┐
│            HEADER (blue, full width)      │
├──────────────────────────────────────────┤
│  BREADCRUMB / PAGE TITLE                  │
├─────────────────────────┬────────────────┤
│                         │                │
│   MAIN CONTENT          │  SIDEBAR       │
│   (calculator widget    │  (Ad slot 300  │
│    + explanation text)  │   × 250 or     │
│                         │   300 × 600)   │
│                         │                │
├─────────────────────────┴────────────────┤
│   RELATED CALCULATORS (horizontal list)   │
├──────────────────────────────────────────┤
│              FOOTER                       │
└──────────────────────────────────────────┘
```

---

## 6. COMPONENT RULES

### 6.1 Header
```html
<header id="site-header">
  <div class="container">
    <a href="/" class="logo">
      <img src="/img/svg/calculator-white.svg" alt="CalcClone" width="32" height="32">
      <span>CalcClone</span>
    </a>
    <nav class="main-nav">
      <a href="/financial-calculator.html">Financial</a>
      <a href="/fitness-calculator.html">Fitness</a>
      <a href="/math-calculator.html">Math</a>
      <a href="/other-calculator.html">Other</a>
    </nav>
    <form class="header-search" action="/search.html" method="get">
      <input type="search" name="q" placeholder="Search calculators…" aria-label="Search">
      <button type="submit">Go</button>
    </form>
  </div>
</header>
```

### 6.2 Calculator Widget Container
```html
<div class="calc-widget">
  <h1 class="calc-title">Mortgage Calculator</h1>
  <div class="calc-form">
    <!-- inputs here -->
  </div>
  <div class="calc-result" aria-live="polite">
    <!-- results injected by JS -->
  </div>
</div>
```

### 6.3 Ad Slots
```html
<!-- Top leaderboard (728×90 desktop / 320×50 mobile) -->
<div class="ad-slot ad-leaderboard" aria-label="Advertisement">
  <!-- AdSense ins tag goes here -->
</div>

<!-- Sidebar rectangle (300×250) -->
<div class="ad-slot ad-rectangle" aria-label="Advertisement">
  <!-- AdSense ins tag goes here -->
</div>

<!-- In-content banner between sections -->
<div class="ad-slot ad-content" aria-label="Advertisement">
  <!-- AdSense ins tag goes here -->
</div>
```

### 6.4 Category Card (Homepage Grid)
```html
<div class="category-card">
  <a href="/financial-calculator.html">
    <img src="/img/financial-calculator.jpg" alt="Financial Calculators" 
         width="200" height="150" loading="lazy">
    <h2>Financial Calculators</h2>
  </a>
  <ul>
    <li><a href="/mortgage-calculator.html">Mortgage Calculator</a></li>
    <li><a href="/loan-calculator.html">Loan Calculator</a></li>
    <!-- ... -->
  </ul>
</div>
```

---

## 7. SEO RULES (every page must follow)

### 7.1 Required meta tags per page
```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>[Calculator Name] - Free Online [Type] Calculator | CalcClone</title>
<meta name="description" content="Use our free [calculator name] to calculate [X]. [One sentence benefit statement].">
<link rel="canonical" href="https://yourdomain.com/[page-slug].html">
```

### 7.2 JSON-LD structured data (calculator pages)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Mortgage Calculator",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "Free online mortgage calculator…"
}
</script>
```

### 7.3 Page content requirements
- **H1:** One per page, contains the calculator name + primary keyword
- **Intro paragraph:** 80–150 words above the calculator widget (above the fold)
- **Explanation section:** 400–800 words below the calculator, explaining the formula,
  use cases, and FAQs. This is the SEO meat — do not skip it.
- **Related calculators:** At least 4 internal links to relevant calculators
- **Images:** All images must have descriptive alt text; use `loading="lazy"` except hero

---

## 8. PERFORMANCE RULES

These are non-negotiable. calculator.net scores 90+ on PageSpeed — so must your clone.

1. **No JavaScript frameworks.** No React, Vue, Angular, or any runtime library.
2. **No web fonts.** System font stack only (see §5.2).
3. **CSS in `<head>`, JS before `</body>`.** Never block rendering.
4. **Inline critical CSS** for above-the-fold content on pages with complex layouts.
5. **Images:** WebP format preferred; provide JPEG fallback. Max 50 KB per category image.
6. **No render-blocking third-party scripts** except AdSense (load async).
7. **Target metrics:**
   - LCP < 2.5 s
   - CLS < 0.1
   - FID / INP < 200 ms
8. **Minify** all CSS and JS before deploying (use a simple build script or do it manually).

---

## 9. CALCULATOR LOGIC RULES

Each calculator is a self-contained JavaScript module, no imports required.

```javascript
// js/mortgage-calculator.js
(function () {
  'use strict';

  function calculate() {
    const principal = parseFloat(document.getElementById('principal').value);
    const rate      = parseFloat(document.getElementById('rate').value) / 100 / 12;
    const months    = parseInt(document.getElementById('term').value) * 12;

    if (isNaN(principal) || isNaN(rate) || isNaN(months)) {
      showError('Please fill in all fields with valid numbers.');
      return;
    }

    const payment = principal * rate / (1 - Math.pow(1 + rate, -months));
    displayResult(payment);
  }

  function displayResult(monthlyPayment) {
    const el = document.getElementById('result');
    el.innerHTML = `<strong>Monthly Payment:</strong> $${monthlyPayment.toFixed(2)}`;
  }

  function showError(msg) {
    document.getElementById('result').innerHTML = `<span class="error">${msg}</span>`;
  }

  document.getElementById('calc-btn').addEventListener('click', calculate);
  document.getElementById('calc-form').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') calculate();
  });
})();
```

**Rules:**
- Wrap all calculator logic in an IIFE to avoid global scope pollution
- Always validate inputs before computing — show human-readable error messages
- Use `aria-live="polite"` on result containers for screen reader support
- Display results with locale formatting: `toLocaleString('en-US')` for numbers

---

## 10. AD INTEGRATION RULES

```html
<!-- In <head> — load AdSense async, never blocking -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
```

**Ad slot placement strategy (mirrors calculator.net):**
| Slot           | Position                       | Size                        |
|----------------|--------------------------------|-----------------------------|
| Leaderboard    | Below header, above content    | 728×90 (responsive)         |
| Rectangle 1    | Sidebar top                    | 300×250                     |
| Rectangle 2    | Sidebar middle (sticky)        | 300×250 or 300×600          |
| In-content     | Between calculator + text      | Responsive / auto           |
| Bottom banner  | Above footer                   | 728×90 or 320×50 on mobile  |

**Rules:**
- Never place ads inside the calculator widget itself
- Minimum 8px margin between ad slots and content
- Label all ad containers with `aria-label="Advertisement"` for accessibility
- On mobile, collapse leaderboard to 320×50 via responsive ad units

---

## 11. CLINE BEHAVIOUR RULES

These instructions control how Cline generates code for this project:

### What Cline MUST do:
- Generate **one `.html` file per calculator** — fully self-contained with its own `<head>`
- Include **all required meta tags** (§7.1) in every generated HTML file
- Include **JSON-LD structured data** on every calculator page
- Include the **AdSense async script** in every `<head>`
- Generate **ad slot divs** at the positions specified in §10
- Use **CSS custom properties** from §5.1 — never hardcode hex values
- Write **vanilla JS only** — no imports, no `npm install`, no `require()`
- Generate a **separate JS file** per calculator in `/js/`
- Add **input validation** and **error display** in every calculator
- Ensure every image has an `alt` attribute and `loading="lazy"`

### What Cline MUST NOT do:
- Install or suggest npm packages for the frontend
- Use React, Vue, Angular, Svelte, or any component framework
- Use Tailwind CSS, Bootstrap, or any CSS utility library
- Inline long `<style>` blocks — use `<link rel="stylesheet">` instead
- Generate placeholder copy like "Lorem ipsum" — write real, useful content
- Skip the SEO explanation section below the calculator
- Use `document.write()` or deprecated JS APIs
- Generate `alert()` for errors — use inline DOM messages only

### When generating a new calculator page:
1. Create `/[calc-name]-calculator.html`
2. Create `/js/[calc-name]-calculator.js`
3. Update `/index.html` to include a link to the new calculator in the correct category
4. Update `/sitemap.xml` with the new URL

---

## 12. ACCESSIBILITY RULES

- All form inputs must have associated `<label>` elements (not just placeholders)
- Interactive elements must be keyboard-accessible (Tab, Enter, Space)
- Colour contrast: minimum 4.5:1 for body text, 3:1 for large text
- Result containers must use `aria-live="polite"`
- Navigation must have `<nav>` landmark with `aria-label`
- Page must have exactly one `<h1>` per page
- Skip-to-content link at top of every page: `<a href="#main-content" class="skip-link">Skip to main content</a>`

---

## 13. RESPONSIVE BREAKPOINTS

```css
/* Mobile first */
/* Default styles: mobile 320px+ */

@media (min-width: 480px) {
  /* Large phones */
}

@media (min-width: 768px) {
  /* Tablet: switch to 2-column category grid */
  .category-grid { grid-template-columns: 1fr 1fr; }
}

@media (min-width: 1024px) {
  /* Desktop: main content + sidebar layout */
  .page-layout { display: grid; grid-template-columns: 1fr 300px; gap: 20px; }
  .ad-leaderboard { display: block; }  /* Show 728×90 leaderboard */
}
```

---

## 14. QUICK START CHECKLIST

When Cline sets up the project for the first time, generate in this order:

- [ ] `css/base.css` — CSS variables, reset, typography
- [ ] `css/layout.css` — header, footer, container, page grid
- [ ] `css/calculator.css` — shared calculator widget styles
- [ ] `css/ads.css` — ad slot dimensions and spacing
- [ ] `index.html` — homepage with category grid + header search
- [ ] `js/search.js` — client-side search/filter for homepage
- [ ] `sitemap.xml` — initial XML sitemap skeleton
- [ ] `robots.txt` — allow all, point to sitemap
- [ ] First calculator: `mortgage-calculator.html` + `js/mortgage-calculator.js`
- [ ] `financial-calculator.html` — category landing page listing all financial calcs

---

*Last updated: June 2026 | Based on visual + HTTP analysis of calculator.net*
