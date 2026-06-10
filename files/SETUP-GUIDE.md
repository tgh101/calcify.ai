# Production Engineering Environment
## Full-team standards for a solo developer using Cline

---

## What this is

A complete, production-grade development environment configuration for a Cline-powered
project. Drop these files into any project and you get the same engineering rigour as a
team of five seniors — automated, enforced, and documented.

---

## Files in this package

```
.clinerules                          ← Master Cline instruction file (start here)
.clinerules.d/
  secrets.md                         ← Detailed secrets & env var rules
  testing.md                         ← Testing standards, patterns, configs
  documentation.md                   ← JSDoc, README, CHANGELOG, ADR templates
.cline/
  mcp.json                           ← MCP tool servers for Cline
.github/
  workflows/
    ci.yml                           ← Lint + test + coverage on every PR
    release.yml                      ← Auto-versioning + deploy on merge to main
    security.yml                     ← Weekly secret scan + CodeQL analysis
  PULL_REQUEST_TEMPLATE.md           ← Structured PR checklist
  CODEOWNERS                         ← Auto-assign reviewers to sensitive paths
.vscode/
  extensions.json                    ← Recommended VS Code extensions
  settings.json                      ← Auto-format, ESLint, Todo highlight
.eslintrc.json                       ← ESLint with JSDoc enforcement
.prettierrc                          ← Prettier (100 char width, single quotes)
.gitleaks.toml                       ← Secret scanning rules
commitlint.config.js                 ← Enforce Conventional Commits
package.json                         ← All scripts + dev dependencies
docs/
  adr/
    ADR-001-vanilla-js.md            ← Example Architecture Decision Record
```

---

## Quick install (new project)

```bash
# 1. Copy all files to your project root
cp -r cline-pro-env/. your-project/

# 2. Install dev tooling
npm install

# 3. Set up git hooks (runs lint + commit message validation)
npm run prepare

# 4. Set up your environment
cp .env.example .env
# Edit .env with your real values

# 5. Verify everything works
npm run validate
# Runs: lint → test:coverage → build
```

---

## Tool-by-tool breakdown

### Cline Rules (`.clinerules` + `.clinerules.d/`)

| File | What it enforces |
|---|---|
| `.clinerules` | Master rules: secrets, git, clean code, testing, docs, workflow |
| `secrets.md` | `.env.example` template, startup validation, security headers |
| `testing.md` | Vitest config, Playwright config, test patterns per layer |
| `documentation.md` | JSDoc templates, README/CHANGELOG/ADR formats |

### MCP Servers (`.cline/mcp.json`)

| Server | Purpose |
|---|---|
| `filesystem` | Read/write project files within working directory |
| `github` | Create PRs, branches, issues without leaving Cline |
| `git` | Status, diff, commit, log operations |
| `memory` | Persist project decisions across Cline sessions |
| `sequential-thinking` | Force multi-step reasoning on complex tasks |
| `postgres` | Inspect DB schema (read-only in production) |
| `brave-search` | Look up docs and error messages |
| `puppeteer` | Visual validation of rendered output |

**Setup:**
```bash
# Set required env vars for MCP servers
export GITHUB_TOKEN=ghp_your_token_here
export BRAVE_API_KEY=your_brave_key_here
export DATABASE_URL=postgresql://...
```

### GitHub Actions

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Every push & PR | Lint → Unit tests (Node 18/20/22) → E2E → Security audit → Build |
| `release.yml` | Merge to `main` | Auto-bump version → Generate CHANGELOG → Deploy → Smoke test |
| `security.yml` | Weekly (Monday) | npm audit → Gitleaks full history → CodeQL SAST |

### VS Code Extensions (`.vscode/extensions.json`)

Install all at once:
```bash
cat .vscode/extensions.json | jq -r '.recommendations[]' | xargs -I {} code --install-extension {}
```

Key extensions:
- **saoudrizwan.claude-dev** — Cline itself
- **eamodio.gitlens** — Git history and blame on every line
- **vitest.explorer** — Run tests from the sidebar
- **snyk-security.snyk-vulnerability-scanner** — Inline CVE warnings
- **usernamehw.errorlens** — Errors shown inline on the problematic line
- **gruntfuggly.todo-tree** — All TODOs/FIXMEs in a sidebar panel

---

## Branch & release flow

```
feat/my-feature
    │
    ├─ Push → CI runs (lint + test + build)
    │
    └─ PR → Must pass CI + PR template checklist
                │
                └─ Merge to dev → integration
                        │
                        └─ Merge to main → release-please bumps version
                                                → CHANGELOG generated
                                                → GitHub Release created
                                                → Deploy to production
                                                → CDN purged
                                                → Smoke test
```

---

## Commit message quick reference

```bash
# Use the interactive CLI (recommended)
npm run commit

# Or write manually — must follow this format:
git commit -m "feat(mortgage): add biweekly payment schedule"
git commit -m "fix(bmi): correct imperial unit conversion for pounds"
git commit -m "docs(readme): add environment variable reference"
git commit -m "test(compound): add edge cases for daily compounding"
git commit -m "chore(deps): upgrade vitest to v2"
```

If your commit message doesn't match the format, `commitlint` will reject it at the
`commit-msg` git hook stage. Fix the message and try again.

---

## Secret management rules (quick reference)

| Where | What to do |
|---|---|
| Code | `process.env.MY_KEY` — never a literal string |
| Local dev | `.env` file (git-ignored) |
| CI | GitHub Actions Secrets (Settings → Secrets) |
| Production | Platform env vars (Cloudflare, Vercel, etc.) |
| Documentation | `.env.example` with `CHANGEME` values — committed |

**If you accidentally commit a secret:**
1. Rotate the secret immediately at the provider
2. Run `git filter-repo` or BFG to scrub the history
3. Force-push all branches (coordinate with team)
4. Add a gitleaks rule to catch it in future

---

## Coverage requirements

| Code type | Minimum |
|---|---|
| Business logic (calculators, utilities) | 90% |
| API routes | 80% |
| UI components | 70% |

CI will fail if coverage drops below the configured threshold.

---

## Adding a new calculator (Cline task)

Ask Cline:
> "Create a compound interest calculator. Follow all .clinerules — generate the HTML page,
> JavaScript module, unit tests, and update the sitemap and homepage."

Cline will:
1. Create `compound-interest-calculator.html` with full SEO meta + JSON-LD
2. Create `js/compound-interest-calculator.js` with IIFE module + JSDoc
3. Create `js/compound-interest-calculator.test.js` with 6+ tests
4. Update `index.html` category grid
5. Update `sitemap.xml`
6. Update `CHANGELOG.md` under `[Unreleased]`

---

*Generated June 2026 | Maintained by Cline + developer*
