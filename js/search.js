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
  { name: 'Pace Calculator', url: '/pace-calculator.html', category: 'Fitness', keywords: ['pace', 'running', 'speed', 'time', 'distance'] },
  { name: 'Army Body Fat Calculator', url: '/army-body-fat-calculator.html', category: 'Fitness', keywords: ['army', 'body', 'fat', 'military', 'standard'] },
  { name: 'Healthy Weight Calculator', url: '/healthy-weight-calculator.html', category: 'Fitness', keywords: ['healthy', 'weight', 'range', 'ideal'] },
  { name: 'Calories Burned Calculator', url: '/calories-burned-calculator.html', category: 'Fitness', keywords: ['calories', 'burned', 'exercise', 'activity'] },
  { name: 'One Rep Max Calculator', url: '/one-rep-max-calculator.html', category: 'Fitness', keywords: ['one', 'rep', 'max', 'strength', 'lift'] },
  { name: 'Target Heart Rate Calculator', url: '/target-heart-rate-calculator.html', category: 'Fitness', keywords: ['target', 'heart', 'rate', 'zone', 'exercise'] },
  { name: 'Pregnancy Weight Gain Calculator', url: '/pregnancy-weight-gain-calculator.html', category: 'Fitness', keywords: ['pregnancy', 'weight', 'gain', 'baby', 'gestation'] },
  { name: 'Pregnancy Conception Calculator', url: '/pregnancy-conception-calculator.html', category: 'Fitness', keywords: ['pregnancy', 'conception', 'date', 'ovulation'] },
  { name: 'Due Date Calculator', url: '/due-date-calculator.html', category: 'Fitness', keywords: ['due', 'date', 'pregnancy', 'baby', 'delivery'] },
  { name: 'Ovulation Calculator', url: '/ovulation-calculator.html', category: 'Fitness', keywords: ['ovulation', 'fertile', 'cycle', 'period'] },
  { name: 'Conception Calculator', url: '/conception-calculator.html', category: 'Fitness', keywords: ['conception', 'pregnancy', 'date', 'fertility'] },
  { name: 'Period Calculator', url: '/period-calculator.html', category: 'Fitness', keywords: ['period', 'menstrual', 'cycle', 'ovulation'] },
  { name: 'Macro Calculator', url: '/macro-calculator.html', category: 'Fitness', keywords: ['macro', 'macronutrient', 'protein', 'carbs', 'fat'] },
  { name: 'Carbohydrate Calculator', url: '/carbohydrate-calculator.html', category: 'Fitness', keywords: ['carbohydrate', 'carbs', 'diet', 'nutrition'] },
  { name: 'Protein Calculator', url: '/protein-calculator.html', category: 'Fitness', keywords: ['protein', 'intake', 'diet', 'muscle'] },
  { name: 'Fat Intake Calculator', url: '/fat-intake-calculator.html', category: 'Fitness', keywords: ['fat', 'intake', 'diet', 'nutrition'] },
  { name: 'GFR Calculator', url: '/gfr-calculator.html', category: 'Fitness', keywords: ['gfr', 'glomerular', 'filtration', 'rate', 'kidney'] },
  { name: 'Body Type Calculator', url: '/body-type-calculator.html', category: 'Fitness', keywords: ['body', 'type', 'somatotype', 'ectomorph', 'mesomorph', 'endomorph'] },
  { name: 'Body Surface Area Calculator', url: '/body-surface-area-calculator.html', category: 'Fitness', keywords: ['body', 'surface', 'area', 'bsa', 'medical'] },

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
  { name: 'Random Number Generator', url: '/random-number-generator.html', category: 'Math', keywords: ['random', 'number', 'generator', 'rng'] },
  { name: 'Percent Error Calculator', url: '/percent-error-calculator.html', category: 'Math', keywords: ['percent', 'error', 'difference', 'actual', 'theoretical'] },
  { name: 'Binary Calculator', url: '/binary-calculator.html', category: 'Math', keywords: ['binary', 'base2', 'convert', 'decimal'] },
  { name: 'Hex Calculator', url: '/hex-calculator.html', category: 'Math', keywords: ['hex', 'hexadecimal', 'base16', 'convert'] },
  { name: 'Half-Life Calculator', url: '/half-life-calculator.html', category: 'Math', keywords: ['half', 'life', 'decay', 'radioactive'] },
  { name: 'Quadratic Formula Calculator', url: '/quadratic-formula-calculator.html', category: 'Math', keywords: ['quadratic', 'formula', 'equation', 'roots'] },
  { name: 'Log Calculator', url: '/log-calculator.html', category: 'Math', keywords: ['log', 'logarithm', 'natural', 'base10'] },
  { name: 'Root Calculator', url: '/root-calculator.html', category: 'Math', keywords: ['root', 'square', 'cube', 'nth'] },
  { name: 'Least Common Multiple Calculator', url: '/least-common-multiple-calculator.html', category: 'Math', keywords: ['lcm', 'least', 'common', 'multiple'] },
  { name: 'Greatest Common Factor Calculator', url: '/greatest-common-factor-calculator.html', category: 'Math', keywords: ['gcf', 'greatest', 'common', 'factor', 'gcd'] },
  { name: 'Factor Calculator', url: '/factor-calculator.html', category: 'Math', keywords: ['factor', 'prime', 'divisor'] },
  { name: 'Rounding Calculator', url: '/rounding-calculator.html', category: 'Math', keywords: ['round', 'rounding', 'decimal', 'places'] },
  { name: 'Matrix Calculator', url: '/matrix-calculator.html', category: 'Math', keywords: ['matrix', 'determinant', 'inverse', 'linear'] },
  { name: 'Scientific Notation Calculator', url: '/scientific-notation-calculator.html', category: 'Math', keywords: ['scientific', 'notation', 'exponent', 'standard'] },
  { name: 'Big Number Calculator', url: '/big-number-calculator.html', category: 'Math', keywords: ['big', 'number', 'large', 'precision'] },
  { name: 'Standard Deviation Calculator', url: '/standard-deviation-calculator.html', category: 'Math', keywords: ['standard', 'deviation', 'statistics', 'variance'] },
  { name: 'Number Sequence Calculator', url: '/number-sequence-calculator.html', category: 'Math', keywords: ['number', 'sequence', 'series', 'pattern'] },
  { name: 'Sample Size Calculator', url: '/sample-size-calculator.html', category: 'Math', keywords: ['sample', 'size', 'population', 'statistics'] },
  { name: 'Statistics Calculator', url: '/statistics-calculator.html', category: 'Math', keywords: ['statistics', 'variance', 'standard', 'deviation', 'normal'] },
  { name: 'Mean, Median, Mode, Range Calculator', url: '/mean-median-mode-range-calculator.html', category: 'Math', keywords: ['mean', 'median', 'mode', 'range', 'average'] },
  { name: 'Permutation and Combination Calculator', url: '/permutation-and-combination-calculator.html', category: 'Math', keywords: ['permutation', 'combination', 'npr', 'ncr'] },
  { name: 'Z-score Calculator', url: '/z-score-calculator.html', category: 'Math', keywords: ['zscore', 'z-score', 'standard', 'deviation'] },
  { name: 'Confidence Interval Calculator', url: '/confidence-interval-calculator.html', category: 'Math', keywords: ['confidence', 'interval', 'margin', 'error'] },
  { name: 'Triangle Calculator', url: '/triangle-calculator.html', category: 'Math', keywords: ['triangle', 'angles', 'sides', 'area'] },
  { name: 'Slope Calculator', url: '/slope-calculator.html', category: 'Math', keywords: ['slope', 'rise', 'run', 'gradient'] },
  { name: 'Distance Calculator', url: '/distance-calculator.html', category: 'Math', keywords: ['distance', 'between', 'points', 'coordinates'] },
  { name: 'Circle Calculator', url: '/circle-calculator.html', category: 'Math', keywords: ['circle', 'radius', 'diameter', 'circumference'] },
  { name: 'Surface Area Calculator', url: '/surface-area-calculator.html', category: 'Math', keywords: ['surface', 'area', '3d', 'shape'] },
  { name: 'Pythagorean Theorem Calculator', url: '/pythagorean-theorem-calculator.html', category: 'Math', keywords: ['pythagorean', 'theorem', 'right', 'triangle'] },
  { name: 'Right Triangle Calculator', url: '/right-triangle-calculator.html', category: 'Math', keywords: ['right', 'triangle', 'angles', 'sides'] },

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
  { name: 'Hours Calculator', url: '/hours-calculator.html', category: 'Other', keywords: ['hours', 'time', 'duration', 'work'] },
  { name: 'Time Card Calculator', url: '/time-card-calculator.html', category: 'Other', keywords: ['time', 'card', 'work', 'hours', 'payroll'] },
  { name: 'Time Zone Calculator', url: '/time-zone-calculator.html', category: 'Other', keywords: ['time', 'zone', 'converter', 'world'] },
  { name: 'Time Duration Calculator', url: '/time-duration-calculator.html', category: 'Other', keywords: ['time', 'duration', 'between', 'elapsed'] },
  { name: 'Day Counter', url: '/day-counter.html', category: 'Other', keywords: ['day', 'counter', 'between', 'dates'] },
  { name: 'Day of the Week Calculator', url: '/day-of-the-week-calculator.html', category: 'Other', keywords: ['day', 'week', 'date', 'calendar'] },
  { name: 'Concrete Calculator', url: '/concrete-calculator.html', category: 'Other', keywords: ['concrete', 'volume', 'slab', 'construction'] },
  { name: 'BTU Calculator', url: '/btu-calculator.html', category: 'Other', keywords: ['btu', 'heating', 'cooling', 'hvac'] },
  { name: 'Square Footage Calculator', url: '/square-footage-calculator.html', category: 'Other', keywords: ['square', 'footage', 'area', 'room'] },
  { name: 'Stair Calculator', url: '/stair-calculator.html', category: 'Other', keywords: ['stair', 'steps', 'rise', 'run'] },
  { name: 'Roofing Calculator', url: '/roofing-calculator.html', category: 'Other', keywords: ['roofing', 'materials', 'area', 'pitch'] },
  { name: 'Tile Calculator', url: '/tile-calculator.html', category: 'Other', keywords: ['tile', 'flooring', 'area', 'coverage'] },
  { name: 'Mulch Calculator', url: '/mulch-calculator.html', category: 'Other', keywords: ['mulch', 'landscaping', 'coverage', 'garden'] },
  { name: 'Gravel Calculator', url: '/gravel-calculator.html', category: 'Other', keywords: ['gravel', 'coverage', 'landscaping', 'volume'] },
  { name: 'Height Calculator', url: '/height-calculator.html', category: 'Other', keywords: ['height', 'convert', 'feet', 'inches'] },
  { name: 'Conversion Calculator', url: '/conversion-calculator.html', category: 'Other', keywords: ['conversion', 'units', 'metric', 'imperial'] },
  { name: 'GDP Calculator', url: '/gdp-calculator.html', category: 'Other', keywords: ['gdp', 'economy', 'growth', 'country'] },
  { name: 'Density Calculator', url: '/density-calculator.html', category: 'Other', keywords: ['density', 'mass', 'volume', 'physics'] },
  { name: 'Mass Calculator', url: '/mass-calculator.html', category: 'Other', keywords: ['mass', 'weight', 'physics', 'convert'] },
  { name: 'Weight Calculator', url: '/weight-calculator.html', category: 'Other', keywords: ['weight', 'mass', 'convert', 'units'] },
  { name: 'Molarity Calculator', url: '/molarity-calculator.html', category: 'Other', keywords: ['molarity', 'chemistry', 'solution', 'concentration'] },
  { name: 'Molecular Weight Calculator', url: '/molecular-weight-calculator.html', category: 'Other', keywords: ['molecular', 'weight', 'chemistry', 'mass'] },
  { name: 'Roman Numeral Converter', url: '/roman-numeral-converter.html', category: 'Other', keywords: ['roman', 'numeral', 'convert', 'numbers'] },
  { name: 'Voltage Drop Calculator', url: '/voltage-drop-calculator.html', category: 'Other', keywords: ['voltage', 'drop', 'electrical', 'wire'] },
  { name: 'Resistor Calculator', url: '/resistor-calculator.html', category: 'Other', keywords: ['resistor', 'color', 'code', 'electronics'] },
  { name: 'Ohms Law Calculator', url: '/ohms-law-calculator.html', category: 'Other', keywords: ['ohms', 'law', 'voltage', 'current', 'resistance'] },
  { name: 'Electricity Calculator', url: '/electricity-calculator.html', category: 'Other', keywords: ['electricity', 'cost', 'usage', 'kwh'] },
  { name: 'IP Subnet Calculator', url: '/ip-subnet-calculator.html', category: 'Other', keywords: ['ip', 'subnet', 'network', 'address'] },
  { name: 'Bandwidth Calculator', url: '/bandwidth-calculator.html', category: 'Other', keywords: ['bandwidth', 'speed', 'download', 'upload'] },
  { name: 'Base64 Encode / Decode', url: '/base64-encode-decode.html', category: 'Other', keywords: ['base64', 'encode', 'decode', 'text'] },
  { name: 'URL Encode / Decode', url: '/url-encode-decode.html', category: 'Other', keywords: ['url', 'encode', 'decode', 'percent'] },
  { name: 'Grade Calculator', url: '/grade-calculator.html', category: 'Other', keywords: ['grade', 'percentage', 'score', 'test'] },
  { name: 'Bra Size Calculator', url: '/bra-size-calculator.html', category: 'Other', keywords: ['bra', 'size', 'measurement', 'fitting'] },
  { name: 'Shoe Size Conversion', url: '/shoe-size-conversion.html', category: 'Other', keywords: ['shoe', 'size', 'convert', 'footwear'] },
  { name: 'Golf Handicap Calculator', url: '/golf-handicap-calculator.html', category: 'Other', keywords: ['golf', 'handicap', 'score', 'sport'] },
  { name: 'Sleep Calculator', url: '/sleep-calculator.html', category: 'Other', keywords: ['sleep', 'bedtime', 'wakeup', 'cycles'] },
  { name: 'Wind Chill Calculator', url: '/wind-chill-calculator.html', category: 'Other', keywords: ['wind', 'chill', 'temperature', 'weather'] },
  { name: 'Heat Index Calculator', url: '/heat-index-calculator.html', category: 'Other', keywords: ['heat', 'index', 'temperature', 'humidity'] },
  { name: 'Dew Point Calculator', url: '/dew-point-calculator.html', category: 'Other', keywords: ['dew', 'point', 'humidity', 'weather'] },
  { name: 'Gas Mileage Calculator', url: '/gas-mileage-calculator.html', category: 'Other', keywords: ['gas', 'mileage', 'fuel', 'efficiency'] },
  { name: 'Horsepower Calculator', url: '/horsepower-calculator.html', category: 'Other', keywords: ['horsepower', 'engine', 'power', 'car'] },
  { name: 'Engine Horsepower Calculator', url: '/engine-horsepower-calculator.html', category: 'Other', keywords: ['engine', 'horsepower', 'power', 'vehicle'] },
  { name: 'Mileage Calculator', url: '/mileage-calculator.html', category: 'Other', keywords: ['mileage', 'distance', 'trip', 'travel'] },
  { name: 'Tire Size Calculator', url: '/tire-size-calculator.html', category: 'Other', keywords: ['tire', 'size', 'wheel', 'vehicle'] },
  { name: 'Dice Roller', url: '/dice-roller.html', category: 'Other', keywords: ['dice', 'roller', 'random', 'game'] },
  { name: 'Love Calculator', url: '/love-calculator.html', category: 'Other', keywords: ['love', 'calculator', 'fun', 'relationship'] },
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
