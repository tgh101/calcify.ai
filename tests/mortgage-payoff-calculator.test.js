/**
 * @file mortgage-payoff-calculator.test.js
 * @description Unit tests for mortgage payoff calculator pure functions (no DOM)
 */

/* global describe, it, expect */
const {
  calculateMonthlyPayment,
  buildAmortizationSchedule,
  calculateRemainingBalance,
  calculateRemainingTerm,
  formatCurrency,
  buildDualAmortizationTableHTML,
} = require('../js/mortgage-payoff-calculator.js');

describe('calculateMonthlyPayment', () => {
  it('calculates standard 30-year fixed correctly', () => {
    const result = calculateMonthlyPayment(400000, 0.06, 30);
    expect(result).toBeCloseTo(2398.20, 1);
  });

  it('calculates 15-year fixed correctly', () => {
    const result = calculateMonthlyPayment(200000, 0.06, 15);
    expect(result).toBeCloseTo(1687.71, 1);
  });

  it('handles zero interest rate', () => {
    const result = calculateMonthlyPayment(120000, 0, 1);
    expect(result).toBeCloseTo(10000, 1);
  });

  it('throws when principal is zero', () => {
    expect(() => calculateMonthlyPayment(0, 0.06, 30))
      .toThrow('Principal must be a positive number');
  });

  it('throws when rate is negative', () => {
    expect(() => calculateMonthlyPayment(300000, -0.01, 30))
      .toThrow('Annual rate must be a non-negative number');
  });
});

describe('buildAmortizationSchedule', () => {
  it('returns correct payment count for standard loan', () => {
    const schedule = buildAmortizationSchedule(400000, 0.06, 30);
    expect(schedule.length).toBeGreaterThanOrEqual(360);
    expect(schedule.length).toBeLessThanOrEqual(362);
    expect(schedule[0].month).toBe(1);
    expect(schedule[schedule.length - 1].balance).toBeCloseTo(0, 0);
  });

  it('handles extra monthly payment', () => {
    const schedule = buildAmortizationSchedule(400000, 0.06, 30, { monthly: 500 });
    expect(schedule.length).toBeLessThan(360);
    expect(schedule[0].extraPaid).toBe(500);
  });

  it('throws on invalid principal', () => {
    expect(() => buildAmortizationSchedule(0, 0.06, 30)).toThrow();
  });
});

describe('calculateRemainingBalance', () => {
  it('returns full principal when no months paid', () => {
    const result = calculateRemainingBalance(400000, 0.06, 30, 0);
    expect(result).toBeCloseTo(400000, 0);
  });

  it('reduces balance after 60 payments on 30yr loan at 6%', () => {
    const result = calculateRemainingBalance(400000, 0.06, 30, 60);
    expect(result).toBeCloseTo(372217, -1);
  });
});

describe('calculateRemainingTerm', () => {
  it('returns correct term for standard inputs', () => {
    const result = calculateRemainingTerm(230000, 1500, 0.06);
    expect(result).toBeGreaterThanOrEqual(290);
    expect(result).toBeLessThanOrEqual(294);
  });

  it('returns 0 for zero balance', () => {
    expect(calculateRemainingTerm(0, 1500, 0.06)).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('formats positive numbers', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });

  it('formats negative numbers', () => {
    expect(formatCurrency(-500)).toBe('-$500.00');
  });

  it('handles invalid inputs', () => {
    expect(formatCurrency(NaN)).toBe('$0.00');
    expect(formatCurrency(Infinity)).toBe('$0.00');
  });
});

describe('buildDualAmortizationTableHTML', () => {
  it('returns valid HTML string with comparison table', () => {
    const orig = buildAmortizationSchedule(400000, 0.06, 30, null, 60);
    const payoff = buildAmortizationSchedule(400000, 0.06, 30, { monthly: 500 }, 60);
    const html = buildDualAmortizationTableHTML(orig, payoff, 60);
    expect(html).toContain('<table');
    expect(html).toContain('Original (without payoff)');
    expect(html).toContain('With payoff');
    expect(html).toContain('Extra Payment Starts');
  });
});
