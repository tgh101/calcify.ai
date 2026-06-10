# .clinerules.d/secrets.md
# Extended rules: Secrets, Environment Variables & Security
# Loaded automatically by Cline alongside .clinerules

## SECRET SCANNING

Before completing any task, Cline must scan all modified files for:
- Strings matching: `sk-`, `pk-`, `ghp_`, `Bearer `, `password=`, `secret=`, `api_key=`
- Strings matching common patterns: 40-char hex, base64 strings > 30 chars in assignments
- Database connection strings with embedded credentials

If any are found → stop, do not proceed, flag immediately.

## .ENV.EXAMPLE TEMPLATE

Every project must have this file committed to git:

```bash
# =============================================================
# .env.example — Copy to .env and fill in values
# NEVER commit the actual .env file
# =============================================================

# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
APP_SECRET=CHANGEME_min32chars_random_string

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=CHANGEME_min64chars_random_string
JWT_EXPIRES_IN=7d
SESSION_SECRET=CHANGEME_min32chars_random_string

# External APIs (get from provider dashboard)
API_KEY=CHANGEME
API_SECRET=CHANGEME
WEBHOOK_SECRET=CHANGEME

# Email
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=CHANGEME
SMTP_PASS=CHANGEME
EMAIL_FROM=noreply@yourdomain.com

# Storage
S3_BUCKET=CHANGEME
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=CHANGEME
AWS_SECRET_ACCESS_KEY=CHANGEME

# Analytics & Ads
GA_MEASUREMENT_ID=G-XXXXXXXXXX
ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX

# Feature flags
FEATURE_NEW_DASHBOARD=false
```

## ENV VALIDATION AT STARTUP

Cline must generate an `src/config/env.js` (or equivalent) that validates
all required env vars at startup and fails loudly if any are missing:

```javascript
/**
 * @file env.js
 * @description Validates required environment variables at startup.
 * Application will not start if any required variable is missing.
 */

const required = [
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
  'APP_SECRET',
];

const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`[FATAL] Missing required environment variables:\n  ${missing.join('\n  ')}`);
  console.error('Copy .env.example to .env and fill in all values.');
  process.exit(1);
}

export const config = {
  env: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL,
  appSecret: process.env.APP_SECRET,
  db: { url: process.env.DATABASE_URL },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};

Object.freeze(config);
```

## SECURITY HEADERS

Every HTTP server Cline creates must include these headers:

```javascript
// Using helmet (Express) or equivalent
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://pagead2.googlesyndication.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
}));
```

## DEPENDENCY SECURITY POLICY

- Run `npm audit --audit-level=high` before marking any task complete
- If high/critical vulnerabilities exist: note them and create a GitHub issue
- Never install packages from unknown publishers with < 100k weekly downloads
  without explicit user approval
