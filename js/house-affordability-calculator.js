/**
 * @file house-affordability-calculator.js
 * @description House affordability calculator logic: DTI-based and budget-based house price estimation.
 * @module js/house-affordability-calculator
 */

/* ========================================================================
   SECTION 1 — Pure calculation functions
   ======================================================================== */

/**
 * Calculates the monthly loan payment using the standard amortisation formula.
 *
 *   M = P × [r(1+r)^n] / [(1+r)^n - 1]
 *
 * @param {number} principal   - Loan amount in dollars
 * @param {number} annualRate  - Annual interest rate as a decimal (e.g. 0.065 for 6.5%)
 * @param {number} termYears   - Loan term in years
 * @returns {number} Monthly payment amount rounded to 2 decimal places
 * @throws {Error} If any parameter is non-positive or non-finite
 */
function calculateMonthlyPayment(principal, annualRate, termYears) {
  if (typeof principal !== 'number' || !isFinite(principal) || principal <= 0) {
    throw new Error('Principal must be a positive number');
  }
  if (typeof annualRate !== 'number' || !isFinite(annualRate) || annualRate < 0) {
    throw new Error('Annual rate must be a non-negative number');
  }
  if (typeof termYears !== 'number' || !isFinite(termYears) || termYears <= 0) {
    throw new Error('Term must be a positive number');
  }

  if (annualRate === 0) {
    return Math.round((principal / (termYears * 12)) * 100) / 100;
  }

  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  const compoundFactor = Math.pow(1 + monthlyRate, numPayments);
  const payment = (principal * (monthlyRate * compoundFactor)) / (compoundFactor - 1);
  return Math.round(payment * 100) / 100;
}

/**
 * Calculates the loan amount given a monthly payment, interest rate, and term.
 * This is the inverse of calculateMonthlyPayment.
 *
 *   P = M × [(1+r)^n - 1] / [r(1+r)^n]
 *
 * @param {number} monthlyPayment - Desired monthly payment
 * @param {number} annualRate     - Annual interest rate as decimal
 * @param {number} termYears      - Loan term in years
 * @returns {number} Maximum loan amount rounded to 2 decimal places
 */
function calculateLoanAmount(monthlyPayment, annualRate, termYears) {
  if (typeof monthlyPayment !== 'number' || !isFinite(monthlyPayment) || monthlyPayment <= 0) {
    throw new Error('Monthly payment must be a positive number');
  }
  if (typeof annualRate !== 'number' || !isFinite(annualRate) || annualRate < 0) {
    throw new Error('Annual rate must be a non-negative number');
  }
  if (typeof termYears !== 'number' || !isFinite(termYears) || termYears <= 0) {
    throw new Error('Term must be a positive number');
  }

  if (annualRate === 0) {
    return Math.round(monthlyPayment * termYears * 12 * 100) / 100;
  }

  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  const compoundFactor = Math.pow(1 + monthlyRate, numPayments);
  const principal = (monthlyPayment * (compoundFactor - 1)) / (monthlyRate * compoundFactor);
  return Math.round(principal * 100) / 100;
}

/**
 * Parses the DTI option string into front-end and back-end ratios.
 *
 * @param {string} dtiOption - 'cv' | 'fha' | 'va' | '10'..'50'
 * @returns {{ front: number|null, back: number }}
 *   front: front-end DTI ratio (null = no front-end limit, e.g. VA)
 *   back:  back-end DTI ratio
 */
function parseDTIOption(dtiOption) {
  switch (dtiOption) {
    case 'cv':
      return { front: 0.28, back: 0.36 };
    case 'fha':
      return { front: 0.31, back: 0.43 };
    case 'va':
      return { front: null, back: 0.41 };
    default: {
      const val = parseInt(dtiOption, 10);
      if (!isNaN(val) && val >= 10 && val <= 50) {
        return { front: val / 100, back: val / 100 };
      }
      return { front: 0.28, back: 0.36 }; // fallback to conventional
    }
  }
}

/**
 * Calculates the maximum affordable house price based on income, debts, and DTI.
 * This is Mode 1 (income-based).
 *
 * @param {number} income        - Annual gross household income
 * @param {number} monthlyDebt   - Monthly recurring debt payments
 * @param {number} annualRate    - Annual interest rate as decimal
 * @param {number} termYears     - Mortgage loan term in years
 * @param {number} downPct       - Down payment as percentage (e.g. 20 for 20%)
 * @param {number} taxPct        - Property tax as percentage of house price (or 0)
 * @param {number} hoaPct        - HOA fee as percentage of house price (or 0)
 * @param {number} insPct        - Insurance as percentage of house price (or 0)
 * @param {string} dtiOption     - DTI option key (see parseDTIOption)
 * @returns {{
 *   housePrice: number,
 *   loanAmount: number,
 *   downPayment: number,
 *   closingCost: number,
 *   dtiFront: number,
 *   dtiBack: number,
 *   monthlyMortgage: number,
 *   monthlyPropertyTax: number,
 *   monthlyHOA: number,
 *   monthlyInsurance: number,
 *   totalMonthly: number,
 *   annualPropertyTax: number,
 *   annualHOA: number,
 *   annualInsurance: number,
 *   totalAtClosing: number
 * }}
 */
function calculateAffordableHousePrice(
  income, monthlyDebt, annualRate, termYears, downPct,
  taxPct, hoaPct, insPct, dtiOption
) {
  // Validate all inputs and set defaults
  income = (typeof income === 'number' && isFinite(income) && income > 0) ? income : 120000;
  monthlyDebt = (typeof monthlyDebt === 'number' && isFinite(monthlyDebt) && monthlyDebt >= 0) ? monthlyDebt : 0;
  annualRate = (typeof annualRate === 'number' && isFinite(annualRate) && annualRate >= 0) ? annualRate : 0.065;
  termYears = (typeof termYears === 'number' && isFinite(termYears) && termYears > 0) ? termYears : 30;
  downPct = (typeof downPct === 'number' && isFinite(downPct) && downPct >= 0) ? downPct : 20;
  taxPct = (typeof taxPct === 'number' && isFinite(taxPct) && taxPct >= 0) ? taxPct : 0;
  hoaPct = (typeof hoaPct === 'number' && isFinite(hoaPct) && hoaPct >= 0) ? hoaPct : 0;
  insPct = (typeof insPct === 'number' && isFinite(insPct) && insPct >= 0) ? insPct : 0;

  const dti = parseDTIOption(dtiOption || 'cv');
  const monthlyIncome = income / 12;

  // Max monthly housing cost based on front-end DTI
  const maxFront = dti.front !== null ? monthlyIncome * dti.front : Infinity;

  // Max monthly housing cost based on back-end DTI
  const maxBack = monthlyIncome * dti.back - monthlyDebt;

  // Effective max monthly housing cost
  let maxHousing = Math.min(maxFront, maxBack);
  if (maxHousing < 0) {
    maxHousing = 0;
  }

  // Amortization factor: monthly payment per dollar of loan
  // M = P * factor  =>  P = M / factor
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  let amortFactor;
  if (annualRate === 0) {
    amortFactor = 1 / (termYears * 12);
  } else {
    const compoundFactor = Math.pow(1 + monthlyRate, numPayments);
    amortFactor = (monthlyRate * compoundFactor) / (compoundFactor - 1);
  }

  // We know: maxHousing = monthlyPI + monthlyTax + monthlyHOA + monthlyIns
  // Where:
  //   monthlyPI = loanAmount * amortFactor
  //   monthlyTax = housePrice * taxPct / 1200
  //   monthlyHOA = housePrice * hoaPct / 1200
  //   monthlyIns = housePrice * insPct / 1200
  //   loanAmount = housePrice * (1 - downPct/100)
  //
  // So: maxHousing = housePrice * (1 - downPct/100) * amortFactor
  //                + housePrice * taxPct / 1200
  //                + housePrice * hoaPct / 1200
  //                + housePrice * insPct / 1200
  //
  // Factor out housePrice:
  //   maxHousing = housePrice * [
  //     (1 - downPct/100) * amortFactor + (taxPct + hoaPct + insPct) / 1200
  //   ]
  //
  // Solve for housePrice:
  const coeff =
    (1 - downPct / 100) * amortFactor +
    (taxPct + hoaPct + insPct) / 1200;

  let housePrice = coeff > 0 ? maxHousing / coeff : 0;

  // Cap at a reasonable maximum to prevent extreme results
  const maxReasonable = income * 10; // 10x annual income hard cap
  if (housePrice > maxReasonable) {
    housePrice = maxReasonable;
  }
  if (housePrice < 0) {
    housePrice = 0;
  }

  housePrice = Math.round(housePrice * 100) / 100;

  // Now compute all derived values
  const downPayment = housePrice * (downPct / 100);
  const loanAmount = housePrice - downPayment;
  const closingCost = housePrice * 0.03; // 3% closing cost assumption

  const monthlyMortgage = loanAmount > 0
    ? calculateMonthlyPayment(loanAmount, annualRate, termYears)
    : 0;
  const annualPropertyTax = housePrice * (taxPct / 100);
  const annualHOA = housePrice * (hoaPct / 100);
  const annualInsurance = housePrice * (insPct / 100);

  const monthlyPropertyTax = annualPropertyTax / 12;
  const monthlyHOA = annualHOA / 12;
  const monthlyInsurance = annualInsurance / 12;

  const totalMonthly = monthlyMortgage + monthlyPropertyTax + monthlyHOA + monthlyInsurance;
  const totalAtClosing = downPayment + closingCost;

  return {
    housePrice: Math.round(housePrice * 100) / 100,
    loanAmount: Math.round(loanAmount * 100) / 100,
    downPayment: Math.round(downPayment * 100) / 100,
    closingCost: Math.round(closingCost * 100) / 100,
    dtiFront: Math.round((monthlyIncome > 0 ? ((totalMonthly) / monthlyIncome) * 100 : 0) * 100) / 100,
    dtiBack: Math.round((monthlyIncome > 0 ? ((totalMonthly + monthlyDebt) / monthlyIncome) * 100 : 0) * 100) / 100,
    monthlyMortgage: Math.round(monthlyMortgage * 100) / 100,
    monthlyPropertyTax: Math.round(monthlyPropertyTax * 100) / 100,
    monthlyHOA: Math.round(monthlyHOA * 100) / 100,
    monthlyInsurance: Math.round(monthlyInsurance * 100) / 100,
    totalMonthly: Math.round(totalMonthly * 100) / 100,
    annualPropertyTax: Math.round(annualPropertyTax * 100) / 100,
    annualHOA: Math.round(annualHOA * 100) / 100,
    annualInsurance: Math.round(annualInsurance * 100) / 100,
    totalAtClosing: Math.round(totalAtClosing * 100) / 100,
  };
}

/**
 * Calculates affordable house price based on a fixed monthly budget.
 * This is Mode 2 (budget-based).
 *
 * @param {number} budget        - Monthly budget for housing
 * @param {number} annualRate    - Annual interest rate as decimal
 * @param {number} termYears     - Mortgage loan term in years
 * @param {number} downPct       - Down payment as percentage
 * @param {boolean} coverFees    - Whether budget includes tax/HOA/ins/maintenance
 * @param {number} taxPct        - Property tax as percentage of house price
 * @param {number} hoaPct        - HOA fee as percentage of house price
 * @param {number} insPct        - Insurance as percentage of house price
 * @param {number} maintPct      - Maintenance as percentage of house price
 * @returns {{
 *   housePrice: number,
 *   loanAmount: number,
 *   downPayment: number,
 *   closingCost: number,
 *   monthlyMortgage: number,
 *   monthlyPropertyTax: number,
 *   monthlyHOA: number,
 *   monthlyInsurance: number,
 *   monthlyMaintenance: number,
 *   totalMonthly: number,
 *   annualPropertyTax: number,
 *   annualHOA: number,
 *   annualInsurance: number,
 *   annualMaintenance: number,
 *   totalAtClosing: number
 * }}
 */
function calculateHousePriceFromBudget(
  budget, annualRate, termYears, downPct,
  coverFees, taxPct, hoaPct, insPct, maintPct
) {
  budget = (typeof budget === 'number' && isFinite(budget) && budget > 0) ? budget : 3500;
  annualRate = (typeof annualRate === 'number' && isFinite(annualRate) && annualRate >= 0) ? annualRate : 0.065;
  termYears = (typeof termYears === 'number' && isFinite(termYears) && termYears > 0) ? termYears : 30;
  downPct = (typeof downPct === 'number' && isFinite(downPct) && downPct >= 0) ? downPct : 20;
  taxPct = (typeof taxPct === 'number' && isFinite(taxPct) && taxPct >= 0) ? taxPct : 0;
  hoaPct = (typeof hoaPct === 'number' && isFinite(hoaPct) && hoaPct >= 0) ? hoaPct : 0;
  insPct = (typeof insPct === 'number' && isFinite(insPct) && insPct >= 0) ? insPct : 0;
  maintPct = (typeof maintPct === 'number' && isFinite(maintPct) && maintPct >= 0) ? maintPct : 0;

  // Amortization factor
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  let amortFactor;
  if (annualRate === 0) {
    amortFactor = 1 / (termYears * 12);
  } else {
    const compoundFactor = Math.pow(1 + monthlyRate, numPayments);
    amortFactor = (monthlyRate * compoundFactor) / (compoundFactor - 1);
  }

  // If coverFees: budget = monthlyPI + monthlyFees
  //   monthlyFees = housePrice * (taxPct + hoaPct + insPct + maintPct) / 1200
  //   monthlyPI = budget - monthlyFees
  // Else: monthlyPI = budget, fees paid separately
  //
  // monthlyPI = loanAmount * amortFactor
  // loanAmount = housePrice * (1 - downPct/100)
  //
  // If coverFees:
  //   budget = housePrice * [(1 - downPct/100) * amortFactor + (taxPct + hoaPct + insPct + maintPct) / 1200]
  // Else:
  //   budget = housePrice * (1 - downPct/100) * amortFactor
  //           => housePrice = budget / [(1 - downPct/100) * amortFactor]

  let coeff;
  if (coverFees) {
    coeff =
      (1 - downPct / 100) * amortFactor +
      (taxPct + hoaPct + insPct + maintPct) / 1200;
  } else {
    coeff = (1 - downPct / 100) * amortFactor;
  }

  let housePrice = coeff > 0 ? budget / coeff : 0;
  const maxReasonable = 10000000; // $10M hard cap for budget mode
  if (housePrice > maxReasonable) {
    housePrice = maxReasonable;
  }
  if (housePrice < 0) {
    housePrice = 0;
  }

  housePrice = Math.round(housePrice * 100) / 100;

  const downPayment = housePrice * (downPct / 100);
  const loanAmount = housePrice - downPayment;
  const closingCost = housePrice * 0.03;

  const monthlyMortgage = loanAmount > 0
    ? calculateMonthlyPayment(loanAmount, annualRate, termYears)
    : 0;
  const annualPropertyTax = housePrice * (taxPct / 100);
  const annualHOA = housePrice * (hoaPct / 100);
  const annualInsurance = housePrice * (insPct / 100);
  const annualMaintenance = housePrice * (maintPct / 100);

  const monthlyPropertyTax = annualPropertyTax / 12;
  const monthlyHOA = annualHOA / 12;
  const monthlyInsurance = annualInsurance / 12;
  const monthlyMaintenance = annualMaintenance / 12;

  const totalMonthly = monthlyMortgage + monthlyPropertyTax + monthlyHOA + monthlyInsurance + monthlyMaintenance;

  return {
    housePrice: Math.round(housePrice * 100) / 100,
    loanAmount: Math.round(loanAmount * 100) / 100,
    downPayment: Math.round(downPayment * 100) / 100,
    closingCost: Math.round(closingCost * 100) / 100,
    monthlyMortgage: Math.round(monthlyMortgage * 100) / 100,
    monthlyPropertyTax: Math.round(monthlyPropertyTax * 100) / 100,
    monthlyHOA: Math.round(monthlyHOA * 100) / 100,
    monthlyInsurance: Math.round(monthlyInsurance * 100) / 100,
    monthlyMaintenance: Math.round(monthlyMaintenance * 100) / 100,
    totalMonthly: Math.round(totalMonthly * 100) / 100,
    annualPropertyTax: Math.round(annualPropertyTax * 100) / 100,
    annualHOA: Math.round(annualHOA * 100) / 100,
    annualInsurance: Math.round(annualInsurance * 100) / 100,
    annualMaintenance: Math.round(annualMaintenance * 100) / 100,
    totalAtClosing: Math.round((downPayment + closingCost) * 100) / 100,
  };
}

/**
 * Formats a number as US currency: $X,XXX.XX
 *
 * @param {number} value - Numeric value
 * @returns {string} Formatted currency string
 */
function formatCurrency(value) {
  if (typeof value !== 'number' || !isFinite(value)) {
    return '$0.00';
  }
  const negative = value < 0;
  const abs = Math.abs(value);
  const parts = abs.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return negative ? '-$' + parts.join('.') : '$' + parts.join('.');
}

/* ========================================================================
   SECTION 2 — Form helpers
   ======================================================================== */

/**
 * Inserts commas into a number input on blur.
 *
 * @param {HTMLElement} el   - Input element
 * @param {string}      type - 'd' dollar | 'i' integer | 'c' comma-only
 */
function insertComma2(el, type) {
  if (!el) {
    return;
  }
  let val = el.value.toString().replaceAll(',', '').replaceAll(' ', '');
  let result = '';

  if (type === 'i') {
    val = val.replace(/[^\d.-]/g, '');
    result = val
      .toString()
      .split('.')[0]
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  } else if (type === 'd') {
    val = val.replace(/[^\d.-]/g, '');
    const dParts = val.toString().split('.');
    result = dParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (dParts.length > 1) {
      result += '.' + dParts[1];
    }
  } else if (type === 'c') {
    result = val.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  el.value = result;
}

/**
 * Initialises comma formatting on an element by ID.
 *
 * @param {string} id - Element ID
 */
function proComma2(id) {
  const el = document.getElementById(id);
  if (!el) {
    return;
  }
  el.onblur = function () {
    insertComma2(el, 'd');
  };
  insertComma2(el, 'd');
}

/**
 * Unit toggle: converts between % and $ for a cost field.
 *
 * @param {string} fieldId - Input element ID
 * @param {string} newUnit - 'd' dollars | 'p' percent
 */
function cunitchange(fieldId, newUnit) {
  const field = document.getElementById(fieldId);
  if (!field) {
    return;
  }

  const wrapper = field.closest('.input-unit-wrapper');
  const prefix = wrapper ? wrapper.querySelector('.unit-prefix') : null;
  const suffix = wrapper ? wrapper.querySelector('.unit-suffix') : null;

  const priceEl = document.getElementById('cannualincome');
  const income = parseFloat((priceEl ? priceEl.value : '120000').replace(/,/g, ''));
  const fieldVal = parseFloat(field.value.replace(/,/g, ''));

  if (!isNaN(income) && income > 0 && !isNaN(fieldVal)) {
    if (newUnit === 'd') {
      field.value = Math.round((income * fieldVal) / 100);
      field.classList.remove('inpct');
      field.classList.add('indollar');
      if (prefix) {
        prefix.style.display = 'block';
      }
      if (suffix) {
        suffix.style.display = 'none';
      }
    } else if (newUnit === 'p') {
      field.value = Math.round((100000.0 * fieldVal) / income) / 1000;
      field.classList.remove('indollar');
      field.classList.add('inpct');
      if (prefix) {
        prefix.style.display = 'none';
      }
      if (suffix) {
        suffix.style.display = 'block';
      }
    }
  } else {
    field.classList.toggle('inpct', newUnit === 'p');
    field.classList.toggle('indollar', newUnit === 'd');
    if (prefix) {
      prefix.style.display = newUnit === 'd' ? 'block' : 'none';
    }
    if (suffix) {
      suffix.style.display = newUnit === 'p' ? 'block' : 'none';
    }
  }
  insertComma2(field, 'd');
}

/* ========================================================================
   SECTION 3 — Main calculation handlers
   ======================================================================== */

/**
 * Performs the full affordability calculation (Mode 1: income-based).
 */
function calculateAffordability() {
  const el = function (id) {
    return document.getElementById(id);
  };

  // Read inputs
  let income = parseFloat(
    (el('cannualincome') ? el('cannualincome').value : '120000').replace(/,/g, '')
  );
  let monthlyDebt = parseFloat(
    (el('cmonthlydebt') ? el('cmonthlydebt').value : '0').replace(/,/g, '')
  );
  let loanTerm = parseFloat(
    (el('cloanterm') ? el('cloanterm').value : '30').replace(/,/g, '')
  );
  let intRate = parseFloat(
    (el('cinterestrate') ? el('cinterestrate').value : '6.486').replace(/,/g, '')
  );
  let downPct = parseFloat(
    (el('cdownpercent') ? el('cdownpercent').value : '20').replace(/,/g, '')
  );
  let taxPct = parseFloat(
    (el('cpropertytax') ? el('cpropertytax').value : '1.5').replace(/,/g, '')
  );
  let hoaPct = parseFloat(
    (el('choa') ? el('choa').value : '3').replace(/,/g, '')
  );
  let insPct = parseFloat(
    (el('cinsurance') ? el('cinsurance').value : '0.5').replace(/,/g, '')
  );

  // Defaults
  if (isNaN(income) || income <= 0) {
    income = 120000;
  }
  if (isNaN(monthlyDebt) || monthlyDebt < 0) {
    monthlyDebt = 0;
  }
  if (isNaN(loanTerm) || loanTerm <= 0) {
    loanTerm = 30;
  }
  if (isNaN(intRate) || intRate < 0) {
    intRate = 6.486;
  }
  if (isNaN(downPct) || downPct < 0) {
    downPct = 20;
  }
  if (isNaN(taxPct) || taxPct < 0) {
    taxPct = 1.5;
  }
  if (isNaN(hoaPct) || hoaPct < 0) {
    hoaPct = 3;
  }
  if (isNaN(insPct) || insPct < 0) {
    insPct = 0.5;
  }

  const annualRate = intRate / 100;

  // DTI option
  const dtiSelect = el('cdtiunit');
  const dtiOption = dtiSelect ? dtiSelect.value : 'cv';

  // Calculate
  const result = calculateAffordableHousePrice(
    income, monthlyDebt, annualRate, loanTerm, downPct,
    taxPct, hoaPct, insPct, dtiOption
  );

  // Parse DTI labels for display
  const dtiInfo = parseDTIOption(dtiOption);
  const dtiFrontDisplay = dtiInfo.front !== null
    ? Math.round(dtiInfo.front * 100) + '%'
    : '—';
  const dtiBackDisplay = Math.round(dtiInfo.back * 100) + '%';

  // ── Hide other calculator's results ──
  const otherResults = el('results-container2');
  if (otherResults) {
    otherResults.style.display = 'none';
  }

  // ── DOM updates ──
  const resultsContainer = el('results-container');
  if (resultsContainer) {
    resultsContainer.style.display = 'block';
  }

  // Green banner
  const housePriceEl = el('affordable-house-price');
  if (housePriceEl) {
    housePriceEl.textContent = formatCurrency(result.housePrice);
  }

  // Main summary text
  const summaryEl = el('affordability-summary');
  if (summaryEl) {
    summaryEl.innerHTML =
      'You can afford a house up to <font color="green"><b>' +
      formatCurrency(result.housePrice) +
      '</b></font> according to the ' +
      getDTILabel(dtiOption) +
      ', within which ' +
      formatCurrency(result.loanAmount) +
      ' is the loan and ' +
      formatCurrency(result.downPayment) +
      ' is the down payment. Most conventional loan lenders use the 28/36 rule.';
  }

  // Results table
  const setVal = function (id, val) {
    const elem = el(id);
    if (elem) {
      elem.textContent = typeof val === 'number' ? formatCurrency(val) : val;
    }
  };

  setVal('result-borrow', result.loanAmount);
  setVal('result-house-price', result.housePrice);
  setVal('result-down-payment', result.downPayment);
  setVal('result-closing-cost', result.closingCost);
  el('result-dti-front').textContent = result.dtiFront + '%';
  el('result-dti-back').textContent = result.dtiBack + '%';
  setVal('result-total-closing', result.totalAtClosing);

  setVal('result-monthly-mortgage', result.monthlyMortgage);
  setVal('result-annual-tax', result.annualPropertyTax);
  setVal('result-annual-hoa', result.annualHOA);
  setVal('result-annual-insurance', result.annualInsurance);
  setVal('result-total-monthly', result.totalMonthly);

  // DTI labels
  const dtiFrontLabel = el('dti-front-label');
  const dtiBackLabel = el('dti-back-label');
  if (dtiFrontLabel) {
    dtiFrontLabel.textContent = dtiFrontDisplay;
  }
  if (dtiBackLabel) {
    dtiBackLabel.textContent = dtiBackDisplay;
  }
}

/**
 * Returns a human-readable label for a DTI option.
 *
 * @param {string} dtiOption - DTI option key
 * @returns {string} Human-readable label
 */
function getDTILabel(dtiOption) {
  switch (dtiOption) {
    case 'cv':
      return '28/36 rule';
    case 'fha':
      return 'FHA loan (31% front-end, 43% back-end)';
    case 'va':
      return 'VA loan (41%)';
    default: {
      const val = parseInt(dtiOption, 10);
      if (!isNaN(val) && val >= 10 && val <= 50) {
        return val + '% DTI ratio';
      }
      return '28/36 rule';
    }
  }
}

/**
 * Performs the affordability calculation from budget (Mode 2: budget-based).
 */
function calculateAffordabilityFromBudget() {
  const el = function (id) {
    return document.getElementById(id);
  };

  // Read inputs
  let budget = parseFloat(
    (el('c2budget') ? el('c2budget').value : '3500').replace(/,/g, '')
  );
  let loanTerm = parseFloat(
    (el('c2loanterm') ? el('c2loanterm').value : '30').replace(/,/g, '')
  );
  let intRate = parseFloat(
    (el('c2interestrate') ? el('c2interestrate').value : '6.486').replace(/,/g, '')
  );
  let downPct = parseFloat(
    (el('c2downpercent') ? el('c2downpercent').value : '20').replace(/,/g, '')
  );
  const coverFees = el('c2coverfees') ? el('c2coverfees').checked : true;
  let taxPct = parseFloat(
    (el('c2propertytax') ? el('c2propertytax').value : '1.5').replace(/,/g, '')
  );
  let hoaPct = parseFloat(
    (el('c2hoa') ? el('c2hoa').value : '0').replace(/,/g, '')
  );
  let insPct = parseFloat(
    (el('c2insurance') ? el('c2insurance').value : '0.5').replace(/,/g, '')
  );
  let maintPct = parseFloat(
    (el('c2maintenance') ? el('c2maintenance').value : '1.5').replace(/,/g, '')
  );

  // If fees are unchecked, zero out all fee percentages
  if (!coverFees) {
    taxPct = 0;
    hoaPct = 0;
    insPct = 0;
    maintPct = 0;
  }

  // Defaults
  if (isNaN(budget) || budget <= 0) {
    budget = 3500;
  }
  if (isNaN(loanTerm) || loanTerm <= 0) {
    loanTerm = 30;
  }
  if (isNaN(intRate) || intRate < 0) {
    intRate = 6.486;
  }
  if (isNaN(downPct) || downPct < 0) {
    downPct = 20;
  }
  if (isNaN(taxPct) || taxPct < 0) {
    taxPct = 1.5;
  }
  if (isNaN(hoaPct) || hoaPct < 0) {
    hoaPct = 0;
  }
  if (isNaN(insPct) || insPct < 0) {
    insPct = 0.5;
  }
  if (isNaN(maintPct) || maintPct < 0) {
    maintPct = 1.5;
  }

  const annualRate = intRate / 100;

  const result = calculateHousePriceFromBudget(
    budget, annualRate, loanTerm, downPct,
    coverFees, taxPct, hoaPct, insPct, maintPct
  );

  // ── Hide other calculator's results ──
  const otherResults = el('results-container');
  if (otherResults) {
    otherResults.style.display = 'none';
  }

  // ── DOM updates (mode 2) ──
  const resultsContainer2 = el('results-container2');
  if (resultsContainer2) {
    resultsContainer2.style.display = 'block';
  }

  // Green banner
  const housePriceEl2 = el('affordable-house-price2');
  if (housePriceEl2) {
    housePriceEl2.textContent = formatCurrency(result.housePrice);
  }

  // Summary text
  const summaryEl2 = el('affordability-summary2');
  if (summaryEl2) {
    summaryEl2.innerHTML =
      'Based on your monthly budget of ' +
      formatCurrency(budget) +
      ', you can afford a house up to <font color="green"><b>' +
      formatCurrency(result.housePrice) +
      '</b></font>.' +
      (coverFees
        ? ' This includes property taxes, HOA fees, insurance, and maintenance costs.'
        : ' This is for the mortgage payment only, excluding other housing costs.');
  }

  // Results table
  const setVal = function (id, val) {
    const elem = el(id);
    if (elem) {
      elem.textContent = typeof val === 'number' ? formatCurrency(val) : val;
    }
  };

  setVal('result-house-price2', result.housePrice);
  setVal('result-loan-amount2', result.loanAmount);
  setVal('result-down-payment2', result.downPayment);
  setVal('result-closing-cost2', result.closingCost);
  setVal('result-total-closing2', result.totalAtClosing);

  // Toggle fee rows based on coverFees
  const feeRowIds = ['fee-row-mortgage2', 'fee-row-tax2', 'fee-row-hoa2', 'fee-row-ins2', 'fee-row-maint2'];
  feeRowIds.forEach((rowId) => {
    const row = document.getElementById(rowId);
    if (row) {
      row.style.display = coverFees ? '' : 'none';
    }
  });

  setVal('result-monthly-mortgage2', result.monthlyMortgage);
  setVal('result-monthly-tax2', coverFees ? result.monthlyPropertyTax : 0);
  setVal('result-monthly-hoa2', coverFees ? result.monthlyHOA : 0);
  setVal('result-monthly-insurance2', coverFees ? result.monthlyInsurance : 0);
  setVal('result-monthly-maintenance2', coverFees ? result.monthlyMaintenance : 0);
  setVal('result-total-monthly2', coverFees ? result.totalMonthly : result.monthlyMortgage);
}

/**
 * Sets interest rate and term from the rate widget, then recalculates.
 *
 * @param {string} rate  - Interest rate string
 * @param {string} years - Term in years
 * @returns {boolean} false
 */
function setYearRate(rate, years) {
  const termInput = document.getElementById('cloanterm');
  const rateInput = document.getElementById('cinterestrate');
  if (termInput) {
    termInput.value = years;
  }
  if (rateInput) {
    rateInput.value = rate;
  }
  calculateAffordability();
  return false;
}

/* ========================================================================
   SECTION 4 — Form clear
   ======================================================================== */

/**
 * Clears mode 1 form inputs.
 */
function clearForm1() {
  const ids = [
    'cannualincome',
    'cmonthlydebt',
    'cloanterm',
    'cinterestrate',
    'cdownpercent',
    'cpropertytax',
    'choa',
    'cinsurance',
  ];
  ids.forEach((id) => {
    const e = document.getElementById(id);
    if (e) {
      e.value = '';
    }
  });
}

/**
 * Clears mode 2 form inputs.
 */
function clearForm2() {
  const ids = [
    'c2budget',
    'c2loanterm',
    'c2interestrate',
    'c2downpercent',
    'c2propertytax',
    'c2hoa',
    'c2insurance',
    'c2maintenance',
  ];
  ids.forEach((id) => {
    const e = document.getElementById(id);
    if (e) {
      e.value = '';
    }
  });
}

/**
 * Toggle visibility of the tax/fees section in mode 2.
 */
function showhideFee() {
  const checkbox = document.getElementById('c2coverfees');
  const section = document.getElementById('c2taxfees');
  if (!checkbox || !section) {
    return;
  }
  section.style.display = checkbox.checked ? 'block' : 'none';
}

/* ========================================================================
   SECTION 5 — Initialisation
   ======================================================================== */

// eslint-disable-next-line no-unused-vars -- called from HTML <script> tag
function initHouseAffordabilityCalculator() {
  // Initialize comma formatting
  const numberIds = [
    'cannualincome',
    'cmonthlydebt',
    'cdownpercent',
    'cpropertytax',
    'choa',
    'cinsurance',
    'c2budget',
    'c2downpercent',
    'c2propertytax',
    'c2hoa',
    'c2insurance',
    'c2maintenance',
  ];
  numberIds.forEach((id) => {
    proComma2(id);
  });

  // Mode 2 inputs already show correct unit symbols via HTML defaults

  // Wire show/hide fee toggle
  const feeCheckbox = document.getElementById('c2coverfees');
  if (feeCheckbox) {
    feeCheckbox.addEventListener('change', showhideFee);
  }
  showhideFee();

  // Expose functions globally for HTML onclick/onsubmit
  window.calculateAffordability = calculateAffordability;
  window.calculateAffordabilityFromBudget = calculateAffordabilityFromBudget;
  window.clearForm1 = clearForm1;
  window.clearForm2 = clearForm2;
  window.cunitchange = cunitchange;
  window.setYearRate = setYearRate;
  window.showhideFee = showhideFee;

  // Calculate on load
  calculateAffordability();
  calculateAffordabilityFromBudget();
}

/* ========================================================================
   SECTION 6 — Exports
   ======================================================================== */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateMonthlyPayment,
    calculateLoanAmount,
    parseDTIOption,
    calculateAffordableHousePrice,
    calculateHousePriceFromBudget,
    formatCurrency,
    getDTILabel,
    insertComma2,
    proComma2,
  };
}
