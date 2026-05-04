#!/usr/bin/env node

const FLEX_TOKEN = '616370007501145621616255';
const QUERY_ID = '1496223';

const fs = require('node:fs/promises');
const https = require('node:https');
const path = require('node:path');
const { URL } = require('node:url');

const API_VERSION = '3';
const MAX_REPORT_ATTEMPTS = 10;
const REPORT_RETRY_DELAY_MS = 2000;
const SEND_REQUEST_URL =
  'https://ndcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.SendRequest';

const ROOT_DIR = path.resolve(__dirname, '..');
const STATE_PATH = path.join(ROOT_DIR, 'IncrementumOS', 'agents_context', 'state.md');
let xmlParser = null;

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});

async function main() {
  console.log('Requesting IBKR Flex report...');
  const request = await requestFlexReport();

  console.log(`Received reference code ${request.referenceCode}.`);
  const report = await downloadReadyReport(request.url, request.referenceCode);

  console.log('Parsing IBKR Flex portfolio state...');
  const state = buildPortfolioState(report);
  const markdown = renderStateMarkdown(state);

  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, markdown, 'utf8');

  console.log(`Wrote ${path.relative(ROOT_DIR, STATE_PATH)}.`);
}

async function requestFlexReport() {
  const url = new URL(SEND_REQUEST_URL);
  url.searchParams.set('t', FLEX_TOKEN);
  url.searchParams.set('q', QUERY_ID);
  url.searchParams.set('v', API_VERSION);

  const xml = await httpsGet(url.toString());
  const document = await parseXml(xml, 'IBKR Flex SendRequest response');
  const status = getResponseStatus(document);
  const referenceCode = getFirstText(document, 'ReferenceCode');
  const reportUrl = getFirstText(document, 'Url');

  if (!referenceCode || !reportUrl) {
    throw new Error(`IBKR Flex request did not return a ReferenceCode and Url. ${describeIbkrResponse(document)}`);
  }

  if (status && !equalsIgnoreCase(status, 'Success')) {
    console.log(`SendRequest returned status ${status}; continuing because a reference code was provided.`);
  }

  // IBKR sometimes returns gdcdyn.interactivebrokers.com which doesn't resolve.
  // Force the known-good hostname.
  const fixedUrl = reportUrl.replace(
    /^https?:\/\/[^/]+/,
    'https://ndcdyn.interactivebrokers.com'
  );
  return { referenceCode, url: fixedUrl };
}

async function downloadReadyReport(reportUrl, referenceCode) {
  const url = new URL(reportUrl);
  url.searchParams.set('t', FLEX_TOKEN);
  url.searchParams.set('q', referenceCode);
  url.searchParams.set('v', API_VERSION);

  for (let attempt = 1; attempt <= MAX_REPORT_ATTEMPTS; attempt += 1) {
    console.log(`Downloading Flex report attempt ${attempt}/${MAX_REPORT_ATTEMPTS}...`);
    const xml = await httpsGet(url.toString());
    const document = await parseXml(xml, `IBKR Flex report attempt ${attempt}`);

    if (isProcessingResponse(document)) {
      if (attempt === MAX_REPORT_ATTEMPTS) {
        throw new Error('IBKR Flex report was still Processing after 10 attempts.');
      }

      console.log(`Report status is Processing. Waiting ${REPORT_RETRY_DELAY_MS / 1000}s before retry...`);
      await delay(REPORT_RETRY_DELAY_MS);
      continue;
    }

    const status = getResponseStatus(document);
    if (status && !equalsIgnoreCase(status, 'Success') && !hasFlexStatement(document)) {
      throw new Error(`IBKR Flex report download returned status ${status}. ${describeIbkrResponse(document)}`);
    }

    console.log(status ? `Report status is ${status}.` : 'Report XML is ready.');
    return document;
  }

  throw new Error('IBKR Flex report download did not complete.');
}

function buildPortfolioState(document) {
  const flexStatement = collectNodes(document, 'FlexStatement')[0] || {};
  const positions = extractOpenPositions(document);
  const cashBalances = extractCashBalances(document);
  const nav = extractNav(document);
  const pnl = extractPnl(document);
  const cashBase = cashBalances.reduce((sum, cash) => sum + cash.baseAmount, 0);
  const grossLongExposure = positions.reduce(
    (sum, position) => (position.marketValue > 0 ? sum + position.marketValue : sum),
    0
  );
  const grossShortExposure = positions.reduce(
    (sum, position) => (position.marketValue < 0 ? sum + Math.abs(position.marketValue) : sum),
    0
  );
  const netExposure = positions.reduce((sum, position) => sum + position.marketValue, 0);
  const generatedAt = new Date();
  const valuationDate = normalizeDate(
    firstString(
      fieldValue(flexStatement, ['toDate', 'endDate', 'whenGenerated']),
      fieldValue(selectTotalNode(collectNodes(document, 'NAVInBase')), ['date', 'reportDate']),
      formatDateOnly(generatedAt)
    )
  );

  return {
    generatedAt,
    valuationDate,
    baseCurrency: firstString(fieldValue(flexStatement, ['baseCurrency', 'currency']), 'BASE'),
    accountId: firstString(fieldValue(flexStatement, ['accountId', 'account']), ''),
    nav,
    cashBase,
    grossLongExposure,
    grossShortExposure,
    netExposure,
    positions,
    cashBalances,
    pnl,
  };
}

function extractOpenPositions(document) {
  return collectNodes(document, 'OpenPosition')
    .map((node) => {
      const ticker = firstString(
        fieldValue(node, ['symbol', 'ticker', 'underlyingSymbol', 'description']),
        ''
      ).trim();
      if (!ticker) return null;

      const quantity = firstNumber(fieldValue(node, ['position', 'quantity', 'qty', 'shares'])) ?? 0;
      const marketValue = firstNumber(
        fieldValue(node, ['positionValue', 'marketValue', 'mktValue', 'value'])
      ) ?? 0;
      const navPct = firstNumber(fieldValue(node, ['percentOfNAV', 'pctOfNAV', 'navPct']));

      return {
        ticker,
        description: firstString(fieldValue(node, ['description', 'name']), ''),
        assetClass: firstString(fieldValue(node, ['assetCategory', 'assetClass', 'type']), ''),
        currency: firstString(fieldValue(node, ['currency']), ''),
        quantity,
        averageCost: firstNumber(fieldValue(node, ['costBasisPrice', 'averageCost', 'avgCost'])),
        currentPrice: firstNumber(fieldValue(node, ['markPrice', 'currentPrice', 'price'])),
        marketValue,
        navPct,
        unrealizedPnl: firstNumber(
          fieldValue(node, ['fifoPnlUnrealized', 'unrealizedPnl', 'unrealizedPNL', 'unrealizedPnL'])
        ),
        realizedPnl: firstNumber(
          fieldValue(node, ['fifoPnlRealized', 'realizedPnl', 'realizedPNL', 'realizedPnL'])
        ),
      };
    })
    .filter(Boolean)
    .sort((left, right) => Math.abs(right.marketValue) - Math.abs(left.marketValue));
}

function extractCashBalances(document) {
  const cashReportNodes = collectNodes(document, 'CashReport').filter((node) => {
    return !fieldValue(node, ['CashReportCurrency']) && fieldValue(node, ['currency']);
  });
  const cashCurrencyNodes = collectNodes(document, 'CashReportCurrency');
  const balances = new Map();

  for (const node of [...cashReportNodes, ...cashCurrencyNodes]) {
    const currency = firstString(fieldValue(node, ['currency']), '').toUpperCase();
    if (!currency) continue;

    const amount = firstNumber(
      fieldValue(node, [
        'endingCash',
        'endingSettledCash',
        'endingCashBalance',
        'endingBalance',
        'settledCash',
        'totalCash',
        'cash',
        'total',
        'balance',
      ])
    );
    if (amount === null) continue;

    const exchangeRate = firstNumber(
      fieldValue(node, ['baseCurrencyExchangeRate', 'fxRateToBase', 'exchangeRate', 'fxRate'])
    ) ?? 1;
    const current = balances.get(currency) || { currency, amount: 0, baseAmount: 0 };
    current.amount += amount;
    current.baseAmount += amount * exchangeRate;
    balances.set(currency, current);
  }

  return [...balances.values()]
    .map((cash) => ({
      ...cash,
      amount: roundNumber(cash.amount),
      baseAmount: roundNumber(cash.baseAmount),
    }))
    .sort((left, right) => left.currency.localeCompare(right.currency));
}

function extractNav(document) {
  const navNode = selectTotalNode(collectNodes(document, 'NAVInBase'));
  return firstNumber(
    fieldValue(navNode, [
      'endOfPeriod',
      'endingValue',
      'endingNAV',
      'netAssetValue',
      'nav',
      'total',
      'value',
    ])
  );
}

function extractPnl(document) {
  const mtmNode = selectTotalNode(collectNodes(document, 'MTMPerformanceSummaryInBase'));
  const changeNode = selectTotalNode(collectNodes(document, 'ChangeInNAV'));
  return {
    total: firstNumber(
      fieldValue(mtmNode, ['total', 'totalMtm', 'totalMTM', 'mtm', 'pnl', 'profitLoss']),
      fieldValue(changeNode, ['change', 'total', 'netChange', 'pnl', 'profitLoss'])
    ),
    realized: firstNumber(fieldValue(mtmNode, ['realized', 'realizedPnl', 'realizedPNL', 'realizedPnL'])),
    unrealized: firstNumber(
      fieldValue(mtmNode, ['unrealized', 'unrealizedPnl', 'unrealizedPNL', 'unrealizedPnL'])
    ),
  };
}

function renderStateMarkdown(state) {
  const generatedDate = formatDateOnly(state.generatedAt);
  const nav = state.nav ?? state.cashBase + state.netExposure;
  const cashPct = nav !== 0 ? (state.cashBase / nav) * 100 : 0;
  const grossLongPct = nav !== 0 ? (state.grossLongExposure / nav) * 100 : 0;
  const grossShortPct = nav !== 0 ? (state.grossShortExposure / nav) * 100 : 0;
  const netPct = nav !== 0 ? (state.netExposure / nav) * 100 : 0;

  return [
    '# Portfolio State - IncrementumOS',
    '',
    `> Generated by \`tools/ibkr-flex-pull.js\` on ${generatedDate}`,
    '> Source: IBKR Flex Web Service',
    '',
    '## Last Update',
    '',
    `\`${state.valuationDate || generatedDate}\``,
    '',
    '## NAV and Exposure',
    '',
    `- **NAV:** ${formatMoney(nav, state.baseCurrency)}`,
    `- **Cash:** ${formatMoney(state.cashBase, state.baseCurrency)} (${formatPercent(cashPct)} NAV)`,
    `- **Gross long exposure:** ${formatMoney(state.grossLongExposure, state.baseCurrency)} (${formatPercent(grossLongPct)} NAV)`,
    `- **Gross short exposure:** ${formatMoney(state.grossShortExposure, state.baseCurrency)} (${formatPercent(grossShortPct)} NAV)`,
    `- **Net exposure:** ${formatMoney(state.netExposure, state.baseCurrency)} (${formatPercent(netPct)} NAV)`,
    `- **P&L:** ${formatOptionalMoney(state.pnl.total, state.baseCurrency)}`,
    '',
    '## Cash by Currency',
    '',
    '| Currency | Cash | Base Cash |',
    '|---|---:|---:|',
    renderCashRows(state.cashBalances, state.baseCurrency),
    '',
    '## Open Positions',
    '',
    '| Ticker | Type | Direction | Quantity | Price | Market Value | % NAV | Unrealized P&L |',
    '|---|---|---|---:|---:|---:|---:|---:|',
    renderPositionRows(state.positions, nav, state.baseCurrency),
    '',
    '## P&L',
    '',
    `- **Total:** ${formatOptionalMoney(state.pnl.total, state.baseCurrency)}`,
    `- **Realized:** ${formatOptionalMoney(state.pnl.realized, state.baseCurrency)}`,
    `- **Unrealized:** ${formatOptionalMoney(state.pnl.unrealized, state.baseCurrency)}`,
    '',
    '## Notes',
    '',
    '- Source script: `tools/ibkr-flex-pull.js`',
    '- Dates use ISO YYYY-MM-DD.',
    '',
  ].join('\n');
}

function renderCashRows(cashBalances, baseCurrency) {
  if (!cashBalances.length) return '| _none_ |  |  |';

  return cashBalances
    .map((cash) => {
      return [
        escapeMarkdown(cash.currency),
        formatMoney(cash.amount, cash.currency),
        formatMoney(cash.baseAmount, baseCurrency),
      ].join(' | ');
    })
    .map((row) => `| ${row} |`)
    .join('\n');
}

function renderPositionRows(positions, nav, baseCurrency) {
  if (!positions.length) return '| _none_ |  |  |  |  |  |  |  |';

  return positions
    .map((position) => {
      const navPct = position.navPct ?? (nav !== 0 ? (position.marketValue / nav) * 100 : 0);
      return [
        escapeMarkdown(position.ticker),
        escapeMarkdown(position.assetClass || ''),
        position.quantity < 0 || position.marketValue < 0 ? 'Short' : 'Long',
        formatNumber(position.quantity, 0, Math.abs(position.quantity) >= 100 ? 0 : 4),
        formatOptionalMoney(position.currentPrice, position.currency || baseCurrency),
        formatMoney(position.marketValue, position.currency || baseCurrency),
        formatPercent(navPct),
        formatOptionalMoney(position.unrealizedPnl, position.currency || baseCurrency),
      ].join(' | ');
    })
    .map((row) => `| ${row} |`)
    .join('\n');
}

async function parseXml(xml, label) {
  try {
    return await loadXmlParser()(xml, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
    });
  } catch (error) {
    throw new Error(`Unable to parse XML from ${label}: ${error.message}`);
  }
}

function loadXmlParser() {
  if (xmlParser) return xmlParser;

  try {
    xmlParser = require('xml2js').parseStringPromise;
    return xmlParser;
  } catch (error) {
    throw new Error('Unable to load xml2js. Run npm install before invoking node tools/ibkr-flex-pull.js.');
  }
}

function httpsGet(urlString, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    if (url.protocol !== 'https:') {
      reject(new Error(`IBKR Flex URL must use https: ${url.origin}${url.pathname}`));
      return;
    }

    const request = https.get(
      url,
      {
        headers: {
          Accept: 'application/xml,text/xml,*/*',
          'User-Agent': 'IncrementumOS ibkr-flex-pull/1.0',
        },
      },
      (response) => {
        const statusCode = response.statusCode || 0;

        if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
          response.resume();
          if (redirectCount >= 5) {
            reject(new Error('Too many redirects from IBKR Flex Web Service.'));
            return;
          }

          const nextUrl = new URL(response.headers.location, url);
          resolve(httpsGet(nextUrl.toString(), redirectCount + 1));
          return;
        }

        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`IBKR Flex HTTP ${statusCode} from ${url.origin}${url.pathname}: ${body.slice(0, 500)}`));
            return;
          }

          resolve(body);
        });
      }
    );

    request.setTimeout(30000, () => {
      request.destroy(new Error(`IBKR Flex request timed out for ${url.origin}${url.pathname}`));
    });
    request.on('error', reject);
  });
}

function collectNodes(value, tagName, matches = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectNodes(item, tagName, matches);
    return matches;
  }

  if (!value || typeof value !== 'object') return matches;

  for (const [key, child] of Object.entries(value)) {
    if (key === tagName) {
      for (const node of asArray(child)) matches.push(node);
    }
    collectNodes(child, tagName, matches);
  }

  return matches;
}

function selectTotalNode(nodes) {
  if (!nodes.length) return {};

  return (
    nodes.find(isTotalLikeNode) ||
    nodes.find((node) => fieldValue(node, ['total']) !== undefined) ||
    nodes[0]
  );
}

function isTotalLikeNode(node) {
  return ['assetCategory', 'currency', 'levelOfDetail', 'description', 'name'].some((fieldName) => {
    return /^(total|all|base)$/i.test(firstString(fieldValue(node, [fieldName]), ''));
  });
}

function hasFlexStatement(document) {
  return collectNodes(document, 'FlexStatement').length > 0;
}

function isProcessingResponse(document) {
  const status = getResponseStatus(document);
  const message = getFirstText(document, 'ErrorMessage');
  return equalsIgnoreCase(status, 'Processing') || /processing/i.test(message);
}

function getResponseStatus(document) {
  return getFirstText(document, 'Status');
}

function describeIbkrResponse(document) {
  const code = getFirstText(document, 'ErrorCode');
  const message = getFirstText(document, 'ErrorMessage');
  const status = getResponseStatus(document);
  const details = [
    status ? `Status: ${status}` : '',
    code ? `ErrorCode: ${code}` : '',
    message ? `ErrorMessage: ${message}` : '',
  ].filter(Boolean);

  return details.join(' ') || 'No IBKR error details were provided.';
}

function getFirstText(document, tagName) {
  return firstString(...collectNodes(document, tagName).map(textValue));
}

function textValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return firstString(value._, value.value, value.text);
  return '';
}

function fieldValue(record, names) {
  if (!record || typeof record !== 'object') return undefined;

  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(record, name)) return record[name];
  }

  const lowerCaseNames = new Set(names.map((name) => name.toLowerCase()));
  for (const [key, value] of Object.entries(record)) {
    if (lowerCaseNames.has(key.toLowerCase())) return value;
  }

  return undefined;
}

function firstString(...values) {
  for (const value of values.flat()) {
    if (value === null || value === undefined) continue;
    const stringValue = String(value).trim();
    if (stringValue) return stringValue;
  }
  return '';
}

function firstNumber(...values) {
  for (const value of values.flat()) {
    const number = toNumber(value);
    if (number !== null) return number;
  }
  return null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function equalsIgnoreCase(left, right) {
  return String(left || '').toLowerCase() === String(right || '').toLowerCase();
}

function escapeMarkdown(value) {
  return String(value || '').replace(/\|/g, '\\|');
}

function formatMoney(value, currency) {
  return `${currency || 'BASE'} ${formatNumber(roundNumber(value), 2, 2)}`;
}

function formatOptionalMoney(value, currency) {
  return value === null || value === undefined ? '_' : formatMoney(value, currency);
}

function formatPercent(value) {
  return `${formatNumber(roundNumber(value), 1, 1)}%`;
}

function formatNumber(value, minimumFractionDigits, maximumFractionDigits) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value || 0);
}

function roundNumber(value) {
  return Number(Number(value || 0).toFixed(4));
}

function normalizeDate(value) {
  const text = firstString(value);
  const eightDigitDate = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (eightDigitDate) return `${eightDigitDate[1]}-${eightDigitDate[2]}-${eightDigitDate[3]}`;

  const isoDate = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];

  return text;
}

function formatDateOnly(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}
