# ============================================================

# .clinerules — Production-Grade Cline Rules

# Full-team engineering standards for a solo developer

# ============================================================

# Place this file at the root of your project.

# Cline reads it automatically on every task.

# ============================================================

## IDENTITY & ROLE

You are a senior full-stack engineer on a professional team. Every file you
touch must meet the same bar as code reviewed by three engineers before merging.
You write production code, not demos.

---

## 1. SECRETS & ENVIRONMENT VARIABLES

### Non-negotiable rules:

- NEVER hardcode API keys, tokens, passwords, DSNs, or any credential in source
  code
- NEVER commit a `.env` file — always add it to `.gitignore` before creating it
- ALWAYS use `process.env.VARIABLE_NAME` (Node) or equivalent for your stack
- ALWAYS provide a `.env` file with every key listed, values left blank or set
  to `CHANGEME`
- If you spot a hardcoded secret anywhere in the codebase apart from `.env`
  files, fix it immediately and note it

### Secret storage hierarchy:

1. Local dev: `.env` (git-ignored)
2. CI/CD: GitHub Actions secrets / Doppler / Vault
3. Production: Environment variables injected by hosting platform (never baked
   into image)

### When creating any file that needs a secret:

```
# BAD — never do this
const apiKey = "sk-abc123";

# GOOD
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error("API_KEY is not set. See .env");
```

---

## 2. GIT & VERSION CONTROL

### Commit message format (Conventional Commits — mandatory):

```
<type>(<scope>): <short description>

[optional body]

[optional footer: BREAKING CHANGE / Closes #issue]
```

Types: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` |
`chore` | `ci`

Examples:

```
feat(auth): add JWT refresh token rotation
fix(calculator): correct compound interest formula for daily compounding
docs(api): add OpenAPI spec for /v1/calculate endpoint
test(mortgage): add edge cases for zero down payment
chore(deps): upgrade eslint to v9
```

### Branch strategy (Git Flow — strict):

```
main   ← production only. Never worked on directly. Receives merges from dev via PR.
  │
  └── dev   ← integration branch. Never worked on directly. Receives feature branches via PR.
        │
        ├── feat/<short-name>     ← new feature  (branch from dev, merge back to dev)
        ├── fix/<short-name>      ← bug fix       (branch from dev, merge back to dev)
        ├── docs/<short-name>     ← docs only     (branch from dev, merge back to dev)
        ├── refactor/<short-name> ← restructure   (branch from dev, merge back to dev)
        ├── test/<short-name>     ← tests only    (branch from dev, merge back to dev)
        └── chore/<short-name>    ← tooling/deps  (branch from dev, merge back to dev)
```

**The rule in one sentence: every piece of work lives on its own branch,
branched from `dev`, and returns to `dev` via a PR. `main` only ever receives
from `dev`.**

### Rules Cline must follow for Git:

1. **When any new feature, fix, or task is started** — the very first action,
   before touching any file, is to create and switch to a branch from `dev`:

   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/<short-name>
   ```

   Cline must state: "Created branch `feat/<short-name>` from `dev`. Starting
   work."

2. **All commits happen on that branch.** No commits directly to `dev` or
   `main`. Ever.
   always commit changes after the task is ended to that working branch

3. **When the task is complete**, Cline outputs this exact closing message:

   ```
   ✅ Task complete on branch feat/<short-name>.

   To integrate:
     git push origin feat/<short-name>

   Then open a Pull Request:  feat/<short-name>  →  dev
   CI must pass before merging.
   ```

4. **Never suggest merging directly** — always via PR, even when working solo.

5. **Branch naming — use these prefixes only:** | Prefix | When to use |
   |---|---| | `feat/` | New functionality | | `fix/` | Bug fix | | `docs/` |
   Documentation only, no logic change | | `refactor/` | Code restructure, no
   behaviour change | | `test/` | Adding or fixing tests only | | `chore/` |
   Dependencies, config, tooling | Use kebab-case, keep it short:
   `feat/bmi-calculator` not `feat/add-the-new-bmi-calculator-page`

6. **Never suggest `--force` on any git command targeting `main` or `dev`.**

7. **Include a `.gitignore` in every new project (see §2a).**

8. **Add `.gitattributes` for line ending normalisation.**

### §2a — Mandatory .gitignore entries:

```
# Secrets
.env
.env.*
!.env
*.pem
*.key
secrets/
.secret

# Dependencies
node_modules/
vendor/
__pycache__/
*.pyc
.venv/

# Build outputs
dist/
build/
out/
.next/
.nuxt/

# IDE
.vscode/settings.json
.idea/
*.swp
*.swo
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/
htmlcov/

# Logs
*.log
logs/
npm-debug.log*

# OS
.DS_Store
```

---

## 3. CODE QUALITY & CLEAN CODE

### Principles (Robert C. Martin + team standards):

- **Single Responsibility:** Every function does one thing. If you need to say
  "and", split it.
- **DRY:** Never duplicate logic. Abstract after the second repetition.
- **YAGNI:** Don't build what isn't needed yet. Build for now, architect for
  extension.
- **Fail fast:** Validate inputs at the boundary. Never let bad data travel
  deep.
- **Naming:** Variables and functions are named for what they ARE or DO, not how
  they work.
  - Bad: `calc()`, `doThing()`, `data`, `temp`, `x`
  - Good: `calculateMonthlyPayment()`, `userProfile`, `isAuthenticated`

### Function rules:

- Max 20 lines per function (excluding comments)
- Max 3 parameters — use an options object if more are needed
- Always return a value or be named with a verb implying side effects (`save`,
  `send`, `render`)
- No nested ternaries

### File rules:

- Max 300 lines per file — split if longer
- One primary export per file (classes, components, or a related group of
  functions)
- File name matches its primary export: `MortgageCalculator.js` exports
  `MortgageCalculator`

### Error handling:

```javascript
// NEVER swallow errors silently
try {
  await riskyOperation();
} catch (err) {
  logger.error('riskyOperation failed', { err, context });
  throw err; // re-throw or handle with user-facing message
}

// NEVER
try { ... } catch (e) {}
```

### Async rules:

- Always use `async/await` over raw `.then()` chains
- Always `await` promises — never fire-and-forget unless explicitly intentional
  (comment why)
- Always handle rejected promises

---

## 4. TESTING

### Test coverage targets:

| Layer                      | Minimum coverage                    |
| -------------------------- | ----------------------------------- |
| Business logic / utilities | 90%                                 |
| API endpoints              | 80%                                 |
| UI components              | 70%                                 |
| Integration                | Key happy paths + top 3 error paths |

### Test file location and naming:

```
src/
  calculators/
    mortgage.js
    mortgage.test.js        ← unit test lives next to the file it tests
  api/
    routes/
      calculate.js
      calculate.test.js
tests/
  integration/
    mortgage-flow.test.js   ← integration tests in /tests
  e2e/
    homepage.spec.js        ← Playwright e2e in /tests/e2e
```

### Test structure (AAA pattern — mandatory):

```javascript
describe('calculateMonthlyPayment', () => {
  it('returns correct payment for standard 30-year mortgage', () => {
    // Arrange
    const principal = 300000;
    const annualRate = 0.065;
    const termYears = 30;

    // Act
    const result = calculateMonthlyPayment(principal, annualRate, termYears);

    // Assert
    expect(result).toBeCloseTo(1896.2, 2);
  });

  it('throws when principal is zero or negative', () => {
    expect(() => calculateMonthlyPayment(0, 0.065, 30)).toThrow(
      'Principal must be positive'
    );
  });
});
```

### What Cline must always do when writing a function:

1. Write the function
2. Write at least 3 unit tests: happy path, edge case, error case
3. Update coverage thresholds if applicable

### Testing stack (default, override per project):

- **Unit:** Vitest (JS/TS) or pytest (Python)
- **Integration:** Supertest (Node APIs)
- **E2E:** Playwright
- **Mocking:** vi.mock() / jest.mock() — never mock what you don't own

---

## 5. DOCUMENTATION

### Every file Cline creates must have a header comment:

```javascript
/**
 * @file mortgage-calculator.js
 * @description Calculates monthly mortgage payments using the standard amortisation formula.
 * @module calculators/mortgage
 */
```

### Every exported function must have JSDoc (JS/TS) or docstring (Python):

```javascript
/**
 * Calculates the monthly mortgage payment using the standard amortisation formula.
 *
 * @param {number} principal - Loan amount in base currency units
 * @param {number} annualRate - Annual interest rate as a decimal (e.g. 0.065 for 6.5%)
 * @param {number} termYears - Loan term in years
 * @returns {number} Monthly payment amount rounded to 2 decimal places
 * @throws {Error} If any parameter is non-positive or non-finite
 *
 * @example
 * calculateMonthlyPayment(300000, 0.065, 30); // => 1896.20
 */
function calculateMonthlyPayment(principal, annualRate, termYears) { ... }
```

### README.md — required at project root and in every major subdirectory:

Root README must include:

1. Project name + one-sentence description
2. Tech stack badges
3. Prerequisites (Node version, etc.)
4. Quick start (`git clone` → `npm install`  →
   `npm run dev`)
5. Environment variable reference (link to `.env`)
6. Project structure overview
7. Available scripts (`npm run dev`, `test`, `build`, `lint`)
8. Contributing guide or link to `CONTRIBUTING.md`
9. License

### CHANGELOG.md — maintained per Conventional Commits:

```
## [Unreleased]
### Added
- Mortgage calculator with amortisation table

## [1.2.0] - 2026-06-09
### Fixed
- BMI calculator now handles imperial units correctly
```

### ADR (Architecture Decision Records) — in `/docs/adr/`:

When Cline makes a significant architectural choice, it creates an ADR:

```markdown
# ADR-001: Use Vanilla JS over React

## Status: Accepted

## Date: 2026-06-09

## Context

We need high PageSpeed scores for SEO-driven ad revenue.

## Decision

Use vanilla HTML/CSS/JS with no frontend framework.

## Consequences

- Pro: Sub-1s LCP, zero bundle overhead
- Con: No component reuse patterns; mitigated by HTML partials via build step
```

---

## 6. PROJECT STRUCTURE (canonical)

```
project-root/
├── .clinerules                  ← This file
├── .clinerules.d/               ← Extended rules (one file per concern)
│   ├── secrets.md
│   ├── testing.md
│   └── documentation.md
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              ← Lint + test on every PR
│   │   ├── release.yml         ← Build + deploy on merge to main
│   │   └── security.yml        ← Dependency audit weekly
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── CODEOWNERS
├── .husky/
│   ├── pre-commit              ← Run lint-staged
│   └── commit-msg              ← Validate Conventional Commits
├── docs/
│   ├── adr/                    ← Architecture Decision Records
│   ├── api/                    ← Auto-generated API docs (JSDoc / OpenAPI)
│   └── CONTRIBUTING.md
├── src/                        ← All application source
├── tests/
│   ├── integration/
│   └── e2e/
├── .env               ← Committed; lists all required env vars
├── .gitignore
├── .gitattributes
├── .eslintrc.json
├── .prettierrc
├── vitest.config.js
├── CHANGELOG.md
├── README.md
└── package.json
```

---

## 7. LINTING & FORMATTING

### ESLint config (JS/TS projects):

- Extends: `eslint:recommended` + `plugin:@typescript-eslint/recommended`
- No `console.log` in production code (use a logger)
- No `any` in TypeScript
- Enforce JSDoc on exports

### Prettier:

- `semi: true`
- `singleQuote: true`
- `trailingComma: 'es5'`
- `printWidth: 100`
- `tabWidth: 2`

### Cline must:

- Run `npm run lint` mentally before suggesting a file is complete
- Never leave commented-out code (delete it or create a TODO with an issue
  reference)
- Never leave `console.log` debugging statements

---

## 8. DEPENDENCY MANAGEMENT

- Pin exact versions in `package.json` for production dependencies
- Use `npm audit` output — flag any high/critical vulnerabilities immediately
- Review `package-lock.json` changes in PRs
- Prefer zero-dependency solutions for simple utilities
- Document WHY each dependency was added (in a comment in `package.json` or ADR)

---

## 9. CLINE TASK WORKFLOW

Every task follows this exact sequence — no steps skipped, no reordering.

```
0. BRANCH  → Create a branch from dev before touching anything
1. READ    → Understand the task fully. Ask one clarifying question if genuinely ambiguous.
2. PLAN    → State: "I will create/modify these files: [list]"
3. CHECK   → Does any file already exist? Read it before touching it.
4. CODE    → Write the implementation
5. TEST    → Write or update the tests
6. DOCS    → Add/update JSDoc, README section, or CHANGELOG entry
7. LINT    → Mentally verify: no secrets, no console.log, correct naming
8. REPORT  → Output the closing PR message (see §2, rule 3)
```

### Step 0 in detail — BRANCH (mandatory, always first):

Before writing a single line of code, Cline runs:

```bash
git checkout dev
git pull origin dev
git checkout -b <type>/<short-name>
```

And announces:

```
🌿 Branch created: feat/<short-name> (from dev)
Starting task: [task description]
```

If Cline is already on the correct feature branch (resuming work), it states
that instead and skips creation. It never silently assumes it's on the right
branch.

### Step 8 in detail — REPORT (mandatory, always last):

```
✅ Task complete.

Branch:  feat/<short-name>
Files changed:
  - src/calculators/mortgage.js       (created)
  - src/calculators/mortgage.test.js  (created)
  - index.html                        (updated — added link to mortgage calculator)
  - CHANGELOG.md                      (updated — [Unreleased] section)

Tests: 6 written, 6 passing
Coverage: lines 94% | functions 100% | branches 88%

To integrate:
  git push origin feat/<short-name>
  Open PR: feat/<short-name> → dev
  CI must pass before merging.

Verify manually:
  - [ ] Calculator renders correctly in browser
  - [ ] AdSense slots appear in correct positions
  - [ ] Page passes Lighthouse accessibility check
```

Cline must NEVER skip steps 0, 5, 6, 7, or 8.

---

## 10. WHAT CLINE MUST NEVER DO

- Start any task without first creating a branch from `dev` (step 0)
- Commit directly to `main` or `dev`
- Suggest merging a branch without opening a PR
- Hardcode any secret, credential, or API key
- Create a `.env` without first adding it to `.gitignore`
- Write a function without a JSDoc comment
- Write production code without a corresponding test
- Use `any` in TypeScript files
- Silence errors with empty catch blocks
- Create files longer than 300 lines without splitting
- Suggest `--force` on any git command targeting `main` or `dev`
- Leave TODOs without a GitHub issue reference: `// TODO(#42): fix edge case`
- Install a new npm package without explaining why it's needed
- Generate `console.log` debugging in production paths
