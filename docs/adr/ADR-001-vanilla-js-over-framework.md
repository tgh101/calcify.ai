# ADR-001: Vanilla JavaScript over Frontend Framework

## Status
Accepted

## Date
2026-06-09

## Context
We are building a high-traffic, ad-monetised calculator website where SEO performance
and Core Web Vitals scores directly impact both organic traffic and ad RPM.
The site consists of ~200 self-contained calculator pages, each requiring minimal
client-side interactivity (form inputs → computed output).

The team considered React, Vue, and Svelte as alternatives to vanilla JS.

## Decision
Use vanilla HTML5, CSS (custom properties, no framework), and ES6+ JavaScript
with no frontend runtime framework. No build step required for production HTML pages.

## Consequences

### Positive
- Sub-100ms JavaScript parse time per page; no runtime bundle overhead
- PageSpeed Insights scores consistently 90+ (critical for SEO rank and ad RPM)
- Zero dependency surface for frontend attack vectors
- Any developer can read and maintain the code without framework knowledge
- No upgrade treadmill (React 18→19, etc.)

### Negative / Trade-offs
- No component reuse patterns — mitigated by a shared CSS file and HTML partials via a simple build script
- Manual DOM manipulation is more verbose than JSX — acceptable for 20-line calculator widgets

### Neutral
- Requires discipline to avoid spaghetti JS — addressed by the IIFE module pattern in `.clinerules`

## Alternatives considered
- **React:** Bundle overhead (42+ KB gzipped), hydration delay, complex build pipeline. Rejected.
- **Vue:** Lighter than React but still ~30 KB runtime. Rejected for same reasons.
- **Svelte:** Compiles to vanilla JS, but introduces a build step and compiler dependency. Could be reconsidered if interactivity requirements grow significantly.
