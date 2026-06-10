# .clinerules.d/testing.md
# Extended rules: Testing Standards & Patterns
# Loaded automatically by Cline alongside .clinerules

## TESTING PHILOSOPHY

Every line of business logic Cline writes is accompanied by tests.
Tests are not optional. Tests are not written "later". Tests are written in the same commit.

The test suite is the living specification of the system.
If it's not tested, it doesn't work — by definition.

## VITEST CONFIG (default for JS/TS projects)

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',  // Use 'jsdom' for browser/UI code
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.*',
        '**/index.js',   // re-export barrels
        'tests/e2e/**',
      ],
    },
    include: ['src/**/*.test.{js,ts}', 'tests/**/*.test.{js,ts}'],
    setupFiles: ['./tests/setup.js'],
  },
});
```

## TEST SETUP FILE

```javascript
// tests/setup.js
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Reset all mocks between tests — prevents test pollution
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// Global test timeout
vi.setConfig({ testTimeout: 10000 });
```

## TESTING PATTERNS BY LAYER

### Pure Functions (calculators, utilities)
```javascript
// src/calculators/mortgage.test.js
import { describe, it, expect } from 'vitest';
import { calculateMonthlyPayment, buildAmortisationTable } from './mortgage.js';

describe('calculateMonthlyPayment', () => {
  describe('happy path', () => {
    it('calculates standard 30-year fixed correctly', () => {
      expect(calculateMonthlyPayment(300000, 0.065, 30)).toBeCloseTo(1896.20, 2);
    });

    it('handles low interest rate correctly', () => {
      expect(calculateMonthlyPayment(200000, 0.03, 15)).toBeCloseTo(1381.16, 2);
    });
  });

  describe('edge cases', () => {
    it('returns correct result for 1-year term', () => {
      const result = calculateMonthlyPayment(12000, 0.12, 1);
      expect(result).toBeCloseTo(1066.19, 2);
    });

    it('handles very large principal', () => {
      expect(() => calculateMonthlyPayment(10_000_000, 0.05, 30)).not.toThrow();
    });
  });

  describe('error cases', () => {
    it('throws when principal is zero', () => {
      expect(() => calculateMonthlyPayment(0, 0.065, 30))
        .toThrow('Principal must be a positive number');
    });

    it('throws when rate is negative', () => {
      expect(() => calculateMonthlyPayment(300000, -0.01, 30))
        .toThrow('Annual rate must be between 0 and 1');
    });

    it('throws when term is zero', () => {
      expect(() => calculateMonthlyPayment(300000, 0.065, 0))
        .toThrow('Term must be a positive integer');
    });

    it('throws on NaN inputs', () => {
      expect(() => calculateMonthlyPayment(NaN, 0.065, 30)).toThrow();
    });
  });
});
```

### API Endpoints (Supertest)
```javascript
// src/api/routes/calculate.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { db } from '../../db/index.js';

describe('POST /api/v1/calculate/mortgage', () => {
  it('returns 200 with correct result for valid input', async () => {
    const res = await request(app)
      .post('/api/v1/calculate/mortgage')
      .send({ principal: 300000, annualRate: 6.5, termYears: 30 })
      .expect(200);

    expect(res.body.monthlyPayment).toBeCloseTo(1896.20, 2);
    expect(res.body).toHaveProperty('amortisationTable');
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/calculate/mortgage')
      .send({ principal: 300000 })
      .expect(400);

    expect(res.body.error).toMatch(/annualRate.*required/i);
  });

  it('returns 400 for invalid types', async () => {
    await request(app)
      .post('/api/v1/calculate/mortgage')
      .send({ principal: 'not-a-number', annualRate: 6.5, termYears: 30 })
      .expect(400);
  });

  it('returns 429 when rate limit exceeded', async () => {
    const requests = Array(101).fill(null).map(() =>
      request(app)
        .post('/api/v1/calculate/mortgage')
        .send({ principal: 100000, annualRate: 5, termYears: 20 })
    );
    const responses = await Promise.all(requests);
    expect(responses.some(r => r.status === 429)).toBe(true);
  });
});
```

### Mocking External Services
```javascript
// ALWAYS mock at the module boundary, never deep inside
import { vi } from 'vitest';

// Mock an entire module
vi.mock('../services/email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'mock-id' }),
}));

// Verify interactions
import { sendEmail } from '../services/email.js';
expect(sendEmail).toHaveBeenCalledWith({
  to: 'user@example.com',
  subject: 'Your calculation results',
});
```

## E2E TESTING WITH PLAYWRIGHT

```javascript
// tests/e2e/mortgage-calculator.spec.js
import { test, expect } from '@playwright/test';

test.describe('Mortgage Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mortgage-calculator.html');
  });

  test('calculates monthly payment correctly', async ({ page }) => {
    await page.fill('#principal', '300000');
    await page.fill('#rate', '6.5');
    await page.fill('#term', '30');
    await page.click('#calc-btn');

    const result = page.locator('#result');
    await expect(result).toContainText('1,896.20');
  });

  test('shows error for empty fields', async ({ page }) => {
    await page.click('#calc-btn');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('is keyboard accessible', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.type('300000');
    await page.keyboard.press('Tab');
    await page.keyboard.type('6.5');
    await page.keyboard.press('Tab');
    await page.keyboard.type('30');
    await page.keyboard.press('Enter');

    await expect(page.locator('#result')).toContainText('1,896');
  });
});
```

## PLAYWRIGHT CONFIG

```javascript
// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile',   use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## NPM TEST SCRIPTS

```json
{
  "scripts": {
    "test":            "vitest run",
    "test:watch":      "vitest",
    "test:coverage":   "vitest run --coverage",
    "test:ui":         "vitest --ui",
    "test:e2e":        "playwright test",
    "test:e2e:ui":     "playwright test --ui",
    "test:all":        "npm run test:coverage && npm run test:e2e"
  }
}
```
