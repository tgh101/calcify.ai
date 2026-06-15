/**
 * @file fitness-calculator.test.js
 * @description Unit tests for fitness category page behaviour
 * @module tests/fitness-calculator
 */

const {
  filterCalculatorNames,
  filterPageCalculators,
  initFitnessCategory,
} = require('../js/fitness-calculator.js');

describe('filterCalculatorNames', () => {
  it('returns all names when query is empty', () => {
    const names = ['Mortgage', 'Auto Loan'];
    expect(filterCalculatorNames(names, '')).toEqual(names);
    expect(filterCalculatorNames(names, null)).toEqual(names);
    expect(filterCalculatorNames(names, undefined)).toEqual(names);
  });

  it('performs case-insensitive substring matching', () => {
    const names = ['Compound Interest', 'Investment Growth'];
    const res = filterCalculatorNames(names, 'compound');
    expect(res).toEqual(['Compound Interest']);
    const res2 = filterCalculatorNames(names, 'COMPOUND');
    expect(res2).toEqual(['Compound Interest']);
  });
});

describe('filterPageCalculators (DOM behaviour)', () => {
  // Helper to build a minimal fake DOM structure used by the module
  function buildFakeDOM(sectionsData, popularId = 'popular-calcs') {
    const sections = sectionsData.map((names) => {
      const links = names.map((n) => ({
        textContent: n,
        style: {},
        focus: () => {},
      }));
      return {
        querySelectorAll: (sel) => links,
        style: {},
      };
    });

    const popular = { style: {}, setAttribute: function () { this._aria = true; } };

    global.document = {
      querySelectorAll: (sel) => sections,
      getElementById: (id) => (id === popularId ? popular : null),
      querySelector: (sel) => {
        // return first link that is visible
        for (const s of sections) {
          const links = s.querySelectorAll();
          for (const l of links) {
            if (!l.style || l.style.display !== 'none') return l;
          }
        }
        return null;
      },
    };

    return { sections, popular };
  }

  it('hides non-matching links and sections, shows popular when query empty', () => {
    const { sections, popular } = buildFakeDOM([['Mortgage'], ['Auto Loan']]);
    const opts = {
      subcategorySelector: '.subcategory-section',
      calculatorLinkSelector: '.calculator-list a',
      popularBlockId: 'popular-calcs',
    };

    const anyVisible = filterPageCalculators('', opts);
    expect(anyVisible).toBe(true);
    // all links should be visible (no display:none) and sections visible
    sections.forEach((s) => {
      expect(s.style.display).toBe('');
      s.querySelectorAll().forEach((l) => expect(l.style.display).toBeUndefined());
    });
    expect(popular.style.display).toBe('');
  });

  it('hides popular block and empty sections when query present; returns false when nothing matches', () => {
    // two sections; only second has matching link
    const { sections, popular } = buildFakeDOM([['Mortgage'], ['Auto Loan']]);
    const opts = {
      subcategorySelector: '.subcategory-section',
      calculatorLinkSelector: '.calculator-list a',
      popularBlockId: 'popular-calcs',
    };

    // Query that matches nothing
    const noneVisible = filterPageCalculators('zzz-not-found', opts);
    expect(noneVisible).toBe(false);
    // all sections hidden
    sections.forEach((s) => expect(s.style.display).toBe('none'));
    // popular should be hidden when query non-empty
    expect(popular.style.display).toBe('none');
  });

  it('shows only matching links and keeps parent section visible', () => {
    const { sections, popular } = buildFakeDOM([['Mortgage', 'Refinance'], ['Auto Loan']]);
    const opts = {
      subcategorySelector: '.subcategory-section',
      calculatorLinkSelector: '.calculator-list a',
      popularBlockId: 'popular-calcs',
    };

    const anyVisible = filterPageCalculators('refi', opts); // substring 'Refinance'
    // 'Refinance' should be visible; others hidden
    const firstLinks = sections[0].querySelectorAll();
    expect(firstLinks[0].style.display).toBe('none'); // Mortgage
    expect(firstLinks[1].style.display).toBe(''); // Refinance
    expect(sections[0].style.display).toBe(''); // section remains visible
    // second section should be hidden entirely
    expect(sections[1].style.display).toBe('none');
    // popular hidden due to query
    expect(popular.style.display).toBe('none');
    expect(anyVisible).toBe(true);
  });
});

describe('initFitnessCategory', () => {
  it('returns early when search input is not present', () => {
    // Ensure document has no element with default id
    global.document = {
      getElementById: () => null,
    };
    // Should not throw
    expect(() => initFitnessCategory()).not.toThrow();
  });
});
