/**
 * @file amortization-calculator.js
 * @description Amortization calculator logic: loan amortization, charts, form handling, UI interactions.
 * @module js/amortization-calculator
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
 * Builds a month-by-month amortisation schedule.
 *
 * @param {number} principal    - Loan amount
 * @param {number} annualRate   - Annual interest rate as decimal
 * @param {number} termYears    - Loan term in years
 * @param {object} [startDate]  - { month: 1-12, year: number }
 * @param {object} [extraPayments] - {
 *   monthly: number,
 *   yearly: number,
 *   yearlyMonth: number,
 *   yearlyStartYear: number,
 *   oneTime: Array<{ amount, month, year }>
 * }
 * @returns {Array<{ month, dateMonth, dateYear, interest, principal, extraPaid, balance }>}
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

  const start = startDate || { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  const extras = extraPayments || {
    monthly: 0,
    yearly: 0,
    yearlyMonth: start.month,
    yearlyStartYear: start.year,
    oneTime: [],
  };

  const yearlyMonth = extras.yearlyMonth || start.month;
  const yearlyStartYear = extras.yearlyStartYear || start.year;

  const otMap = {};
  if (extras.oneTime && extras.oneTime.length > 0) {
    extras.oneTime.forEach(function(ot) {
      if (ot && ot.amount > 0 && ot.month >= 1 && ot.month <= 12) {
        var key = ot.year + '-' + ot.month;
        otMap[key] = (otMap[key] || 0) + ot.amount;
      }
    });
  }

  var schedule = [];
  var balance = principal;
  var paymentIndex = 0;

  while (balance > 0.005 && paymentIndex < maxPayments * 2) {
    var absMonth = start.month - 1 + paymentIndex;
    var currentYear  = start.year + Math.floor(absMonth / 12);
    var currentMonth = (absMonth % 12) + 1;

    paymentIndex++;

    var interestPortion = Math.round(balance * monthlyRate * 100) / 100;
    var principalPortion = Math.round((basePayment - interestPortion) * 100) / 100;
    if (principalPortion < 0) principalPortion = 0;

    var extraMonthly = extras.monthly > 0 ? extras.monthly : 0;

    var extraYearly = 0;
    if (extras.yearly > 0 && currentMonth === yearlyMonth && currentYear >= yearlyStartYear) {
      extraYearly = extras.yearly;
    }

    var extraOneTime = otMap[currentYear + '-' + currentMonth] || 0;
    var totalExtra = extraMonthly + extraYearly + extraOneTime;
    var totalPrincipalPaid = Math.min(principalPortion + totalExtra, balance);
    var extraPaid = Math.max(0, totalPrincipalPaid - principalPortion);

    balance = Math.round((balance - totalPrincipalPaid) * 100) / 100;
    if (balance < 0) balance = 0;

    schedule.push({
      month:      paymentIndex,
      dateMonth:  currentMonth,
      dateYear:   currentYear,
      interest:   Math.round(interestPortion * 100) / 100,
      principal:  Math.round(totalPrincipalPaid * 100) / 100,
      extraPaid:  Math.round(extraPaid * 100) / 100,
      balance:    Math.round(balance * 100) / 100,
    });

    if (balance <= 0.005) break;
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
  if (typeof value !== 'number' || !isFinite(value)) return '$0.00';
  var negative = value < 0;
  var abs = Math.abs(value);
  var parts = abs.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return negative ? '-$' + parts.join('.') : '$' + parts.join('.');
}

/**
 * Generates data for a pie chart — Principal vs Interest only.
 *
 * @param {number} totalPrincipal - Total principal paid (loan amount)
 * @param {number} totalInterest  - Total interest paid
 * @returns {Array<{ label, value, percent, color }>}
 */
function generatePieChartData(totalPrincipal, totalInterest) {
  var total = totalPrincipal + totalInterest;
  if (total === 0) return [];

  return [
    { label: 'Principal', value: totalPrincipal, percent: Math.round((totalPrincipal / total) * 100), color: '#2b7ddb' },
    { label: 'Interest',  value: totalInterest,  percent: Math.round((totalInterest / total) * 100),  color: '#8bbc21' },
  ].filter(function(item) { return item.value > 0; });
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
  var svgWidth  = width  || 300;
  var svgHeight = height || 120;
  if (!data || data.length === 0) { container.innerHTML = ''; return; }

  var cx = 58.5, cy = 58.5, radius = 50.5, innerRadius = 20.2;
  var svg = '<svg width="' + svgWidth + '" height="' + svgHeight + '">';
  svg += '<style>'
    + '.mcpline{stroke:white;stroke-width:1;}'
    + '.mcplegend{font-size:13;font-family:arial,helvetica,sans-serif;fill:#0d233a;}'
    + '.mcplabel{fill:#fff;stroke-width:2;font-family:arial,helvetica,sans-serif;font-size:12px;'
    + 'paint-order:stroke;dominant-baseline:middle;text-anchor:middle;}'
    + '</style>';

  var currentAngle = -Math.PI / 2;
  var total = data.reduce(function(s, d) { return s + d.value; }, 0);

  data.forEach(function(d) {
    var sliceAngle = (d.value / total) * 2 * Math.PI;
    var startAngle = currentAngle;
    var endAngle   = currentAngle + sliceAngle;
    var x1 = cx + radius * Math.cos(startAngle);
    var y1 = cy + radius * Math.sin(startAngle);
    var x2 = cx + radius * Math.cos(endAngle);
    var y2 = cy + radius * Math.sin(endAngle);
    var largeArc = sliceAngle > Math.PI ? 1 : 0;
    var labelText = d.label + '<br>' + formatCurrency(d.value) + ' (' + d.percent + '%)';

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
  data.forEach(function(d) {
    var sliceAngle  = (d.value / total) * 2 * Math.PI;
    var midAngle    = currentAngle + sliceAngle / 2;
    var labelRadius = (radius + innerRadius) / 2;
    var lx = cx + labelRadius * Math.cos(midAngle);
    var ly = cy + labelRadius * Math.sin(midAngle);
    var labelText2  = d.label + '<br>' + formatCurrency(d.value) + ' (' + d.percent + '%)';

    svg += '<text x="' + lx.toFixed(3) + '" y="' + ly.toFixed(3) + '" class="mcplabel" stroke="' + d.color + '"'
      + ' onmousemove="ttpieShowTT(evt,\'' + d.color + "','" + labelText2.replace(/'/g, "\\'") + '\');"'
      + ' onmouseout="ttpieHideTT();">' + d.percent + '%</text>';
    currentAngle += sliceAngle;
  });

  var legendY = 8;
  data.forEach(function(d) {
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
    window.ttpieShowTT = function(evt, color, text) {
      var tooltip = document.getElementById('ttpiett');
      if (!tooltip) return;
      tooltip.innerHTML = text;
      tooltip.style.display = 'block';
      tooltip.style.backgroundColor = color;
      var pageX = evt.pageX || evt.clientX + window.scrollX;
      var pageY = evt.pageY || evt.clientY + window.scrollY;
      tooltip.style.left = (pageX > window.innerWidth / 2)
        ? (pageX - 2 - tooltip.offsetWidth) + 'px'
        : (pageX + 16) + 'px';
      tooltip.style.top = pageY + 'px';
    };
    window.ttpieHideTT = function() {
      var tooltip = document.getElementById('ttpiett');
      if (tooltip) tooltip.style.display = 'none';
    };
  }
}

/**
 * Renders an SVG line chart into a container.
 *
 * @param {HTMLElement} container
 * @param {Array<object>} schedule - From buildAmortizationSchedule
 * @param {number} termYears
 * @param {number} [width=350]
 * @param {number} [height=220]
 */
function renderLineChart(container, schedule, termYears, width, height) {
  if (!container || !schedule || schedule.length === 0) { if (container) container.innerHTML = ''; return; }

  var svgWidth  = width  || 350;
  var svgHeight = height || 220;
  var padding = { top: 10, right: 10, bottom: 35, left: 55 };
  var chartW = svgWidth  - padding.left - padding.right;
  var chartH = svgHeight - padding.top  - padding.bottom;

  var yearlyData = [];
  var yearInterest = 0;
  var yearPrincipal = 0;
  var cumInterest = 0;
  var cumPrincipal = 0;

  for (var m = 0; m < schedule.length; m++) {
    yearInterest  += schedule[m].interest;
    yearPrincipal += schedule[m].principal;
    var isYearEnd = (m + 1) % 12 === 0 || m === schedule.length - 1;
    if (isYearEnd) {
      cumInterest  += yearInterest;
      cumPrincipal += yearPrincipal;
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

  var maxVal = 0;
  yearlyData.forEach(function(d) {
    if (d.balance > maxVal) maxVal = d.balance;
    if (d.payment > maxVal) maxVal = d.payment;
  });
  var yMax = Math.ceil(maxVal / 100000) * 100000 || 100000;

  var xScale = function(year) { return padding.left + (year / termYears) * chartW; };
  var yScale = function(val)  { return padding.top  + chartH - (val / yMax) * chartH; };
  var formatK = function(val) { return Math.round(val / 1000) + 'K'; };

  var svg = '<svg width="' + svgWidth + '" height="' + svgHeight + '">';
  svg += '<style>'
    + '.mclgrid{stroke:#999;stroke-width:0.5;}'
    + '.mcllegend{font-size:13;font-family:arial,helvetica,sans-serif;fill:#0d233a;}'
    + '.mcltitle{fill:#000;font-family:arial,helvetica,sans-serif;font-size:15px;dominant-baseline:middle;text-anchor:middle;}'
    + '.mcllabely{fill:#666;font-family:arial,helvetica,sans-serif;font-size:12px;dominant-baseline:middle;text-anchor:end;}'
    + '.mcllabelx{fill:#666;font-family:arial,helvetica,sans-serif;font-size:12px;dominant-baseline:hanging;text-anchor:middle;}'
    + '</style>';

  svg += '<text x="' + (padding.left + chartW / 2) + '" y="' + (svgHeight - 8) + '" class="mcltitle">Year</text>';

  for (var yi = 0; yi <= 4; yi++) {
    var yVal = (yi / 4) * yMax;
    var yPos = yScale(yVal);
    svg += '<line x1="' + padding.left + '" y1="' + yPos + '" x2="' + (padding.left + chartW) + '" y2="' + yPos + '" class="mclgrid"></line>';
    svg += '<text x="' + (padding.left - 8) + '" y="' + yPos + '" class="mcllabely">' + formatK(yVal) + '</text>';
  }

  var xTickInterval = Math.max(1, Math.floor(termYears / 6));
  for (var xi = 0; xi <= termYears; xi += xTickInterval) {
    var xPos = xScale(xi);
    svg += '<line x1="' + xPos + '" y1="' + padding.top + '" x2="' + xPos + '" y2="' + (padding.top + chartH) + '" class="mclgrid"></line>';
    svg += '<text x="' + xPos + '" y="' + (padding.top + chartH + 5) + '" class="mcllabelx">' + xi + '</text>';
  }

  var lines = [
    { key: 'balance',  color: '#2b7ddb', label: 'Balance'  },
    { key: 'interest', color: '#8bbc21', label: 'Interest' },
    { key: 'payment',  color: '#910000', label: 'Payment'  },
  ];

  lines.forEach(function(lineInfo) {
    var pathD = '';
    yearlyData.forEach(function(d, i) {
      var x = xScale(d.year);
      var y = yScale(d[lineInfo.key]);
      pathD += (i === 0 ? 'M ' : ' L ') + x + ' ' + y;
    });
    svg += '<path d="' + pathD + '" fill="none" stroke="' + lineInfo.color + '" stroke-width="3"></path>';
  });

  svg += '<rect x="' + padding.left + '" y="' + padding.top + '" width="' + chartW + '" height="' + chartH + '" style="stroke:#666;stroke-width:0.5;fill:none;"></rect>';

  var legY = padding.top + 5;
  lines.forEach(function(lineInfo) {
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
 * @param {boolean} [showDate=true] - Whether to show the Date column
 * @returns {string} HTML table
 */
function buildAnnualTableHTML(schedule, showDate) {
  showDate = showDate !== false;
  var yearly = [];
  var yearInterest  = 0;
  var yearPrincipal = 0;
  var yearExtra     = 0;
  var yearStartMonth = schedule[0] ? schedule[0].dateMonth : 1;
  var yearStartYear  = schedule[0] ? schedule[0].dateYear  : new Date().getFullYear();
  var yearNum = 1;

  for (var m = 0; m < schedule.length; m++) {
    var entry = schedule[m];
    yearInterest  += entry.interest;
    yearPrincipal += entry.principal;
    yearExtra     += entry.extraPaid || 0;
    var isYearEnd = (m + 1) % 12 === 0 || m === schedule.length - 1;
    if (isYearEnd) {
      var pad = function(n) { return (n < 10 ? '0' : '') + n; };
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
      yearStartYear  = m + 1 < schedule.length ? schedule[m + 1].dateYear  : new Date().getFullYear();
    }
  }

  var dateHeader = showDate ? '<th>Date</th>' : '';
  var dateCell = showDate ? function(y) { return '<td>' + y.dateRange + '</td>'; } : function() { return ''; };

  var html = '<table class="cinfoT">';
  html += '<tr align="center"><th>Year</th>' + dateHeader + '<th>Interest</th><th>Principal</th><th>Extra Paid</th><th>Ending Balance</th></tr>';
  yearly.forEach(function(y) {
    html += '<tr align="right">'
      + '<td>' + y.year      + '</td>'
      + dateCell(y)
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
 * @param {boolean} [showDate=true] - Whether to show the Date column
 * @returns {string} HTML table
 */
function buildMonthlyTableHTML(schedule, showDate) {
  showDate = showDate !== false;
  var html = '<table class="cinfoT">';
  var dateHeader = showDate ? '<th>Date</th>' : '';
  var numCols = showDate ? 6 : 5;
  html += '<tr align="center"><th>Month</th>' + dateHeader + '<th>Interest</th><th>Principal</th><th>Extra Paid</th><th>Ending Balance</th></tr>';

  for (var m = 0; m < schedule.length; m++) {
    var entry = schedule[m];
    var pad = function(n) { return (n < 10 ? '0' : '') + n; };
    var dateStr = showDate ? '<td>' + pad(entry.dateMonth) + '/' + entry.dateYear + '</td>' : '';
    html += '<tr align="right">'
      + '<td>' + entry.month            + '</td>'
      + dateStr
      + '<td>' + formatCurrency(entry.interest)  + '</td>'
      + '<td>' + formatCurrency(entry.principal) + '</td>'
      + '<td>' + formatCurrency(entry.extraPaid || 0) + '</td>'
      + '<td>' + formatCurrency(entry.balance)   + '</td>'
      + '</tr>';
    if ((m + 1) % 12 === 0 && m < schedule.length - 1) {
      html += '<tr><td colspan="' + numCols + '" align="center">End of year ' + Math.ceil((m + 1) / 12) + '</td></tr>';
    }
  }

  html += '</table>';
  return html;
}

/* ========================================================================
   SECTION 3 — Form helpers
   ======================================================================== */

/**
 * Inserts commas into a number input on blur.
 *
 * @param {HTMLElement} el   - Input element
 * @param {string}      type - 'd' dollar | 'i' integer | 'c' comma-only
 */
function insertComma2(el, type) {
  if (!el) return;
  var val = el.value.toString().replaceAll(',', '').replaceAll(' ', '');
  var result = '';

  if (type === 'i') {
    val    = val.replace(/[^\d.-]/g, '');
    result = val.toString().split('.')[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  } else if (type === 'd') {
    val    = val.replace(/[^\d.-]/g, '');
    var dParts = val.toString().split('.');
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
  var el = document.getElementById(id);
  if (!el) return;
  el.onblur = function() { insertComma2(el, 'd'); };
  insertComma2(el, 'd');
}

/**
 * Toggle the extra payments section based on checkbox state.
 * Reads checkbox state directly to show/hide extras section.
 */
function cshamoreoption() {
  var section = document.getElementById('cmoreoptioninputs');
  var linkDiv = document.getElementById('cmoreoptionlinks');
  var hidden  = document.getElementById('cmoreoption');
  var checkbox = document.getElementById('extra-payments-toggle');
  if (!section || !linkDiv || !hidden || !checkbox) return;

  var isChecked = checkbox.checked;

  if (isChecked) {
    section.style.display = 'block';
    hidden.value          = '1';
    linkDiv.innerHTML     = '<a href="#" onclick="cshamoreoption();return false;">– Fewer Options</a>';
  } else {
    section.style.display = 'none';
    hidden.value          = '0';
    linkDiv.innerHTML     = '<a href="#" onclick="cshamoreoption();return false;">+ Optional: make extra payments</a>';
  }
}

/**
 * Toggle additional one-time payment fields.
 * @param {number} aotVal - 1 show | 0 hide
 */
function cshadditionalonetime(aotVal) {
  var div     = document.getElementById('cadditionalonetimediv');
  var linkDiv = document.getElementById('cadditionalonetimelink');
  var hidden  = document.getElementById('cadditionalonetime');
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
  var monthly  = document.getElementById('monthlyamo');
  var yearly   = document.getElementById('yearlyamo');
  var selector = document.getElementById('amoselect');
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
 * Performs the full amortization calculation and updates all result sections.
 */
function calculateAmortization() {
  var el = function(id) { return document.getElementById(id); };

  // ── Core inputs ──
  var loanAmount = parseFloat((el('calo-amount') ? el('calo-amount').value : '200000').replace(/,/g, ''));
  var termYears  = parseInt((el('caloan-term-years') ? el('caloan-term-years').value : '15').replace(/,/g, ''), 10);
  var termMonths = parseInt((el('caloan-term-months') ? el('caloan-term-months').value : '0').replace(/,/g, ''), 10);
  var intRate    = parseFloat((el('cinterest-rate') ? el('cinterest-rate').value : '6').replace(/,/g, ''));

  // Defaults
  if (isNaN(loanAmount) || loanAmount <= 0) loanAmount = 200000;
  if (isNaN(termYears)  || termYears  <  0) termYears  = 15;
  if (isNaN(termMonths) || termMonths <  0) termMonths  = 0;
  if (isNaN(intRate)    || intRate    <  0) intRate     = 6;

  var annualRate = intRate / 100;
  var totalMonths = (termYears * 12) + termMonths;
  var termInYears = totalMonths / 12;

  if (totalMonths <= 0) {
    var errorMsgEl = el('result-error-message');
    if (errorMsgEl) { errorMsgEl.style.display = 'block'; errorMsgEl.textContent = 'Loan term must be greater than 0.'; }
    return;
  }

  // ── Read extras if section is visible ──
  var extrasVisible = el('cmoreoptioninputs') ? el('cmoreoptioninputs').style.display === 'block' : false;
  var startMonth, startYear, extraMonthly, extraYearly, extraOneTimeAmt, extraOneTimeM, extraOneTimeY;
  var extraYearlyM, extraYearlyY;

  if (extrasVisible) {
    // Start date
    startMonth = el('cstartmonth') ? parseInt(el('cstartmonth').value, 10) : new Date().getMonth() + 1;
    startYear  = el('cstartyear')  ? parseInt(el('cstartyear').value,  10) : new Date().getFullYear();

    // Extra payments
    extraMonthly   = parseFloat((el('cexma')  ? el('cexma').value  : '0').replace(/,/g, ''));
    extraYearly    = parseFloat((el('cexya')  ? el('cexya').value  : '0').replace(/,/g, ''));
    extraOneTimeAmt = parseFloat((el('cexoa') ? el('cexoa').value : '0').replace(/,/g, ''));
    extraOneTimeM  = el('cexosm') ? parseInt(el('cexosm').value, 10) : startMonth;
    extraOneTimeY  = el('cexosy') ? parseInt(el('cexosy').value, 10) : startYear;
    extraYearlyM   = el('cexysmm') ? parseInt(el('cexysmm').value, 10) : startMonth;
    extraYearlyY   = el('cexysy')  ? parseInt(el('cexysy').value,  10) : startYear;

    if (isNaN(extraMonthly))     extraMonthly = 0;
    if (isNaN(extraYearly))      extraYearly = 0;
    if (isNaN(extraOneTimeAmt))  extraOneTimeAmt = 0;
  } else {
    startMonth = new Date().getMonth() + 1;
    startYear  = new Date().getFullYear();
    extraMonthly = 0;
    extraYearly  = 0;
    extraOneTimeAmt = 0;
    extraOneTimeM  = startMonth;
    extraOneTimeY  = startYear;
    extraYearlyM   = startMonth;
    extraYearlyY   = startYear;
  }

  // Additional one-time payments
  var additionalOneTime = [];
  if (extrasVisible) {
    for (var i = 1; i <= 10; i++) {
      var amt = parseFloat((el('xa' + i) ? el('xa' + i).value : '0').replace(/,/g, ''));
      var mon = parseInt(el('xm' + i) ? el('xm' + i).value : startMonth, 10);
      var yr  = parseInt(el('xy' + i) ? el('xy' + i).value : startYear,  10);
      if (!isNaN(amt) && amt > 0) {
        additionalOneTime.push({ amount: amt, month: mon, year: yr });
      }
    }
  }

  var extraPayments = {
    monthly:         extraMonthly,
    yearly:          extraYearly,
    yearlyMonth:     extraYearlyM,
    yearlyStartYear: extraYearlyY,
    oneTime:         [],
  };

  if (extraOneTimeAmt > 0) {
    extraPayments.oneTime.push({ amount: extraOneTimeAmt, month: extraOneTimeM, year: extraOneTimeY });
  }
  additionalOneTime.forEach(function(ot) { extraPayments.oneTime.push(ot); });

  var hasAnyExtra = extraPayments.monthly > 0 || extraPayments.yearly > 0 || extraPayments.oneTime.length > 0;

  // ── Compute ──
  var monthlyPayment = calculateMonthlyPayment(loanAmount, annualRate, termInYears);

  var schedule = buildAmortizationSchedule(
    loanAmount, annualRate, termInYears,
    { month: startMonth, year: startYear },
    hasAnyExtra ? extraPayments : { monthly: 0, yearly: 0, yearlyMonth: startMonth, yearlyStartYear: startYear, oneTime: [] }
  );

  // Total interest = sum of schedule interest
  var totalInterest = Math.round(schedule.reduce(function(s, e) { return s + e.interest; }, 0) * 100) / 100;
  var totalExtraPaid = Math.round(schedule.reduce(function(s, e) { return s + (e.extraPaid || 0); }, 0) * 100) / 100;
  var totalPayment = Math.round((loanAmount + totalInterest) * 100) / 100;

  // Interest saved (compare to baseline without extras)
  var interestSaved = 0;
  if (hasAnyExtra) {
    var baseSchedule = buildAmortizationSchedule(
      loanAmount, annualRate, termInYears,
      { month: startMonth, year: startYear },
      { monthly: 0, yearly: 0, yearlyMonth: startMonth, yearlyStartYear: startYear, oneTime: [] }
    );
    var baseInterest = Math.round(baseSchedule.reduce(function(s, e) { return s + e.interest; }, 0) * 100) / 100;
    interestSaved = Math.round((baseInterest - totalInterest) * 100) / 100;
  }

  // Payoff date
  var lastEntry = schedule[schedule.length - 1];
  var payoffDateStr = '';
  if (lastEntry) {
    var MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
    payoffDateStr = MONTHS[lastEntry.dateMonth - 1] + ' ' + lastEntry.dateYear;
  }

  // ── DOM updates ──
  var resultsContainer = el('results-container');
  if (resultsContainer) resultsContainer.style.display = 'block';

  var setVal = function(id, val) {
    var elem = el(id);
    if (elem) elem.textContent = typeof val === 'number' ? formatCurrency(val) : val;
  };

  var monthlyPayEl = el('monthly-pay-value');
  if (monthlyPayEl) monthlyPayEl.textContent = formatCurrency(monthlyPayment);

  // Results table
  setVal('result-total-payments-count', String(schedule.length));
  setVal('result-total-payments', totalPayment);
  setVal('result-total-interest', totalInterest);

  // Extra payments row (conditional)
  var extraRow = el('total-extra-payments-row');
  if (extraRow) extraRow.style.display = hasAnyExtra ? '' : 'none';
  setVal('result-total-extra-payments', totalExtraPaid);

  // Interest saved row (conditional)
  var savedRow = el('interest-saved-row');
  if (savedRow) savedRow.style.display = hasAnyExtra ? '' : 'none';
  setVal('result-interest-saved', interestSaved);

  // Payoff date
  setVal('result-payoff-date', payoffDateStr);

  // Savings message
  var extraInfo = el('extra-payment-info');
  var extraText = el('extra-payment-text');
  if (hasAnyExtra && extraInfo && extraText) {
    var actualYears = Math.floor(schedule.length / 12);
    var actualMonths = schedule.length % 12;
    var baseLen = Math.ceil(termInYears * 12);
    var savedMonths = baseLen - schedule.length;
    extraInfo.style.display = 'block';
    extraText.innerHTML = 'With the extra payment(s), the loan will be paid off in <b>'
      + actualYears + ' years and ' + actualMonths + ' months</b>, saving <b>'
      + formatCurrency(interestSaved) + ' in interest</b>.';
  } else if (extraInfo) {
    extraInfo.style.display = 'none';
  }

  // Pie chart (Principal vs Interest)
  var pieContainer = el('pie-chart-container');
  if (pieContainer) {
    var pieData = generatePieChartData(loanAmount, totalInterest);
    renderPieChart(pieContainer, pieData);
  }

  // Amortization tables - show Date column only when extra payments are enabled
  var showDateCol = el('cmoreoption') ? el('cmoreoption').value === '1' : false;
  var monthlyAmo = el('monthlyamo');
  var yearlyAmo  = el('yearlyamo');
  if (monthlyAmo) monthlyAmo.innerHTML = buildMonthlyTableHTML(schedule, showDateCol);
  if (yearlyAmo)  yearlyAmo.innerHTML  = buildAnnualTableHTML(schedule, showDateCol);
  amoChange(0);

  // Line chart
  var lineChartContainer = el('line-chart-container');
  if (lineChartContainer) {
    var actualYearsChart = Math.ceil(schedule.length / 12);
    renderLineChart(lineChartContainer, schedule, actualYearsChart);
  }

  // Scroll to results
  var resultsAnchor = el('results');
  if (resultsAnchor) resultsAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ========================================================================
   SECTION 5 — Form clear
   ======================================================================== */

/**
 * Clears all input fields to empty.
 */
function clearForm() {
  var ids = [
    'calo-amount', 'caloan-term-years', 'caloan-term-months', 'cinterest-rate',
    'cstartyear',
    'cexma', 'cexya', 'cexoa',
    'cexmsy', 'cexysy', 'cexosy',
    'xa1', 'xa2', 'xa3', 'xa4', 'xa5', 'xa6', 'xa7', 'xa8', 'xa9', 'xa10',
    'xy1', 'xy2', 'xy3', 'xy4', 'xy5', 'xy6', 'xy7', 'xy8', 'xy9', 'xy10',
  ];
  ids.forEach(function(id) {
    var e = document.getElementById(id);
    if (e) e.value = '';
  });
}

/* ========================================================================
   SECTION 6 — Initialisation
   ======================================================================== */

/**
 * Initialises the amortization calculator page.
 * Sets all month/year selects to the browser's current date.
 */
function initAmortizationCalculator() {
  var now = new Date();
  var currMonth = now.getMonth() + 1;  // 1-12
  var currYear  = now.getFullYear();

  // Set all month selects to current month
  var monthSelectors = ['cstartmonth', 'cexmsm', 'cexysmm', 'cexosm'];
  monthSelectors.forEach(function(id) {
    var sel = document.getElementById(id);
    if (sel) sel.value = String(currMonth);
  });

  // Set all year inputs to current year
  var yearInputs = ['cstartyear', 'cexmsy', 'cexysy', 'cexosy',
    'xy1', 'xy2', 'xy3', 'xy4', 'xy5', 'xy6', 'xy7', 'xy8', 'xy9', 'xy10'];
  yearInputs.forEach(function(id) {
    var inp = document.getElementById(id);
    if (inp) inp.value = String(currYear);
  });

  // Initialize comma formatting
  var numberIds = [
    'calo-amount', 'caloan-term-years', 'caloan-term-months', 'cinterest-rate',
    'cexma', 'cexya', 'cexoa',
    'xa1', 'xa2', 'xa3', 'xa4', 'xa5', 'xa6', 'xa7', 'xa8', 'xa9', 'xa10',
  ];
  numberIds.forEach(function(id) { proComma2(id); });

  // Set up checkbox listener
  var checkbox = document.getElementById('extra-payments-toggle');
  if (checkbox) {
    checkbox.addEventListener('change', function() {
      cshamoreoption();
    });
  }

  // Hide the extras section by default
  cshamoreoption();
  cshadditionalonetime(0);
  amoChange(0);

  window.calculateAmortization = calculateAmortization;
  window.clearForm             = clearForm;
  window.cshamoreoption        = cshamoreoption;
  window.cshadditionalonetime  = cshadditionalonetime;
  window.amoChange             = amoChange;

  calculateAmortization();
}

/* ========================================================================
   SECTION 7 — Exports
   ======================================================================== */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateMonthlyPayment,
    buildAmortizationSchedule,
    formatCurrency,
    generatePieChartData,
    insertComma2,
    proComma2,
  };
}
