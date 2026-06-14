/**
 * @file search.js
 * @description Client-side prefix search filter for homepage calculator search
 * @module js/search
 */

/**
 * Calculator data for search filtering.
 * Each entry has a name, URL, category, and keywords for matching.
 */
const CALCULATORS = [
  /* ── Financial ─────────────────────────────────────────────────── */
  { name: 'Mortgage Calculator', url: '/mortgage-calculator.html', category: 'Financial', keywords: ['mortgage', 'home', 'loan', 'interest', 'payment'] },
  { name: 'Loan Calculator', url: '/loan-calculator.html', category: 'Financial', keywords: ['loan', 'borrow', 'interest', 'payment', 'emi'] },
  { name: 'Compound Interest Calculator', url: '/compound-interest-calculator.html', category: 'Financial', keywords: ['compound', 'interest', 'savings', 'investment', 'growth'] },
  { name: 'Tax Calculator', url: '/tax-calculator.html', category: 'Financial', keywords: ['tax', 'income', 'deduction', 'salary', 'wage'] },
  { name: 'Retirement Calculator', url: '/retirement-calculator.html', category: 'Financial', keywords: ['retirement', 'pension', 'savings', '401k', 'nest egg'] },
  { name: 'Investment Calculator', url: '/investment-calculator.html', category: 'Financial', keywords: ['investment', 'portfolio', 'return', 'roi', 'dividend'] },
  { name: 'Currency Converter', url: '/currency-converter.html', category: 'Financial', keywords: ['currency', 'exchange', 'forex', 'dollar', 'euro'] },
  { name: 'Credit Card Payoff Calculator', url: '/credit-card-payoff-calculator.html', category: 'Financial', keywords: ['credit', 'card', 'debt', 'payoff', 'balance'] },
  { name: 'Debt-to-Income Ratio Calculator', url: '/debt-to-income-calculator.html', category: 'Financial', keywords: ['debt', 'income', 'ratio', 'dti', 'afford'] },
  { name: 'Amortization Calculator', url: '/amortization-calculator.html', category: 'Financial', keywords: ['amortization', 'schedule', 'payment', 'loan'] },

  /* ── Fitness & Health ──────────────────────────────────────────── */
  { name: 'BMI Calculator', url: '/bmi-calculator.html', category: 'Fitness', keywords: ['bmi', 'body', 'mass', 'index', 'weight', 'height'] },
  { name: 'Calorie Calculator', url: '/calorie-calculator.html', category: 'Fitness', keywords: ['calorie', 'diet', 'food', 'nutrition', 'intake'] },
  { name: 'Body Fat Calculator', url: '/body-fat-calculator.html', category: 'Fitness', keywords: ['body', 'fat', 'percentage', 'composition'] },
  { name: 'BMR Calculator', url: '/bmr-calculator.html', category: 'Fitness', keywords: ['bmr', 'basal', 'metabolic', 'rate', 'metabolism'] },
  { name: 'Ideal Body Weight Calculator', url: '/ideal-body-weight-calculator.html', category: 'Fitness', keywords: ['ideal', 'weight', 'body', 'healthy'] },
  { name: 'Blood Alcohol Calculator', url: '/blood-alcohol-calculator.html', category: 'Fitness', keywords: ['blood', 'alcohol', 'bac', 'drink'] },
  { name: 'TDEE Calculator', url: '/tdee-calculator.html', category: 'Fitness', keywords: ['tdee', 'total', 'daily', 'energy', 'expenditure'] },
  { name: 'Pregnancy Calculator', url: '/pregnancy-calculator.html', category: 'Fitness', keywords: ['pregnancy', 'due', 'date', 'baby', 'gestation'] },
  { name: 'Water Intake Calculator', url: '/water-intake-calculator.html', category: 'Fitness', keywords: ['water', 'intake', 'hydration', 'drink'] },
  { name: 'Lean Body Mass Calculator', url: '/lean-body-mass-calculator.html', category: 'Fitness', keywords: ['lean', 'body', 'mass', 'muscle'] },

  /* ── Math ──────────────────────────────────────────────────────── */
  { name: 'Percentage Calculator', url: '/percentage-calculator.html', category: 'Math', keywords: ['percent', 'percentage', 'increase', 'decrease', 'change'] },
  { name: 'Fraction Calculator', url: '/fraction-calculator.html', category: 'Math', keywords: ['fraction', 'numerator', 'denominator', 'simplify'] },
  { name: 'Scientific Calculator', url: '/scientific-calculator.html', category: 'Math', keywords: ['scientific', 'trig', 'sin', 'cos', 'tan', 'log'] },
  { name: 'Decimal to Fraction Converter', url: '/decimal-to-fraction-calculator.html', category: 'Math', keywords: ['decimal', 'fraction', 'convert', 'rational'] },
  { name: 'Ratio Calculator', url: '/ratio-calculator.html', category: 'Math', keywords: ['ratio', 'proportion', 'compare'] },
  { name: 'Area Calculator', url: '/area-calculator.html', category: 'Math', keywords: ['area', 'surface', 'square', 'circle', 'rectangle'] },
  { name: 'Volume Calculator', url: '/volume-calculator.html', category: 'Math', keywords: ['volume', 'capacity', 'cylinder', 'sphere', 'cube'] },
  { name: 'Average Calculator', url: '/average-calculator.html', category: 'Math', keywords: ['average', 'mean', 'median', 'mode'] },
  { name: 'Probability Calculator', url: '/probability-calculator.html', category: 'Math', keywords: ['probability', 'chance', 'odds', 'likelihood'] },
  { name: 'Exponent Calculator', url: '/exponent-calculator.html', category: 'Math', keywords: ['exponent', 'power', 'square', 'cube', 'root'] },

  /* ── Other ─────────────────────────────────────────────────────── */
  { name: 'Age Calculator', url: '/age-calculator.html', category: 'Other', keywords: ['age', 'birthday', 'years', 'born'] },
  { name: 'Date Calculator', url: '/date-calculator.html', category: 'Other', keywords: ['date', 'days', 'between', 'difference'] },
  { name: 'Time Calculator', url: '/time-calculator.html', category: 'Other', keywords: ['time', 'hours', 'minutes', 'seconds', 'duration'] },
  { name: 'Speed Calculator', url: '/speed-calculator.html', category: 'Other', keywords: ['speed', 'velocity', 'distance', 'time', 'pace'] },
  { name: 'Password Generator', url: '/password-generator.html', category: 'Other', keywords: ['password', 'random', 'secure', 'strong'] },
  { name: 'Unit Converter', url: '/unit-converter.html', category: 'Other', keywords: ['unit', 'convert', 'metric', 'imperial', 'length', 'weight'] },
  { name: 'Tip Calculator', url: '/tip-calculator.html', category: 'Other', keywords: ['tip', 'gratuity', 'restaurant', 'bill'] },
  { name: 'GPA Calculator', url: '/gpa-calculator.html', category: 'Other', keywords: ['gpa', 'grade', 'point', 'average', 'academic'] },
  { name: 'Fuel Cost Calculator', url: '/fuel-cost-calculator.html', category: 'Other', keywords: ['fuel', 'gas', 'cost', 'mileage', 'mpg'] },
  { name: 'Statistics Calculator', url: '/statistics-calculator.html', category: 'Other', keywords: ['statistics', 'variance', 'standard', 'deviation', 'normal'] },
];

/**
 * Splits a string into words and checks if any word starts with the given prefix.
 *
 * @param {string} text - The text to search within (space-separated words)
 * @param {string} prefix - The prefix to match against (already lowercased)
 * @returns {boolean} True if any word in text starts with prefix
 */
function anyWordStartsWith(text, prefix) {
  const words = text.toLowerCase().split(/\s+/);
  return words.some((word) => word.startsWith(prefix));
}

/**
 * Filters calculators by prefix match with two-tier logic.
 * - 1 character: name prefix match ONLY
 * - 2+ characters: name prefix OR any word in name/keywords starts with query
 *
 * @param {string} query - The search query (case-insensitive)
 * @param {Array} calculators - The array of calculator objects to filter
 * @returns {Array} Filtered list of matching calculators
 */
function filterCalculators(query, calculators) {
  if (!query || typeof query !== 'string') {
    return calculators;
  }

  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery.length === 0) {
    return calculators;
  }

  return calculators.filter((calc) => {
    const nameLower = calc.name.toLowerCase();

    if (normalizedQuery.length === 1) {
      return nameLower.startsWith(normalizedQuery);
    }

    const namePrefixMatch = nameLower.startsWith(normalizedQuery);
    const nameWordMatch = anyWordStartsWith(calc.name, normalizedQuery);
    /* Keyword matching requires 3+ chars to avoid false positives (e.g. "mo" matching "mode") */
    const keywordMatch =
      normalizedQuery.length >= 3 &&
      calc.keywords.some((kw) => kw.startsWith(normalizedQuery));

    return namePrefixMatch || nameWordMatch || keywordMatch;
  });
}

/**
 * Initialises the search functionality on the homepage.
 * Attaches event listeners to the search input and renders filtered results.
 *
 * @param {HTMLElement} searchInput - The search input element
 * @param {HTMLElement} resultsContainer - The container element for results
 * @param {Array} calculators - The array of calculator objects
 */
// eslint-disable-next-line no-unused-vars -- called from index.html <script> tag
function initHeaderSearch(searchInput, resultsContainer, calculators) {
  if (!searchInput || !resultsContainer) {
    return;
  }

  searchInput.addEventListener('input', function () {
    const query = this.value;
    const results = filterCalculators(query, calculators);
    renderSearchResults(results, resultsContainer, query.length > 0);
  });

  /* Close results when clicking outside */
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.classList.remove('active');
    }
  });
}

/**
 * Renders search results into the container element.
 *
 * @param {Array} results - The filtered calculator results
 * @param {HTMLElement} container - The container to render results into
 * @param {boolean} isActive - Whether search input has content
 */
function renderSearchResults(results, container, isActive) {
  if (!isActive) {
    container.classList.remove('active');
    container.innerHTML = '';
    return;
  }

  if (results.length === 0) {
    container.innerHTML = '<div class="search-no-results">No calculators found</div>';
    container.classList.add('active');
    return;
  }

  let html = '';
  results.forEach((calc) => {
    html += '<a href="' + calc.url + '" class="search-result-item">';
    html += '<span>' + calc.name + '</span>';
    html += '<span class="category-label">' + calc.category + '</span>';
    html += '</a>';
  });

  container.innerHTML = html;
  container.classList.add('active');
}

/**
 * Returns the full list of calculators.
 *
 * @returns {Array} The complete calculator list
 */
function getCalculators() {
  return CALCULATORS;
}

/* Export for testing (browser and Vitest) */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    filterCalculators: filterCalculators,
    renderSearchResults: renderSearchResults,
    initHeaderSearch: initHeaderSearch,
    getCalculators: getCalculators,
    CALCULATORS: CALCULATORS,
  };
}
