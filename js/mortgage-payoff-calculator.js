/**
 * @file mortgage-payoff-calculator.js
 * @description Mortgage payoff calculator logic: payoff schedules, dual amortization tables, form handling.
 * @module js/mortgage-payoff-calculator
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
 * @param {number} annualRate  - Annual interest rate as a decimal (e.g. 0.06 for 6%)
 * @param {number} termYears   - Loan term in years (may include fractional months)
 * @returns {number} Monthly payment amount rounded to 2 decimal places
 * @throws {Error} If any parameter is invalid
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
 * Calculates the remaining balance after a given number of payments.
 *
 * @param {number} principal    - Original loan amount
 * @param {number} annualRate   - Annual interest rate as decimal
 * @param {number} totalTermYears - Original loan term in years
 * @param {number} monthsPaid   - Number of months already paid
 * @returns {number} Remaining balance rounded to 2 decimal places
 */
function calculateRemainingBalance(principal, annualRate, totalTermYears, monthsPaid) {
  if (monthsPaid <= 0) {
    return principal;
  }
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, totalTermYears);
  const monthlyRate = annualRate / 12;
  let balance = principal;

  for (let i = 0; i < monthsPaid; i++) {
    const interestPortion = Math.round(balance * monthlyRate * 100) / 100;
    let principalPortion = Math.round((monthlyPayment - interestPortion) * 100) / 100;
    if (principalPortion < 0) {
      principalPortion = 0;
    }
    balance = Math.round((balance - principalPortion) * 100) / 100;
    if (balance < 0) {
      balance = 0;
    }
  }
  return balance;
}

/**
 * Calculates the remaining term given a balance, monthly payment, and interest rate.
 *
 * @param {number} balance        - Current unpaid principal balance
 * @param {number} monthlyPayment - Monthly payment amount
 * @param {number} annualRate     - Annual interest rate as decimal
 * @returns {number} Remaining term in months
 */
function calculateRemainingTerm(balance, monthlyPayment, annualRate) {
  if (balance <= 0 || monthlyPayment <= 0) {
    return 0;
  }
  const monthlyRate = annualRate / 12;
  let months = 0;

  if (annualRate === 0) {
    return Math.ceil(balance / monthlyPayment);
  }

  // Prevent infinite loop - cap at 600 months (50 years)
  while (balance > 0.005 && months < 600) {
    const interestPortion = Math.round(balance * monthlyRate * 100) / 100;
    let principalPortion = Math.round((monthlyPayment - interestPortion) * 100) / 100;
    if (principalPortion < 0) {
      principalPortion = 0;
    }
    balance = Math.round((balance - principalPortion) * 100) / 100;
    if (balance < 0) {
      balance = 0;
    }
    months++;
  }
  return months;
}

/**
 * Builds a month-by-month amortisation schedule.
 *
 * @param {number} principal    - Loan amount
 * @param {number} annualRate   - Annual interest rate as decimal
 * @param {number} termYears    - Loan term in years
 * @param {object} [extraPayments] - { monthly, yearly, yearlyMonth, yearlyStartYear, oneTime }
 * @param {number} [startMonthIndex] - Starting month index (0-based) for the schedule
 * @returns {Array<{ month, interest, principal, extraPaid, balance }>}
 */
function buildAmortizationSchedule(
  principal,
  annualRate,
  termYears,
  extraPayments,
  startMonthIndex
) {
  if (typeof principal !== 'number' || !isFinite(principal) || principal <= 0) {
    throw new Error('Principal must be a positive number');
  }
  if (typeof annualRate !== 'number' || !isFinite(annualRate) || annualRate < 0) {
    throw new Error('Annual rate must be a non-negative number');
  }

  const basePayment = calculateMonthlyPayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 12;
  const maxPayments = termYears * 12;

  const extras = extraPayments || {
    monthly: 0,
    yearly: 0,
    yearlyMonth: 1,
    yearlyStartYear: 2026,
    oneTime: [],
  };

  const startIdx = startMonthIndex || 0;
  const yearlyMonth = extras.yearlyMonth || 1;
  const yearlyStartYear = extras.yearlyStartYear || 2026;

  const otMap = {};
  if (extras.oneTime && extras.oneTime.length > 0) {
    extras.oneTime.forEach(ot => {
      if (ot && ot.amount > 0 && ot.month >= 1 && ot.month <= 12) {
        const key = ot.year + '-' + ot.month;
        otMap[key] = (otMap[key] || 0) + ot.amount;
      }
    });
  }

  const schedule = [];
  let balance = principal;
  let paymentIndex = 0;

  while (balance > 0.005 && paymentIndex < maxPayments * 2) {
    paymentIndex++;
    const currentMonthNum = ((startIdx + paymentIndex - 1) % 12) + 1;
    const currentYear = 2026 + Math.floor((startIdx + paymentIndex - 1) / 12);

    const interestPortion = Math.round(balance * monthlyRate * 100) / 100;
    let principalPortion = Math.round((basePayment - interestPortion) * 100) / 100;
    if (principalPortion < 0) {
      principalPortion = 0;
    }

    const extraMonthly = extras.monthly > 0 ? extras.monthly : 0;

    let extraYearly = 0;
    if (extras.yearly > 0 && currentMonthNum === yearlyMonth && currentYear >= yearlyStartYear) {
      extraYearly = extras.yearly;
    }

    const extraOneTime = otMap[currentYear + '-' + currentMonthNum] || 0;
    const totalExtra = extraMonthly + extraYearly + extraOneTime;
    const totalPrincipalPaid = Math.min(principalPortion + totalExtra, balance);
    const extraPaid = Math.max(0, totalPrincipalPaid - principalPortion);

    balance = Math.round((balance - totalPrincipalPaid) * 100) / 100;
    if (balance < 0) {
      balance = 0;
    }

    schedule.push({
      month: paymentIndex,
      interest: Math.round(interestPortion * 100) / 100,
      principal: Math.round(totalPrincipalPaid * 100) / 100,
      extraPaid: Math.round(extraPaid * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    });

    if (balance <= 0.005) {
      break;
    }
  }

  return schedule;
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

/**
 * Builds a dual amortisation table HTML string comparing original vs payoff schedules.
 *
 * @param {Array<object>} originalSchedule - From buildAmortizationSchedule (no extras)
 * @param {Array<object>} payoffSchedule   - From buildAmortizationSchedule (with extras)
 * @param {number} monthsPaidSoFar         - Months paid before extra payments start
 * @returns {string} HTML table
 */
function buildDualAmortizationTableHTML(originalSchedule, payoffSchedule, monthsPaidSoFar) {
  let html = '<table class="cinfoT">';
  html += '<tr align="center"><td class="cinfoHd" rowspan="2">&nbsp;</td>';
  html +=
    '<td class="cinfoHdL" colspan="3" style="border-bottom:1px solid #114477;">Original (without payoff)</td>';
  html +=
    '<td class="cinfoHdL" colspan="3" style="border-bottom:1px solid #114477;">With payoff</td></tr>';
  html +=
    '<tr align="center"><td class="cinfoHdL">Interest</td><td class="cinfoHdL">Principal</td><td class="cinfoHdL">End balance</td>';
  html +=
    '<td class="cinfoHdL">Interest</td><td class="cinfoHdL">Principal</td><td class="cinfoHdL">End balance</td></tr>';

  const maxLen = Math.max(originalSchedule.length, payoffSchedule.length);

  for (let i = 0; i < maxLen; i++) {
    // Insert "Extra Payment Starts" marker
    if (i === monthsPaidSoFar && monthsPaidSoFar > 0) {
      html +=
        '<tr><td colspan="4">&nbsp;</td><td colspan="3" align="center" bgcolor="#feb6b6"><b>Extra Payment Starts</b></td></tr>';
    }

    const orig = originalSchedule[i] || { interest: 0, principal: 0, balance: 0 };
    const payoff = payoffSchedule[i] || { interest: 0, principal: 0, balance: 0 };

    html +=
      '<tr align="right">' +
      '<td>' +
      (i + 1) +
      '</td>' +
      '<td class="cinfoBodL">' +
      formatCurrency(orig.interest) +
      '</td>' +
      '<td class="cinfoBodL">' +
      formatCurrency(orig.principal) +
      '</td>' +
      '<td class="cinfoBodL">' +
      formatCurrency(orig.balance) +
      '</td>' +
      '<td class="cinfoBodL">' +
      formatCurrency(payoff.interest) +
      '</td>' +
      '<td class="cinfoBodL">' +
      formatCurrency(payoff.principal) +
      '</td>' +
      '<td class="cinfoBodL">' +
      formatCurrency(payoff.balance) +
      '</td>' +
      '</tr>';

    if ((i + 1) % 12 === 0 && i < maxLen - 1) {
      html +=
        '<tr><td colspan="7" align="center" bgcolor="#e0f0fe"><b>Year #' +
        Math.floor((i + 1) / 12) +
        ' end</b></td></tr>';
    }
  }

  html += '</table>';
  return html;
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
 * Toggle extra payment inputs based on selected radio option (mode 1).
 */
function cpayoffoptionChange() {
  const radios = document.getElementsByName('cpayoffoption');
  const extraDiv = document.getElementById('cpayoffextra');
  if (!extraDiv) {
    return;
  }

  let selected = 'extra';
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      selected = radios[i].value;
      break;
    }
  }
  extraDiv.style.display = selected === 'extra' ? 'block' : 'none';
}

/**
 * Toggle extra payment inputs based on selected radio option (mode 2).
 */
function cpayoffoptionChange2() {
  const radios = document.getElementsByName('cpayoffoption2');
  const extraDiv = document.getElementById('cpayoffextra2');
  if (!extraDiv) {
    return;
  }

  let selected = 'extra';
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      selected = radios[i].value;
      break;
    }
  }
  extraDiv.style.display = selected === 'extra' ? 'block' : 'none';
}

/* ========================================================================
   SECTION 3 — Main calculation handlers
   ======================================================================== */

/**
 * Performs the full mortgage payoff calculation (mode 1: known remaining term).
 */
function calculatePayoff() {
  const el = function (id) {
    return document.getElementById(id);
  };

  // ── Core inputs ──
  let loanAmount = parseFloat(
    (el('cloanamount') ? el('cloanamount').value : '400000').replace(/,/g, '')
  );
  let loanTerm = parseFloat((el('cloanterm') ? el('cloanterm').value : '30').replace(/,/g, ''));
  let intRate = parseFloat(
    (el('cinterestrate') ? el('cinterestrate').value : '6').replace(/,/g, '')
  );
  let remYear = parseInt(
    (el('cremainingyear') ? el('cremainingyear').value : '25').replace(/,/g, ''),
    10
  );
  let remMonth = parseInt(
    (el('cremainingmonth') ? el('cremainingmonth').value : '0').replace(/,/g, ''),
    10
  );

  // Defaults
  if (isNaN(loanAmount) || loanAmount <= 0) {
    loanAmount = 400000;
  }
  if (isNaN(loanTerm) || loanTerm <= 0) {
    loanTerm = 30;
  }
  if (isNaN(intRate) || intRate < 0) {
    intRate = 6;
  }
  if (isNaN(remYear) || remYear < 0) {
    remYear = 25;
  }
  if (isNaN(remMonth) || remMonth < 0) {
    remMonth = 0;
  }

  const annualRate = intRate / 100;
  const totalMonthsInLoan = Math.round(loanTerm * 12);
  const remainingMonths = remYear * 12 + remMonth;
  let monthsPaidSoFar = totalMonthsInLoan - remainingMonths;
  if (monthsPaidSoFar < 0) {
    monthsPaidSoFar = 0;
  }

  const remainingTermYears = remainingMonths / 12;

  // ── Read selected payoff option ──
  const radios = document.getElementsByName('cpayoffoption');
  let payoffOption = 'extra';
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      payoffOption = radios[i].value;
      break;
    }
  }

  // ── Read extra payment amounts ──
  let extraMonthly = 0;
  let extraYearly = 0;
  let extraOneTime = 0;
  if (payoffOption === 'extra') {
    extraMonthly = parseFloat(
      (el('cadditionalmonth') ? el('cadditionalmonth').value : '500').replace(/,/g, '')
    );
    extraYearly = parseFloat(
      (el('cadditionalyear') ? el('cadditionalyear').value : '0').replace(/,/g, '')
    );
    extraOneTime = parseFloat(
      (el('cadditionalonetime') ? el('cadditionalonetime').value : '0').replace(/,/g, '')
    );
    if (isNaN(extraMonthly)) {
      extraMonthly = 500;
    }
    if (isNaN(extraYearly)) {
      extraYearly = 0;
    }
    if (isNaN(extraOneTime)) {
      extraOneTime = 0;
    }
  }

  const remainingBalance = calculateRemainingBalance(
    loanAmount,
    annualRate,
    loanTerm,
    monthsPaidSoFar
  );

  // ── Build extra payments config ──
  const hasAnyExtra =
    payoffOption === 'extra' && (extraMonthly > 0 || extraYearly > 0 || extraOneTime > 0);
  const extraPayments = {
    monthly: 0,
    yearly: 0,
    yearlyMonth: 1,
    yearlyStartYear: 2026,
    oneTime: [],
  };
  if (hasAnyExtra) {
    extraPayments.monthly = extraMonthly;
    extraPayments.yearly = extraYearly;
    extraPayments.yearlyMonth = 1;
    extraPayments.yearlyStartYear = new Date().getFullYear();
    if (extraOneTime > 0) {
      extraPayments.oneTime.push({
        amount: extraOneTime,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      });
    }
  }

  // ── Compute original schedule ──
  const originalSchedule = buildAmortizationSchedule(
    remainingBalance,
    annualRate,
    remainingTermYears,
    null,
    monthsPaidSoFar
  );
  const totalOrigInterest =
    Math.round(
      originalSchedule.reduce((s, e) => {
        return s + e.interest;
      }, 0) * 100
    ) / 100;
  const totalOrigPayment = Math.round((remainingBalance + totalOrigInterest) * 100) / 100;
  const origMonthlyPayment = calculateMonthlyPayment(
    remainingBalance,
    annualRate,
    remainingTermYears
  );

  // ── Compute payoff schedule ──
  let payoffSchedule, totalPayoffInterest, totalPayoffPayment, payoffMonthlyPayment;
  let actualPayoffMonths = originalSchedule.length;
  let totalExtraPaid = 0;

  if (hasAnyExtra || payoffOption === 'biweekly') {
    payoffSchedule = buildAmortizationSchedule(
      remainingBalance,
      annualRate,
      remainingTermYears,
      extraPayments,
      monthsPaidSoFar
    );
    totalPayoffInterest =
      Math.round(
        payoffSchedule.reduce((s, e) => {
          return s + e.interest;
        }, 0) * 100
      ) / 100;
    totalExtraPaid =
      Math.round(
        payoffSchedule.reduce((s, e) => {
          return s + (e.extraPaid || 0);
        }, 0) * 100
      ) / 100;
    totalPayoffPayment = Math.round((remainingBalance + totalPayoffInterest) * 100) / 100;
    payoffMonthlyPayment = origMonthlyPayment + (extraMonthly || 0);
    actualPayoffMonths = payoffSchedule.length;
  } else if (payoffOption === 'original') {
    // Normal repayment - same as original
    payoffSchedule = originalSchedule;
    totalPayoffInterest = totalOrigInterest;
    totalPayoffPayment = totalOrigPayment;
    payoffMonthlyPayment = origMonthlyPayment;
    actualPayoffMonths = originalSchedule.length;
  } else {
    // Fallback
    payoffSchedule = originalSchedule;
    totalPayoffInterest = totalOrigInterest;
    totalPayoffPayment = totalOrigPayment;
    payoffMonthlyPayment = origMonthlyPayment;
  }

  // Biweekly calculation
  let biweeklyPayment = 0;
  if (payoffOption === 'biweekly') {
    biweeklyPayment = Math.round((origMonthlyPayment / 2) * 100) / 100;
    const biweeklySchedule = buildBiweeklyAmortizationSchedule(
      remainingBalance,
      annualRate,
      biweeklyPayment
    );
    actualPayoffMonths = biweeklySchedule.length;
    totalPayoffInterest =
      Math.round(
        biweeklySchedule.reduce((s, e) => {
          return s + e.interest;
        }, 0) * 100
      ) / 100;
    totalPayoffPayment = remainingBalance + totalPayoffInterest;
    payoffMonthlyPayment = (biweeklyPayment * 26) / 12;
    payoffSchedule = biweeklySchedule;
  }

  // ── Interest saved ──
  const interestSaved = Math.round((totalOrigInterest - totalPayoffInterest) * 100) / 100;
  const savedMonths = originalSchedule.length - actualPayoffMonths;

  // ── Payoff date ──
  const payoffYears = Math.floor(actualPayoffMonths / 12);
  const payoffMonthsRem = actualPayoffMonths % 12;

  // ── DOM updates ──
  const resultsContainer = el('results-container');
  if (resultsContainer) {
    resultsContainer.style.display = 'block';
  }

  // Payoff duration in green banner
  const durationEl = el('payoff-duration-value1');
  if (durationEl) {
    durationEl.textContent = formatDuration(payoffYears, payoffMonthsRem);
  }

  // Normal repayment: hide green banner and comparison bars
  const payoffBanner = el('payoff-banner1');
  const comparisonBars = el('comparison-bars');
  if (payoffOption === 'original') {
    if (payoffBanner) {
      payoffBanner.style.display = 'none';
    }
    if (comparisonBars) {
      comparisonBars.style.display = 'none';
    }
  } else {
    if (payoffBanner) {
      payoffBanner.style.display = 'block';
    }
    if (comparisonBars) {
      comparisonBars.style.display = 'block';
    }
  }

  // ── Summary text ──
  const summaryEl = el('payoff-summary');
  if (summaryEl) {
    if (payoffOption === 'original') {
      summaryEl.innerHTML = '';
    } else {
      let summaryText = 'The remaining balance is ' + formatCurrency(remainingBalance) + '. ';
      if (payoffOption === 'extra' && hasAnyExtra) {
        summaryText +=
          'By paying extra ' +
          formatCurrency(extraMonthly) +
          ' per month starting now, the loan will be paid off in <b>' +
          payoffYears +
          ' years and ' +
          payoffMonthsRem +
          ' months</b>. It is <b>' +
          Math.floor(savedMonths / 12) +
          ' years and ' +
          (savedMonths % 12) +
          ' months earlier</b>. This results in savings of <b>' +
          formatCurrency(interestSaved) +
          '</b> in interest.';
      } else if (payoffOption === 'biweekly') {
        summaryText +=
          'By switching to biweekly payments of ' +
          formatCurrency(biweeklyPayment) +
          ', the loan will be paid off in <b>' +
          payoffYears +
          ' years and ' +
          payoffMonthsRem +
          ' months</b>.';
      }
      summaryEl.innerHTML = summaryText;
    }
  }

  // ── Comparison bars ──
  let barsHtml = '';
  if (interestSaved > 0 && payoffOption !== 'original') {
    barsHtml = '<table class="cinfoT" width="100%"><tr align="center">';
    barsHtml += '<th width="50%">Interest savings<br>' + formatCurrency(interestSaved) + '</th>';
    barsHtml +=
      '<th width="50%">Time savings<br>' +
      Math.floor(savedMonths / 12) +
      ' years and ' +
      (savedMonths % 12) +
      ' months</th></tr>';
    const origBarWidth = 150;
    let payoffBarWidth = Math.round(150 * (totalPayoffInterest / totalOrigInterest));
    if (payoffBarWidth > origBarWidth) {
      payoffBarWidth = origBarWidth;
    }
    const timeBarWidth = Math.round(150 * (actualPayoffMonths / originalSchedule.length));
    barsHtml +=
      '<tr><td><div class="smalltext" style="color:#888;">Original: ' +
      formatCurrency(totalOrigInterest) +
      '</div>';
    barsHtml +=
      '<div style="height:10px; width:' +
      origBarWidth +
      'px;background-color:#888;margin:3px 0px;"></div>';
    barsHtml +=
      '<div style="height:10px; width:' +
      payoffBarWidth +
      'px;background-color:#518428;margin:3px 0px;"></div>';
    barsHtml +=
      '<div class="smalltext" style="color:#518428;">With payoff: ' +
      formatCurrency(totalPayoffInterest) +
      '</div>';
    const pctSaved = Math.round((1 - totalPayoffInterest / totalOrigInterest) * 100);
    barsHtml +=
      '<div class="smalltext" style="text-align:center;padding-top:6px;">Pay ' +
      pctSaved +
      '% less on interest</div></td>';

    barsHtml +=
      '<td><div class="smalltext" style="color:#888;">Original: ' +
      Math.floor(originalSchedule.length / 12) +
      ' yrs, ' +
      (originalSchedule.length % 12) +
      ' mos</div>';
    barsHtml +=
      '<div style="height:10px; width:' +
      origBarWidth +
      'px;background-color:#888;margin:3px 0px;"></div>';
    barsHtml +=
      '<div style="height:10px; width:' +
      timeBarWidth +
      'px;background-color:#518428;margin:3px 0px;"></div>';
    barsHtml +=
      '<div class="smalltext" style="color:#518428;">With payoff: ' +
      payoffYears +
      ' yrs, ' +
      payoffMonthsRem +
      ' mos</div>';
    const timePct = Math.round((1 - actualPayoffMonths / originalSchedule.length) * 100);
    barsHtml +=
      '<div class="smalltext" style="text-align:center;padding-top:6px;">Payoff ' +
      timePct +
      '% faster</div></td>';
    barsHtml += '</tr></tbody></table>';
  }
  const barsContainer = el('comparison-bars');
  if (barsContainer) {
    barsContainer.innerHTML = barsHtml;
  }

  // ── Single-column mode for normal repayment ──
  const resultsTable1 = document.querySelector('#results-container .results-table');
  if (resultsTable1) {
    resultsTable1.classList.toggle('hide-payoff-col', payoffOption === 'original');
  }
  const headerCell1 = document.querySelector('#results-container .results-table tr.gray-row td:nth-child(2)');
  if (headerCell1) {
    headerCell1.textContent = payoffOption === 'original' ? '' : 'Original';
  }

  // ── Comparison table ──
  const setVal = function (id, val) {
    const elem = el(id);
    if (elem) {
      elem.textContent = typeof val === 'number' ? formatCurrency(val) : val;
    }
  };

  setVal('result-monthly-pay-orig', origMonthlyPayment);
  setVal('result-monthly-pay-payoff', payoffMonthlyPayment);
  setVal('result-total-payments-orig', totalOrigPayment);
  setVal('result-total-payments-payoff', totalPayoffPayment);
  setVal('result-total-interest-orig', totalOrigInterest);
  setVal('result-total-interest-payoff', totalPayoffInterest);
  setVal(
    'result-remaining-payments-orig',
    remainingBalance + totalOrigInterest - (remainingBalance + totalOrigInterest - totalOrigPayment)
  );
  setVal(
    'result-remaining-payments-payoff',
    remainingBalance + totalPayoffInterest - totalExtraPaid
  );
  setVal('result-remaining-interest-orig', totalOrigInterest);
  setVal('result-remaining-interest-payoff', totalPayoffInterest);
  setVal(
    'result-payoff-orig',
    Math.floor(originalSchedule.length / 12) + ' yrs, ' + (originalSchedule.length % 12) + ' mos'
  );
  setVal('result-payoff-payoff', payoffYears + ' yrs, ' + payoffMonthsRem + ' mos');

  // ── Amortization table ──
  const amoDiv = el('camortizationdiv1');
  if (amoDiv) {
    amoDiv.innerHTML = buildDualAmortizationTableHTML(
      originalSchedule,
      payoffSchedule,
      monthsPaidSoFar
    );
  }

  // ── Chart ──
  const showFullComparison1 = payoffOption !== 'original';
  renderPayoffLineChart(
    el('line-chart-container'),
    originalSchedule,
    payoffSchedule,
    monthsPaidSoFar,
    showFullComparison1
  );

  // Scroll to results
  const resultsAnchor = el('loanterm');
  if (resultsAnchor) {
    resultsAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Performs the mortgage payoff calculation (mode 2: unknown remaining term).
 */
function calculatePayoffFromPayment() {
  const el = function (id) {
    return document.getElementById(id);
  };

  let unpaidBalance = parseFloat(
    (el('cunpaidprincipal') ? el('cunpaidprincipal').value : '230000').replace(/,/g, '')
  );
  let monthlyPay = parseFloat(
    (el('cmonthlypayment2') ? el('cmonthlypayment2').value : '1500').replace(/,/g, '')
  );
  let intRate = parseFloat(
    (el('cinterestrate2') ? el('cinterestrate2').value : '6').replace(/,/g, '')
  );

  if (isNaN(unpaidBalance) || unpaidBalance <= 0) {
    unpaidBalance = 230000;
  }
  if (isNaN(monthlyPay) || monthlyPay <= 0) {
    monthlyPay = 1500;
  }
  if (isNaN(intRate) || intRate < 0) {
    intRate = 6;
  }

  const annualRate = intRate / 100;

  // Read payoff option
  const radios = document.getElementsByName('cpayoffoption2');
  let payoffOption = 'extra';
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      payoffOption = radios[i].value;
      break;
    }
  }

  let extraMonthly = 0;
  let extraYearly = 0;
  let extraOneTime = 0;
  if (payoffOption === 'extra') {
    extraMonthly = parseFloat(
      (el('cadditionalmonth2') ? el('cadditionalmonth2').value : '500').replace(/,/g, '')
    );
    extraYearly = parseFloat(
      (el('cadditionalyear2') ? el('cadditionalyear2').value : '0').replace(/,/g, '')
    );
    extraOneTime = parseFloat(
      (el('cadditionalonetime2') ? el('cadditionalonetime2').value : '0').replace(/,/g, '')
    );
    if (isNaN(extraMonthly)) {
      extraMonthly = 500;
    }
    if (isNaN(extraYearly)) {
      extraYearly = 0;
    }
    if (isNaN(extraOneTime)) {
      extraOneTime = 0;
    }
  }

  // Calculate remaining term
  const remainingMonths = calculateRemainingTerm(unpaidBalance, monthlyPay, annualRate);
  let remainingTermYears = remainingMonths / 12;
  if (remainingTermYears <= 0) {
    remainingTermYears = 1;
  }

  const hasAnyExtra =
    payoffOption === 'extra' && (extraMonthly > 0 || extraYearly > 0 || extraOneTime > 0);

  // Build original schedule
  const originalSchedule = buildAmortizationSchedule(
    unpaidBalance,
    annualRate,
    remainingTermYears,
    null,
    0
  );
  const totalOrigInterest =
    Math.round(
      originalSchedule.reduce((s, e) => {
        return s + e.interest;
      }, 0) * 100
    ) / 100;

  // Build payoff schedule
  const extraPayments = {
    monthly: 0,
    yearly: 0,
    yearlyMonth: 1,
    yearlyStartYear: 2026,
    oneTime: [],
  };
  if (hasAnyExtra) {
    extraPayments.monthly = extraMonthly;
    extraPayments.yearly = extraYearly;
    if (extraOneTime > 0) {
      extraPayments.oneTime.push({
        amount: extraOneTime,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      });
    }
  }

  let payoffSchedule, totalPayoffInterest, actualPayoffMonths;
  if (hasAnyExtra || payoffOption === 'biweekly') {
    if (payoffOption === 'biweekly') {
      const biweeklyPayment2 = Math.round((monthlyPay / 2) * 100) / 100;
      payoffSchedule = buildBiweeklyAmortizationSchedule(
        unpaidBalance,
        annualRate,
        biweeklyPayment2
      );
      totalPayoffInterest =
        Math.round(
          payoffSchedule.reduce((s, e) => {
            return s + e.interest;
          }, 0) * 100
        ) / 100;
      actualPayoffMonths = payoffSchedule.length;
    } else {
      payoffSchedule = buildAmortizationSchedule(
        unpaidBalance,
        annualRate,
        remainingTermYears,
        extraPayments,
        0
      );
      totalPayoffInterest =
        Math.round(
          payoffSchedule.reduce((s, e) => {
            return s + e.interest;
          }, 0) * 100
        ) / 100;
      actualPayoffMonths = payoffSchedule.length;
    }
  } else {
    payoffSchedule = originalSchedule;
    totalPayoffInterest = totalOrigInterest;
    actualPayoffMonths = originalSchedule.length;
  }

  const totalPayoffPayment = unpaidBalance + totalPayoffInterest;
  const totalOrigPayment = unpaidBalance + totalOrigInterest;
  const interestSaved = Math.round((totalOrigInterest - totalPayoffInterest) * 100) / 100;
  const savedMonths = originalSchedule.length - actualPayoffMonths;
  const payoffYears = Math.floor(actualPayoffMonths / 12);
  const payoffMonthsRem = actualPayoffMonths % 12;
  const origYears = Math.floor(originalSchedule.length / 12);
  const origMonths = originalSchedule.length % 12;

  // ── DOM updates (mode 2 results) ──
  const resultsContainer2 = el('results-container2');
  if (resultsContainer2) {
    resultsContainer2.style.display = 'block';
  }

  const setVal = function (id, val) {
    const elem = el(id);
    if (elem) {
      elem.textContent = typeof val === 'number' ? formatCurrency(val) : val;
    }
  };

  // Payoff duration in green banner (mode 2)
  const durationEl2 = el('payoff-duration-value2');
  if (durationEl2) {
    durationEl2.textContent = formatDuration(payoffYears, payoffMonthsRem);
  }

  // Normal repayment: hide comparison bars only (keep green banner)
  const payoffBanner2 = el('payoff-banner2');
  const comparisonBars2 = el('comparison-bars2');
  if (payoffOption === 'original') {
    if (comparisonBars2) {
      comparisonBars2.style.display = 'none';
    }
  } else {
    if (payoffBanner2) {
      payoffBanner2.style.display = 'block';
    }
    if (comparisonBars2) {
      comparisonBars2.style.display = 'block';
    }
  }

  const summaryEl = el('payoff-summary2');
  if (summaryEl) {
    if (payoffOption === 'original') {
      summaryEl.innerHTML = '';
      } else {
      let remTermStr =
        'The remaining term of the loan is ' + origYears + ' years and ' + origMonths + ' months. ';
      if (hasAnyExtra) {
        remTermStr +=
          'By paying extra ' +
          formatCurrency(extraMonthly) +
          ' per month starting now, the loan will be paid off in <b>' +
          payoffYears +
          ' years and ' +
          payoffMonthsRem +
          ' months</b>. It is <b>' +
          Math.floor(savedMonths / 12) +
          ' years earlier</b>. This results in savings of <b>' +
          formatCurrency(interestSaved) +
          '</b> in interest.';
      } else if (payoffOption === 'biweekly') {
        const biweeklyPayment2 = Math.round((monthlyPay / 2) * 100) / 100;
        remTermStr +=
          'By switching to biweekly payments of ' +
          formatCurrency(biweeklyPayment2) +
          ', the loan will be paid off in <b>' +
          payoffYears +
          ' years and ' +
          payoffMonthsRem +
          ' months</b>.';
      }
      summaryEl.innerHTML = remTermStr;
    }
  }

  // Comparison bars (mode 2)
  let barsHtml = '';
  if (interestSaved > 0) {
    barsHtml = '<table class="cinfoT" width="100%"><tr align="center">';
    barsHtml += '<th width="50%">Interest savings<br>' + formatCurrency(interestSaved) + '</th>';
    barsHtml +=
      '<th width="50%">Time savings<br>' + Math.floor(savedMonths / 12) + ' years</th></tr>';
    const origBarWidth = 150;
    let payoffBarWidth = Math.round(150 * (totalPayoffInterest / totalOrigInterest));
    if (payoffBarWidth > origBarWidth) {
      payoffBarWidth = origBarWidth;
    }
    const timeBarWidth = Math.round(150 * (actualPayoffMonths / originalSchedule.length));
    barsHtml +=
      '<tr><td><div class="smalltext" style="color:#888;">Original: ' +
      formatCurrency(totalOrigInterest) +
      '</div>';
    barsHtml +=
      '<div style="height:10px; width:' +
      origBarWidth +
      'px;background-color:#888;margin:3px 0px;"></div>';
    barsHtml +=
      '<div style="height:10px; width:' +
      payoffBarWidth +
      'px;background-color:#518428;margin:3px 0px;"></div>';
    barsHtml +=
      '<div class="smalltext" style="color:#518428;">With payoff: ' +
      formatCurrency(totalPayoffInterest) +
      '</div></td>';
    barsHtml +=
      '<td><div class="smalltext" style="color:#888;">Original: ' +
      origYears +
      ' yrs, ' +
      origMonths +
      ' mos</div>';
    barsHtml +=
      '<div style="height:10px; width:' +
      origBarWidth +
      'px;background-color:#888;margin:3px 0px;"></div>';
    barsHtml +=
      '<div style="height:10px; width:' +
      timeBarWidth +
      'px;background-color:#518428;margin:3px 0px;"></div>';
    barsHtml +=
      '<div class="smalltext" style="color:#518428;">With payoff: ' +
      payoffYears +
      ' yrs, ' +
      payoffMonthsRem +
      ' mos</div></td>';
    barsHtml += '</tr></table>';
  }
  const barsContainer2 = el('comparison-bars2');
  if (barsContainer2) {
    barsContainer2.innerHTML = barsHtml;
  }

  // ── Single-column mode for normal repayment ──
  const resultsTable2 = document.querySelector('#results-container2 .results-table');
  if (resultsTable2) {
    resultsTable2.classList.toggle('hide-payoff-col', payoffOption === 'original');
  }
  const headerCell2 = document.querySelector('#results-container2 .results-table tr.gray-row td:nth-child(2)');
  if (headerCell2) {
    headerCell2.textContent = payoffOption === 'original' ? '' : 'Original';
  }

  // Comparison table (mode 2)
  setVal('result-remaining-term-orig', origYears + ' yrs, ' + origMonths + ' mos');
  setVal('result-remaining-term-payoff', payoffYears + ' yrs, ' + payoffMonthsRem + ' mos');
  setVal('result-total-payments2-orig', totalOrigPayment);
  setVal('result-total-payments2-payoff', totalPayoffPayment);
  setVal('result-total-interest2-orig', totalOrigInterest);
  setVal('result-total-interest2-payoff', totalPayoffInterest);

  // Amortization table (mode 2)
  const amoDiv2 = el('camortizationdiv2');
  if (amoDiv2) {
    amoDiv2.innerHTML = buildDualAmortizationTableHTML(originalSchedule, payoffSchedule, 0);
  }

  // Chart (mode 2)
  const showFullComparison2 = payoffOption !== 'original';
  renderPayoffLineChart(
    el('line-chart-container2'),
    originalSchedule,
    payoffSchedule,
    0,
    showFullComparison2
  );

  const resultsAnchor2 = el('monthlypay');
  if (resultsAnchor2) {
    resultsAnchor2.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Renders an SVG line chart comparing original vs payoff schedules.
 * @param container
 * @param originalSchedule
 * @param payoffSchedule
 * @param monthsPaidSoFar
 * @param {boolean} showFullComparison - true for extra/biweekly (4 lines), false for normal (2 lines)
 */
function renderPayoffLineChart(container, originalSchedule, payoffSchedule, monthsPaidSoFar, showFullComparison = true) {
  if (!container || !originalSchedule || originalSchedule.length === 0) {
    if (container) {
      container.innerHTML = '';
    }
    return;
  }

  const svgWidth = 700;
  const svgHeight = 230;
  const padding = { top: 10, right: 10, bottom: 35, left: 55 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  // Build yearly data points
  const origData = [];
  const payoffData = [];
  let cumOrigInterest = 0;
  let cumPayoffInterest = 0;

  const maxLen = Math.max(originalSchedule.length, payoffSchedule.length);

  // Prepend year-0 starting point so lines begin at the y-axis
  const startBalance = originalSchedule[0] ? originalSchedule[0].balance : 0;
  origData.push({ year: 0, balance: startBalance, interest: 0 });
  payoffData.push({ year: 0, balance: startBalance, interest: 0 });
  let termYears = Math.ceil(maxLen / 12);
  if (termYears < 1) {
    termYears = 1;
  }

  for (let m = 0; m < maxLen; m++) {
    if (originalSchedule[m]) {
      cumOrigInterest += originalSchedule[m].interest;
    }
    if (payoffSchedule[m]) {
      cumPayoffInterest += payoffSchedule[m].interest;
    }

    const isYearEnd = (m + 1) % 12 === 0 || m === maxLen - 1;
    if (isYearEnd) {
      const yearNum = Math.ceil((m + 1) / 12);
      origData.push({
        year: yearNum,
        balance: originalSchedule[m] ? originalSchedule[m].balance : 0,
        interest: cumOrigInterest,
      });
      payoffData.push({
        year: yearNum,
        balance: payoffSchedule[m] ? payoffSchedule[m].balance : 0,
        interest: cumPayoffInterest,
      });
    }
  }

  // Trim trailing zero-balance points so lines stop when loan is paid off
  function trimTrailingZeros(data) {
    if (data.length === 0) {
      return data;
    }
    let lastNonZero = data.length - 1;
    while (lastNonZero > 0 && data[lastNonZero].balance === 0 && data[lastNonZero - 1].balance === 0) {
      lastNonZero--;
    }
    return data.slice(0, lastNonZero + 1);
  }
  const trimmedOrigData = trimTrailingZeros(origData);
  const trimmedPayoffData = trimTrailingZeros(payoffData);

  // Find max Y value from trimmed data
  let maxVal = 0;
  trimmedOrigData.concat(trimmedPayoffData).forEach(d => {
    if (d.balance > maxVal) {
      maxVal = d.balance;
    }
    if (d.interest > maxVal) {
      maxVal = d.interest;
    }
  });
  const yMax = Math.ceil(maxVal / 100000) * 100000 || 100000;

  const xScale = function (year) {
    return padding.left + (year / termYears) * chartW;
  };
  const yScale = function (val) {
    return padding.top + chartH - (val / yMax) * chartH;
  };
  const formatK = function (val) {
    return Math.round(val / 1000) + 'K';
  };

  let svg = '<svg width="' + svgWidth + '" height="' + svgHeight + '">';
  svg +=
    '<style>' +
    '.pclgrid{stroke:#999;stroke-width:0.5;}' +
    '.pcllegend{font-size:14px;font-family:arial,helvetica,sans-serif;fill:#0d233a;}' +
    '.pcltitle{fill:#000;font-family:arial,helvetica,sans-serif;font-size:15px;dominant-baseline:middle;text-anchor:middle;}' +
    '.pcllabely{fill:#666;font-family:arial,helvetica,sans-serif;font-size:12px;dominant-baseline:middle;text-anchor:end;}' +
    '.pcllabelx{fill:#666;font-family:arial,helvetica,sans-serif;font-size:12px;dominant-baseline:hanging;text-anchor:middle;}' +
    '</style>';

  svg +=
    '<text x="' +
    (padding.left + chartW / 2) +
    '" y="' +
    (svgHeight - 8) +
    '" class="pcltitle">Year</text>';

  for (let yi = 0; yi <= 4; yi++) {
    const yVal = (yi / 4) * yMax;
    const yPos = yScale(yVal);
    svg +=
      '<line x1="' +
      padding.left +
      '" y1="' +
      yPos +
      '" x2="' +
      (padding.left + chartW) +
      '" y2="' +
      yPos +
      '" class="pclgrid"></line>';
    svg +=
      '<text x="' +
      (padding.left - 8) +
      '" y="' +
      yPos +
      '" class="pcllabely">' +
      formatK(yVal) +
      '</text>';
  }

  const xTickInterval = Math.max(1, Math.floor(termYears / 6));
  for (let xi = 0; xi <= termYears; xi += xTickInterval) {
    const xPos = xScale(xi);
    svg +=
      '<line x1="' +
      xPos +
      '" y1="' +
      padding.top +
      '" x2="' +
      xPos +
      '" y2="' +
      (padding.top + chartH) +
      '" class="pclgrid"></line>';
    svg +=
      '<text x="' +
      xPos +
      '" y="' +
      (padding.top + chartH + 5) +
      '" class="pcllabelx">' +
      xi +
      '</text>';
  }

  // Build lines array based on showFullComparison
  const lines = [];
  lines.push({ key: 'balance', data: trimmedOrigData, color: '#2b7ddb', label: 'Old Balance' });
  lines.push({ key: 'interest', data: trimmedOrigData, color: '#0d233a', label: 'Old Interest' });
  if (showFullComparison) {
    lines.push({ key: 'balance', data: trimmedPayoffData, color: '#8bbc21', label: 'New Balance' });
    lines.push({ key: 'interest', data: trimmedPayoffData, color: '#910000', label: 'New Interest' });
  }

  lines.forEach(lineInfo => {
    let pathD = '';
    lineInfo.data.forEach((d, i) => {
      const x = xScale(d.year);
      const y = yScale(d[lineInfo.key]);
      pathD += (i === 0 ? 'M ' : ' L ') + x + ' ' + y;
    });
    svg +=
      '<path d="' +
      pathD +
      '" fill="none" stroke="' +
      lineInfo.color +
      '" stroke-width="3"></path>';
  });

  svg +=
    '<rect x="' +
    padding.left +
    '" y="' +
    padding.top +
    '" width="' +
    chartW +
    '" height="' +
    chartH +
    '" style="stroke:#666;stroke-width:0.5;fill:none;"></rect>';

  // Legend background + items
  const legendLines = lines.length;
  const legendBgHeight = legendLines * 22 + 10;
  svg +=
    '<rect x="' +
    (padding.left + 3) +
    '" y="' +
    (padding.top + 8) +
    '" width="140" height="' +
    legendBgHeight +
    '" rx="3" fill="white" fill-opacity="0.85" stroke="#ccc" stroke-width="0.5"></rect>';

  let legY = padding.top + 15;
  lines.forEach(lineInfo => {
    svg +=
      '<rect x="' +
      (padding.left + 5) +
      '" y="' +
      legY +
      '" width="16" height="5" style="fill:' +
      lineInfo.color +
      ';"></rect>';
    svg +=
      '<text x="' +
      (padding.left + 27) +
      '" y="' +
      (legY + 6) +
      '" class="pcllegend">' +
      lineInfo.label +
      '</text>';
    legY += 22;
  });

  svg += '</svg>';
  container.innerHTML = svg;
}

/**
 * Builds a biweekly amortization schedule and converts it to approximate monthly data points.
 *
 * @param {number} balance          - Starting unpaid principal balance
 * @param {number} annualRate       - Annual interest rate as decimal
 * @param {number} biweeklyPayment  - Payment amount every 2 weeks
 * @returns {Array<{ month, interest, principal, balance }>}
 */
function buildBiweeklyAmortizationSchedule(balance, annualRate, biweeklyPayment) {
  const monthlySchedule = [];
  let bBalance = balance;
  const biweeklyRate = annualRate / 26;
  let totalPeriods = 0;

  while (bBalance > 0.005 && totalPeriods < 1200) {
    totalPeriods++;
    const interest = Math.round(bBalance * biweeklyRate * 100) / 100;
    let principal = Math.round((biweeklyPayment - interest) * 100) / 100;
    if (principal < 0) {
      principal = 0;
    }
    bBalance = Math.round((bBalance - principal) * 100) / 100;
    if (bBalance < 0) {
      bBalance = 0;
    }

    const monthIdx = Math.floor((totalPeriods - 1) / 2);
    if (!monthlySchedule[monthIdx]) {
      monthlySchedule[monthIdx] = {
        month: monthIdx + 1,
        interest: 0,
        principal: 0,
        balance: bBalance,
      };
    }
    monthlySchedule[monthIdx].interest += interest;
    monthlySchedule[monthIdx].principal += principal;
    monthlySchedule[monthIdx].balance = bBalance;

    if (bBalance <= 0.005) {
      break;
    }
  }

  return monthlySchedule.map(e => {
    return {
      month: e.month,
      interest: Math.round(e.interest * 100) / 100,
      principal: Math.round(e.principal * 100) / 100,
      balance: Math.round(e.balance * 100) / 100,
    };
  });
}

/**
 * Formats years and months into a human-readable duration string.
 *
 * @param {number} years  - Number of years
 * @param {number} months - Number of months (0-11)
 * @returns {string} Formatted string, e.g. "15 years and 3 months"
 */
function formatDuration(years, months) {
  const parts = [];
  if (years > 0) {
    parts.push(years + (years === 1 ? ' year' : ' years'));
  }
  if (months > 0) {
    parts.push(months + (months === 1 ? ' month' : ' months'));
  }
  if (parts.length === 0) {
    parts.push('0 months');
  }
  return parts.join(' and ');
}

/**
 * Toggles the visibility of the amortization table for mode 1 (known term).
 */
function toggleAmortization1() {
  const div = document.getElementById('camortizationdiv1');
  const link = document.getElementById('camortization-link1');
  if (!div) {
    return;
  }

  const isHidden = div.style.display === 'none' || div.style.display === '';
  div.style.display = isHidden ? 'block' : 'none';
  if (link) {
    link.textContent = isHidden ? 'Hide Amortization Table' : 'View Amortization Table';
  }
}

/**
 * Toggles the visibility of the amortization table for mode 2 (unknown term).
 */
function toggleAmortization2() {
  const div = document.getElementById('camortizationdiv2');
  const link = document.getElementById('camortization-link2');
  if (!div) {
    return;
  }

  const isHidden = div.style.display === 'none' || div.style.display === '';
  div.style.display = isHidden ? 'block' : 'none';
  if (link) {
    link.textContent = isHidden ? 'Hide Amortization Table' : 'View Amortization Table';
  }
}

/* ========================================================================
   SECTION 4 — Form clear
   ======================================================================== */

function clearForm() {
  const ids = [
    'cloanamount',
    'cloanterm',
    'cinterestrate',
    'cremainingyear',
    'cremainingmonth',
    'cadditionalmonth',
    'cadditionalyear',
    'cadditionalonetime',
  ];
  ids.forEach(id => {
    const e = document.getElementById(id);
    if (e) {
      e.value = '';
    }
  });
}

function clearForm2() {
  const ids = [
    'cunpaidprincipal',
    'cmonthlypayment2',
    'cinterestrate2',
    'cadditionalmonth2',
    'cadditionalyear2',
    'cadditionalonetime2',
  ];
  ids.forEach(id => {
    const e = document.getElementById(id);
    if (e) {
      e.value = '';
    }
  });
}

/* ========================================================================
   SECTION 5 — Initialisation
   ======================================================================== */

// eslint-disable-next-line no-unused-vars -- called from HTML <script> tag
function initMortgagePayoffCalculator() {
  const now = new Date();
  const currYear = now.getFullYear();

  // Set year fields
  const yearIds = [
    'cadditionalyear',
    'cadditionalyear2',
    'cadditionalonetime',
    'cadditionalonetime2',
  ];
  yearIds.forEach(id => {
    const e = document.getElementById(id);
    if (e && !e.value) {
      e.value = String(currYear);
    }
  });

  // Initialize comma formatting
  const numberIds = [
    'cloanamount',
    'cloanterm',
    'cinterestrate',
    'cremainingyear',
    'cremainingmonth',
    'cadditionalmonth',
    'cadditionalyear',
    'cadditionalonetime',
    'cunpaidprincipal',
    'cmonthlypayment2',
    'cinterestrate2',
    'cadditionalmonth2',
    'cadditionalyear2',
    'cadditionalonetime2',
  ];
  numberIds.forEach(id => {
    proComma2(id);
  });

  // Wire radio change events
  const radios1 = document.getElementsByName('cpayoffoption');
  for (let i = 0; i < radios1.length; i++) {
    radios1[i].addEventListener('change', cpayoffoptionChange);
  }
  const radios2 = document.getElementsByName('cpayoffoption2');
  for (let j = 0; j < radios2.length; j++) {
    radios2[j].addEventListener('change', cpayoffoptionChange2);
  }

  cpayoffoptionChange();
  cpayoffoptionChange2();

  window.calculatePayoff = calculatePayoff;
  window.calculatePayoffFromPayment = calculatePayoffFromPayment;
  window.clearForm = clearForm;
  window.clearForm2 = clearForm2;
  window.cpayoffoptionChange = cpayoffoptionChange;
  window.cpayoffoptionChange2 = cpayoffoptionChange2;
  window.toggleAmortization1 = toggleAmortization1;
  window.toggleAmortization2 = toggleAmortization2;

  calculatePayoff();
  calculatePayoffFromPayment();
}

/* ========================================================================
   SECTION 6 — Exports
   ======================================================================== */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateMonthlyPayment,
    buildAmortizationSchedule,
    calculateRemainingBalance,
    calculateRemainingTerm,
    formatCurrency,
    buildDualAmortizationTableHTML,
    insertComma2,
    proComma2,
  };
}
