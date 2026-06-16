/**
 * @file mortgage-calculator.js
 * @description Mortgage calculator logic: amortisation, charts, form handling, UI interactions.
 * @module js/mortgage-calculator
 */

/* ========================================================================
   SECTION 1 — Pure calculation functions (testable, no DOM)
   ======================================================================== */

/**
 * Calculates the monthly mortgage payment using the standard amortisation formula.
 *
 *   M = P × [r(1+r)^n] / [(1+r)^n - 1]
 *
 * @param {number} principal - Loan amount in dollars
 * @param {number} annualRate - Annual interest rate as a decimal (e.g. 0.065 for 6.5%)
 * @param {number} termYears - Loan term in years
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
 * Builds a month-by-month amortisation schedule.
 *
 * @param {number} principal - Loan amount
 * @param {number} annualRate - Annual interest rate as decimal
 * @param {number} termYears - Loan term in years
 * @param {object} [startDate] - { month: 1-12, year: number }
 * @param {object} [extraPayments] - { monthly: number, yearly: number, yearlyStartMonth: number,
 *        yearlyStartYear: number, oneTime: Array<{ amount: number, month: number, year: number }> }
 * @returns {Array<object>} Array of monthly entries: { month, year, interest, principal, balance }
 */
function buildAmortizationSchedule(principal, annualRate, termYears, startDate, extraPayments) {
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
    yearlyStartMonth: 1,
    yearlyStartYear: 2026,
    oneTime: [],
  };

  const schedule = [];
  let balance = principal;
  let totalMonths = 0;

  while (balance > 0.005 && totalMonths < maxPayments * 2) {
    const currentYear = start.year + Math.floor((start.month - 1 + totalMonths) / 12);
    const currentMonth = ((start.month - 1 + totalMonths) % 12) + 1;
    totalMonths++;

    const interestPortion = Math.round(balance * monthlyRate * 100) / 100;
    let principalPortion = Math.round((basePayment - interestPortion) * 100) / 100;

    if (principalPortion > balance) {
      principalPortion = balance;
    }

    // Apply extra monthly payment
    let extraMonthly = 0;
    if (extras.monthly > 0) {
      const extraStartMonth = extras.yearlyStartMonth || 1;
      const extraStartYear = extras.yearlyStartYear || currentYear;
      const extraStartOffset = (extraStartYear - start.year) * 12 + (extraStartMonth - start.month);
      if (totalMonths >= extraStartOffset) {
        extraMonthly = extras.monthly;
      }
    }

    // Apply extra yearly payment
    let extraYearly = 0;
    if (extras.yearly > 0 && currentMonth === (extras.yearlyStartMonth || 1)) {
      const yearlyStartYear = extras.yearlyStartYear || currentYear;
      if (currentYear >= yearlyStartYear) {
        extraYearly = extras.yearly;
      }
    }

    // Apply extra one-time payments
    let extraOneTime = 0;
    if (extras.oneTime && extras.oneTime.length > 0) {
      for (let i = 0; i < extras.oneTime.length; i++) {
        const ot = extras.oneTime[i];
        if (ot && ot.month === currentMonth && ot.year === currentYear && ot.amount > 0) {
          extraOneTime += ot.amount;
        }
      }
    }

    const totalPrincipalPaid = Math.min(
      principalPortion + extraMonthly + extraYearly + extraOneTime,
      balance
    );
    balance = Math.round((balance - totalPrincipalPaid) * 100) / 100;
    if (balance < 0) {
      balance = 0;
    }

    schedule.push({
      month: totalMonths,
      dateMonth: currentMonth,
      dateYear: currentYear,
      interest: Math.round(interestPortion * 100) / 100,
      principal: Math.round(totalPrincipalPaid * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    });

    if (balance <= 0.005) {
      break;
    }
  }

  return schedule;
}

/**
 * Computes the biweekly payment amount.
 * With 26 biweekly payments per year, this results in 13 full monthly payments.
 *
 * @param {number} monthlyPayment - Standard monthly payment
 * @returns {number} Biweekly payment amount
 */
function calculateBiweeklyPayment(monthlyPayment) {
  return Math.round((monthlyPayment / 2) * 100) / 100;
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
 * Computes the total annual cost and aggregates monthly/total breakdown.
 *
 * @param {number} homePrice - Home purchase price
 * @param {number} loanAmount - Mortgage principal
 * @param {object} costs - { propertyTaxes, propertyTaxesUnit, homeIns, homeInsUnit,
 *        pmi, pmiUnit, hoa, hoaUnit, otherCosts, otherCostsUnit }
 * @param {object} increases - { ptInc, hiInc, hoaInc, ocInc } (annual % increase as decimal)
 * @param {number} termYears - Loan term
 * @returns {object} { monthly: {mortgage,propertyTax,homeIns,pmi,hoa,other,total},
 *          total: {mortgage,propertyTax,homeIns,pmi,hoa,other,total},
 *          annualTotals: Array<{year, propertyTax, homeIns, pmi, hoa, other}> }
 */
function computeTotalCosts(homePrice, loanAmount, costs, increases, termYears) {
  const getAnnualValue = (value, unit, percentOf) => {
    if (unit === 'p') {
      return percentOf * (value / 100);
    }
    return value;
  };

  const annualPT = getAnnualValue(costs.propertyTaxes, costs.propertyTaxesUnit, homePrice);
  const annualHI = getAnnualValue(costs.homeIns, costs.homeInsUnit, homePrice);
  const annualPMI = getAnnualValue(costs.pmi, costs.pmiUnit, loanAmount);
  const annualHOA = getAnnualValue(costs.hoa, costs.hoaUnit, homePrice);
  const annualOC = getAnnualValue(costs.otherCosts, costs.otherCostsUnit, homePrice);

  const inc = increases || {};
  const ptInc = inc.ptInc || 0;
  const hiInc = inc.hiInc || 0;
  const hoaInc = inc.hoaInc || 0;
  const ocInc = inc.ocInc || 0;

  let totalPT = 0;
  let totalHI = 0;
  let totalPMI = 0;
  let totalHOA = 0;
  let totalOC = 0;

  const annualTotals = [];
  let currentPT = annualPT;
  let currentHI = annualHI;
  let currentPMI = annualPMI;
  let currentHOA = annualHOA;
  let currentOC = annualOC;

  for (let y = 1; y <= termYears; y++) {
    annualTotals.push({
      year: y,
      propertyTax: Math.round(currentPT * 100) / 100,
      homeIns: Math.round(currentHI * 100) / 100,
      pmi: Math.round(currentPMI * 100) / 100,
      hoa: Math.round(currentHOA * 100) / 100,
      other: Math.round(currentOC * 100) / 100,
    });
    totalPT += currentPT;
    totalHI += currentHI;
    totalPMI += currentPMI;
    totalHOA += currentHOA;
    totalOC += currentOC;

    currentPT *= 1 + ptInc;
    currentHI *= 1 + hiInc;
    currentPMI *= 1 + ptInc; // PMI increase follows property tax increase pattern
    currentHOA *= 1 + hoaInc;
    currentOC *= 1 + ocInc;
  }

  const monthlyPT = totalPT / (termYears * 12);
  const monthlyHI = totalHI / (termYears * 12);
  const monthlyPMI = totalPMI / (termYears * 12);
  const monthlyHOA = totalHOA / (termYears * 12);
  const monthlyOC = totalOC / (termYears * 12);

  return {
    monthly: {
      mortgage: 0, // will be filled in by caller
      propertyTax: Math.round(monthlyPT * 100) / 100,
      homeIns: Math.round(monthlyHI * 100) / 100,
      pmi: Math.round(monthlyPMI * 100) / 100,
      hoa: Math.round(monthlyHOA * 100) / 100,
      other: Math.round(monthlyOC * 100) / 100,
      total: 0, // will be filled in by caller
    },
    total: {
      mortgage: 0,
      propertyTax: Math.round(totalPT * 100) / 100,
      homeIns: Math.round(totalHI * 100) / 100,
      pmi: Math.round(totalPMI * 100) / 100,
      hoa: Math.round(totalHOA * 100) / 100,
      other: Math.round(totalOC * 100) / 100,
      total: 0,
    },
    annualTotals,
  };
}

/**
 * Generates data for a pie chart showing cost breakdown.
 *
 * @param {object} totalCosts - { mortgage, propertyTax, homeIns, pmi, hoa, other }
 * @returns {Array<{ label: string, value: number, percent: number, color: string }>} Array of pie slice data with label, value, percentage, and color
 */
function generatePieChartData(totalCosts) {
  const colors = ['#2b7ddb', '#8bbc21', '#910000', '#1aadce', '#f7a35c', '#8085e9'];
  const items = [
    { label: 'Principal & Interest', value: totalCosts.mortgage || 0 },
    { label: 'Property Taxes', value: totalCosts.propertyTax || 0 },
    { label: 'Home Insurance', value: totalCosts.homeIns || 0 },
    { label: 'HOA Fee', value: totalCosts.hoa || 0 },
    { label: 'Other Cost', value: totalCosts.other || 0 },
  ];

  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return [];
  }

  const result = [];
  items.forEach((item, i) => {
    if (item.value > 0) {
      result.push({
        label: item.label,
        value: item.value,
        percent: Math.round((item.value / total) * 100),
        color: colors[i % colors.length],
      });
    }
  });

  return result;
}

/* ========================================================================
   SECTION 2 — SVG Chart rendering
   ======================================================================== */

/**
 * Renders an SVG pie chart into a container element.
 *
 * @param {HTMLElement} container - The element to render the chart into
 * @param {Array<object>} data - From generatePieChartData
 * @param {number} [width=300] - SVG width
 * @param {number} [height=120] - SVG height
 */
// eslint-disable-next-line max-lines-per-function
function renderPieChart(container, data, width, height) {
  if (!container) {
    return;
  }
  const svgWidth = width || 300;
  const svgHeight = height || 120;

  if (!data || data.length === 0) {
    container.innerHTML = '';
    return;
  }

  const cx = 58.5;
  const cy = 58.5;
  const radius = 50.5;
  const innerRadius = 20.2;

  let svg = '<svg width="' + svgWidth + '" height="' + svgHeight + '">';
  svg +=
    '<style>' +
    '.mcpline{stroke:white;stroke-width:1;}' +
    '.mcplegend{font-size:13;font-family:arial,helvetica,sans-serif;fill:#0d233a;}' +
    '.mcplabel{fill:#fff;stroke-width:2;font-family:arial,helvetica,sans-serif;font-size:12px;paint-order:stroke;dominant-baseline:middle;text-anchor:middle;}' +
    '</style>';

  let currentAngle = -Math.PI / 2;
  const total = data.reduce((s, d) => s + d.value, 0);

  data.forEach((/* d, i */ d) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    svg +=
      '<path d="M ' +
      cx +
      ' ' +
      cy +
      ' L ' +
      x1 +
      ' ' +
      y1 +
      ' A ' +
      radius +
      ' ' +
      radius +
      ' 0 ' +
      largeArc +
      ' 1 ' +
      x2 +
      ' ' +
      y2 +
      ' Z" fill="' +
      d.color +
      '"';

    const labelText = d.label + '<br>' + formatCurrency(d.value) + ' (' + d.percent + '%)';
    svg +=
      ' onmousemove="ttpieShowTT(evt,\'' +
      d.color +
      "','" +
      labelText.replace(/'/g, "\\'") +
      '\');"';
    svg += ' onmouseout="ttpieHideTT();"';
    svg += '></path>';

    // Separator line from center to edge
    svg +=
      '<line x1="' +
      cx +
      '" y1="' +
      cy +
      '" x2="' +
      x1 +
      '" y2="' +
      y1 +
      '" class="mcpline"></line>';

    currentAngle = endAngle;
  });

  // Inner circle (donut hole)
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + innerRadius + '" fill="white"></circle>';

  // Percentage labels
  currentAngle = -Math.PI / 2;
  data.forEach(d => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const midAngle = currentAngle + sliceAngle / 2;
    const labelRadius = (radius + innerRadius) / 2;
    const lx = cx + labelRadius * Math.cos(midAngle);
    const ly = cy + labelRadius * Math.sin(midAngle);

    svg +=
      '<text x="' +
      lx.toFixed(3) +
      '" y="' +
      ly.toFixed(3) +
      '" class="mcplabel" stroke="' +
      d.color +
      '"';
    const labelText2 = d.label + '<br>' + formatCurrency(d.value) + ' (' + d.percent + '%)';
    svg +=
      ' onmousemove="ttpieShowTT(evt,\'' +
      d.color +
      "','" +
      labelText2.replace(/'/g, "\\'") +
      '\');"';
    svg += ' onmouseout="ttpieHideTT();">' + d.percent + '%</text>';
    currentAngle += sliceAngle;
  });

  // Legend
  let legendY = 8;
  data.forEach(d => {
    svg +=
      '<rect x="117" y="' +
      legendY +
      '" rx="3" ry="3" width="20" height="14" style="fill:' +
      d.color +
      ';"></rect>';
    svg += '<text x="142" y="' + (legendY + 11) + '" class="mcplegend">' + d.label + '</text>';
    legendY += 18;
  });

  svg += '</svg>';
  svg +=
    '<div id="ttpiett" style="position:absolute;display:none;text-align:left;background:cornsilk;opacity:0.92;border:1px solid #11233a;border-radius:5px;padding:5px;font-size:13px;font-family:arial,helvetica,sans-serif;color:#fff;"></div>';

  container.innerHTML = svg;

  // Attach tooltip functions globally if not already
  if (typeof window.ttpieShowTT !== 'function') {
    window.ttpieShowTT = (evt, color, text) => {
      const tooltip = document.getElementById('ttpiett');
      if (!tooltip) {
        return;
      }
      tooltip.innerHTML = text;
      tooltip.style.display = 'block';
      tooltip.style.backgroundColor = color;
      const pageX = evt.pageX || evt.clientX + window.scrollX;
      const pageY = evt.pageY || evt.clientY + window.scrollY;
      if (pageX > window.innerWidth / 2) {
        tooltip.style.left = pageX - 2 - tooltip.offsetWidth + 'px';
      } else {
        tooltip.style.left = pageX + 16 + 'px';
      }
      tooltip.style.top = pageY + 'px';
    };
    window.ttpieHideTT = () => {
      const tooltip = document.getElementById('ttpiett');
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    };
  }
}

/**
 * Renders an SVG line chart into a container element.
 *
 * @param {HTMLElement} container - The element to render the chart into
 * @param {Array<object>} schedule - Amortisation schedule from buildAmortizationSchedule
 * @param {number} termYears - Loan term
 * @param {number} [width=300] - SVG width
 * @param {number} [height=180] - SVG height
 */
// eslint-disable-next-line max-lines-per-function
function renderLineChart(container, schedule, termYears, width, height) {
  if (!container) {
    return;
  }
  const svgWidth = width || 350;
  const svgHeight = height || 220;

  if (!schedule || schedule.length === 0) {
    container.innerHTML = '';
    return;
  }

  const padding = { top: 10, right: 10, bottom: 35, left: 55 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  // Build yearly data points
  const yearlyData = [];
  let yearInterest = 0;
  let yearPrincipal = 0;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;

  for (let m = 0; m < schedule.length; m++) {
    yearInterest += schedule[m].interest;
    yearPrincipal += schedule[m].principal;
    const isYearEnd = (m + 1) % 12 === 0 || m === schedule.length - 1;
    if (isYearEnd) {
      cumulativeInterest += yearInterest;
      cumulativePrincipal += yearPrincipal;
      yearlyData.push({
        year: Math.ceil((m + 1) / 12),
        balance: schedule[m].balance,
        interest: cumulativeInterest,
        principal: cumulativePrincipal,
        payment: cumulativeInterest + cumulativePrincipal,
      });
      yearInterest = 0;
      yearPrincipal = 0;
    }
  }

  // Find max value for y-axis scaling
  let maxVal = 0;
  yearlyData.forEach(d => {
    if (d.balance > maxVal) {
      maxVal = d.balance;
    }
    if (d.payment > maxVal) {
      maxVal = d.payment;
    }
  });

  // Round up to nice scale
  const yMax = Math.ceil(maxVal / 100000) * 100000 || 100000;

  const xScale = year => {
    return padding.left + (year / termYears) * chartW;
  };
  const yScale = val => {
    return padding.top + chartH - (val / yMax) * chartH;
  };

  // Format y-axis value in "K"
  const formatK = val => {
    const k = Math.round(val / 1000);
    return k + 'K';
  };

  // Build SVG
  let svg = '<svg width="' + svgWidth + '" height="' + svgHeight + '">';
  svg +=
    '<style>' +
    '.mclgrid{stroke:#999;stroke-width:0.5;}' +
    '.mcllegend{font-size:13;font-family:arial,helvetica,sans-serif;fill:#0d233a;}' +
    '.mcltitle{fill:#000;font-family:arial,helvetica,sans-serif;font-size:15px;dominant-baseline:middle;text-anchor:middle;}' +
    '.mcllabely{fill:#666;font-family:arial,helvetica,sans-serif;font-size:12px;dominant-baseline:middle;text-anchor:end;}' +
    '.mcllabelx{fill:#666;font-family:arial,helvetica,sans-serif;font-size:12px;dominant-baseline:hanging;text-anchor:middle;}' +
    '.mcvsblegend{font-size:13;font-family:arial,helvetica,sans-serif;fill:#0d233a;}' +
    '</style>';

  // X-axis title
  svg +=
    '<text x="' +
    (padding.left + chartW / 2) +
    '" y="' +
    (svgHeight - 8) +
    '" class="mcltitle">Year</text>';

  // Y-axis grid lines and labels (4 divisions)
  const yDivisions = 4;
  for (let yi = 0; yi <= yDivisions; yi++) {
    const yVal = (yi / yDivisions) * yMax;
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
      '" class="mclgrid"></line>';
    svg +=
      '<text x="' +
      (padding.left - 8) +
      '" y="' +
      yPos +
      '" class="mcllabely">' +
      formatK(yVal) +
      '</text>';
  }

  // X-axis tick marks
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
      '" class="mclgrid"></line>';
    svg +=
      '<text x="' +
      xPos +
      '" y="' +
      (padding.top + chartH + 5) +
      '" class="mcllabelx">' +
      xi +
      '</text>';
  }

  // Draw lines for Balance, Interest, Payment
  const lines = [
    { key: 'balance', color: '#2b7ddb', label: 'Balance' },
    { key: 'interest', color: '#8bbc21', label: 'Interest' },
    { key: 'payment', color: '#910000', label: 'Payment' },
  ];

  lines.forEach(lineInfo => {
    let pathD = '';
    yearlyData.forEach((d, i) => {
      const x = xScale(d.year);
      const y = yScale(d[lineInfo.key]);
      if (i === 0) {
        pathD = 'M ' + x + ' ' + y;
      } else {
        pathD += ' L ' + x + ' ' + y;
      }
    });
    svg +=
      '<path d="' +
      pathD +
      '" fill="none" stroke="' +
      lineInfo.color +
      '" stroke-width="3"></path>';
  });

  // Chart border
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

  // Legend at top-left of plot area (above balance starting point)
  let legY = padding.top + 5;
  lines.forEach(lineInfo => {
    const legX = padding.left + 5;
    svg +=
      '<rect x="' +
      legX +
      '" y="' +
      legY +
      '" width="16" height="6" style="fill:' +
      lineInfo.color +
      ';"></rect>';
    svg +=
      '<text x="' +
      (legX + 22) +
      '" y="' +
      (legY + 7) +
      '" class="mcvsblegend">' +
      lineInfo.label +
      '</text>';
    legY += 20;
  });

  svg += '</svg>';
  container.innerHTML = svg;
}

/**
 * Builds an annual amortisation table HTML.
 *
 * @param {Array<object>} schedule - From buildAmortizationSchedule
 * @returns {string} HTML table string
 */
function buildAnnualTableHTML(schedule) {
  const yearly = [];
  let yearInterest = 0;
  let yearPrincipal = 0;
  let yearStartMonth = schedule[0] ? schedule[0].dateMonth : 1;
  let yearStartYear = schedule[0] ? schedule[0].dateYear : 2026;
  let yearNum = 1;

  for (let m = 0; m < schedule.length; m++) {
    const entry = schedule[m];
    yearInterest += entry.interest;
    yearPrincipal += entry.principal;
    const isYearEnd = (m + 1) % 12 === 0 || m === schedule.length - 1;
    if (isYearEnd) {
      const endMonth = entry.dateMonth;
      const endYear = entry.dateYear;
      const startMonthStr = (yearStartMonth < 10 ? '0' : '') + yearStartMonth;
      const endMonthStr = (endMonth < 10 ? '0' : '') + endMonth;
      yearly.push({
        year: yearNum,
        dateRange: startMonthStr + '/' + yearStartYear + '-' + endMonthStr + '/' + endYear,
        interest: Math.round(yearInterest * 100) / 100,
        principal: Math.round(yearPrincipal * 100) / 100,
        balance: entry.balance,
      });
      yearNum++;
      yearInterest = 0;
      yearPrincipal = 0;
      yearStartMonth = m + 1 < schedule.length ? schedule[m + 1].dateMonth : 1;
      yearStartYear = m + 1 < schedule.length ? schedule[m + 1].dateYear : 2026;
    }
  }

  let html = '<table class="cinfoT">';
  html +=
    '<tr align="center"><th>Year</th><th>Date</th><th>Interest</th><th>Principal</th><th>Ending Balance</th></tr>';
  yearly.forEach(y => {
    html +=
      '<tr align="right">' +
      '<td>' +
      y.year +
      '</td>' +
      '<td>' +
      y.dateRange +
      '</td>' +
      '<td>' +
      formatCurrency(y.interest) +
      '</td>' +
      '<td>' +
      formatCurrency(y.principal) +
      '</td>' +
      '<td>' +
      formatCurrency(y.balance) +
      '</td>' +
      '</tr>';
  });
  html += '</table>';
  return html;
}

/**
 * Builds a monthly amortisation table HTML.
 *
 * @param {Array<object>} schedule - From buildAmortizationSchedule
 * @returns {string} HTML table string
 */
function buildMonthlyTableHTML(schedule) {
  let html = '<table class="cinfoT">';
  html +=
    '<tr align="center"><th>Month</th><th>Date</th><th>Interest</th><th>Principal</th><th>Ending Balance</th></tr>';

  for (let m = 0; m < schedule.length; m++) {
    const entry = schedule[m];
    const dateStr = (entry.dateMonth < 10 ? '0' : '') + entry.dateMonth + '/' + entry.dateYear;
    html +=
      '<tr align="right">' +
      '<td>' +
      entry.month +
      '</td>' +
      '<td>' +
      dateStr +
      '</td>' +
      '<td>' +
      formatCurrency(entry.interest) +
      '</td>' +
      '<td>' +
      formatCurrency(entry.principal) +
      '</td>' +
      '<td>' +
      formatCurrency(entry.balance) +
      '</td>' +
      '</tr>';

    // Year-end separator
    if ((m + 1) % 12 === 0 && m < schedule.length - 1) {
      const endYear = Math.ceil((m + 1) / 12);
      html += '<tr><td colspan="5" align="center">End of year ' + endYear + '</td></tr>';
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
 * @param {HTMLElement} el - Input element
 * @param {string} type - 'd' for dollar, 'i' for integer, 'c' for comma-only
 */
function insertComma2(el, type) {
  if (!el) {
    return;
  }
  let val = el.value.toString().replaceAll(',', '').replaceAll(' ', '');
  let result = '';
  if (type === 'i') {
    val = val.replace(/[^\d.-]/g, '');
    const parts = val.toString().split('.');
    result = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
  el.onblur = () => {
    insertComma2(el, 'd');
  };
  insertComma2(el, 'd');
}

/**
 * Unit toggle: converts between % and $ for a field.
 *
 * @param {string} fieldId - Input element ID
 * @param {string} newUnit - 'd' for dollars or 'p' for percent
 */
function cunitchange(fieldId, newUnit) {
  const field = document.getElementById(fieldId);
  if (!field) {
    return;
  }
  const priceEl = document.getElementById('chouseprice');
  const homePrice = parseFloat((priceEl ? priceEl.value : '400000').replace(/,/g, ''));
  const fieldVal = parseFloat(field.value.replace(/,/g, ''));

  if (!isNaN(homePrice) && homePrice > 0 && !isNaN(fieldVal)) {
    if (newUnit === 'd') {
      field.value = Math.round((homePrice * fieldVal) / 100);
      field.classList.remove('inpct');
      field.classList.add('indollar');
    } else if (newUnit === 'p') {
      field.value = Math.round((100000.0 * fieldVal) / homePrice) / 1000;
      field.classList.remove('indollar');
      field.classList.add('inpct');
    }
  } else {
    if (newUnit === 'd') {
      field.classList.remove('inpct');
      field.classList.add('indollar');
    } else if (newUnit === 'p') {
      field.classList.remove('indollar');
      field.classList.add('inpct');
    }
  }
  insertComma2(field, 'd');
}

/**
 * Toggle visibility of the tax & cost section.
 */
function cshtaxcost() {
  const checkbox = document.getElementById('caddoptional');
  const section = document.getElementById('ctaxcost');
  const desc = document.getElementById('ctaxcostdesc');
  if (!checkbox || !section || !desc) {
    return;
  }
  if (checkbox.checked) {
    section.style.visibility = 'visible';
    section.style.height = 'auto';
    section.style.overflow = 'visible';
    desc.textContent = 'Include Taxes & Costs Below';
  } else {
    section.style.visibility = 'hidden';
    section.style.height = '0';
    section.style.overflow = 'hidden';
    desc.textContent = 'Include Taxes & Costs';
  }
}

/**
 * Toggle visibility of the "More Options" section.
 *
 * @param {number} optVal - 1 to show, 0 to hide
 */
function cshmoreoption(optVal) {
  const section = document.getElementById('cmoreoptioninputs');
  const linkDiv = document.getElementById('cmoreoptionlinks');
  const hidden = document.getElementById('cmoreoption');
  if (!section || !linkDiv || !hidden) {
    return;
  }
  if (optVal === 1) {
    section.style.display = 'block';
    hidden.value = '1';
    linkDiv.innerHTML = '<a href="#" onclick="cshmoreoption(0);return false;">– Fewer Options</a>';
  } else {
    section.style.display = 'none';
    hidden.value = '0';
    linkDiv.innerHTML = '<a href="#" onclick="cshmoreoption(1);return false;">+ More Options</a>';
  }
}

/**
 * Toggle visibility of additional one-time payment fields.
 *
 * @param {number} aotVal - 1 to show, 0 to hide
 */
function cshadditionalonetime(aotVal) {
  const div = document.getElementById('cadditionalonetimediv');
  const linkDiv = document.getElementById('cadditionalonetimelink');
  const hidden = document.getElementById('cadditionalonetime');
  if (!div || !linkDiv || !hidden) {
    return;
  }
  if (aotVal === 1) {
    div.style.display = 'block';
    hidden.value = '1';
    linkDiv.innerHTML =
      '<a href="#" onclick="cshadditionalonetime(0);return false;">– Hide Below Inputs</a>';
  } else {
    div.style.display = 'none';
    hidden.value = '0';
    linkDiv.innerHTML =
      '<a href="#" onclick="cshadditionalonetime(1);return false;">+ Additional One-Time Payments</a>';
  }
}

/**
 * Toggle between annual and monthly amortisation schedule view.
 *
 * @param {number} acVal - 1 for monthly, 0 for annual
 */
function amoChange(acVal) {
  const monthly = document.getElementById('monthlyamo');
  const yearly = document.getElementById('yearlyamo');
  const selector = document.getElementById('amoselect');
  if (!monthly || !yearly || !selector) {
    return;
  }
  if (acVal === 1) {
    monthly.style.display = 'block';
    yearly.style.display = 'none';
    selector.innerHTML =
      "<a href='#' onclick='amoChange(0);return false;'>Annual Schedule</a> &nbsp; &nbsp; Monthly Schedule";
  } else {
    monthly.style.display = 'none';
    yearly.style.display = 'block';
    selector.innerHTML =
      "Annual Schedule &nbsp; &nbsp; <a href='#' onclick='amoChange(1);return false;'>Monthly Schedule</a>";
  }
}

/* ========================================================================
   SECTION 4 — Main calculation handler
   ======================================================================== */

/**
 * Sets interest rate and term from the rate widget and triggers calculation.
 *
 * @param {string} rate - Interest rate string
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
  calculateMortgage();
  return false;
}

/**
 * Performs the full mortgage calculation and updates all result sections.
 */
// eslint-disable-next-line max-lines-per-function, max-params
function calculateMortgage() {
  // Gather inputs
  let homePrice = parseFloat(
    (document.getElementById('chouseprice').value || '400000').replace(/,/g, '')
  );
  let downPct = parseFloat(
    (document.getElementById('cdownpayment').value || '20').replace(/,/g, '')
  );
  const downUnitEl = document.getElementById('cdownpaymentunit');
  const downUnit = downUnitEl ? downUnitEl.value : 'p';
  let termYears = parseInt(
    (document.getElementById('cloanterm').value || '30').replace(/,/g, ''),
    10
  );
  let interestRate =
    parseFloat((document.getElementById('cinterestrate').value || '6.545').replace(/,/g, '')) / 100;

  const startMonthSelect = document.getElementById('cstartmonth');
  const startYearInput = document.getElementById('cstartyear');
  const startMonth = startMonthSelect ? parseInt(startMonthSelect.value, 10) : 6;
  const startYear = startYearInput ? parseInt(startYearInput.value, 10) : 2026;

  // Validate
  if (isNaN(homePrice) || homePrice <= 0) {
    homePrice = 400000;
  }
  if (isNaN(downPct) || downPct < 0) {
    downPct = 20;
  }
  if (isNaN(termYears) || termYears <= 0) {
    termYears = 30;
  }
  if (isNaN(interestRate) || interestRate < 0) {
    interestRate = 0.06545;
  }

  // Calculate down payment and loan amount
  const downPayment = downUnit === 'p' ? homePrice * (downPct / 100) : downPct;
  let loanAmount = homePrice - downPayment;
  if (loanAmount < 0) {
    loanAmount = 0;
  }

  // Gather optional costs
  const includeCheckbox = document.getElementById('caddoptional');
  const includeTaxCosts = includeCheckbox ? includeCheckbox.checked : true;

  const el = document.getElementById.bind(document);
  const parseEl = id => {
    const e = el(id);
    return e ? parseFloat(e.value.replace(/,/g, '')) : 0;
  };
  const selectVal = id => {
    const e = el(id);
    return e ? e.value : 'd';
  };

  const costs = {
    propertyTaxes: includeTaxCosts ? parseEl('cpropertytaxes') : 0,
    propertyTaxesUnit: selectVal('cpropertytaxesunit'),
    homeIns: includeTaxCosts ? parseEl('chomeins') : 0,
    homeInsUnit: selectVal('chomeinsunit'),
    pmi: includeTaxCosts ? parseEl('cpmi') : 0,
    pmiUnit: selectVal('cpmiunit'),
    hoa: includeTaxCosts ? parseEl('choa') : 0,
    hoaUnit: selectVal('choaunit'),
    otherCosts: includeTaxCosts ? parseEl('cothercost') : 0,
    otherCostsUnit: selectVal('cothercostunit'),
  };

  const increases = {
    ptInc: parseEl('cptinc') / 100,
    hiInc: parseEl('chiinc') / 100,
    hoaInc: parseEl('choainc') / 100,
    ocInc: parseEl('cocinc') / 100,
  };

  // Gather extra payments
  const extraMonthly = parseEl('cexma');
  const extraYearly = parseEl('cexya');
  const extraOneTimeA = parseEl('cexoa');
  const extraOneTimeM = parseInt(selectVal('cexosm') || '6', 10);
  const extraOneTimeY = parseInt(el('cexosy') ? el('cexosy').value : '2026', 10);

  // Gather additional one-time payments (xa1-xa10)
  const additionalOneTime = [];
  for (let i = 1; i <= 10; i++) {
    const a = parseEl('xa' + i);
    const m = parseInt(el('xm' + i) ? el('xm' + i).value : '6', 10);
    const y = parseInt(el('xy' + i) ? el('xy' + i).value : '2026', 10);
    if (!isNaN(a) && a > 0) {
      additionalOneTime.push({ amount: a, month: m, year: y });
    }
  }

  // Build extra payments config
  const extraPayments = {
    monthly: isNaN(extraMonthly) ? 0 : extraMonthly,
    yearly: isNaN(extraYearly) ? 0 : extraYearly,
    yearlyStartMonth: extraOneTimeM || 1,
    yearlyStartYear: extraOneTimeY || 2026,
    oneTime: [],
  };

  if (!isNaN(extraOneTimeA) && extraOneTimeA > 0) {
    extraPayments.oneTime.push({
      amount: extraOneTimeA,
      month: extraOneTimeM,
      year: extraOneTimeY,
    });
  }
  additionalOneTime.forEach(ot => {
    extraPayments.oneTime.push(ot);
  });

  // Compute
  const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, termYears);
  const schedule = buildAmortizationSchedule(
    loanAmount,
    interestRate,
    termYears,
    { month: startMonth, year: startYear },
    extraPayments
  );
  const costData = computeTotalCosts(homePrice, loanAmount, costs, increases, termYears);

  // Fill in mortgage values
  costData.monthly.mortgage = monthlyPayment;
  costData.monthly.total =
    Math.round(
      (monthlyPayment +
        costData.monthly.propertyTax +
        costData.monthly.homeIns +
        costData.monthly.pmi +
        costData.monthly.hoa +
        costData.monthly.other) *
        100
    ) / 100;
  costData.total.mortgage = Math.round(monthlyPayment * schedule.length * 100) / 100;
  costData.total.total =
    Math.round(
      (costData.total.mortgage +
        costData.total.propertyTax +
        costData.total.homeIns +
        costData.total.pmi +
        costData.total.hoa +
        costData.total.other) *
        100
    ) / 100;

  // Validate required fields and update results
  const resultsContainer = document.getElementById('results-container');
  const monthlyPayEl = document.getElementById('monthly-pay-value');
  const errorMsgEl = document.getElementById('result-error-message');
  if (errorMsgEl) {
    errorMsgEl.style.display = 'none';
  }

  if (
    isNaN(homePrice) ||
    homePrice <= 0 ||
    isNaN(interestRate) ||
    interestRate < 0 ||
    isNaN(termYears) ||
    termYears <= 0
  ) {
    if (resultsContainer) {
      resultsContainer.style.display = 'block';
      resultsContainer.classList.add('has-error');
    }
    if (errorMsgEl) {
      errorMsgEl.style.display = 'block';
      errorMsgEl.className = 'h2result-error';
      errorMsgEl.textContent =
        'Please fill in all required fields: Home Price, Loan Term, and Interest Rate.';
    }
    if (monthlyPayEl) {
      monthlyPayEl.textContent = '---';
    }
    return;
  }
  if (resultsContainer) {
    resultsContainer.style.display = 'block';
    resultsContainer.classList.remove('has-error');
  }
  if (monthlyPayEl) {
    monthlyPayEl.textContent = formatCurrency(monthlyPayment);
  }

  // Update breakdown table - only show rows with non-zero values
  const setVal = (id, val) => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.textContent = typeof val === 'number' ? formatCurrency(val) : val;
    }
  };

  // Function to conditionally show table rows based on non-zero values
  const showRowIfNonZero = (rowId, monthlyValue, totalValue) => {
    const row = document.querySelector(`#${rowId}`);
    if (row) {
      if (monthlyValue > 0 || totalValue > 0) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    }
  };

  // Always show mortgage payment row
  setVal('result-mortgage-payment-monthly', monthlyPayment);
  setVal('result-mortgage-payment-total', costData.total.mortgage);

  // Conditionally show Annual Tax & Cost rows
  showRowIfNonZero('property-tax-row', costData.monthly.propertyTax, costData.total.propertyTax);
  showRowIfNonZero('home-ins-row', costData.monthly.homeIns, costData.total.homeIns);
  showRowIfNonZero('pmi-row', costData.monthly.pmi, costData.total.pmi);
  showRowIfNonZero('hoa-row', costData.monthly.hoa, costData.total.hoa);
  showRowIfNonZero('other-cost-row', costData.monthly.other, costData.total.other);

  // Set values for all rows (even if hidden)
  setVal('result-property-tax-monthly', costData.monthly.propertyTax);
  setVal('result-property-tax-total', costData.total.propertyTax);
  setVal('result-home-ins-monthly', costData.monthly.homeIns);
  setVal('result-home-ins-total', costData.total.homeIns);
  setVal('result-pmi-monthly', costData.monthly.pmi);
  setVal('result-pmi-total', costData.total.pmi);
  setVal('result-hoa-monthly', costData.monthly.hoa);
  setVal('result-hoa-total', costData.total.hoa);
  setVal('result-other-cost-monthly', costData.monthly.other);
  setVal('result-other-cost-total', costData.total.other);
  setVal('result-total-out-of-pocket-monthly', costData.monthly.total);
  setVal('result-total-out-of-pocket-total', costData.total.total);
  setVal('result-house-price', homePrice);
  setVal('result-loan-amount', loanAmount);
  setVal('result-down-payment', downPayment);

  const totalPayments = schedule.length;
  setVal('result-total-mortgage-payments', Math.round(monthlyPayment * totalPayments * 100) / 100);
  setVal(
    'result-total-interest',
    Math.round((monthlyPayment * totalPayments - loanAmount) * 100) / 100
  );

  // Payoff date
  const lastEntry = schedule[schedule.length - 1];
  if (lastEntry) {
    const months = [
      'Jan.',
      'Feb.',
      'Mar.',
      'Apr.',
      'May',
      'Jun.',
      'Jul.',
      'Aug.',
      'Sep.',
      'Oct.',
      'Nov.',
      'Dec.',
    ];
    setVal('result-payoff-date', months[lastEntry.dateMonth - 1] + ' ' + lastEntry.dateYear);
  }

  // Pie chart
  const pieContainer = document.getElementById('pie-chart-container');
  if (pieContainer) {
    const pieData = generatePieChartData({
      mortgage: costData.total.mortgage,
      propertyTax: costData.total.propertyTax,
      homeIns: costData.total.homeIns,
      hoa: costData.total.hoa,
      other: costData.total.other,
    });
    renderPieChart(pieContainer, pieData);
  }

  // Line chart (use actual total years from schedule)
  const actualYears = Math.ceil(schedule.length / 12);
  const lineChartContainer = document.getElementById('line-chart-container');
  if (lineChartContainer) {
    renderLineChart(lineChartContainer, schedule, actualYears);
  }

  // Extra payment savings info
  const extraPaymentInfo = document.getElementById('extra-payment-info');
  const extraPaymentText = document.getElementById('extra-payment-text');
  const interestSavedTable = document.getElementById('interest-saved-table');
  const hasExtraPayments = extraPayments.monthly > 0 || extraPayments.yearly > 0 || extraPayments.oneTime.length > 0;

  if (hasExtraPayments) {
    const originalSchedule = buildAmortizationSchedule(loanAmount, interestRate, termYears, { month: startMonth, year: startYear }, { monthly: 0, yearly: 0, yearlyStartMonth: 1, yearlyStartYear: 2026, oneTime: [] });
    const originalMonths = originalSchedule.length;
    const savedMonths = originalMonths - schedule.length;
    const savedYears = Math.floor(savedMonths / 12);
    const savedRemainingMonths = savedMonths % 12;
    const originalTotalInterest = Math.round((monthlyPayment * originalMonths - loanAmount) * 100) / 100;
    const newTotalInterest = Math.round((monthlyPayment * schedule.length - loanAmount) * 100) / 100;
    const interestSaved = Math.round((originalTotalInterest - newTotalInterest) * 100) / 100;

    if (extraPaymentInfo && extraPaymentText) {
      extraPaymentInfo.style.display = 'block';
      extraPaymentText.innerHTML = 'With the extra payment(s), the loan will be paid off in <b>' + savedYears + ' years and ' + savedRemainingMonths + ' months</b>, and <b>' + formatCurrency(interestSaved) + ' interest will be saved</b>.';
    }
    if (interestSavedTable) {
      interestSavedTable.style.display = 'block';
      setVal('saved-extra', interestSaved);
      const biweeklyPay = calculateBiweeklyPayment(monthlyPayment);
      const biweeklyTotal = biweeklyPay * 26 * Math.ceil(originalMonths / 26);
      const biweeklyInterest = Math.round((biweeklyTotal - loanAmount) * 100) / 100;
      setVal('saved-biweekly', originalTotalInterest - biweeklyInterest);
    }
  } else {
    if (extraPaymentInfo) { extraPaymentInfo.style.display = 'none'; }
    if (interestSavedTable) { interestSavedTable.style.display = 'none'; }
  }

  // Amortisation tables
  const monthlyAmo = document.getElementById('monthlyamo');
  const yearlyAmo = document.getElementById('yearlyamo');
  if (monthlyAmo) {
    monthlyAmo.innerHTML = buildMonthlyTableHTML(schedule);
  }
  if (yearlyAmo) {
    yearlyAmo.innerHTML = buildAnnualTableHTML(schedule);
  }

  // Reset toggle to annual view
  amoChange(0);

  // Biweekly section
  const showBiweeklyCheckbox = document.getElementById('csbw');
  const showBiweekly = showBiweeklyCheckbox ? showBiweeklyCheckbox.checked : false;
  const biweeklySection = document.getElementById('biweekly-section');
  if (biweeklySection) {
    if (showBiweekly) {
      const biweeklyPay = calculateBiweeklyPayment(monthlyPayment);
      const biweeklyYears = Math.ceil(totalPayments / 26);
      biweeklySection.style.display = 'block';
      setVal('biweekly-payment', biweeklyPay);
      setVal('biweekly-years', biweeklyYears + ' years');
      setVal('biweekly-total', formatCurrency(biweeklyPay * 26 * biweeklyYears));
      setVal(
        'biweekly-savings',
        formatCurrency(costData.total.mortgage - biweeklyPay * 26 * biweeklyYears)
      );
    } else {
      biweeklySection.style.display = 'none';
    }
  }

  // Scroll to results
  const resultsAnchor = document.getElementById('results');
  if (resultsAnchor) {
    resultsAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Clears all input fields in the calculator form to empty.
 * Does not affect the results section.
 */
function clearForm() {
  // Clear all text input fields
  const textInputIds = [
    'chouseprice',
    'cdownpayment',
    'cloanterm',
    'cinterestrate',
    'cstartyear',
    'cpropertytaxes',
    'chomeins',
    'cpmi',
    'choa',
    'cothercost',
    'cptinc',
    'chiinc',
    'choainc',
    'cocinc',
    'cexma',
    'cexya',
    'cexoa',
    'cexmsy',
    'cexysy',
    'cexosy',
    'xa1',
    'xa2',
    'xa3',
    'xa4',
    'xa5',
    'xa6',
    'xa7',
    'xa8',
    'xa9',
    'xa10',
    'xy1',
    'xy2',
    'xy3',
    'xy4',
    'xy5',
    'xy6',
    'xy7',
    'xy8',
    'xy9',
    'xy10',
  ];

  textInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
    }
  });
}

/* ========================================================================
   SECTION 5 — Initialisation
   ======================================================================== */

/**
 * Initialises the mortgage calculator page.
 */
// eslint-disable-next-line no-unused-vars
function initMortgageCalculator() {
  // Initialise comma formatting on all number inputs
  const numberIds = [
    'chouseprice',
    'cdownpayment',
    'cloanterm',
    'cinterestrate',
    'cpropertytaxes',
    'chomeins',
    'cpmi',
    'choa',
    'cothercost',
    'cexma',
    'cexya',
    'cexoa',
    'cptinc',
    'chiinc',
    'choainc',
    'cocinc',
    'xa1',
    'xa2',
    'xa3',
    'xa4',
    'xa5',
    'xa6',
    'xa7',
    'xa8',
    'xa9',
    'xa10',
  ];

  numberIds.forEach(id => {
    proComma2(id);
  });

  // Set initial section visibility
  cshtaxcost();
  cshmoreoption(0);
  cshadditionalonetime(0);
  amoChange(0);

  // Expose globally-used functions to window for inline onclick handlers
  window.calculateMortgage = calculateMortgage;
  window.clearForm = clearForm;
  window.cshtaxcost = cshtaxcost;
  window.cshmoreoption = cshmoreoption;
  window.cshadditionalonetime = cshadditionalonetime;
  window.amoChange = amoChange;
  window.cunitchange = cunitchange;
  window.setYearRate = setYearRate;

  // Run initial calculation with defaults
  calculateMortgage();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateMonthlyPayment,
    buildAmortizationSchedule,
    calculateBiweeklyPayment,
    formatCurrency,
    computeTotalCosts,
    generatePieChartData,
    buildAnnualTableHTML,
    buildMonthlyTableHTML,
    insertComma2,
    proComma2,
    cunitchange,
  };
}
