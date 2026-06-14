/**
 * @file homepage.test.js
 * @description Unit tests for homepage search functionality
 * @module tests/homepage
 */

const { filterCalculators, CALCULATORS } = require('../js/search.js');

describe('filterCalculators', () => {
  describe('happy path — 1-char query (name prefix only)', () => {
    it('filters calculators whose name starts with a single letter', () => {
      const results = filterCalculators('m', CALCULATORS);
      const names = results.map((r) => r.name);
      expect(names).toContain('Mortgage Calculator');
    });

    it('does NOT match keywords for single-char queries', () => {
      const results = filterCalculators('m', CALCULATORS);
      const names = results.map((r) => r.name);
      expect(names).not.toContain('BMI Calculator');
    });

    it('returns empty when no calculator name starts with that letter', () => {
      const results = filterCalculators('z', CALCULATORS);
      expect(results).toEqual([]);
    });
  });

  describe('happy path — 2+ char query (name/word/keyword prefix)', () => {
    it('matches by name prefix', () => {
      const results = filterCalculators('mort', CALCULATORS);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Mortgage Calculator');
    });

    it('matches by keyword prefix when name does not start with query', () => {
      const results = filterCalculators('bmi', CALCULATORS);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('BMI Calculator');
    });

    it('matches by keyword when query is 3+ chars', () => {
      const results = filterCalculators('inv', CALCULATORS);
      const names = results.map((r) => r.name);
      expect(names).toContain('Investment Calculator');
      expect(names).toContain('Compound Interest Calculator');
    });

    it('does NOT match keywords for 2-char queries (avoids false positives)', () => {
      const results = filterCalculators('mo', CALCULATORS);
      const names = results.map((r) => r.name);
      expect(names).toContain('Mortgage Calculator');
      expect(names).not.toContain('Average Calculator');
    });
  });

  describe('edge cases', () => {
    it('returns all calculators when query is empty string', () => {
      const results = filterCalculators('', CALCULATORS);
      expect(results).toEqual(CALCULATORS);
    });

    it('returns all calculators when query is null', () => {
      const results = filterCalculators(null, CALCULATORS);
      expect(results).toEqual(CALCULATORS);
    });

    it('returns all calculators when query is undefined', () => {
      const results = filterCalculators(undefined, CALCULATORS);
      expect(results).toEqual(CALCULATORS);
    });

    it('is case-insensitive', () => {
      const lower = filterCalculators('mortgage', CALCULATORS);
      const upper = filterCalculators('MORTGAGE', CALCULATORS);
      expect(lower.length).toBe(upper.length);
    });

    it('trims whitespace from query', () => {
      const results = filterCalculators('  mortgage  ', CALCULATORS);
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Mortgage Calculator');
    });

    it('returns empty array for empty calculators array', () => {
      const results = filterCalculators('mortgage', []);
      expect(results).toEqual([]);
    });
  });

  describe('error cases', () => {
    it('returns all calculators for non-string input (number)', () => {
      const results = filterCalculators(123, CALCULATORS);
      expect(results).toEqual(CALCULATORS);
    });

    it('returns empty array for single char with no name match', () => {
      const results = filterCalculators('x', CALCULATORS);
      expect(results).toEqual([]);
    });

    it('returns empty when 2+ char query matches nothing', () => {
      const results = filterCalculators('zzzznotacalculator', CALCULATORS);
      expect(results).toEqual([]);
    });
  });
});
