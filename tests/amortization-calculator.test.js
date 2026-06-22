/**
 * @file amortization-calculator.test.js
 * @description Unit tests for amortization calculator pure functions (no DOM)
 */

/* global describe, it, expect */
const {
  calculateMonthlyPayment,
  buildAmortizationSchedule,
  formatCurrency,
  generatePieChartData,
} = require('../js/amortization-calculator.js');

describe('calculateMonthlyPayment', () => {
  it('calculates 15-year fixed at 6% correctly', () => {
    const result = calculateMonthlyPayment(200000, 0.06, 15);
    expect(result).toBeCloseTo(1687.71, 1);
  });

  it('handles zero interest rate', () => {
    const result = calculateMonthlyPayment(120000, 0, 1);
    expect(result).toBeCloseTo(10000, 1);
  });

  it('throws when principal is zero', () => {
    expect(() => calculateMonthlyPayment(0, 0.06, 15))
      .toThrow('Principal must be a positive number');
  });

  it('throws when rate is negative', () => {
    expect(() => calculateMonthlyPayment(200000, -0.01, 15))
      .toThrow('Annual rate must be a non-negative number');
  });
});

describe('buildAmortizationSchedule', () => {
  it('returns correct payment count for standard 15-year loan', () => {
    const schedule = buildAmortizationSchedule(200000, 0.06, 15);
    // 180 or 181 due to rounding in last payment
    expect(schedule.length).toBeGreaterThanOrEqual(180);
    expect(schedule.length).toBeLessThanOrEqual(182);
    expect(schedule[0].month).toBe(1);
    // last entry balance should be ~0
    expect(schedule[schedule.length - 1].balance).toBeCloseTo(0, 0);
  });

  it('first payment has correct interest', () => {
    const schedule = buildAmortizationSchedule(200000, 0.06, 15);
    const expectedInterest = Math.round(200000 * (0.06 / 12) * 100) / 100;
    expect(schedule[0].interest).toBeCloseTo(expectedInterest, 0);
  });

  it('handles extra monthly payment', () => {
    const schedule = buildAmortizationSchedule(200000, 0.06, 15, null, { monthly: 100 });
    expect(schedule.length).toBeLessThan(180);
    expect(schedule[0].extraPaid).toBe(100);
  });

  it('throws on invalid principal', () => {
    expect(() => buildAmortizationSchedule(0, 0.06, 15)).toThrow();
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

describe('generatePieChartData', () => {
  it('returns correct data structure with principal and interest', () => {
    const data = generatePieChartData(200000, 103788.46);
    expect(data.length).toBe(2);
    expect(data[0].label).toBe('Principal');
    expect(data[1].label).toBe('Interest');
    expect(data[0].percent + data[1].percent).toBeGreaterThanOrEqual(99);
  });

  it('returns empty array when total is 0', () => {
    const data = generatePieChartData(0, 0);
    expect(data).toEqual([]);
  });

  it('percentages sum to 100', () => {
    const data = generatePieChartData(200000, 103788.46);
    const sum = data.reduce((s, d) => s + d.percent, 0);
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(101);
  });
});
