# .clinerules.d/documentation.md
# Extended rules: Documentation Standards
# Loaded automatically by Cline alongside .clinerules

## DOCUMENTATION IS PART OF THE CODE

Documentation that doesn't exist is a bug.
Documentation that is out of date is a bug.
Cline generates and maintains documentation in the same commit as the code it describes.

---

## JSDoc STANDARDS

### Required on every exported function:
```javascript
/**
 * @file [filename]
 * @description [What this module does in one sentence]
 * @module [path/to/module]
 */

/**
 * [Verb phrase describing what the function does — not how]
 *
 * @param {Type} paramName - Description of parameter
 * @param {Object} options - Configuration options
 * @param {boolean} [options.verbose=false] - Enable verbose output
 * @returns {Type} Description of return value
 * @throws {TypeError} When [condition]
 * @throws {RangeError} When [condition]
 *
 * @example <caption>Basic usage</caption>
 * functionName(arg1, arg2); // => expected output
 *
 * @example <caption>With options</caption>
 * functionName(arg1, arg2, { verbose: true }); // => expected output
 *
 * @since 1.0.0
 */
```

### Required on every class:
```javascript
/**
 * Manages mortgage calculation state and amortisation scheduling.
 *
 * @class
 * @example
 * const calc = new MortgageCalculator({ principal: 300000, rate: 0.065, years: 30 });
 * calc.compute();
 * console.log(calc.monthlyPayment); // 1896.20
 */
class MortgageCalculator {
  /**
   * Creates a MortgageCalculator instance.
   *
   * @param {Object} options
   * @param {number} options.principal - Loan amount
   * @param {number} options.rate - Annual interest rate as decimal
   * @param {number} options.years - Loan term in years
   * @throws {Error} If required options are missing
   */
  constructor(options) { ... }
}
```

---

## README.md TEMPLATE (root)

```markdown
# [Project Name]

> [One-sentence description of what this project does]

[![CI](https://github.com/[org]/[repo]/actions/workflows/ci.yml/badge.svg)](...)
[![Coverage](https://codecov.io/gh/[org]/[repo]/badge.svg)](...)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What it does
[2–3 sentences. Who uses it, what problem it solves, what makes it distinctive]

## Tech stack
| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML/CSS/JS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Testing | Vitest + Playwright |
| CI/CD | GitHub Actions |

## Prerequisites
- Node.js >= 20.x
- PostgreSQL >= 15
- npm >= 10

## Quick start

\`\`\`bash
git clone https://github.com/[org]/[repo].git
cd [repo]
cp .env.example .env     # Fill in your values
npm install
npm run db:migrate       # Set up database schema
npm run dev              # Start dev server at http://localhost:3000
\`\`\`

## Environment variables
See [`.env.example`](.env.example) for all required variables and their descriptions.

## Project structure
\`\`\`
src/
  calculators/  → Business logic (pure functions)
  api/          → Express routes and middleware
  config/       → Environment and app configuration
  db/           → Database models and migrations
tests/
  integration/  → API integration tests (Supertest)
  e2e/          → Browser tests (Playwright)
docs/
  adr/          → Architecture Decision Records
  api/          → Auto-generated API documentation
\`\`\`

## Available scripts
| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run docs` | Generate API documentation |

## Contributing
See [CONTRIBUTING.md](docs/CONTRIBUTING.md).

## License
[MIT](LICENSE) © [Year] [Your Name]
```

---

## CONTRIBUTING.md TEMPLATE

```markdown
# Contributing Guide

## Getting started
1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Follow the commit message format: `type(scope): description`
4. Ensure all tests pass: `npm run test:all`
5. Open a Pull Request against `dev`

## Commit message format
We use [Conventional Commits](https://www.conventionalcommits.org/).

\`\`\`
feat(scope): add new calculator
fix(scope): correct formula edge case
docs(scope): update API reference
test(scope): add missing coverage
\`\`\`

## Code standards
- Run `npm run lint` before pushing
- Every new function needs JSDoc
- Every new feature needs unit tests (min. 3 cases)
- Coverage must not decrease

## Pull Request checklist
- [ ] Tests pass locally (`npm run test`)
- [ ] No new lint errors
- [ ] Coverage maintained or improved
- [ ] JSDoc on all new public functions
- [ ] CHANGELOG.md updated
- [ ] .env.example updated if new env vars added
```

---

## CHANGELOG.md FORMAT

```markdown
# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- [Description of new feature]

### Changed
- [Description of change]

### Fixed
- [Description of bug fix]

### Security
- [Description of security fix]

## [1.0.0] - YYYY-MM-DD
### Added
- Initial release with mortgage, BMI, and compound interest calculators
```

---

## ADR TEMPLATE

```markdown
# ADR-[NNN]: [Short Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Date
YYYY-MM-DD

## Context
[Describe the problem or situation that motivated this decision.
What forces are at play? What constraints exist?]

## Decision
[State the decision clearly. What was chosen and why?]

## Consequences
### Positive
- [Benefit 1]
- [Benefit 2]

### Negative / Trade-offs
- [Cost or downside 1]
- [Cost or downside 2]

### Neutral
- [Things that will change but are neither good nor bad]

## Alternatives considered
- **[Alternative A]:** [Why rejected]
- **[Alternative B]:** [Why rejected]
```

---

## JSDOC GENERATION CONFIG

```json
// jsdoc.config.json
{
  "source": {
    "include": ["src"],
    "includePattern": ".+\\.js$",
    "excludePattern": "(node_modules|docs|tests)"
  },
  "opts": {
    "destination": "docs/api",
    "recurse": true,
    "readme": "README.md"
  },
  "plugins": ["plugins/markdown"],
  "templates": {
    "cleverLinks": false,
    "monospaceLinks": false
  }
}
```

Add to `package.json`:
```json
{
  "scripts": {
    "docs": "jsdoc -c jsdoc.config.json",
    "docs:watch": "nodemon --watch src --exec 'npm run docs'"
  }
}
```

---

## INLINE COMMENT STANDARDS

```javascript
// Use inline comments only to explain WHY, never WHAT

// BAD: explains what (obvious from the code)
// Multiply monthly rate by months
const totalInterest = monthlyRate * months;

// GOOD: explains why (not obvious)
// We divide by 12 here rather than converting annualRate outside this function
// to avoid floating-point drift when this function is called in a loop
const monthlyRate = annualRate / 12;

// Use TODO only with an issue reference
// TODO(#142): handle biweekly payment schedules

// Use FIXME for known bugs that haven't been fixed yet
// FIXME(#201): leap year affects daily compounding by 1 day — low priority

// Use NOTE for important context that reviewers must not remove
// NOTE: This formula matches HUD's published spec for FHA loans — do not simplify
```
