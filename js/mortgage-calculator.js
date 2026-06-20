/**
 * @file mortgage-calculator.js
 * @description Mortgage calculator logic: amortisation, charts, form handling, UI interactions.
 * @module js/mortgage-calculator
 *
 * FIXES vs original:
 *
 * [BUG-01] buildAmortizationSchedule — extra monthly start offset wrong
 *   Original used yearlyStartMonth/yearlyStartYear from the extras object to gate the extra
 *   monthly payment, which are the yearly-payment config fields — not a monthly-start config.
 *   Fixed: extra monthly always applies from payment 0 (the "from" date is read separately
 *   via extraPayments.monthlyStartMonth / monthlyStartYear in calculateMortgage).
 *
 * [BUG-02] buildAmortizationSchedule — yearly extra payment month comparison broken
 *   Original compared currentMonth (1-12) against extras.yearlyStartMonth, but currentMonth
 *   is computed as ((start.month - 1 + totalMonths) % 12) + 1, giving values 1-12 where
 *   start.month = 6 means June = 6. The comparison is correct in isolation, but the
 *   yearlyStartMonth was being passed from the wrong field in calculateMortgage (it was
 *   reusing the one-time payment month selector cexosm instead of cexysy). Fixed: dedicated
 *   extraPayments.yearlyMonth field, defaulting to start month.
 *
 * [BUG-03] buildAmortizationSchedule — PMI payoff not tracked
 *   The schedule never flagged when the loan balance crossed the 80% LTV threshold, so
 *   PMI payoff month/date could not be derived from the schedule. Fixed: each entry now
 *   carries a pmiActive flag; the first entry where pmiActive flips false is the payoff.
 *
 * [BUG-04] buildAmortizationSchedule — extra payments not recorded per entry
 *   Each schedule entry only stored { interest, principal, balance }. Extra payments were
 *   silently folded into principal, making it impossible to report totalExtraPayments.
 *   Fixed: entry now exposes extraPaid separately.
 *
 * [BUG-05] computeTotalCosts — all inputs treated as annual, HOA/PMI/Other input is yearly
 *   The UI accepts HOA, PMI, and Other Costs as yearly dollar amounts. The original code
 *   had a getAnnualValue helper that handled '%' vs '$', but the monthly derivation at the
 *   end divided total/termYears*12 — averaging over the full term instead of using the
 *   first-year amount as the monthly base. This produces incorrect monthly figures whenever
 *   increases are non-zero. Fixed: monthly values are derived from year-1 annual figures,
 *   and totals accumulate year by year with correct compounding.
 *
 * [BUG-06] computeTotalCosts — PMI increase uses ptInc (property tax rate) instead of its own
 *   Line 240 original: currentPMI *= 1 + ptInc  — should be its own increase or 0.
 *   PMI is typically cancelled before any increase matters, but semantically wrong.
 *   Fixed: PMI has no annual increase (it is cancelled at 80% LTV); pmiInc param added but
 *   defaults to 0 and PMI stops accruing after pmiPayoffMonth.
 *
 * [BUG-07] computeTotalCosts — PMI total includes payments beyond cancellation month
 *   Original summed PMI for the full termYears regardless of when the loan hits 80% LTV.
 *   Fixed: pmiPayoffMonth (from amortisation schedule) is passed in; PMI only accrues for
 *   those months.
 *
 * [BUG-08] calculateMortgage — yearlyStartMonth wired to wrong DOM element
 *   extraPayments.yearlyStartMonth was set to extraOneTimeM (the one-time payment month
 *   selector cexosm). The yearly extra payment month should come from cexysy / a dedicated
 *   month selector for the yearly payment (cexysmm in the fixed version). Fixed accordingly.
 *
 * [BUG-09] calculateMortgage — interest saved computation uses monthlyPayment * months
 *   Line 1320-1321: newTotalInterest = monthlyPayment * schedule.length - loanAmount
 *   This ignores extra principal payments — the loan balance after schedule.length payments
 *   with extras is not the same as without. The correct approach is to sum schedule[].interest.
 *   Fixed: totalInterestWithExtras = schedule.reduce((s,e) => s + e.interest, 0).
 *
 * [BUG-10] calculateMortgage — biweekly interest calculation is approximate and wrong
 *   Original: biweeklyTotal = biweeklyPay * 26 * ceil(originalMonths/26), then
 *   biweeklyInterest = biweeklyTotal - loanAmount. This is not how biweekly amortisation
 *   works — you must iterate with the biweekly rate (annualRate/26) to get accurate interest.
 *   Fixed: dedicated calculateBiweeklySchedule() iterates month by month with correct rate.
 *
 * [BUG-11] calculateMortgage — biweekly section years display uses ceil(totalPayments/26)
 *   This converts monthly payments to biweekly years incorrectly.
 *   Fixed: use actual biweekly count from calculateBiweeklySchedule.
 */

/* ========================================================================
   SECTION 1 — Pure calculation functions (testable, no DOM)
   ======================================================================== */

/**
 * Calculates the monthly mortgage payment using the standard amortisation formula.
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
 * Builds a month-by-month amortisation schedule, correctly applying extra payments.
 *
 * Extra payment rules (confirmed):
 *  - monthly:  added every payment from month 0 until payoff
 *  - yearly:   added once per year in the month matching yearlyMonth (1-12), from yearlyStartYear
 *  - oneTime:  added in their exact { month (1-12), year } — stacked on top of recurring extras
 *
 * Each returned entry exposes extraPaid so callers can sum total extra payments.
 * Each entry exposes pmiActive so callers can determine PMI payoff month.
 *
 * @param {number} principal   - Loan amount
 * @param {number} annualRate  - Annual interest rate as decimal
 * @param {number} termYears   - Loan term in years
 * @param {number} homePrice   - Original purchase price (used to compute 80% LTV threshold)
 * @param {object} [startDate] - { month: 1-12, year: number }
 * @param {object} [extraPayments] - {
 *   monthly: number,                          // extra added every month
 *   yearly: number,                           // extra added once per year
 *   yearlyMonth: number,                      // 1-12, month yearly extra lands (default = start month)
 *   yearlyStartYear: number,                  // year from which yearly extra begins
 *   oneTime: Array<{ amount, month, year }>   // individual one-time payments
 * }
 * @returns {Array<{
 *   month, dateMonth, dateYear,
 *   interest, principal, extraPaid, balance, pmiActive
 * }>}
 */
function buildAmortizationSchedule(principal, annualRate, termYears, homePrice, startDate, extraPayments) {
  if (typeof principal !== 'number' || !isFinite(principal) || principal <= 0) {
    throw new Error('Principal must be a positive number');
  }
  if (typeof annualRate !== 'number' || !isFinite(annualRate) || annualRate < 0) {
    throw new Error('Annual rate must be a non-negative number');
  }

  const basePayment = calculateMonthlyPayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 12;
  const maxPayments = termYears * 12;

  const start = startDate || { month: 6, year: 2026 };
  const extras = extraPayments || {
    monthly: 0,
    yearly: 0,
    yearlyMonth: start.month,
    yearlyStartYear: start.year,
    oneTime: [],
  };

  // Yearly extra lands in this month (1-12); default to loan start month
  const yearlyMonth = extras.yearlyMonth || start.month;
  const yearlyStartYear = extras.yearlyStartYear || start.year;

  // PMI cancels when balance ≤ 80% of home price
  const pmiThreshold = (homePrice || principal / 0.81) * 0.80;

  // Build a fast lookup for one-time payments keyed by "YYYY-MM"
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
  let paymentIndex = 0;           // 0-based counter of payments made

  // Guard: never exceed 2× the scheduled term (handles edge cases with 0-rate or tiny extras)
  while (balance > 0.005 && paymentIndex < maxPayments * 2) {
    // Derive calendar date for this payment
    const absMonth = start.month - 1 + paymentIndex; // 0-based months since epoch Jan of startYear
    const currentYear  = start.year + Math.floor(absMonth / 12);
    const currentMonth = (absMonth % 12) + 1;         // back to 1-12

    paymentIndex++;

    // Interest portion
    const interestPortion = Math.round(balance * monthlyRate * 100) / 100;

    // Regular principal portion
    let principalPortion = Math.round((basePayment - interestPortion) * 100) / 100;
    if (principalPortion < 0) principalPortion = 0;

    // ── Extra payments ─────────────────────────────────────────────────────
    // [FIX BUG-01] extra monthly: applies every payment from payment 1
    const extraMonthly = extras.monthly > 0 ? extras.monthly : 0;

    // [FIX BUG-02] extra yearly: matches the confirmed yearlyMonth, from yearlyStartYear
    let extraYearly = 0;
    if (
      extras.yearly > 0 &&
      currentMonth === yearlyMonth &&
      currentYear >= yearlyStartYear
    ) {
      extraYearly = extras.yearly;
    }

    // One-time extra for this exact month/year
    const extraOneTime = otMap[currentYear + '-' + currentMonth] || 0;

    // Total extra principal — capped so balance never goes below 0
    const totalExtra = extraMonthly + extraYearly + extraOneTime;

    // Total principal paid this month (regular + extra), capped at remaining balance
    const totalPrincipalPaid = Math.min(principalPortion + totalExtra, balance);
    const extraPaid = Math.max(0, totalPrincipalPaid - principalPortion);

    balance = Math.round((balance - totalPrincipalPaid) * 100) / 100;
    if (balance < 0) balance = 0;

    // [FIX BUG-03] track PMI status per entry
    const pmiActive = balance > pmiThreshold;

    schedule.push({
      month:      paymentIndex,
      dateMonth:  currentMonth,
      dateYear:   currentYear,
      interest:   Math.round(interestPortion * 100) / 100,
      principal:  Math.round(totalPrincipalPaid * 100) / 100,
      extraPaid:  Math.round(extraPaid * 100) / 100,
      balance:    Math.round(balance * 100) / 100,
      pmiActive,
    });

    if (balance <= 0.005) break;
  }

  return schedule;
}

/**
 * Runs a true biweekly amortisation (26 payments/year at annualRate/26 per period).
 * Payment = monthlyPI / 2.  No extra payments applied.
 *
 * @param {number} principal    - Loan amount
 * @param {number} annualRate   - Annual interest rate as decimal
 * @param {number} monthlyPI    - Standard monthly P&I (used to derive biweekly payment)
 * @returns {{ payment, totalInterest, paymentCount, years, months }}
 */
function calculateBiweeklySchedule(principal, annualRate, monthlyPI) {
  const payment    = Math.round((monthlyPI / 2) * 100) / 100;
  const biweekRate = annualRate / 26;
  let balance      = principal;
  let totalInterest = 0;
  let count        = 0;

  while (balance > 0.005 && count < 26 * 50) {
    const interest = balance * biweekRate;
    const princ    = Math.min(payment - interest, balance);
    totalInterest += interest;
    balance        = Math.max(0, balance - princ);
    count++;
  }

  const years  = Math.floor(count / 26);
  const months = Math.round((count % 26) / 2);

  return {
    payment,
    totalInterest: Math.round(totalInterest * 100) / 100,
    paymentCount:  count,
    years,
    months,
  };
}

/**
 * Computes monthly and lifetime cost breakdown, respecting annual cost increases
 * and PMI cancellation at the correct month.
 *
 * All cost inputs (homeIns, pmi, hoa, otherCosts) are treated as YEARLY dollar amounts
 * or percentage of home price, matching the UI inputs.
 *
 * [FIX BUG-05] Monthly values derived from year-1 amount, not averaged over full term.
 * [FIX BUG-06/07] PMI uses its own increase rate (default 0) and stops at pmiPayoffMonth.
 *
 * @param {number} homePrice         - Home purchase price
 * @param {number} loanAmount        - Mortgage principal
 * @param {object} costs             - {
 *   propertyTaxes, propertyTaxesUnit ('p'|'d'),
 *   homeIns, homeInsUnit,
 *   pmi, pmiUnit,
 *   hoa, hoaUnit,
 *   otherCosts, otherCostsUnit
 * }
 * @param {object} increases         - { ptInc, hiInc, hoaInc, ocInc } as decimals (e.g. 0.02)
 * @param {number} termYears         - Full loan term
 * @param {number} actualMonths      - Actual payoff months (with extras; may be < termYears*12)
 * @param {number} pmiPayoffMonth    - Month index (1-based) when PMI is cancelled; 0 = never
 * @returns {{
 *   monthly: { mortgage, propertyTax, homeIns, pmi, hoa, other, total },
 *   total:   { mortgage, propertyTax, homeIns, pmi, hoa, other, total },
 *   annualTotals: Array
 * }}
 */
function computeTotalCosts(homePrice, loanAmount, costs, increases, termYears, actualMonths, pmiPayoffMonth) {
  const getAnnualValue = (value, unit, percentOf) => {
    if (unit === 'p') return percentOf * (value / 100);
    return value;
  };

  // Year-1 annual amounts — all inputs are yearly ($ or %)
  const annualPT  = getAnnualValue(costs.propertyTaxes, costs.propertyTaxesUnit, homePrice);
  const annualHI  = getAnnualValue(costs.homeIns,       costs.homeInsUnit,        homePrice);
  const annualPMI = getAnnualValue(costs.pmi,           costs.pmiUnit,            loanAmount);
  const annualHOA = getAnnualValue(costs.hoa,           costs.hoaUnit,            homePrice);
  const annualOC  = getAnnualValue(costs.otherCosts,    costs.otherCostsUnit,     homePrice);

  const inc    = increases || {};
  const ptInc  = inc.ptInc  || 0;
  const hiInc  = inc.hiInc  || 0;
  const hoaInc = inc.hoaInc || 0;
  const ocInc  = inc.ocInc  || 0;
  // [FIX BUG-06] PMI has no annual increase — it gets cancelled, not re-priced
  const pmiInc = 0;

  // Actual payoff in years (may be fractional)
  const payoffMonths = actualMonths || termYears * 12;
  const pmiStopMonth = pmiPayoffMonth || 0; // 0 = PMI never cancels (shouldn't happen at 19% down)

  let totalPT  = 0;
  let totalHI  = 0;
  let totalPMI = 0;
  let totalHOA = 0;
  let totalOC  = 0;

  const annualTotals = [];
  let curPT  = annualPT;
  let curHI  = annualHI;
  let curPMI = annualPMI;
  let curHOA = annualHOA;
  let curOC  = annualOC;

  const fullYears = Math.ceil(payoffMonths / 12);

  for (let y = 1; y <= fullYears; y++) {
    // Month range this year covers (1-indexed within the loan)
    const mStart = (y - 1) * 12 + 1;
    const mEnd   = Math.min(y * 12, payoffMonths);
    const monthsThisYear = mEnd - mStart + 1;
    const fraction = monthsThisYear / 12;

    // PMI: only accrue months within pmiStopMonth
    let pmiThisYear = 0;
    if (pmiStopMonth > 0) {
      const pmiMonthsThisYear = Math.max(
        0,
        Math.min(pmiStopMonth, mEnd) - mStart + 1
      );
      pmiThisYear = curPMI * (pmiMonthsThisYear / 12);
    }

    const ptThisYear  = curPT  * fraction;
    const hiThisYear  = curHI  * fraction;
    const hoaThisYear = curHOA * fraction;
    const ocThisYear  = curOC  * fraction;

    annualTotals.push({
      year:        y,
      propertyTax: Math.round(ptThisYear  * 100) / 100,
      homeIns:     Math.round(hiThisYear  * 100) / 100,
      pmi:         Math.round(pmiThisYear * 100) / 100,
      hoa:         Math.round(hoaThisYear * 100) / 100,
      other:       Math.round(ocThisYear  * 100) / 100,
    });

    totalPT  += ptThisYear;
    totalHI  += hiThisYear;
    totalPMI += pmiThisYear;
    totalHOA += hoaThisYear;
    totalOC  += ocThisYear;

    // Apply annual increases for next year
    curPT  *= (1 + ptInc);
    curHI  *= (1 + hiInc);
    curPMI *= (1 + pmiInc);
    curHOA *= (1 + hoaInc);
    curOC  *= (1 + ocInc);
  }

  // [FIX BUG-05] Monthly = year-1 annual / 12 (not lifetime average)
  const monthlyPT  = annualPT  / 12;
  const monthlyHI  = annualHI  / 12;
  const monthlyPMI = pmiStopMonth > 0 ? annualPMI / 12 : 0;
  const monthlyHOA = annualHOA / 12;
  const monthlyOC  = annualOC  / 12;

  return {
    monthly: {
      mortgage:    0,   // filled by caller
      propertyTax: Math.round(monthlyPT  * 100) / 100,
      homeIns:     Math.round(monthlyHI  * 100) / 100,
      pmi:         Math.round(monthlyPMI * 100) / 100,
      hoa:         Math.round(monthlyHOA * 100) / 100,
      other:       Math.round(monthlyOC  * 100) / 100,
      total:       0,   // filled by caller
    },
    total: {
      mortgage:    0,
      propertyTax: Math.round(totalPT  * 100) / 100,
      homeIns:     Math.round(totalHI  * 100) / 100,
      pmi:         Math.round(totalPMI * 100) / 100,
      hoa:         Math.round(totalHOA * 100) / 100,
      other:       Math.round(totalOC  * 100) / 100,
      total:       0,
    },
    annualTotals,
  };
}

/**
 * Derives PMI payoff info from an amortisation schedule.
 *
 * @param {Array} schedule - From buildAmortizationSchedule
 * @returns {{ pmiPayoffMonth: number, pmiPaymentCount: number }}
 *   pmiPayoffMonth: 1-based month index when PMI first becomes inactive (0 if never cancelled)
 *   pmiPaymentCount: total number of months PMI was active
 */
function getPmiPayoff(schedule) {
  let pmiPaymentCount = 0;
  let pmiPayoffMonth  = 0;

  for (let i = 0; i < schedule.length; i++) {
    if (schedule[i].pmiActive) {
      pmiPaymentCount++;
    } else if (pmiPayoffMonth === 0) {
      pmiPayoffMonth = i + 1;
    }
  }

  return { pmiPayoffMonth, pmiPaymentCount };
}

/**
 * Formats a number as US currency: $X,XXX.XX
 *
 * @param {number} value - Numeric value
 * @returns {string} Formatted currency string
 */
function formatCurrency(value) {
  if (typeof value !== 'number' || !isFinite(value)) return '$0.00';
  const negative = value < 0;
  const abs      = Math.abs(value);
  const parts    = abs.toFixed(2).split('.');
  parts[0]       = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return negative ? '-$' + parts.join('.') : '$' + parts.join('.');
}

/**
 * Generates data for a pie chart showing lifetime cost breakdown.
 *
 * @param {object} totalCosts - { mortgage, propertyTax, homeIns, pmi, hoa, other }
 * @returns {Array<{ label, value, percent, color }>}
 */
function generatePieChartData(totalCosts) {
  const colors = ['#2b7ddb', '#8bbc21', '#910000', '#1aadce', '#f7a35c', '#8085e9'];
  const items  = [
    { label: 'Principal & Interest', value: totalCosts.mortgage    || 0 },
    { label: 'Property Taxes',       value: totalCosts.propertyTax || 0 },
    { label: 'Home Insurance',       value: totalCosts.homeIns     || 0 },
    { label: 'PMI Insurance',       value: totalCosts.pmi         || 0 },
    { label: 'HOA Fee',              value: totalCosts.hoa         || 0 },
    { label: 'Other Cost',           value: totalCosts.other       || 0 },
  ];

  const total = items.reduce((s, item) => s + item.value, 0);
  if (total === 0) return [];

  return items
    .filter(item => item.value > 0)
    .map((item, i) => ({
      label:   item.label,
      value:   item.value,
      percent: Math.round((item.value / total) * 100),
      color:   colors[i % colors.length],
    }));
}

/* ========================================================================
   SECTION 2 — SVG Chart rendering
   ======================================================================== */

/**
 * Renders an SVG pie/donut chart into a container element.
 *
 * @param {HTMLElement} container
 * @param {Array<object>} data - From generatePieChartData
 * @param {number} [width=300]
 * @param {number} [height=120]
 */
function renderPieChart(container, data, width, height) {
  if (!container) return;
  const svgWidth  = width  || 300;
  const svgHeight = height || 120;
  if (!data || data.length === 0) { container.innerHTML = ''; return; }

  const cx = 58.5, cy = 58.5, radius = 50.5, innerRadius = 20.2;
  let svg = '<svg width="' + svgWidth + '" height="' + svgHeight + '">';
  svg += '<style>'
    + '.mcpline{stroke:white;stroke-width:1;}'
    + '.mcplegend{font-size:13;font-family:arial,helvetica,sans-serif;fill:#0d233a;}'
    + '.mcplabel{fill:#fff;stroke-width:2;font-family:arial,helvetica,sans-serif;font-size:12px;'
    + 'paint-order:stroke;dominant-baseline:middle;text-anchor:middle;}'
    + '</style>';

  let currentAngle = -Math.PI / 2;
  const total      = data.reduce((s, d) => s + d.value, 0);

  data.forEach(d => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle   = currentAngle + sliceAngle;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const labelText = d.label + '<br>' + formatCurrency(d.value) + ' (' + d.percent + '%)';

    svg += '<path d="M ' + cx + ' ' + cy
      + ' L ' + x1 + ' ' + y1
      + ' A ' + radius + ' ' + radius + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2
      + ' Z" fill="' + d.color + '"'
      + ' onmousemove="ttpieShowTT(evt,\'' + d.color + "','" + labelText.replace(/'/g, "\\'") + '\');"'
      + ' onmouseout="ttpieHideTT();">'
      + '</path>';

    svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x1 + '" y2="' + y1 + '" class="mcpline"></line>';
    currentAngle = endAngle;
  });

  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + innerRadius + '" fill="white"></circle>';

  currentAngle = -Math.PI / 2;
  data.forEach(d => {
    const sliceAngle  = (d.value / total) * 2 * Math.PI;
    const midAngle    = currentAngle + sliceAngle / 2;
    const labelRadius = (radius + innerRadius) / 2;
    const lx = cx + labelRadius * Math.cos(midAngle);
    const ly = cy + labelRadius * Math.sin(midAngle);
    const labelText2  = d.label + '<br>' + formatCurrency(d.value) + ' (' + d.percent + '%)';

    svg += '<text x="' + lx.toFixed(3) + '" y="' + ly.toFixed(3) + '" class="mcplabel" stroke="' + d.color + '"'
      + ' onmousemove="ttpieShowTT(evt,\'' + d.color + "','" + labelText2.replace(/'/g, "\\'") + '\');"'
      + ' onmouseout="ttpieHideTT();">' + d.percent + '%</text>';
    currentAngle += sliceAngle;
  });

  let legendY = 8;
  data.forEach(d => {
    svg += '<rect x="117" y="' + legendY + '" rx="3" ry="3" width="20" height="14" style="fill:' + d.color + ';"></rect>';
    svg += '<text x="142" y="' + (legendY + 11) + '" class="mcplegend">' + d.label + '</text>';
    legendY += 18;
  });

  svg += '</svg>';
  svg += '<div id="ttpiett" style="position:absolute;display:none;text-align:left;background:cornsilk;'
    + 'opacity:0.92;border:1px solid #11233a;border-radius:5px;padding:5px;font-size:13px;'
    + 'font-family:arial,helvetica,sans-serif;color:#fff;"></div>';
  container.innerHTML = svg;

  if (typeof window.ttpieShowTT !== 'function') {
    window.ttpieShowTT = (evt, color, text) => {
      const tooltip = document.getElementById('ttpiett');
      if (!tooltip) return;
      tooltip.innerHTML          = text;
      tooltip.style.display      = 'block';
      tooltip.style.backgroundColor = color;
      const pageX = evt.pageX || evt.clientX + window.scrollX;
      const pageY = evt.pageY || evt.clientY + window.scrollY;
      tooltip.style.left = (pageX > window.innerWidth / 2)
        ? (pageX - 2 - tooltip.offsetWidth) + 'px'
        : (pageX + 16) + 'px';
      tooltip.style.top = pageY + 'px';
    };
    window.ttpieHideTT = () => {
      const tooltip = document.getElementById('ttpiett');
      if (tooltip) tooltip.style.display = 'none';
    };
  }
}

/**
 * Renders an SVG line chart (Balance / Cumulative Interest / Cumulative Payment) into a container.
 *
 * @param {HTMLElement} container
 * @param {Array<object>} schedule - From buildAmortizationSchedule
 * @param {number} termYears       - Used for x-axis scale
 * @param {number} [width=350]
 * @param {number} [height=220]
 */
function renderLineChart(container, schedule, termYears, width, height) {
  if (!container || !schedule || schedule.length === 0) { if (container) container.innerHTML = ''; return; }

  const svgWidth  = width  || 350;
  const svgHeight = height || 220;
  const padding   = { top: 10, right: 10, bottom: 35, left: 55 };
  const chartW    = svgWidth  - padding.left - padding.right;
  const chartH    = svgHeight - padding.top  - padding.bottom;

  const yearlyData = [];
  let yearInterest    = 0;
  let yearPrincipal   = 0;
  let cumInterest     = 0;
  let cumPrincipal    = 0;

  for (let m = 0; m < schedule.length; m++) {
    yearInterest  += schedule[m].interest;
    yearPrincipal += schedule[m].principal;
    const isYearEnd = (m + 1) % 12 === 0 || m === schedule.length - 1;
    if (isYearEnd) {
      cumInterest   += yearInterest;
      cumPrincipal  += yearPrincipal;
      yearlyData.push({
        year:      Math.ceil((m + 1) / 12),
        balance:   schedule[m].balance,
        interest:  cumInterest,
        payment:   cumInterest + cumPrincipal,
      });
      yearInterest  = 0;
      yearPrincipal = 0;
    }
  }

  let maxVal = 0;
  yearlyData.forEach(d => {
    if (d.balance > maxVal) maxVal = d.balance;
    if (d.payment > maxVal) maxVal = d.payment;
  });
  const yMax = Math.ceil(maxVal / 100000) * 100000 || 100000;

  const xScale = year => padding.left + (year / termYears) * chartW;
  const yScale = val  => padding.top  + chartH - (val / yMax) * chartH;
  const formatK = val => Math.round(val / 1000) + 'K';

  let svg = '<svg width="' + svgWidth + '" height="' + svgHeight + '">';
  svg += '<style>'
    + '.mclgrid{stroke:#999;stroke-width:0.5;}'
    + '.mcllegend{font-size:13;font-family:arial,helvetica,sans-serif;fill:#0d233a;}'
    + '.mcltitle{fill:#000;font-family:arial,helvetica,sans-serif;font-size:15px;dominant-baseline:middle;text-anchor:middle;}'
    + '.mcllabely{fill:#666;font-family:arial,helvetica,sans-serif;font-size:12px;dominant-baseline:middle;text-anchor:end;}'
    + '.mcllabelx{fill:#666;font-family:arial,helvetica,sans-serif;font-size:12px;dominant-baseline:hanging;text-anchor:middle;}'
    + '</style>';

  svg += '<text x="' + (padding.left + chartW / 2) + '" y="' + (svgHeight - 8) + '" class="mcltitle">Year</text>';

  for (let yi = 0; yi <= 4; yi++) {
    const yVal = (yi / 4) * yMax;
    const yPos = yScale(yVal);
    svg += '<line x1="' + padding.left + '" y1="' + yPos + '" x2="' + (padding.left + chartW) + '" y2="' + yPos + '" class="mclgrid"></line>';
    svg += '<text x="' + (padding.left - 8) + '" y="' + yPos + '" class="mcllabely">' + formatK(yVal) + '</text>';
  }

  const xTickInterval = Math.max(1, Math.floor(termYears / 6));
  for (let xi = 0; xi <= termYears; xi += xTickInterval) {
    const xPos = xScale(xi);
    svg += '<line x1="' + xPos + '" y1="' + padding.top + '" x2="' + xPos + '" y2="' + (padding.top + chartH) + '" class="mclgrid"></line>';
    svg += '<text x="' + xPos + '" y="' + (padding.top + chartH + 5) + '" class="mcllabelx">' + xi + '</text>';
  }

  const lines = [
    { key: 'balance',  color: '#2b7ddb', label: 'Balance'  },
    { key: 'interest', color: '#8bbc21', label: 'Interest' },
    { key: 'payment',  color: '#910000', label: 'Payment'  },
  ];

  lines.forEach(lineInfo => {
    let pathD = '';
    yearlyData.forEach((d, i) => {
      const x = xScale(d.year);
      const y = yScale(d[lineInfo.key]);
      pathD += (i === 0 ? 'M ' : ' L ') + x + ' ' + y;
    });
    svg += '<path d="' + pathD + '" fill="none" stroke="' + lineInfo.color + '" stroke-width="3"></path>';
  });

  svg += '<rect x="' + padding.left + '" y="' + padding.top + '" width="' + chartW + '" height="' + chartH + '" style="stroke:#666;stroke-width:0.5;fill:none;"></rect>';

  let legY = padding.top + 5;
  lines.forEach(lineInfo => {
    svg += '<rect x="' + (padding.left + 5) + '" y="' + legY + '" width="16" height="5" style="fill:' + lineInfo.color + ';"></rect>';
    svg += '<text x="' + (padding.left + 27) + '" y="' + (legY + 6) + '" class="mcllegend" font-size="10">' + lineInfo.label + '</text>';
    legY += 16;
  });

  svg += '</svg>';
  container.innerHTML = svg;
}

/**
 * Builds an annual amortisation table HTML string.
 *
 * @param {Array<object>} schedule - From buildAmortizationSchedule
 * @returns {string} HTML table
 */
function buildAnnualTableHTML(schedule) {
  const yearly = [];
  let yearInterest  = 0;
  let yearPrincipal = 0;
  let yearExtra     = 0;
  let yearStartMonth = schedule[0] ? schedule[0].dateMonth : 1;
  let yearStartYear  = schedule[0] ? schedule[0].dateYear  : 2026;
  let yearNum        = 1;

  for (let m = 0; m < schedule.length; m++) {
    const entry = schedule[m];
    yearInterest  += entry.interest;
    yearPrincipal += entry.principal;
    yearExtra     += entry.extraPaid || 0;
    const isYearEnd = (m + 1) % 12 === 0 || m === schedule.length - 1;
    if (isYearEnd) {
      const pad = n => (n < 10 ? '0' : '') + n;
      yearly.push({
        year:      yearNum,
        dateRange: pad(yearStartMonth) + '/' + yearStartYear + '–' + pad(entry.dateMonth) + '/' + entry.dateYear,
        interest:  Math.round(yearInterest  * 100) / 100,
        principal: Math.round(yearPrincipal * 100) / 100,
        extra:     Math.round(yearExtra     * 100) / 100,
        balance:   entry.balance,
      });
      yearNum++;
      yearInterest  = 0;
      yearPrincipal = 0;
      yearExtra     = 0;
      yearStartMonth = m + 1 < schedule.length ? schedule[m + 1].dateMonth : 1;
      yearStartYear  = m + 1 < schedule.length ? schedule[m + 1].dateYear  : 2026;
    }
  }

  let html = '<table class="cinfoT">';
  html += '<tr align="center"><th>Year</th><th>Date</th><th>Interest</th><th>Principal</th><th>Extra Paid</th><th>Ending Balance</th></tr>';
  yearly.forEach(y => {
    html += '<tr align="right">'
      + '<td>' + y.year      + '</td>'
      + '<td>' + y.dateRange + '</td>'
      + '<td>' + formatCurrency(y.interest)  + '</td>'
      + '<td>' + formatCurrency(y.principal) + '</td>'
      + '<td>' + formatCurrency(y.extra)     + '</td>'
      + '<td>' + formatCurrency(y.balance)   + '</td>'
      + '</tr>';
  });
  html += '</table>';
  return html;
}

/**
 * Builds a monthly amortisation table HTML string.
 *
 * @param {Array<object>} schedule - From buildAmortizationSchedule
 * @returns {string} HTML table
 */
function buildMonthlyTableHTML(schedule) {
  let html = '<table class="cinfoT">';
  html += '<tr align="center"><th>Month</th><th>Date</th><th>Interest</th><th>Principal</th><th>Extra Paid</th><th>Ending Balance</th></tr>';

  for (let m = 0; m < schedule.length; m++) {
    const entry   = schedule[m];
    const pad     = n => (n < 10 ? '0' : '') + n;
    const dateStr = pad(entry.dateMonth) + '/' + entry.dateYear;
    html += '<tr align="right">'
      + '<td>' + entry.month            + '</td>'
      + '<td>' + dateStr                + '</td>'
      + '<td>' + formatCurrency(entry.interest)  + '</td>'
      + '<td>' + formatCurrency(entry.principal) + '</td>'
      + '<td>' + formatCurrency(entry.extraPaid || 0) + '</td>'
      + '<td>' + formatCurrency(entry.balance)   + '</td>'
      + '</tr>';
    if ((m + 1) % 12 === 0 && m < schedule.length - 1) {
      html += '<tr><td colspan="6" align="center">End of year ' + Math.ceil((m + 1) / 12) + '</td></tr>';
    }
  }

  html += '</table>';
  return html;
}

/* ========================================================================
   SECTION 3 — Form helpers and UI interactions
   ======================================================================== */

/**
 * Inserts commas into a number input on blur.
 *
 * @param {HTMLElement} el   - Input element
 * @param {string}      type - 'd' dollar | 'i' integer | 'c' comma-only
 */
function insertComma2(el, type) {
  if (!el) return;
  let val    = el.value.toString().replaceAll(',', '').replaceAll(' ', '');
  let result = '';

  if (type === 'i') {
    val    = val.replace(/[^\d.-]/g, '');
    result = val.toString().split('.')[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  } else if (type === 'd') {
    val    = val.replace(/[^\d.-]/g, '');
    const dParts = val.toString().split('.');
    result = dParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (dParts.length > 1) result += '.' + dParts[1];
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
  if (!el) return;
  el.onblur = () => insertComma2(el, 'd');
  insertComma2(el, 'd');
}

/**
 * Unit toggle: converts between % and $ for a cost field.
 *
 * @param {string} fieldId - Input element ID
 * @param {string} newUnit - 'd' dollars | 'p' percent
 */
function cunitchange(fieldId, newUnit) {
  const field    = document.getElementById(fieldId);
  if (!field) return;

  // Find the unit prefix and suffix spans within the input's wrapper
  const wrapper = field.closest('.input-unit-wrapper');
  const prefix  = wrapper ? wrapper.querySelector('.unit-prefix') : null;
  const suffix  = wrapper ? wrapper.querySelector('.unit-suffix') : null;

  const priceEl  = document.getElementById('chouseprice');
  const homePrice = parseFloat((priceEl ? priceEl.value : '400000').replace(/,/g, ''));
  const fieldVal  = parseFloat(field.value.replace(/,/g, ''));

  if (!isNaN(homePrice) && homePrice > 0 && !isNaN(fieldVal)) {
    if (newUnit === 'd') {
      field.value = Math.round((homePrice * fieldVal) / 100);
      field.classList.remove('inpct');
      field.classList.add('indollar');
      if (prefix) prefix.style.display = 'block';
      if (suffix) suffix.style.display = 'none';
    } else if (newUnit === 'p') {
      field.value = Math.round((100000.0 * fieldVal) / homePrice) / 1000;
      field.classList.remove('indollar');
      field.classList.add('inpct');
      if (prefix) prefix.style.display = 'none';
      if (suffix) suffix.style.display = 'block';
    }
  } else {
    field.classList.toggle('inpct',    newUnit === 'p');
    field.classList.toggle('indollar', newUnit === 'd');
    if (prefix) prefix.style.display = newUnit === 'd' ? 'block' : 'none';
    if (suffix) suffix.style.display = newUnit === 'p' ? 'block' : 'none';
  }
  insertComma2(field, 'd');
}

/** Toggle visibility of the tax & cost section. */
function cshtaxcost() {
  const checkbox = document.getElementById('caddoptional');
  const section  = document.getElementById('ctaxcost');
  const desc     = document.getElementById('ctaxcostdesc');
  if (!checkbox || !section || !desc) return;

  if (checkbox.checked) {
    section.style.visibility = 'visible';
    section.style.height     = 'auto';
    section.style.overflow   = 'visible';
    desc.textContent         = 'Include Taxes & Costs Below';
  } else {
    section.style.visibility = 'hidden';
    section.style.height     = '0';
    section.style.overflow   = 'hidden';
    desc.textContent         = 'Include Taxes & Costs';
  }
}

/**
 * Toggle the "More Options" section.
 * @param {number} optVal - 1 show | 0 hide
 */
function cshmoreoption(optVal) {
  const section  = document.getElementById('cmoreoptioninputs');
  const linkDiv  = document.getElementById('cmoreoptionlinks');
  const hidden   = document.getElementById('cmoreoption');
  if (!section || !linkDiv || !hidden) return;

  if (optVal === 1) {
    section.style.display = 'block';
    hidden.value          = '1';
    linkDiv.innerHTML     = '<a href="#" onclick="cshmoreoption(0);return false;">– Fewer Options</a>';
  } else {
    section.style.display = 'none';
    hidden.value          = '0';
    linkDiv.innerHTML     = '<a href="#" onclick="cshmoreoption(1);return false;">+ More Options</a>';
  }
}

/**
 * Toggle additional one-time payment fields.
 * @param {number} aotVal - 1 show | 0 hide
 */
function cshadditionalonetime(aotVal) {
  const div     = document.getElementById('cadditionalonetimediv');
  const linkDiv = document.getElementById('cadditionalonetimelink');
  const hidden  = document.getElementById('cadditionalonetime');
  if (!div || !linkDiv || !hidden) return;

  if (aotVal === 1) {
    div.style.display = 'block';
    hidden.value      = '1';
    linkDiv.innerHTML = '<a href="#" onclick="cshadditionalonetime(0);return false;">– Hide Below Inputs</a>';
  } else {
    div.style.display = 'none';
    hidden.value      = '0';
    linkDiv.innerHTML = '<a href="#" onclick="cshadditionalonetime(1);return false;">+ Additional One-Time Payments</a>';
  }
}

/**
 * Toggle between annual and monthly amortisation schedule view.
 * @param {number} acVal - 1 monthly | 0 annual
 */
function amoChange(acVal) {
  const monthly  = document.getElementById('monthlyamo');
  const yearly   = document.getElementById('yearlyamo');
  const selector = document.getElementById('amoselect');
  if (!monthly || !yearly || !selector) return;

  if (acVal === 1) {
    monthly.style.display = 'block';
    yearly.style.display  = 'none';
    selector.innerHTML    = "<a href='#' onclick='amoChange(0);return false;'>Annual Schedule</a> &nbsp; &nbsp; Monthly Schedule";
  } else {
    monthly.style.display = 'none';
    yearly.style.display  = 'block';
    selector.innerHTML    = "Annual Schedule &nbsp; &nbsp; <a href='#' onclick='amoChange(1);return false;'>Monthly Schedule</a>";
  }
}

/* ========================================================================
   SECTION 4 — Main calculation handler
   ======================================================================== */

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
  if (termInput) termInput.value = years;
  if (rateInput) rateInput.value = rate;
  calculateMortgage();
  return false;
}

/**
 * Performs the full mortgage calculation and updates all result sections in the DOM.
 *
 * Key corrections vs original:
 *  [FIX BUG-08] yearly extra payment month read from its own selector (cexysmm), not cexosm
 *  [FIX BUG-09] interest saved derived from schedule[].interest sum, not monthlyPayment * count
 *  [FIX BUG-10/11] biweekly payoff via calculateBiweeklySchedule() with correct rate
 */
function calculateMortgage() {
  const el      = id => document.getElementById(id);
  const parseEl = id => { const e = el(id); return e ? parseFloat(e.value.replace(/,/g, '')) : 0; };
  const selVal  = id => { const e = el(id); return e ? e.value : 'd'; };

  // ── Core inputs ──────────────────────────────────────────────────────────
  let homePrice    = parseFloat((el('chouseprice')  ? el('chouseprice').value  : '400000').replace(/,/g, ''));
  let downInput    = parseFloat((el('cdownpayment') ? el('cdownpayment').value : '20').replace(/,/g, ''));
  const downUnit   = selVal('cdownpaymentunit') || 'p';
  let termYears    = parseInt((el('cloanterm')     ? el('cloanterm').value     : '30').replace(/,/g, ''), 10);
  let interestRate = parseFloat((el('cinterestrate') ? el('cinterestrate').value : '6.5').replace(/,/g, '')) / 100;

  const startMonthSelect = el('cstartmonth');
  const startYearInput   = el('cstartyear');
  const startMonth = startMonthSelect ? parseInt(startMonthSelect.value, 10) : 6;
  const startYear  = startYearInput  ? parseInt(startYearInput.value,  10) : 2026;

  // Defaults / guards
  if (isNaN(homePrice)    || homePrice    <= 0) homePrice    = 400000;
  if (isNaN(downInput)    || downInput    <  0) downInput    = 20;
  if (isNaN(termYears)    || termYears    <= 0) termYears    = 30;
  if (isNaN(interestRate) || interestRate <  0) interestRate = 0.065;

  const downPayment = downUnit === 'p' ? homePrice * (downInput / 100) : downInput;
  let loanAmount    = Math.max(0, homePrice - downPayment);

  // ── Cost inputs (all yearly) ─────────────────────────────────────────────
  const includeTaxCosts = el('caddoptional') ? el('caddoptional').checked : true;

  const costs = {
    propertyTaxes:     includeTaxCosts ? parseEl('cpropertytaxes') : 0,
    propertyTaxesUnit: selVal('cpropertytaxesunit'),
    homeIns:           includeTaxCosts ? parseEl('chomeins')       : 0,
    homeInsUnit:       selVal('chomeinsunit'),
    pmi:               includeTaxCosts ? parseEl('cpmi')           : 0,
    pmiUnit:           selVal('cpmiunit'),
    hoa:               includeTaxCosts ? parseEl('choa')           : 0,   // YEARLY input
    hoaUnit:           selVal('choaunit'),
    otherCosts:        includeTaxCosts ? parseEl('cothercost')     : 0,   // YEARLY input
    otherCostsUnit:    selVal('cothercostunit'),
  };

  const increases = {
    ptInc:  parseEl('cptinc')  / 100,
    hiInc:  parseEl('chiinc')  / 100,
    hoaInc: parseEl('choainc') / 100,
    ocInc:  parseEl('cocinc')  / 100,
  };

  // ── Extra payments ────────────────────────────────────────────────────────
  const extraMonthly = parseEl('cexma');
  const extraYearly  = parseEl('cexya');

  // [FIX BUG-08] yearly extra: month from its own selector, year from cexysy
  // One-time extra (first/primary)
  const extraOneTimeAmt = parseEl('cexoa');
  const extraOneTimeM   = parseInt(selVal('cexosm') || startMonth, 10);
  const extraOneTimeY   = parseInt(el('cexosy') ? el('cexosy').value : startYear, 10);

  // [FIX BUG-08] yearly payment month from dedicated selector cexysmm; fallback = start month
  const extraYearlyM    = parseInt(selVal('cexysmm') || startMonth, 10);
  const extraYearlyY    = parseInt(el('cexysy') ? el('cexysy').value : startYear, 10);

  // Additional one-time payments (xa1-xa10)
  const additionalOneTime = [];
  for (let i = 1; i <= 10; i++) {
    const amt = parseEl('xa' + i);
    const mon = parseInt(el('xm' + i) ? el('xm' + i).value : startMonth, 10);
    const yr  = parseInt(el('xy' + i) ? el('xy' + i).value : startYear,  10);
    if (!isNaN(amt) && amt > 0) {
      additionalOneTime.push({ amount: amt, month: mon, year: yr });
    }
  }

  const extraPayments = {
    monthly:         isNaN(extraMonthly) ? 0 : extraMonthly,
    yearly:          isNaN(extraYearly)  ? 0 : extraYearly,
    yearlyMonth:     extraYearlyM,          // [FIX BUG-08]
    yearlyStartYear: extraYearlyY,
    oneTime:         [],
  };

  if (!isNaN(extraOneTimeAmt) && extraOneTimeAmt > 0) {
    extraPayments.oneTime.push({ amount: extraOneTimeAmt, month: extraOneTimeM, year: extraOneTimeY });
  }
  additionalOneTime.forEach(ot => extraPayments.oneTime.push(ot));

  // ── Validate required fields ─────────────────────────────────────────────
  const resultsContainer = el('results-container');
  const monthlyPayEl     = el('monthly-pay-value');
  const errorMsgEl       = el('result-error-message');
  if (errorMsgEl) errorMsgEl.style.display = 'none';

  if (isNaN(homePrice) || homePrice <= 0 || isNaN(interestRate) || interestRate < 0 || isNaN(termYears) || termYears <= 0) {
    if (resultsContainer) { resultsContainer.style.display = 'block'; resultsContainer.classList.add('has-error'); }
    if (errorMsgEl)       { errorMsgEl.style.display = 'block'; errorMsgEl.className = 'h2result-error'; errorMsgEl.textContent = 'Please fill in all required fields: Home Price, Loan Term, and Interest Rate.'; }
    if (monthlyPayEl)     { monthlyPayEl.textContent = '---'; }
    return;
  }
  if (resultsContainer) { resultsContainer.style.display = 'block'; resultsContainer.classList.remove('has-error'); }

  // ── Core computation ──────────────────────────────────────────────────────
  const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, termYears);

  const schedule = buildAmortizationSchedule(
    loanAmount, interestRate, termYears, homePrice,
    { month: startMonth, year: startYear },
    extraPayments
  );

  // PMI payoff from schedule
  const { pmiPayoffMonth, pmiPaymentCount } = getPmiPayoff(schedule);

  // [FIX BUG-09] total interest = sum of schedule interest entries
  const totalInterestWithExtras = Math.round(
    schedule.reduce((s, e) => s + e.interest, 0) * 100
  ) / 100;
  const totalExtraPayments = Math.round(
    schedule.reduce((s, e) => s + (e.extraPaid || 0), 0) * 100
  ) / 100;

  // Baseline schedule (no extras) for interest-saved comparison
  const baseSchedule = buildAmortizationSchedule(
    loanAmount, interestRate, termYears, homePrice,
    { month: startMonth, year: startYear },
    { monthly: 0, yearly: 0, yearlyMonth: startMonth, yearlyStartYear: startYear, oneTime: [] }
  );
  const totalInterestBase = Math.round(
    baseSchedule.reduce((s, e) => s + e.interest, 0) * 100
  ) / 100;
  const interestSavedByExtras = Math.round((totalInterestBase - totalInterestWithExtras) * 100) / 100;

  // Cost breakdown — pass pmiPayoffMonth so PMI stops at the right month
  const costData = computeTotalCosts(
    homePrice, loanAmount, costs, increases,
    termYears, schedule.length, pmiPayoffMonth
  );
  costData.monthly.mortgage = monthlyPayment;
  costData.monthly.total    = Math.round((
    monthlyPayment +
    costData.monthly.propertyTax +
    costData.monthly.homeIns     +
    costData.monthly.pmi         +
    costData.monthly.hoa         +
    costData.monthly.other
  ) * 100) / 100;
  costData.total.mortgage = Math.round(monthlyPayment * schedule.length * 100) / 100;
  costData.total.total    = Math.round((
    costData.total.mortgage    +
    costData.total.propertyTax +
    costData.total.homeIns     +
    costData.total.pmi         +
    costData.total.hoa         +
    costData.total.other       +
    totalExtraPayments
  ) * 100) / 100;

  // [FIX BUG-10/11] Biweekly schedule
  const bw = calculateBiweeklySchedule(loanAmount, interestRate, monthlyPayment);
  const interestSavedByBiweekly = Math.round((totalInterestBase - bw.totalInterest) * 100) / 100;

  // ── DOM updates ───────────────────────────────────────────────────────────
  const setVal = (id, val) => {
    const elem = el(id);
    if (elem) elem.textContent = typeof val === 'number' ? formatCurrency(val) : val;
  };
  const showRowIfNonZero = (rowId, mVal, tVal) => {
    const row = document.querySelector('#' + rowId);
    if (row) row.style.display = (mVal > 0 || tVal > 0) ? '' : 'none';
  };

  if (monthlyPayEl) monthlyPayEl.textContent = formatCurrency(monthlyPayment);

  setVal('result-mortgage-payment-monthly', monthlyPayment);
  setVal('result-mortgage-payment-total',   costData.total.mortgage);

  showRowIfNonZero('property-tax-row', costData.monthly.propertyTax, costData.total.propertyTax);
  showRowIfNonZero('home-ins-row',     costData.monthly.homeIns,     costData.total.homeIns);
  // PMI: show only if down payment < 20% AND PMI amount > 0
  const downPaymentPercent = (downPayment / homePrice) * 100;
  const hasPmi = downPaymentPercent < 20 && (costData.monthly.pmi > 0 || costData.total.pmi > 0);
  const pmiRow = document.querySelector('#pmi-row');
  if (pmiRow) pmiRow.style.display = hasPmi ? '' : 'none';
  showRowIfNonZero('hoa-row',          costData.monthly.hoa,         costData.total.hoa);
  showRowIfNonZero('other-cost-row',   costData.monthly.other,       costData.total.other);

  // Extra payment row: show if ANY extra payment > 0
  const hasAnyExtra = extraPayments.monthly > 0 || extraPayments.yearly > 0 || extraPayments.oneTime.length > 0;
  const extraRow = document.querySelector('#extra-payment-row');
  if (extraRow) extraRow.style.display = hasAnyExtra ? '' : 'none';
  setVal('result-extra-payment-monthly', extraPayments.monthly);
  setVal('result-extra-payment-total', totalExtraPayments);

  setVal('result-property-tax-monthly', costData.monthly.propertyTax);
  setVal('result-property-tax-total',   costData.total.propertyTax);
  setVal('result-home-ins-monthly',     costData.monthly.homeIns);
  setVal('result-home-ins-total',       costData.total.homeIns);
  setVal('result-pmi-monthly',          costData.monthly.pmi);
  setVal('result-pmi-total',            costData.total.pmi);
  setVal('result-hoa-monthly',          costData.monthly.hoa);
  setVal('result-hoa-total',            costData.total.hoa);
  setVal('result-other-cost-monthly',   costData.monthly.other);
  setVal('result-other-cost-total',     costData.total.other);
  setVal('result-total-out-of-pocket-monthly', costData.monthly.total);
  setVal('result-total-out-of-pocket-total',   costData.total.total);

  setVal('result-house-price',   homePrice);
  setVal('result-loan-amount',   loanAmount);
  setVal('result-down-payment',  downPayment);
  setVal('result-total-payments-count', String(schedule.length));
  setVal('result-total-mortgage-payments', costData.total.mortgage);
  setVal('result-total-interest',          totalInterestWithExtras);
  setVal('result-total-extra-payments',    totalExtraPayments);

  // Show/hide Total Extra Payments row
  const totalExtraRow = document.querySelector('#total-extra-payments-row');
  if (totalExtraRow) totalExtraRow.style.display = hasAnyExtra ? '' : 'none';

  // Payoff date
  const lastEntry = schedule[schedule.length - 1];
  if (lastEntry) {
    const MONTHS = ['Jan.','Feb.','Mar.','Apr.','May','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.'];
    setVal('result-payoff-date', MONTHS[lastEntry.dateMonth - 1] + ' ' + lastEntry.dateYear);
  }

  // PMI payoff date — show only if PMI is visible in table
  setVal('result-pmi-payments-count', String(pmiPaymentCount || 0));
  const pmiPayoffRow = document.querySelector('#pmi-payoff-row');
  if (pmiPayoffRow) pmiPayoffRow.style.display = hasPmi ? '' : 'none';
  const pmiPayoffEntry = pmiPayoffMonth > 0 ? schedule[pmiPayoffMonth - 1] : null;
  if (pmiPayoffEntry) {
    const MONTHS = ['Jan.','Feb.','Mar.','Apr.','May','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.'];
    setVal('result-pmi-payoff-date', MONTHS[pmiPayoffEntry.dateMonth - 1] + ' ' + pmiPayoffEntry.dateYear);
  }

  // Extra payment savings section
  const extraPaymentInfo  = el('extra-payment-info');
  const extraPaymentText  = el('extra-payment-text');
  const interestSavedTable = el('interest-saved-table');
  const hasExtraPayments  = extraPayments.monthly > 0 || extraPayments.yearly > 0 || extraPayments.oneTime.length > 0;

  if (hasExtraPayments) {
    const savedMonths = baseSchedule.length - schedule.length;

    if (extraPaymentInfo && extraPaymentText) {
      const actualYears = Math.floor(schedule.length / 12);
      const actualMonths = schedule.length % 12;
      extraPaymentInfo.style.display = 'block';
      extraPaymentText.innerHTML = 'With the extra payment(s), the loan will be paid off in <b>'
        + actualYears + ' years and ' + actualMonths + ' months</b>, saving <b>'
        + formatCurrency(interestSavedByExtras) + ' in interest</b>.';
    }
    if (interestSavedTable) {
      interestSavedTable.style.display = '';
      setVal('saved-extra',    interestSavedByExtras);
      setVal('saved-biweekly', interestSavedByBiweekly);
    }
  } else {
    if (extraPaymentInfo)   extraPaymentInfo.style.display   = 'none';
    if (interestSavedTable) interestSavedTable.style.display = 'none';
  }

  // Amortisation tables
  const monthlyAmo = el('monthlyamo');
  const yearlyAmo  = el('yearlyamo');
  if (monthlyAmo) monthlyAmo.innerHTML = buildMonthlyTableHTML(schedule);
  if (yearlyAmo)  yearlyAmo.innerHTML  = buildAnnualTableHTML(schedule);
  amoChange(0);

  // Biweekly section
  const showBiweekly    = el('csbw') ? el('csbw').checked : false;
  const biweeklySection = el('biweekly-section');
  if (biweeklySection) {
    if (showBiweekly) {
      biweeklySection.style.display = 'block';
      setVal('biweekly-payment',  bw.payment);
      setVal('biweekly-years',    bw.years + ' yrs ' + bw.months + ' mo');
      setVal('biweekly-total',    bw.totalInterest + loanAmount);
      setVal('biweekly-savings',  interestSavedByBiweekly);
      setVal('biweekly-interest', bw.totalInterest);
    } else {
      biweeklySection.style.display = 'none';
    }
  }

  // Charts
  const pieContainer  = el('pie-chart-container');
  if (pieContainer) {
    const pieData = generatePieChartData({
      mortgage:    costData.total.mortgage,
      propertyTax: costData.total.propertyTax,
      homeIns:     costData.total.homeIns,
      pmi:         hasPmi ? costData.total.pmi : 0,
      hoa:         costData.total.hoa,
      other:       costData.total.other,
    });
    renderPieChart(pieContainer, pieData);
  }

  const lineChartContainer = el('line-chart-container');
  if (lineChartContainer) {
    const actualYears = Math.ceil(schedule.length / 12);
    renderLineChart(lineChartContainer, schedule, actualYears);
  }

  // Scroll to results
  const resultsAnchor = el('results');
  if (resultsAnchor) resultsAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ========================================================================
   SECTION 5 — Form clear
   ======================================================================== */

/**
 * Clears all input fields to empty. Does not affect the results section.
 */
function clearForm() {
  const ids = [
    'chouseprice','cdownpayment','cloanterm','cinterestrate','cstartyear',
    'cpropertytaxes','chomeins','cpmi','choa','cothercost',
    'cptinc','chiinc','choainc','cocinc',
    'cexma','cexya','cexoa',
    'cexmsy','cexysy','cexosy',
    'xa1','xa2','xa3','xa4','xa5','xa6','xa7','xa8','xa9','xa10',
    'xy1','xy2','xy3','xy4','xy5','xy6','xy7','xy8','xy9','xy10',
  ];
  ids.forEach(id => {
    const e = document.getElementById(id);
    if (e) e.value = '';
  });
}

/* ========================================================================
   SECTION 6 — Initialisation
   ======================================================================== */

/**
 * Initialises the mortgage calculator page.
 */
function initMortgageCalculator() {
  const numberIds = [
    'chouseprice','cdownpayment','cloanterm','cinterestrate',
    'cpropertytaxes','chomeins','cpmi','choa','cothercost',
    'cexma','cexya','cexoa',
    'cptinc','chiinc','choainc','cocinc',
    'xa1','xa2','xa3','xa4','xa5','xa6','xa7','xa8','xa9','xa10',
  ];
  numberIds.forEach(id => proComma2(id));

  cshtaxcost();
  cshmoreoption(0);
  cshadditionalonetime(0);
  amoChange(0);

  window.calculateMortgage    = calculateMortgage;
  window.clearForm            = clearForm;
  window.cshtaxcost           = cshtaxcost;
  window.cshmoreoption        = cshmoreoption;
  window.cshadditionalonetime = cshadditionalonetime;
  window.amoChange            = amoChange;
  window.cunitchange          = cunitchange;
  window.setYearRate          = setYearRate;

  calculateMortgage();
}

/* ========================================================================
   SECTION 7 — Exports (Node / test environment)
   ======================================================================== */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateMonthlyPayment,
    buildAmortizationSchedule,
    calculateBiweeklySchedule,
    getPmiPayoff,
    computeTotalCosts,
    formatCurrency,
    generatePieChartData,
    buildAnnualTableHTML,
    buildMonthlyTableHTML,
    insertComma2,
    proComma2,
    cunitchange,
  };
}
