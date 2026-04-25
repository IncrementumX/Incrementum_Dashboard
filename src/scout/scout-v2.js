/*
 * Scout V2 — decision-grade Macro / Signal Cockpit.
 *
 * Five panels:
 *   1. Macro Regime         — 5 FRED series + simple labels
 *   2. Portfolio Momentum   — only assets present in user portfolio (returns / vol / drawdown / trend)
 *   3. Cross-Asset Signals  — Gold/Silver, Gold vs Real Yields, Miners vs Metal, VIX context
 *   4. Portfolio Correlation— pairwise 30D / 90D matrix for portfolio assets only
 *   5. Economic Calendar    — static schedule (FOMC + recurring releases)
 *
 * Strict rules:
 *   - Sources: FRED + existing market data only (scout-data.json). No new APIs.
 *   - No fake / simulated fallback. If data unavailable -> explicit unavailable signal.
 *   - Every value must carry a source + timestamp.
 *   - No trade idea generation.
 */

const FRED_SERIES = {
  DGS10:  { label: "10Y Nominal Yield",      unit: "%",   source: "FRED" },
  DFII10: { label: "10Y Real Yield",         unit: "%",   source: "FRED" },
  T10YIE: { label: "10Y Breakeven",          unit: "%",   source: "FRED" },
  T10Y2Y: { label: "2s10s Curve",            unit: "bps", source: "FRED" },
  T5YIFR: { label: "5Y5Y Inflation Forward", unit: "%",   source: "FRED" },
};

const STALE_WARN_DAYS = 7;
const STALE_BREAK_DAYS = 30;

// ---------------------------------------------------------------------------
// Dataset loader
// ---------------------------------------------------------------------------

let _datasetCache = null;
let _datasetCacheAt = 0;
const CACHE_TTL_MS = 15 * 60 * 1000;

function resolveScoutDataUrls() {
  const isLocalDev = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
  // Always include the static scout-data.json as fallback so plain `python -m http.server`
  // still serves Scout even when the live /__scout_data__ endpoint is not running.
  if (isLocalDev) return ["/__scout_data__", "/scout-data.json", "./scout-data.json"];
  const base = window.location.pathname.replace(/\/[^/]*$/, "") || "";
  return [`${base}/scout-data.json`, "./scout-data.json"];
}

async function loadDataset() {
  const now = Date.now();
  if (_datasetCache && now - _datasetCacheAt < CACHE_TTL_MS) return _datasetCache;
  for (const url of resolveScoutDataUrls()) {
    try {
      const resp = await fetch(url, { cache: "no-store" });
      if (resp.ok) {
        const payload = await resp.json();
        _datasetCache = payload;
        _datasetCacheAt = now;
        return payload;
      }
    } catch (_) { /* try next URL */ }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function buildScoutModel({ tickers = [] } = {}) {
  const dataset = await loadDataset();
  if (!dataset) {
    return {
      unavailable: true,
      reason: "Could not load scout-data.json (FRED + Yahoo). Run the local dev server or verify deployment.",
    };
  }

  const meta = computeMeta(dataset);
  const macro = buildMacroPanel(dataset, meta);
  const momentum = buildMomentumPanel(dataset, tickers, meta);
  const crossAsset = buildCrossAssetPanel(dataset, meta);
  const correlation = buildCorrelationPanel(dataset, tickers);
  const calendar = buildCalendarPanel(meta.todayIso);

  return { unavailable: false, meta, macro, momentum, crossAsset, correlation, calendar };
}

// ---------------------------------------------------------------------------
// Meta + staleness
// ---------------------------------------------------------------------------

function computeMeta(dataset) {
  const generatedAt = dataset?.generatedAt || null;
  let lastDataDate = null;
  const macroSeries = dataset?.macro || {};
  for (const code of Object.keys(macroSeries)) {
    const arr = macroSeries[code];
    if (Array.isArray(arr) && arr.length) {
      const last = arr[arr.length - 1].date;
      if (!lastDataDate || last > lastDataDate) lastDataDate = last;
    }
  }
  const assetSeries = dataset?.assets || {};
  for (const sym of Object.keys(assetSeries)) {
    const arr = assetSeries[sym];
    if (Array.isArray(arr) && arr.length) {
      const last = arr[arr.length - 1].date;
      if (!lastDataDate || last > lastDataDate) lastDataDate = last;
    }
  }
  const todayIso = new Date().toISOString().slice(0, 10);
  const agedDays = lastDataDate ? daysBetween(lastDataDate, todayIso) : null;
  let stalenessLevel = "fresh";
  if (agedDays === null) stalenessLevel = "unknown";
  else if (agedDays >= STALE_BREAK_DAYS) stalenessLevel = "stale";
  else if (agedDays >= STALE_WARN_DAYS) stalenessLevel = "warn";
  return {
    source: dataset.source || "unknown",
    generatedAt,
    lastDataDate,
    agedDays,
    stalenessLevel,
    todayIso,
    fredSources: dataset?.meta?.fredSeriesSources || {},
  };
}

function daysBetween(isoA, isoB) {
  const a = new Date(`${isoA}T00:00:00Z`);
  const b = new Date(`${isoB}T00:00:00Z`);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Panel 1 — Macro Regime
// ---------------------------------------------------------------------------

function buildMacroPanel(dataset, meta) {
  const items = Object.keys(FRED_SERIES).map((code) => {
    const series = dataset?.macro?.[code] || [];
    if (!series.length) {
      return { code, ...FRED_SERIES[code], value: null, change20d: null, asOf: null, available: false };
    }
    const last = series[series.length - 1];
    const idx20 = Math.max(0, series.length - 21);
    const ago = series[idx20];
    const change20d = last.value - ago.value;
    return {
      code,
      ...FRED_SERIES[code],
      value: last.value,
      change20d,
      asOf: last.date,
      sourceDetail: meta.fredSources[code] || "FRED",
      available: true,
    };
  });

  const real = items.find((i) => i.code === "DFII10");
  const breakeven = items.find((i) => i.code === "T10YIE");
  const curve = items.find((i) => i.code === "T10Y2Y");

  const labels = [];
  if (real?.available) {
    labels.push({
      label: real.change20d >= 0 ? "Liquidity tightening" : "Liquidity easing",
      detail: `Real yield 20D change: ${(real.change20d >= 0 ? "+" : "") + real.change20d.toFixed(2)}%`,
      sentiment: real.change20d >= 0 ? "negative" : "positive",
    });
    labels.push({
      label: real.change20d >= 0 ? "Real yield pressure rising" : "Real yield pressure falling",
      detail: `10Y real yield level: ${real.value.toFixed(2)}%`,
      sentiment: real.change20d >= 0 ? "negative" : "positive",
    });
  }
  if (breakeven?.available) {
    labels.push({
      label: breakeven.change20d >= 0 ? "Inflation expectations rising" : "Inflation expectations falling",
      detail: `Breakeven 20D change: ${(breakeven.change20d >= 0 ? "+" : "") + breakeven.change20d.toFixed(2)}%`,
      sentiment: "neutral",
    });
  }
  if (curve?.available) {
    const inverted = curve.value < 0;
    labels.push({
      label: inverted ? "Curve inverted" : "Curve positive",
      detail: `2s10s level: ${curve.value.toFixed(0)} bps`,
      sentiment: inverted ? "negative" : "neutral",
    });
  }

  return { items, labels };
}

// ---------------------------------------------------------------------------
// Panel 2 — Portfolio Momentum (portfolio assets ONLY)
// ---------------------------------------------------------------------------

function buildMomentumPanel(dataset, tickers, meta) {
  const rows = tickers.map((ticker) => {
    const series = dataset?.assets?.[ticker];
    if (!Array.isArray(series) || series.length < 2) {
      return { ticker, available: false, reason: "No price series in scout-data.json for this ticker." };
    }
    const last = series[series.length - 1];
    const price = last.value;
    const ret = (n) => percentReturn(series, n);
    const r1 = ret(1), r5 = ret(5), r20 = ret(20), r60 = ret(60), r180 = ret(180);
    const vol60 = annualizedVol(series, 60);
    const drawdown180 = maxDrawdown(series, 180);

    let trend;
    if (r20 === null || r60 === null) trend = "Insufficient";
    else if (r20 > 0 && r60 > 0) trend = "Uptrend";
    else if (r20 < 0 && r60 < 0) trend = "Downtrend";
    else trend = "Neutral";

    return {
      ticker,
      available: true,
      price,
      asOf: last.date,
      r1, r5, r20, r60, r180,
      vol60,
      drawdown180,
      trend,
      source: "Yahoo Finance",
    };
  });
  return { rows, todayIso: meta.todayIso };
}

function percentReturn(series, periods) {
  const n = series.length;
  if (n <= periods) return null;
  const last = series[n - 1].value;
  const ago = series[n - 1 - periods].value;
  if (!ago) return null;
  return last / ago - 1;
}

function annualizedVol(series, periods) {
  const n = series.length;
  if (n <= periods + 1) return null;
  const window = series.slice(n - periods - 1);
  const rets = [];
  for (let i = 1; i < window.length; i += 1) {
    if (window[i - 1].value && window[i].value) {
      rets.push(Math.log(window[i].value / window[i - 1].value));
    }
  }
  if (rets.length < 2) return null;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

function maxDrawdown(series, periods) {
  const n = series.length;
  if (n <= 1) return null;
  const window = series.slice(Math.max(0, n - periods - 1));
  let peak = window[0].value;
  let mdd = 0;
  for (const point of window) {
    if (point.value > peak) peak = point.value;
    const dd = (point.value - peak) / peak;
    if (dd < mdd) mdd = dd;
  }
  return mdd;
}

// ---------------------------------------------------------------------------
// Panel 3 — Cross-Asset Signals
// ---------------------------------------------------------------------------

function buildCrossAssetPanel(dataset, meta) {
  const signals = [];

  // Gold / Silver ratio (proxies: GLD / SLV)
  signals.push(buildRatioSignal({
    dataset,
    name: "Gold / Silver Ratio",
    numerator: "GLD",
    denominator: "SLV",
    proxyNote: "Spot gold/silver unavailable; using GLD / SLV ETF prices as proxy.",
    interpretation: (ratio, mean90, z) => {
      if (z === null) return "Insufficient history.";
      if (z > 1) return "Silver under-performing gold (defensive metal regime).";
      if (z < -1) return "Silver out-performing gold (industrial / risk-on tilt).";
      return "Gold/silver ratio near 90D average.";
    },
  }));

  // Gold vs real yields — show both levels with directional read
  signals.push(buildLevelsSignal({
    dataset,
    name: "Gold vs Real Yields",
    legA: { label: "GLD price (USD)", series: "GLD", source: "Yahoo Finance", isAsset: true },
    legB: { label: "10Y Real Yield (%)", series: "DFII10", source: "FRED", isAsset: false },
    interpretation: (priceA, levelB, changeA20, changeB20) => {
      if (changeA20 === null || changeB20 === null) return "Insufficient history for 20D comparison.";
      const goldUp = changeA20 > 0;
      const realDown = changeB20 < 0;
      if (goldUp && realDown) return "Gold rising while real yields fall — supportive macro.";
      if (!goldUp && !realDown) return "Gold falling while real yields rise — adverse macro.";
      return "Mixed: gold and real yields moving in same direction.";
    },
  }));

  // Miners vs Metal — RING (gold miners ETF) vs GLD
  signals.push(buildRatioSignal({
    dataset,
    name: "Gold Miners vs Gold (RING / GLD)",
    numerator: "RING",
    denominator: "GLD",
    interpretation: (ratio, mean90, z) => {
      if (z === null) return "Insufficient history.";
      if (z > 1) return "Miners out-performing metal (operating leverage paying off).";
      if (z < -1) return "Miners under-performing metal (sector under stress).";
      return "Miners tracking metal near 90D average.";
    },
  }));

  // VIX context — current level + 90D percentile
  signals.push(buildVixContext(dataset));

  return { signals, asOf: meta.lastDataDate };
}

function buildRatioSignal({ dataset, name, numerator, denominator, proxyNote, interpretation }) {
  const numSeries = dataset?.assets?.[numerator] || [];
  const denSeries = dataset?.assets?.[denominator] || [];
  if (!numSeries.length || !denSeries.length) {
    return { name, available: false, reason: `Missing series: ${!numSeries.length ? numerator : ""} ${!denSeries.length ? denominator : ""}`.trim() };
  }
  const aligned = alignSeries(numSeries, denSeries);
  if (aligned.length < 2) {
    return { name, available: false, reason: "No common dates between series." };
  }
  const ratios = aligned.map(([a, b]) => a.value / b.value).filter(Number.isFinite);
  const last = ratios[ratios.length - 1];
  const window = ratios.slice(-90);
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  const variance = window.reduce((a, r) => a + (r - mean) ** 2, 0) / Math.max(1, window.length - 1);
  const std = Math.sqrt(variance);
  const z = std > 0 ? (last - mean) / std : null;
  const lastDate = aligned[aligned.length - 1][0].date;
  return {
    name,
    available: true,
    value: last,
    valueLabel: last.toFixed(3),
    mean90: mean,
    z,
    asOf: lastDate,
    source: `Yahoo Finance (${numerator} / ${denominator})`,
    proxyNote: proxyNote || null,
    interpretation: interpretation(last, mean, z),
  };
}

function buildLevelsSignal({ dataset, name, legA, legB, interpretation }) {
  const a = legA.isAsset ? dataset?.assets?.[legA.series] : dataset?.macro?.[legA.series];
  const b = legB.isAsset ? dataset?.assets?.[legB.series] : dataset?.macro?.[legB.series];
  if (!a?.length || !b?.length) {
    return { name, available: false, reason: "Missing one of the legs." };
  }
  const aLast = a[a.length - 1];
  const bLast = b[b.length - 1];
  const a20 = a[Math.max(0, a.length - 21)];
  const b20 = b[Math.max(0, b.length - 21)];
  const changeA = aLast.value - a20.value;
  const changeB = bLast.value - b20.value;
  return {
    name,
    available: true,
    legs: [
      { label: legA.label, value: aLast.value, change20d: changeA, asOf: aLast.date, source: legA.source },
      { label: legB.label, value: bLast.value, change20d: changeB, asOf: bLast.date, source: legB.source },
    ],
    interpretation: interpretation(aLast.value, bLast.value, changeA, changeB),
  };
}

function buildVixContext(dataset) {
  const vix = dataset?.assets?.VIX || [];
  if (!vix.length) {
    return { name: "VIX Context", available: false, reason: "VIX series unavailable." };
  }
  const last = vix[vix.length - 1];
  const window = vix.slice(-90).map((p) => p.value).filter(Number.isFinite);
  const sorted = [...window].sort((x, y) => x - y);
  const rank = sorted.findIndex((v) => v >= last.value);
  const percentile = rank < 0 ? 100 : (rank / sorted.length) * 100;
  let regime;
  if (last.value < 15) regime = "Risk-on (compressed vol).";
  else if (last.value < 20) regime = "Calm.";
  else if (last.value < 30) regime = "Elevated risk premium.";
  else regime = "Risk-off (high vol).";
  return {
    name: "VIX Context",
    available: true,
    value: last.value,
    valueLabel: last.value.toFixed(2),
    percentile90d: percentile,
    asOf: last.date,
    source: "Yahoo Finance (^VIX)",
    interpretation: `${regime} 90D percentile: ${percentile.toFixed(0)}%.`,
  };
}

function alignSeries(a, b) {
  const mapB = new Map(b.map((p) => [p.date, p]));
  const out = [];
  for (const pa of a) {
    const pb = mapB.get(pa.date);
    if (pb) out.push([pa, pb]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Panel 4 — Portfolio Correlation (portfolio assets ONLY)
// ---------------------------------------------------------------------------

function buildCorrelationPanel(dataset, tickers) {
  const available = tickers.filter((t) => Array.isArray(dataset?.assets?.[t]) && dataset.assets[t].length >= 31);
  const unavailable = tickers.filter((t) => !available.includes(t));
  if (available.length < 2) {
    return {
      available: false,
      reason: available.length === 0
        ? "None of the portfolio tickers have a price series in scout-data.json."
        : `Only ${available[0]} has a price series. Need at least 2 for correlation.`,
      tickersWithoutData: unavailable,
    };
  }

  // Build aligned daily-return matrix
  const seriesMap = Object.fromEntries(available.map((t) => [t, dataset.assets[t]]));
  const dates = intersectDates(available.map((t) => seriesMap[t].map((p) => p.date)));

  const returns = Object.fromEntries(available.map((t) => [t, []]));
  for (let i = 1; i < dates.length; i += 1) {
    available.forEach((t) => {
      const map = new Map(seriesMap[t].map((p) => [p.date, p.value]));
      const prev = map.get(dates[i - 1]);
      const curr = map.get(dates[i]);
      if (prev && curr) returns[t].push(Math.log(curr / prev));
      else returns[t].push(null);
    });
  }

  const insufficient30 = dates.length < 31;
  const matrix30 = insufficient30 ? null : buildCorrMatrix(available, returns, 30);
  const matrix90 = dates.length < 91 ? null : buildCorrMatrix(available, returns, 90);

  return {
    available: true,
    tickers: available,
    tickersWithoutData: unavailable,
    matrix30,
    matrix90,
    asOf: dates[dates.length - 1] || null,
    source: "Yahoo Finance daily log returns",
    insufficient30,
    insufficient90: dates.length < 91,
  };
}

function buildCorrMatrix(tickers, returnsByTicker, window) {
  const N = tickers.length;
  const matrix = Array.from({ length: N }, () => new Array(N).fill(null));
  for (let i = 0; i < N; i += 1) {
    for (let j = 0; j < N; j += 1) {
      if (i === j) matrix[i][j] = 1;
      else if (j < i) matrix[i][j] = matrix[j][i];
      else {
        const a = returnsByTicker[tickers[i]].slice(-window);
        const b = returnsByTicker[tickers[j]].slice(-window);
        matrix[i][j] = pearson(a, b);
      }
    }
  }
  return matrix;
}

function pearson(a, b) {
  const pairs = [];
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    if (a[i] !== null && b[i] !== null && Number.isFinite(a[i]) && Number.isFinite(b[i])) {
      pairs.push([a[i], b[i]]);
    }
  }
  if (pairs.length < 5) return null;
  const meanA = pairs.reduce((s, [x]) => s + x, 0) / pairs.length;
  const meanB = pairs.reduce((s, [, y]) => s + y, 0) / pairs.length;
  let cov = 0, varA = 0, varB = 0;
  for (const [x, y] of pairs) {
    cov += (x - meanA) * (y - meanB);
    varA += (x - meanA) ** 2;
    varB += (y - meanB) ** 2;
  }
  if (varA === 0 || varB === 0) return null;
  return cov / Math.sqrt(varA * varB);
}

function intersectDates(dateLists) {
  if (!dateLists.length) return [];
  let acc = new Set(dateLists[0]);
  for (let i = 1; i < dateLists.length; i += 1) {
    const next = new Set();
    for (const d of dateLists[i]) if (acc.has(d)) next.add(d);
    acc = next;
  }
  return [...acc].sort();
}

// ---------------------------------------------------------------------------
// Panel 5 — Economic Calendar (static schedule; no APIs)
// ---------------------------------------------------------------------------

// FOMC 2026 schedule as published by the Federal Reserve.
// Source: federalreserve.gov/monetarypolicy/fomccalendars.htm (publicly announced).
const FOMC_2026 = [
  "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17",
  "2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09",
];

function buildCalendarPanel(todayIso) {
  const events = [];

  for (const d of FOMC_2026) {
    events.push({
      date: d, name: "FOMC Decision", category: "FOMC",
      source: "Federal Reserve (published schedule)", estimated: false,
    });
  }

  // Recurring monthly releases: estimate next 4 months from today.
  const today = new Date(`${todayIso}T00:00:00Z`);
  for (let m = 0; m < 4; m += 1) {
    const target = new Date(today);
    target.setUTCMonth(target.getUTCMonth() + m);
    const y = target.getUTCFullYear();
    const mo = target.getUTCMonth();
    const tag = monthTag(y, mo);
    events.push(makeRecurring(y, mo, 12, `CPI (${tag})`, "Inflation", "BLS — typical release window (10th-15th)"));
    events.push(makeRecurring(y, mo, 28, `PCE (${tag})`, "Inflation", "BEA — typical release window (28th-30th)"));
    const nfp = nthWeekday(y, mo, 5, 1); // first Friday
    events.push(makeRecurring(y, mo, nfp, `Nonfarm Payrolls (${tag})`, "Labor", "BLS — first Friday"));
    const ism1 = firstBusinessDay(y, mo);
    events.push(makeRecurring(y, mo, ism1, `ISM Manufacturing PMI (${tag})`, "Activity", "ISM — first business day"));
    const ism3 = nthBusinessDay(y, mo, 3);
    events.push(makeRecurring(y, mo, ism3, `ISM Services PMI (${tag})`, "Activity", "ISM — third business day"));
  }

  const upcoming = events
    .filter((e) => e.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);

  return {
    events: upcoming,
    note: "FOMC dates from the Federal Reserve published schedule. Other dates are typical release windows; the actual release date is set by the publishing agency.",
  };
}

function makeRecurring(year, month, day, name, category, source) {
  return { date: isoDate(year, month, day), name, category, source, estimated: true };
}

function isoDate(year, month, day) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function monthTag(year, month) {
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[month]} ${year}`;
}

function firstBusinessDay(year, month) {
  for (let d = 1; d <= 7; d += 1) {
    const dt = new Date(Date.UTC(year, month, d));
    const w = dt.getUTCDay();
    if (w !== 0 && w !== 6) return d;
  }
  return 1;
}

function nthBusinessDay(year, month, n) {
  let count = 0;
  for (let d = 1; d <= 31; d += 1) {
    const dt = new Date(Date.UTC(year, month, d));
    if (dt.getUTCMonth() !== month) break;
    const w = dt.getUTCDay();
    if (w !== 0 && w !== 6) {
      count += 1;
      if (count === n) return d;
    }
  }
  return 1;
}

// nthWeekday: weekday is 0=Sun..6=Sat, n is 1-based.
function nthWeekday(year, month, weekday, n) {
  let count = 0;
  for (let d = 1; d <= 31; d += 1) {
    const dt = new Date(Date.UTC(year, month, d));
    if (dt.getUTCMonth() !== month) break;
    if (dt.getUTCDay() === weekday) {
      count += 1;
      if (count === n) return d;
    }
  }
  return 1;
}
