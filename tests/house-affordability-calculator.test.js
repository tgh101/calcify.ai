/**
 * @file house-affordability-calculator.test.js
 * @description Unit tests for house affordability calculator pure functions (no DOM)
 */

/* global describe, it, expect */
const {
  calculateMonthlyPayment,
  calculateLoanAmount,
  parseDTIOption,
  calculateAffordableHousePrice,
  calculateHousePriceFromBudget,
  formatCurrency,
  getDTILabel,
} = require('../js/house-affordability-calculator.js');

describe('calculateMonthlyPayment', () => {
  it('calculates standard 30-year fixed correctly', () => {
    const result = calculateMonthlyPayment(300000, 0.06, 30);
    expect(result).toBeCloseTo(1798.65, 1);
  });

  it('handles zero interest rate', () => {
    const result = calculateMonthlyPayment(120000, 0, 1);
    expect(result).toBeCloseTo(10000, 1);
  });

  it('throws when principal is zero', () => {
    expect(() => calculateMonthlyPayment(0, 0.06, 30))
      .toThrow('Principal must be a positive number');
  });
});

describe('calculateLoanAmount', () => {
  it('returns correct loan amount for given monthly payment', () => {
    const result = calculateLoanAmount(1798.65, 0.06, 30);
    expect(result).toBeCloseTo(300000, 0);
  });

  it('handles zero interest rate', () => {
    const result = calculateLoanAmount(10000, 0, 1);
    expect(result).toBeCloseTo(120000, 0);
  });

  it('throws on invalid inputs', () => {
    expect(() => calculateLoanAmount(0, 0.06, 30)).toThrow();
  });
});

describe('parseDTIOption', () => {
  it('returns correct ratios for conventional loan', () => {
    const dti = parseDTIOption('cv');
    expect(dti.front).toBe(0.28);
    expect(dti.back).toBe(0.36);
  });

  it('returns correct ratios for FHA loan', () => {
    const dti = parseDTIOption('fha');
    expect(dti.front).toBe(0.31);
    expect(dti.back).toBe(0.43);
  });

  it('returns null front-end for VA loan', () => {
    const dti = parseDTIOption('va');
    expect(dti.front).toBeNull();
    expect(dti.back).toBe(0.41);
  });

  it('parses custom percentage values', () => {
    const dti = parseDTIOption('25');
    expect(dti.front).toBe(0.25);
    expect(dti.back).toBe(0.25);
  });

  it('falls back to conventional for invalid option', () => {
    const dti = parseDTIOption('invalid');
    expect(dti.front).toBe(0.28);
    expect(dti.back).toBe(0.36);
  });
});

describe('calculateAffordableHousePrice', () => {
  it('returns positive house price for reasonable inputs', () => {
    const result = calculateAffordableHousePrice(
      120000, 0, 0.065, 30, 20, 1.5, 3, 0.5, 'cv'
    );
    expect(result.housePrice).toBeGreaterThan(0);
    expect(result.loanAmount).toBeGreaterThan(0);
    expect(result.downPayment).toBeGreaterThan(0);
    expect(result.monthlyMortgage).toBeGreaterThan(0);
    expect(result.dtiFront).toBeLessThanOrEqual(28);
    expect(result.dtiBack).toBeLessThanOrEqual(36);
  });

  it('handles zero debt and fees', () => {
    const result = calculateAffordableHousePrice(
      120000, 0, 0.065, 30, 20, 0, 0, 0, 'cv'
    );
    expect(result.housePrice).toBeGreaterThan(0);
  });
});

describe('calculateHousePriceFromBudget', () => {
  it('returns positive house price for reasonable budget', () => {
    const result = calculateHousePriceFromBudget(
      3500, 0.065, 30, 20, true, 1.5, 0, 0.5, 1.5
    );
    expect(result.housePrice).toBeGreaterThan(0);
    expect(result.loanAmount).toBeGreaterThan(0);
    expect(result.monthlyMortgage).toBeGreaterThan(0);
  });

  it('returns higher price when not covering fees', () => {
    const withFees = calculateHousePriceFromBudget(
      3500, 0.065, 30, 20, true, 1.5, 0, 0.5, 1.5
    );
    const withoutFees = calculateHousePriceFromBudget(
      3500, 0.065, 30, 20, false, 1.5, 0, 0.5, 1.5
    );
    expect(withoutFees.housePrice).toBeGreaterThan(withFees.housePrice);
  });
});

describe('formatCurrency', () => {
  it('formats positive numbers', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });

  it('handles invalid inputs', () => {
    expect(formatCurrency(NaN)).toBe('$0.00');
    expect(formatCurrency(Infinity)).toBe('$0.00');
  });
});

describe('getDTILabel', () => {
  it('returns correct label for conventional', () => {
    expect(getDTILabel('cv')).toContain('28/36');
  });

  it('returns correct label for FHA', () => {
    expect(getDTILabel('fha')).toContain('FHA');
  });

  it('returns correct label for VA', () => {
    expect(getDTILabel('va')).toContain('VA');
  });

  it('returns correct label for custom values', () => {
    expect(getDTILabel('25')).toContain('25%');
  });
});
