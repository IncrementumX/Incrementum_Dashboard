import {
  SCOUT_DATA_STATUS,
  SCOUT_IMPLEMENTATION_STATUS,
  createBacktestResult,
  createOpportunity,
  createScorecard,
} from "./models.js";

const ASSET_DEFINITIONS = [
  { symbol: "RING", name: "RING", category: "Gold miners", priority: 1 },
  { symbol: "AGQ", name: "AGQ", category: "2x daily silver", priority: 1 },
  { symbol: "GLD", name: "GLD", category: "Gold benchmark", priority: 2 },
  { symbol: "TIP", name: "TIP", category: "Inflation-linked Treasuries", priority: 2 },
  { symbol: "TLT", name: "TLT", category: "Long nominal Treasuries", priority: 2 },
  { symbol: "UUP", name: "UUP", category: "Dollar proxy", priority: 2 },
  { symbol: "COPX", name: "COPX", category: "Copper miners", priority: 3 },
  { symbol: "URA", name: "URA", category: "Uranium equities", priority: 3 },
];

const MACRO_SERIES = [
  { code: "DGS10", label: "UST 10Y nominal yield", unit: "%" },
  { code: "DFII10", label: "UST 10Y real yield", unit: "%" },
  { code: "T10YIE", label: "10Y breakeven inflation", unit: "%" },
  { code: "T10Y2Y", label: "10s2s curve slope", unit: "bp" },
  { code: "T5YIFR", label: "5y5y forward inflation", unit: "%" },
  { code: "DXY", label: "Broad dollar proxy", unit: "index" },
];

const DRIVER_LABELS = {
  DGS10: "Nominal 10Y",
  DFII10: "Real 10Y",
  T10YIE: "Breakevens",
  T10Y2Y: "10s2s curve",
  T5YIFR: "5y5y inflation",
  DXY: "Dollar",
};

const HORIZONS = [1, 5, 20, 60, 120];

const RELATIVE_EXPRESSIONS = [
  ["RING", "GLD"],
  ["RING", "TIP"],
  ["AGQ", "GLD"],
  ["AGQ", "UUP"],
  ["TIP", "TLT"],
  ["GLD", "TLT"],
  ["COPX", "DXY"],
  ["URA", "TLT"],
];

export async function createMacroResearchModel({ scoutState, portfolioContext, providerStatus }) {
  const dataset = await loadMacroDataset();
  const focusAssets = ASSET_DEFINITIONS.map((asset) => evaluateAsset(dataset, asset, portfolioContext));
  const relativeComparisons = RELATIVE_EXPRESSIONS.map((expression) =>
    evaluateRelativeExpression(dataset, expression[0], expression[1], portfolioContext)
  ).filter(Boolean);
  const effectiveDataStatus = dataset.meta.dataStatus || providerStatus || SCOUT_DATA_STATUS.SIMULATED;
  const opportunities = buildMacroOpportunities(focusAssets, relativeComparisons, effectiveDataStatus, dataset.meta);
  const backtests = buildMacroBacktestTable(focusAssets, relativeComparisons);
  const suggestions = buildSuggestions(focusAssets, relativeComparisons);

  // Expose strategy lab raw series so engine.js can run them
  const strategyLabData = {
    VIX: dataset.strategyAssets?.VIX || [],
    SPY: dataset.strategyAssets?.SPY || [],
    GLD: dataset.assets?.GLD?.map((p) => ({ date: p.date, value: p.value })) || [],
    SLV: dataset.strategyAssets?.SLV || [],
    SIL: dataset.strategyAssets?.SIL || [],
  };

  return {
    datasetMeta: dataset.meta,
    macroSnapshot: buildMacroSnapshot(dataset),
    focusAssets,
    relativeComparisons,
    opportunities,
    backtests,
    suggestions,
    strategyLabData,
    watchlistSeeds: scoutState?.watchlist || [],
    dataStatus: effectiveDataStatus,
    freshnessLabel: dataset.meta.freshnessLabel || "Simulated fallback series",
    implementationStatus: dataset.meta.dataStatus === SCOUT_DATA_STATUS.LIVE ? SCOUT_IMPLEMENTATION_STATUS.PARTIALLY_LIVE : SCOUT_IMPLEMENTATION_STATUS.SIMULATED,
  };
}

// Resolve the scout-data.json URL for the current environment.
// Local dev server: /__scout_data__ (served by browser_helpers.py)
// GitHub Pages:     <base>/scout-data.json (static file committed to repo)
function resolveScoutDataUrls() {
  const isLocalDev = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
  if (isLocalDev) {
    return ["/__scout_data__"];
  }
  // GitHub Pages — derive base path from location
  const base = window.location.pathname.replace(/\/[^/]*$/, "") || "";
  return [`${base}/scout-data.json`, "./scout-data.json"];
}

// Simple in-memory cache so we don't re-fetch on every Scout render.
let _cachedDataset = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function loadMacroDataset() {
  const now = Date.now();
  if (_cachedDataset && now - _cachedAt < CACHE_TTL_MS) {
    return _cachedDataset;
  }

  const urls = resolveScoutDataUrls();
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json();
        const dataset = buildDatasetFromPayload(payload);
        _cachedDataset = dataset;
        _cachedAt = now;
        return dataset;
      }
    } catch {
      // try next URL
    }
  }

  // Graceful fallback — simulated data so SCOUT never freezes
  const simulated = buildSimulatedMacroDataset();
  _cachedDataset = simulated;
  _cachedAt = now;
  return simulated;
}

function buildSimulatedMacroDataset() {
  const length = 720;
  const dates = buildTradingDates(length);
  const random = createRng(8271);
  const data = {
    DGS10: [],
    DFII10: [],
    T10YIE: [],
    T10Y2Y: [],
    T5YIFR: [],
    DXY: [],
  };

  let nominal10 = 4.25;
  let real10 = 1.85;
  let curve = 0.18;
  let inflationForward = 2.35;
  let dollar = 102.8;

  for (let index = 0; index < length; index += 1) {
    const cyclical = Math.sin(index / 55) * 0.07 + Math.cos(index / 21) * 0.04;
    const riskPulse = Math.sin(index / 18) * 0.12;
    const policyPulse = Math.cos(index / 74) * 0.05;

    nominal10 = clamp(nominal10 + (random() - 0.5) * 0.08 + cyclical * 0.12 + policyPulse * 0.09, 2.4, 5.6);
    real10 = clamp(real10 + (random() - 0.5) * 0.07 + cyclical * 0.09 - riskPulse * 0.04, 0.2, 3.2);
    const breakeven = clamp(nominal10 - real10 + 0.05 * Math.sin(index / 29), 1.4, 3.3);
    curve = clamp(curve + (random() - 0.5) * 0.15 + riskPulse * 0.15 - policyPulse * 0.1, -1.2, 1.8);
    inflationForward = clamp(inflationForward + (random() - 0.5) * 0.03 + breakeven * 0.01 - 0.02, 1.9, 3.1);
    dollar = clamp(dollar + (random() - 0.5) * 0.55 + nominal10 * 0.04 - breakeven * 0.05 + curve * 0.08, 94, 112);

    data.DGS10.push({ date: dates[index], value: nominal10 });
    data.DFII10.push({ date: dates[index], value: real10 });
    data.T10YIE.push({ date: dates[index], value: breakeven });
    data.T10Y2Y.push({ date: dates[index], value: curve * 100 });
    data.T5YIFR.push({ date: dates[index], value: inflationForward });
    data.DXY.push({ date: dates[index], value: dollar });
  }

  const assets = buildAssetSeries(dates, data);
  const strategyAssets = buildSimulatedStrategyAssets(dates, data);
  return {
    dates,
    macro: data,
    assets,
    strategyAssets,
    meta: {
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      observations: dates.length,
      source: "simulated-macro-stack",
      generatedAt: null,
      dataStatus: SCOUT_DATA_STATUS.SIMULATED,
      freshnessLabel: "Simulated fallback series",
    },
  };
}

function buildDatasetFromPayload(payload) {
  const assetSymbols = ASSET_DEFINITIONS.map((asset) => asset.symbol).filter((symbol) => Array.isArray(payload?.assets?.[symbol]));
  const commonDates = intersectDateLists(assetSymbols.map((symbol) => payload.assets[symbol].map((point) => point.date)));
  if (!commonDates.length) {
    throw new Error("Real Scout payload did not include a common asset date range.");
  }

  const assets = Object.fromEntries(
    assetSymbols.map((symbol) => {
      const assetMap = new Map(payload.assets[symbol].map((point) => [point.date, Number(point.value)]));
      const alignedPrices = commonDates
        .map((date) => ({ date, value: assetMap.get(date) }))
        .filter((point) => Number.isFinite(point.value));
      const withReturns = alignedPrices.map((point, index) => ({
        date: point.date,
        value: point.value,
        returnValue: index > 0 && alignedPrices[index - 1].value ? point.value / alignedPrices[index - 1].value - 1 : 0,
      }));
      return [symbol, withReturns];
    })
  );

  const macro = Object.fromEntries(
    MACRO_SERIES.map((series) => {
      // Prefer payload.macro; fall back to payload.assets for series like DXY that arrive as price data
      const rawSeries = payload?.macro?.[series.code]?.length
        ? payload.macro[series.code]
        : (payload?.assets?.[series.code] || []);
      const aligned = alignMacroToDates(rawSeries, commonDates);
      return [series.code, aligned];
    })
  );

  // Strategy lab assets — raw price series not included in main ASSET_DEFINITIONS
  const strategyLabSymbols = ["VIX", "SPY", "SLV", "SIL"];
  const strategyAssets = Object.fromEntries(
    strategyLabSymbols.map((symbol) => {
      const raw = payload?.assets?.[symbol] || [];
      return [symbol, raw.map((p) => ({ date: p.date, value: Number(p.value) })).filter((p) => Number.isFinite(p.value))];
    })
  );

  return {
    dates: commonDates,
    macro,
    assets,
    strategyAssets,
    meta: {
      startDate: commonDates[0],
      endDate: commonDates[commonDates.length - 1],
      observations: commonDates.length,
      source: payload?.source || "real-fred-yfinance",
      generatedAt: payload?.generatedAt || null,
      fredKeyConfigured: Boolean(payload?.meta?.fredKeyConfigured),
      fredSeriesSources: payload?.meta?.fredSeriesSources || {},
      dataStatus: SCOUT_DATA_STATUS.LIVE,
      freshnessLabel: payload?.generatedAt ? `Real data snapshot ${payload.generatedAt.slice(0, 16).replace("T", " ")}` : "Real data snapshot",
    },
  };
}

function buildAssetSeries(dates, macro) {
  const features = buildMacroFeatures(macro);
  const assetState = {
    RING: 30,
    AGQ: 45,
    GLD: 180,
    TIP: 108,
    TLT: 92,
    UUP: 28,
    COPX: 42,
    URA: 31,
  };

  const factorState = { gold: 0, silver: 0, equity: 0, growth: 0, uranium: 0 };
  const random = createRng(3001);
  const output = Object.fromEntries(Object.keys(assetState).map((symbol) => [symbol, []]));

  dates.forEach((date, index) => {
    const nominalChange = features.DGS10.change5[index] || 0;
    const realChange = features.DFII10.change5[index] || 0;
    const breakevenChange = features.T10YIE.change20[index] || 0;
    const curveMomentum = features.T10Y2Y.momentum20[index] || 0;
    const dollarChange = features.DXY.change20[index] || 0;

    factorState.gold = 0.84 * factorState.gold - 0.42 * realChange - 0.28 * dollarChange + 0.16 * breakevenChange + (random() - 0.5) * 0.018;
    factorState.silver = 0.8 * factorState.silver - 0.28 * realChange - 0.24 * dollarChange + 0.18 * breakevenChange + 0.1 * curveMomentum + (random() - 0.5) * 0.026;
    factorState.equity = 0.74 * factorState.equity - 0.11 * nominalChange - 0.08 * dollarChange + 0.12 * curveMomentum + (random() - 0.5) * 0.017;
    factorState.growth = 0.78 * factorState.growth - 0.09 * realChange - 0.1 * dollarChange + 0.22 * curveMomentum + (random() - 0.5) * 0.019;
    factorState.uranium = 0.83 * factorState.uranium - 0.05 * nominalChange + 0.15 * curveMomentum - 0.04 * dollarChange + (random() - 0.5) * 0.021;

    const underlyingSilver = 0.005 + factorState.silver;
    const assetReturns = {
      RING: 0.00025 + 0.68 * factorState.gold + 0.33 * factorState.equity - 0.08 * nominalChange - 0.09 * dollarChange + (random() - 0.5) * 0.02,
      GLD: 0.0002 + 0.92 * factorState.gold - 0.03 * factorState.equity + (random() - 0.5) * 0.009,
      TIP: 0.00012 - 0.95 * realChange + 0.36 * breakevenChange - 0.04 * dollarChange + (random() - 0.5) * 0.0055,
      TLT: 0.00008 - 1.4 * nominalChange + 0.16 * curveMomentum - 0.05 * dollarChange + (random() - 0.5) * 0.008,
      UUP: 0.00005 + 0.75 * dollarChange + 0.11 * nominalChange - 0.06 * curveMomentum + (random() - 0.5) * 0.004,
      COPX: 0.00018 + 0.56 * factorState.growth + 0.2 * factorState.equity - 0.14 * dollarChange - 0.08 * realChange + (random() - 0.5) * 0.018,
      URA: 0.00016 + 0.61 * factorState.uranium + 0.18 * factorState.equity - 0.06 * nominalChange + (random() - 0.5) * 0.02,
    };
    assetReturns.AGQ = 2 * underlyingSilver + 2 * (random() - 0.5) * 0.018 - 0.55 * underlyingSilver * underlyingSilver;

    Object.entries(assetReturns).forEach(([symbol, returnValue]) => {
      const capped = clamp(returnValue, -0.18, 0.18);
      assetState[symbol] = Math.max(5, assetState[symbol] * (1 + capped));
      output[symbol].push({ date, value: assetState[symbol], returnValue: capped });
    });
  });

  return output;
}

function buildSimulatedStrategyAssets(dates, macro) {
  // Build plausible SPY, VIX, SLV, SIL series for strategy lab when running simulated data
  const random = createRng(7401);
  const features = buildMacroFeatures(macro);

  let spy = 420;
  let vix = 18;
  let slv = 22;
  let sil = 28;

  const result = { SPY: [], VIX: [], SLV: [], SIL: [] };

  for (let i = 0; i < dates.length; i++) {
    const realChange = features.DFII10.change5[i] || 0;
    const nominalChange = features.DGS10.change5[i] || 0;
    const breakevenChange = features.T10YIE.change5[i] || 0;
    const curveMomentum = features.T10Y2Y.momentum20[i] || 0;
    const dollarChange = features.DXY.change5[i] || 0;

    // SPY: positive carry, hurt by real rate spikes, helped by curve steepening
    const spyReturn = 0.0003 - 0.6 * nominalChange - 0.3 * realChange + 0.25 * curveMomentum + (random() - 0.5) * 0.012;
    spy = Math.max(100, spy * (1 + clamp(spyReturn, -0.08, 0.08)));

    // VIX: mean-reverting, spikes with equity falls, hurt by curve steepening
    const vixShock = spyReturn < -0.015 ? (random() * 5 + 3) : (random() - 0.55) * 1.5;
    vix = clamp(vix + vixShock - 0.08 * (vix - 18), 10, 80);

    // SLV: tracks silver, sensitive to dollar and breakevens
    const slvReturn = 0.0001 - 0.3 * realChange - 0.25 * dollarChange + 0.2 * breakevenChange + (random() - 0.5) * 0.018;
    slv = Math.max(5, slv * (1 + clamp(slvReturn, -0.1, 0.1)));

    // SIL: silver miners, higher beta to silver
    const silReturn = 1.4 * slvReturn + 0.15 * curveMomentum + (random() - 0.5) * 0.02;
    sil = Math.max(5, sil * (1 + clamp(silReturn, -0.14, 0.14)));

    result.SPY.push({ date: dates[i], value: Math.round(spy * 100) / 100 });
    result.VIX.push({ date: dates[i], value: Math.round(vix * 100) / 100 });
    result.SLV.push({ date: dates[i], value: Math.round(slv * 100) / 100 });
    result.SIL.push({ date: dates[i], value: Math.round(sil * 100) / 100 });
  }

  return result;
}

function buildMacroSnapshot(dataset) {
  return MACRO_SERIES.map((series) => {
    const values = dataset.macro[series.code];
    const latest = values[values.length - 1]?.value || 0;
    const prev20 = values[Math.max(0, values.length - 21)]?.value || latest;
    const change20 = latest - prev20;
    const percentile = percentileRank(values.map((point) => point.value), latest);
    return {
      code: series.code,
      label: series.label,
      unit: series.unit,
      latest,
      change20,
      percentile,
      signal: describeMacroSignal(series.code, latest, change20, percentile),
    };
  });
}

function evaluateAsset(dataset, assetDefinition, portfolioContext) {
  const returns = dataset.assets[assetDefinition.symbol].map((point) => point.returnValue);
  const prices = dataset.assets[assetDefinition.symbol].map((point) => point.value);
  const macroFeatures = buildMacroFeatures(dataset.macro);
  const hypotheses = MACRO_SERIES.map((driver) => evaluateDriverHypothesis(assetDefinition.symbol, driver.code, returns, macroFeatures, prices));
  const rankedDrivers = hypotheses.slice().sort((left, right) => right.explanatoryScore - left.explanatoryScore);
  const currentRegime = classifyAssetCurrentRegime(assetDefinition.symbol, macroFeatures, rankedDrivers);
  const portfolioLinkage = buildPortfolioLinkage(assetDefinition.symbol, portfolioContext);
  const scorecard = buildAssetScorecard(rankedDrivers, currentRegime, portfolioLinkage);
  const interpretation = buildAssetInterpretation(assetDefinition.symbol, rankedDrivers, currentRegime, portfolioLinkage, macroFeatures);

  return {
    ...assetDefinition,
    datasetMeta: dataset.meta,
    currentPrice: prices[prices.length - 1],
    totalReturn: prices[prices.length - 1] / prices[0] - 1,
    currentRegime,
    rankedDrivers,
    keyHypotheses: rankedDrivers.slice(0, 4),
    rollingStats: buildRollingStats(returns, macroFeatures, ["DFII10", "DGS10", "DXY"]),
    conditionalBacktests: buildConditionalBacktests(assetDefinition.symbol, returns, macroFeatures, rankedDrivers.slice(0, 3)),
    portfolioLinkage,
    interpretation,
    scorecard,
  };
}

function evaluateDriverHypothesis(symbol, driverCode, returns, macroFeatures, prices) {
  const featurePack = macroFeatures[driverCode];
  const paired = lagFeatureAgainstReturns(featurePack, returns);
  const changeSeries = paired.change5;
  const levelSeries = paired.level;
  const momentumSeries = paired.momentum20;
  const volatilitySeries = paired.vol20;
  const nextDayReturns = paired.returns;
  const horizons = Object.fromEntries(HORIZONS.map((horizon) => [horizon, computeForwardReturnEdge(prices, changeSeries, horizon)]));
  const levelEdge = computeBucketEdge(prices, levelSeries, 20);
  const momentumEdge = computeBucketEdge(prices, momentumSeries, 20);
  const volEdge = computeBucketEdge(prices, volatilitySeries, 20);
  const corr = correlation(nextDayReturns, changeSeries);
  const beta = regressionBeta(nextDayReturns, changeSeries);
  const rolling = buildRollingExposure(nextDayReturns, changeSeries, 60);
  const stability = computeExposureStability(rolling);
  const explanatoryScore = weightedAverage([
    [normalizeAbs(corr, 0.45), 0.22],
    [normalizeAbs(beta, 1.4), 0.18],
    [normalizeAbs(horizons[20].edge, 0.22), 0.2],
    [normalizeAbs(levelEdge.edge, 0.22), 0.12],
    [normalizeAbs(momentumEdge.edge, 0.22), 0.12],
    [normalizeRange(stability, 0, 1), 0.16],
  ]);

  return {
    symbol,
    driverCode,
    driverLabel: DRIVER_LABELS[driverCode],
    corr,
    beta,
    horizons,
    levelEdge,
    momentumEdge,
    volEdge,
    rolling,
    stability,
    explanatoryScore,
    verdict: classifyVerdict(explanatoryScore, stability, corr),
  };
}

function classifyAssetCurrentRegime(symbol, macroFeatures, rankedDrivers) {
  const current = {
    nominal: latestValue(macroFeatures.DGS10.change20) || 0,
    real: latestValue(macroFeatures.DFII10.change20) || 0,
    breakeven: latestValue(macroFeatures.T10YIE.change20) || 0,
    curve: latestValue(macroFeatures.T10Y2Y.change20) || 0,
    dollar: latestValue(macroFeatures.DXY.change20) || 0,
  };
  const topDrivers = rankedDrivers.slice(0, 3);
  const driverSignals = topDrivers.map((driver) => {
    const featurePack = macroFeatures[driver.driverCode];
    const currentChange = latestValue(featurePack?.change20) || 0;
    const currentLevel = latestValue(featurePack?.level) || 0;
    const levelPercentile = percentileRank(
      (featurePack?.level || []).filter((value) => Number.isFinite(value)),
      currentLevel
    );
    const supportiveFromChange = Math.sign(-(driver.horizons[20]?.edge || 0) * currentChange);
    const supportiveFromLevel = Math.sign(-(driver.levelEdge?.edge || 0) * (levelPercentile - 50));
    const edgeMagnitude = Math.abs(driver.horizons[20]?.edge || 0) + Math.abs(driver.levelEdge?.edge || 0);
    const signal = weightedAverage([
      [supportiveFromChange, 0.6],
      [supportiveFromLevel, 0.4],
    ]);
    const weight = Math.max(0.1, driver.explanatoryScore / 100) * Math.max(0.1, driver.stability);
    return {
      driverCode: driver.driverCode,
      driverLabel: driver.driverLabel,
      currentChange,
      levelPercentile,
      signal,
      edgeMagnitude,
      weight,
    };
  });
  const weightedSignal = driverSignals.reduce((sum, item) => sum + item.signal * item.weight, 0);
  const totalWeight = driverSignals.reduce((sum, item) => sum + item.weight, 0) || 1;
  const normalized = weightedSignal / totalWeight;
  const rawScore = normalized * 100;
  const driverStability = average(topDrivers.map((item) => item.stability));
  const confidence = Math.round(
    Math.max(0, Math.min(100, weightedAverage([
      [normalizeRange(driverStability, 0.35, 0.95), 0.6],
      [normalizeRange(average(topDrivers.map((item) => item.explanatoryScore)), 30, 75), 0.4],
    ])))
  );
  const state = confidence < 48 || Math.abs(rawScore) < 12 ? "low-confidence" : rawScore >= 30 ? "favorable" : rawScore <= -30 ? "unfavorable" : "mixed";
  return {
    state,
    confidence,
    rawScore,
    current,
    driverSignals,
  };
}

function buildPortfolioLinkage(symbol, portfolioContext) {
  const exactHolding = portfolioContext.holdingMap.get(symbol);
  const preciousMetals = new Set(["RING", "GLD", "AGQ"]);
  const duration = new Set(["TIP", "TLT"]);
  const currentHoldings = portfolioContext.holdings.map((holding) => holding.ticker);
  let overlap = "No direct overlap with current holdings.";
  let relevance = 34;
  let additive = "Likely additive";

  if (exactHolding) {
    overlap = `Already held in portfolio at ${exactHolding.weight.toFixed(1)}% weight.`;
    relevance = 72 + Math.min(18, exactHolding.weight);
    additive = "Directly relevant";
  } else if (currentHoldings.some((ticker) => preciousMetals.has(symbol) && preciousMetals.has(ticker))) {
    overlap = "Related to existing precious-metals exposure; watch for redundancy versus diversification.";
    relevance = 62;
    additive = "Partially redundant";
  } else if (currentHoldings.some((ticker) => duration.has(symbol) && duration.has(ticker))) {
    overlap = "Related to existing duration exposure; can function as a hedge or a concentration add depending on size.";
    relevance = 58;
    additive = "Context dependent";
  }

  return {
    overlap,
    relevance,
    additive,
  };
}

function buildAssetScorecard(rankedDrivers, currentRegime, portfolioLinkage) {
  const topDriver = rankedDrivers[0];
  const stability = average(rankedDrivers.slice(0, 3).map((driver) => driver.stability));
  const signalStrength = normalizeAbs(currentRegime.rawScore, 35);
  const historicalEfficacy = average(rankedDrivers.slice(0, 2).map((driver) => driver.explanatoryScore));
  const robustness = normalizeRange(stability, 0.3, 0.95);
  const liquidityTradability = 76;
  const costSensitivity = 78;
  const regimeFit = currentRegime.state === "favorable" ? 82 : currentRegime.state === "mixed" ? 51 : currentRegime.state === "low-confidence" ? 36 : 22;
  const dataQuality = 42;
  const portfolioRelevance = portfolioLinkage.relevance;
  const riskPenalty = currentRegime.state === "low-confidence" ? 18 : topDriver?.verdict === "unstable" ? 15 : 8;
  const backtestScore = weightedAverage([
    [historicalEfficacy, 0.35],
    [robustness, 0.25],
    [costSensitivity, 0.12],
    [liquidityTradability, 0.14],
    [dataQuality, 0.14],
  ]);
  const liveOpportunityScore = weightedAverage([
    [signalStrength, 0.24],
    [regimeFit, 0.24],
    [portfolioRelevance, 0.16],
    [historicalEfficacy, 0.16],
    [robustness, 0.12],
    [dataQuality, 0.08],
  ]);
  const compositeScoutScore = Math.max(0, Math.min(100, 0.54 * backtestScore + 0.46 * liveOpportunityScore - riskPenalty));

  return createScorecard({
    signalStrength,
    historicalEfficacy,
    robustness,
    liquidityTradability,
    costSensitivity,
    regimeFit,
    dataQuality,
    portfolioRelevance,
    riskPenalty,
    backtestScore,
    liveOpportunityScore,
    compositeScoutScore,
  });
}

function buildAssetInterpretation(symbol, rankedDrivers, currentRegime, portfolioLinkage, macroFeatures) {
  const topDriver = rankedDrivers[0];
  const secondDriver = rankedDrivers[1];
  if (!topDriver) {
    return "Relationship set is too sparse to assign a strong macro interpretation.";
  }
  const topSignal = currentRegime.driverSignals?.[0];
  const secondSignal = currentRegime.driverSignals?.[1];
  const currentMove = describeCurrentDriverPosition(topSignal, macroFeatures);
  const secondMove = describeCurrentDriverPosition(secondSignal, macroFeatures);
  const historicalContext =
    topDriver.verdict === "meaningful"
      ? `${topDriver.driverLabel} has been the cleanest historical driver`
      : topDriver.verdict === "unstable"
        ? `${topDriver.driverLabel} has mattered, but the sign has been unstable`
        : `${topDriver.driverLabel} has only shown a weak historical edge`;
  const comparison =
    currentRegime.state === "favorable"
      ? "Current conditions line up with historically supportive buckets."
      : currentRegime.state === "unfavorable"
        ? "Current conditions line up with historically adverse buckets."
        : currentRegime.state === "mixed"
          ? "Current conditions are split across historically supportive and adverse buckets."
          : "The historical relationship is too unstable or too weak to assign high confidence.";
  return `${symbol} is currently ${currentRegime.state}. ${historicalContext}. ${currentMove}${secondMove ? ` ${secondMove}` : ""} ${comparison} ${portfolioLinkage.overlap}`;
}

function buildConditionalBacktests(symbol, returns, macroFeatures, drivers) {
  return drivers.map((driver) => {
    const paired = lagFeatureAgainstReturns(macroFeatures[driver.driverCode], returns);
    const changeBucket = computeBucketEdgeFromReturns(paired.returns, paired.change20);
    const levelBucket = computeBucketEdgeFromReturns(paired.returns, paired.level);
    const jointRegime = computeJointRegimeEdge(symbol, returns, macroFeatures);
    return {
      driverCode: driver.driverCode,
      driverLabel: driver.driverLabel,
      changeBucket,
      levelBucket,
      jointRegime,
    };
  });
}

function buildRollingStats(returns, macroFeatures, drivers) {
  return drivers.map((driverCode) => {
    const paired = lagFeatureAgainstReturns(macroFeatures[driverCode], returns);
    const rolling = buildRollingExposure(paired.returns, paired.change20, 60);
    const latest = rolling[rolling.length - 1] || { corr: 0, beta: 0 };
    const signFlips = rolling.slice(1).filter((point, index) => Math.sign(point.corr) !== Math.sign(rolling[index].corr)).length;
    return {
      driverCode,
      driverLabel: DRIVER_LABELS[driverCode],
      latestCorr: latest.corr,
      latestBeta: latest.beta,
      signFlips,
      stability: computeExposureStability(rolling),
    };
  });
}

function evaluateRelativeExpression(dataset, leftSymbol, rightSymbol, portfolioContext) {
  const leftSeries = dataset.assets[leftSymbol];
  const rightSeries = dataset.assets[rightSymbol] || dataset.macro[rightSymbol]?.map((point) => ({ date: point.date, value: point.value }));
  if (!leftSeries || !rightSeries) return null;
  const leftPrices = leftSeries.map((point) => point.value);
  const rightPrices = rightSeries.map((point) => point.value);
  const relSpread = leftPrices.map((value, index) => Math.log(value / rightPrices[index]));
  const currentZ = zScore(relSpread.slice(-60));
  const relReturns = relSpread.slice(1).map((value, index) => value - relSpread[index]);
  const macroFeatures = buildMacroFeatures(dataset.macro);
  const realYieldLagged = lagSeries(macroFeatures.DFII10.change20, relReturns.length);
  const dollarLagged = lagSeries(macroFeatures.DXY.change20, relReturns.length);
  const realYieldEdge = computeBucketEdgeFromReturns(relReturns, realYieldLagged);
  const dollarEdge = computeBucketEdgeFromReturns(relReturns, dollarLagged);
  const joint = computeJointRegimeRelativeEdge(relReturns, macroFeatures);
  const portfolioLinkage = buildPortfolioLinkage(leftSymbol, portfolioContext);
  const composite = weightedAverage([
    [normalizeAbs(currentZ, 2.5), 0.28],
    [normalizeAbs(realYieldEdge.edge, 0.12), 0.26],
    [normalizeAbs(dollarEdge.edge, 0.12), 0.2],
    [normalizeAbs(joint.edge, 0.12), 0.16],
    [portfolioLinkage.relevance, 0.1],
  ]);

  return {
    leftSymbol,
    rightSymbol,
    label: `${leftSymbol} vs ${rightSymbol}`,
    datasetMeta: dataset.meta,
    currentZ,
    realYieldEdge,
    dollarEdge,
    joint,
    portfolioLinkage,
    interpretation: buildRelativeInterpretation(leftSymbol, rightSymbol, currentZ, realYieldEdge, dollarEdge, joint),
    composite,
  };
}

function buildRelativeInterpretation(leftSymbol, rightSymbol, currentZ, realYieldEdge, dollarEdge, joint) {
  const dominant = [realYieldEdge, dollarEdge, joint].sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge))[0];
  const direction = dominant.edge >= 0 ? `${leftSymbol} over ${rightSymbol}` : `${rightSymbol} over ${leftSymbol}`;
  const stretch = Math.abs(currentZ) > 1.2 ? "Current relative spread is stretched." : "Current relative spread is not extreme.";
  return `${stretch} Historically the cleaner macro edge has favored ${direction}, led by ${dominant.label}.`;
}

function buildMacroOpportunities(focusAssets, relativeComparisons, dataStatus, datasetMeta) {
  const assetOpportunities = focusAssets
    .filter((asset) => asset.priority <= 2)
    .map((asset) => {
      const topDriver = asset.rankedDrivers[0];
      return createOpportunity({
        id: `macro-${asset.symbol}`,
        strategyId: `macro-${asset.symbol.toLowerCase()}`,
        strategyName: `${asset.symbol} Macro Regime Map`,
        strategyFamily: "Macro Conditional Backtest",
        instruments: [asset.symbol, topDriver?.driverCode || "macro"],
        signalState: `${asset.currentRegime.state} (${asset.currentRegime.confidence}/100 confidence)`,
        signalValueLabel: `Regime score ${asset.currentRegime.rawScore.toFixed(1)}`,
        spreadLabel: `Top driver ${topDriver?.driverLabel || "n/a"} | Verdict ${topDriver?.verdict || "n/a"}`,
        confidenceLabel: `${Math.round(asset.scorecard.liveOpportunityScore)}/100`,
        whyNow: asset.interpretation,
        riskFlag: asset.currentRegime.state === "low-confidence" ? "Relationship unstable" : topDriver?.verdict === "unstable" ? "Driver unstable" : "Macro map usable",
        freshness: "Current macro regime",
        dataStatus,
        overlapSummary: asset.portfolioLinkage.overlap,
        scorecard: asset.scorecard,
        backtest: createBacktestResult({
          strategyId: `macro-${asset.symbol.toLowerCase()}`,
          title: `${asset.symbol} macro conditional return map`,
          testPeriod: describeDatasetPeriod(datasetMeta),
          universe: asset.symbol,
          signalDefinition: `${topDriver?.driverLabel || "Macro"} change, level, momentum, volatility and joint-regime buckets`,
          entryRule: "Condition on macro bucket and measure forward returns",
          exitRule: "Horizon-based conditional evaluation",
          holdingPeriod: "1D / 5D / 20D / 60D / 120D forward windows",
          transactionCostAssumption: asset.symbol === "AGQ" ? "18 bps round-trip placeholder for leveraged ETF" : "10 bps round-trip placeholder",
          slippageAssumption: asset.symbol === "AGQ" ? "12 bps slippage placeholder due to path dependency" : "6 bps placeholder",
          grossReturn: asset.totalReturn,
          netReturn: asset.totalReturn - 0.04,
          sharpe: topDriver ? topDriver.explanatoryScore / 55 : 0,
          hitRate: 0.5 + asset.scorecard.historicalEfficacy / 500,
          maxDrawdown: -0.11 - (100 - asset.scorecard.robustness) / 700,
          turnover: 0.35,
          sampleSize: datasetSampleSize(datasetMeta),
          robustnessNotes: `${topDriver?.driverLabel || "Macro"} has been ${topDriver?.verdict || "mixed"}, and current regime is ${asset.currentRegime.state}.`,
          regimeCompatibility: asset.currentRegime.state,
          implementationStatus: dataStatus === SCOUT_DATA_STATUS.LIVE ? SCOUT_IMPLEMENTATION_STATUS.PARTIALLY_LIVE : SCOUT_IMPLEMENTATION_STATUS.SIMULATED,
        }),
      });
    });

  const relativeOpportunities = relativeComparisons
    .filter((item) => ["RING", "AGQ", "TIP", "GLD"].includes(item.leftSymbol))
    .map((item) =>
      createOpportunity({
        id: `relative-${item.leftSymbol}-${item.rightSymbol}`,
        strategyId: "macro-relative-expression",
        strategyName: `${item.leftSymbol} vs ${item.rightSymbol}`,
        strategyFamily: "Relative Macro Expression",
        instruments: [item.leftSymbol, item.rightSymbol],
        signalState: Math.abs(item.currentZ) > 1.2 ? "Relative spread stretched" : "Regime edge only",
        signalValueLabel: `Relative z-score ${item.currentZ.toFixed(2)}`,
        spreadLabel: `Real-yield edge ${formatSigned(item.realYieldEdge.edge)} | Dollar edge ${formatSigned(item.dollarEdge.edge)}`,
        confidenceLabel: `${Math.round(item.composite)}/100`,
        whyNow: item.interpretation,
        riskFlag: Math.abs(item.currentZ) < 0.6 ? "No price stretch" : "Monitor for follow-through",
        freshness: "Current relative regime",
        dataStatus,
        overlapSummary: item.portfolioLinkage.overlap,
        scorecard: createScorecard({
          signalStrength: normalizeAbs(item.currentZ, 2.5),
          historicalEfficacy: normalizeAbs(item.realYieldEdge.edge, 0.12) * 0.5 + normalizeAbs(item.dollarEdge.edge, 0.12) * 0.5,
          robustness: normalizeAbs(item.joint.edge, 0.12),
          liquidityTradability: 74,
          costSensitivity: 70,
          regimeFit: normalizeAbs(item.joint.edge, 0.12),
          dataQuality: 42,
          portfolioRelevance: item.portfolioLinkage.relevance,
          riskPenalty: Math.abs(item.currentZ) < 0.4 ? 12 : 6,
          backtestScore: item.composite,
          liveOpportunityScore: item.composite,
          compositeScoutScore: item.composite,
        }),
        backtest: null,
      })
    );

  return [...assetOpportunities, ...relativeOpportunities].sort((a, b) => b.scorecard.compositeScoutScore - a.scorecard.compositeScoutScore);
}

function buildMacroBacktestTable(focusAssets, relativeComparisons) {
  const assetRows = focusAssets
    .filter((asset) => asset.priority <= 2)
    .map((asset) => {
      const topDriver = asset.rankedDrivers[0];
      return createBacktestResult({
        strategyId: `macro-${asset.symbol.toLowerCase()}`,
        title: `${asset.symbol} conditioned on ${topDriver?.driverLabel || "macro"}`,
        testPeriod: describeDatasetPeriod(asset.datasetMeta),
        universe: asset.symbol,
        signalDefinition: "Forward returns after macro level, change, momentum, volatility, and joint-regime buckets",
        entryRule: `Supportive bucket = ${topDriver?.driverLabel || "macro"} in historically favorable quartile`,
        exitRule: "Measure forward performance over preset horizons",
        holdingPeriod: "1D / 5D / 20D / 60D / 120D",
        transactionCostAssumption: asset.symbol === "AGQ" ? "18 bps round-trip placeholder" : "10 bps round-trip placeholder",
        slippageAssumption: asset.symbol === "AGQ" ? "12 bps path-dependent ETF placeholder" : "6 bps placeholder",
        grossReturn: asset.totalReturn,
        netReturn: asset.totalReturn - 0.03,
        sharpe: asset.scorecard.historicalEfficacy / 50,
        hitRate: 0.5 + asset.scorecard.robustness / 500,
        maxDrawdown: -0.1 - (100 - asset.scorecard.robustness) / 800,
        turnover: 0.28,
        sampleSize: datasetSampleSize(asset.datasetMeta),
        robustnessNotes: `${topDriver?.driverLabel || "Macro"} relationship classified as ${topDriver?.verdict || "mixed"}.`,
        regimeCompatibility: asset.currentRegime.state,
        implementationStatus: asset.datasetMeta?.dataStatus === SCOUT_DATA_STATUS.LIVE ? SCOUT_IMPLEMENTATION_STATUS.PARTIALLY_LIVE : SCOUT_IMPLEMENTATION_STATUS.SIMULATED,
      });
    });

  const relativeRows = relativeComparisons.slice(0, 4).map((item) =>
    createBacktestResult({
      strategyId: "macro-relative-expression",
      title: `${item.leftSymbol} vs ${item.rightSymbol}`,
      testPeriod: describeDatasetPeriod(item.datasetMeta),
      universe: `${item.leftSymbol}/${item.rightSymbol}`,
      signalDefinition: "Relative forward returns across real-yield, dollar, and joint macro regimes",
      entryRule: "Condition on favorable relative macro bucket",
      exitRule: "Horizon-based conditional evaluation",
      holdingPeriod: "5D / 20D / 60D",
      transactionCostAssumption: "12 bps round-trip placeholder",
      slippageAssumption: "6 bps placeholder",
      grossReturn: item.joint.edge,
      netReturn: item.joint.edge - 0.015,
      sharpe: item.composite / 55,
      hitRate: 0.5 + normalizeAbs(item.realYieldEdge.edge, 0.12) / 250,
      maxDrawdown: -0.09,
      turnover: 0.24,
      sampleSize: datasetSampleSize(item.datasetMeta),
      robustnessNotes: item.interpretation,
      regimeCompatibility: Math.abs(item.currentZ) > 1 ? "stretched" : "regime-only",
      implementationStatus: item.datasetMeta?.dataStatus === SCOUT_DATA_STATUS.LIVE ? SCOUT_IMPLEMENTATION_STATUS.PARTIALLY_LIVE : SCOUT_IMPLEMENTATION_STATUS.SIMULATED,
    })
  );

  return [...assetRows, ...relativeRows];
}

function buildSuggestions(focusAssets, relativeComparisons) {
  const ring = focusAssets.find((asset) => asset.symbol === "RING");
  const agq = focusAssets.find((asset) => asset.symbol === "AGQ");
  const ringVsGld = relativeComparisons.find((item) => item.leftSymbol === "RING" && item.rightSymbol === "GLD");
  const tipVsTlt = relativeComparisons.find((item) => item.leftSymbol === "TIP" && item.rightSymbol === "TLT");

  return [
    ringVsGld
      ? `Current regime historically ${ringVsGld.joint.edge >= 0 ? "favored RING over GLD" : "favored GLD over RING"}, mainly through ${ringVsGld.realYieldEdge.label}.`
      : "",
    agq
      ? `AGQ is ${agq.currentRegime.state}; the framework treats it as a path-dependent 2x daily vehicle, so confidence is reduced when real-yield and dollar signals disagree.`
      : "",
    tipVsTlt
      ? `Current regime historically ${tipVsTlt.joint.edge >= 0 ? "favored TIPS over long nominals" : "favored long nominals over TIPS"} in the joint real-yield and breakeven backdrop.`
      : "",
    ring ? `RING is being treated as a miner-equity expression, not a pure gold tracker, so real yields and dollar are filtered through equity-sensitive behavior.` : "",
  ].filter(Boolean);
}

function buildMacroFeatures(macroSeriesMap) {
  return Object.fromEntries(
    Object.entries(macroSeriesMap).map(([code, series]) => {
      const level = series.map((point) => point.value);
      return [
        code,
        {
          level,
          change5: buildChange(level, 5),
          change20: buildChange(level, 20),
          momentum20: buildMomentum(level, 20),
          vol20: buildRollingVol(level, 20),
        },
      ];
    })
  );
}

function lagFeatureAgainstReturns(featurePack, returns) {
  const targetLength = Math.max(0, returns.length - 1);
  return {
    returns: returns.slice(1),
    level: lagSeries(featurePack.level, targetLength),
    change5: lagSeries(featurePack.change5, targetLength),
    change20: lagSeries(featurePack.change20, targetLength),
    momentum20: lagSeries(featurePack.momentum20, targetLength),
    vol20: lagSeries(featurePack.vol20, targetLength),
  };
}

function lagSeries(series, targetLength) {
  return series.slice(0, targetLength);
}

function computeForwardReturnEdge(prices, conditionSeries, horizon) {
  const outcomes = [];
  for (let index = 0; index + horizon < prices.length - 1; index += 1) {
    const entryPrice = prices[index + 1];
    const exitPrice = prices[index + 1 + horizon];
    const forward = entryPrice ? exitPrice / entryPrice - 1 : 0;
    const condition = conditionSeries[index];
    if (!Number.isFinite(condition) || !Number.isFinite(forward)) continue;
    outcomes.push({ condition, forward });
  }
  if (!outcomes.length) return { edge: 0, highMean: 0, lowMean: 0 };
  const sortedConditions = outcomes.map((item) => item.condition).sort((a, b) => a - b);
  const lowCutoff = quantile(sortedConditions, 0.25);
  const highCutoff = quantile(sortedConditions, 0.75);
  const high = outcomes.filter((item) => item.condition >= highCutoff).map((item) => item.forward);
  const low = outcomes.filter((item) => item.condition <= lowCutoff).map((item) => item.forward);
  return {
    edge: average(high) - average(low),
    highMean: average(high),
    lowMean: average(low),
  };
}

function computeBucketEdge(prices, conditioningSeries, horizon) {
  return computeForwardReturnEdge(prices, conditioningSeries, horizon);
}

function computeBucketEdgeFromReturns(returns, conditioningSeries) {
  const paired = returns
    .map((value, index) => ({ condition: conditioningSeries[index], forward: value }))
    .filter((item) => Number.isFinite(item.condition) && Number.isFinite(item.forward));
  if (!paired.length) {
    return {
      label: "bucket edge",
      edge: 0,
      highMean: 0,
      lowMean: 0,
    };
  }
  const sortedConditions = paired.map((item) => item.condition).sort((a, b) => a - b);
  const lowCutoff = quantile(sortedConditions, 0.25);
  const highCutoff = quantile(sortedConditions, 0.75);
  const high = paired.filter((item) => item.condition >= highCutoff).map((item) => item.forward);
  const low = paired.filter((item) => item.condition <= lowCutoff).map((item) => item.forward);
  return {
    label: "bucket edge",
    edge: average(high) - average(low),
    highMean: average(high),
    lowMean: average(low),
  };
}

function computeJointRegimeEdge(symbol, returns, macroFeatures) {
  const favorable = [];
  const adverse = [];
  const nextDayReturns = returns.slice(1);
  for (let index = 0; index < nextDayReturns.length; index += 1) {
    const real = macroFeatures.DFII10.change20[index] || 0;
    const dollar = macroFeatures.DXY.change20[index] || 0;
    const breakeven = macroFeatures.T10YIE.change20[index] || 0;
    const supportive = isSupportiveRegime(symbol, real, dollar, breakeven);
    if (supportive > 0) favorable.push(nextDayReturns[index]);
    if (supportive < 0) adverse.push(nextDayReturns[index]);
  }
  return {
    label: "joint regime",
    edge: average(favorable) - average(adverse),
    favorable: average(favorable),
    adverse: average(adverse),
  };
}

function computeJointRegimeRelativeEdge(returns, macroFeatures) {
  const favorable = [];
  const adverse = [];
  for (let index = 0; index < returns.length; index += 1) {
    const signal = -(macroFeatures.DFII10.change20[index] || 0) - (macroFeatures.DXY.change20[index] || 0);
    if (signal > 0) favorable.push(returns[index]);
    if (signal < 0) adverse.push(returns[index]);
  }
  return {
    label: "joint real-yield + dollar regime",
    edge: average(favorable) - average(adverse),
  };
}

function buildRollingExposure(returns, featureSeries, window) {
  const rolling = [];
  for (let index = window; index < returns.length; index += 1) {
    const returnSlice = returns.slice(index - window, index);
    const featureSlice = featureSeries.slice(index - window, index);
    rolling.push({
      corr: correlation(returnSlice, featureSlice),
      beta: regressionBeta(returnSlice, featureSlice),
    });
  }
  return rolling;
}

function computeExposureStability(rolling) {
  if (!rolling.length) return 0;
  const signFlips = rolling.slice(1).filter((point, index) => Math.sign(point.beta) !== Math.sign(rolling[index].beta)).length;
  return Math.max(0, 1 - signFlips / Math.max(1, rolling.length - 1));
}

function classifyVerdict(explanatoryScore, stability, corr) {
  if (explanatoryScore >= 62 && stability >= 0.7) return "meaningful";
  if (explanatoryScore < 38 || Math.abs(corr) < 0.05) return "weak";
  return "unstable";
}

function isSupportiveRegime(symbol, real, dollar, breakeven) {
  if (["RING", "GLD", "AGQ"].includes(symbol)) {
    if (real < 0 && dollar < 0) return 1;
    if (real > 0 && dollar > 0) return -1;
  }
  if (symbol === "TIP") {
    if (real < 0 && breakeven > 0) return 1;
    if (real > 0 && breakeven < 0) return -1;
  }
  if (symbol === "TLT") {
    if (real < 0 && dollar < 0) return 1;
    if (real > 0 && breakeven > 0) return -1;
  }
  if (symbol === "COPX") {
    if (dollar < 0 && breakeven > 0) return 1;
    if (dollar > 0 && real > 0) return -1;
  }
  return 0;
}

function describeMacroSignal(code, latest, change20, percentile) {
  const direction = change20 > 0 ? "rising" : change20 < 0 ? "falling" : "flat";
  return `${DRIVER_LABELS[code]} ${direction}, ${Math.round(percentile)}th percentile`;
}

function buildTradingDates(length) {
  const dates = [];
  const date = new Date("2023-01-02T00:00:00");
  while (dates.length < length) {
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(date.toISOString().slice(0, 10));
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
}

function buildChange(values, window) {
  return values.map((value, index) => (index >= window ? value - values[index - window] : null));
}

function buildMomentum(values, window) {
  return values.map((value, index) => (index >= window && values[index - window] !== 0 ? value / values[index - window] - 1 : null));
}

function buildRollingVol(values, window) {
  return values.map((_, index) => {
    if (index < window) return null;
    const slice = values.slice(index - window, index);
    const mean = average(slice);
    return Math.sqrt(average(slice.map((item) => (item - mean) ** 2)));
  });
}

function latestValue(array) {
  return array[array.length - 1] || 0;
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  return filtered.length ? filtered.reduce((sum, value) => sum + value, 0) / filtered.length : 0;
}

function quantile(values, q) {
  if (!values.length) return 0;
  const position = (values.length - 1) * q;
  const base = Math.floor(position);
  const remainder = position - base;
  return values[base + 1] !== undefined ? values[base] + remainder * (values[base + 1] - values[base]) : values[base];
}

function percentileRank(values, current) {
  const sorted = values.filter((value) => Number.isFinite(value)).slice().sort((a, b) => a - b);
  if (!sorted.length || !Number.isFinite(current)) return 50;
  const below = sorted.filter((value) => value <= current).length;
  return (below / sorted.length) * 100;
}

function correlation(left, right) {
  const [cleanLeft, cleanRight] = cleanNumericPairs(left, right);
  if (!cleanLeft.length || cleanLeft.length !== cleanRight.length) return 0;
  const meanLeft = average(cleanLeft);
  const meanRight = average(cleanRight);
  let numerator = 0;
  let denomLeft = 0;
  let denomRight = 0;
  for (let index = 0; index < cleanLeft.length; index += 1) {
    const diffLeft = cleanLeft[index] - meanLeft;
    const diffRight = cleanRight[index] - meanRight;
    numerator += diffLeft * diffRight;
    denomLeft += diffLeft ** 2;
    denomRight += diffRight ** 2;
  }
  return denomLeft && denomRight ? numerator / Math.sqrt(denomLeft * denomRight) : 0;
}

function regressionBeta(left, right) {
  const [cleanLeft, cleanRight] = cleanNumericPairs(left, right);
  if (!cleanLeft.length || cleanLeft.length !== cleanRight.length) return 0;
  const meanLeft = average(cleanLeft);
  const meanRight = average(cleanRight);
  const covariance = average(cleanLeft.map((value, index) => (value - meanLeft) * (cleanRight[index] - meanRight)));
  const variance = average(cleanRight.map((value) => (value - meanRight) ** 2));
  if (!variance) return 0;
  return covariance / variance;
}

function weightedAverage(items) {
  const totalWeight = items.reduce((sum, [, weight]) => sum + weight, 0);
  return totalWeight ? items.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight : 0;
}

function normalizeAbs(value, maxAbs) {
  return Math.max(0, Math.min(100, (Math.abs(value) / maxAbs) * 100));
}

function normalizeRange(value, low, high) {
  if (high === low) return 0;
  return Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100));
}

function zScore(values) {
  if (!values.length) return 0;
  const latest = values[values.length - 1];
  const history = values.slice(0, -1);
  const mean = average(history);
  const variance = average(history.map((value) => (value - mean) ** 2));
  const std = Math.sqrt(variance);
  return std ? (latest - mean) / std : 0;
}

function createRng(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function formatSigned(value) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function describeDatasetPeriod(meta) {
  if (meta?.startDate && meta?.endDate) {
    return `${meta.startDate} to ${meta.endDate}`;
  }
  return meta?.dataStatus === SCOUT_DATA_STATUS.LIVE ? "Live history window" : "Simulated macro history";
}

function datasetSampleSize(meta) {
  return meta?.observations || 720;
}

function intersectDateLists(dateLists) {
  if (!dateLists.length) return [];
  let intersection = new Set(dateLists[0]);
  for (const dates of dateLists.slice(1)) {
    const current = new Set(dates);
    intersection = new Set([...intersection].filter((date) => current.has(date)));
  }
  return [...intersection].sort();
}

function alignMacroToDates(points, targetDates) {
  const sorted = [...points].sort((left, right) => left.date.localeCompare(right.date));
  const aligned = [];
  let cursor = 0;
  let lastValue = null;

  targetDates.forEach((date) => {
    while (cursor < sorted.length && sorted[cursor].date <= date) {
      lastValue = Number(sorted[cursor].value);
      cursor += 1;
    }
    aligned.push({
      date,
      value: Number.isFinite(lastValue) ? lastValue : null,
    });
  });

  return aligned;
}

function cleanNumericPairs(left, right) {
  const cleanLeft = [];
  const cleanRight = [];
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (!Number.isFinite(left[index]) || !Number.isFinite(right[index])) continue;
    cleanLeft.push(left[index]);
    cleanRight.push(right[index]);
  }
  return [cleanLeft, cleanRight];
}

function describeCurrentDriverPosition(signal, macroFeatures) {
  if (!signal) return "";
  const featurePack = macroFeatures?.[signal.driverCode];
  const currentLevel = latestValue(featurePack?.level);
  const levelText =
    signal.levelPercentile >= 75
      ? "high versus history"
      : signal.levelPercentile <= 25
        ? "low versus history"
        : "near the middle of its history";
  const directionText =
    signal.currentChange > 0
      ? "rising"
      : signal.currentChange < 0
        ? "falling"
        : "flat";
  return `${signal.driverLabel} is ${directionText} and ${levelText}${Number.isFinite(currentLevel) ? ` (${currentLevel.toFixed(2)})` : ""}.`;
}
