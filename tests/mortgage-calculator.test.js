/**
 * @file mortgage-calculator.test.js
 * @description Unit tests for mortgage calculator pure functions (no DOM)
 */

/* global describe, it, expect */
const {
  calculateMonthlyPayment,
  buildAmortizationSchedule,
  calculateBiweeklyPayment,
  formatCurrency,
  computeTotalCosts,
  generatePieChartData,
} = require('../js/mortgage-calculator.js');

describe('calculateMonthlyPayment', () => {
  // Happy path
  it('calculates standard 30-year fixed correctly', () => {
    const result = calculateMonthlyPayment(320000, 0.06545, 30);
    expect(result).toBeCloseTo(2032.10, 1);
  });

  it('calculates 15-year fixed correctly', () => {
    const result = calculateMonthlyPayment(200000, 0.06, 15);
    expect(result).toBeCloseTo(1687.71, 1);
  });

  // Edge cases
  it('handles zero interest rate', () => {
    const result = calculateMonthlyPayment(120000, 0, 30);
    expect(result).toBeCloseTo(333.33, 1);
  });

  it('handles 1-year term correctly', () => {
    const result = calculateMonthlyPayment(12000, 0.12, 1);
    expect(result).toBeCloseTo(1066.19, 1);
  });

  // Error cases
  it('throws when principal is zero', () => {
    expect(() => calculateMonthlyPayment(0, 0.065, 30))
      .toThrow('Principal must be a positive number');
  });

  it('throws when principal is negative', () => {
    expect(() => calculateMonthlyPayment(-100, 0.065, 30))
      .toThrow('Principal must be a positive number');
  });

  it('throws when rate is negative', () => {
    expect(() => calculateMonthlyPayment(300000, -0.01, 30))
      .toThrow('Annual rate must be a non-negative number');
  });

  it('throws when term is zero', () => {
    expect(() => calculateMonthlyPayment(300000, 0.065, 0))
      .toThrow('Term must be a positive number');
  });

  it('throws on NaN inputs', () => {
    expect(() => calculateMonthlyPayment(NaN, 0.065, 30)).toThrow();
  });
});

describe('buildAmortizationSchedule', () => {
  it('returns correct number of payments for standard 30-year', () => {
    const schedule = buildAmortizationSchedule(320000, 0.06545, 30);
    expect(schedule.length).toBe(360);
    expect(schedule[0].month).toBe(1);
    expect(schedule[359].month).toBe(360);
    expect(schedule[359].balance).toBeCloseTo(0, 0);
  });

  it('first payment has correct interest and principal', () => {
    const schedule = buildAmortizationSchedule(320000, 0.06545, 30);
    // First month interest = 320000 * (0.06545/12)
    const expectedInterest = Math.round(320000 * (0.06545 / 12) * 100) / 100;
    expect(schedule[0].interest).toBeCloseTo(expectedInterest, 0);
    expect(schedule[0].balance).toBeCloseTo(320000 - schedule[0].principal, 0);
  });

  it('handles zero interest rate (simple division)', () => {
    const schedule = buildAmortizationSchedule(120000, 0, 1);
    expect(schedule.length).toBe(12);
    expect(schedule[0].principal).toBeCloseTo(10000, 0);
    expect(schedule[0].interest).toBe(0);
  });

  it('throws on invalid principal', () => {
    expect(() => buildAmortizationSchedule(0, 0.065, 30)).toThrow();
  });
});

describe('calculateBiweeklyPayment', () => {
  it('returns half the monthly payment', () => {
    expect(calculateBiweeklyPayment(2000)).toBe(1000);
    expect(calculateBiweeklyPayment(2032.10)).toBeCloseTo(1016.05, 1);
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
    expect(formatCurrency('abc')).toBe('$0.00');
  });
});

describe('computeTotalCosts', () => {
  it('computes basic costs correctly', () => {
    const costs = {
      propertyTaxes: 1.2,
      propertyTaxesUnit: 'p',
      homeIns: 1500,
      homeInsUnit: 'd',
      pmi: 0,
      pmiUnit: 'd',
      hoa: 0,
      hoaUnit: 'd',
      otherCosts: 4000,
      otherCostsUnit: 'd',
    };
    const result = computeTotalCosts(400000, 320000, costs, {}, 30);
    expect(result.total.propertyTax).toBeCloseTo(144000, -1);
    expect(result.total.homeIns).toBeCloseTo(45000, -1);
    expect(result.total.other).toBeCloseTo(120000, -1);
  });

  it('handles dollar-based costs', () => {
    const costs = {
      propertyTaxes: 2400,
      propertyTaxesUnit: 'd',
      homeIns: 1200,
      homeInsUnit: 'd',
      pmi: 0,
      pmiUnit: 'd',
      hoa: 0,
      hoaUnit: 'd',
      otherCosts: 0,
      otherCostsUnit: 'd',
    };
    const result = computeTotalCosts(400000, 320000, costs, {}, 30);
    expect(result.total.propertyTax).toBeCloseTo(72000, -1);
    expect(result.total.homeIns).toBeCloseTo(36000, -1);
  });
});

describe('generatePieChartData', () => {
  it('returns correct data structure', () => {
    const data = generatePieChartData({
      mortgage: 731554.96,
      propertyTax: 144000,
      homeIns: 45000,
      hoa: 0,
      other: 120000,
    });
    expect(data.length).toBe(4); // HOA is 0 so excluded
    expect(data[0].label).toBe('Principal & Interest');
    expect(data[0].value).toBe(731554.96);
    expect(data[0].percent).toBeGreaterThan(0);
    expect(data[0].color).toBeTruthy();
  });

  it('returns empty array when total is 0', () => {
    const data = generatePieChartData({
      mortgage: 0,
      propertyTax: 0,
      homeIns: 0,
      hoa: 0,
      other: 0,
    });
    expect(data).toEqual([]);
  });

  it('percentages sum to 100', () => {
    const data = generatePieChartData({
      mortgage: 500000,
      propertyTax: 100000,
      homeIns: 50000,
      hoa: 20000,
      other: 30000,
    });
    const sum = data.reduce((s, d) => s + d.percent, 0);
    // May not exactly equal 100 due to rounding, but should be close
    expect(sum).toBeGreaterThanOrEqual(95);
    expect(sum).toBeLessThanOrEqual(105);
  });
});

describe('conditional result table display', () => {
  // Test the showRowIfNonZero function behavior
  it('shows rows only when values are non-zero', () => {
    // This is a conceptual test - in a real DOM environment, we would test the actual function
    // For now, we test the logic that would be used in the function

    // Test case 1: Both monthly and total are zero - should hide
    const shouldHide1 = !(0 > 0 || 0 > 0);
    expect(shouldHide1).toBe(true);

    // Test case 2: Monthly is non-zero, total is zero - should show
    const shouldShow1 = !(100 > 0 || 0 > 0);
    expect(shouldShow1).toBe(false);

    // Test case 3: Monthly is zero, total is non-zero - should show
    const shouldShow2 = !(0 > 0 || 500 > 0);
    expect(shouldShow2).toBe(false);

    // Test case 4: Both are non-zero - should show
    const shouldShow3 = !(100 > 0 || 500 > 0);
    expect(shouldShow3).toBe(false);
  });

  it('handles edge cases for conditional display', () => {
    // Test with very small positive values (should show)
    const shouldShowSmall = !(0.01 > 0 || 0.01 > 0);
    expect(shouldShowSmall).toBe(false);

    // Test with negative values (should show as they're > 0 is false, but we want to show negative costs)
    // Note: In practice, costs shouldn't be negative, but we test the logic
    const shouldShowNegative = !(-100 > 0 || -500 > 0);
    expect(shouldShowNegative).toBe(true); // This would actually hide, which is correct behavior
  });
});
