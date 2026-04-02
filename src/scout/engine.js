import {
  SCOUT_BUCKETS,
  SCOUT_DATA_STATUS,
  SCOUT_IMPLEMENTATION_STATUS,
  createBacktestResult,
  createOpportunity,
  createScorecard,
  createStrategyDefinition,
  createStrategyStatus,
} from "./models.js";
import { createMacroResearchModel } from "./macro-engine.js";
import { runVixStrategy, runGoldSilverRatioStrategy, runVixStrategyMultiHorizon, runMomentumBacktest } from "./strategy-lab.js";

const DEFAULT_LOOKBACK_DAYS = 260;
const PAIRS_ENTRY_Z = 1.8;
const PAIRS_EXIT_Z = 0.45;
const ETF_ENTRY_Z = 1.55;
const ETF_EXIT_Z = 0.35;

export function createScoutEngine({ config, marketDataGateway }) {
  const strategyLibrary = buildStrategyLibrary();

  return {
    getStrategyLibrary() {
      return strategyLibrary.slice();
    },

    async evaluate({ context, analytics, scoutState, valuationDate }) {
      const portfolioContext = buildPortfolioContext(analytics);
      const universe = buildUniverse(portfolioContext, scoutState);
      const dateRange = buildDateRange(valuationDate, DEFAULT_LOOKBACK_DAYS);
      const providerResult = await loadSeries({
        config,
        marketDataGateway,
        universe,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      const pairResults = evaluatePairs(providerResult.seriesMap, portfolioContext, universe.pairs, providerResult.dataStatus);
      const etfResults = evaluateEtfDislocations(providerResult.seriesMap, portfolioContext, universe.etfs, providerResult.dataStatus);
      const eventDrivenResults = evaluateEventDriven(providerResult.seriesMap, portfolioContext);
      const fxResults = evaluateFxTriangular(providerResult.seriesMap, portfolioContext);
      const volatilityResults = evaluateVolatilityModules(providerResult.seriesMap, portfolioContext);
      const macroResearch = await createMacroResearchModel({
        scoutState,
        portfolioContext,
        providerStatus: providerResult.dataStatus,
      });

      // Strategy Lab — VIX Entry + Gold/Silver Ratio
      const strategyLabData = macroResearch.strategyLabData || {};
      const vixParams = scoutState?.strategyLab?.vixParams || {};
      const gsParams = scoutState?.strategyLab?.gsParams || {};
      const activeTimeframe = scoutState?.strategyLab?.activeTimeframe ?? 20;
      const momentumParams = scoutState?.strategyLab?.momentumParams || {};

      // VIX single-horizon (for the live signal card)
      const vixResult = runVixStrategy({
        vixSeries: strategyLabData.VIX || [],
        spySeries: strategyLabData.SPY || [],
        threshold: vixParams.threshold ?? 25,
        horizon: activeTimeframe,
      });

      // VIX multi-horizon summary table (all horizons at once)
      const vixMultiHorizon = runVixStrategyMultiHorizon({
        vixSeries: strategyLabData.VIX || [],
        spySeries: strategyLabData.SPY || [],
        threshold: vixParams.threshold ?? 25,
        horizons: [20, 40, 60, 120, 250],
      });

      // GS ratio maxDays scales with timeframe
      const gsDays = activeTimeframe >= 120 ? 365 : activeTimeframe >= 60 ? 240 : activeTimeframe >= 20 ? 180 : 90;
      const gsResult = runGoldSilverRatioStrategy({
        gldSeries: strategyLabData.GLD || [],
        slvSeries: strategyLabData.SLV || [],
        silSeries: strategyLabData.SIL || [],
        entryRatio: gsParams.entryRatio ?? 75,
        exitRatio: gsParams.exitRatio ?? 50,
        maxDays: gsDays,
      });

      // Momentum backtest — selected asset, selected trigger
      const momentumAsset = momentumParams.asset || "AGQ";
      const momentumTrigger = momentumParams.triggerPct ?? -3;
      const momentumSeries = strategyLabData[momentumAsset]
        || macroResearch.strategyLabData?.[momentumAsset]
        || [];
      const momentumResult = runMomentumBacktest({
        priceSeries: momentumSeries,
        triggerPct: momentumTrigger,
        horizons: [1, 5, 20, 60],
      });

      const strategyLab = { vix: vixResult, vixMultiHorizon, goldSilver: gsResult, momentumResult, activeTimeframe };

      const opportunities = [
        ...macroResearch.opportunities,
        ...pairResults.opportunities,
        ...etfResults.opportunities,
        ...eventDrivenResults.opportunities,
        ...fxResults.opportunities,
        ...volatilityResults.opportunities,
      ].sort((left, right) => right.scorecard.compositeScoutScore - left.scorecard.compositeScoutScore);

      const backtests = [
        ...macroResearch.backtests,
        ...opportunities.filter((item) => item.backtest).map((item) => item.backtest),
      ];
      const strategyStatuses = buildStrategyStatuses(strategyLibrary, {
        providerResult,
        pairResults,
        etfResults,
        eventDrivenResults,
        fxResults,
        volatilityResults,
      });
      const watchlist = buildWatchlistView(scoutState, opportunities, strategyLibrary);

      return {
        generatedAt: new Date().toISOString(),
        dataStatus: macroResearch.dataStatus || providerResult.dataStatus,
        freshnessLabel: macroResearch.freshnessLabel || providerResult.freshnessLabel,
        library: strategyLibrary,
        macroResearch,
        strategyLab,
        opportunities,
        backtests,
        strategyStatuses,
        watchlist,
        overview: buildOverview({
          strategyLibrary,
          opportunities,
          backtests,
          providerResult,
        }),
      };
    },
  };
}

function buildStrategyLibrary() {
  return [
    createStrategyDefinition({
      id: "macro-conditional-return-mapping",
      name: "Macro-Conditional Return Mapping",
      family: "Macro Regime Research",
      bucket: SCOUT_BUCKETS.HIGH_PRIORITY,
      assetClass: "Cross-Asset",
      shortDescription:
        "Tests forward asset returns across macro levels, changes, momentum, volatility, percentile buckets, and joint macro regimes rather than relying on simple one-factor correlations.",
      relationship: "Asset forward returns conditioned on macro state",
      requiredDataInputs: ["Asset history", "Nominal yields", "Real yields", "Breakevens", "Curve slope", "Dollar proxy"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.PARTIALLY_LIVE,
      backtestAvailable: true,
      caveats: [
        "Primary macro series and core ETFs now run on live FRED and Yahoo history when the local data bridge is available.",
        "Conditional edges can decay or flip across policy regimes.",
      ],
      pdfAnchors: ["Chapter 5 Fixed Income", "Chapter 8 FX", "Chapter 14 Inflation", "Appendix A Backtesting"],
      tags: ["macro-v1", "bucket-a"],
    }),
    createStrategyDefinition({
      id: "macro-relative-expression",
      name: "Relative Macro Expression Selection",
      family: "Macro Relative Value",
      bucket: SCOUT_BUCKETS.HIGH_PRIORITY,
      assetClass: "Cross-Asset",
      shortDescription:
        "Compares alternative macro expressions such as RING vs GLD or TIP vs TLT to determine which vehicle historically performed better in the current backdrop.",
      relationship: "Relative performance spread across macro regimes",
      requiredDataInputs: ["Paired asset histories", "Macro regime features", "Portfolio context"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.PARTIALLY_LIVE,
      backtestAvailable: true,
      caveats: [
        "Relative edges can be meaningful even when standalone asset direction is unclear.",
        "Spread behavior should not be mistaken for an execution-ready stat-arb trade.",
      ],
      pdfAnchors: ["Chapter 3 Stocks", "Chapter 4 ETFs", "Chapter 5 Fixed Income", "Chapter 14 TIPS-Treasury arbitrage"],
      tags: ["macro-v1", "bucket-a"],
    }),
    createStrategyDefinition({
      id: "macro-regime-classifier",
      name: "Composite Macro Regime Classifier",
      family: "Macro Regime Research",
      bucket: SCOUT_BUCKETS.HIGH_PRIORITY,
      assetClass: "Cross-Asset",
      shortDescription:
        "Combines nominal yields, real yields, breakevens, curve shape, and dollar conditions into a transparent favorable/mixed/unfavorable classifier for each asset.",
      relationship: "Current macro backdrop versus historically favorable states",
      requiredDataInputs: ["Macro feature set", "Historical conditional return map"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.PARTIALLY_LIVE,
      backtestAvailable: true,
      caveats: [
        "Classifier is rule-based and transparent, not a black-box forecast engine.",
        "Confidence is intentionally reduced when relationships are unstable.",
      ],
      pdfAnchors: ["Chapter 5 Fixed Income", "Chapter 8 FX", "Chapter 19 Global Macro"],
      tags: ["macro-v1", "bucket-a"],
    }),
    createStrategyDefinition({
      id: "precious-metals-real-yield-map",
      name: "Precious Metals Real-Yield Map",
      family: "Macro Conditional Research",
      bucket: SCOUT_BUCKETS.HIGH_PRIORITY,
      assetClass: "Metals / Miners",
      shortDescription:
        "Treats real yields as a first-class explanatory variable for RING, AGQ, and GLD, while separating miner-equity behavior from metal beta and leveraged ETF path dependence.",
      relationship: "Precious-metals expressions versus real yields, dollar, and breakevens",
      requiredDataInputs: ["RING", "AGQ", "GLD", "Real yields", "Dollar proxy", "Breakevens"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.PARTIALLY_LIVE,
      backtestAvailable: true,
      caveats: [
        "AGQ is modeled as a 2x daily rebalanced product, not a clean silver spot proxy.",
        "RING retains equity and operating leverage effects beyond gold beta.",
        "Macro conditioning falls back to simulated history if the local real-data endpoint is unavailable.",
      ],
      pdfAnchors: ["Chapter 3 Stocks", "Chapter 4 ETFs", "Chapter 8 FX", "Chapter 14 Inflation"],
      tags: ["macro-v1", "bucket-a"],
    }),
    createStrategyDefinition({
      id: "pairs-relative-value",
      name: "Pairs Trading / Relative Value",
      family: "StatArb / Mean Reversion",
      bucket: SCOUT_BUCKETS.HIGH_PRIORITY,
      assetClass: "Equities",
      shortDescription:
        "Tracks historically linked equities and ranks current spread dislocations using rolling spread, z-score, correlation, and reversion diagnostics.",
      relationship: "Relative pricing between historically co-moving stocks or cluster peers",
      requiredDataInputs: ["Adjusted close history", "Corporate action adjusted prices", "Portfolio holdings"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.SIMULATED,
      backtestAvailable: true,
      caveats: [
        "Correlation is not cointegration; structural breaks are common.",
        "Shorting costs, borrow availability, and slippage can dominate naive paper edge.",
      ],
      pdfAnchors: ["Chapter 3.8 Pairs trading", "Chapter 3.9 Mean-reversion", "Chapter 3.10 Weighted regression"],
      tags: ["bucket-a", "live-candidate", "backtest-ready"],
    }),
    createStrategyDefinition({
      id: "etf-proxy-dislocation",
      name: "ETF / Proxy Dislocation",
      family: "ETF Relative Value",
      bucket: SCOUT_BUCKETS.HIGH_PRIORITY,
      assetClass: "ETFs / Index Proxies",
      shortDescription:
        "Monitors ETF versus ETF and ETF versus proxy-basket relationships for unusual deviations versus recent history.",
      relationship: "Price or ratio mismatch between closely related ETFs and liquid proxies",
      requiredDataInputs: ["ETF history", "Proxy history", "Optional constituent basket or NAV proxies"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.SIMULATED,
      backtestAvailable: true,
      caveats: [
        "True ETF arb requires primary market creation-redemption and intraday data not present here.",
        "Proxy baskets are approximate unless full constituents and weights are available.",
      ],
      pdfAnchors: ["Chapter 4 ETFs", "Chapter 6.4 Intraday arbitrage between index ETFs", "Chapter 6.2 Cash-and-carry arbitrage"],
      tags: ["bucket-a", "live-candidate", "backtest-ready"],
    }),
    createStrategyDefinition({
      id: "event-driven-ma-watch",
      name: "Event-Driven / M&A Watchlist",
      family: "Event-Driven",
      bucket: SCOUT_BUCKETS.HIGH_PRIORITY,
      assetClass: "Equities / Corporate Actions",
      shortDescription:
        "Keeps a research-first book of announced deals, tracks deal spread versus terms, and surfaces candidates for manual underwriting.",
      relationship: "Target price versus deal consideration and expected completion path",
      requiredDataInputs: ["Target price", "Acquirer price for stock deals", "Deal terms", "Expected close", "Status notes"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.PARTIALLY_LIVE,
      backtestAvailable: false,
      caveats: [
        "Legal, financing, and antitrust risk are not inferable from prices alone.",
        "Watchlist uses semi-manual deal metadata until a corporate actions feed is added.",
      ],
      pdfAnchors: ["Chapter 3.16 Event-driven - M&A"],
      tags: ["bucket-a", "research-first"],
    }),
    createStrategyDefinition({
      id: "fx-triangular-consistency",
      name: "FX Cross-Rate / Triangular Consistency",
      family: "FX Relative Value",
      bucket: SCOUT_BUCKETS.HIGH_PRIORITY,
      assetClass: "Foreign Exchange",
      shortDescription:
        "Tests whether observed cross rates diverge from implied triangular relationships enough to merit attention after noise suppression.",
      relationship: "Quoted cross rate versus implied cross rate from related currency pairs",
      requiredDataInputs: ["Synchronous FX quotes", "Cross-rate history", "Spread/latency metadata"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.PARTIALLY_LIVE,
      backtestAvailable: false,
      caveats: [
        "Triangular arbitrage is extremely latency sensitive and usually not deployable on delayed data.",
        "Useful as a consistency monitor and research object even when execution is unrealistic.",
      ],
      pdfAnchors: ["Chapter 8.5 FX triangular arbitrage"],
      tags: ["bucket-a", "noise-suppressed"],
    }),
    createStrategyDefinition({
      id: "cash-and-carry-monitor",
      name: "Cash-and-Carry Spread Monitor",
      family: "Basis / Carry",
      bucket: SCOUT_BUCKETS.HIGH_PRIORITY,
      assetClass: "Indexes / Futures",
      shortDescription: "Scaffold for spot-futures basis relationships where carry inputs and synchronized quotes can be validated.",
      relationship: "Observed futures basis versus carrying-cost implied fair value",
      requiredDataInputs: ["Spot index", "Futures price", "Funding rate", "Dividend yield or carry inputs"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.RESEARCH_ONLY,
      backtestAvailable: false,
      caveats: [
        "Fair value depends on funding, dividends, financing frictions, and contract specifics.",
        "Not productized until synchronized futures data is available.",
      ],
      pdfAnchors: ["Chapter 6.2 Cash-and-carry arbitrage"],
      tags: ["bucket-a", "scaffold"],
    }),
    createStrategyDefinition({
      id: "volatility-risk-premium",
      name: "Volatility Risk Premium",
      family: "Volatility",
      bucket: SCOUT_BUCKETS.NEXT_WAVE,
      assetClass: "Options / Volatility",
      shortDescription: "Framework for realized versus implied volatility spreads and short-vol carry with transparent risk flags.",
      relationship: "Implied volatility premium versus subsequent realized volatility",
      requiredDataInputs: ["Options surface", "Realized vol history", "VIX or proxy"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.RESEARCH_ONLY,
      backtestAvailable: false,
      caveats: [
        "Requires options surface history and crash-risk framing.",
        "Gross carry without tail-loss controls would be misleading.",
      ],
      pdfAnchors: ["Chapter 7.4 Volatility risk premium", "Chapter 7.4.1 Gamma hedging"],
      tags: ["bucket-b"],
    }),
    createStrategyDefinition({
      id: "vix-basis",
      name: "VIX Futures Basis",
      family: "Volatility Term Structure",
      bucket: SCOUT_BUCKETS.NEXT_WAVE,
      assetClass: "Volatility Futures",
      shortDescription: "Tracks VIX term-structure slope and related ETN carry proxies with explicit basis and roll logic.",
      relationship: "Front futures versus spot VIX and nearby term-structure slope",
      requiredDataInputs: ["Spot VIX", "VIX futures strip", "Roll calendar"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.PARTIALLY_LIVE,
      backtestAvailable: false,
      caveats: [
        "Term-structure carry is path dependent and regime sensitive.",
        "Need futures history to move beyond a monitor.",
      ],
      pdfAnchors: ["Chapter 7.2 VIX futures basis trading", "Chapter 7.3 Volatility carry with two ETNs"],
      tags: ["bucket-b", "scaffold"],
    }),
    createStrategyDefinition({
      id: "dispersion-monitor",
      name: "Dispersion Monitor",
      family: "Index / Options Relative Value",
      bucket: SCOUT_BUCKETS.NEXT_WAVE,
      assetClass: "Indexes / Options",
      shortDescription: "Research scaffold for index implied vol versus single-name implied vol basket dispersion.",
      relationship: "Index volatility versus weighted constituent volatility",
      requiredDataInputs: ["Index options surface", "Single-name options surface", "Basket weights"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.RESEARCH_ONLY,
      backtestAvailable: false,
      caveats: ["Requires options data across many names and careful hedging assumptions."],
      pdfAnchors: ["Chapter 6.3 Dispersion trading in equity indexes"],
      tags: ["bucket-b"],
    }),
    createStrategyDefinition({
      id: "futures-calendar-spread",
      name: "Futures Calendar Spread",
      family: "Futures Relative Value",
      bucket: SCOUT_BUCKETS.NEXT_WAVE,
      assetClass: "Futures",
      shortDescription: "Scaffold for front-versus-deferred contract relationships with roll and seasonality awareness.",
      relationship: "Nearby versus deferred futures term structure",
      requiredDataInputs: ["Contract chain", "Expiry metadata", "Carry/seasonality context"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.RESEARCH_ONLY,
      backtestAvailable: false,
      caveats: ["Needs contract rolls and proper continuous-series construction."],
      pdfAnchors: ["Chapter 10.2 Calendar spread"],
      tags: ["bucket-b"],
    }),
    createStrategyDefinition({
      id: "commodity-roll-carry",
      name: "Commodity Roll / Carry",
      family: "Commodity Carry",
      bucket: SCOUT_BUCKETS.NEXT_WAVE,
      assetClass: "Commodities",
      shortDescription: "Tracks commodity curve shape and roll-yield opportunities once futures term structures are available.",
      relationship: "Roll yield and curve shape across commodity contracts",
      requiredDataInputs: ["Commodity futures curves", "Contract metadata", "Roll schedule"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.RESEARCH_ONLY,
      backtestAvailable: false,
      caveats: ["Requires curve data and contract-level roll methodology."],
      pdfAnchors: ["Chapter 9.1 Roll yields"],
      tags: ["bucket-b"],
    }),
    createStrategyDefinition({
      id: "cds-basis",
      name: "CDS Basis Arbitrage",
      family: "Credit Relative Value",
      bucket: SCOUT_BUCKETS.RESEARCH,
      assetClass: "Credit",
      shortDescription: "Catalog entry retained for architecture breadth, pending CDS and bond data access.",
      relationship: "Bond spread versus CDS spread",
      requiredDataInputs: ["CDS curves", "Bond prices", "Funding/hedging inputs"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.RESEARCH_ONLY,
      backtestAvailable: false,
      caveats: ["Institutional credit data required."],
      pdfAnchors: ["Chapter 5.14 CDS basis arbitrage"],
      tags: ["bucket-c"],
    }),
    createStrategyDefinition({
      id: "swap-spread",
      name: "Swap-Spread Arbitrage",
      family: "Rates Relative Value",
      bucket: SCOUT_BUCKETS.RESEARCH,
      assetClass: "Rates",
      shortDescription: "Research catalog item for Treasury versus swap spread relationships.",
      relationship: "Swap fixed leg versus Treasury yield spread",
      requiredDataInputs: ["Swap curve", "Treasury curve", "Funding assumptions"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.RESEARCH_ONLY,
      backtestAvailable: false,
      caveats: ["Funding and balance-sheet constraints matter materially."],
      pdfAnchors: ["Chapter 5.15 Swap-spread arbitrage"],
      tags: ["bucket-c"],
    }),
    createStrategyDefinition({
      id: "convertible-arbitrage",
      name: "Convertible Arbitrage",
      family: "Hybrid Relative Value",
      bucket: SCOUT_BUCKETS.RESEARCH,
      assetClass: "Convertibles",
      shortDescription: "Research object for long-convertible short-equity structures and OAS relative value.",
      relationship: "Convertible fair value versus stock and credit sensitivities",
      requiredDataInputs: ["Convertible terms", "Stock history", "Volatility inputs", "Credit inputs"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.RESEARCH_ONLY,
      backtestAvailable: false,
      caveats: ["Model-dependent greeks and security-level data are missing."],
      pdfAnchors: ["Chapter 12.1 Convertible arbitrage", "Chapter 12.2 Convertible option-adjusted spread"],
      tags: ["bucket-c"],
    }),
    createStrategyDefinition({
      id: "tips-treasury",
      name: "TIPS-Treasury Arbitrage",
      family: "Inflation Relative Value",
      bucket: SCOUT_BUCKETS.RESEARCH,
      assetClass: "Rates / Inflation",
      shortDescription: "Research scaffold around breakeven inflation and relative richness between nominal Treasuries and TIPS.",
      relationship: "Nominal Treasury versus TIPS implied inflation relationship",
      requiredDataInputs: ["Treasury curve", "TIPS curve", "Inflation swap proxies"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.RESEARCH_ONLY,
      backtestAvailable: false,
      caveats: ["Needs curve data, inflation carry, and liquidity adjustment."],
      pdfAnchors: ["Chapter 14.2 TIPS-Treasury arbitrage"],
      tags: ["bucket-c"],
    }),
    createStrategyDefinition({
      id: "variance-swap-skew",
      name: "Variance Swap / Skew Relative Value",
      family: "Options Surface Relative Value",
      bucket: SCOUT_BUCKETS.RESEARCH,
      assetClass: "Options / Volatility",
      shortDescription: "Catalog placeholder for skew and variance structures that require surface-level options data.",
      relationship: "Skew, variance, and implied-realized dislocations",
      requiredDataInputs: ["Options surface", "Variance swap levels or replication", "Realized vol history"],
      implementationStatus: SCOUT_IMPLEMENTATION_STATUS.RESEARCH_ONLY,
      backtestAvailable: false,
      caveats: ["Not credible without options-chain history and replication assumptions."],
      pdfAnchors: ["Chapter 7.5 Volatility skew", "Chapter 7.6 Variance swaps"],
      tags: ["bucket-c", "bucket-d-reference"],
    }),
  ];
}

function buildOverview({ strategyLibrary, opportunities, backtests, providerResult }) {
  return {
    activeOpportunities: opportunities.filter((item) => item.signalState !== "Research queue").length,
    strategiesUnderCoverage: strategyLibrary.length,
    strategiesBacktested: new Set(backtests.map((item) => item.strategyId)).size,
    strategiesCurrentlyAttractive: new Set(opportunities.filter((item) => item.scorecard.compositeScoutScore >= 65).map((item) => item.strategyId)).size,
    dataStatus: providerResult.dataStatus,
    dataFreshness: providerResult.freshnessLabel,
  };
}

function buildStrategyStatuses(strategyLibrary, resultSet) {
  const liveIds = new Set([...resultSet.pairResults.coveredIds, ...resultSet.etfResults.coveredIds]);
  const partialIds = new Set([...resultSet.eventDrivenResults.coveredIds, ...resultSet.fxResults.coveredIds, ...resultSet.volatilityResults.coveredIds]);

  return strategyLibrary.map((strategy) =>
    createStrategyStatus({
      strategyId: strategy.id,
      dataStatus: liveIds.has(strategy.id)
        ? resultSet.providerResult.dataStatus
        : partialIds.has(strategy.id)
          ? SCOUT_DATA_STATUS.RESEARCH_ONLY
          : SCOUT_DATA_STATUS.RESEARCH_ONLY,
      freshnessLabel: liveIds.has(strategy.id) ? resultSet.providerResult.freshnessLabel : "Research scaffold",
      coverageLabel: liveIds.has(strategy.id) ? "Signal monitor active" : partialIds.has(strategy.id) ? "Research queue active" : "Catalog only",
      notes: strategy.caveats[0] || "",
    })
  );
}

async function loadSeries({ config, marketDataGateway, universe, startDate, endDate }) {
  const allSymbols = [...new Set([...universe.pairs.flat(), ...universe.etfs.flat(), ...universe.fxPairs, ...universe.volatilitySymbols])];
  const configured = Boolean(config?.backend?.baseUrl || config?.backend?.edgeFunctionsBaseUrl);
  if (configured && marketDataGateway?.getHistoricalPrices) {
    try {
      const response = await marketDataGateway.getHistoricalPrices(allSymbols, startDate, endDate);
      const seriesMap = normalizeProviderHistory(response?.prices || response?.data || {});
      const coveredSymbols = Object.keys(seriesMap).filter((symbol) => seriesMap[symbol]?.length >= 120);
      if (coveredSymbols.length >= 8) {
        return {
          seriesMap,
          dataStatus: response?.freshness === "live" ? SCOUT_DATA_STATUS.LIVE : SCOUT_DATA_STATUS.DELAYED,
          freshnessLabel: response?.freshness || "Delayed provider data",
          source: response?.source || "provider",
        };
      }
    } catch {
      // Fall back to deterministic mocks.
    }
  }

  return {
    seriesMap: buildMockSeriesMap(startDate, endDate, universe),
    dataStatus: SCOUT_DATA_STATUS.SIMULATED,
    freshnessLabel: "Simulated fallback series",
    source: "mock-scout-provider",
  };
}

function normalizeProviderHistory(rawPrices) {
  const normalized = {};

  Object.entries(rawPrices || {}).forEach(([symbol, observations]) => {
    if (!Array.isArray(observations)) return;
    normalized[symbol] = observations
      .map((item) => {
        const date = item?.date || item?.timestamp?.slice?.(0, 10) || "";
        const price = Number(item?.price ?? item?.close ?? item?.adjClose ?? item?.value);
        return date && Number.isFinite(price) ? { date, price } : null;
      })
      .filter(Boolean)
      .sort((left, right) => left.date.localeCompare(right.date));
  });

  return normalized;
}

function buildPortfolioContext(analytics) {
  const holdings = (analytics?.openHoldings || analytics?.holdings || [])
    .filter((holding) => holding.ticker && holding.ticker !== "CASH")
    .map((holding) => ({
      ticker: holding.ticker,
      marketValue: Number(holding.marketValue || 0),
      weight: Number(holding.portfolioWeight || 0),
    }));

  return {
    holdings,
    holdingMap: new Map(holdings.map((holding) => [holding.ticker, holding])),
  };
}

function buildUniverse(portfolioContext, scoutState) {
  const pairUniverse = [
    ["MSFT", "AAPL"],
    ["GOOGL", "META"],
    ["KO", "PEP"],
    ["XOM", "CVX"],
    ["JPM", "BAC"],
  ];
  const etfUniverse = [
    ["SPY", "IVV"],
    ["QQQ", "VGT"],
    ["XLE", "VDE"],
    ["TLT", "IEF"],
    ["IWM", "VTWO"],
  ];
  const portfolioNames = portfolioContext.holdings.map((holding) => holding.ticker);
  const customPairs = Array.isArray(scoutState?.customPairs)
    ? scoutState.customPairs
        .map((pair) => [String(pair?.left || "").toUpperCase(), String(pair?.right || "").toUpperCase()])
        .filter((pair) => pair[0] && pair[1])
    : [];

  portfolioNames.slice(0, 4).forEach((ticker, index) => {
    const peer = ["SPY", "QQQ", "XLK", "XLF"][index] || "SPY";
    pairUniverse.push([ticker, peer]);
  });
  pairUniverse.push(...customPairs);

  return {
    pairs: dedupeTuples(pairUniverse),
    etfs: dedupeTuples(etfUniverse),
    fxPairs: ["EURUSD", "USDJPY", "EURJPY"],
    volatilitySymbols: ["VIX", "VX1", "VX2"],
  };
}

function evaluatePairs(seriesMap, portfolioContext, universe, dataStatus) {
  const opportunities = [];
  const coveredIds = [];

  universe.forEach(([left, right]) => {
    const leftSeries = seriesMap[left];
    const rightSeries = seriesMap[right];
    if (!leftSeries?.length || !rightSeries?.length) return;

    const pair = alignSeries(leftSeries, rightSeries);
    if (pair.length < 160) return;

    const diagnostics = computeSpreadDiagnostics(pair, 30);
    const backtestMetrics = runMeanReversionBacktest({
      alignedSeries: pair,
      entryZ: PAIRS_ENTRY_Z,
      exitZ: PAIRS_EXIT_Z,
      maxHoldDays: 20,
      transactionCostBps: 12,
      slippageBps: 6,
    });

    const overlap = derivePortfolioOverlap([left, right], portfolioContext);
    const scorecard = buildScorecard({
      signalStrength: normalizeAbs(diagnostics.latestZ, 3.5),
      historicalEfficacy: normalizeRange(backtestMetrics.sharpe, -0.2, 1.8),
      robustness: normalizeRange(diagnostics.correlation, 0.2, 0.95),
      liquidityTradability: normalizeRange(Math.min(lastPrice(leftSeries), lastPrice(rightSeries)), 15, 250),
      costSensitivity: normalizeRange(45 - backtestMetrics.turnover, 0, 45),
      regimeFit: normalizeRange(2.6 - Math.abs(diagnostics.latestZ), 0, 2.6),
      dataQuality: 84,
      portfolioRelevance: overlap.portfolioRelevanceScore,
      riskPenalty: deriveRiskPenalty({
        correlation: diagnostics.correlation,
        maxDrawdown: Math.abs(backtestMetrics.maxDrawdown),
        halfLife: diagnostics.halfLife,
      }),
    });

    coveredIds.push("pairs-relative-value");
    opportunities.push(
      createOpportunity({
        id: `pair-${left}-${right}`,
        strategyId: "pairs-relative-value",
        strategyName: "Pairs Trading / Relative Value",
        strategyFamily: "StatArb / Mean Reversion",
        instruments: [left, right],
        signalState: describeZSignal(diagnostics.latestZ, PAIRS_ENTRY_Z),
        signalValueLabel: `Z-score ${formatSigned(diagnostics.latestZ, 2)}`,
        spreadLabel: `Spread ${formatSigned(diagnostics.latestSpread, 4)} | Corr ${formatSigned(diagnostics.correlation, 2)}`,
        confidenceLabel: `${Math.round(scorecard.liveOpportunityScore)}/100`,
        whyNow: `Deviation is ${formatSigned(diagnostics.latestZ, 2)} standard deviations from the recent mean with ${formatSigned(diagnostics.correlation, 2)} rolling correlation and ${Math.round(diagnostics.halfLife)}-day half-life proxy.`,
        riskFlag: diagnostics.correlation < 0.55 ? "Fragile linkage" : backtestMetrics.maxDrawdown < -0.16 ? "Drawdown sensitive" : "Contained",
        freshness: pair[pair.length - 1]?.date || "",
        dataStatus,
        overlapSummary: overlap.summary,
        scorecard,
        backtest: createBacktestResult({
          strategyId: "pairs-relative-value",
          opportunityId: `pair-${left}-${right}`,
          title: `${left}/${right} relative value`,
          testPeriod: `${pair[0].date} to ${pair[pair.length - 1].date}`,
          universe: `${left} vs ${right}`,
          signalDefinition: "Rolling log-price spread z-score over a 30-day window",
          entryRule: `Enter when |z| >= ${PAIRS_ENTRY_Z}`,
          exitRule: `Exit when |z| <= ${PAIRS_EXIT_Z} or after 20 trading days`,
          holdingPeriod: "Max 20 trading days",
          transactionCostAssumption: "12 bps round-trip per leg",
          slippageAssumption: "6 bps round-trip placeholder",
          grossReturn: backtestMetrics.grossReturn,
          netReturn: backtestMetrics.netReturn,
          sharpe: backtestMetrics.sharpe,
          hitRate: backtestMetrics.hitRate,
          maxDrawdown: backtestMetrics.maxDrawdown,
          turnover: backtestMetrics.turnover,
          sampleSize: backtestMetrics.trades,
          robustnessNotes: diagnostics.correlation < 0.6 ? "Correlation weakened; treat as watchlist candidate." : "Relationship remained stable enough for monitor coverage.",
          regimeCompatibility: diagnostics.latestZ > 0 ? "Short rich leg / buy cheap leg if volatility is not regime-breaking." : "Long rich-reversal setup if cross-sectional mean reversion persists.",
          implementationStatus: SCOUT_IMPLEMENTATION_STATUS.SIMULATED,
        }),
        metadata: {
          zScore: diagnostics.latestZ,
          correlation: diagnostics.correlation,
          halfLife: diagnostics.halfLife,
        },
      })
    );
  });

  return { opportunities, coveredIds };
}

function evaluateEtfDislocations(seriesMap, portfolioContext, universe, dataStatus) {
  const opportunities = [];
  const coveredIds = [];

  universe.forEach(([left, right]) => {
    const leftSeries = seriesMap[left];
    const rightSeries = seriesMap[right];
    if (!leftSeries?.length || !rightSeries?.length) return;

    const aligned = alignSeries(leftSeries, rightSeries);
    if (aligned.length < 160) return;

    const diagnostics = computeSpreadDiagnostics(aligned, 25);
    const backtestMetrics = runMeanReversionBacktest({
      alignedSeries: aligned,
      entryZ: ETF_ENTRY_Z,
      exitZ: ETF_EXIT_Z,
      maxHoldDays: 12,
      transactionCostBps: 8,
      slippageBps: 4,
    });

    const overlap = derivePortfolioOverlap([left, right], portfolioContext);
    const scorecard = buildScorecard({
      signalStrength: normalizeAbs(diagnostics.latestZ, 3),
      historicalEfficacy: normalizeRange(backtestMetrics.sharpe, -0.1, 1.5),
      robustness: normalizeRange(diagnostics.correlation, 0.45, 0.995),
      liquidityTradability: 88,
      costSensitivity: normalizeRange(65 - backtestMetrics.turnover, 0, 65),
      regimeFit: normalizeRange(2.4 - Math.abs(diagnostics.latestZ), 0, 2.4),
      dataQuality: 78,
      portfolioRelevance: overlap.portfolioRelevanceScore,
      riskPenalty: deriveRiskPenalty({
        correlation: diagnostics.correlation,
        maxDrawdown: Math.abs(backtestMetrics.maxDrawdown),
        halfLife: diagnostics.halfLife,
      }),
    });

    coveredIds.push("etf-proxy-dislocation");
    opportunities.push(
      createOpportunity({
        id: `etf-${left}-${right}`,
        strategyId: "etf-proxy-dislocation",
        strategyName: "ETF / Proxy Dislocation",
        strategyFamily: "ETF Relative Value",
        instruments: [left, right],
        signalState: describeZSignal(diagnostics.latestZ, ETF_ENTRY_Z),
        signalValueLabel: `Dislocation ${formatSigned(diagnostics.latestZ, 2)}z`,
        spreadLabel: `Ratio gap ${formatSigned(diagnostics.latestSpread, 4)} | Corr ${formatSigned(diagnostics.correlation, 2)}`,
        confidenceLabel: `${Math.round(scorecard.liveOpportunityScore)}/100`,
        whyNow: `The ${left}/${right} relationship is stretched versus its recent range, which is consistent with the PDF's ETF mean-reversion and ETF-index mismatch framing but kept here as a monitor, not a primary-market arb claim.`,
        riskFlag: diagnostics.correlation < 0.8 ? "Proxy mismatch drift" : "Normal ETF noise",
        freshness: aligned[aligned.length - 1]?.date || "",
        dataStatus,
        overlapSummary: overlap.summary,
        scorecard,
        backtest: createBacktestResult({
          strategyId: "etf-proxy-dislocation",
          opportunityId: `etf-${left}-${right}`,
          title: `${left}/${right} ETF dislocation`,
          testPeriod: `${aligned[0].date} to ${aligned[aligned.length - 1].date}`,
          universe: `${left} vs ${right}`,
          signalDefinition: "25-day rolling ETF ratio z-score",
          entryRule: `Enter when |z| >= ${ETF_ENTRY_Z}`,
          exitRule: `Exit when |z| <= ${ETF_EXIT_Z} or after 12 trading days`,
          holdingPeriod: "Max 12 trading days",
          transactionCostAssumption: "8 bps round-trip per leg",
          slippageAssumption: "4 bps round-trip placeholder",
          grossReturn: backtestMetrics.grossReturn,
          netReturn: backtestMetrics.netReturn,
          sharpe: backtestMetrics.sharpe,
          hitRate: backtestMetrics.hitRate,
          maxDrawdown: backtestMetrics.maxDrawdown,
          turnover: backtestMetrics.turnover,
          sampleSize: backtestMetrics.trades,
          robustnessNotes: "Backtest is a relative-price monitor only; true ETF arbitrage would need intraday and NAV-aware data.",
          regimeCompatibility: diagnostics.latestZ > 0 ? "Overextended premium candidate" : "Discount mean-reversion candidate",
          implementationStatus: SCOUT_IMPLEMENTATION_STATUS.SIMULATED,
        }),
      })
    );
  });

  return { opportunities, coveredIds };
}

function evaluateEventDriven(seriesMap, portfolioContext) {
  const deals = [
    {
      id: "capri-tapestry",
      target: "CPRI",
      acquirer: "TPR",
      offerPrice: 57,
      expectedClose: "2026-06-30",
      status: "Research-only pending definitive feed",
      currentTargetPrice: lastPrice(seriesMap.CPRI) || 43.2,
    },
    {
      id: "discover-capital-one",
      target: "DFS",
      acquirer: "COF",
      offerPrice: 155,
      expectedClose: "2026-09-30",
      status: "Research-only pending regulatory updates",
      currentTargetPrice: lastPrice(seriesMap.DFS) || 141.5,
    },
  ];

  const opportunities = deals.map((deal) => {
    const spreadPct = deal.offerPrice > 0 ? ((deal.offerPrice - deal.currentTargetPrice) / deal.offerPrice) * 100 : 0;
    const overlap = derivePortfolioOverlap([deal.target, deal.acquirer], portfolioContext);
    const scorecard = buildScorecard({
      signalStrength: normalizeRange(spreadPct, 0, 18),
      historicalEfficacy: 42,
      robustness: 35,
      liquidityTradability: 68,
      costSensitivity: 34,
      regimeFit: 46,
      dataQuality: 28,
      portfolioRelevance: overlap.portfolioRelevanceScore,
      riskPenalty: 18,
    });

    return createOpportunity({
      id: `deal-${deal.id}`,
      strategyId: "event-driven-ma-watch",
      strategyName: "Event-Driven / M&A Watchlist",
      strategyFamily: "Event-Driven",
      instruments: [deal.target, deal.acquirer],
      signalState: "Research queue",
      signalValueLabel: `Deal spread ${formatSigned(spreadPct, 2)}%`,
      spreadLabel: `Offer ${formatSigned(deal.offerPrice, 2)} vs target ${formatSigned(deal.currentTargetPrice, 2)}`,
      confidenceLabel: `${Math.round(scorecard.liveOpportunityScore)}/100`,
      whyNow: "Spread remains visually meaningful, but the module is intentionally semi-manual until a corporate actions feed and legal-status parser exist.",
      riskFlag: "Deal risk / manual underwriting required",
      freshness: deal.expectedClose,
      dataStatus: SCOUT_DATA_STATUS.RESEARCH_ONLY,
      overlapSummary: overlap.summary,
      scorecard,
      backtest: null,
      metadata: {
        expectedClose: deal.expectedClose,
        status: deal.status,
      },
    });
  });

  return { opportunities, coveredIds: ["event-driven-ma-watch"] };
}

function evaluateFxTriangular(seriesMap) {
  const eurusd = seriesMap.EURUSD || [];
  const usdjpy = seriesMap.USDJPY || [];
  const eurjpy = seriesMap.EURJPY || [];
  if (!eurusd.length || !usdjpy.length || !eurjpy.length) {
    return { opportunities: [], coveredIds: [] };
  }

  const aligned = alignThreeSeries(eurusd, usdjpy, eurjpy);
  if (aligned.length < 100) {
    return { opportunities: [], coveredIds: [] };
  }

  const latest = aligned[aligned.length - 1];
  const implied = latest.a * latest.b;
  const discrepancy = ((latest.c - implied) / implied) * 10000;
  const scorecard = buildScorecard({
    signalStrength: normalizeAbs(discrepancy, 12),
    historicalEfficacy: 18,
    robustness: 22,
    liquidityTradability: 92,
    costSensitivity: 12,
    regimeFit: 20,
    dataQuality: 35,
    portfolioRelevance: 22,
    riskPenalty: 22,
  });

  return {
    coveredIds: ["fx-triangular-consistency"],
    opportunities: [
      createOpportunity({
        id: "fx-eurusd-usdjpy-eurjpy",
        strategyId: "fx-triangular-consistency",
        strategyName: "FX Cross-Rate / Triangular Consistency",
        strategyFamily: "FX Relative Value",
        instruments: ["EURUSD", "USDJPY", "EURJPY"],
        signalState: Math.abs(discrepancy) > 6 ? "Research alert" : "Muted",
        signalValueLabel: `Implied gap ${formatSigned(discrepancy, 2)} bps`,
        spreadLabel: `EURJPY actual ${formatSigned(latest.c, 4)} vs implied ${formatSigned(implied, 4)}`,
        confidenceLabel: `${Math.round(scorecard.liveOpportunityScore)}/100`,
        whyNow: "The PDF's triangular-arbitrage framing is preserved here as a consistency monitor. Execution claims are suppressed because delayed quotes turn most apparent gaps into noise.",
        riskFlag: "Latency-sensitive / execution unrealistic on delayed data",
        freshness: latest.date,
        dataStatus: SCOUT_DATA_STATUS.RESEARCH_ONLY,
        overlapSummary: "Low direct portfolio overlap. Useful as a macro consistency check rather than a deployable trade.",
        scorecard,
        backtest: null,
      }),
    ],
  };
}

function evaluateVolatilityModules(seriesMap) {
  const vix = seriesMap.VIX || [];
  const vx1 = seriesMap.VX1 || [];
  const vx2 = seriesMap.VX2 || [];
  if (!vix.length || !vx1.length || !vx2.length) {
    return { opportunities: [], coveredIds: [] };
  }

  const aligned = alignThreeSeries(vix, vx1, vx2);
  const latest = aligned[aligned.length - 1];
  const frontBasis = ((latest.b - latest.a) / latest.a) * 100;
  const slope = ((latest.c - latest.b) / latest.b) * 100;
  const scorecard = buildScorecard({
    signalStrength: normalizeAbs(frontBasis, 18),
    historicalEfficacy: 24,
    robustness: 26,
    liquidityTradability: 74,
    costSensitivity: 14,
    regimeFit: 18,
    dataQuality: 38,
    portfolioRelevance: 20,
    riskPenalty: 20,
  });

  return {
    coveredIds: ["vix-basis", "volatility-risk-premium"],
    opportunities: [
      createOpportunity({
        id: "vol-vix-basis",
        strategyId: "vix-basis",
        strategyName: "VIX Futures Basis",
        strategyFamily: "Volatility Term Structure",
        instruments: ["VIX", "VX1", "VX2"],
        signalState: Math.abs(frontBasis) > 8 ? "Research alert" : "Muted",
        signalValueLabel: `Front basis ${formatSigned(frontBasis, 2)}%`,
        spreadLabel: `Term slope ${formatSigned(slope, 2)}%`,
        confidenceLabel: `${Math.round(scorecard.liveOpportunityScore)}/100`,
        whyNow: "The PDF's VIX basis and volatility carry families are scaffolded with term-structure logic, but withheld from backtest claims until futures history is integrated.",
        riskFlag: "Tail-risk sensitive",
        freshness: latest.date,
        dataStatus: SCOUT_DATA_STATUS.RESEARCH_ONLY,
        overlapSummary: "Can hedge equity beta spikes conceptually, but current module is monitor-only.",
        scorecard,
        backtest: null,
      }),
    ],
  };
}

function buildWatchlistView(scoutState, opportunities, strategyLibrary) {
  const items = Array.isArray(scoutState?.watchlist) ? scoutState.watchlist : [];
  return items
    .map((item) => {
      const opportunity = opportunities.find((candidate) => candidate.id === item.targetId);
      const strategy = strategyLibrary.find((candidate) => candidate.id === item.targetId || candidate.id === item.strategyId);
      return {
        ...item,
        label: item.label || opportunity?.strategyName || strategy?.name || item.targetId,
        status: opportunity?.signalState || strategy?.implementationStatus || "Saved",
      };
    })
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
}

function buildScorecard({
  signalStrength,
  historicalEfficacy,
  robustness,
  liquidityTradability,
  costSensitivity,
  regimeFit,
  dataQuality,
  portfolioRelevance,
  riskPenalty,
}) {
  const backtestScore = weightedAverage([
    [historicalEfficacy, 0.36],
    [robustness, 0.24],
    [costSensitivity, 0.14],
    [liquidityTradability, 0.14],
    [dataQuality, 0.12],
  ]);
  const liveOpportunityScore = weightedAverage([
    [signalStrength, 0.28],
    [regimeFit, 0.2],
    [liquidityTradability, 0.12],
    [dataQuality, 0.12],
    [portfolioRelevance, 0.14],
    [robustness, 0.14],
  ]);
  const compositeScoutScore = Math.max(0, Math.min(100, 0.52 * backtestScore + 0.48 * liveOpportunityScore - riskPenalty));

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

function runMeanReversionBacktest({
  alignedSeries,
  entryZ,
  exitZ,
  maxHoldDays,
  transactionCostBps,
  slippageBps,
}) {
  const window = 30;
  const spreads = alignedSeries.map((point) => Math.log(point.a / point.b));
  const equityGross = [1];
  const equityNet = [1];
  const tradeReturnsNet = [];
  let position = 0;
  let daysHeld = 0;
  let tradeReturnGross = 0;
  let tradeReturnNet = 0;
  let turnover = 0;

  for (let index = window; index < alignedSeries.length - 1; index += 1) {
    const history = spreads.slice(index - window, index);
    const zScore = zScoreFromHistory(history, spreads[index]);
    const nextSpreadReturn = (alignedSeries[index + 1].a / alignedSeries[index].a - 1) - (alignedSeries[index + 1].b / alignedSeries[index].b - 1);

    if (!position) {
      if (zScore >= entryZ) {
        position = -1;
        daysHeld = 0;
        turnover += 2;
        tradeReturnGross = 0;
        tradeReturnNet = -((transactionCostBps + slippageBps) / 10000) * 2;
      } else if (zScore <= -entryZ) {
        position = 1;
        daysHeld = 0;
        turnover += 2;
        tradeReturnGross = 0;
        tradeReturnNet = -((transactionCostBps + slippageBps) / 10000) * 2;
      }
    }

    const grossDaily = position * nextSpreadReturn;
    equityGross.push(equityGross[equityGross.length - 1] * (1 + grossDaily));
    equityNet.push(equityNet[equityNet.length - 1] * (1 + grossDaily));

    if (position) {
      daysHeld += 1;
      tradeReturnGross += grossDaily;
      tradeReturnNet += grossDaily;
      const shouldExit = Math.abs(zScore) <= exitZ || daysHeld >= maxHoldDays;
      if (shouldExit) {
        turnover += 2;
        tradeReturnNet -= ((transactionCostBps + slippageBps) / 10000) * 2;
        tradeReturnsNet.push(tradeReturnNet);
        position = 0;
        daysHeld = 0;
      }
    }
  }

  return {
    grossReturn: equityGross[equityGross.length - 1] - 1,
    netReturn: tradeReturnsNet.reduce((sum, item) => sum + item, 0),
    sharpe: annualizeSharpe(tradeReturnsNet),
    hitRate: tradeReturnsNet.length ? tradeReturnsNet.filter((item) => item > 0).length / tradeReturnsNet.length : 0,
    maxDrawdown: computeMaxDrawdown(equityNet),
    turnover: alignedSeries.length ? turnover / alignedSeries.length : 0,
    trades: tradeReturnsNet.length,
  };
}

function computeSpreadDiagnostics(alignedSeries, lookback) {
  const spreads = alignedSeries.map((point) => Math.log(point.a / point.b));
  const recentSpreads = spreads.slice(-lookback);
  const latestSpread = recentSpreads[recentSpreads.length - 1];
  const latestZ = zScoreFromHistory(recentSpreads.slice(0, -1), latestSpread);
  const recentSlice = alignedSeries.slice(-90);
  const correlation = correlationOf(
    recentSlice.map((point) => pctChange(point.aPrev || point.a, point.a)),
    recentSlice.map((point) => pctChange(point.bPrev || point.b, point.b))
  );
  const halfLife = estimateHalfLife(recentSpreads);

  return {
    latestSpread,
    latestZ,
    correlation,
    halfLife,
  };
}

function derivePortfolioOverlap(instruments, portfolioContext) {
  const held = instruments.filter((ticker) => portfolioContext.holdingMap.has(ticker));
  const totalWeight = held.reduce((sum, ticker) => sum + (portfolioContext.holdingMap.get(ticker)?.weight || 0), 0);
  const hedge = held.length === 1;
  const concentration = totalWeight > 12;
  const summary = held.length
    ? `${held.join(", ")} already held. ${hedge ? "Potential hedge candidate." : concentration ? "Could add concentration." : "Mostly overlap-aware."}`
    : "No direct overlap in current holdings. Candidate is more additive than redundant.";

  return {
    summary,
    portfolioRelevanceScore: held.length ? Math.min(100, 45 + totalWeight * 2 + (hedge ? 10 : 0)) : 38,
  };
}

function deriveRiskPenalty({ correlation, maxDrawdown, halfLife }) {
  let penalty = 0;
  if (correlation < 0.55) penalty += 12;
  if (maxDrawdown > 0.18) penalty += 10;
  if (halfLife > 18) penalty += 7;
  return penalty;
}

function alignSeries(seriesA, seriesB) {
  const mapB = new Map(seriesB.map((point) => [point.date, point.price]));
  const aligned = [];
  let previousA = null;
  let previousB = null;

  seriesA.forEach((point) => {
    const priceB = mapB.get(point.date);
    if (!Number.isFinite(priceB)) return;
    aligned.push({
      date: point.date,
      a: point.price,
      b: priceB,
      aPrev: previousA,
      bPrev: previousB,
    });
    previousA = point.price;
    previousB = priceB;
  });

  return aligned;
}

function alignThreeSeries(seriesA, seriesB, seriesC) {
  const mapB = new Map(seriesB.map((point) => [point.date, point.price]));
  const mapC = new Map(seriesC.map((point) => [point.date, point.price]));
  return seriesA
    .map((point) => {
      const b = mapB.get(point.date);
      const c = mapC.get(point.date);
      return Number.isFinite(b) && Number.isFinite(c) ? { date: point.date, a: point.price, b, c } : null;
    })
    .filter(Boolean);
}

function buildDateRange(endDate, lookbackDays) {
  const end = endDate ? new Date(`${endDate}T00:00:00`) : new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - lookbackDays);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function buildMockSeriesMap(startDate, endDate, universe) {
  const dates = buildTradingDates(startDate, endDate);
  const seriesMap = {};

  const pairBlueprints = [
    ["MSFT", "AAPL", 290, 0.08, 0.026],
    ["GOOGL", "META", 180, -0.06, 0.024],
    ["KO", "PEP", 62, 0.04, 0.011],
    ["XOM", "CVX", 114, -0.05, 0.016],
    ["JPM", "BAC", 152, 0.07, 0.023],
    ["CPRI", "TPR", 48, -0.12, 0.035],
    ["DFS", "COF", 147, 0.05, 0.021],
  ];

  pairBlueprints.forEach(([left, right, anchor, shock, spreadVol], index) => {
    const { seriesA, seriesB } = buildRelativePair({
      dates,
      seed: index + 10,
      anchorPrice: anchor,
      terminalShock: shock,
      spreadVol,
    });
    seriesMap[left] = seriesA;
    seriesMap[right] = seriesB;
  });

  const etfBlueprints = [
    ["SPY", "IVV", 505, 0.018],
    ["QQQ", "VGT", 438, -0.022],
    ["XLE", "VDE", 92, 0.024],
    ["TLT", "IEF", 96, -0.028],
    ["IWM", "VTWO", 206, 0.021],
  ];

  etfBlueprints.forEach(([left, right, anchor, terminalShock], index) => {
    const { seriesA, seriesB } = buildRelativePair({
      dates,
      seed: index + 100,
      anchorPrice: anchor,
      terminalShock,
      spreadVol: 0.008,
      drift: 0.00015,
    });
    seriesMap[left] = seriesA;
    seriesMap[right] = seriesB;
  });

  seriesMap.EURUSD = buildSingleSeries(dates, 1.08, 400, 0.0025);
  seriesMap.USDJPY = buildSingleSeries(dates, 149, 410, 0.35);
  seriesMap.EURJPY = dates.map((date, index) => ({
    date,
    price:
      seriesMap.EURUSD[index].price *
      seriesMap.USDJPY[index].price *
      (1 + 0.00045 * Math.sin(index / 12) + (index > dates.length - 16 ? 0.0018 : 0)),
  }));
  seriesMap.VIX = buildSingleSeries(dates, 17.2, 500, 0.45);
  seriesMap.VX1 = dates.map((date, index) => ({ date, price: seriesMap.VIX[index].price * (1.08 + 0.03 * Math.sin(index / 21)) }));
  seriesMap.VX2 = dates.map((date, index) => ({ date, price: seriesMap.VX1[index].price * (1.04 + 0.02 * Math.cos(index / 18)) }));

  universe.pairs.flat().forEach((symbol, index) => {
    if (!seriesMap[symbol]) {
      seriesMap[symbol] = buildSingleSeries(dates, 90 + index * 7, 700 + index, 0.9);
    }
  });
  universe.etfs.flat().forEach((symbol, index) => {
    if (!seriesMap[symbol]) {
      seriesMap[symbol] = buildSingleSeries(dates, 120 + index * 9, 900 + index, 0.5);
    }
  });

  return seriesMap;
}

function buildRelativePair({ dates, seed, anchorPrice, terminalShock, spreadVol, drift = 0.0002 }) {
  const random = createRng(seed);
  let base = anchorPrice;
  let spread = 0;
  const seriesA = [];
  const seriesB = [];

  dates.forEach((date, index) => {
    const marketShock = (random() - 0.5) * 0.012 + drift + 0.004 * Math.sin(index / 24);
    const spreadShock = (random() - 0.5) * spreadVol;
    spread = spread * 0.9 + spreadShock;
    if (index > dates.length - 18) {
      spread += terminalShock / 18;
    }
    base = Math.max(5, base * (1 + marketShock));
    const leftPrice = Math.max(2, base * Math.exp(spread / 2));
    const rightPrice = Math.max(2, base * Math.exp(-spread / 2));
    seriesA.push({ date, price: leftPrice });
    seriesB.push({ date, price: rightPrice });
  });

  return { seriesA, seriesB };
}

function buildSingleSeries(dates, anchorPrice, seed, volScale) {
  const random = createRng(seed);
  let price = anchorPrice;
  return dates.map((date, index) => {
    const drift = 0.00018 * Math.sin(index / 19) + 0.00012;
    const shock = (random() - 0.5) * (volScale / 100);
    price = Math.max(0.01, price * (1 + drift + shock));
    return { date, price };
  });
}

function buildTradingDates(startDate, endDate) {
  const dates = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function createRng(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function dedupeTuples(tuples) {
  const seen = new Set();
  return tuples.filter((tuple) => {
    const key = tuple.join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function annualizeSharpe(returns) {
  if (!returns.length) return 0;
  const mean = returns.reduce((sum, item) => sum + item, 0) / returns.length;
  const variance = returns.reduce((sum, item) => sum + (item - mean) ** 2, 0) / Math.max(returns.length - 1, 1);
  const std = Math.sqrt(variance);
  return std > 0 ? (mean / std) * Math.sqrt(12) : 0;
}

function computeMaxDrawdown(equityCurve) {
  let peak = equityCurve[0] || 1;
  let maxDrawdown = 0;
  equityCurve.forEach((value) => {
    peak = Math.max(peak, value);
    maxDrawdown = Math.min(maxDrawdown, value / peak - 1);
  });
  return maxDrawdown;
}

function zScoreFromHistory(history, latest) {
  if (!history.length) return 0;
  const mean = history.reduce((sum, item) => sum + item, 0) / history.length;
  const variance = history.reduce((sum, item) => sum + (item - mean) ** 2, 0) / history.length;
  const std = Math.sqrt(variance);
  return std > 0 ? (latest - mean) / std : 0;
}

function estimateHalfLife(values) {
  if (values.length < 3) return 0;
  const lagged = values.slice(0, -1);
  const delta = values.slice(1).map((value, index) => value - lagged[index]);
  const beta = regressionSlope(lagged, delta);
  if (!Number.isFinite(beta) || beta >= 0) return 25;
  return Math.max(1, Math.min(60, -Math.log(2) / beta));
}

function regressionSlope(x, y) {
  if (x.length !== y.length || !x.length) return 0;
  const meanX = x.reduce((sum, item) => sum + item, 0) / x.length;
  const meanY = y.reduce((sum, item) => sum + item, 0) / y.length;
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < x.length; index += 1) {
    numerator += (x[index] - meanX) * (y[index] - meanY);
    denominator += (x[index] - meanX) ** 2;
  }
  return denominator ? numerator / denominator : 0;
}

function correlationOf(valuesA, valuesB) {
  if (valuesA.length !== valuesB.length || valuesA.length < 2) return 0;
  const meanA = valuesA.reduce((sum, item) => sum + item, 0) / valuesA.length;
  const meanB = valuesB.reduce((sum, item) => sum + item, 0) / valuesB.length;
  let numerator = 0;
  let varA = 0;
  let varB = 0;
  for (let index = 0; index < valuesA.length; index += 1) {
    const diffA = valuesA[index] - meanA;
    const diffB = valuesB[index] - meanB;
    numerator += diffA * diffB;
    varA += diffA ** 2;
    varB += diffB ** 2;
  }
  const denominator = Math.sqrt(varA * varB);
  return denominator ? numerator / denominator : 0;
}

function pctChange(previous, current) {
  if (!Number.isFinite(previous) || !previous) return 0;
  return current / previous - 1;
}

function weightedAverage(items) {
  const weightSum = items.reduce((sum, [, weight]) => sum + weight, 0);
  return weightSum ? items.reduce((sum, [value, weight]) => sum + value * weight, 0) / weightSum : 0;
}

function normalizeRange(value, low, high) {
  if (high === low) return 0;
  const normalized = ((value - low) / (high - low)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

function normalizeAbs(value, maxAbs) {
  return Math.max(0, Math.min(100, (Math.abs(value) / maxAbs) * 100));
}

function describeZSignal(zScore, threshold) {
  if (zScore >= threshold) return "Short rich / long cheap";
  if (zScore <= -threshold) return "Long rich reversion";
  if (Math.abs(zScore) >= threshold * 0.7) return "Watch closely";
  return "Muted";
}

function formatSigned(value, digits = 2) {
  const numeric = Number(value || 0);
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(digits)}`;
}

function lastPrice(series) {
  return series?.[series.length - 1]?.price || 0;
}
