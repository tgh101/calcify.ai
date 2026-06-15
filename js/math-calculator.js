/**
 * @file math-calculator.js
 * @description Category page behaviour: sidebar search, main-list filtering, popular toggle.
 * @module js/math-calculator
 */

/**
 * Filters an array of calculator names by a case-insensitive substring match.
 *
 * @param {Array<string>} names - Array of calculator display names
 * @param {string} query - Search query
 * @returns {Array<string>} Matching names (original casing)
 */
function filterCalculatorNames(names, query) {
  if (!query || typeof query !== 'string') {
    return names.slice();
  }

  const q = query.toLowerCase().trim();
  if (q.length === 0) {
    return names.slice();
  }

  return names.filter((n) => n.toLowerCase().includes(q));
}

/**
 * Hides or shows DOM elements based on the filter.
 *
 * @param {string} query
 * @param {object} opts
 * @param {string} opts.subcategorySelector - selector for subcategory sections
 * @param {string} opts.calculatorLinkSelector - selector for calculator links
 * @param {string} opts.popularBlockId - id of popular block
 */
function filterPageCalculators(query, opts) {
  const subcats = Array.from(document.querySelectorAll(opts.subcategorySelector));

  // Reset to default when query is empty — remove inline display from links to allow CSS default
  if (!query || (typeof query === 'string' && query.trim().length === 0)) {
    subcats.forEach((section) => {
      const links = Array.from(section.querySelectorAll(opts.calculatorLinkSelector));
      section.style.display = '';
      links.forEach((a) => {
        if (a && a.style && Object.prototype.hasOwnProperty.call(a.style, 'display')) {
          try {
            // remove inline style if possible
            delete a.style.display;
          } catch (e) {
            a.style.display = '';
          }
        }
      });
    });
    const popular = document.getElementById(opts.popularBlockId);
    if (popular) popular.style.display = '';
    const ariaRegion = document.getElementById(opts.popularBlockId);
    if (ariaRegion) {
      ariaRegion.setAttribute('aria-live', 'polite');
    }
    return subcats.length > 0;
  }

  let anyVisible = false;

  subcats.forEach((section) => {
    const links = Array.from(section.querySelectorAll(opts.calculatorLinkSelector));
    let visibleInSection = 0;

    links.forEach((a) => {
      const text = a.textContent || '';
      const match = filterCalculatorNames([text], query).length > 0;
      if (match) {
        a.style.display = '';
        visibleInSection += 1;
      } else {
        a.style.display = 'none';
      }
    });

    // hide section if no visible items
    section.style.display = visibleInSection === 0 ? 'none' : '';
    if (visibleInSection > 0) {
      anyVisible = true;
    }
  });

  const popular = document.getElementById(opts.popularBlockId);
  if (popular) {
    popular.style.display = 'none';
  }

  // update aria-live region with count if present
  const ariaRegion = document.getElementById(opts.popularBlockId);
  if (ariaRegion) {
    ariaRegion.setAttribute('aria-live', 'polite');
  }

  return anyVisible;
}

/**
 * Debounce helper.
 *
 * @param {Function} fn
 * @param {number} wait
 * @returns {Function}
 */
function debounce(fn, wait) {
  let t = null;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Initialize math category page behaviour.
 *
 * @param {object} options
 * @param {string} options.searchInputId - ID of sidebar search input
 * @param {string} options.popularBlockId - ID of popular block
 * @param {string} options.subcategorySelector - Selector for subcategory sections
 * @param {string} options.calculatorLinkSelector - Selector for calculator links
 */
// eslint-disable-next-line no-unused-vars
function initMathCategory(options = {}) {
  const opts = {
    searchInputId: options.searchInputId || 'sidebar-search-input',
    popularBlockId: options.popularBlockId || 'popular-calcs',
    subcategorySelector: options.subcategorySelector || '.subcategory-section',
    calculatorLinkSelector: options.calculatorLinkSelector || '.calculator-list a',
  };

  const input = document.getElementById(opts.searchInputId);
  if (!input) {
    return;
  }

  const handler = debounce(() => {
    const q = input.value;
    filterPageCalculators(q, opts);
  }, 200);

  input.addEventListener('input', handler);

  // support Enter to focus first visible result
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = document.querySelector(`${opts.calculatorLinkSelector}:not([style*="display: none"])`);
      if (first) {
        first.focus();
      }
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    filterCalculatorNames,
    filterPageCalculators,
    initMathCategory,
  };
}
