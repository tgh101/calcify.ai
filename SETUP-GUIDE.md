# Production Engineering Environment
## Full-team standards for a solo developer using Cline

---

## Account & repo requirements

| Requirement | Status |
|---|---|
| GitHub account | Free ✅ |
| Repo visibility | **Public** — unlocks unlimited Actions minutes, CodeQL, branch protection |
| Cloudflare Pages | Free tier — unlimited requests, 500 builds/month |
| Codecov | Free for public repos |

> Everything in this environment works on a free GitHub account with a public repo.
> No paid plan is needed anywhere.

---

## What's in this package

```
.clinerules                          ← Master Cline instruction file
.clinerules.d/
  secrets.md                         ← Secrets & env var rules + templates
  testing.md                         ← Vitest + Playwright config & patterns
  documentation.md                   ← JSDoc, README, CHANGELOG, ADR templates
.cline/
  mcp.json                           ← 9 MCP tool servers for Cline
.github/
  workflows/
    ci.yml                           ← Lint → Test (Node 18/20/22) → E2E → Audit → Build
    release.yml                      ← Auto-version → Deploy → Smoke test
    security.yml                     ← Weekly: npm audit + Gitleaks + CodeQL
  PULL_REQUEST_TEMPLATE.md
  CODEOWNERS
.vscode/
  extensions.json                    ← 20 recommended extensions
  settings.json                      ← Format-on-save, ESLint, inline errors
.eslintrc.json
.prettierrc
.gitleaks.toml
commitlint.config.js
package.json
docs/
  adr/ADR-001-vanilla-js.md
```

---

## Quick install

```bash
# 1. Copy files to your project root
cp -r cline-pro-env/. your-project/

# 2. Install dev tooling and activate git hooks
npm install
npm run prepare

# 3. Set up secrets
cp .env.example .env
# Edit .env with real values — already in .gitignore

# 4. Verify everything works
npm run validate
```

---

## GitHub setup (one-time, ~10 minutes)

### 1. Create the repo as Public

On github.com → New repository → **Public**.

### 2. Push your initial commit

```bash
git init
git checkout -b main
git add .
git commit -m "chore: initialise project with production engineering environment"
git remote add origin https://github.com/your-username/your-project.git
git push -u origin main
git checkout -b dev
git push -u origin dev
```

### 3. Enable branch protection on `main` and `dev`

Settings → Branches → Add branch protection rule.

**For `main`:**
- ✅ Require a pull request before merging
- ✅ Required approving reviews: 1 (yourself — forces conscious decision to ship)
- ✅ Require status checks: `Lint & Format`, `Unit Tests (Node 20)`, `Build`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings
- ✅ Restrict who can push: only you

**For `dev`:**
- ✅ Require a pull request before merging
- ✅ Require status checks: `Lint & Format`, `Unit Tests (Node 20)`
- ✅ Do not allow bypassing the above settings
- ❌ No required reviewer — you can self-merge feature PRs into dev

This means:
- Feature branches → `dev` via PR (CI must pass, no reviewer required)
- `dev` → `main` via PR (CI must pass + you explicitly approve)

### 4. Set up the `production` environment

Settings → Environments → New environment → name it `production`.

Add a protection rule: **Required reviewers** → add yourself.
This gives you a manual approval gate before every deploy — free on public repos.

### 5. Add repository secrets

Settings → Secrets and variables → Actions → New repository secret:

| Secret | Where to get it |
|---|---|
| `CF_API_TOKEN` | Cloudflare → My Profile → API Tokens |
| `CF_ACCOUNT_ID` | Cloudflare → right sidebar on any page |
| `CF_ZONE_ID` | Cloudflare → your domain → Overview → right sidebar |
| `CODECOV_TOKEN` | codecov.io → your repo → Settings |

### 6. Add repository variables

Settings → Secrets and variables → Actions → Variables tab:

| Variable | Example value |
|---|---|
| `CF_PROJECT_NAME` | `my-calculator-site` |
| `PROD_URL` | `https://my-calculator-site.pages.dev` |

### 7. Install MCP servers

In VS Code: Cline sidebar → MCP Servers → point to `.cline/mcp.json`

Set these in your shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
export BRAVE_API_KEY=BSAxxxxxxxxxx
export DATABASE_URL=postgresql://...
```

---

## CI pipeline overview

Every push and PR runs this pipeline automatically:

```
Push / PR
    │
    ├─ Lint & Format (~2 min)
    │   ├─ ESLint
    │   ├─ Prettier check
    │   └─ Gitleaks secret scan
    │
    ├─ Unit Tests × 3 Node versions (~6 min, parallel)
    │   ├─ Node 18
    │   ├─ Node 20 + Codecov upload
    │   └─ Node 22
    │
    ├─ E2E Tests — Chromium + Firefox (~7 min)
    │
    ├─ npm Security Audit (~1 min)
    │
    └─ Build verification (~2 min)

Total: ~18 min | Cost: $0 (public repo = unlimited minutes)
```

---

## Git Flow — the complete picture

```
dev (integration)
 │
 ├── feat/mortgage-calculator
 │       │
 │       │  work, commits, tests
 │       │
 │       └──► PR: feat/mortgage-calculator → dev
 │                   CI passes → merge → delete branch
 │
 ├── feat/bmi-calculator
 │       │
 │       └──► PR: feat/bmi-calculator → dev
 │                   CI passes → merge → delete branch
 │
 └──► PR: dev → main  (when ready to release)
             CI passes → you approve deploy in GitHub Environments UI
             → release-please bumps version + generates CHANGELOG
             → Cloudflare Pages deploy
             → CDN cache purge
             → Smoke test ✅
```

**The pattern for every piece of work:**
1. `git checkout dev && git pull origin dev`
2. `git checkout -b feat/<name>`
3. Do the work
4. `git push origin feat/<name>`
5. Open PR → `dev`
6. CI passes → merge → delete branch

**Promoting to production:**
1. Open PR → `main` from `dev`
2. CI passes → merge
3. Approve deploy in GitHub Environments UI
4. Done

---

## Weekly security scan (automatic)

Every Monday at 07:00 UTC, GitHub runs:
- Full npm audit (report saved as artifact)
- Gitleaks scan of entire git history
- CodeQL static analysis (results appear in Security tab)

You get an email if anything fails. Check Security → Code scanning alerts weekly.

---

## Commit message quick reference

```bash
npm run commit   # interactive CLI — easiest option

# Or manual:
git commit -m "feat(mortgage): add biweekly payment schedule"
git commit -m "fix(bmi): correct imperial unit conversion"
git commit -m "docs(readme): update environment variable reference"
git commit -m "test(compound): add edge cases for daily compounding"
git commit -m "chore(deps): upgrade vitest to v2"
```

commitlint rejects the commit at the hook stage if the format is wrong.

---

## MCP servers reference

| Server | What Cline uses it for |
|---|---|
| `filesystem` | Read/write project files |
| `github` | Create PRs, issues, branches |
| `git` | Status, diff, log, commit |
| `memory` | Remember project decisions across sessions |
| `sequential-thinking` | Multi-step reasoning on complex tasks |
| `postgres` | Inspect DB schema |
| `brave-search` | Look up docs, error messages |
| `eslint` | Surface lint issues inline |
| `puppeteer` | Visual validation of rendered output |

---

*Last updated: June 2026*
