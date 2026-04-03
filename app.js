import { createScoutEngine } from "./src/scout/engine.js";

const STORAGE_KEY = "incrementum-dashboard-state-v6";
const ACTIVE_TAB_KEY = "incrementum-dashboard-active-tab";
const runtime = window.IncrementumRuntime || null;
const stateRepository = runtime?.services?.stateRepository || null;
const uiContextService = runtime?.services?.uiContextService || null;
const shareLinkService = runtime?.services?.shareLinkService || null;
const repositoryStatus = stateRepository?.getStatus?.() || null;
const scoutEngine = createScoutEngine({
  config: runtime?.config || {},
  marketDataGateway: runtime?.services?.marketDataGateway || null,
});
const LEGACY_STORAGE_KEYS = [
  "incrementum-dashboard-state-v5",
  "incrementum-dashboard-state-v3",
  "incrementum-dashboard-state-v2",
  "incrementum-dashboard-state-v1",
];

const TRADE_TYPES = new Set(["BUY", "SELL"]);
const CAPITAL_TYPES = new Set(["DEPOSIT", "WITHDRAWAL"]);
const AMOUNT_TYPES = new Set(["DEPOSIT", "WITHDRAWAL", "DIVIDEND", "INTEREST", "FEE", "TAX", "INCOME"]);
const ALL_TRANSACTION_TYPES = ["BUY", "SELL", "DEPOSIT", "WITHDRAWAL", "DIVIDEND", "INTEREST", "FEE", "TAX", "INCOME"];

const LEGACY_SEED_SIGNATURES = new Set([
  "2026-01-05|DEPOSIT||20000|Initial funding",
  "2026-01-10|BUY|AAPL|4960|Starter position",
  "2026-02-03|BUY|MSFT|4923|",
  "2026-02-14|BUY|AAPL|2052|Added on pullback",
  "2026-03-01|BUY|GOOGL|2984.4|",
]);

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

const defaultState = {
  manual: {
    prices: {},
    transactions: [],
  },
  importedSnapshots: [],
  activeSnapshotId: null,
  lastActiveContext: {
    mode: "manual",
    snapshotId: null,
  },
  marketData: {
    benchmarkHistory: {},
    assetPriceHistory: {},
  },
  preferences: {
    primaryBenchmark: "SPX",
    sofrRate: 0.045,
    hurdleRate: 0.08,
  },
  scout: {
    watchlist: [],
    customPairs: [],
    lastViewedOpportunityId: null,
  },
};

let state = applyRuntimeContext(loadState());
const syncUiState = {
  status: "idle",
  restored: Boolean(runtime?.preloadedAppState),
  lastSavedAt: stateRepository?.getStatus?.()?.lastSavedAt || null,
  lastValuation: null,
  lastImportReport: null,
  returnTrust: null,
  scoutModel: null,
  scoutLoading: false,
  scoutError: null,
  scoutCacheKey: null,
};

const elements = {
  tabButtons: [...document.querySelectorAll(".tab-button")],
  tabPanels: [...document.querySelectorAll(".tab-panel")],
  transactionForm: document.getElementById("transaction-form"),
  transactionType: document.getElementById("transaction-type"),
  tickerInput: document.getElementById("ticker-input"),
  quantityInput: document.getElementById("quantity-input"),
  priceInput: document.getElementById("price-input"),
  fxRateInput: document.getElementById("fx-rate-input"),
  currencyInput: document.getElementById("currency-input"),
  amountInput: document.getElementById("amount-input"),
  transactionFormTip: document.getElementById("transaction-form-tip"),
  tradeFields: [...document.querySelectorAll("[data-trade-field]")],
  amountFields: [...document.querySelectorAll("[data-amount-field]")],
  transactionsBody: document.getElementById("transactions-body"),
  dashboardPositionsBody: document.getElementById("dashboard-positions-body"),
  allocationList: document.getElementById("allocation-list"),
  headerPositions: document.getElementById("header-positions"),
  headerNetInvested: document.getElementById("header-net-invested"),
  headerPortfolioValue: document.getElementById("header-portfolio-value"),
  connectionStatus: document.getElementById("connection-status"),
  lastSavedStatus: document.getElementById("last-saved-status"),
  activeContextStatus: document.getElementById("active-context-status"),
  exportExcelButton: document.getElementById("export-excel-button"),
  summaryPortfolioValue: document.getElementById("summary-portfolio-value"),
  summaryCash: document.getElementById("summary-cash"),
  summaryCashShare: document.getElementById("summary-cash-share"),
  summaryCommittedCapital: document.getElementById("summary-committed-capital"),
  summaryNetContributions: document.getElementById("summary-net-contributions"),
  summaryNetInvestedCard: document.getElementById("summary-net-invested-card"),
  summaryDeployedCapital: document.getElementById("summary-deployed-capital"),
  summaryDeployedShare: document.getElementById("summary-deployed-share"),
  summaryUnrealizedPnl: document.getElementById("summary-unrealized-pnl"),
  summaryTotalPnl: document.getElementById("summary-total-pnl"),
  summaryRealizedPnl: document.getElementById("summary-realized-pnl"),
  summaryMtmPnl: document.getElementById("summary-mtm-pnl"),
  summaryIrr: document.getElementById("summary-irr"),
  summaryTwr: document.getElementById("summary-twr"),
  summaryNetContributionReturn: document.getElementById("summary-net-contribution-return"),
  summaryYtd: document.getElementById("summary-ytd"),
  summaryItd: document.getElementById("summary-itd"),
  returnsNetInvested: document.getElementById("returns-net-invested"),
  returnsPortfolioValue: document.getElementById("returns-portfolio-value"),
  returnsRealizedPnl: document.getElementById("returns-realized-pnl"),
  returnsUnrealizedPnl: document.getElementById("returns-unrealized-pnl"),
  returnsTotalPnl: document.getElementById("returns-total-pnl"),
  returnsMtmPnl: document.getElementById("returns-mtm-pnl"),
  returnsIrr: document.getElementById("returns-irr"),
  returnsTwr: document.getElementById("returns-twr"),
  returnsNetContributionReturn: document.getElementById("returns-net-contribution-return"),
  returnsYtd: document.getElementById("returns-ytd"),
  returnsItd: document.getElementById("returns-itd"),
  benchmarkSelect: document.getElementById("benchmark-select"),
  benchmarkComparisonBody: document.getElementById("benchmark-comparison-body"),
  historyStatus: document.getElementById("history-status"),
  historyChart: document.getElementById("history-chart"),
  historyBody: document.getElementById("history-body"),
  debugConnectionStatus: document.getElementById("debug-connection-status"),
  debugLastLoadAt: document.getElementById("debug-last-load-at"),
  debugLastSaveAt: document.getElementById("debug-last-save-at"),
  debugLastRestoreAt: document.getElementById("debug-last-restore-at"),
  debugPortfolioId: document.getElementById("debug-portfolio-id"),
  debugSnapshotId: document.getElementById("debug-snapshot-id"),
  debugStateSource: document.getElementById("debug-state-source"),
  debugPersistenceError: document.getElementById("debug-persistence-error"),
  debugImportSummary: document.getElementById("debug-import-summary"),
  debugHistorySummary: document.getElementById("debug-history-summary"),
  debugReturnTrust: document.getElementById("debug-return-trust"),
  debugValuationSummary: document.getElementById("debug-valuation-summary"),
  reconciliationStatus: document.getElementById("reconciliation-status"),
  reconciliationDetails: document.getElementById("reconciliation-details"),
  reconciliationBody: document.getElementById("reconciliation-body"),
  assetPerformanceBody: document.getElementById("asset-performance-body"),
  importFileInput: document.getElementById("import-file-input"),
  attachFileButton: document.getElementById("attach-file-button"),
  importDropzone: document.getElementById("import-dropzone"),
  filePreview: document.getElementById("file-preview"),
  filePreviewName: document.getElementById("file-preview-name"),
  filePreviewSize: document.getElementById("file-preview-size"),
  removeFileButton: document.getElementById("remove-file-button"),
  importButton: document.getElementById("import-button"),
  importStatus: document.getElementById("import-status"),
  importStatusSummary: document.getElementById("import-status-summary"),
  importStatusMeta: document.getElementById("import-status-meta"),
  importStatusDetails: document.getElementById("import-status-details"),
  importStatusDetailsBody: document.getElementById("import-status-details-body"),
  statementHistoryBody: document.getElementById("statement-history-body"),
  statementModeIndicator: document.getElementById("statement-mode-indicator"),
  useManualModeButton: document.getElementById("use-manual-mode-button"),
  filterType: document.getElementById("filter-type"),
  filterTicker: document.getElementById("filter-ticker"),
  filterSearch: document.getElementById("filter-search"),
  filterDateFrom: document.getElementById("filter-date-from"),
  filterDateTo: document.getElementById("filter-date-to"),
  scoutRoot: document.getElementById("scout-root"),
};

setupTabs();
setupTransactionForm();
setupImport();
setupFilters();
setupPreferences();
setupExport();
setupScout();
renderFilterOptions();
renderApp();
triggerInitialBackendMigration();

function loadState() {
  const preloadedState = runtime?.preloadedAppState;
  if (preloadedState) {
    return normalizeState(preloadedState);
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    const legacySaved = localStorage.getItem(legacyKey);
    if (!legacySaved) continue;
    try {
      const parsed = JSON.parse(legacySaved);
      const migrated = legacyKey === "incrementum-dashboard-state-v5" ? normalizeState(parsed) : migrateLegacyState(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    } catch {
      localStorage.removeItem(legacyKey);
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
  return structuredClone(defaultState);
}

function normalizeState(rawState) {
  if (rawState?.manual || rawState?.importedSnapshots || rawState?.activeSnapshotId !== undefined) {
    const manualPrices = rawState?.manual?.prices && typeof rawState.manual.prices === "object" ? rawState.manual.prices : {};
    const manualTransactions = Array.isArray(rawState?.manual?.transactions)
      ? rawState.manual.transactions.map(normalizeTransaction).filter(Boolean)
      : [];
    const importedSnapshots = Array.isArray(rawState?.importedSnapshots)
      ? rawState.importedSnapshots.map(normalizeImportedSnapshot).filter(Boolean)
      : [];
    const restoredSnapshotId =
      importedSnapshots.some((snapshot) => snapshot.id === rawState?.lastActiveContext?.snapshotId)
        ? rawState.lastActiveContext.snapshotId
        : importedSnapshots.some((snapshot) => snapshot.id === rawState?.activeSnapshotId)
          ? rawState.activeSnapshotId
          : null;
    const marketData = normalizeMarketData(rawState?.marketData);
    const preferences = normalizePreferences(rawState?.preferences);
    const scout = normalizeScoutState(rawState?.scout);

    return {
      manual: {
        prices: stripLegacySeedPrices(manualPrices, manualTransactions),
        transactions: stripLegacySeedTransactions(manualTransactions),
      },
      importedSnapshots,
      activeSnapshotId: restoredSnapshotId || importedSnapshots[0]?.id || null,
      lastActiveContext: {
        mode: rawState?.lastActiveContext?.mode === "snapshot" && restoredSnapshotId ? "snapshot" : "manual",
        snapshotId: restoredSnapshotId || null,
      },
      marketData,
      preferences,
      scout,
    };
  }

  const prices = rawState?.prices && typeof rawState.prices === "object" ? rawState.prices : {};
  const transactions = Array.isArray(rawState?.transactions) ? rawState.transactions.map(normalizeTransaction).filter(Boolean) : [];
  const statement = normalizeStatementSnapshot(rawState?.statement);
  const cleanedTransactions = stripLegacySeedTransactions(transactions);
  const cleanedPrices = stripLegacySeedPrices(prices, cleanedTransactions);

  if (statement) {
    const importedSnapshot = createImportedSnapshot({
      fileName: rawState?.statement?.statementInfo?.sourceFileName || "Imported Statement",
      transactions: cleanedTransactions,
      prices: cleanedPrices,
      statement,
      importedAt: rawState?.statement?.statementInfo?.importedAt || new Date().toISOString(),
    });

    return {
      manual: {
        prices: {},
        transactions: [],
      },
      importedSnapshots: [importedSnapshot],
      activeSnapshotId: importedSnapshot.id,
      lastActiveContext: {
        mode: "snapshot",
        snapshotId: importedSnapshot.id,
      },
      marketData: normalizeMarketData(rawState?.marketData),
      preferences: normalizePreferences(rawState?.preferences),
      scout: normalizeScoutState(rawState?.scout),
    };
  }

  return {
    manual: {
      prices: cleanedPrices,
      transactions: cleanedTransactions,
    },
    importedSnapshots: [],
    activeSnapshotId: null,
    lastActiveContext: {
      mode: "manual",
      snapshotId: null,
    },
    marketData: normalizeMarketData(rawState?.marketData),
    preferences: normalizePreferences(rawState?.preferences),
    scout: normalizeScoutState(rawState?.scout),
  };
}

function migrateLegacyState(legacyState) {
  let transactions = [];

  if (Array.isArray(legacyState?.transactions)) {
    transactions = legacyState.transactions.map(normalizeTransaction).filter(Boolean);
  } else if (Array.isArray(legacyState?.orders)) {
    transactions = legacyState.orders
      .map((order) =>
        normalizeTransaction({
          date: order.date,
          type: order.side || "BUY",
          ticker: order.ticker,
          quantity: order.quantity,
          price: order.price,
          fxRate: order.fxRate || 1,
          currency: order.currency || "USD",
          amount: Number(order.quantity || 0) * Number(order.price || 0) * Number(order.fxRate || 1),
          notes: order.notes || "",
        })
      )
      .filter(Boolean);
  }

  return {
    manual: {
      prices: stripLegacySeedPrices(legacyState?.prices || {}, transactions),
      transactions: stripLegacySeedTransactions(transactions),
    },
    importedSnapshots: [],
    activeSnapshotId: null,
    lastActiveContext: {
      mode: "manual",
      snapshotId: null,
    },
    marketData: normalizeMarketData(),
    preferences: normalizePreferences(),
    scout: normalizeScoutState(),
  };
}

function normalizeMarketData(rawMarketData) {
  return {
    benchmarkHistory:
      rawMarketData?.benchmarkHistory && typeof rawMarketData.benchmarkHistory === "object" ? rawMarketData.benchmarkHistory : {},
    assetPriceHistory:
      rawMarketData?.assetPriceHistory && typeof rawMarketData.assetPriceHistory === "object" ? rawMarketData.assetPriceHistory : {},
  };
}

function normalizePreferences(rawPreferences) {
  return {
    primaryBenchmark: ["SPX", "SOFR", "HURDLE"].includes(rawPreferences?.primaryBenchmark) ? rawPreferences.primaryBenchmark : "SPX",
    sofrRate: Number.isFinite(Number(rawPreferences?.sofrRate)) ? Number(rawPreferences.sofrRate) : 0.045,
    hurdleRate: Number.isFinite(Number(rawPreferences?.hurdleRate)) ? Number(rawPreferences.hurdleRate) : 0.08,
  };
}

function normalizeScoutState(rawScout) {
  const watchlist = Array.isArray(rawScout?.watchlist)
    ? rawScout.watchlist
        .filter((item) => item?.targetId)
        .map((item) => ({
          id: item.id || makeId(),
          kind: item.kind || "opportunity",
          targetId: String(item.targetId),
          label: String(item.label || ""),
          createdAt: String(item.createdAt || new Date().toISOString()),
          notes: String(item.notes || ""),
        }))
    : [];
  const customPairs = Array.isArray(rawScout?.customPairs)
    ? rawScout.customPairs
        .map((pair) => ({
          left: String(pair?.left || "").trim().toUpperCase(),
          right: String(pair?.right || "").trim().toUpperCase(),
        }))
        .filter((pair) => pair.left && pair.right)
    : [];

  // Strategy Lab params — persisted per user so they survive page refresh
  const strategyLab = {
    vixParams: {
      threshold: Number(rawScout?.strategyLab?.vixParams?.threshold ?? 25),
      horizon: Number(rawScout?.strategyLab?.vixParams?.horizon ?? 20),
    },
    gsParams: {
      entryRatio: Number(rawScout?.strategyLab?.gsParams?.entryRatio ?? 75),
      exitRatio: Number(rawScout?.strategyLab?.gsParams?.exitRatio ?? 50),
      maxDays: Number(rawScout?.strategyLab?.gsParams?.maxDays ?? 180),
    },
    activeStrategy: rawScout?.strategyLab?.activeStrategy || "momentum",
    // Multi-timeframe: 5 | 20 | 60 | 120 | 250 (trading days, shown as 1Y for 250)
    activeTimeframe: Number(rawScout?.strategyLab?.activeTimeframe ?? 20),
    // Momentum backtest params
    momentumParams: {
      asset: rawScout?.strategyLab?.momentumParams?.asset || "AGQ",
      triggerPct: Number(rawScout?.strategyLab?.momentumParams?.triggerPct ?? -3),
      direction: rawScout?.strategyLab?.momentumParams?.direction || "down",
    },
  };

  return {
    watchlist,
    customPairs,
    lastViewedOpportunityId: rawScout?.lastViewedOpportunityId ? String(rawScout.lastViewedOpportunityId) : null,
    strategyLab,
  };
}

function stripLegacySeedTransactions(transactions) {
  return transactions.filter((transaction) => !LEGACY_SEED_SIGNATURES.has(buildSeedSignature(transaction)));
}

function stripLegacySeedPrices(prices, transactions) {
  if (transactions.length) return prices;
  const keys = Object.keys(prices || {});
  const onlySamplePrices = keys.length > 0 && keys.every((key) => ["AAPL", "MSFT", "GOOGL"].includes(key));
  return onlySamplePrices ? {} : prices;
}

function buildSeedSignature(transaction) {
  return [
    transaction.date,
    transaction.type,
    transaction.ticker || "",
    roundNumber(transaction.amount),
    transaction.notes || "",
  ].join("|");
}

function normalizeTransaction(rawTransaction) {
  if (!rawTransaction) return null;

  const type = String(rawTransaction.type || rawTransaction.side || "").trim().toUpperCase();
  if (!ALL_TRANSACTION_TYPES.includes(type)) return null;

  const quantity = sanitizeNumber(rawTransaction.quantity);
  const price = sanitizeNumber(rawTransaction.price);
  const fxRate = sanitizeNumber(rawTransaction.fxRate || 1) || 1;
  const amount = Math.abs(sanitizeSignedNumber(rawTransaction.amount));
  const cashImpact =
    rawTransaction.cashImpact !== undefined && rawTransaction.cashImpact !== null
      ? sanitizeSignedNumber(rawTransaction.cashImpact)
      : deriveCashImpact(type, amount, quantity, price, fxRate);

  return {
    id: rawTransaction.id || makeId(),
    date: normalizeDate(rawTransaction.date),
    type,
    ticker: String(rawTransaction.ticker || "").trim().toUpperCase(),
    quantity: roundNumber(quantity),
    price: roundNumber(price),
    fxRate: roundNumber(fxRate),
    currency: String(rawTransaction.currency || "USD").trim().toUpperCase(),
    amount: roundNumber(amount),
    cashImpact: roundNumber(cashImpact),
    notes: String(rawTransaction.notes || "").trim(),
    sourceSection: String(rawTransaction.sourceSection || "").trim(),
  };
}

function normalizeStatementSnapshot(rawStatement) {
  if (!rawStatement || typeof rawStatement !== "object") return null;

  return {
    statementInfo: rawStatement.statementInfo && typeof rawStatement.statementInfo === "object" ? rawStatement.statementInfo : {},
    fxRates: rawStatement.fxRates && typeof rawStatement.fxRates === "object" ? rawStatement.fxRates : {},
    openPositions: Array.isArray(rawStatement.openPositions) ? rawStatement.openPositions : [],
    openPositionsTotals: rawStatement.openPositionsTotals && typeof rawStatement.openPositionsTotals === "object" ? rawStatement.openPositionsTotals : {},
    netAssetValue: rawStatement.netAssetValue && typeof rawStatement.netAssetValue === "object" ? rawStatement.netAssetValue : {},
    changeInNav: rawStatement.changeInNav && typeof rawStatement.changeInNav === "object" ? rawStatement.changeInNav : {},
    performanceTotals: rawStatement.performanceTotals && typeof rawStatement.performanceTotals === "object" ? rawStatement.performanceTotals : {},
    performanceByAsset: Array.isArray(rawStatement.performanceByAsset) ? rawStatement.performanceByAsset : [],
  };
}

function normalizeImportedSnapshot(rawSnapshot) {
  if (!rawSnapshot || typeof rawSnapshot !== "object") return null;

  const transactions = Array.isArray(rawSnapshot.transactions) ? rawSnapshot.transactions.map(normalizeTransaction).filter(Boolean) : [];
  const prices = rawSnapshot.prices && typeof rawSnapshot.prices === "object" ? rawSnapshot.prices : {};
  const statement = normalizeStatementSnapshot(rawSnapshot.statement);
  const summary = rawSnapshot.summary && typeof rawSnapshot.summary === "object" ? rawSnapshot.summary : {};

  return {
    id: String(rawSnapshot.id || makeId()),
    fileName: String(rawSnapshot.fileName || "Imported Statement"),
    importedAt: String(rawSnapshot.importedAt || new Date().toISOString()),
    statementPeriodEndDate: String(rawSnapshot.statementPeriodEndDate || statement?.statementInfo?.endDate || ""),
    transactions,
    prices,
    statement,
    summary: {
      portfolioValue: roundNumber(summary.portfolioValue),
      cash: roundNumber(summary.cash),
      committedCapital: roundNumber(summary.committedCapital),
      netContributions: roundNumber(summary.netContributions ?? summary.netInvestedCapital),
      netInvestedCapital: roundNumber(summary.netInvestedCapital),
      realizedPnL: roundNumber(summary.realizedPnL),
      unrealizedPnL: roundNumber(summary.unrealizedPnL),
      totalPnL: roundNumber(summary.totalPnL),
    },
  };
}

function createImportedSnapshot({ fileName, transactions, prices, statement, importedAt }) {
  const normalizedTransactions = [...(transactions || [])].map(normalizeTransaction).filter(Boolean);
  const normalizedPrices = prices && typeof prices === "object" ? prices : {};
  const normalizedStatement = normalizeStatementSnapshot(statement);
  const analytics = calculatePortfolioAnalytics(normalizedTransactions, normalizedPrices, normalizedStatement);
  const summary = calculateSummary(normalizedTransactions, analytics, normalizedStatement);

  return {
    id: makeId(),
    fileName: String(fileName || "Imported Statement"),
    importedAt: importedAt || new Date().toISOString(),
    statementPeriodEndDate: normalizedStatement?.statementInfo?.endDate || "",
    transactions: normalizedTransactions,
    prices: normalizedPrices,
    statement: normalizedStatement,
    summary: {
      portfolioValue: roundNumber(summary.portfolioValue),
      cash: roundNumber(summary.cash),
      committedCapital: roundNumber(summary.committedCapital),
      netContributions: roundNumber(summary.netContributions),
      netInvestedCapital: roundNumber(summary.netInvestedCapital),
      realizedPnL: roundNumber(summary.realizedPnL),
      unrealizedPnL: roundNumber(summary.unrealizedPnL),
      totalPnL: roundNumber(summary.totalPnL),
    },
  };
}

function buildImportedPriceMap(statement) {
  const prices = {};
  const openPositions = Array.isArray(statement?.openPositions) ? statement.openPositions : [];
  openPositions.forEach((position) => {
    prices[position.ticker] = {
      price: roundNumber(position.currentPrice),
      currency: "USD",
      source: "statement",
    };
  });
  return prices;
}

function deriveCashImpact(type, amount, quantity, price, fxRate) {
  const tradeAmount = roundNumber(quantity * price * fxRate);
  if (type === "BUY") return -tradeAmount;
  if (type === "SELL") return tradeAmount;
  if (type === "DEPOSIT") return amount;
  if (type === "WITHDRAWAL") return -amount;
  if (type === "FEE" || type === "TAX") return -amount;
  return amount;
}

function saveState() {
  state.lastActiveContext = {
    mode: state.activeSnapshotId ? "snapshot" : "manual",
    snapshotId: state.activeSnapshotId || null,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  syncUiState.status = "syncing";
  renderSyncStatus();
  const remoteSave = stateRepository?.saveAppState?.(STORAGE_KEY, buildPersistedDomainState(state));
  if (remoteSave?.then) {
    remoteSave
      .then(() => {
        syncUiState.status = "saved";
        syncUiState.lastSavedAt = stateRepository?.getStatus?.()?.lastSavedAt || new Date().toISOString();
        renderSyncStatus();
      })
      .catch(() => {
        syncUiState.status = "failed";
        renderSyncStatus();
      });
  } else {
    syncUiState.status = "saved";
    syncUiState.lastSavedAt = new Date().toISOString();
    renderSyncStatus();
  }
}

function applyRuntimeContext(currentState) {
  const nextState = normalizeState(currentState);
  const runtimeUiContext = runtime?.preloadedUiContext || uiContextService?.getAll?.() || null;
  const routeContext = shareLinkService?.getRouteContext?.() || null;

  if (runtimeUiContext?.selectedBenchmark) {
    nextState.preferences.primaryBenchmark = runtimeUiContext.selectedBenchmark;
  }

  const requestedSnapshotId = routeContext?.snapshotId || runtimeUiContext?.activeSnapshotId || null;
  if (requestedSnapshotId && nextState.importedSnapshots.some((snapshot) => snapshot.id === requestedSnapshotId)) {
    nextState.activeSnapshotId = requestedSnapshotId;
    nextState.lastActiveContext = {
      mode: "snapshot",
      snapshotId: requestedSnapshotId,
    };
  }

  return nextState;
}

function buildPersistedDomainState(currentState) {
  return {
    manual: currentState.manual,
    importedSnapshots: currentState.importedSnapshots,
    marketData: currentState.marketData,
    preferences: {
      sofrRate: currentState.preferences?.sofrRate ?? 0.045,
      hurdleRate: currentState.preferences?.hurdleRate ?? 0.08,
    },
    scout: currentState.scout,
  };
}

function getActiveSnapshot() {
  return state.importedSnapshots.find((snapshot) => snapshot.id === state.activeSnapshotId) || null;
}

function getCurrentContext() {
  const activeSnapshot = getActiveSnapshot();
  if (activeSnapshot) {
    return {
      mode: "snapshot",
      transactions: activeSnapshot.transactions,
      prices: activeSnapshot.prices,
      statement: activeSnapshot.statement,
      snapshot: activeSnapshot,
    };
  }

  return {
    mode: "manual",
    transactions: state.manual.transactions,
    prices: state.manual.prices,
    statement: null,
    snapshot: null,
  };
}

function getLatestSnapshotId() {
  const sorted = [...state.importedSnapshots].sort((left, right) => new Date(right.importedAt) - new Date(left.importedAt));
  return sorted[0]?.id || null;
}

function setupTabs() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tabTarget));
  });

  const savedTab = uiContextService?.get?.("activeTab") || localStorage.getItem(ACTIVE_TAB_KEY);
  const validTab = elements.tabPanels.some((panel) => panel.id === savedTab) ? savedTab : "dashboard-tab";
  activateTab(validTab, false);
}

function activateTab(tabId, persist = true) {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabTarget === tabId);
  });

  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === tabId);
  });

  if (persist) {
    localStorage.setItem(ACTIVE_TAB_KEY, tabId);
    uiContextService?.set?.("activeTab", tabId);
  }
}

function setupTransactionForm() {
  elements.transactionForm.date.value = new Date().toISOString().slice(0, 10);
  elements.transactionType.addEventListener("change", syncTransactionFormMode);
  syncTransactionFormMode();

  elements.transactionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(elements.transactionForm);
    const type = String(formData.get("type")).toUpperCase();
    const ticker = String(formData.get("ticker") || "").trim().toUpperCase();
    const quantity = sanitizeNumber(formData.get("quantity"));
    const price = sanitizeNumber(formData.get("price"));
    const fxRate = sanitizeNumber(formData.get("fxRate") || 1) || 1;
    const amount = Math.abs(sanitizeSignedNumber(formData.get("amount")));

    const transaction = normalizeTransaction({
      id: makeId(),
      date: String(formData.get("date")),
      type,
      ticker,
      quantity,
      price,
      fxRate,
      currency: String(formData.get("currency") || "USD"),
      amount: TRADE_TYPES.has(type) ? quantity * price * fxRate : amount,
      notes: String(formData.get("notes") || "").trim(),
    });

    if (!isValidTransaction(transaction)) {
      alert("Please fill in the required fields for the selected transaction type.");
      return;
    }

    if (TRADE_TYPES.has(transaction.type)) {
      ensureTickerPriceEntry(transaction.ticker, transaction.currency);
    }

    state.manual.transactions = [...state.manual.transactions, transaction].sort((left, right) => left.date.localeCompare(right.date));
    saveState();
    resetTransactionForm(type);
    renderApp();
  });

  elements.transactionsBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-transaction-id]");
    if (!button) return;

    const transactionId = button.dataset.deleteTransactionId;
    state.manual.transactions = state.manual.transactions.filter((transaction) => transaction.id !== transactionId);
    saveState();
    renderApp();
  });

  elements.dashboardPositionsBody?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-price-ticker]");
    if (!input) return;

    const ticker = input.dataset.priceTicker;
    const value = sanitizeNumber(input.value);

    if (!state.manual.prices[ticker]) {
      state.manual.prices[ticker] = { price: 0, currency: "USD", source: "manual" };
    }

    state.manual.prices[ticker].price = value;
    state.manual.prices[ticker].source = "manual";
    saveState();
    renderApp();
  });

  if (elements.statementHistoryBody) {
    elements.statementHistoryBody.addEventListener("click", (event) => {
      const activateButton = event.target.closest("[data-activate-snapshot-id]");
      if (activateButton) {
        const snapshotId = activateButton.dataset.activateSnapshotId;
        if (state.importedSnapshots.some((snapshot) => snapshot.id === snapshotId)) {
          state.activeSnapshotId = snapshotId;
          uiContextService?.set?.("activeSnapshotId", snapshotId);
          saveState();
          renderApp();
        }
        return;
      }

      const deleteButton = event.target.closest("[data-delete-snapshot-id]");
      if (!deleteButton) return;

      const snapshotId = deleteButton.dataset.deleteSnapshotId;
      state.importedSnapshots = state.importedSnapshots.filter((snapshot) => snapshot.id !== snapshotId);
      if (state.activeSnapshotId === snapshotId) {
        state.activeSnapshotId = getLatestSnapshotId();
        uiContextService?.set?.("activeSnapshotId", state.activeSnapshotId);
      }
      saveState();
      renderApp();
    });
  }

  if (elements.useManualModeButton) {
    elements.useManualModeButton.addEventListener("click", () => {
      state.activeSnapshotId = null;
      uiContextService?.set?.("activeSnapshotId", null);
      saveState();
      renderApp();
    });
  }
}

function syncTransactionFormMode() {
  const type = elements.transactionType.value;
  const isTrade = TRADE_TYPES.has(type);
  const snapshotActive = Boolean(getActiveSnapshot());

  elements.tradeFields.forEach((field) => field.classList.toggle("is-hidden", !isTrade));
  elements.amountFields.forEach((field) => field.classList.toggle("is-hidden", isTrade));

  elements.tickerInput.required = isTrade;
  elements.quantityInput.required = isTrade;
  elements.priceInput.required = isTrade;
  elements.amountInput.required = !isTrade;

  if (isTrade) {
    elements.transactionFormTip.textContent = "Trade mode: ticker, quantity, and price affect holdings and cash. Amount is calculated automatically.";
  } else {
    elements.transactionFormTip.textContent = "Cash-flow mode: amount affects invested capital, cash, and returns depending on the transaction type.";
  }

  if (snapshotActive) {
    elements.transactionFormTip.textContent += " Imported snapshot mode is active, so manual entries are saved in Manual Mode and will appear when no snapshot is active.";
  }
}

function resetTransactionForm(type) {
  elements.transactionForm.reset();
  elements.transactionForm.date.value = new Date().toISOString().slice(0, 10);
  elements.transactionType.value = type || "BUY";
  elements.fxRateInput.value = "1";
  elements.currencyInput.value = "USD";
  syncTransactionFormMode();
}

function setupImport() {
  if (!elements.importFileInput || !elements.importButton) {
    console.warn("Import UI is incomplete. File import has been disabled.");
    setImportStatus("Import UI is unavailable because one or more file import elements are missing.", "error");
    return;
  }

  if (!elements.attachFileButton || !elements.importDropzone || !elements.removeFileButton) {
    console.warn("Some optional import UI elements are missing. Import will run with reduced interactions.");
    setImportStatus("Import is available, but some optional file attachment controls are missing.", "warning");
  }

  const openFilePicker = () => elements.importFileInput.click();

  if (elements.attachFileButton) {
    elements.attachFileButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openFilePicker();
    });
  }

  if (elements.importDropzone) {
    elements.importDropzone.addEventListener("click", (event) => {
      if (event.target.closest("#attach-file-button")) return;
      openFilePicker();
    });
    elements.importDropzone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFilePicker();
      }
    });

    elements.importDropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      elements.importDropzone.classList.add("is-dragover");
    });

    elements.importDropzone.addEventListener("dragleave", () => {
      elements.importDropzone.classList.remove("is-dragover");
    });

    elements.importDropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      elements.importDropzone.classList.remove("is-dragover");
      const [file] = event.dataTransfer.files;
      if (file) setSelectedFile(file);
    });
  }

  elements.importFileInput.addEventListener("change", () => {
    const [file] = elements.importFileInput.files;
    if (file) setSelectedFile(file);
    else clearSelectedFile();
  });

  if (elements.removeFileButton) {
    elements.removeFileButton.addEventListener("click", clearSelectedFile);
  }

  elements.importButton.addEventListener("click", async () => {
    const file = elements.importFileInput.files?.[0];
    if (!file) {
      setImportStatus("Attach an Interactive Brokers file first.", "warning");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "pdf" || file.type === "application/pdf") {
      setImportStatus("PDF upload is accepted, but this local frontend version still cannot parse IBKR PDFs reliably. Please use the CSV export.", "warning");
      return;
    }

    if (extension !== "csv" && file.type !== "text/csv") {
      setImportStatus("Please attach an Interactive Brokers Activity Statement CSV file.", "warning");
      return;
    }

    try {
      const text = await file.text();
      const result = importIbkrActivityCsv(text);
      if (!result.transactions.length) {
        syncUiState.lastImportReport = {
          fileName: file.name,
          acceptedRows: 0,
          rejectedRows: result.skippedRows || 0,
          source: "statement",
        };
        setImportStatus(result.message, "warning");
        renderDebugPanel();
        return;
      }

      const dedupedTransactions = dedupeTransactions(result.transactions);
      const duplicateRows = result.transactions.length - dedupedTransactions.length;
      const existingSnapshot = state.importedSnapshots.find(
        (snapshot) =>
          snapshot.fileName === file.name &&
          snapshot.statementPeriodEndDate === (result.statement?.statementInfo?.endDate || "")
      );

      if (existingSnapshot) {
        syncUiState.lastImportReport = {
          fileName: file.name,
          acceptedRows: 0,
          rejectedRows: result.skippedRows + duplicateRows + result.transactions.length,
          source: "statement",
        };
        setImportStatus("This statement file is already present in snapshot history.", "warning", [
          `Existing snapshot: ${existingSnapshot.fileName}`,
          `Statement date: ${existingSnapshot.statementPeriodEndDate || "Unknown"}`,
        ]);
        renderDebugPanel();
        return;
      }

      const importedSnapshot = createImportedSnapshot({
        fileName: file.name,
        transactions: [...dedupedTransactions].sort((left, right) => left.date.localeCompare(right.date)),
        prices: buildImportedPriceMap(result.statement),
        statement: {
          ...result.statement,
          statementInfo: {
            ...(result.statement?.statementInfo || {}),
            sourceFileName: file.name,
            importedAt: new Date().toISOString(),
          },
        },
        importedAt: new Date().toISOString(),
      });

      state.importedSnapshots = [importedSnapshot, ...state.importedSnapshots];
      state.activeSnapshotId = importedSnapshot.id;
      uiContextService?.set?.("activeSnapshotId", importedSnapshot.id);
      syncUiState.lastImportReport = {
        fileName: file.name,
        acceptedRows: dedupedTransactions.length,
        rejectedRows: result.skippedRows + duplicateRows,
        source: "statement",
        importedAt: importedSnapshot.importedAt,
      };
      saveState();
      renderApp();

      const previousSnapshot = state.importedSnapshots[1] || null;
      const sanityLines = buildImportSanityCheck(importedSnapshot, previousSnapshot);

      setImportStatus(
        "IBKR statement imported successfully.",
        sanityLines.some((line) => line.startsWith("⚠")) ? "warning" : "success",
        [
          `File: ${file.name}`,
          `Snapshot saved and set active. Manual mode data was preserved separately.`,
          `Sections detected: ${[...result.sectionsDetected].join(", ") || "None"}.`,
          `Trades: ${result.counts.trades}`,
          `Deposits: ${result.counts.deposits}`,
          `Withdrawals: ${result.counts.withdrawals}`,
          `Dividends: ${result.counts.dividends}`,
          `Interest rows: ${result.counts.interest}`,
          `Fees: ${result.counts.fees}`,
          `Taxes: ${result.counts.tax}`,
          `Accepted rows: ${dedupedTransactions.length}`,
          `Rejected rows: ${result.skippedRows + duplicateRows}`,
          `Rows skipped: ${result.skippedRows}`,
          `--- Sanity Check ---`,
          ...sanityLines,
        ],
        `${file.name} · ${result.transactions.length} transactions${importedSnapshot.statementPeriodEndDate ? ` · statement date ${importedSnapshot.statementPeriodEndDate}` : ""}`
      );
    } catch (error) {
      syncUiState.lastImportReport = {
        fileName: file?.name || "",
        acceptedRows: 0,
        rejectedRows: 0,
        source: "statement",
      };
      setImportStatus(`The file could not be imported. ${error instanceof Error ? error.message : "Unknown parsing error."}`, "error");
      renderDebugPanel();
    }
  });
}

function buildImportSanityCheck(newSnapshot, previousSnapshot) {
  const lines = [];
  const s = newSnapshot.summary;
  const p = previousSnapshot?.summary || null;

  // 1. Portfolio value vs net contributions sanity
  if (s.portfolioValue !== undefined && s.netContributions !== undefined) {
    const grossReturn = s.portfolioValue - s.netContributions;
    const returnPct = s.netContributions > 0 ? (grossReturn / s.netContributions) * 100 : null;
    if (returnPct !== null) {
      const abs = Math.abs(returnPct);
      if (abs > 150) lines.push(`⚠ P&L vs contributions looks extreme: portfolio is ${returnPct > 0 ? "+" : ""}${returnPct.toFixed(1)}% above net contributions — verify no missing deposits.`);
      else lines.push(`✓ Portfolio value vs net contributions: ${returnPct > 0 ? "+" : ""}${returnPct.toFixed(1)}% gross return implied.`);
    }
  }

  // 2. Cash + holdings vs total
  if (s.portfolioValue > 0 && s.cash !== undefined) {
    const equityValue = s.portfolioValue - s.cash;
    const cashPct = (s.cash / s.portfolioValue) * 100;
    if (cashPct > 90) lines.push(`⚠ Cash is ${cashPct.toFixed(1)}% of portfolio — portfolio may be mostly uninvested or positions failed to import.`);
    else if (cashPct < -5) lines.push(`⚠ Cash is negative (${formatCurrency(s.cash)}) — check for missing buy transactions or settlement issues.`);
    else lines.push(`✓ Cash + holdings split: ${cashPct.toFixed(1)}% cash, ${(100 - cashPct).toFixed(1)}% invested.`);
  }

  // 3. Total P&L = realized + unrealized
  if (s.realizedPnL !== undefined && s.unrealizedPnL !== undefined && s.totalPnL !== undefined) {
    const computed = s.realizedPnL + s.unrealizedPnL;
    const diff = Math.abs(computed - s.totalPnL);
    if (diff > 50) lines.push(`⚠ Total P&L (${formatCurrency(s.totalPnL)}) does not equal realized (${formatCurrency(s.realizedPnL)}) + unrealized (${formatCurrency(s.unrealizedPnL)}) — delta: ${formatCurrency(diff)}.`);
    else lines.push(`✓ P&L components consistent: realized ${formatCurrency(s.realizedPnL)} + unrealized ${formatCurrency(s.unrealizedPnL)} ≈ total ${formatCurrency(s.totalPnL)}.`);
  }

  // 4. Change vs prior snapshot
  if (p && p.portfolioValue > 0 && s.portfolioValue > 0) {
    const change = s.portfolioValue - p.portfolioValue;
    const changePct = (change / p.portfolioValue) * 100;
    if (Math.abs(changePct) > 50) lines.push(`⚠ Portfolio value changed by ${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}% vs prior snapshot (${formatCurrency(p.portfolioValue)} → ${formatCurrency(s.portfolioValue)}) — verify this is expected.`);
    else lines.push(`✓ vs prior snapshot: portfolio changed ${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}% (${formatCurrency(p.portfolioValue)} → ${formatCurrency(s.portfolioValue)}).`);
  } else if (!p) {
    lines.push(`ℹ No prior snapshot to compare against — this is the first import.`);
  }

  // 5. Net contributions direction check
  if (p && p.netContributions !== undefined && s.netContributions !== undefined) {
    const contribChange = s.netContributions - p.netContributions;
    if (contribChange < -100) lines.push(`⚠ Net contributions decreased by ${formatCurrency(Math.abs(contribChange))} vs prior snapshot — check for withdrawal or data anomaly.`);
    else if (contribChange > 0) lines.push(`✓ Net contributions increased by ${formatCurrency(contribChange)} vs prior snapshot.`);
    else lines.push(`✓ Net contributions unchanged vs prior snapshot.`);
  }

  if (!lines.length) lines.push("ℹ No sanity checks could be run — summary data may be incomplete.");
  return lines;
}

function dedupeTransactions(transactions) {
  const seen = new Set();
  return transactions.filter((transaction) => {
    const signature = [
      transaction.date,
      transaction.type,
      transaction.ticker || "-",
      transaction.quantity || 0,
      transaction.price || 0,
      transaction.amount || 0,
      transaction.cashImpact || 0,
      transaction.currency || "USD",
    ].join("|");
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function setSelectedFile(file) {
  if (!elements.importFileInput) {
    setImportStatus("The file input is missing, so the selected file could not be attached.", "error");
    return;
  }

  if (typeof DataTransfer !== "undefined") {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    elements.importFileInput.files = dataTransfer.files;
  }

  toggleClass(elements.filePreview, "is-hidden", false);
  setElementText(elements.filePreviewName, `\u{1F4CE} ${file.name}`);
  setElementText(elements.filePreviewSize, formatFileSize(file.size));
  setImportStatus("File attached and ready to import.", "neutral");
}

function clearSelectedFile() {
  if (elements.importFileInput) {
    elements.importFileInput.value = "";
  }
  toggleClass(elements.filePreview, "is-hidden", true);
  setElementText(elements.filePreviewName, "");
  setElementText(elements.filePreviewSize, "");
  setImportStatus("No file selected yet.", "neutral");
}

function setupFilters() {
  [elements.filterType, elements.filterTicker, elements.filterSearch, elements.filterDateFrom, elements.filterDateTo].forEach((element) => {
    element.addEventListener("input", renderApp);
    element.addEventListener("change", renderApp);
  });
}

function setupPreferences() {
  if (elements.benchmarkSelect) {
    elements.benchmarkSelect.value = uiContextService?.get?.("selectedBenchmark") || state.preferences.primaryBenchmark;
    elements.benchmarkSelect.addEventListener("change", () => {
      state.preferences.primaryBenchmark = elements.benchmarkSelect.value;
      uiContextService?.set?.("selectedBenchmark", elements.benchmarkSelect.value);
      saveState();
      renderApp();
    });
  }
}

function setupExport() {
  if (!elements.exportExcelButton) return;
  elements.exportExcelButton.addEventListener("click", () => {
    const context = getCurrentContext();
    const analytics = calculatePortfolioAnalytics(context.transactions, context.prices, context.statement);
    const summary = calculateSummary(context.transactions, analytics, context.statement);
    const historySeries = buildPortfolioHistorySeries(context);
    exportWorkbook({
      context,
      analytics,
      summary,
      historySeries,
      benchmarkRows: [],
    });
  });
}

function renderFilterOptions() {
  elements.filterType.innerHTML = ['<option value="">All types</option>']
    .concat(ALL_TRANSACTION_TYPES.map((type) => `<option value="${type}">${type}</option>`))
    .join("");
}

function triggerInitialBackendMigration() {
  if (!runtime?.services?.supabase || runtime?.preloadedAppState) return;
  const hasMeaningfulLocalState =
    state.manual.transactions.length > 0 ||
    state.importedSnapshots.length > 0 ||
    Object.keys(state.manual.prices || {}).length > 0;

  if (!hasMeaningfulLocalState) return;
  saveState();
}

function renderSyncStatus() {
  const status = stateRepository?.getStatus?.() || {};
  const connectionLabel = status.connectionLabel || "Using local fallback";
  const isSupabase = connectionLabel.toLowerCase().includes("supabase");
  const syncLabel =
    syncUiState.status === "syncing"
      ? "Syncing..."
      : syncUiState.status === "failed"
        ? "Save failed"
        : syncUiState.lastSavedAt
          ? `Last saved ${formatRelativeTime(syncUiState.lastSavedAt)}`
          : syncUiState.restored
            ? "Restored latest working session"
            : "Last saved: not yet";

  if (elements.connectionStatus) {
    elements.connectionStatus.textContent = connectionLabel;
    elements.connectionStatus.className = `status-pill ${isSupabase ? "status-pill--success" : "status-pill--warning"}`.trim();
  }

  if (elements.lastSavedStatus) {
    elements.lastSavedStatus.textContent = syncLabel;
    elements.lastSavedStatus.className = `status-pill ${
      syncUiState.status === "failed"
        ? "status-pill--error"
        : syncUiState.status === "syncing"
          ? "status-pill--warning"
          : "status-pill--muted"
    }`.trim();
  }

  if (elements.activeContextStatus) {
    const sourceLabel = state.activeSnapshotId
      ? `Source: Snapshot ${state.activeSnapshotId.slice(0, 8)}`
      : status.lastLoadSource === "supabase"
        ? "Source: Supabase state"
        : "Source: Manual / Local";
    elements.activeContextStatus.textContent = sourceLabel;
    elements.activeContextStatus.className = "status-pill status-pill--muted";
  }
}

function renderDebugPanel() {
  const status = stateRepository?.getStatus?.() || {};
  const valuation = syncUiState.lastValuation || {};
  const importReport = syncUiState.lastImportReport || {};
  const returnTrust = syncUiState.returnTrust || {};
  const historyDays = valuation.dailySeries?.length || 0;
  const fullyPricedDays = valuation.dailySeries?.filter((point) => point.pricingStatus === "fully-priced").length || 0;
  const estimatedDays = valuation.dailySeries?.filter((point) => point.pricingStatus === "estimated").length || 0;
  const missingDays = valuation.dailySeries?.filter((point) => point.pricingStatus === "missing").length || 0;
  setElementText(elements.debugConnectionStatus, status.connectionLabel || "Using local fallback");
  setElementText(elements.debugLastLoadAt, status.lastLoadAt ? formatDateTime(status.lastLoadAt) : "-");
  setElementText(elements.debugLastSaveAt, status.lastSavedAt ? formatDateTime(status.lastSavedAt) : "-");
  setElementText(elements.debugLastRestoreAt, status.lastLoadAt ? formatDateTime(status.lastLoadAt) : "-");
  setElementText(elements.debugPortfolioId, status.portfolioId || "Not assigned");
  setElementText(elements.debugSnapshotId, state.activeSnapshotId || "Manual mode");
  setElementText(
    elements.debugStateSource,
    status.lastLoadSource === "supabase"
      ? "Rendering from restored remote state"
      : "Rendering from local fallback"
  );
  const errorText = status.lastError || (valuation.missingPrices?.length ? `${valuation.missingPrices.length} missing price fallback(s)` : "None");
  setElementText(elements.debugPersistenceError, errorText);
  setElementText(
    elements.debugImportSummary,
    importReport.fileName
      ? `${importReport.fileName} | accepted ${importReport.acceptedRows || 0} | rejected ${importReport.rejectedRows || 0} | source ${importReport.source || "statement"}`
      : "No import report yet"
  );
  setElementText(
    elements.debugHistorySummary,
    historyDays
      ? `Valuation ${valuation.dailySeries[historyDays - 1]?.date || "-"} | positions ${valuation.positions?.length || 0} | priced ${fullyPricedDays} | estimated ${estimatedDays} | missing ${missingDays}`
      : "No NAV history yet"
  );
  setElementText(
    elements.debugReturnTrust,
    returnTrust
      ? `MTD ${returnTrust.mtd || "Unavailable"}${returnTrust.mtd !== "Trusted" && returnTrust.mtdReason ? ` (${returnTrust.mtdReason})` : ""} | YTD ${returnTrust.ytd || "Unavailable"}${returnTrust.ytd !== "Trusted" && returnTrust.ytdReason ? ` (${returnTrust.ytdReason})` : ""} | SI ${returnTrust.itd || "Unavailable"}${returnTrust.itd !== "Trusted" && returnTrust.itdReason ? ` (${returnTrust.itdReason})` : ""}`
      : "No return trust data"
  );
  setElementText(
    elements.debugValuationSummary,
    valuation.dailySeries?.length
      ? `NAV ${formatCurrency(valuation.nav)} | Cash ${formatCurrency(valuation.cashBalance)} | MV ${formatCurrency(valuation.portfolioMarketValue)} | Flows ${formatSignedCurrency(valuation.cumulativeExternalFlows || 0)} | Pricing ${valuation.pricingStatus || "missing"} | Missing prices ${valuation.missingPrices?.length || 0} | Bridge mismatches ${valuation.bridgeMismatches?.length || 0}`
      : "-"
  );
}

function renderApp() {
  const context = getCurrentContext();
  const analytics = calculatePortfolioAnalytics(context.transactions, context.prices, context.statement);
  const summary = calculateSummary(context.transactions, analytics, context.statement);
  const filteredTransactions = filterTransactions(context.transactions);

  renderSyncStatus();
  renderDebugPanel();
  renderTransactions(filteredTransactions, context.mode);
  renderPortfolioPositions(analytics.holdings);
  renderDashboard(analytics.positionsForAllocation, summary);
  renderSummaryReturns(summary, analytics.assetPerformance);
  renderStatementHistory();
  renderScout(context, analytics, summary);
  syncTransactionFormMode();
}

function renderTransactions(transactions, mode) {
  if (!transactions.length) {
    elements.transactionsBody.innerHTML = buildEmptyRow("No transactions match the current filters.", 9);
    return;
  }

  elements.transactionsBody.innerHTML = [...transactions]
    .sort((left, right) => right.date.localeCompare(left.date))
    .map((transaction) => {
      const typeClass = `type-pill--${transaction.type.toLowerCase()}`;
      return `
        <tr>
          <td>${escapeHtml(transaction.date)}</td>
          <td><span class="type-pill ${typeClass}">${escapeHtml(transaction.type)}</span></td>
          <td class="ticker-cell">${escapeHtml(transaction.ticker || "-")}</td>
          <td>${TRADE_TYPES.has(transaction.type) ? formatNumber(transaction.quantity) : "-"}</td>
          <td>${TRADE_TYPES.has(transaction.type) ? formatCurrencyWithCode(transaction.price, transaction.currency) : "-"}</td>
          <td class="${getValueClass(transaction.cashImpact)}">${formatSignedCurrencyWithCode(transaction.cashImpact, transaction.currency)}</td>
          <td>${escapeHtml(transaction.currency)}</td>
          <td>${escapeHtml(transaction.notes || "-")}</td>
          <td>${
            mode === "manual"
              ? `<button class="button button--danger button--small" data-delete-transaction-id="${transaction.id}" type="button">Delete</button>`
              : `<span class="panel-subtitle">Imported</span>`
          }</td>
        </tr>
      `;
    })
    .join("");
}

function renderPortfolioPositions(holdings) {
  if (!elements.dashboardPositionsBody) return;

  if (!holdings.length) {
    elements.dashboardPositionsBody.innerHTML = buildEmptyRow("Your portfolio is empty. Import IBKR data or add transactions manually.", 10);
    return;
  }

  elements.dashboardPositionsBody.innerHTML = holdings
    .map((holding) => {
      const priceCell =
        holding.ticker === "CASH" || holding.isStatementPrice
          ? `<span class="static-price">1.00</span>`
              .replace("1.00", formatNumber(holding.currentPrice))
          : `
            <input
              class="price-input"
              type="number"
              min="0"
              step="0.0001"
              value="${holding.currentPrice}"
              data-price-ticker="${escapeHtml(holding.ticker)}"
            />
          `;

      return `
        <tr>
          <td class="ticker-cell">
            <div class="position-name">
              <strong>${escapeHtml(getDisplayTicker(holding.ticker))}</strong>
              <span>${holding.ticker === "CASH" ? "Liquidity" : "Open position"}</span>
            </div>
          </td>
          <td class="numeric-cell">${holding.ticker === "CASH" ? "-" : formatNumber(holding.shares)}</td>
          <td class="numeric-cell">${formatCurrency(holding.averageCost)}</td>
          <td class="numeric-cell">${priceCell}</td>
          <td class="numeric-cell">${formatCurrency(holding.marketValue)}</td>
          <td class="numeric-cell">${formatCurrency(holding.totalCostBasis)}</td>
          <td class="numeric-cell">${formatPercent(holding.portfolioWeight)}</td>
          <td class="numeric-cell">${formatPercent(holding.costWeight)}</td>
          <td class="numeric-cell ${getValueClass(holding.unrealizedPnL)}">${formatCurrency(holding.unrealizedPnL)}</td>
          <td class="numeric-cell ${getValueClass(holding.returnPct)}">${formatPercent(holding.returnPct)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderStatementHistory() {
  if (elements.statementModeIndicator) {
    const activeSnapshot = getActiveSnapshot();
    elements.statementModeIndicator.textContent = activeSnapshot
      ? `Snapshot mode is active. Showing ${activeSnapshot.fileName}${activeSnapshot.statementPeriodEndDate ? ` (${activeSnapshot.statementPeriodEndDate})` : ""}.`
      : "Manual mode is active. Dashboard, Transactions, and Summary Returns are using the live manual ledger.";
  }

  if (elements.useManualModeButton) {
    elements.useManualModeButton.classList.toggle("button--primary", !state.activeSnapshotId);
    elements.useManualModeButton.classList.toggle("button--secondary", Boolean(state.activeSnapshotId));
  }

  if (!elements.statementHistoryBody) return;

  if (!state.importedSnapshots.length) {
    elements.statementHistoryBody.innerHTML = buildEmptyRow("Imported statements will appear here once you upload an IBKR CSV.", 7);
    return;
  }

  const latestSnapshotId = getLatestSnapshotId();
  elements.statementHistoryBody.innerHTML = state.importedSnapshots
    .slice()
    .sort((left, right) => new Date(right.importedAt) - new Date(left.importedAt))
    .map((snapshot) => {
      const badges = [];
      if (snapshot.id === state.activeSnapshotId) {
        badges.push('<span class="type-pill type-pill--active">Active</span>');
      }
      if (snapshot.id === latestSnapshotId) {
        badges.push('<span class="type-pill type-pill--latest">Latest</span>');
      }

      return `
        <tr class="${snapshot.id === state.activeSnapshotId ? "statement-row--active" : ""}">
          <td>
            <div class="statement-file">
              <div class="statement-file-name">${escapeHtml(snapshot.fileName)}</div>
            </div>
            <div class="table-badges">${badges.join("")}</div>
          </td>
          <td>${escapeHtml(snapshot.statementPeriodEndDate || "-")}</td>
          <td>${formatDateTime(snapshot.importedAt)}</td>
          <td class="numeric-cell">${formatCurrency(snapshot.summary.portfolioValue)}</td>
          <td class="numeric-cell">${formatCurrency(snapshot.summary.cash)}</td>
          <td class="numeric-cell">${formatCurrency(snapshot.summary.netContributions ?? snapshot.summary.netInvestedCapital)}</td>
          <td>
            <div class="table-actions">
              <button class="button ${snapshot.id === state.activeSnapshotId ? "button--secondary" : "button--primary"} button--small" data-activate-snapshot-id="${snapshot.id}" type="button">
                ${snapshot.id === state.activeSnapshotId ? "Viewing" : "View Snapshot"}
              </button>
              <button class="button button--ghost button--small" data-delete-snapshot-id="${snapshot.id}" type="button">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderDashboard(positionsForAllocation, summary) {
  setElementText(elements.headerPositions, String(summary.positionCount));
  setElementText(elements.headerNetInvested, formatCurrency(summary.netContributions));
  setElementText(elements.headerPortfolioValue, formatCurrency(summary.portfolioValue));
  setElementText(elements.summaryPortfolioValue, formatCurrency(summary.portfolioValue));
  setElementText(elements.summaryCash, formatCurrency(summary.cash));
  setElementText(elements.summaryCashShare, summary.cashShareLabel);
  setElementText(elements.summaryCommittedCapital, formatCurrency(summary.committedCapital));
  setElementText(elements.summaryNetContributions, formatCurrency(summary.netContributions));
  setElementText(elements.summaryNetInvestedCard, formatCurrency(summary.netContributions));
  setElementText(elements.summaryDeployedCapital, formatCurrency(summary.deployedCapital));
  setElementText(elements.summaryDeployedShare, summary.deployedShareLabel);
  setElementText(elements.summaryTotalPnl, formatCurrency(summary.totalPnL));
  setElementClassName(elements.summaryTotalPnl, `panel-value ${getValueClass(summary.totalPnL)}`.trim());
  setElementText(elements.summaryRealizedPnl, formatCurrency(summary.realizedPnL));
  setElementClassName(elements.summaryRealizedPnl, `panel-value ${getValueClass(summary.realizedPnL)}`.trim());
  setElementText(elements.summaryUnrealizedPnl, formatCurrency(summary.unrealizedPnL));
  setElementClassName(elements.summaryUnrealizedPnl, `panel-value ${getValueClass(summary.unrealizedPnL)}`.trim());
  setElementText(elements.summaryMtmPnl, formatCurrency(summary.markToMarketPnL));
  setElementClassName(elements.summaryMtmPnl, `panel-value ${getValueClass(summary.markToMarketPnL)}`.trim());
  setElementText(elements.summaryIrr, summary.irrLabel);
  setElementText(elements.summaryTwr, summary.twrLabel);
  setElementText(elements.summaryNetContributionReturn, summary.netContributionReturnLabel);
  setElementText(elements.summaryYtd, summary.ytdLabel);
  setElementText(elements.summaryItd, summary.itdLabel);

  if (!positionsForAllocation.length) {
    elements.allocationList.innerHTML = `<div class="empty-state">Allocation will appear once you add transactions or import your IBKR statement.</div>`;
  } else {
    elements.allocationList.innerHTML = positionsForAllocation
      .map((position) => `
        <div class="allocation-row">
          <div class="allocation-meta">
            <strong>${escapeHtml(getDisplayTicker(position.ticker))}</strong>
            <span>${formatCurrency(position.marketValue)} | ${formatPercent(position.portfolioWeight)}</span>
          </div>
          <div class="allocation-bar">
            <span style="width: ${Math.max(position.portfolioWeight, 0)}%"></span>
          </div>
        </div>
      `)
      .join("");
  }
}

function renderSummaryReturns(summary, assetPerformance) {
  elements.returnsNetInvested.textContent = formatCurrency(summary.netContributions);
  elements.returnsPortfolioValue.textContent = formatCurrency(summary.portfolioValue);
  elements.returnsRealizedPnl.textContent = formatCurrency(summary.realizedPnL);
  elements.returnsRealizedPnl.className = `panel-value ${getValueClass(summary.realizedPnL)}`;
  elements.returnsUnrealizedPnl.textContent = formatCurrency(summary.unrealizedPnL);
  elements.returnsUnrealizedPnl.className = `panel-value ${getValueClass(summary.unrealizedPnL)}`;
  elements.returnsTotalPnl.textContent = formatCurrency(summary.totalPnL);
  elements.returnsTotalPnl.className = `panel-value ${getValueClass(summary.totalPnL)}`;
  elements.returnsMtmPnl.textContent = formatCurrency(summary.markToMarketPnL);
  elements.returnsMtmPnl.className = `panel-value ${getValueClass(summary.markToMarketPnL)}`;
  elements.returnsIrr.textContent = summary.irrLabel;
  elements.returnsTwr.textContent = summary.twrLabel;
  setElementText(elements.returnsNetContributionReturn, summary.netContributionReturnLabel);
  setElementText(elements.returnsYtd, summary.ytdLabel);
  setElementText(elements.returnsItd, summary.itdLabel);

  if (elements.reconciliationStatus) {
    if (!summary.reconciliationRows.length) {
      elements.reconciliationStatus.textContent = "No reconciliation data available.";
    } else {
      const mismatchCount = summary.reconciliationRows.filter((row) => Math.abs(row.difference) >= 0.01).length;
      elements.reconciliationStatus.textContent = mismatchCount === 0 ? "All checks passed." : `${mismatchCount} mismatch detected.`;
    }
  }

  if (elements.reconciliationDetails) {
    const mismatchCount = summary.reconciliationRows.filter((row) => Math.abs(row.difference) >= 0.01).length;
    elements.reconciliationDetails.classList.toggle("is-hidden", mismatchCount === 0);
    elements.reconciliationDetails.open = false;
  }

  if (elements.reconciliationBody) {
    if (!summary.reconciliationRows.length) {
      elements.reconciliationBody.innerHTML = buildEmptyRow("Reconciliation will appear after an IBKR statement import.", 4);
    } else {
      elements.reconciliationBody.innerHTML = summary.reconciliationRows
        .map((row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td class="numeric-cell">${formatCurrency(row.appValue)}</td>
            <td class="numeric-cell">${formatCurrency(row.ibkrValue)}</td>
            <td class="numeric-cell ${getValueClass(-row.difference)}">${formatSignedCurrency(row.difference)}</td>
          </tr>
        `)
        .join("");
    }
  }

  if (!assetPerformance.length) {
    elements.assetPerformanceBody.innerHTML = buildEmptyRow("Performance by asset will appear once you have imported or entered transactions.", 6);
    return;
  }

  const totals = assetPerformance.reduce(
    (sum, asset) => ({
      realizedPnL: sum.realizedPnL + asset.realizedPnL,
      unrealizedPnL: sum.unrealizedPnL + asset.unrealizedPnL,
      totalPnL: sum.totalPnL + asset.totalPnL,
      marketValue: sum.marketValue + asset.marketValue,
    }),
    { realizedPnL: 0, unrealizedPnL: 0, totalPnL: 0, marketValue: 0 }
  );

  elements.assetPerformanceBody.innerHTML = assetPerformance
    .map((asset) => `
      <tr>
        <td class="ticker-cell">${escapeHtml(asset.ticker)}</td>
        <td class="numeric-cell ${getValueClass(asset.realizedPnL)}">${formatCurrency(asset.realizedPnL)}</td>
        <td class="numeric-cell ${getValueClass(asset.unrealizedPnL)}">${formatCurrency(asset.unrealizedPnL)}</td>
        <td class="numeric-cell ${getValueClass(asset.totalPnL)}">${formatCurrency(asset.totalPnL)}</td>
        <td class="numeric-cell">${formatCurrency(asset.marketValue)}</td>
        <td class="numeric-cell ${getValueClass(asset.returnPct)}">${formatPercent(asset.returnPct)}</td>
      </tr>
    `)
    .concat(`
      <tr class="table-total-row">
        <td>Total</td>
        <td class="numeric-cell ${getValueClass(totals.realizedPnL)}">${formatCurrency(totals.realizedPnL)}</td>
        <td class="numeric-cell ${getValueClass(totals.unrealizedPnL)}">${formatCurrency(totals.unrealizedPnL)}</td>
        <td class="numeric-cell ${getValueClass(totals.totalPnL)}">${formatCurrency(totals.totalPnL)}</td>
        <td class="numeric-cell">${formatCurrency(totals.marketValue)}</td>
        <td class="numeric-cell">-</td>
      </tr>
    `)
    .join("");
}

function setupScout() {
  if (!elements.scoutRoot) return;

  elements.scoutRoot.addEventListener("click", (event) => {
    const saveButton = event.target.closest("[data-scout-save-opportunity]");
    if (saveButton) {
      upsertScoutWatchlistItem({
        kind: "opportunity",
        targetId: saveButton.dataset.scoutSaveOpportunity,
        label: saveButton.dataset.scoutLabel || "Saved opportunity",
      });
      return;
    }

    const saveStrategyButton = event.target.closest("[data-scout-save-strategy]");
    if (saveStrategyButton) {
      upsertScoutWatchlistItem({
        kind: "strategy",
        targetId: saveStrategyButton.dataset.scoutSaveStrategy,
        label: saveStrategyButton.dataset.scoutLabel || "Saved strategy",
      });
      return;
    }

    const removeButton = event.target.closest("[data-scout-remove-watchlist-id]");
    if (removeButton) {
      state.scout.watchlist = state.scout.watchlist.filter((item) => item.id !== removeButton.dataset.scoutRemoveWatchlistId);
      invalidateScoutModel();
      saveState();
      renderApp();
      return;
    }

    // Strategy lab — switch active strategy tab
    const strategyTab = event.target.closest("[data-lab-strategy]");
    if (strategyTab) {
      state.scout.strategyLab.activeStrategy = strategyTab.dataset.labStrategy;
      saveState();
      renderApp();
      return;
    }

    // Timeframe selector
    const tfTab = event.target.closest("[data-timeframe]");
    if (tfTab) {
      state.scout.strategyLab.activeTimeframe = Number(tfTab.dataset.timeframe);
      saveState();
      // Invalidate cache and re-evaluate
      syncUiState.scoutCacheKey = null;
      renderApp();
      return;
    }

    // Momentum module — asset selector
    const momentumAssetBtn = event.target.closest("[data-momentum-asset]");
    if (momentumAssetBtn) {
      if (!state.scout.strategyLab.momentumParams) state.scout.strategyLab.momentumParams = {};
      state.scout.strategyLab.momentumParams.asset = momentumAssetBtn.dataset.momentumAsset;
      saveState();
      syncUiState.scoutCacheKey = null;
      renderApp();
      return;
    }

    // Momentum module — trigger selector
    const momentumTriggerBtn = event.target.closest("[data-momentum-trigger]");
    if (momentumTriggerBtn) {
      if (!state.scout.strategyLab.momentumParams) state.scout.strategyLab.momentumParams = {};
      state.scout.strategyLab.momentumParams.triggerPct = Number(momentumTriggerBtn.dataset.momentumTrigger);
      saveState();
      syncUiState.scoutCacheKey = null;
      renderApp();
      return;
    }

    // Momentum module — direction toggle (down / up)
    const momentumDirectionBtn = event.target.closest("[data-momentum-direction]");
    if (momentumDirectionBtn) {
      if (!state.scout.strategyLab.momentumParams) state.scout.strategyLab.momentumParams = {};
      const newDir = momentumDirectionBtn.dataset.momentumDirection;
      state.scout.strategyLab.momentumParams.direction = newDir;
      // Flip trigger sign to match direction
      const curr = state.scout.strategyLab.momentumParams.triggerPct ?? -3;
      state.scout.strategyLab.momentumParams.triggerPct = newDir === "up" ? Math.abs(curr) : -Math.abs(curr);
      saveState();
      syncUiState.scoutCacheKey = null;
      renderApp();
      return;
    }
  });

  elements.scoutRoot.addEventListener("submit", (event) => {
    // Strategy lab parameter form
    const labForm = event.target.closest("[data-lab-form]");
    if (labForm) {
      event.preventDefault();
      const strategy = labForm.dataset.labForm;
      const formData = new FormData(labForm);
      if (strategy === "vix") {
        const threshold = parseInt(formData.get("vix-threshold"), 10);
        const horizon = parseInt(formData.get("vix-horizon"), 10);
        if (Number.isFinite(threshold) && Number.isFinite(horizon)) {
          state.scout.strategyLab.vixParams.threshold = Math.max(10, Math.min(60, threshold));
          state.scout.strategyLab.vixParams.horizon = Math.max(1, Math.min(120, horizon));
          invalidateScoutModel();
          saveState();
          renderApp();
        }
      } else if (strategy === "gs") {
        const entryRatio = parseFloat(formData.get("gs-entry-ratio"));
        const exitRatio = parseFloat(formData.get("gs-exit-ratio"));
        const maxDays = parseInt(formData.get("gs-max-days"), 10);
        if (Number.isFinite(entryRatio) && Number.isFinite(exitRatio)) {
          state.scout.strategyLab.gsParams.entryRatio = Math.max(50, Math.min(120, entryRatio));
          state.scout.strategyLab.gsParams.exitRatio = Math.max(30, Math.min(90, exitRatio));
          if (Number.isFinite(maxDays)) state.scout.strategyLab.gsParams.maxDays = Math.max(30, Math.min(500, maxDays));
          invalidateScoutModel();
          saveState();
          renderApp();
        }
      }
      return;
    }

    // Custom pair form
    const pairForm = event.target.closest("#scout-custom-pair-form");
    if (pairForm) {
      event.preventDefault();
      const formData = new FormData(pairForm);
      const left = String(formData.get("left") || "").trim().toUpperCase();
      const right = String(formData.get("right") || "").trim().toUpperCase();
      if (!left || !right || left === right) return;
      const alreadyExists = state.scout.customPairs.some((pair) => pair.left === left && pair.right === right);
      if (!alreadyExists) {
        state.scout.customPairs = [...state.scout.customPairs, { left, right }];
        invalidateScoutModel();
        saveState();
      }
      pairForm.reset();
      renderApp();
      return;
    }
  });

}

function upsertScoutWatchlistItem({ kind, targetId, label }) {
  const existing = state.scout.watchlist.find((item) => item.targetId === targetId);
  if (existing) return;

  state.scout.watchlist = [
    {
      id: makeId(),
      kind,
      targetId,
      label,
      createdAt: new Date().toISOString(),
      notes: "",
    },
    ...state.scout.watchlist,
  ];
  invalidateScoutModel();
  saveState();
  renderApp();
}

function invalidateScoutModel() {
  syncUiState.scoutModel = null;
  syncUiState.scoutCacheKey = null;
}

function renderScout(context, analytics, summary) {
  if (!elements.scoutRoot) return;

  const cacheKey = buildScoutCacheKey(context, analytics);
  if (syncUiState.scoutCacheKey !== cacheKey && !syncUiState.scoutLoading) {
    void refreshScoutModel({ context, analytics, summary, cacheKey });
  }

  if (syncUiState.scoutError) {
    elements.scoutRoot.innerHTML = `
      <section class="panel scout-empty-state">
        <div class="panel-header">
          <div>
            <h2>Scout Unavailable</h2>
            <p class="panel-subtitle">${escapeHtml(syncUiState.scoutError)}</p>
          </div>
        </div>
      </section>
    `;
    return;
  }

  if (!syncUiState.scoutModel) {
    elements.scoutRoot.innerHTML = `
      <section class="panel scout-empty-state scout-loading-panel">
        <div class="panel-header">
          <div>
            <h2>Building Scout</h2>
            <p class="panel-subtitle">Fetching macro data, running regime analysis, backtesting strategies...</p>
          </div>
          <span class="status-pill status-pill--warning">Loading</span>
        </div>
        <div class="scout-loading-steps">
          <div class="scout-loading-step scout-loading-step--active">Fetching FRED macro data</div>
          <div class="scout-loading-step">Running regime classification</div>
          <div class="scout-loading-step">Backtesting VIX + Gold/Silver strategies</div>
          <div class="scout-loading-step">Generating signals</div>
        </div>
      </section>
    `;
    return;
  }

  const model = syncUiState.scoutModel;
  elements.scoutRoot.innerHTML = `
    ${renderMacroRatePanel(model)}
    ${renderStrategyLab(model)}
    ${renderTradeCards(model)}
    ${renderOpportunityRadar(model)}
  `;
  // Initialize Chart.js charts after DOM is ready
  requestAnimationFrame(() => renderScoutCharts(model));
}

// ---------------------------------------------------------------------------
// Chart.js chart initialization — called after scoutRoot innerHTML is set
// ---------------------------------------------------------------------------

// Store chart instances so we can destroy them on re-render
const _scoutCharts = {};

function destroyScoutChart(id) {
  if (_scoutCharts[id]) {
    try { _scoutCharts[id].destroy(); } catch (_) {}
    delete _scoutCharts[id];
  }
}

function renderScoutCharts(model) {
  const lab = model.strategyLab;
  if (!lab) return;
  const activeStrategy = state.scout.strategyLab?.activeStrategy || "momentum";

  if (activeStrategy === "vix") {
    renderVixChart(lab.vix, model);
  } else if (activeStrategy === "gs") {
    renderGsRatioChart(lab.goldSilver, model);
    renderGsEquityChart(lab.goldSilver);
  }
  // momentum tab uses cards, no canvas chart needed
}

function makeChartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(15,20,30,0.95)",
        borderColor: "rgba(85,194,255,0.3)",
        borderWidth: 1,
        titleColor: "#94a3b8",
        bodyColor: "#e2e8f0",
        titleFont: { size: 10 },
        bodyFont: { size: 11 },
      },
    },
    scales: {
      x: {
        ticks: { color: "#64748b", font: { size: 9 }, maxTicksLimit: 8, maxRotation: 0 },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        ticks: { color: "#64748b", font: { size: 10 } },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
    },
  };
}

function renderVixChart(result, model) {
  destroyScoutChart("vix");
  const canvas = document.getElementById("scout-vix-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const params = state.scout.strategyLab?.vixParams || {};
  const labData = model.macroResearch?.strategyLabData || {};
  const spySeries = labData.SPY || [];
  const vixSeries = labData.VIX || [];

  // Last 500 trading days
  const N = 500;
  const spy500 = spySeries.slice(-N);
  const vixByDate = new Map((vixSeries).map((p) => [p.date, p.value]));

  const labels = spy500.map((p) => p.date.slice(0, 7)); // year-month for x-axis
  const spyPrices = spy500.map((p) => p.value);
  const vixPrices = spy500.map((p) => vixByDate.get(p.date) ?? null);

  // Build entry / exit scatter points (only those in last 500D window)
  const spy500DateSet = new Set(spy500.map((p) => p.date));
  const spy500ByDate = new Map(spy500.map((p) => [p.date, p.value]));
  const trades = result?.trades || [];
  const entriesX = [], exitsX = [];
  const entriesY = [], exitsY = [];

  for (const t of trades) {
    if (spy500DateSet.has(t.entryDate)) {
      const idx = spy500.findIndex((p) => p.date === t.entryDate);
      if (idx >= 0) { entriesX.push(idx); entriesY.push(spy500[idx].value); }
    }
    if (spy500DateSet.has(t.exitDate)) {
      const idx = spy500.findIndex((p) => p.date === t.exitDate);
      if (idx >= 0) {
        const color = t.returnPct >= 0 ? "rgba(74,222,128,0.9)" : "rgba(248,113,113,0.9)";
        exitsX.push(idx); exitsY.push({ y: spy500[idx].value, color });
      }
    }
  }

  const entryScatter = entriesX.map((x, i) => ({ x, y: entriesY[i] }));
  const exitScatter = exitsX.map((x, i) => ({ x, y: exitsY[i].y }));
  const exitColors = exitsX.map((x, i) => exitsY[i].color);

  const cfg = makeChartDefaults();
  cfg.maintainAspectRatio = false;
  cfg.scales = {
    x: {
      ticks: { color: "#64748b", font: { size: 9 }, maxTicksLimit: 10, maxRotation: 0,
        callback: (val, idx) => labels[idx] || "" },
      grid: { color: "rgba(255,255,255,0.04)" },
    },
    ySpy: {
      type: "linear", position: "left",
      ticks: { color: "#55c2ff", font: { size: 9 }, callback: (v) => "$" + v.toFixed(0) },
      grid: { color: "rgba(255,255,255,0.04)" },
    },
    yVix: {
      type: "linear", position: "right",
      ticks: { color: "#fb923c", font: { size: 9 } },
      grid: { drawOnChartArea: false },
    },
  };

  _scoutCharts.vix = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "SPY",
          data: spyPrices,
          borderColor: "rgba(85,194,255,0.9)",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.2,
          yAxisID: "ySpy",
          order: 3,
        },
        {
          label: "VIX",
          data: vixPrices,
          borderColor: "rgba(251,146,60,0.7)",
          backgroundColor: "rgba(251,146,60,0.05)",
          borderWidth: 1,
          pointRadius: 0,
          tension: 0.1,
          fill: false,
          yAxisID: "yVix",
          order: 4,
        },
        {
          label: "Entry",
          data: entryScatter,
          type: "scatter",
          backgroundColor: "rgba(74,222,128,0.9)",
          borderColor: "#fff",
          borderWidth: 1,
          pointRadius: 5,
          pointStyle: "triangle",
          yAxisID: "ySpy",
          order: 1,
        },
        {
          label: "Exit",
          data: exitScatter,
          type: "scatter",
          backgroundColor: exitColors,
          borderColor: "#fff",
          borderWidth: 1,
          pointRadius: 4,
          pointStyle: "circle",
          yAxisID: "ySpy",
          order: 2,
        },
      ],
    },
    options: {
      ...cfg,
      plugins: {
        ...cfg.plugins,
        legend: {
          display: true,
          labels: { color: "#94a3b8", font: { size: 10 }, boxWidth: 12,
            filter: (item) => ["SPY", "VIX", "Entry", "Exit"].includes(item.text) },
        },
        annotation: undefined,
      },
    },
  });
}

function renderGsRatioChart(result, model) {
  destroyScoutChart("gsRatio");
  const canvas = document.getElementById("scout-gs-ratio-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const params = state.scout.strategyLab?.gsParams || {};
  const ratioHistory = result?.ratioHistory || [];
  const N = 750; // ~3 years
  const hist = ratioHistory.slice(-N);
  if (!hist.length) return;

  const labels = hist.map((p) => p.date.slice(0, 7));
  const ratios = hist.map((p) => p.value);
  const histDateSet = new Set(hist.map((p) => p.date));

  // Entry/exit markers on ratio chart
  const trades = result?.trades || [];
  const entryPoints = [], exitPoints = [];
  for (const t of trades) {
    const ei = hist.findIndex((p) => p.date === t.entryDate);
    if (ei >= 0) entryPoints.push({ x: ei, y: hist[ei].value });
    const xi = hist.findIndex((p) => p.date === t.exitDate);
    if (xi >= 0) exitPoints.push({ x: xi, y: hist[xi].value });
  }

  const cfg = makeChartDefaults();
  cfg.maintainAspectRatio = false;
  cfg.scales.x.ticks.callback = (val, idx) => labels[idx] || "";
  cfg.scales.x.ticks.maxTicksLimit = 8;
  cfg.scales.y.ticks.callback = (v) => v.toFixed(0);

  // Threshold annotation lines via plugin
  const entryLine = params.entryRatio || 75;
  const exitLine = params.exitRatio || 50;

  _scoutCharts.gsRatio = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Gold/Silver Ratio",
          data: ratios,
          borderColor: "rgba(85,194,255,0.85)",
          backgroundColor: "rgba(85,194,255,0.04)",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.2,
          fill: true,
          order: 3,
        },
        {
          label: "Entry",
          data: entryPoints,
          type: "scatter",
          backgroundColor: "rgba(74,222,128,0.9)",
          borderColor: "#fff",
          borderWidth: 1,
          pointRadius: 5,
          pointStyle: "triangle",
          order: 1,
        },
        {
          label: "Exit",
          data: exitPoints,
          type: "scatter",
          backgroundColor: "rgba(248,113,113,0.9)",
          borderColor: "#fff",
          borderWidth: 1,
          pointRadius: 4,
          pointStyle: "circle",
          order: 2,
        },
        // Entry threshold (dashed horizontal)
        {
          label: `Entry ≥ ${entryLine}`,
          data: hist.map(() => entryLine),
          borderColor: "rgba(74,222,128,0.4)",
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
          order: 5,
        },
        // Exit threshold (dashed horizontal)
        {
          label: `Exit ≤ ${exitLine}`,
          data: hist.map(() => exitLine),
          borderColor: "rgba(248,113,113,0.4)",
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
          order: 5,
        },
      ],
    },
    options: {
      ...cfg,
      plugins: {
        ...cfg.plugins,
        legend: {
          display: true,
          labels: { color: "#94a3b8", font: { size: 10 }, boxWidth: 12 },
        },
      },
    },
  });
}

function renderGsEquityChart(result) {
  destroyScoutChart("gsEquity");
  const canvas = document.getElementById("scout-gs-equity-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const eq = result?.equityCurve || [];
  if (!eq.length) return;

  const labels = eq.map((p) => p.date.slice(0, 7));
  const values = eq.map((p) => p.value);

  // Color segments: green if above 100, red if below
  const segmentColors = values.map((v) => v >= 100 ? "rgba(74,222,128,0.7)" : "rgba(248,113,113,0.7)");

  const cfg = makeChartDefaults();
  cfg.maintainAspectRatio = false;
  cfg.scales.x.ticks.maxTicksLimit = 6;
  cfg.scales.x.ticks.callback = (val, idx) => labels[idx] || "";
  cfg.scales.y.ticks.callback = (v) => "$" + v.toFixed(0);

  _scoutCharts.gsEquity = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Equity ($100 start)",
          data: values,
          borderColor: "rgba(85,194,255,0.85)",
          backgroundColor: "rgba(85,194,255,0.07)",
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: segmentColors,
          tension: 0.3,
          fill: true,
        },
        {
          label: "$100 baseline",
          data: values.map(() => 100),
          borderColor: "rgba(255,255,255,0.15)",
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      ...cfg,
      plugins: {
        ...cfg.plugins,
        legend: { display: false },
      },
    },
  });
}

function renderMomentumChart(result) {
  destroyScoutChart("momentum");
  const canvas = document.getElementById("scout-momentum-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const horizons = (result?.horizons || []).filter((h) => h.n >= 3);
  if (!horizons.length) return;

  const labels = horizons.map((h) => h.label);
  const bounceRates = horizons.map((h) => h.bounceRate ?? 0);
  const contRates = horizons.map((h) => h.contRate ?? 0);

  _scoutCharts.momentum = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Bounce %",
          data: bounceRates,
          backgroundColor: "rgba(74,222,128,0.7)",
          borderColor: "rgba(74,222,128,0.9)",
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: "Continue %",
          data: contRates,
          backgroundColor: "rgba(248,113,113,0.7)",
          borderColor: "rgba(248,113,113,0.9)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      ...makeChartDefaults(),
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: "#94a3b8", font: { size: 10 }, boxWidth: 12 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw?.toFixed(0)}%`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0 },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          min: 0,
          max: 100,
          ticks: { color: "#64748b", font: { size: 9 }, callback: (v) => v + "%" },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
      },
    },
  });
}

async function refreshScoutModel({ context, analytics, summary, cacheKey }) {
  syncUiState.scoutLoading = true;
  syncUiState.scoutError = null;

  try {
    const model = await scoutEngine.evaluate({
      context,
      analytics,
      scoutState: state.scout,
      valuationDate: getActiveValuationDate(context.transactions, context.statement),
      summary,
    });
    syncUiState.scoutModel = model;
    syncUiState.scoutCacheKey = cacheKey;
  } catch (error) {
    syncUiState.scoutError = error?.message || "Scout failed to load.";
  } finally {
    syncUiState.scoutLoading = false;
    renderScout(context, analytics, summary);
  }
}

function buildScoutCacheKey(context, analytics) {
  const latestTransaction = [...(context.transactions || [])].sort((left, right) => right.date.localeCompare(left.date))[0];
  const holdingsKey = (analytics.openHoldings || [])
    .map((holding) => `${holding.ticker}:${roundNumber(holding.marketValue)}`)
    .join("|");
  const labKey = JSON.stringify(state.scout.strategyLab);
  const tf = state.scout.strategyLab?.activeTimeframe ?? 20;
  return [context.mode, latestTransaction?.date || "-", context.transactions?.length || 0, holdingsKey, state.scout.customPairs.length, labKey, tf].join("::");
}

// ── SCOUT v3 rendering ──────────────────────────────────────────────────────

// ---------------------------------------------------------------------------
// MOMENTUM MATRIX — top of page, 5 assets, always visible
// ---------------------------------------------------------------------------

function computeMomentumRow(sym, series) {
  const N = series.length;
  if (N < 22) return { sym, daily: "—", dailyCls: "mm-neutral", today: "—", todayCls: "mm-neutral", todayPct: null, alignment: "—", alignCls: "mm-neutral", implication: "Insufficient data" };

  const latest = series[N - 1].value;
  const prev   = series[N - 2]?.value;
  const p5     = series[N - 6]?.value;
  const p20    = series[N - 21]?.value;

  const r5  = p5  ? (latest / p5  - 1) * 100 : null;
  const r20 = p20 ? (latest / p20 - 1) * 100 : null;

  // Daily momentum: needs both r5 and r20 to agree
  let daily, dailyCls;
  if ((r5 ?? 0) > 1.5 && (r20 ?? 0) > 0)   { daily = "Bullish"; dailyCls = "mm-bull"; }
  else if ((r5 ?? 0) < -1.5 && (r20 ?? 0) < 0) { daily = "Bearish"; dailyCls = "mm-bear"; }
  else                                          { daily = "Neutral"; dailyCls = "mm-neutral"; }

  // "Today" = last close vs prior close as % move
  const todayPct = prev ? (latest / prev - 1) * 100 : null;
  // Average absolute daily move over last 20 days (volatility proxy)
  let avgMove = 0;
  for (let i = N - 20; i < N; i++) {
    if (series[i] && series[i - 1]) avgMove += Math.abs(series[i].value / series[i - 1].value - 1) * 100;
  }
  avgMove /= 20;
  const moveThreshold = Math.max(avgMove * 0.5, 0.5); // at least 0.5%

  let today, todayCls;
  if (todayPct === null) { today = "—"; todayCls = "mm-neutral"; }
  else if (todayPct > moveThreshold)  { today = `+${todayPct.toFixed(1)}%`; todayCls = "mm-bull"; }
  else if (todayPct < -moveThreshold) { today = `${todayPct.toFixed(1)}%`;  todayCls = "mm-bear"; }
  else { today = `${todayPct >= 0 ? "+" : ""}${todayPct.toFixed(1)}%`; todayCls = "mm-neutral"; }

  // Alignment: do daily and today agree?
  const dBull = dailyCls === "mm-bull", dBear = dailyCls === "mm-bear";
  const tBull = todayCls === "mm-bull", tBear = todayCls === "mm-bear";

  let alignment, alignCls, implication;
  if (dBull && tBull)        { alignment = "Strong ▲"; alignCls = "mm-bull";    implication = "Momentum confirms long"; }
  else if (dBear && tBear)   { alignment = "Strong ▼"; alignCls = "mm-bear";    implication = "Avoid — downtrend confirmed"; }
  else if ((dBull && tBear) || (dBear && tBull)) {
                               alignment = "Conflicted"; alignCls = "mm-neutral"; implication = "Daily/intraday conflict — wait"; }
  else if (dBull)             { alignment = "Weak ▲"; alignCls = "mm-neutral"; implication = "Trending up, no intraday push"; }
  else if (dBear)             { alignment = "Weak ▼"; alignCls = "mm-neutral"; implication = "Trending down, no intraday push"; }
  else                        { alignment = "Flat"; alignCls = "mm-neutral";    implication = "No signal — stand aside"; }

  return { sym, daily, dailyCls, today, todayCls, todayPct, alignment, alignCls, implication, r5, r20 };
}

function renderMomentumMatrix(model) {
  const labData = model.macroResearch?.strategyLabData || {};
  const ASSETS = [
    { sym: "AGQ",  label: "AGQ — 2× Silver" },
    { sym: "SLV",  label: "SLV — Silver" },
    { sym: "GLD",  label: "GLD — Gold" },
    { sym: "RING", label: "RING — Gold Miners" },
    { sym: "GDX",  label: "GDX — Gold Miners ETF" },
  ];

  const mmToVcell = (cls) => cls === "mm-bull" ? "vcell vcell-no" : cls === "mm-bear" ? "vcell vcell-go" : "vcell vcell-gray";

  const rowData = ASSETS.map(({ sym, label }) => {
    const series = labData[sym] || [];
    return { sym, label, row: computeMomentumRow(sym, series), noData: series.length < 22 };
  });

  const bullCount = rowData.filter((r) => r.row.dailyCls === "mm-bull").length;
  const bearCount = rowData.filter((r) => r.row.dailyCls === "mm-bear").length;
  let verdictCls, verdictText;
  if (bullCount > bearCount + 1)    { verdictCls = "verdict-no";    verdictText = `${bullCount}/5 assets bullish — silver complex trending up`; }
  else if (bearCount > bullCount + 1) { verdictCls = "verdict-go";  verdictText = `${bearCount}/5 assets bearish — silver complex under pressure`; }
  else                               { verdictCls = "verdict-mixed"; verdictText = `Mixed signals (${bullCount} bullish, ${bearCount} bearish) — wait for alignment`; }

  const rows = rowData.map(({ sym, label, row, noData }) => {
    const dailyCls = noData ? "vcell vcell-gray" : mmToVcell(row.dailyCls);
    const todayCls = noData ? "vcell vcell-gray" : mmToVcell(row.todayCls);
    const alignCls = noData ? "vcell vcell-gray" : mmToVcell(row.alignCls);
    return `
      <tr>
        <td class="left"><div class="row-label">${escapeHtml(sym)}</div><div class="row-sub">${escapeHtml(label.split("—")[1]?.trim() || "")}</div></td>
        <td>
          <span class="${dailyCls}">${escapeHtml(row.daily)}</span>
          ${!noData && row.r5 !== null ? `<span class="sub-nums">${row.r5 >= 0 ? "+" : ""}${row.r5.toFixed(1)}% 5D / ${row.r20 >= 0 ? "+" : ""}${row.r20.toFixed(1)}% 20D</span>` : ""}
        </td>
        <td><span class="${todayCls}">${escapeHtml(row.today)}</span></td>
        <td><span class="${alignCls}">${escapeHtml(row.alignment)}</span></td>
        <td class="left"><span class="impl">${escapeHtml(row.implication)}</span></td>
      </tr>
    `;
  }).join("");

  const freshness = model.macroResearch?.freshnessLabel || "Simulated data";
  return `
    <div class="sq">
      <div class="sq-section">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px">
          <div>
            <div class="sq-lbl">Live Signal Matrix</div>
            <div class="sq-h2">Momentum Matrix</div>
            <div class="sq-desc sq-t3">Daily = 5D+20D trend alignment. Today = last close vs prior close vs avg daily range. ${escapeHtml(freshness)}</div>
          </div>
          <span class="badge badge-gray">${escapeHtml(model.dataStatus || "")}</span>
        </div>
        <div class="sq-tw">
          <table>
            <thead>
              <tr>
                <th class="left">Asset</th>
                <th class="left">Daily Momentum</th>
                <th class="left">Today's Move</th>
                <th class="left">Alignment</th>
                <th class="left">Implication</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="verdict-bar ${verdictCls}" style="margin-top:12px">${escapeHtml(verdictText)}</div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// TRADE CARDS — 3 strategies, one card each
// ---------------------------------------------------------------------------

function renderTradeCards(model) {
  const labData   = model.macroResearch?.strategyLabData || {};
  const gsResult  = model.strategyLab?.goldSilver;
  const vixResult = model.strategyLab?.vix;
  const gsParams  = state.scout.strategyLab?.gsParams  || { entryRatio: 75, exitRatio: 50, maxDays: 180 };
  const vixParams = state.scout.strategyLab?.vixParams || { threshold: 25, horizon: 20 };

  // ── Card A: Gold/Silver Mean Reversion ──────────────────────────────────
  const ratioHistory = gsResult?.ratioHistory || [];
  const latestRatio  = ratioHistory.length ? ratioHistory[ratioHistory.length - 1]?.value : null;
  const gsActive    = latestRatio !== null && latestRatio >= 75;
  const gsWatchlist = latestRatio !== null && !gsActive && latestRatio >= 65;
  const gsDistPts   = latestRatio !== null ? (75 - latestRatio) : null;

  const slvRow = computeMomentumRow("SLV", labData.SLV || []);
  const agqRow = computeMomentumRow("AGQ", labData.AGQ || []);
  const gsConfirms = "Silver momentum turning up (SLV/AGQ daily momentum bullish or neutral)";
  const gsInvalidates = "Ratio reverses back above entry while still in trade; silver momentum goes bearish";

  const gsWhyNow = latestRatio !== null
    ? (gsActive
        ? `Ratio at ${latestRatio.toFixed(1)} — silver is historically cheap vs gold. Mean reversion potential is high.`
        : gsWatchlist
          ? `Ratio at ${latestRatio.toFixed(1)}, approaching 75 trigger. Getting close — monitor.`
          : `Ratio at ${latestRatio.toFixed(1)}, well below 75 trigger. Not in setup zone.`)
    : "Ratio data not available.";

  const gsPerf = (gsResult?.tradeCount >= 5 && gsResult?.avgReturn > 0) ? {
    winRate: gsResult.winRate, avgReturn: gsResult.avgReturn,
    maxDrawdown: gsResult.maxDrawdown, trades: gsResult.tradeCount,
  } : null;

  const cardA = renderOneTradeCard({
    name: "Gold/Silver Mean Reversion",
    vehicle: "Long SIL or AGQ (silver miners / 2× silver)",
    type: "Mean Reversion — Relative Value",
    active: gsActive, watchlist: gsWatchlist,
    direction: (gsActive || gsWatchlist) ? "LONG SILVER" : null,
    whyNow: gsWhyNow,
    entryRule: "Gold/Silver ratio (GLD×10 / SLV) closes ≥ 75 — silver historically cheap vs gold",
    exitRule: "Ratio ≤ 50, OR silver momentum turns bearish, OR 180 calendar days elapsed",
    confirms: gsConfirms,
    invalidates: gsInvalidates,
    currentLabel: "G/S Ratio now",
    currentValue: latestRatio !== null ? latestRatio.toFixed(1) : "—",
    distanceLabel: latestRatio !== null
      ? (gsActive ? "AT TRIGGER ✓" : `${Math.abs(gsDistPts).toFixed(1)} pts below entry (need 75)`)
      : "—",
    distanceActive: gsActive,
    momConfirm: slvRow.dailyCls !== "mm-bear",
    momLabel: `SLV momentum: ${slvRow.daily} | AGQ: ${agqRow.daily}`,
    perf: gsPerf, labTab: "gs",
  });

  // ── Card B: VIX Spike Entry ──────────────────────────────────────────────
  const vixSeries  = labData.VIX || [];
  const latestVix  = vixSeries.length ? vixSeries[vixSeries.length - 1]?.value : null;
  const vixActive  = latestVix !== null && latestVix >= 30;
  const vixWatch   = latestVix !== null && !vixActive && latestVix >= 22;
  const vixDist    = latestVix !== null ? (30 - latestVix) : null;

  const vixPerf = (vixResult?.tradeCount >= 5 && vixResult?.avgReturn > 0) ? {
    winRate: vixResult.winRate, avgReturn: vixResult.avgReturn,
    maxDrawdown: vixResult.maxDrawdown, trades: vixResult.tradeCount,
    note: `Backtest uses VIX≥${vixParams.threshold} threshold`,
  } : null;

  const vixWhyNow = latestVix !== null
    ? (vixActive
        ? `VIX at ${latestVix.toFixed(1)} — extreme fear zone. Historically, equity returns over the next 5–20D have been above average after this level.`
        : vixWatch
          ? `VIX at ${latestVix.toFixed(1)}, elevated but not extreme. Watch for further spike to ≥30.`
          : `VIX at ${latestVix.toFixed(1)}, below alert level. Not in setup zone.`)
    : "VIX data not available.";

  const cardB = renderOneTradeCard({
    name: "VIX Spike Entry",
    vehicle: "Long SPY (fade fear, equities)",
    type: "Contrarian — Mean Reversion on Fear",
    active: vixActive, watchlist: vixWatch,
    direction: (vixActive || vixWatch) ? "LONG SPY" : null,
    whyNow: vixWhyNow,
    entryRule: "VIX closes ≥ 30 — implied vol spike signals extreme fear",
    exitRule: "VIX drops below 20 (fear normalized), OR fixed holding period expires",
    confirms: "VIX is spiking from below (3+ consecutive up days). SPY is at or near support.",
    invalidates: "VIX continues rising above 40 without reversal (structural break, not mean reversion). SPY breaks key support.",
    currentLabel: "VIX now",
    currentValue: latestVix !== null ? latestVix.toFixed(1) : "—",
    distanceLabel: latestVix !== null
      ? (vixActive ? "AT TRIGGER ✓" : `${Math.abs(vixDist).toFixed(1)} pts below trigger (need 30)`)
      : "—",
    distanceActive: vixActive,
    momConfirm: null, momLabel: null,
    perf: vixPerf, labTab: "vix",
  });

  // ── Card C: AGQ Momentum Bounce ──────────────────────────────────────────
  const agqSeries   = labData.AGQ || [];
  const agqLatest   = agqSeries.length ? agqSeries[agqSeries.length - 1]?.value : null;
  const agqPrev     = agqSeries.length > 1 ? agqSeries[agqSeries.length - 2]?.value : null;
  const agqTodayPct = (agqLatest && agqPrev) ? (agqLatest / agqPrev - 1) * 100 : null;
  const agqBounceActive = agqTodayPct !== null && agqTodayPct <= -3;
  const agqBounceWatch  = agqTodayPct !== null && !agqBounceActive && agqTodayPct <= -1.5;

  let agqRsi = null;
  if (agqSeries.length >= 15) {
    let g = 0, l = 0;
    for (let i = agqSeries.length - 14; i < agqSeries.length; i++) {
      const d = agqSeries[i].value - agqSeries[i - 1]?.value;
      if (d > 0) g += d; else l -= d;
    }
    const rs = l === 0 ? 100 : g / l;
    agqRsi = Math.round(100 - 100 / (1 + rs));
  }
  const agqOversold = agqRsi !== null && agqRsi < 40;

  const momResult  = model.strategyLab?.momentumResult;
  const momParams  = state.scout.strategyLab?.momentumParams || {};
  const agqMomData = momResult?.direction === "down" && momParams.asset === "AGQ" ? momResult : null;
  const agqH1 = agqMomData?.horizons?.find((h) => h.horizon === 1);
  const agqPerf = (agqH1 && agqH1.n >= 5 && (agqH1.bounceRate || 0) >= 50) ? {
    winRate: agqH1.bounceRate, avgReturn: agqH1.avgReturn,
    maxDrawdown: agqH1.minReturn, trades: agqH1.n,
    note: `1D bounce rate after ≥${Math.abs(momParams.triggerPct ?? 3)}% drop`,
  } : null;

  const agqWhyNow = agqTodayPct !== null
    ? (agqBounceActive
        ? `AGQ down ${agqTodayPct.toFixed(1)}% today — at trigger level. 2× leverage amplifies any silver bounce.`
        : agqBounceWatch
          ? `AGQ down ${agqTodayPct.toFixed(1)}% today — approaching trigger zone (≥−3%). Watch for continuation.`
          : `AGQ ${agqTodayPct >= 0 ? "+" : ""}${agqTodayPct.toFixed(1)}% today — not in bounce setup.`)
    : "AGQ price data not available.";

  const cardC = renderOneTradeCard({
    name: "AGQ Daily Drop Bounce",
    vehicle: "Long AGQ (2× silver) — intraday mean reversion only",
    type: "Short-Term Reversal — NOT directional, NOT overnight",
    active: agqBounceActive, watchlist: agqBounceWatch,
    direction: agqBounceActive ? "LONG AGQ (intraday)" : null,
    whyNow: agqWhyNow,
    entryRule: "AGQ closes ≥ 3% below prior close — oversold intraday mean reversion",
    exitRule: "+2% gain target, OR end of same trading day — no overnight holding",
    confirms: `RSI-14 < 40 (oversold). SLV also down significantly. Silver showing broad weakness.`,
    invalidates: "AGQ continues declining after entry (no bounce). Broader silver trend is down for multiple days.",
    currentLabel: "AGQ today",
    currentValue: agqTodayPct !== null ? `${agqTodayPct >= 0 ? "+" : ""}${agqTodayPct.toFixed(1)}%` : "—",
    distanceLabel: agqTodayPct !== null
      ? (agqBounceActive ? "AT TRIGGER ✓" : agqTodayPct < 0 ? `${(3 - Math.abs(agqTodayPct)).toFixed(1)}% more drop needed` : "Not in drop zone")
      : "—",
    distanceActive: agqBounceActive,
    momConfirm: agqOversold,
    momLabel: agqRsi !== null ? `RSI-14: ${agqRsi}${agqOversold ? " — oversold ✓" : ""}` : null,
    perf: agqPerf, labTab: "momentum",
  });

  return `
    <div class="sq">
      <div class="sq-section">
        <div class="sq-lbl">Signal Summary</div>
        <div class="sq-h2" style="margin-bottom:4px">Current Setups</div>
        <div class="sq-desc sq-t3" style="margin-bottom:16px">Is there an actionable trade right now? Each card shows one setup and its current status.<br><strong>ACTIVE</strong> = entry condition is met today. <strong>WATCHLIST</strong> = getting close, monitor. <strong>NO TRADE</strong> = not in setup zone yet.</div>
        <div class="sq-cards">${cardA}${cardB}${cardC}</div>
      </div>
    </div>
  `;
}

function renderOneTradeCard({ name, vehicle, type, active, watchlist, direction, whyNow, entryRule, exitRule, invalidates, confirms, currentLabel, currentValue, distanceLabel, distanceActive, momConfirm, momLabel, perf, labTab }) {
  const fmtPct = (v) => v !== null && v !== undefined ? `${v >= 0 ? "+" : ""}${Number(v).toFixed(1)}%` : "—";

  let statusPillCls, statusLabel;
  if (active)          { statusPillCls = "pill pill-bounce";   statusLabel = "ACTIVE TRADE"; }
  else if (watchlist)  { statusPillCls = "pill pill-neutral";  statusLabel = "WATCHLIST"; }
  else                 { statusPillCls = "pill pill-gray";     statusLabel = "NO TRADE"; }

  const perfBlock = perf ? `
    <hr class="sq-hr">
    <div class="sq-lbl" style="margin-bottom:6px;font-size:9px">Historical Edge</div>
    <div class="sq-perf">
      <div class="sq-perf-item">
        <span class="sq-perf-lbl">Win Rate</span>
        <span class="sq-perf-val ${perf.winRate >= 50 ? "sq-perf-val-g" : "sq-perf-val-r"}">${Number(perf.winRate).toFixed(0)}%</span>
      </div>
      <div class="sq-perf-item">
        <span class="sq-perf-lbl">Avg Return</span>
        <span class="sq-perf-val ${perf.avgReturn >= 0 ? "sq-perf-val-g" : "sq-perf-val-r"}">${fmtPct(perf.avgReturn)}</span>
      </div>
      <div class="sq-perf-item">
        <span class="sq-perf-lbl">Max DD</span>
        <span class="sq-perf-val sq-perf-val-r">${fmtPct(perf.maxDrawdown)}</span>
      </div>
      <div class="sq-perf-item">
        <span class="sq-perf-lbl">Trades</span>
        <span class="sq-perf-val">${perf.trades}</span>
      </div>
    </div>
    ${perf.note ? `<div class="sq-t3" style="font-size:11px;margin-top:4px">${escapeHtml(perf.note)}</div>` : ""}
  ` : `<hr class="sq-hr"><div class="sq-perf-pending">Backtest: see Strategy Lab</div>`;

  const momBlock = momLabel !== null ? `
    <div class="sq-row">
      <span class="sq-row-k">Momentum</span>
      <span class="sq-row-v ${momConfirm === true ? "sq-row-v-mom-yes" : momConfirm === false ? "sq-row-v-mom-no" : ""}">
        ${momConfirm === true ? "✓ " : momConfirm === false ? "✗ " : ""}${escapeHtml(momLabel)}
      </span>
    </div>
  ` : "";

  return `
    <div class="sq-card">
      <div class="sq-card-head">
        <div class="sq-card-type">${escapeHtml(type)}</div>
        <div class="sq-card-name">${escapeHtml(name)}</div>
        <span class="${statusPillCls}">${statusLabel}</span>
        ${(active || watchlist) && direction ? `<div class="sq-direction">${escapeHtml(direction)}</div>` : ""}
      </div>
      <div class="sq-card-body">
        ${whyNow ? `<div class="finding" style="margin-bottom:10px;border-left-color:${active ? "var(--sq-green)" : watchlist ? "var(--sq-amber)" : "var(--sq-border2)"}">${escapeHtml(whyNow)}</div>` : ""}
        <div class="sq-row"><span class="sq-row-k">Vehicle</span><span class="sq-row-v">${escapeHtml(vehicle)}</span></div>
        <div class="sq-row"><span class="sq-row-k">Entry trigger</span><span class="sq-row-v">${escapeHtml(entryRule)}</span></div>
        <div class="sq-row"><span class="sq-row-k">Exit rule</span><span class="sq-row-v">${escapeHtml(exitRule)}</span></div>
        ${confirms ? `<div class="sq-row"><span class="sq-row-k" style="color:var(--sq-green)">Confirms</span><span class="sq-row-v">${escapeHtml(confirms)}</span></div>` : ""}
        ${invalidates ? `<div class="sq-row"><span class="sq-row-k" style="color:var(--sq-red)">Invalidates</span><span class="sq-row-v">${escapeHtml(invalidates)}</span></div>` : ""}
        <hr class="sq-hr">
        <div class="sq-row">
          <span class="sq-row-k">${escapeHtml(currentLabel)}</span>
          <span class="sq-row-v sq-row-v-live">${escapeHtml(currentValue)}</span>
        </div>
        <div class="sq-row">
          <span class="sq-row-k">Distance to trigger</span>
          <span class="sq-row-v ${distanceActive ? "sq-row-v-trigger" : ""}">${escapeHtml(distanceLabel)}</span>
        </div>
        ${momBlock}
        ${perfBlock}
        ${labTab ? `<div style="margin-top:8px"><a href="#" onclick="event.preventDefault();document.querySelector('[data-lab-strategy=\\'${escapeHtml(labTab)}\\']')?.click()" style="font-size:11px;color:var(--sq-blue)">→ Full backtest in Strategy Lab</a></div>` : ""}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// MACRO RATE PANEL — rates with plain-English interpretation
// ---------------------------------------------------------------------------

function macroInterpretation(code, value, change20, percentile) {
  // Returns { text, cls } where cls is "macro-tile--bull" | "macro-tile--bear" | "macro-tile--neutral"
  if (code === "DFII10") {
    // 10Y Real Yield
    if (value > 1.5)  return { text: "Positive real rates — headwind for gold/silver", cls: "macro-tile--bear" };
    if (value > 0)    return { text: "Mildly positive real rates — slight headwind for metals", cls: "macro-tile--neutral" };
    return { text: "Negative real rates — tailwind for gold/silver", cls: "macro-tile--bull" };
  }
  if (code === "T10YIE") {
    // 10Y Breakeven Inflation
    if (value > 2.5)  return { text: "Inflation expectations elevated — tailwind for metals", cls: "macro-tile--bull" };
    if (value >= 2.0) return { text: "Inflation near target — neutral for metals", cls: "macro-tile--neutral" };
    return { text: "Deflation risk — headwind for metals and commodities", cls: "macro-tile--bear" };
  }
  if (code === "T10Y2Y") {
    // 10s2s Yield Curve (in bp)
    if (value > 50)    return { text: "Curve steepening — watch for reflation, bullish metals", cls: "macro-tile--bull" };
    if (value > -10)   return { text: "Flat curve — neutral, no strong regime signal", cls: "macro-tile--neutral" };
    return { text: "Inverted curve — recession risk, headwind for risk assets", cls: "macro-tile--bear" };
  }
  if (code === "T5YIFR") {
    // 5Y5Y Forward Inflation
    if (value > 2.5)  return { text: "Long-term inflation elevated — structurally bullish metals", cls: "macro-tile--bull" };
    if (value >= 2.0) return { text: "Long-term inflation anchored — neutral", cls: "macro-tile--neutral" };
    return { text: "Low long-term inflation expectations — headwind for metals", cls: "macro-tile--bear" };
  }
  if (code === "DGS10") {
    // 10Y Nominal Yield
    if (value > 4.5)   return { text: "Yields elevated — high cost of capital, headwind for growth assets", cls: "macro-tile--bear" };
    if (value >= 3.5)  return { text: "Yields moderate — financial conditions neutral", cls: "macro-tile--neutral" };
    return { text: "Low yields — easy financial conditions, tailwind for risk", cls: "macro-tile--bull" };
  }
  if (code === "DXY" || code === "DTWEXBGS") {
    // Dollar
    if (change20 > 1)   return { text: "Dollar strengthening — headwind for gold and commodities", cls: "macro-tile--bear" };
    if (change20 < -1)  return { text: "Dollar weakening — tailwind for gold/silver and EM", cls: "macro-tile--bull" };
    return { text: "Dollar stable — neutral for metals", cls: "macro-tile--neutral" };
  }
  // Default
  return { text: "", cls: "macro-tile--neutral" };
}

function renderMacroRatePanel(model) {
  const snapshot = model.macroResearch?.macroSnapshot || [];
  const TARGET_CODES = ["DGS10", "DFII10", "T10YIE", "T10Y2Y", "T5YIFR", "DXY", "DTWEXBGS"];
  const items = snapshot.filter((s) => TARGET_CODES.includes(s.code));
  if (!items.length) return "";

  const interpToVcell = (cls) => cls === "macro-tile--bull" ? "vcell vcell-no" : cls === "macro-tile--bear" ? "vcell vcell-go" : "vcell vcell-gray";
  const interpToLabel = (cls) => cls === "macro-tile--bull" ? "Tailwind" : cls === "macro-tile--bear" ? "Headwind" : "Neutral";

  const rows = items.map((item) => {
    const interp = macroInterpretation(item.code, item.latest, item.change20, item.percentile);
    const pct = Math.round(item.percentile || 0);
    const threshold = item.unit === "bp" ? 2 : item.unit === "index" ? 0.3 : 0.01;
    const rising = item.change20 > threshold;
    const falling = item.change20 < -threshold;
    const arrow = rising ? "↑" : falling ? "↓" : "→";
    const chgCls = rising ? "sq-chg-pos" : falling ? "sq-chg-neg" : "sq-chg-flat";
    return `
      <tr>
        <td class="left">
          <div class="row-label">${escapeHtml(item.label)}</div>
          ${interp.text ? `<span class="sq-interp sq-t3">${escapeHtml(interp.text)}</span>` : ""}
        </td>
        <td class="right"><span class="sq-big">${formatMacroValue(item.latest, item.unit)}</span></td>
        <td class="right"><span class="sq-chg ${chgCls}">${arrow} ${escapeHtml(formatMacroDelta(item.change20, item.unit))}</span></td>
        <td class="right"><span class="vcell vcell-gray" style="font-size:11px">${pct}th</span></td>
        <td><span class="${interpToVcell(interp.cls)}">${interpToLabel(interp.cls)}</span></td>
      </tr>
    `;
  }).join("");

  return `
    <div class="sq">
      <div class="sq-section">
        <div class="sq-lbl">Macro Context</div>
        <div class="sq-h2" style="margin-bottom:6px">Rates &amp; Macro</div>
        <div class="sq-desc sq-t3" style="margin-bottom:14px">Key macro indicators and their 20-day trend. <strong>Tailwind</strong> = favorable for risk assets / silver. <strong>Headwind</strong> = unfavorable. <strong>Neutral</strong> = ambiguous. Percentile = current reading vs. last 2 years of history.</div>
        <div class="sq-rate-tw">
          <table class="sq-rate-table">
            <thead>
              <tr>
                <th>Indicator</th>
                <th class="right">Value</th>
                <th class="right">20D Change</th>
                <th class="right">Percentile</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ── WHAT TO DO NOW — actionable signals ────────────────────────────────────

// ---------------------------------------------------------------------------
// Signal builders — answers: Is there a trade? What is it? How confident?
// ---------------------------------------------------------------------------

function buildSimplifiedRegime(model) {
  const discreteRegime = model.macroResearch?.discreteRegime;
  const regime = discreteRegime?.regime;
  const markov = discreteRegime?.markov;
  const vixData = model.macroResearch?.strategyLabData?.VIX || [];
  const latestVix = vixData.length ? vixData[vixData.length - 1]?.value : null;

  // Map to 3 simplified regime types based on named regime + VIX
  const trendSet = new Set(["goldilocks", "reflation", "tightening-cycle"]);
  const mrSet    = new Set(["stagflation-warning", "real-rate-suppression"]);
  const hvSet    = new Set(["deflation-scare"]);

  let type, label, color, interpretation, favorStrategies, cautionStrategies;

  if (latestVix && latestVix > 30) {
    type = "HIGH_VOL"; color = "#f87171";
    label = "High Volatility / Risk-Off";
    interpretation = "Fear elevated. Extreme fear often creates contrarian entry opportunities in equities and silver miners.";
    favorStrategies = ["VIX Spike Entry (SPY)"];
    cautionStrategies = ["Gold/Silver Ratio — wait for ratio to stretch"];
  } else if (regime?.id && trendSet.has(regime.id)) {
    type = "TREND"; color = "#4ade80";
    label = "Trend / Growth";
    interpretation = "Macro supports directional moves. Momentum works better than mean reversion in this environment.";
    favorStrategies = ["AGQ, RING momentum trades"];
    cautionStrategies = ["Mean reversion — wait for dislocations"];
  } else if (regime?.id && mrSet.has(regime.id)) {
    type = "MEAN_REVERSION"; color = "#fb923c";
    label = "Mean Reversion / Spread";
    interpretation = "Spread dislocations are likely. Ratio extremes tend to revert. Silver miners have structural edge.";
    favorStrategies = ["Gold/Silver Mean Reversion (SIL)"];
    cautionStrategies = ["Pure momentum — choppy, mean-reverting environment"];
  } else if (regime?.id && hvSet.has(regime.id)) {
    type = "HIGH_VOL"; color = "#f87171";
    label = "Deflation / Risk-Off";
    interpretation = "Deflation risk elevated. Fear creating oversold conditions.";
    favorStrategies = ["VIX Spike Entry (if VIX ≥ threshold)"];
    cautionStrategies = ["Commodity spreads — defer"];
  } else {
    type = "NEUTRAL"; color = "#94a3b8";
    label = regime?.name || "Neutral / Analyzing";
    interpretation = "No dominant macro theme identified. Reduce position sizing and wait for regime clarification.";
    favorStrategies = [];
    cautionStrategies = ["Avoid high-conviction bets"];
  }

  return {
    type, label, color, interpretation, favorStrategies, cautionStrategies,
    stayProb: markov?.stayProbability,
    switchProb: markov?.switchProbability,
    streak: markov?.streak,
    mostLikelyNext: markov?.mostLikelyNext,
    rawName: regime?.name,
  };
}

function buildVixSignal(model) {
  const params  = state.scout.strategyLab?.vixParams || { threshold: 25, horizon: 20 };
  const result  = model.strategyLab?.vix;
  const vixData = model.macroResearch?.strategyLabData?.VIX || [];
  const latest  = vixData.length ? vixData[vixData.length - 1] : null;
  const simpleRegime = buildSimplifiedRegime(model);
  const active  = !!(latest && latest.value >= params.threshold);
  const regimeAligned = simpleRegime.type === "HIGH_VOL" || (latest?.value > params.threshold * 0.85);

  let conf = result?.winRate ? Math.round(result.winRate) : 55;
  if (!active) conf = Math.max(30, conf - 15);
  if (regimeAligned && active) conf = Math.min(85, conf + 10);
  else if (!regimeAligned) conf = Math.max(25, conf - 8);

  return {
    strategy: "vix",
    label: "VIX Spike Entry",
    active,
    direction: active ? "LONG SPY" : null,
    asset: "SPY",
    confidence: conf,
    drivers: [
      latest ? `VIX = ${latest.value.toFixed(1)} (entry threshold: ${params.threshold})` : "VIX data loading",
      `Current regime: ${simpleRegime.label}`,
      regimeAligned ? "Regime aligned — fear environment favors contrarian entry" : "Regime not aligned — macro is calm",
    ].filter(Boolean),
    entry: `VIX closes ≥ ${params.threshold}`,
    exit: `VIX drops below ${Math.round(params.threshold * 0.72)}, OR ${params.horizon} trading days elapsed`,
    regimeAligned,
    result,
  };
}

function buildGoldSilverSignal(model) {
  const params       = state.scout.strategyLab?.gsParams || { entryRatio: 75, exitRatio: 50, maxDays: 180 };
  const result       = model.strategyLab?.goldSilver;
  const ratioHistory = result?.ratioHistory || [];
  const latest       = ratioHistory.length ? ratioHistory[ratioHistory.length - 1] : null;
  const simpleRegime = buildSimplifiedRegime(model);
  const active       = !!(latest && latest.value >= params.entryRatio);
  const regimeAligned = simpleRegime.type === "MEAN_REVERSION" || simpleRegime.type === "HIGH_VOL";

  let conf = result?.winRate ? Math.round(result.winRate) : 55;
  if (!active) conf = Math.max(30, conf - 15);
  if (regimeAligned && active) conf = Math.min(85, conf + 10);
  else if (!regimeAligned) conf = Math.max(25, conf - 8);

  return {
    strategy: "gs",
    label: "Gold/Silver Mean Reversion",
    active,
    direction: active ? "LONG SIL" : null,
    asset: "SIL",
    confidence: conf,
    drivers: [
      latest ? `G/S ratio = ${latest.value.toFixed(1)} (entry: ≥ ${params.entryRatio}, exit target: ≤ ${params.exitRatio})` : "Ratio data loading",
      `Current regime: ${simpleRegime.label}`,
      regimeAligned ? "Regime aligned — spread environment favors ratio trades" : "Regime not aligned — trend environment, wait for better entry",
    ].filter(Boolean),
    entry: `Gold/Silver ratio ≥ ${params.entryRatio}`,
    exit: `Ratio compresses to ≤ ${params.exitRatio}, OR ${params.maxDays} calendar days elapsed`,
    regimeAligned,
    result,
  };
}

function renderSignalBox(signal) {
  const confColor = signal.confidence >= 65 ? "var(--positive)" : signal.confidence >= 45 ? "#fbbf24" : "var(--negative)";
  const cls = signal.active ? "signal-box signal-box--active" : "signal-box signal-box--inactive";

  return `
    <div class="${cls}">
      <div class="signal-box__header">
        <div class="signal-box__verdict">
          ${signal.active
            ? `<span class="signal-box__trade">TRADE IDEA: ${escapeHtml(signal.direction)}</span>`
            : `<span class="signal-box__no-trade">NO TRADE — conditions not met</span>`}
        </div>
        <div class="signal-box__conf">
          <span class="signal-box__conf-label">Confidence</span>
          <strong class="signal-box__conf-val" style="color:${confColor}">${signal.confidence}%</strong>
        </div>
      </div>
      <div class="signal-box__drivers">
        ${signal.drivers.map((d) => `<div class="signal-box__driver">▸ ${escapeHtml(d)}</div>`).join("")}
      </div>
      <div class="signal-box__exec">
        <div class="signal-box__exec-row"><span class="signal-box__exec-label">Entry:</span><strong>${escapeHtml(signal.entry)}</strong></div>
        <div class="signal-box__exec-row"><span class="signal-box__exec-label">Exit:</span><strong>${escapeHtml(signal.exit)}</strong></div>
      </div>
    </div>
  `;
}

function renderHowItWorks(strategy) {
  const blocks = {
    vix: {
      mechanism: "Market fear (VIX) spikes create overreaction. When VIX crosses the threshold, buy SPY and hold for a fixed window. Fear tends to mean-revert; SPY historically produces above-average returns after spikes.",
      entry: "VIX closes ≥ threshold on day T — no pyramiding, one active trade at a time",
      exit: "VIX drops 28% from entry level (fear normalized), OR fixed holding period expires",
      why: "Extreme risk aversion overshoots fundamentals. Risk premium expands → tends to contract. Counter-trend, not trend-following.",
      type: "Contrarian / Mean Reversion",
    },
    gs: {
      mechanism: "The gold/silver ratio (oz gold ÷ oz silver) oscillates around 60–80x historically. When it stretches above the threshold, silver is cheap relative to gold. Silver miners (SIL) provide leveraged upside when ratio compresses.",
      entry: "Ratio = (GLD × 10) ÷ SLV ≥ entry threshold — ratio must reach extremes before entry",
      exit: "Ratio compresses to exit level (silver closes the gap), OR max holding period reached",
      why: "Structural mean reversion in metals spread. Ratio extremes historically revert. SIL gives leveraged silver exposure.",
      type: "Relative Value / Mean Reversion",
    },
  };
  const b = blocks[strategy];
  if (!b) return "";
  return `
    <div class="signal-howit">
      <p class="signal-howit__title">How This Works</p>
      <div class="signal-howit__grid">
        <div class="signal-howit__row"><span class="signal-howit__key">Mechanism</span><span>${escapeHtml(b.mechanism)}</span></div>
        <div class="signal-howit__row"><span class="signal-howit__key">Entry rule</span><strong>${escapeHtml(b.entry)}</strong></div>
        <div class="signal-howit__row"><span class="signal-howit__key">Exit rule</span><strong>${escapeHtml(b.exit)}</strong></div>
        <div class="signal-howit__row"><span class="signal-howit__key">Why it works</span><em>${escapeHtml(b.why)}</em></div>
        <div class="signal-howit__row"><span class="signal-howit__key">Strategy type</span><span>${escapeHtml(b.type)}</span></div>
      </div>
    </div>
  `;
}

function renderSimplifiedRegimePanel(model) {
  const sr = buildSimplifiedRegime(model);
  const snapshot = model.macroResearch?.macroSnapshot || [];
  const discreteRegime = model.macroResearch?.discreteRegime;
  const states = discreteRegime?.states || {};
  const s = states;

  const signalTiles = snapshot.slice(0, 6).map((item) => {
    const threshold = item.unit === "bp" ? 2 : item.unit === "index" ? 0.3 : 0.01;
    const rising = item.change20 > threshold;
    const falling = item.change20 < -threshold;
    const dirClass = rising ? "scout-regime-signal--rising" : falling ? "scout-regime-signal--falling" : "";
    const dirArrow = rising ? "↑" : falling ? "↓" : "→";
    const pct = Math.round(item.percentile || 0);
    return `
      <div class="scout-regime-signal ${dirClass}">
        <span class="scout-regime-signal__label">${escapeHtml(item.label)}</span>
        <strong class="scout-regime-signal__value">${formatMacroValue(item.latest, item.unit)}</strong>
        <span class="scout-regime-signal__change">${dirArrow} ${escapeHtml(formatMacroDelta(item.change20, item.unit))} 20D</span>
        <span class="scout-regime-signal__pct">${pct}th pct</span>
        <div class="scout-regime-signal__bar-wrap">
          <div class="scout-regime-signal__bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join("");

  const markovHtml = sr.stayProb !== undefined ? `
    <div class="regime-simple__markov">
      <p class="regime-simple__markov-label">Regime Stability (Markov)</p>
      <div class="regime-markov__bars">
        <div class="regime-markov__bar-item">
          <span>Stay in regime</span>
          <div class="regime-markov__bar-track"><div class="regime-markov__bar-fill regime-markov__bar-fill--stay" style="width:${sr.stayProb}%"></div></div>
          <strong>${sr.stayProb}%</strong>
        </div>
        <div class="regime-markov__bar-item">
          <span>Regime shift</span>
          <div class="regime-markov__bar-track"><div class="regime-markov__bar-fill regime-markov__bar-fill--switch" style="width:${sr.switchProb}%"></div></div>
          <strong>${sr.switchProb}%</strong>
        </div>
      </div>
      ${sr.streak ? `<p class="regime-markov__streak">Streak: ${sr.streak} consecutive days in this regime</p>` : ""}
      ${sr.mostLikelyNext ? `<p class="regime-markov__next">Most likely shift: ${escapeHtml(sr.mostLikelyNext.replace(/-/g, " "))}</p>` : ""}
    </div>
  ` : "";

  const implHtml = (sr.favorStrategies.length || sr.cautionStrategies.length) ? `
    <div class="regime-simple__implications">
      ${sr.favorStrategies.length ? `<div class="regime-implication regime-implication--favor">Favor: ${escapeHtml(sr.favorStrategies.join(", "))}</div>` : ""}
      ${sr.cautionStrategies.length ? `<div class="regime-implication regime-implication--caution">Caution: ${escapeHtml(sr.cautionStrategies.join(", "))}</div>` : ""}
    </div>
  ` : "";

  return `
    <section class="panel regime-panel" style="border-top: 3px solid ${escapeHtml(sr.color)}">
      <div class="regime-simple">
        <div class="regime-simple__main">
          <p class="scout-section-label">Market Regime</p>
          <h2 class="regime-simple__name" style="color:${escapeHtml(sr.color)}">${escapeHtml(sr.label)}</h2>
          <p class="regime-simple__interp">${escapeHtml(sr.interpretation)}</p>
          ${implHtml}
        </div>
        ${markovHtml}
      </div>
      <div class="scout-regime-strip" style="margin-top:1.2rem">${signalTiles}</div>
    </section>
  `;
}

function renderTradeSignals(model) {
  const { assetSignals, relativeSignal } = buildActionSignals(model);
  const sr = buildSimplifiedRegime(model);

  const dirClass = (dir) => {
    if (dir === "LONG") return "wtd-badge--long";
    if (dir === "AVOID") return "wtd-badge--avoid";
    if (dir === "MONITOR") return "wtd-badge--monitor";
    return "wtd-badge--neutral";
  };
  const convClass = (conv) => {
    if (conv === "HIGH") return "wtd-conv--high";
    if (conv === "MEDIUM") return "wtd-conv--medium";
    return "wtd-conv--low";
  };

  const cards = assetSignals.map((sig) => `
    <article class="wtd-card">
      <div class="wtd-card__head">
        <div>
          <span class="wtd-symbol">${escapeHtml(sig.symbol)}</span>
          <span class="wtd-cat">${escapeHtml(sig.category)}</span>
        </div>
        <div class="wtd-badges">
          <span class="wtd-badge ${dirClass(sig.direction)}">${escapeHtml(sig.direction)}</span>
          <span class="wtd-conv ${convClass(sig.conviction)}">${escapeHtml(sig.conviction)}</span>
        </div>
      </div>
      <p class="wtd-rationale">${escapeHtml(sig.rationale)}</p>
      ${sig.drivers.length ? `<p class="wtd-drivers">Drivers: ${sig.drivers.map(escapeHtml).join(" · ")}</p>` : ""}
    </article>
  `).join("");

  const relBlock = relativeSignal ? `
    <article class="wtd-card wtd-card--relative">
      <div class="wtd-card__head">
        <div>
          <span class="wtd-symbol">${escapeHtml(relativeSignal.label)}</span>
          <span class="wtd-cat">Best relative expression</span>
        </div>
        <div class="wtd-badges">
          <span class="wtd-badge wtd-badge--long">${escapeHtml(relativeSignal.direction)}</span>
          <span class="wtd-conv ${convClass(relativeSignal.conviction)}">${escapeHtml(relativeSignal.conviction)}</span>
        </div>
      </div>
      <p class="wtd-rationale">${escapeHtml(relativeSignal.rationale)}</p>
    </article>
  ` : "";

  return `
    <section class="panel wtd-panel">
      <div class="panel-header">
        <div>
          <p class="scout-section-label">Action Layer</p>
          <h2>Trade Signals</h2>
          <p class="panel-subtitle">Macro-conditioned signals. Regime: <strong style="color:${escapeHtml(sr.color)}">${escapeHtml(sr.label)}</strong></p>
        </div>
      </div>
      <div class="wtd-grid">
        ${cards}
        ${relBlock}
      </div>
    </section>
  `;
}

function buildActionSignals(model) {
  const assets = model.macroResearch?.focusAssets || [];
  const relatives = model.macroResearch?.relativeComparisons || [];
  const discreteRegime = model.macroResearch?.discreteRegime;
  const agqMomentum = model.macroResearch?.agqMomentum;

  // Use regime outlook from discrete regime model when available
  const regimeOutlook = discreteRegime?.regime?.assetOutlook || {};

  const assetSignals = assets
    .filter((a) => a.priority <= 2)
    .map((asset) => {
      const regime = asset.currentRegime;
      const topDriver = asset.rankedDrivers?.[0];
      const secondDriver = asset.rankedDrivers?.[1];

      // Primary direction: combine discrete regime outlook with per-asset regime score
      let direction, conviction, rationale, drivers, extraSignal;

      const regimeDir = regimeOutlook[asset.symbol]; // LONG / AVOID / MONITOR / NEUTRAL from named regime

      // Score from per-asset backtested regime model
      const stateFavorable = regime.state === "favorable" && regime.confidence >= 55;
      const stateUnfavorable = regime.state === "unfavorable" && regime.confidence >= 55;
      const stateMixed = regime.state === "mixed";

      // Merge: both regime sources agree → high conviction
      if (regimeDir === "LONG" && stateFavorable) {
        direction = "LONG"; conviction = regime.confidence >= 72 ? "HIGH" : "MEDIUM";
      } else if (regimeDir === "AVOID" && stateUnfavorable) {
        direction = "AVOID"; conviction = regime.confidence >= 72 ? "HIGH" : "MEDIUM";
      } else if (regimeDir === "LONG" || stateFavorable) {
        direction = "LONG"; conviction = "MEDIUM";
      } else if (regimeDir === "AVOID" || stateUnfavorable) {
        direction = "AVOID"; conviction = "MEDIUM";
      } else if (regimeDir === "MONITOR" || stateMixed) {
        direction = "MONITOR"; conviction = "LOW";
      } else {
        direction = "NEUTRAL"; conviction = "LOW";
      }

      // Build explicit, driver-grounded rationale
      const driverSignals = regime.driverSignals || [];
      const supportive = driverSignals.filter((s) => s.signal > 0.1).map((s) => s.driverLabel);
      const adverse = driverSignals.filter((s) => s.signal < -0.1).map((s) => s.driverLabel);
      const edge20 = topDriver?.horizons?.[20]?.edge;
      const edgeStr = Number.isFinite(edge20) && Math.abs(edge20) > 0.002
        ? ` Hist. 20D regime edge: ${edge20 > 0 ? "+" : ""}${(edge20 * 100).toFixed(1)}%.`
        : "";

      if (direction === "LONG") {
        rationale = supportive.length
          ? `${supportive.slice(0, 2).join(" + ")} in historically supportive territory.${edgeStr}`
          : `Regime classification: ${discreteRegime?.regime?.name || "supportive"}.${edgeStr}`;
      } else if (direction === "AVOID") {
        rationale = adverse.length
          ? `${adverse.slice(0, 2).join(" + ")} in historically adverse territory.${edgeStr}`
          : `Regime classification: ${discreteRegime?.regime?.name || "adverse"}.${edgeStr}`;
      } else {
        rationale = `${discreteRegime?.regime?.name || "Mixed signals"} — no dominant directional edge. Wait for regime clarification.`;
      }

      drivers = [topDriver?.driverLabel, secondDriver?.driverLabel].filter(Boolean).slice(0, 3);

      // AGQ-specific: overlay momentum signal
      if (asset.symbol === "AGQ" && agqMomentum?.available) {
        const m = agqMomentum;
        const align = (direction === "LONG" && m.trend === 1) || (direction === "AVOID" && m.trend === -1);
        const conflict = (direction === "LONG" && m.trend === -1) || (direction === "AVOID" && m.trend === 1);
        extraSignal = {
          label: "AGQ Momentum",
          trendLabel: m.trendLabel,
          r20: m.returns.r20,
          r60: m.returns.r60,
          rsi14: m.rsi14,
          overbought: m.overbought,
          oversold: m.oversold,
          aligns: align,
          conflicts: conflict,
        };
        // If macro says LONG but momentum is down, downgrade conviction
        if (conflict && conviction === "HIGH") conviction = "MEDIUM";
        if (conflict && conviction === "MEDIUM") conviction = "LOW";
      }

      return { symbol: asset.symbol, category: asset.category, direction, conviction, rationale, drivers, extraSignal };
    });

  // Best relative expression (strongest macro edge)
  const bestRelative = relatives
    .filter((r) => Math.abs(r.joint?.edge || 0) > 0.003)
    .sort((a, b) => Math.abs(b.joint?.edge || 0) - Math.abs(a.joint?.edge || 0))[0];

  let relativeSignal = null;
  if (bestRelative) {
    const favors = (bestRelative.joint?.edge || 0) > 0 ? bestRelative.leftSymbol : bestRelative.rightSymbol;
    const over = favors === bestRelative.leftSymbol ? bestRelative.rightSymbol : bestRelative.leftSymbol;
    relativeSignal = {
      label: `${favors} / ${over}`,
      direction: `${favors} OVER ${over}`,
      conviction: Math.abs(bestRelative.currentZ) > 1.0 ? "MEDIUM" : "LOW",
      rationale: bestRelative.interpretation,
    };
  }

  return { assetSignals, relativeSignal };
}

function renderWhatToDoNow(model) {
  const { assetSignals, relativeSignal } = buildActionSignals(model);
  const discreteRegime = model.macroResearch?.discreteRegime;

  const dirClass = (dir) => {
    if (dir === "LONG") return "wtd-badge--long";
    if (dir === "AVOID") return "wtd-badge--avoid";
    if (dir === "MONITOR") return "wtd-badge--monitor";
    return "wtd-badge--neutral";
  };
  const convClass = (conv) => {
    if (conv === "HIGH") return "wtd-conv--high";
    if (conv === "MEDIUM") return "wtd-conv--medium";
    return "wtd-conv--low";
  };
  const fmtR = (r) => r !== null && r !== undefined ? `${r > 0 ? "+" : ""}${r.toFixed(1)}%` : "—";

  const cards = assetSignals.map((sig) => {
    const mx = sig.extraSignal; // AGQ momentum overlay
    const momentumHtml = mx ? `
      <div class="wtd-momentum">
        <span class="wtd-momentum__label">Momentum</span>
        <span class="wtd-momentum__trend wtd-momentum__trend--${mx.trendLabel.toLowerCase()}">${escapeHtml(mx.trendLabel)}</span>
        <span class="wtd-momentum__stat">20D ${escapeHtml(fmtR(mx.r20))}</span>
        <span class="wtd-momentum__stat">60D ${escapeHtml(fmtR(mx.r60))}</span>
        <span class="wtd-momentum__stat">RSI ${escapeHtml(String(mx.rsi14))}${mx.overbought ? " OB" : mx.oversold ? " OS" : ""}</span>
        ${mx.aligns ? `<span class="wtd-momentum__align wtd-momentum__align--yes">Macro + Momentum aligned</span>` : ""}
        ${mx.conflicts ? `<span class="wtd-momentum__align wtd-momentum__align--no">Momentum conflicts macro</span>` : ""}
      </div>
    ` : "";
    return `
      <article class="wtd-card">
        <div class="wtd-card__head">
          <div>
            <span class="wtd-symbol">${escapeHtml(sig.symbol)}</span>
            <span class="wtd-cat">${escapeHtml(sig.category)}</span>
          </div>
          <div class="wtd-badges">
            <span class="wtd-badge ${dirClass(sig.direction)}">${escapeHtml(sig.direction)}</span>
            <span class="wtd-conv ${convClass(sig.conviction)}">${escapeHtml(sig.conviction)}</span>
          </div>
        </div>
        <p class="wtd-rationale">${escapeHtml(sig.rationale)}</p>
        ${sig.drivers.length ? `<p class="wtd-drivers">Key drivers: ${sig.drivers.map(escapeHtml).join(" · ")}</p>` : ""}
        ${momentumHtml}
      </article>
    `;
  }).join("");

  const relativeBlock = relativeSignal ? `
    <article class="wtd-card wtd-card--relative">
      <div class="wtd-card__head">
        <div>
          <span class="wtd-symbol">${escapeHtml(relativeSignal.label)}</span>
          <span class="wtd-cat">Best relative expression</span>
        </div>
        <div class="wtd-badges">
          <span class="wtd-badge wtd-badge--long">${escapeHtml(relativeSignal.direction)}</span>
          <span class="wtd-conv ${convClass(relativeSignal.conviction)}">${escapeHtml(relativeSignal.conviction)}</span>
        </div>
      </div>
      <p class="wtd-rationale">${escapeHtml(relativeSignal.rationale)}</p>
    </article>
  ` : "";

  const regimeNote = discreteRegime?.regime ? `
    <p class="wtd-regime-note">Regime context: <strong>${escapeHtml(discreteRegime.regime.name)}</strong> — ${escapeHtml(discreteRegime.regime.theme)}</p>
  ` : "";

  return `
    <section class="panel wtd-panel">
      <div class="panel-header">
        <div>
          <p class="scout-section-label">Action Layer</p>
          <h2>What to Do Now</h2>
          <p class="panel-subtitle">Macro-conditioned signals + momentum overlay. Based on historical regime edges — not forecasts.</p>
        </div>
      </div>
      ${regimeNote}
      <div class="wtd-grid">
        ${cards}
        ${relativeBlock}
      </div>
    </section>
  `;
}

// ── Strategy signals + timeframe selector ─────────────────────────────────

function renderTimeframeSelector() {
  const timeframes = [{ val: 5, label: "5D" }, { val: 20, label: "20D" }, { val: 60, label: "60D" }, { val: 120, label: "120D" }, { val: 250, label: "1Y" }];
  const active = state.scout.strategyLab?.activeTimeframe ?? 20;
  const tabs = timeframes.map((tf) => `
    <button class="tf-tab ${tf.val === active ? "tf-tab--active" : ""}" data-timeframe="${tf.val}">${escapeHtml(tf.label)}</button>
  `).join("");
  return `
    <div class="tf-selector">
      <span class="tf-selector__label">Signal horizon</span>
      <div class="tf-tabs">${tabs}</div>
    </div>
  `;
}

function tfLabel(val) {
  return val === 250 ? "1Y" : `${val}D`;
}

function renderStrategyLabSignals(model) {
  const lab = model.strategyLab;
  const vix = lab?.vix;
  const gs = lab?.goldSilver;
  const vixParams = state.scout.strategyLab?.vixParams || { threshold: 25, horizon: 20 };
  const gsParams = state.scout.strategyLab?.gsParams || { entryRatio: 75, exitRatio: 50 };
  const activeTimeframe = lab?.activeTimeframe ?? state.scout.strategyLab?.activeTimeframe ?? 20;

  // VIX current signal
  const vixData = model.macroResearch?.strategyLabData?.VIX || [];
  const latestVix = vixData.length ? vixData[vixData.length - 1] : null;
  const vixActive = latestVix && latestVix.value >= vixParams.threshold;
  const prevVixTrigger = vix?.trades?.length ? vix.trades[vix.trades.length - 1] : null;

  // Gold/silver ratio current signal
  const ratioHistory = gs?.ratioHistory || [];
  const latestRatioPoint = ratioHistory.length ? ratioHistory[ratioHistory.length - 1] : null;
  const gsActive = latestRatioPoint && latestRatioPoint.value >= gsParams.entryRatio;
  const prevGsTrade = gs?.trades?.length ? gs.trades[gs.trades.length - 1] : null;

  const fmtReturn = (v) => v !== null && v !== undefined ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "—";
  const fmtWin = (v) => v !== null && v !== undefined ? `${v.toFixed(0)}% win rate` : "—";

  const signalCard = (opts) => {
    const { label, active, currentValue, currentLabel, threshold, thresholdLabel, lastTrade, avgReturn, winRate, tradeCount, appliesTo } = opts;
    const statusLabel = active ? "ACTIVE TODAY" : "NO SIGNAL";
    const statusCls = active ? "sig-card--active" : "sig-card--inactive";
    const pillCls = active ? "status-pill--success" : "status-pill--muted";
    return `
      <div class="sig-card ${statusCls}">
        <div class="sig-card__head">
          <div>
            <div class="sig-card__name">${escapeHtml(label)}</div>
            <div class="sig-card__horizon">Horizon: ${escapeHtml(String(activeTimeframe))}D</div>
          </div>
          <span class="status-pill ${pillCls}">${statusLabel}</span>
        </div>
        <div class="sig-card__stats">
          <div class="sig-stat">
            <span>${escapeHtml(currentLabel)}</span>
            <strong style="color:${active ? "var(--positive)" : "inherit"}">${typeof currentValue === "number" ? currentValue.toFixed(1) : escapeHtml(String(currentValue ?? "—"))}</strong>
          </div>
          <div class="sig-stat">
            <span>${escapeHtml(thresholdLabel)}</span>
            <strong>${escapeHtml(String(threshold))}</strong>
          </div>
          <div class="sig-stat">
            <span>Avg return</span>
            <strong style="color:${avgReturn > 0 ? "var(--positive)" : "var(--negative)"}">${escapeHtml(fmtReturn(avgReturn))}</strong>
          </div>
          <div class="sig-stat">
            <span>Win rate</span>
            <strong>${escapeHtml(fmtWin(winRate))}</strong>
          </div>
          <div class="sig-stat">
            <span>Trades (hist)</span>
            <strong>${escapeHtml(String(tradeCount ?? "—"))}</strong>
          </div>
          ${lastTrade ? `<div class="sig-stat"><span>Last triggered</span><strong>${escapeHtml(lastTrade.entryDate)}</strong></div>` : ""}
        </div>
        <p class="sig-card__applies">Applies to: <em>${escapeHtml(appliesTo)}</em></p>
      </div>
    `;
  };

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="scout-section-label">Strategy Signals</p>
          <h2>Live Signal Status</h2>
          <p class="panel-subtitle">Are the VIX or Gold/Silver conditions met today? Backtest stats shown for selected horizon.</p>
        </div>
        ${renderTimeframeSelector()}
      </div>
      <div class="sig-cards-row">
        ${signalCard({
          label: `VIX Entry (VIX ≥ ${vixParams.threshold})`,
          active: vixActive,
          currentValue: latestVix?.value ?? null,
          currentLabel: "Current VIX",
          threshold: vixParams.threshold,
          thresholdLabel: "Entry threshold",
          lastTrade: prevVixTrigger,
          avgReturn: vix?.avgReturn ?? null,
          winRate: vix?.winRate ?? null,
          tradeCount: vix?.tradeCount ?? null,
          appliesTo: `SPY — ${activeTimeframe}D fixed hold`,
        })}
        ${signalCard({
          label: `Gold/Silver Ratio (ratio ≥ ${gsParams.entryRatio})`,
          active: gsActive,
          currentValue: latestRatioPoint?.value ?? null,
          currentLabel: "Current G/S ratio",
          threshold: gsParams.entryRatio,
          thresholdLabel: "Entry threshold",
          lastTrade: prevGsTrade,
          avgReturn: gs?.avgReturn ?? null,
          winRate: gs?.winRate ?? null,
          tradeCount: gs?.tradeCount ?? null,
          appliesTo: `SIL — hold until ratio ≤ ${gsParams.exitRatio}`,
        })}
      </div>
    </section>
  `;
}

// ── Explicit macro regime panel (Discrete + Markov) ────────────────────────

function renderMacroRegimeHeader(model) {
  const snapshot = model.macroResearch?.macroSnapshot || [];
  const discreteRegime = model.macroResearch?.discreteRegime;
  const regime = discreteRegime?.regime;
  const states = discreteRegime?.states || {};
  const markov = discreteRegime?.markov;

  // Macro driver strip from snapshot
  const signalTiles = snapshot
    .map((item) => {
      const threshold = item.unit === "bp" ? 2 : item.unit === "index" ? 0.3 : 0.01;
      const rising = item.change20 > threshold;
      const falling = item.change20 < -threshold;
      const dirClass = rising ? "scout-regime-signal--rising" : falling ? "scout-regime-signal--falling" : "";
      const dirArrow = rising ? "↑" : falling ? "↓" : "→";
      const pct = Math.round(item.percentile || 0);
      return `
        <div class="scout-regime-signal ${dirClass}">
          <span class="scout-regime-signal__label">${escapeHtml(item.label)}</span>
          <strong class="scout-regime-signal__value">${formatMacroValue(item.latest, item.unit)}</strong>
          <span class="scout-regime-signal__change">${dirArrow} ${escapeHtml(formatMacroDelta(item.change20, item.unit))} 20D</span>
          <span class="scout-regime-signal__pct">${pct}th pct</span>
          <div class="scout-regime-signal__bar-wrap">
            <div class="scout-regime-signal__bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    })
    .join("");

  // Explicit state dimensions panel
  const stateDim = (label, valueStr, levelBadge, trendBadge, pctile) => `
    <div class="regime-dim">
      <div class="regime-dim__label">${escapeHtml(label)}</div>
      <div class="regime-dim__value">${escapeHtml(valueStr)}</div>
      <div class="regime-dim__badges">
        <span class="regime-dim__badge">${escapeHtml(levelBadge)}</span>
        <span class="regime-dim__trend">${escapeHtml(trendBadge)}</span>
      </div>
      ${pctile !== undefined ? `<div class="regime-dim__pct-bar"><div class="regime-dim__pct-fill" style="width:${pctile}%"></div></div>` : ""}
    </div>
  `;

  const s = states;
  const dimsHtml = s.realYield ? `
    <div class="regime-dims">
      ${stateDim("Real Yield (10Y)", `${s.realYield.value.toFixed(2)}%`, s.realYield.label, s.realYield.trend, s.realYield.pctile)}
      ${stateDim("Yield Curve (10s2s)", `${s.curve.value.toFixed(0)}bp`, s.curve.label, s.curve.trend)}
      ${stateDim("Dollar (DXY)", `${s.dollar.value.toFixed(1)}`, s.dollar.label, s.dollar.trend, s.dollar.pctile)}
      ${stateDim("Inflation Exp. (10Y BE)", `${s.inflation.value.toFixed(2)}%`, s.inflation.label, s.inflation.trend, s.inflation.pctile)}
    </div>
  ` : "";

  // Markov panel
  const markovHtml = markov ? `
    <div class="regime-markov">
      <span class="regime-markov__label">Regime stability</span>
      <div class="regime-markov__bars">
        <div class="regime-markov__bar-item">
          <span>Stay (${escapeHtml(String(markov.stayProbability))}%)</span>
          <div class="regime-markov__bar-track"><div class="regime-markov__bar-fill regime-markov__bar-fill--stay" style="width:${markov.stayProbability}%"></div></div>
        </div>
        <div class="regime-markov__bar-item">
          <span>Switch (${escapeHtml(String(markov.switchProbability))}%)</span>
          <div class="regime-markov__bar-track"><div class="regime-markov__bar-fill regime-markov__bar-fill--switch" style="width:${markov.switchProbability}%"></div></div>
        </div>
      </div>
      <span class="regime-markov__streak">Current streak: ${escapeHtml(String(markov.streak))} days</span>
      ${markov.mostLikelyNext ? `<span class="regime-markov__next">Most likely next: ${escapeHtml(markov.mostLikelyNext.replace(/-/g, " "))}</span>` : ""}
    </div>
  ` : "";

  const regimeName = regime?.name || "Analyzing…";
  const regimeColor = regime?.color || "#6b7280";

  return `
    <section class="panel regime-panel" style="border-top: 3px solid ${escapeHtml(regimeColor)}">
      <div class="panel-header">
        <div>
          <p class="scout-section-label">Current Macro Regime</p>
          <h2 style="color:${escapeHtml(regimeColor)}">${escapeHtml(regimeName)}</h2>
          <p class="panel-subtitle">${regime ? escapeHtml(regime.description) : "Loading regime classification..."}</p>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:flex-start;flex-wrap:wrap;flex-shrink:0">
          <span class="status-pill ${getScoutStatusClass(model.dataStatus)}">${escapeHtml(model.dataStatus)}</span>
          <span class="status-pill status-pill--muted">${escapeHtml(model.freshnessLabel)}</span>
        </div>
      </div>
      ${dimsHtml}
      ${markovHtml}
      <div class="scout-regime-strip" style="margin-top:1rem">${signalTiles}</div>
    </section>
  `;
}

function renderAssetVerdicts(model) {
  const assets = model.macroResearch?.focusAssets || [];
  const discreteRegime = model.macroResearch?.discreteRegime;
  const regimeOutlook = discreteRegime?.regime?.assetOutlook || {};
  const priority1 = assets.filter((a) => a.priority === 1);
  const priority2 = assets.filter((a) => a.priority === 2);
  const displayAssets = [...priority1, ...priority2];
  const activeTimeframe = state.scout.strategyLab?.activeTimeframe ?? 20;

  const cards = displayAssets
    .map((asset) => {
      const regime = asset.currentRegime;
      const stateKey = (regime.state || "low-confidence").replace(/\s+/g, "-");
      const badgeLabel =
        regime.state === "low-confidence" ? "Low Conf"
        : regime.state === "favorable" ? "Favorable"
        : regime.state === "unfavorable" ? "Unfavorable"
        : "Mixed";

      const topDriver = asset.rankedDrivers?.[0];
      const secondDriver = asset.rankedDrivers?.[1];
      const edge = topDriver?.horizons?.[activeTimeframe]?.edge ?? topDriver?.horizons?.[20]?.edge;
      const regimeOutlookDir = regimeOutlook[asset.symbol];

      const driverRows = [topDriver, secondDriver]
        .filter(Boolean)
        .map((driver) => {
          const driverSignal = regime.driverSignals?.find((s) => s.driverCode === driver.driverCode);
          let dirLabel, dirClass;
          if (driverSignal) {
            if (driverSignal.signal > 0.15) { dirLabel = "supportive now"; dirClass = "scout-driver-row__verdict--supportive"; }
            else if (driverSignal.signal < -0.15) { dirLabel = "adverse now"; dirClass = "scout-driver-row__verdict--adverse"; }
            else { dirLabel = "neutral"; dirClass = "scout-driver-row__verdict--neutral"; }
          } else {
            dirLabel = driver.verdict;
            dirClass = "scout-driver-row__verdict--neutral";
          }
          return `
            <div class="scout-driver-row">
              <span class="scout-driver-row__name">${escapeHtml(driver.driverLabel)}</span>
              <span class="scout-driver-row__verdict ${dirClass}">${escapeHtml(dirLabel)}</span>
            </div>
          `;
        })
        .join("");

      const edgeText = Number.isFinite(edge)
        ? `${activeTimeframe}D conditional edge (${escapeHtml(topDriver?.driverLabel || "top driver")}): ${edge >= 0 ? "+" : ""}${(edge * 100).toFixed(1)}%`
        : "";

      const regimeTag = regimeOutlookDir ? `<span class="verdict-regime-tag verdict-regime-tag--${regimeOutlookDir.toLowerCase()}">${escapeHtml(regimeOutlookDir)}</span>` : "";

      return `
        <article class="scout-verdict-card">
          <div class="scout-verdict-card__head">
            <div>
              <div class="scout-verdict-card__symbol">${escapeHtml(asset.symbol)}</div>
              <div class="scout-verdict-card__category">${escapeHtml(asset.category)}</div>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">
              ${regimeTag}
              <span class="scout-verdict-badge scout-verdict-badge--${escapeHtml(stateKey)}">${escapeHtml(badgeLabel)}</span>
            </div>
          </div>
          ${driverRows ? `<div class="scout-verdict-drivers">${driverRows}</div>` : ""}
          <p class="scout-verdict-interp">${escapeHtml(asset.interpretation)}</p>
          ${edgeText ? `<p class="scout-verdict-edge">${escapeHtml(edgeText)}</p>` : ""}
        </article>
      `;
    })
    .join("");

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="scout-section-label">Regime-Conditioned Verdicts</p>
          <h2>Macro-Conditioned Verdicts</h2>
          <p class="panel-subtitle">Per-asset regime fit — backtested forward edges shown for ${escapeHtml(String(activeTimeframe))}D horizon.</p>
        </div>
      </div>
      <div class="scout-verdict-grid">${cards}</div>
    </section>
  `;
}

function renderRelativeExpressions(model) {
  const relatives = model.macroResearch?.relativeComparisons || [];
  const sorted = [...relatives].sort((a, b) => {
    const scoreA = Math.max(Math.abs(a.realYieldEdge?.edge || 0), Math.abs(a.dollarEdge?.edge || 0), Math.abs(a.joint?.edge || 0));
    const scoreB = Math.max(Math.abs(b.realYieldEdge?.edge || 0), Math.abs(b.dollarEdge?.edge || 0), Math.abs(b.joint?.edge || 0));
    return scoreB - scoreA;
  });

  const rows = sorted
    .slice(0, 6)
    .map((item) => {
      const edges = [item.realYieldEdge, item.dollarEdge, item.joint].filter(Boolean);
      const dominant = edges.sort((a, b) => Math.abs(b.edge || 0) - Math.abs(a.edge || 0))[0];
      const dominantEdge = dominant?.edge || 0;
      let verdictClass, verdictLabel;
      if (dominantEdge > 0.003) {
        verdictClass = "scout-expr-verdict--left";
        verdictLabel = `Favors ${item.leftSymbol}`;
      } else if (dominantEdge < -0.003) {
        verdictClass = "scout-expr-verdict--right";
        verdictLabel = `Favors ${item.rightSymbol}`;
      } else {
        verdictClass = "scout-expr-verdict--neutral";
        verdictLabel = "Neutral";
      }
      const zSign = item.currentZ >= 0 ? "+" : "";
      return `
        <div class="scout-expr-row">
          <span class="scout-expr-pair">${escapeHtml(item.leftSymbol)} vs ${escapeHtml(item.rightSymbol)}</span>
          <span class="scout-expr-z">z: ${zSign}${item.currentZ.toFixed(2)}</span>
          <span class="scout-expr-verdict ${verdictClass}">${escapeHtml(verdictLabel)}</span>
          <span class="scout-expr-rationale">${escapeHtml(item.interpretation)}</span>
        </div>
      `;
    })
    .join("");

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="scout-section-label">Relative Expressions</p>
          <h2>Regime-Ranked Pair Analysis</h2>
          <p class="panel-subtitle">Ranked by historical regime edge. Which pair is most differentiated under current macro conditions?</p>
        </div>
      </div>
      <div class="scout-expressions-grid">${rows || '<p class="panel-subtitle">No relative comparison data available.</p>'}</div>
    </section>
  `;
}

function renderConditionalReturns(model) {
  const assets = model.macroResearch?.focusAssets || [];
  const priority12 = assets.filter((a) => a.priority <= 2);

  const tableRows = priority12
    .map((asset) => {
      const topDriver = asset.rankedDrivers?.[0];
      if (!topDriver) return "";
      const h20 = topDriver.horizons?.[20] || {};
      const h60 = topDriver.horizons?.[60] || {};
      const edge20 = h20.edge ?? 0;
      const edge60 = h60.edge ?? 0;

      // favorable mean = the bucket that benefits the asset
      // if edge < 0: lowMean > highMean → lowMean is favorable bucket
      // if edge > 0: highMean > lowMean → highMean is favorable bucket
      const favorMean20 = edge20 >= 0 ? (h20.highMean ?? 0) : (h20.lowMean ?? 0);
      const adverseMean20 = edge20 >= 0 ? (h20.lowMean ?? 0) : (h20.highMean ?? 0);
      const favorMean60 = edge60 >= 0 ? (h60.highMean ?? 0) : (h60.lowMean ?? 0);

      const verdict = asset.currentRegime?.state || "low-confidence";
      const isGood = verdict === "favorable";
      const isBad = verdict === "unfavorable";
      const verdictClass = isGood ? "val-positive" : isBad ? "val-negative" : "val-muted";
      const verdictLabel = verdict === "low-confidence" ? "low conf" : verdict;

      const f20Class = favorMean20 >= 0 ? "val-positive" : "val-negative";
      const a20Class = adverseMean20 >= 0 ? "val-positive" : "val-negative";
      const f60Class = favorMean60 >= 0 ? "val-positive" : "val-negative";

      return `
        <tr>
          <td><strong>${escapeHtml(asset.symbol)}</strong><div class="table-subtext">${escapeHtml(asset.category)}</div></td>
          <td>${escapeHtml(topDriver.driverLabel)}</td>
          <td class="right ${f20Class}">${formatPercent(favorMean20 * 100)}</td>
          <td class="right ${a20Class}">${formatPercent(adverseMean20 * 100)}</td>
          <td class="right ${f60Class}">${formatPercent(favorMean60 * 100)}</td>
          <td class="right"><span class="${verdictClass}">${escapeHtml(verdictLabel)}</span></td>
        </tr>
      `;
    })
    .join("");

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="scout-section-label">Conditional Returns</p>
          <h2>Backtested Regime Edges</h2>
          <p class="panel-subtitle">Average forward returns when top macro driver is in favorable vs adverse bucket. Not a forecast — a historical tendency.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table class="scout-cond-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Top driver</th>
              <th class="right">Fav bucket 20D</th>
              <th class="right">Adv bucket 20D</th>
              <th class="right">Fav bucket 60D</th>
              <th class="right">Current regime</th>
            </tr>
          </thead>
          <tbody>${tableRows || '<tr><td colspan="6" class="val-muted" style="padding:1rem">No data available.</td></tr>'}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderSynthesisMemo(model) {
  const snapshot = model.macroResearch?.macroSnapshot || [];
  const discreteRegime = model.macroResearch?.discreteRegime;
  const regime = discreteRegime?.regime || { name: "Analyzing", theme: "Regime classification in progress." };
  const suggestions = model.macroResearch?.suggestions || [];
  const assets = model.macroResearch?.focusAssets || [];

  const realYield = snapshot.find((s) => s.code === "DFII10");
  const breakeven = snapshot.find((s) => s.code === "T10YIE");
  const dollar = snapshot.find((s) => s.code === "DXY");

  const descParts = [];
  if (realYield) {
    const dir = realYield.change20 < 0 ? "falling" : realYield.change20 > 0 ? "rising" : "flat";
    descParts.push(`Real yields are ${dir} (${formatMacroDelta(realYield.change20, realYield.unit)} over 20 days, now ${formatMacroValue(realYield.latest, realYield.unit)}, ${Math.round(realYield.percentile)}th pct)`);
  }
  if (breakeven) {
    const dir = breakeven.change20 > 0 ? "rising" : breakeven.change20 < 0 ? "falling" : "flat";
    descParts.push(`breakevens ${dir} (${formatMacroDelta(breakeven.change20, breakeven.unit)})`);
  }
  if (dollar) {
    const dir = dollar.change20 < 0 ? "weakening" : dollar.change20 > 0 ? "strengthening" : "flat";
    descParts.push(`dollar ${dir} (${Math.round(dollar.percentile)}th pct)`);
  }

  const macroDesc = descParts.join("; ");
  const thesis = macroDesc
    ? `${macroDesc}. This maps to the "${regime.name}" regime.`
    : regime.description || regime.theme;

  const favorableAssets = assets.filter((a) => a.currentRegime?.state === "favorable" && a.priority <= 2).map((a) => a.symbol);
  const unfavorableAssets = assets.filter((a) => a.currentRegime?.state === "unfavorable" && a.priority <= 2).map((a) => a.symbol);
  const mixedAssets = assets.filter((a) => a.currentRegime?.state === "mixed" && a.priority <= 2).map((a) => a.symbol);

  const bullets = [
    ...suggestions,
    favorableAssets.length ? `Favorable macro setup: ${favorableAssets.join(", ")}.` : "",
    unfavorableAssets.length ? `Adverse macro setup: ${unfavorableAssets.join(", ")}.` : "",
    mixedAssets.length ? `Mixed signals: ${mixedAssets.join(", ")}.` : "",
  ].filter(Boolean);

  const dataLabel = model.dataStatus === "live" ? "real FRED + Yahoo Finance data" : "simulated data (connect FRED API for live signals)";
  const caveats = `Confidence: ${regime.confidence}. Based on ${dataLabel}. Historical regime edges are statistical tendencies, not forward-looking forecasts.`;

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="scout-section-label">Synthesis</p>
          <h2>Current Interpretation</h2>
        </div>
      </div>
      <div class="scout-memo">
        <p class="scout-memo__thesis">${escapeHtml(thesis)}</p>
        <div class="scout-memo__bullets">
          ${bullets.map((b) => `<div class="scout-memo__bullet">${escapeHtml(b)}</div>`).join("")}
        </div>
        <p class="scout-memo__caveats">${escapeHtml(caveats)}</p>
      </div>
    </section>
  `;
}

// ── Strategy Lab rendering (v3 — visual, chart-driven) ─────────────────────

function renderStrategyLab(model) {
  const lab = model.strategyLab;
  const activeStrategy = state.scout.strategyLab?.activeStrategy || "momentum";
  const vixParams = state.scout.strategyLab?.vixParams || { threshold: 25, horizon: 20 };
  const gsParams = state.scout.strategyLab?.gsParams || { entryRatio: 75, exitRatio: 50, maxDays: 180 };
  const momentumParams = state.scout.strategyLab?.momentumParams || { asset: "AGQ", triggerPct: -3 };

  const tabMom = activeStrategy === "momentum" ? "lab-tab lab-tab--active" : "lab-tab";
  const tabVix = activeStrategy === "vix" ? "lab-tab lab-tab--active" : "lab-tab";
  const tabGs  = activeStrategy === "gs"  ? "lab-tab lab-tab--active" : "lab-tab";

  let content;
  if (activeStrategy === "vix") content = renderVixLabV2(lab?.vix, lab?.vixMultiHorizon, vixParams, model);
  else if (activeStrategy === "gs") content = renderGoldSilverLabV2(lab?.goldSilver, gsParams, model);
  else content = renderMomentumModule(lab?.momentumResult, state.scout.strategyLab?.momentumParams || {}, model);

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="scout-section-label">Research &amp; Backtest</p>
          <h2>Strategy Lab</h2>
          <p class="panel-subtitle">Momentum patterns, historical backtests, rule-based signals. Every entry rule explicit, every trade visible.</p>
        </div>
        <span class="status-pill ${getScoutStatusClass(model.dataStatus)}">${escapeHtml(model.dataStatus)}</span>
      </div>
      <div class="lab-tabs">
        <button type="button" class="${tabMom}" data-lab-strategy="momentum">Momentum Analysis</button>
        <button type="button" class="${tabVix}" data-lab-strategy="vix">VIX Spike Entry</button>
        <button type="button" class="${tabGs}" data-lab-strategy="gs">Gold/Silver Reversion</button>
      </div>
      ${content}
    </section>
  `;
}

function renderVixLabV2(result, multiHorizon, params, model) {
  const noData = !result || result.tradeCount === 0;
  const signal = buildVixSignal(model);

  const thresholdOptions = [15, 20, 25, 30, 35, 40].map((t) =>
    `<option value="${t}" ${params.threshold === t ? "selected" : ""}>${t}</option>`
  ).join("");

  const paramForm = `
    <div class="lab-params">
      <p class="lab-params__title">Parameters</p>
      <form data-lab-form="vix">
        <div class="lab-field">
          <label for="vix-threshold-sel">VIX entry threshold</label>
          <select id="vix-threshold-sel" name="vix-threshold">${thresholdOptions}</select>
        </div>
        <button type="submit" class="button button--primary button--small" style="width:100%;margin-top:0.6rem">Run Backtest</button>
      </form>
      <div style="margin-top:1rem;padding:0.75rem;background:var(--bg-softer);border-radius:6px;font-size:0.72rem;line-height:1.6">
        <p style="font-weight:600;margin-bottom:0.4rem;color:var(--text-primary)">Strategy Rules</p>
        <p><strong>Entry:</strong> Buy SPY when VIX closes ≥ ${params.threshold}</p>
        <p><strong>Exit:</strong> After ${params.horizon} trading days, OR when VIX drops below ${Math.round(params.threshold * 0.72)} (normalized)</p>
        <p><strong>No pyramiding:</strong> One trade at a time. 1-day cooldown after exit.</p>
        <p style="margin-top:0.4rem;color:var(--text-muted)">Vehicle: SPY. No transaction costs assumed. Returns are SPY exit/entry − 1.</p>
      </div>
    </div>
  `;

  if (noData) {
    return `
      <div class="lab-layout">
        <div class="lab-sidebar">${paramForm}</div>
        <div class="lab-results">
          ${renderSignalBox(signal)}
          ${renderHowItWorks("vix")}
          <div class="lab-empty" style="text-align:left">No trades triggered with VIX ≥ ${params.threshold}. Try lowering the threshold.</div>
        </div>
      </div>
    `;
  }

  // Multi-horizon summary table
  const horizonRows = (multiHorizon || []).map((h) => {
    if (!h || h.tradeCount === 0) return `<tr><td>${escapeHtml(h?.label || "—")}</td><td colspan="4" class="val-muted">No data</td></tr>`;
    const retClass = h.avgReturn >= 0 ? "pos" : "neg";
    const wrClass = h.winRate >= 50 ? "pos" : "neg";
    return `
      <tr>
        <td><strong>${escapeHtml(h.label)}</strong></td>
        <td class="${retClass}">${h.avgReturn >= 0 ? "+" : ""}${h.avgReturn?.toFixed(1)}%</td>
        <td class="${wrClass}">${h.winRate?.toFixed(0)}%</td>
        <td>${h.tradeCount}</td>
        <td class="pos">+${h.maxReturn?.toFixed(1)}%</td>
        <td class="neg">${h.minReturn?.toFixed(1)}%</td>
      </tr>
    `;
  }).join("");

  // Regime context: what VIX level are we in now vs backtest entries?
  const vixLabData = model.macroResearch?.strategyLabData?.VIX || [];
  const currentVix = vixLabData.length ? vixLabData[vixLabData.length-1]?.value : null;
  const regimeNote = currentVix !== null ? (() => {
    if (currentVix >= params.threshold)
      return `<div class="verdict-bar verdict-no" style="margin-bottom:0.75rem">VIX currently ${currentVix.toFixed(1)} — AT or ABOVE the ${params.threshold} threshold. Setup is LIVE. Forward returns in the backtest have averaged ${result.avgReturn >= 0 ? "+" : ""}${result.avgReturn?.toFixed(1)}% across all triggered periods.</div>`;
    if (currentVix >= params.threshold * 0.8)
      return `<div class="verdict-bar verdict-mixed" style="margin-bottom:0.75rem">VIX currently ${currentVix.toFixed(1)} — approaching the ${params.threshold} threshold (${(params.threshold - currentVix).toFixed(1)} pts away). Monitor for spike to trigger zone.</div>`;
    return `<div class="verdict-bar verdict-neutral" style="margin-bottom:0.75rem">VIX currently ${currentVix.toFixed(1)} — well below the ${params.threshold} threshold. Setup not active. This backtest applies when VIX spikes to current params.</div>`;
  })() : "";

  const multiHorizonTable = `
    <div class="vix-horizon-block">
      <p class="lab-block-title">How long to hold? — Forward Returns by Holding Period</p>
      <p class="lab-block-sub">Same entry rule (VIX ≥ ${params.threshold}), different exit timing. Each row answers: if I bought SPY on the spike day and held for exactly N days, what happened on average?<br><strong>Win Rate</strong> = % of trades where SPY was higher at exit than at entry. <strong>Avg Return</strong> = mean SPY return across all triggered trades at that horizon.</p>
      <div class="table-wrap">
        <table class="lab-trade-table">
          <thead><tr><th>Hold period</th><th>Avg SPY return</th><th>Win Rate</th><th>Trades (n)</th><th>Best trade</th><th>Worst trade</th></tr></thead>
          <tbody>${horizonRows}</tbody>
        </table>
      </div>
    </div>
  `;

  // Return distribution (text bar chart, no canvas needed)
  const maxCount = Math.max(...(result.buckets || []).map((b) => b.count), 1);
  const distBars = (result.buckets || []).map((b) => {
    const pct = Math.round((b.count / maxCount) * 100);
    const isPos = b.label.startsWith("0") || b.label.startsWith("5") || b.label.startsWith("> ");
    return `
      <div class="lab-dist-bar-wrap">
        <div class="lab-dist-bar ${isPos ? "lab-dist-bar--pos" : ""}" style="height:${Math.max(pct, 2)}%"></div>
        <span>${escapeHtml(b.label)}</span>
      </div>
    `;
  }).join("");

  // Metric definitions block
  const metricDefs = `
    <div class="lab-methodology" style="margin-bottom:0.75rem">
      <p class="lab-methodology__title">How to read these metrics</p>
      <div class="lab-methodology__grid">
        <div class="lab-methodology__row"><span class="lab-methodology__key">Trades (n)</span><span class="lab-methodology__val">Total number of historical days where VIX closed ≥ threshold. Each = one entry.</span></div>
        <div class="lab-methodology__row"><span class="lab-methodology__key">Win Rate</span><span class="lab-methodology__val">% of trades where SPY was higher at exit than at entry. Win = positive return on SPY from entry to exit.</span></div>
        <div class="lab-methodology__row"><span class="lab-methodology__key">Avg Return</span><span class="lab-methodology__val">Simple average of (SPY exit price / SPY entry price − 1) across all triggered trades. Not compounded.</span></div>
        <div class="lab-methodology__row"><span class="lab-methodology__key">Best / Worst</span><span class="lab-methodology__val">Single best and worst trade return in the backtest history.</span></div>
        <div class="lab-methodology__row"><span class="lab-methodology__key">Exit reason</span><span class="lab-methodology__val">"${params.horizon}D horizon" = held full period. "VIX normalized" = VIX dropped below exit level before horizon.</span></div>
      </div>
    </div>
  `;

  // Stats strip
  const statsHtml = `
    <div class="lab-stats-row">
      <div class="lab-stat"><span class="lab-stat__label">Trades (n)</span><span class="lab-stat__value lab-stat__value--muted">${result.tradeCount}</span></div>
      <div class="lab-stat"><span class="lab-stat__label">Win Rate</span><span class="lab-stat__value ${result.winRate >= 50 ? "lab-stat__value--positive" : "lab-stat__value--negative"}">${result.winRate?.toFixed(0)}%</span></div>
      <div class="lab-stat"><span class="lab-stat__label">Avg Return</span><span class="lab-stat__value ${result.avgReturn >= 0 ? "lab-stat__value--positive" : "lab-stat__value--negative"}">${result.avgReturn >= 0 ? "+" : ""}${result.avgReturn?.toFixed(1)}%</span></div>
      <div class="lab-stat"><span class="lab-stat__label">Best</span><span class="lab-stat__value lab-stat__value--positive">+${result.maxReturn?.toFixed(1)}%</span></div>
      <div class="lab-stat"><span class="lab-stat__label">Worst</span><span class="lab-stat__value lab-stat__value--negative">${result.minReturn?.toFixed(1)}%</span></div>
    </div>
  `;

  // Trade table (last 12)
  const tradeRows = (result.trades || []).slice(-12).reverse().map((t) => {
    const rc = t.returnPct >= 0 ? "pos" : "neg";
    return `<tr>
      <td>${escapeHtml(t.entryDate)}</td>
      <td>${escapeHtml(t.exitDate)}</td>
      <td class="right">${t.entryVix?.toFixed(1)}</td>
      <td class="right ${rc}">${t.returnPct >= 0 ? "+" : ""}${t.returnPct?.toFixed(1)}%</td>
      <td class="val-muted">${t.daysHeld}D</td>
      <td class="val-muted" style="font-size:0.65rem">${escapeHtml(t.exitReason || "")}</td>
    </tr>`;
  }).join("");

  return `
    <div class="lab-layout">
      <div class="lab-sidebar">${paramForm}</div>
      <div class="lab-results">
        ${renderSignalBox(signal)}
        ${renderHowItWorks("vix")}
        ${regimeNote}
        ${metricDefs}
        ${statsHtml}
        ${multiHorizonTable}
        <div>
          <p class="lab-block-title">Return Distribution</p>
          <div class="lab-dist-bars">${distBars}</div>
        </div>
        <div class="lab-chart-block">
          <p class="lab-block-title">SPY + VIX — Entry &amp; Exit Markers</p>
          <p class="lab-block-sub">Green triangles = entries (VIX ≥ ${params.threshold}). Circles = exits (green = win, red = loss). Last 500 trading days.</p>
          <div class="lab-chart-wrap"><canvas id="scout-vix-chart" height="220"></canvas></div>
        </div>
        <div>
          <p class="lab-block-title">Last 12 Triggered Trades</p>
          <p class="lab-block-sub">Each row = one historical instance where VIX closed ≥ ${params.threshold}. Entry = SPY price on that day. Return = SPY at exit ÷ SPY at entry − 1.</p>
          <div class="table-wrap"><table class="lab-trade-table">
            <thead><tr><th>Entry date</th><th>Exit date</th><th class="right">VIX at entry</th><th class="right">SPY return</th><th>Days held</th><th>Why it exited</th></tr></thead>
            <tbody>${tradeRows}</tbody>
          </table></div>
        </div>
      </div>
    </div>
  `;
}

function renderVixLab(result, params) {
  const noData = !result || result.tradeCount === 0;
  const horizonOptions = [5, 10, 20, 60].map((h) =>
    `<option value="${h}" ${params.horizon === h ? "selected" : ""}>${h}D</option>`
  ).join("");
  const thresholdOptions = [15, 20, 25, 30, 35, 40].map((t) =>
    `<option value="${t}" ${params.threshold === t ? "selected" : ""}>${t}</option>`
  ).join("");

  const methodology = `
    <div class="lab-methodology">
      <p class="lab-methodology__title">Methodology — VIX Entry Strategy</p>
      <div class="lab-methodology__grid">
        <div class="lab-methodology__row"><span class="lab-methodology__key">What:</span><span class="lab-methodology__val">Buy SPY when VIX closes at or above the entry threshold.</span></div>
        <div class="lab-methodology__row"><span class="lab-methodology__key">Why:</span><span class="lab-methodology__val">VIX spikes reflect extreme fear, which historically overshoots; mean-reversion creates equity entry opportunity.</span></div>
        <div class="lab-methodology__row"><span class="lab-methodology__key">Entry:</span><span class="lab-methodology__val">VIX ≥ ${params.threshold} on close. One trade active at a time. 1-day cooldown after exit.</span></div>
        <div class="lab-methodology__row"><span class="lab-methodology__key">Exit:</span><span class="lab-methodology__val">After ${params.horizon} trading days OR when VIX drops below ${Math.round(params.threshold * 0.72)} (≈72% of entry level).</span></div>
        <div class="lab-methodology__row"><span class="lab-methodology__key">Returns:</span><span class="lab-methodology__val">SPY exit price / SPY entry price − 1. No compounding across trades. No cost assumption.</span></div>
        <div class="lab-methodology__row"><span class="lab-methodology__key">Data:</span><span class="lab-methodology__val">SPY daily close, ^VIX daily close (Yahoo Finance). ${result?.dataRange ? `${result.dataRange.start} – ${result.dataRange.end}` : "Simulated series"}</span></div>
      </div>
    </div>
  `;

  const paramForm = `
    <div class="lab-params">
      <p class="lab-params__title">Parameters</p>
      <form data-lab-form="vix">
        <div class="lab-field">
          <label for="vix-threshold-sel">VIX entry threshold</label>
          <select id="vix-threshold-sel" name="vix-threshold">${thresholdOptions}</select>
        </div>
        <div class="lab-field">
          <label for="vix-horizon-sel">Holding period</label>
          <select id="vix-horizon-sel" name="vix-horizon">${horizonOptions}</select>
        </div>
        <button type="submit" class="button button--primary button--small" style="width:100%;margin-top:0.6rem">Run Backtest</button>
      </form>
    </div>
    <div class="lab-rationale">
      <strong>Why this works (when it does)</strong>
      Implied volatility tends to mean-revert. A VIX spike above ${params.threshold} signals elevated fear — historically, the next ${params.horizon} days of SPY returns have skewed positive as sentiment normalizes. This is not a guaranteed edge; large vol spikes that persist (2008, 2020 drawdown) can hurt.
    </div>
  `;

  if (noData) {
    return `
      <div class="lab-layout">
        <div class="lab-sidebar">${paramForm}</div>
        <div class="lab-empty">No trades triggered with VIX ≥ ${params.threshold} in available data. Try lowering the threshold.</div>
      </div>
    `;
  }

  const avgClass = result.avgReturn > 0 ? "lab-stat__value--positive" : "lab-stat__value--negative";
  const minClass = result.minReturn < 0 ? "lab-stat__value--negative" : "lab-stat__value--positive";

  const stats = `
    <div class="lab-stats-row">
      <div class="lab-stat">
        <span class="lab-stat__label">Trades</span>
        <span class="lab-stat__value lab-stat__value--muted">${result.tradeCount}</span>
      </div>
      <div class="lab-stat">
        <span class="lab-stat__label">Win Rate</span>
        <span class="lab-stat__value ${result.winRate >= 50 ? "lab-stat__value--positive" : "lab-stat__value--negative"}">${result.winRate?.toFixed(1)}%</span>
      </div>
      <div class="lab-stat">
        <span class="lab-stat__label">Avg Return</span>
        <span class="lab-stat__value ${avgClass}">${result.avgReturn >= 0 ? "+" : ""}${result.avgReturn?.toFixed(2)}%</span>
      </div>
      <div class="lab-stat">
        <span class="lab-stat__label">Best Trade</span>
        <span class="lab-stat__value lab-stat__value--positive">+${result.maxReturn?.toFixed(2)}%</span>
      </div>
      <div class="lab-stat">
        <span class="lab-stat__label">Worst Trade</span>
        <span class="lab-stat__value ${minClass}">${result.minReturn?.toFixed(2)}%</span>
      </div>
    </div>
  `;

  const maxCount = Math.max(...result.buckets.map((b) => b.count), 1);
  const distBars = result.buckets.map((b) => {
    const heightPct = Math.round((b.count / maxCount) * 100);
    return `
      <div class="lab-dist-bar-wrap">
        <div class="lab-dist-bar" style="height:${heightPct}%"></div>
        <span>${escapeHtml(b.label)}</span>
      </div>
    `;
  }).join("");

  const tradeRows = result.trades.slice(-15).reverse().map((t) => {
    const retClass = t.returnPct >= 0 ? "pos" : "neg";
    return `
      <tr>
        <td>${escapeHtml(t.entryDate)}</td>
        <td>${escapeHtml(t.exitDate)}</td>
        <td class="right">${t.entryVix?.toFixed(1)}</td>
        <td class="right ${retClass}">${t.returnPct >= 0 ? "+" : ""}${t.returnPct?.toFixed(2)}%</td>
        <td>${t.daysHeld}D</td>
        <td class="val-muted" style="font-size:0.68rem;color:var(--text-muted)">${escapeHtml(t.exitReason)}</td>
      </tr>
    `;
  }).join("");

  return `
    <div class="lab-layout">
      <div class="lab-sidebar">
        ${paramForm}
      </div>
      <div class="lab-results">
        ${methodology}
        ${stats}
        <div>
          <p class="scout-section-label" style="margin-bottom:0.4rem">Return Distribution (${result.tradeCount} trades)</p>
          <div class="lab-dist-bars">${distBars}</div>
        </div>
        <div>
          <p class="scout-section-label" style="margin-bottom:0.5rem">Last 15 Trades (most recent first)</p>
          <div class="table-wrap">
            <table class="lab-trade-table">
              <thead>
                <tr>
                  <th>Entry</th><th>Exit</th><th class="right">VIX at entry</th><th class="right">Return</th><th>Held</th><th>Exit reason</th>
                </tr>
              </thead>
              <tbody>${tradeRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderGoldSilverLabV2(result, params, model) {
  const noData = !result || result.tradeCount === 0;
  const signal = buildGoldSilverSignal(model);

  const entryOptions = [60, 65, 70, 75, 80, 85, 90].map((r) =>
    `<option value="${r}" ${params.entryRatio === r ? "selected" : ""}>${r}</option>`
  ).join("");
  const exitOptions = [40, 45, 50, 55, 60, 65].map((r) =>
    `<option value="${r}" ${params.exitRatio === r ? "selected" : ""}>${r}</option>`
  ).join("");

  const paramForm = `
    <div class="lab-params">
      <p class="lab-params__title">Parameters</p>
      <form data-lab-form="gs">
        <div class="lab-field">
          <label for="gs-entry-sel">Entry: ratio ≥</label>
          <select id="gs-entry-sel" name="gs-entry-ratio">${entryOptions}</select>
        </div>
        <div class="lab-field">
          <label for="gs-exit-sel">Exit: ratio ≤</label>
          <select id="gs-exit-sel" name="gs-exit-ratio">${exitOptions}</select>
        </div>
        <div class="lab-field">
          <label for="gs-maxdays">Max hold (days)</label>
          <input id="gs-maxdays" name="gs-max-days" type="number" value="${params.maxDays}" min="30" max="500" />
        </div>
        <button type="submit" class="button button--primary button--small" style="width:100%;margin-top:0.6rem">Run Backtest</button>
      </form>
    </div>
  `;

  if (noData) {
    return `
      <div class="lab-layout">
        <div class="lab-sidebar">${paramForm}</div>
        <div class="lab-results">
          ${renderSignalBox(signal)}
          ${renderHowItWorks("gs")}
          <div class="lab-empty" style="text-align:left">No trades with ratio ≥ ${params.entryRatio} → ≤ ${params.exitRatio}. Try adjusting parameters.</div>
        </div>
      </div>
    `;
  }

  // Live regime note for GS strategy
  const gsRatioNow = result?.ratioHistory?.length ? result.ratioHistory[result.ratioHistory.length - 1]?.value : null;
  const gsRegimeNote = gsRatioNow !== null ? (() => {
    if (gsRatioNow >= params.entryRatio)
      return `<div class="verdict-bar verdict-no" style="margin-bottom:0.75rem">Ratio at ${gsRatioNow.toFixed(1)} — AT or ABOVE trigger (${params.entryRatio}). Setup is ACTIVE. SIL historical avg per trade: ${result.avgReturn >= 0 ? "+" : ""}${result.avgReturn?.toFixed(1)}%.</div>`;
    if (gsRatioNow >= params.entryRatio * 0.87)
      return `<div class="verdict-bar verdict-mixed" style="margin-bottom:0.75rem">Ratio at ${gsRatioNow.toFixed(1)} — approaching trigger ${params.entryRatio} (${(params.entryRatio - gsRatioNow).toFixed(1)} pts away). Watch for further silver weakness vs gold.</div>`;
    return `<div class="verdict-bar verdict-neutral" style="margin-bottom:0.75rem">Ratio at ${gsRatioNow.toFixed(1)} — well below trigger ${params.entryRatio}. Setup not active. Gold and silver roughly in line historically.</div>`;
  })() : "";

  const statsHtml = `
    <div class="lab-stats-row">
      <div class="lab-stat"><span class="lab-stat__label">Trades (n)</span><span class="lab-stat__value lab-stat__value--muted">${result.tradeCount}</span></div>
      <div class="lab-stat"><span class="lab-stat__label">Win Rate</span><span class="lab-stat__value ${result.winRate >= 50 ? "lab-stat__value--positive" : "lab-stat__value--negative"}">${result.winRate?.toFixed(0)}%</span></div>
      <div class="lab-stat"><span class="lab-stat__label">Avg Return (SIL)</span><span class="lab-stat__value ${result.avgReturn >= 0 ? "lab-stat__value--positive" : "lab-stat__value--negative"}">${result.avgReturn >= 0 ? "+" : ""}${result.avgReturn?.toFixed(1)}%</span></div>
      <div class="lab-stat"><span class="lab-stat__label">Best</span><span class="lab-stat__value lab-stat__value--positive">+${result.maxReturn?.toFixed(1)}%</span></div>
      <div class="lab-stat"><span class="lab-stat__label">Worst</span><span class="lab-stat__value lab-stat__value--negative">${result.minReturn?.toFixed(1)}%</span></div>
    </div>
  `;

  const tradeRows = (result.trades || []).slice(-12).reverse().map((t) => {
    const rc = t.returnPct >= 0 ? "pos" : "neg";
    const ratioC = t.ratioChange < 0 ? "pos" : "neg";
    return `<tr>
      <td>${escapeHtml(t.entryDate)}</td>
      <td>${escapeHtml(t.exitDate)}</td>
      <td class="right">${t.entryRatio?.toFixed(1)}</td>
      <td class="right">${t.exitRatio?.toFixed(1)}</td>
      <td class="right ${ratioC}">${t.ratioChange >= 0 ? "+" : ""}${t.ratioChange?.toFixed(1)}</td>
      <td class="right ${rc}">${t.returnPct >= 0 ? "+" : ""}${t.returnPct?.toFixed(1)}%</td>
      <td class="val-muted">${t.daysHeld}D</td>
    </tr>`;
  }).join("");

  return `
    <div class="lab-layout">
      <div class="lab-sidebar">${paramForm}</div>
      <div class="lab-results">
        ${renderSignalBox(signal)}
        ${renderHowItWorks("gs")}
        ${gsRegimeNote}
        ${statsHtml}
        <div class="lab-methodology" style="margin-bottom:0.75rem">
          <p class="lab-methodology__title">How to read these metrics</p>
          <div class="lab-methodology__grid">
            <div class="lab-methodology__row"><span class="lab-methodology__key">Trades (n)</span><span class="lab-methodology__val">Total historical entries: days where ratio crossed ≥ ${params.entryRatio}. One trade active at a time.</span></div>
            <div class="lab-methodology__row"><span class="lab-methodology__key">Win Rate</span><span class="lab-methodology__val">% of closed trades where SIL was higher at exit than at entry. Win = positive SIL return.</span></div>
            <div class="lab-methodology__row"><span class="lab-methodology__key">Avg Return (SIL)</span><span class="lab-methodology__val">Average of (SIL exit / SIL entry − 1) across all trades. Measures silver miners' return per trade.</span></div>
            <div class="lab-methodology__row"><span class="lab-methodology__key">Ratio Δ</span><span class="lab-methodology__val">Change in gold/silver ratio from entry to exit. Negative = ratio compressed (silver outperformed gold).</span></div>
            <div class="lab-methodology__row"><span class="lab-methodology__key">Equity Curve</span><span class="lab-methodology__val">Hypothetical $100 starting value applied to each trade sequentially, not compounded across trades. Shows cumulative P&amp;L path of the strategy over history.</span></div>
          </div>
        </div>
        <div class="lab-chart-block">
          <p class="lab-block-title">Gold/Silver Ratio — Full History with Trade Entries/Exits</p>
          <p class="lab-block-sub">Blue line = GLD×10/SLV ratio. ▲ Green = entries (ratio ≥ ${params.entryRatio}). ● Red = exits. Dashed lines = entry/exit thresholds.</p>
          <div class="lab-chart-wrap"><canvas id="scout-gs-ratio-chart" height="200"></canvas></div>
        </div>
        <div class="lab-chart-block">
          <p class="lab-block-title">SIL Equity Curve — $100 applied to each trade, not compounded</p>
          <p class="lab-block-sub">Each dot = one closed trade (green = win, red = loss). Flat sections = no active trade. This shows if the strategy compounds positively over history.</p>
          <div class="lab-chart-wrap"><canvas id="scout-gs-equity-chart" height="150"></canvas></div>
        </div>
        <div>
          <p class="lab-block-title">Last 12 Closed Trades — most recent first</p>
          <p class="lab-block-sub">Entry = day ratio crossed ≥ ${params.entryRatio}. Exit = ratio fell to ≤ ${params.exitRatio} or max holding period reached. Return = SIL exit price / SIL entry price − 1.</p>
          <div class="table-wrap"><table class="lab-trade-table">
            <thead><tr><th>Entry</th><th>Exit</th><th class="right">Entry ratio</th><th class="right">Exit ratio</th><th class="right">Ratio Δ</th><th class="right">SIL return</th><th>Held</th></tr></thead>
            <tbody>${tradeRows}</tbody>
          </table></div>
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Momentum Analysis — replaces Drop & Bounce
// Shows: Bullish / Bearish / Neutral state per asset, based on 20D return + RSI-14
// Uses price series from strategyLabData. No intraday. Daily closes only.
// ---------------------------------------------------------------------------

function renderMomentumAnalysis(model) {
  const labData = model.macroResearch?.strategyLabData || {};
  const agqM = model.macroResearch?.agqMomentum;
  const sr = buildSimplifiedRegime(model);

  const ASSETS = ["AGQ", "RING", "GLD", "SIL", "TIP", "TLT", "COPX", "URA"];

  const signals = ASSETS.map((sym) => {
    const series = labData[sym] || [];
    if (series.length < 22) return { sym, state: "NO DATA", stateColor: "#6b7280", r5: null, r20: null, rsi: null };

    const latest = series[series.length - 1].value;
    const p5  = series[series.length - 6]?.value;
    const p20 = series[series.length - 21]?.value;
    const r5  = p5  ? ((latest / p5  - 1) * 100) : null;
    const r20 = p20 ? ((latest / p20 - 1) * 100) : null;

    // RSI-14 (Wilder smoothing approximation with simple avg for first period)
    let gains = 0, losses = 0, count = 0;
    for (let i = series.length - 14; i < series.length; i++) {
      if (i < 1) continue;
      const d = series[i].value - series[i - 1].value;
      if (d > 0) gains += d; else losses -= d;
      count++;
    }
    const avgGain = count > 0 ? gains / count : 0;
    const avgLoss = count > 0 ? losses / count : 0;
    const rs  = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = Math.round(100 - 100 / (1 + rs));

    let state, stateColor;
    if ((r20 ?? 0) > 2 && rsi > 55)      { state = "BULLISH";  stateColor = "var(--positive)"; }
    else if ((r20 ?? 0) < -2 && rsi < 45) { state = "BEARISH";  stateColor = "var(--negative)"; }
    else                                   { state = "NEUTRAL";  stateColor = "#94a3b8"; }

    // Regime context: is this asset favored by current regime?
    const regimeFavor = sr.favorStrategies.some((s) => s.includes(sym));

    return {
      sym, state, stateColor,
      r5: r5 !== null ? r5.toFixed(1) : null,
      r20: r20 !== null ? r20.toFixed(1) : null,
      rsi: String(rsi),
      regimeFavor,
    };
  });

  const cards = signals.map((s) => `
    <div class="momentum-signal-card">
      <div class="momentum-signal-card__head">
        <strong class="momentum-signal-card__sym">${escapeHtml(s.sym)}</strong>
        <span class="momentum-signal-card__state" style="color:${s.stateColor}">${escapeHtml(s.state)}</span>
      </div>
      <div class="momentum-signal-card__stats">
        ${s.r5  !== null ? `<span class="momentum-signal-card__stat"><em>5D</em>${parseFloat(s.r5)  >= 0 ? "+" : ""}${s.r5}%</span>` : ""}
        ${s.r20 !== null ? `<span class="momentum-signal-card__stat"><em>20D</em>${parseFloat(s.r20) >= 0 ? "+" : ""}${s.r20}%</span>` : ""}
        ${s.rsi !== null ? `<span class="momentum-signal-card__stat"><em>RSI</em>${s.rsi}</span>` : ""}
      </div>
      ${s.regimeFavor ? `<div class="momentum-signal-card__regime-flag">Regime-favored</div>` : ""}
    </div>
  `).join("");

  // AGQ overlay from macro engine (if available)
  const agqBlockHtml = agqM?.available ? (() => {
    const m = agqM;
    const trendCls = m.trend === 1 ? "momentum-signal-card__state" : m.trend === -1 ? "momentum-signal-card__state" : "";
    const trendColor = m.trend === 1 ? "var(--positive)" : m.trend === -1 ? "var(--negative)" : "#94a3b8";
    const fmtR = (v) => v !== null && v !== undefined ? `${v > 0 ? "+" : ""}${Number(v).toFixed(1)}%` : "—";
    return `
      <div class="momentum-agq-detail">
        <p class="lab-block-title">AGQ — Detailed Signal</p>
        <div class="momentum-agq-detail__row">
          <span>Trend</span><strong style="color:${trendColor}">${escapeHtml(m.trendLabel)}</strong>
        </div>
        <div class="momentum-agq-detail__row">
          <span>5D / 20D / 60D / 120D</span>
          <strong>${escapeHtml(fmtR(m.returns?.r5))} / ${escapeHtml(fmtR(m.returns?.r20))} / ${escapeHtml(fmtR(m.returns?.r60))} / ${escapeHtml(fmtR(m.returns?.r120))}</strong>
        </div>
        <div class="momentum-agq-detail__row">
          <span>RSI-14</span>
          <strong style="color:${m.overbought ? "var(--negative)" : m.oversold ? "var(--positive)" : "inherit"}">${m.rsi14}${m.overbought ? " (Overbought)" : m.oversold ? " (Oversold)" : ""}</strong>
        </div>
        <div class="momentum-agq-detail__row">
          <span>Regime alignment</span>
          <strong style="color:${sr.favorStrategies.some((s) => s.includes("AGQ")) ? "var(--positive)" : "inherit"}">${escapeHtml(sr.label)}</strong>
        </div>
      </div>
    `;
  })() : "";

  return `
    <div class="momentum-analysis">
      <p class="momentum-analysis__note">Daily momentum signals based on 20D returns and RSI-14. No intraday data — daily closes only. "Bullish" = positive momentum + RSI > 55. "Bearish" = negative + RSI < 45.</p>
      <div class="momentum-signals">${cards}</div>
      ${agqBlockHtml}
    </div>
  `;
}

function renderMomentumModule(result, params, model) {
  const ASSETS = ["AGQ", "SLV", "GLD", "RING", "GDX", "SPY"];
  const TRIGGERS = [1, 2, 3, 4, 5];
  const activeAsset = params.asset || "AGQ";
  const activeDirection = params.direction || "down";
  const activeTriggerAbs = Math.abs(params.triggerPct ?? 3);
  const isDown = activeDirection === "down";

  const assetTabs = ASSETS.map((a) =>
    `<button class="trigger-tab ${a === activeAsset ? "trigger-tab--active" : ""}" data-momentum-asset="${escapeHtml(a)}">${a}</button>`
  ).join("");

  // Trigger tabs — stored value is signed, display is absolute
  const triggerTabs = TRIGGERS.map((t) => {
    const stored = isDown ? -t : t;
    return `<button class="trigger-tab ${t === activeTriggerAbs ? "trigger-tab--active" : ""}" data-momentum-trigger="${stored}" style="font-size:11px">${t}%</button>`;
  }).join("");

  const noData = !result || !result.horizons || result.totalEvents === 0;
  const col1Label = isDown ? "Bounce %" : "Continues %";
  const col2Label = isDown ? "Continues %" : "Reversal %";

  // Verdict based on 5D horizon
  let verdictHtml;
  if (noData) {
    verdictHtml = `<div class="verdict-bar verdict-neutral">No events found for ${activeAsset} ${isDown ? "drops" : "rises"} ≥${activeTriggerAbs}%. Try a smaller trigger or different asset.</div>`;
  } else {
    const h5 = result.horizons.find((h) => h.horizon === 5);
    if (!h5 || h5.n < 5) {
      verdictHtml = `<div class="verdict-bar verdict-neutral">Not enough 5D samples yet (n=${h5?.n ?? 0}, need ≥5).</div>`;
    } else {
      const edge = (h5.bounceRate || 0) - (h5.contRate || 0);
      let cls, text;
      if (isDown) {
        if (edge > 10)       { cls = "verdict-no";    text = `Bounce edge: after ${activeAsset} drops ≥${activeTriggerAbs}%, price is higher 5D later in ${h5.bounceRate?.toFixed(0)}% of cases. Avg: ${h5.avgReturn >= 0 ? "+" : ""}${h5.avgReturn?.toFixed(1)}%. n=${h5.n}.`; }
        else if (edge < -10) { cls = "verdict-go";    text = `Continuation: drop tends to persist. Price still lower 5D later in ${h5.contRate?.toFixed(0)}% of cases. Avg: ${h5.avgReturn?.toFixed(1)}%. n=${h5.n}.`; }
        else                 { cls = "verdict-mixed"; text = `Near coin-flip at 5D after ≥${activeTriggerAbs}% drop (bounce ${h5.bounceRate?.toFixed(0)}% vs cont ${h5.contRate?.toFixed(0)}%). No reliable edge. n=${h5.n}.`; }
      } else {
        if (edge > 10)       { cls = "verdict-no";    text = `Momentum continues: after ${activeAsset} rises ≥${activeTriggerAbs}%, price is still higher 5D later in ${h5.bounceRate?.toFixed(0)}% of cases. Avg: +${h5.avgReturn?.toFixed(1)}%. n=${h5.n}.`; }
        else if (edge < -10) { cls = "verdict-go";    text = `Mean reversion: rise tends to reverse. Price lower 5D later in ${h5.contRate?.toFixed(0)}% of cases. Avg: ${h5.avgReturn?.toFixed(1)}%. n=${h5.n}.`; }
        else                 { cls = "verdict-mixed"; text = `No clear edge at 5D after ≥${activeTriggerAbs}% rise. Near coin-flip. n=${h5.n}.`; }
      }
      verdictHtml = `<div class="verdict-bar ${cls}">${escapeHtml(text)}</div>`;
    }
  }

  const tableRows = noData ? "" : result.horizons.map((h) => {
    if (!h.n || h.n < 3) return `<tr><td>${escapeHtml(h.label)}</td><td colspan="6" class="val-muted">— too few events</td></tr>`;
    const col1Cls = (h.bounceRate || 0) > 55 ? "pos" : (h.bounceRate || 0) < 45 ? "neg" : "";
    const col2Cls = (h.contRate || 0) > 55 ? "neg" : "";
    const retCls  = (h.avgReturn || 0) >= 0 ? "pos" : "neg";
    return `<tr>
      <td><strong>${escapeHtml(h.label)}</strong></td>
      <td class="right val-muted">${h.n}</td>
      <td class="right ${col1Cls}">${h.bounceRate?.toFixed(0)}%</td>
      <td class="right ${col2Cls}">${h.contRate?.toFixed(0)}%</td>
      <td class="right ${retCls}">${h.avgReturn >= 0 ? "+" : ""}${h.avgReturn?.toFixed(1)}%</td>
      <td class="right pos">+${h.maxReturn?.toFixed(1)}%</td>
      <td class="right neg">${h.minReturn?.toFixed(1)}%</td>
    </tr>`;
  }).join("");

  const recentHtml = (result?.recentEvents || []).length ? `
    <div style="margin-top:0.75rem">
      <p class="lab-block-title">Recent Triggers — last ${result.recentEvents.length} events</p>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:0.3rem">
        ${result.recentEvents.map((e) => `
          <span style="font-size:0.7rem;padding:2px 8px;border-radius:4px;background:var(--bg-softer);color:${e.triggerReturn < 0 ? "var(--positive)" : "var(--negative)"}">
            ${escapeHtml(e.date)} ${e.triggerReturn >= 0 ? "+" : ""}${e.triggerReturn?.toFixed(1)}%
          </span>
        `).join("")}
      </div>
    </div>
  ` : "";

  // Multi-asset momentum snapshot at top of tab
  const SNAP_ASSETS = ["AGQ", "SLV", "GLD", "RING", "SPY", "VIX"];
  const labDataSnap = model.macroResearch?.strategyLabData || {};
  const snapRows = SNAP_ASSETS.map((sym) => {
    const s = labDataSnap[sym] || [];
    if (s.length < 22) return `<tr><td>${sym}</td><td colspan="4" class="val-muted right">—</td></tr>`;
    const now = s[s.length-1]?.value;
    const p5  = s[s.length-6]?.value, p20 = s[s.length-21]?.value;
    const r5  = p5  ? ((now/p5-1)*100)  : null;
    const r20 = p20 ? ((now/p20-1)*100) : null;
    let g=0,l=0;
    for (let i=s.length-14;i<s.length;i++) {
      const d=s[i].value-(s[i-1]?.value||s[i].value);
      if(d>0) g+=d; else l-=d;
    }
    const rsi=Math.round(100-100/(1+(l===0?100:g/l)));
    const trend = r20 !== null && r5 !== null
      ? (r5 > 1.5 && r20 > 0 ? "BULL" : r5 < -1.5 && r20 < 0 ? "BEAR" : "FLAT")
      : "—";
    const trendCls = trend === "BULL" ? "pos" : trend === "BEAR" ? "neg" : "val-muted";
    return `
      <tr>
        <td><strong>${sym}</strong></td>
        <td class="right ${r5!==null&&r5>=0?"pos":"neg"}">${r5!==null?(r5>=0?"+":"")+r5.toFixed(1)+"%":"—"}</td>
        <td class="right ${r20!==null&&r20>=0?"pos":"neg"}">${r20!==null?(r20>=0?"+":"")+r20.toFixed(1)+"%":"—"}</td>
        <td class="right">${rsi}</td>
        <td class="right ${trendCls}" style="font-weight:600;font-size:0.72rem">${trend}</td>
      </tr>
    `;
  }).join("");

  const snapHtml = `
    <div style="margin-bottom:1rem">
      <p class="lab-block-title">Multi-Asset Snapshot</p>
      <p class="lab-block-sub">5D/20D return and RSI-14 for all key assets. BULL = 5D > 1.5% AND 20D > 0. BEAR = 5D < −1.5% AND 20D < 0.</p>
      <div class="table-wrap" style="margin-top:0.4rem">
        <table class="lab-trade-table">
          <thead><tr><th>Asset</th><th class="right">5D Return</th><th class="right">20D Return</th><th class="right">RSI-14</th><th class="right">Trend</th></tr></thead>
          <tbody>${snapRows}</tbody>
        </table>
      </div>
    </div>
    <hr style="border-color:var(--border);margin:0.75rem 0">
  `;

  return `
    <div class="momentum-module">
      ${snapHtml}
      <div class="momentum-module__note">
        <strong>Question:</strong>
        After ${activeAsset} ${isDown ? "closes down ≥" : "closes up ≥"}${activeTriggerAbs}% in a single day, what tends to happen over the following days?
        &nbsp;·&nbsp;
        <strong>${col1Label}</strong> = price is ${isDown ? "higher" : "higher"} than the trigger-day close at that horizon (${isDown ? "bounce/recovery" : "momentum continues"}).
        &nbsp;·&nbsp;
        <strong>${col2Label}</strong> = price is ${isDown ? "lower" : "lower"} (${isDown ? "drop extended" : "reversal"}).
        &nbsp;·&nbsp;
        <span class="val-muted">Daily closes only. Intraday horizons (15min–12h) require tick data not available in this feed. No transaction costs assumed.</span>
      </div>
      <div class="momentum-module__selectors">
        <div>
          <p class="momentum-module__label">Asset</p>
          <div class="trigger-tabs">${assetTabs}</div>
        </div>
        <div>
          <p class="momentum-module__label">Direction</p>
          <div class="trigger-tabs">
            <button class="trigger-tab ${isDown ? "trigger-tab--active" : ""}" data-momentum-direction="down">▼ Drop ≥ X%</button>
            <button class="trigger-tab ${!isDown ? "trigger-tab--active" : ""}" data-momentum-direction="up">▲ Rise ≥ X%</button>
          </div>
        </div>
        <div>
          <p class="momentum-module__label">Trigger size (X)</p>
          <div class="trigger-tabs">${triggerTabs}</div>
        </div>
      </div>
      ${verdictHtml}
      ${noData ? `<p style="color:var(--text-muted);font-size:0.8rem;padding:0.75rem 0">No events found. Try lowering the trigger size or changing asset.</p>` : `
        <div class="table-wrap" style="margin-top:0.75rem">
          <table class="lab-trade-table">
            <thead>
              <tr>
                <th>Horizon</th>
                <th class="right" title="Number of historical trigger events with full forward data">Events (n)</th>
                <th class="right" title="${isDown ? "Price higher than entry after N days — bounce/recovery" : "Price higher after N days — momentum continued"}">${escapeHtml(col1Label)}</th>
                <th class="right" title="${isDown ? "Price still lower after N days — drop continued" : "Price lower after N days — reversal"}">${escapeHtml(col2Label)}</th>
                <th class="right" title="Average forward return across all events at this horizon">Avg Return</th>
                <th class="right">Best</th>
                <th class="right">Worst</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
        <p class="lab-block-sub" style="margin-top:0.4rem">
          ${result.totalEvents} total historical triggers. ${isDown ? "Entry = close on drop day. Forward return = close at horizon / drop-day close − 1." : "Entry = close on surge day. Forward return = close at horizon / surge-day close − 1."}
        </p>
        ${recentHtml}
      `}
    </div>
  `;
}

// ── Legacy SCOUT functions (retained but no longer rendered) ────────────────

function renderScoutOverview(model, summary) {
  const macro = model.macroResearch;
  return `
    <section class="panel scout-hero">
      <div class="panel-header scout-hero__header">
        <div>
          <h2>Scout Overview</h2>
          <p class="panel-subtitle">Macro-conditioning and regime-testing engine centered on RING, AGQ, real yields, breakevens, curve shape, and dollar structure.</p>
        </div>
        <div class="scout-hero__badges">
          <span class="status-pill ${getScoutStatusClass(model.dataStatus)}">${escapeHtml(model.dataStatus)}</span>
          <span class="status-pill status-pill--muted">Freshness: ${escapeHtml(model.freshnessLabel)}</span>
          <span class="status-pill status-pill--muted">Portfolio value: ${formatCurrency(summary.portfolioValue)}</span>
        </div>
      </div>
      <div class="panel-grid panel-grid--summary scout-overview-grid">
        <article class="panel stat-panel scout-stat">
          <p class="panel-label">Active Opportunities</p>
          <strong class="panel-value">${model.overview.activeOpportunities}</strong>
          <p class="metric-footnote">Ranked candidates currently under attention.</p>
        </article>
        <article class="panel stat-panel scout-stat">
          <p class="panel-label">Strategies Under Coverage</p>
          <strong class="panel-value">${model.overview.strategiesUnderCoverage}</strong>
          <p class="metric-footnote">Catalog breadth anchored to the PDF taxonomy.</p>
        </article>
        <article class="panel stat-panel scout-stat">
          <p class="panel-label">Backtested Now</p>
          <strong class="panel-value">${model.overview.strategiesBacktested}</strong>
          <p class="metric-footnote">Strategies with standardized performance and friction assumptions.</p>
        </article>
        <article class="panel stat-panel scout-stat">
          <p class="panel-label">Currently Attractive</p>
          <strong class="panel-value">${model.overview.strategiesCurrentlyAttractive}</strong>
          <p class="metric-footnote">Composite Scout Score above the current threshold.</p>
        </article>
        <article class="panel stat-panel scout-stat">
          <p class="panel-label">Macro Observations</p>
          <strong class="panel-value">${macro?.datasetMeta?.observations || 0}</strong>
          <p class="metric-footnote">${escapeHtml(describeScoutDataSources(model))}</p>
        </article>
      </div>
      <div class="scout-coverage-strip">
        ${(macro?.focusAssets || [])
          .slice(0, 6)
          .map(
            (asset) => `
              <div class="scout-coverage-chip">
                <strong>${escapeHtml(asset.symbol)}</strong>
                <span>${escapeHtml(asset.currentRegime.state)} | confidence ${asset.currentRegime.confidence}/100</span>
                <small>Top driver: ${escapeHtml(asset.rankedDrivers[0]?.driverLabel || "n/a")}</small>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderScoutMacroSnapshot(model) {
  const snapshot = model.macroResearch?.macroSnapshot || [];
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Macro Snapshot</h2>
          <p class="panel-subtitle">First-class macro inputs: nominal yields, real yields, breakevens, curve shape, forward inflation, and the dollar.</p>
        </div>
      </div>
      <div class="scout-macro-grid">
        ${snapshot
          .map(
            (item) => `
              <article class="scout-macro-tile">
                <span>${escapeHtml(item.label)}</span>
                <strong>${formatMacroValue(item.latest, item.unit)}</strong>
                <p>${escapeHtml(item.signal)}</p>
                <small>20D change ${formatMacroDelta(item.change20, item.unit)}</small>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderScoutMacroPanels(model) {
  const assets = model.macroResearch?.focusAssets || [];
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Macro Research Cockpit</h2>
          <p class="panel-subtitle">RING and AGQ are first-class research objects, with GLD, TIP, TLT, UUP, COPX, and URA extending the same regime engine.</p>
        </div>
      </div>
      <div class="scout-card-grid">
        ${assets
          .map(
            (asset) => `
              <article class="panel scout-card scout-macro-panel">
                <div class="scout-card__topline">
                  <div>
                    <h3>${escapeHtml(asset.symbol)}</h3>
                    <p>${escapeHtml(asset.category)} | ${escapeHtml(asset.currentRegime.state)} backdrop</p>
                  </div>
                  <div class="scout-card__actions">
                    <span class="status-pill ${asset.priority === 1 ? "status-pill--success" : "status-pill--muted"}">${asset.priority === 1 ? "Priority" : "Coverage"}</span>
                    <button type="button" class="button button--secondary button--small" data-scout-save-opportunity="macro-${escapeHtml(asset.symbol)}" data-scout-label="${escapeHtml(asset.symbol)} Macro Regime Map">Save</button>
                  </div>
                </div>
                <div class="scout-card__metrics">
                  <div><span>Price</span><strong>${formatCurrency(asset.currentPrice)}</strong></div>
                  <div><span>Regime</span><strong>${escapeHtml(asset.currentRegime.state)}</strong></div>
                  <div><span>Confidence</span><strong>${asset.currentRegime.confidence}/100</strong></div>
                  <div><span>Composite</span><strong>${Math.round(asset.scorecard.compositeScoutScore)}/100</strong></div>
                </div>
                <p class="scout-card__why">${escapeHtml(asset.interpretation)}</p>
                <div class="scout-driver-list">
                  ${asset.keyHypotheses
                    .map(
                      (driver) => `
                        <div class="scout-driver-item">
                          <strong>${escapeHtml(driver.driverLabel)}</strong>
                          <span>${escapeHtml(driver.verdict)}</span>
                          <small>corr ${formatNumber(driver.corr)} | beta ${formatNumber(driver.beta)} | 20D edge ${formatPercent(driver.horizons[20].edge * 100)}</small>
                        </div>
                      `
                    )
                    .join("")}
                </div>
                <div class="scout-score-grid">
                  ${renderScoutScorePill("Signal", asset.scorecard.signalStrength)}
                  ${renderScoutScorePill("History", asset.scorecard.historicalEfficacy)}
                  ${renderScoutScorePill("Robustness", asset.scorecard.robustness)}
                  ${renderScoutScorePill("Regime", asset.scorecard.regimeFit)}
                  ${renderScoutScorePill("Portfolio", asset.scorecard.portfolioRelevance)}
                  ${renderScoutScorePill("Data", asset.scorecard.dataQuality)}
                </div>
                <div class="scout-card__footer">
                  <span>Portfolio linkage: ${escapeHtml(asset.portfolioLinkage.overlap)}</span>
                  <span>Additivity: ${escapeHtml(asset.portfolioLinkage.additive)}</span>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderScoutRelativeComparisons(model) {
  const relatives = model.macroResearch?.relativeComparisons || [];
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Relative Macro Expressions</h2>
          <p class="panel-subtitle">Relative-value style tests highlight when one macro expression historically dominated another under current regimes.</p>
        </div>
      </div>
      <div class="scout-relative-grid">
        ${relatives
          .slice(0, 6)
          .map(
            (item) => `
              <article class="scout-library-item">
                <div class="scout-library-item__header">
                  <div>
                    <h3>${escapeHtml(item.label)}</h3>
                    <p>Relative z-score ${formatNumber(item.currentZ)} | Composite ${Math.round(item.composite)}/100</p>
                  </div>
                </div>
                <p>${escapeHtml(item.interpretation)}</p>
                <p><strong>Real-yield regime edge:</strong> ${formatPercent(item.realYieldEdge.edge * 100)}</p>
                <p><strong>Dollar regime edge:</strong> ${formatPercent(item.dollarEdge.edge * 100)}</p>
                <p><strong>Joint regime edge:</strong> ${formatPercent(item.joint.edge * 100)}</p>
                <p><strong>Portfolio linkage:</strong> ${escapeHtml(item.portfolioLinkage.overlap)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderScoutSuggestions(model) {
  const suggestions = model.macroResearch?.suggestions || [];
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Current Interpretation</h2>
          <p class="panel-subtitle">Suggestion layer expresses what the current macro backdrop historically favored, without turning the output into a blind buy/sell command.</p>
        </div>
      </div>
      <div class="scout-suggestion-list">
        ${suggestions.map((item) => `<div class="scout-suggestion-item">${escapeHtml(item)}</div>`).join("")}
      </div>
    </section>
  `;
}

function renderScoutOpportunityFeed(model) {
  const cards = model.opportunities
    .slice(0, 8)
    .map(
      (opportunity) => `
        <article class="panel scout-card">
          <div class="scout-card__topline">
            <div>
              <h3>${escapeHtml(opportunity.strategyName)}</h3>
              <p>${escapeHtml(opportunity.strategyFamily)} | ${escapeHtml(opportunity.instruments.join(" / "))}</p>
            </div>
            <div class="scout-card__actions">
              <span class="status-pill ${getScoutStatusClass(opportunity.dataStatus)}">${escapeHtml(opportunity.dataStatus)}</span>
              <button type="button" class="button button--secondary button--small" data-scout-save-opportunity="${escapeHtml(opportunity.id)}" data-scout-label="${escapeHtml(opportunity.strategyName)}">Save</button>
            </div>
          </div>
          <div class="scout-card__metrics">
            <div><span>Signal</span><strong>${escapeHtml(opportunity.signalState)}</strong></div>
            <div><span>Metric</span><strong>${escapeHtml(opportunity.signalValueLabel)}</strong></div>
            <div><span>Backtest</span><strong>${Math.round(opportunity.scorecard.backtestScore)}/100</strong></div>
            <div><span>Composite</span><strong>${Math.round(opportunity.scorecard.compositeScoutScore)}/100</strong></div>
          </div>
          <p class="scout-card__spread">${escapeHtml(opportunity.spreadLabel)}</p>
          <p class="scout-card__why">${escapeHtml(opportunity.whyNow)}</p>
          <div class="scout-score-grid">
            ${renderScoutScorePill("Signal", opportunity.scorecard.signalStrength)}
            ${renderScoutScorePill("History", opportunity.scorecard.historicalEfficacy)}
            ${renderScoutScorePill("Robustness", opportunity.scorecard.robustness)}
            ${renderScoutScorePill("Liquidity", opportunity.scorecard.liquidityTradability)}
            ${renderScoutScorePill("Cost", opportunity.scorecard.costSensitivity)}
            ${renderScoutScorePill("Regime", opportunity.scorecard.regimeFit)}
            ${renderScoutScorePill("Data", opportunity.scorecard.dataQuality)}
            ${renderScoutScorePill("Portfolio", opportunity.scorecard.portfolioRelevance)}
          </div>
          <div class="scout-card__footer">
            <span>Risk flag: ${escapeHtml(opportunity.riskFlag)}</span>
            <span>Portfolio linkage: ${escapeHtml(opportunity.overlapSummary)}</span>
            <span>Freshness: ${escapeHtml(opportunity.freshness)}</span>
          </div>
        </article>
      `
    )
    .join("");

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Opportunity Feed</h2>
          <p class="panel-subtitle">Transparent ranking with visible component scores, friction-aware backtests, and honest data-status labels.</p>
        </div>
      </div>
      <div class="scout-card-grid">${cards}</div>
    </section>
  `;
}

function renderScoutStrategyLibrary(model) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Strategy Library</h2>
          <p class="panel-subtitle">Structured catalog shaped by the PDF's families, formulas, and naming, but filtered through implementation realism.</p>
        </div>
      </div>
      <div class="scout-library-list">
        ${model.library
          .map(
            (strategy) => `
              <article class="scout-library-item">
                <div class="scout-library-item__header">
                  <div>
                    <h3>${escapeHtml(strategy.name)}</h3>
                    <p>${escapeHtml(strategy.family)} | ${escapeHtml(strategy.assetClass)} | ${escapeHtml(strategy.bucket)}</p>
                  </div>
                  <button type="button" class="button button--ghost button--small" data-scout-save-strategy="${escapeHtml(strategy.id)}" data-scout-label="${escapeHtml(strategy.name)}">Queue</button>
                </div>
                <p>${escapeHtml(strategy.shortDescription)}</p>
                <p><strong>Relationship:</strong> ${escapeHtml(strategy.relationship)}</p>
                <p><strong>Required inputs:</strong> ${escapeHtml(strategy.requiredDataInputs.join(", "))}</p>
                <p><strong>PDF anchors:</strong> ${escapeHtml(strategy.pdfAnchors.join(" | "))}</p>
                <p><strong>Status:</strong> ${escapeHtml(strategy.implementationStatus)} | Backtest: ${strategy.backtestAvailable ? "available" : "not yet"}</p>
                <p><strong>Caveats:</strong> ${escapeHtml(strategy.caveats.join(" "))}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderScoutBacktests(model) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Backtests</h2>
          <p class="panel-subtitle">Costs and slippage included. Simulated outcomes are labeled honestly and not presented as deployable alpha.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table data-table--compact scout-backtest-table">
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Test Period</th>
              <th class="numeric-cell">Gross</th>
              <th class="numeric-cell">Net</th>
              <th class="numeric-cell">Sharpe</th>
              <th class="numeric-cell">Hit Rate</th>
              <th class="numeric-cell">Max DD</th>
              <th class="numeric-cell">Turnover</th>
              <th class="numeric-cell">Trades</th>
              <th>Rules / Notes</th>
            </tr>
          </thead>
          <tbody>
            ${
              model.backtests.length
                ? model.backtests
                    .map(
                      (backtest) => `
                        <tr>
                          <td>
                            <strong>${escapeHtml(backtest.title)}</strong>
                            <div class="table-subtext">${escapeHtml(backtest.universe)}</div>
                          </td>
                          <td>${escapeHtml(backtest.testPeriod)}</td>
                          <td class="numeric-cell ${getValueClass(backtest.grossReturn)}">${formatPercent(backtest.grossReturn * 100)}</td>
                          <td class="numeric-cell ${getValueClass(backtest.netReturn)}">${formatPercent(backtest.netReturn * 100)}</td>
                          <td class="numeric-cell ${getValueClass(backtest.sharpe)}">${formatNumber(backtest.sharpe)}</td>
                          <td class="numeric-cell">${formatPercent(backtest.hitRate * 100)}</td>
                          <td class="numeric-cell ${getValueClass(backtest.maxDrawdown)}">${formatPercent(backtest.maxDrawdown * 100)}</td>
                          <td class="numeric-cell">${formatNumber(backtest.turnover)}</td>
                          <td class="numeric-cell">${formatNumber(backtest.sampleSize)}</td>
                          <td>
                            <div class="table-subtext">${escapeHtml(backtest.signalDefinition)}</div>
                            <div class="table-subtext">${escapeHtml(backtest.entryRule)} | ${escapeHtml(backtest.exitRule)}</div>
                            <div class="table-subtext">Holding: ${escapeHtml(backtest.holdingPeriod)} | Regime: ${escapeHtml(backtest.regimeCompatibility)}</div>
                            <div class="table-subtext">Costs: ${escapeHtml(backtest.transactionCostAssumption)} | Slippage: ${escapeHtml(backtest.slippageAssumption)}</div>
                            <div class="table-subtext">${escapeHtml(backtest.robustnessNotes)}</div>
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                : buildEmptyRow("Backtests will appear as strategies graduate from research catalog to monitored modules.", 10)
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// IDEA PIPELINE — Ranked alpha ideas with live Opportunity Score (0–100)
// Score = 40% signal strength + 30% regime alignment + 30% momentum confirmation
// ---------------------------------------------------------------------------

function renderOpportunityRadar(model) {
  const labData = model.macroResearch?.strategyLabData || {};

  // ── Idea 1: Silver vs Gold Momentum Divergence ──────────────────────────
  // When SLV 20D return significantly exceeds GLD 20D return, silver is outperforming.
  // Silver outperformance within metals tends to persist in risk-on environments.
  const slvS = labData.SLV || [];
  const gldS = labData.GLD || [];
  let slvDivHtml = "";
  if (slvS.length >= 22 && gldS.length >= 22) {
    const slvNow = slvS[slvS.length-1]?.value, slv20 = slvS[slvS.length-21]?.value;
    const gldNow = gldS[gldS.length-1]?.value, gld20 = gldS[gldS.length-21]?.value;
    if (slvNow && slv20 && gldNow && gld20) {
      const slvR20 = (slvNow / slv20 - 1) * 100;
      const gldR20 = (gldNow / gld20 - 1) * 100;
      const spread = slvR20 - gldR20;
      const spreadCls = spread > 5 ? "pos" : spread < -5 ? "neg" : "";
      slvDivHtml = `
        <div class="lab-stats-row" style="margin-top:0.5rem">
          <div class="lab-stat"><span class="lab-stat__label">SLV 20D</span><span class="lab-stat__value ${slvR20>=0?"lab-stat__value--positive":"lab-stat__value--negative"}">${slvR20>=0?"+":""}${slvR20.toFixed(1)}%</span></div>
          <div class="lab-stat"><span class="lab-stat__label">GLD 20D</span><span class="lab-stat__value ${gldR20>=0?"lab-stat__value--positive":"lab-stat__value--negative"}">${gldR20>=0?"+":""}${gldR20.toFixed(1)}%</span></div>
          <div class="lab-stat"><span class="lab-stat__label">SLV − GLD spread</span><span class="lab-stat__value ${spread>0?"lab-stat__value--positive":"lab-stat__value--negative"}">${spread>=0?"+":""}${spread.toFixed(1)} pp</span></div>
        </div>
        <div class="verdict-bar ${spread > 5 ? "verdict-no" : spread < -5 ? "verdict-go" : "verdict-mixed"}" style="margin-top:0.5rem">
          ${spread > 5 ? `Silver outperforming gold by ${spread.toFixed(1)} pp over 20D — risk-on metals signal. Silver momentum may continue.`
            : spread < -5 ? `Silver lagging gold by ${Math.abs(spread).toFixed(1)} pp over 20D — defensive positioning in metals. Silver underperformance.`
            : `Silver and gold moving together (spread ${spread.toFixed(1)} pp). No strong divergence signal.`}
        </div>
      `;
    }
  }

  // ── Idea 2: Miners vs Metal Dislocation (GDX lag signal) ───────────────
  // Gold miners (RING) should move in sync with gold. When RING lags GLD over 20D,
  // miners may be cheap vs the metal — catch-up trade opportunity.
  const ringS = labData.RING || [];
  let minerDivHtml = "";
  if (ringS.length >= 22 && gldS.length >= 22) {
    const ringNow = ringS[ringS.length-1]?.value, ring20 = ringS[ringS.length-21]?.value;
    const gldNow2 = gldS[gldS.length-1]?.value, gld202 = gldS[gldS.length-21]?.value;
    if (ringNow && ring20 && gldNow2 && gld202) {
      const ringR20 = (ringNow / ring20 - 1) * 100;
      const gldR202 = (gldNow2 / gld202 - 1) * 100;
      const minerSpread = ringR20 - gldR202;
      minerDivHtml = `
        <div class="lab-stats-row" style="margin-top:0.5rem">
          <div class="lab-stat"><span class="lab-stat__label">RING 20D</span><span class="lab-stat__value ${ringR20>=0?"lab-stat__value--positive":"lab-stat__value--negative"}">${ringR20>=0?"+":""}${ringR20.toFixed(1)}%</span></div>
          <div class="lab-stat"><span class="lab-stat__label">GLD 20D</span><span class="lab-stat__value ${gldR202>=0?"lab-stat__value--positive":"lab-stat__value--negative"}">${gldR202>=0?"+":""}${gldR202.toFixed(1)}%</span></div>
          <div class="lab-stat"><span class="lab-stat__label">RING − GLD spread</span><span class="lab-stat__value ${minerSpread>0?"lab-stat__value--positive":"lab-stat__value--negative"}">${minerSpread>=0?"+":""}${minerSpread.toFixed(1)} pp</span></div>
        </div>
        <div class="verdict-bar ${minerSpread > 3 ? "verdict-no" : minerSpread < -5 ? "verdict-go" : "verdict-mixed"}" style="margin-top:0.5rem">
          ${minerSpread < -5 ? `Miners lagging gold by ${Math.abs(minerSpread).toFixed(1)} pp over 20D — potential catch-up trade. If gold holds, RING may close the gap.`
            : minerSpread > 3 ? `Miners outperforming gold by ${minerSpread.toFixed(1)} pp — positive operating leverage. Gold trend likely strong.`
            : `Miners tracking gold roughly in line. No strong dislocation.`}
        </div>
      `;
    }
  }

  // ── Idea 3: SPY / VIX regime divergence ──────────────────────────────────
  // When SPY makes a 20D high while VIX is also elevated (>20), risk-on is fragile.
  // Historically, SPY rallies with high VIX have lower quality / higher reversal risk.
  const spyS = labData.SPY || [];
  const vixS = labData.VIX || [];
  let spyVixHtml = "";
  if (spyS.length >= 22 && vixS.length >= 1) {
    const spyNow = spyS[spyS.length-1]?.value;
    const spy20High = Math.max(...spyS.slice(-20).map(p => p.value));
    const vixNow = vixS[vixS.length-1]?.value;
    if (spyNow && vixNow) {
      const spyAt20High = spyNow >= spy20High * 0.995;
      const vixElevated = vixNow >= 20;
      spyVixHtml = `
        <div class="lab-stats-row" style="margin-top:0.5rem">
          <div class="lab-stat"><span class="lab-stat__label">SPY vs 20D high</span><span class="lab-stat__value">${((spyNow/spy20High-1)*100).toFixed(1)}%</span></div>
          <div class="lab-stat"><span class="lab-stat__label">VIX now</span><span class="lab-stat__value ${vixNow>=25?"lab-stat__value--negative":vixNow>=20?"lab-stat__value--muted":"lab-stat__value--positive"}">${vixNow.toFixed(1)}</span></div>
        </div>
        <div class="verdict-bar ${spyAt20High && vixElevated ? "verdict-go" : spyAt20High && !vixElevated ? "verdict-no" : "verdict-mixed"}" style="margin-top:0.5rem">
          ${spyAt20High && vixElevated ? `Fragile rally: SPY near 20D high but VIX still elevated (${vixNow.toFixed(1)}). Risk-on conviction is low — upside may be limited.`
            : spyAt20High && !vixElevated ? `Confirmed strength: SPY near 20D high with VIX normalized (${vixNow.toFixed(1)}). Quality rally — risk-on regime intact.`
            : `SPY not at 20D high. Watch for breakout attempt while monitoring VIX for regime confirmation.`}
        </div>
      `;
    }
  }

  function ideaCard(title, type, hypothesis, trigger, currentHtml) {
    return `
      <div class="panel" style="padding:1rem;margin-bottom:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:0.4rem">
          <span class="status-pill status-pill--muted" style="font-size:0.65rem">${escapeHtml(type)}</span>
          <strong style="font-size:0.85rem">${escapeHtml(title)}</strong>
        </div>
        <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem;line-height:1.5">${escapeHtml(hypothesis)}</p>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:0.35rem"><strong>Trigger:</strong> ${escapeHtml(trigger)}</p>
        ${currentHtml}
      </div>
    `;
  }

  const card1 = ideaCard(
    "Silver vs Gold Divergence",
    "Relative Value / Momentum",
    "Silver is more risk-sensitive than gold. When SLV outperforms GLD over 20D, it signals risk-on positioning in metals — a regime where silver tends to continue outperforming.",
    "SLV 20D return > GLD 20D return by ≥5 percentage points",
    slvDivHtml || `<p class="val-muted" style="font-size:0.75rem">Insufficient data</p>`
  );

  const card2 = ideaCard(
    "Miners vs Metal Dislocation",
    "Hard Assets / Catch-up",
    "Gold miners (RING/GDX) should have operating leverage to gold. When miners lag the metal, it signals either margin pressure or temporary dislocation — potentially a catch-up opportunity.",
    "RING 20D return significantly lags GLD 20D return (>5 pp gap)",
    minerDivHtml || `<p class="val-muted" style="font-size:0.75rem">Insufficient data</p>`
  );

  const card3 = ideaCard(
    "SPY/VIX Quality Check",
    "Regime / Risk Monitor",
    "SPY rallying with elevated VIX is a low-conviction rally. If VIX stays above 20 while SPY advances, the risk-on signal is fragile — consider smaller position sizes or confirmation before adding equity exposure.",
    "SPY near 20D high while VIX ≥ 20 — fragile divergence",
    spyVixHtml || `<p class="val-muted" style="font-size:0.75rem">Insufficient data</p>`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // IDEA PIPELINE — compute all ideas and rank by opportunity score
  // ──────────────────────────────────────────────────────────────────────────

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const score = (signal, regime, mom) => Math.round(0.4 * clamp(signal,0,100) + 0.3 * clamp(regime,0,100) + 0.3 * clamp(mom,0,100));

  // Pre-compute all series we need (slvS, gldS, ringS, spyS, vixS already declared above)
  const agqS  = labData.AGQ || [];
  const gsResult  = model.strategyLab?.goldSilver;
  const vixResult = model.strategyLab?.vix;

  const pct20 = (s) => {
    if (s.length < 22) return null;
    const now = s[s.length-1]?.value, p = s[s.length-21]?.value;
    return (now && p) ? (now/p-1)*100 : null;
  };
  const pct5 = (s) => {
    if (s.length < 7) return null;
    const now = s[s.length-1]?.value, p = s[s.length-6]?.value;
    return (now && p) ? (now/p-1)*100 : null;
  };
  const rsi14 = (s) => {
    if (s.length < 15) return null;
    let g=0,l=0;
    for (let i=s.length-14;i<s.length;i++) {
      const d=s[i].value-(s[i-1]?.value||s[i].value);
      if(d>0) g+=d; else l-=d;
    }
    return Math.round(100-100/(1+(l===0?100:g/l)));
  };

  const slvR20 = pct20(slvS), gldR20 = pct20(gldS);
  const ringR20 = pct20(ringS);
  const slvR5  = pct5(slvS),  gldR5  = pct5(gldS);
  const agqR1  = agqS.length > 1 ? (agqS[agqS.length-1]?.value/agqS[agqS.length-2]?.value-1)*100 : null;
  const agqRsi = rsi14(agqS);
  const spyR20 = pct20(spyS), spyR5 = pct5(spyS);
  const latestVix   = vixS.length ? vixS[vixS.length-1]?.value : null;
  const latestRatio = gsResult?.ratioHistory?.length ? gsResult.ratioHistory[gsResult.ratioHistory.length-1]?.value : null;
  const spy20High   = spyS.length >= 20 ? Math.max(...spyS.slice(-20).map(p=>p.value)) : null;
  const spyNow      = spyS.length ? spyS[spyS.length-1]?.value : null;

  const ideas = [];

  // ── Idea 1: Gold/Silver Mean Reversion ──
  if (latestRatio !== null) {
    const sig    = latestRatio >= 75 ? 100 : clamp((latestRatio - 55) / (75 - 55) * 100, 0, 100);
    const regAlg = latestVix !== null && latestVix > 15 ? 60 : 45; // VIX elevated = risk-off = metals ok
    const momC   = (slvR5 !== null && slvR5 > 0) ? 75 : (slvR5 !== null && slvR5 < -2) ? 25 : 50;
    const oScore = score(sig, regAlg, momC);
    const status = latestRatio >= 75 ? "ACTIVE" : latestRatio >= 65 ? "WATCHLIST" : "NO TRADE";
    ideas.push({
      name: "Gold/Silver Mean Reversion",
      asset: "SIL / AGQ",
      type: "Mean Reversion",
      direction: "LONG SILVER",
      score: oScore,
      status,
      signal: sig,
      regime: regAlg,
      momentum: momC,
      note: `G/S ratio ${latestRatio.toFixed(1)} (entry ≥75). ${status === "ACTIVE" ? "Setup active." : status === "WATCHLIST" ? "Approaching trigger." : "Not in setup zone."} SLV 5D: ${slvR5 !== null ? (slvR5>=0?"+":"")+slvR5.toFixed(1)+"%" : "—"}`,
      hypothesis: "When gold/silver ratio stretches to extremes (>75), silver is historically cheap vs gold. Mean reversion = silver outperforms gold. Vehicle = SIL/AGQ for leveraged exposure.",
      trigger: "Ratio (GLD×10/SLV) closes ≥ 75",
      invalidation: "Ratio continues rising above 85+ with no reversal. Silver macro story breaks down.",
      labTab: "gs",
    });
  }

  // ── Idea 2: VIX Spike Entry ──
  if (latestVix !== null) {
    const sig    = clamp((latestVix - 15) / (40 - 15) * 100, 0, 100);
    const regAlg = 70; // VIX strategy is self-confirming by regime
    const momC   = (spyR5 !== null && spyR5 < -2) ? 80 : (spyR5 !== null && spyR5 < 0) ? 60 : 35;
    const oScore = score(sig, regAlg, momC);
    const status = latestVix >= 30 ? "ACTIVE" : latestVix >= 22 ? "WATCHLIST" : "NO TRADE";
    ideas.push({
      name: "VIX Spike Entry",
      asset: "SPY",
      type: "Contrarian / Mean Reversion",
      direction: "LONG SPY",
      score: oScore,
      status,
      signal: sig,
      regime: regAlg,
      momentum: momC,
      note: `VIX ${latestVix.toFixed(1)} (trigger ≥30). SPY 5D: ${spyR5 !== null ? (spyR5>=0?"+":"")+spyR5.toFixed(1)+"%" : "—"}. ${status === "ACTIVE" ? "Fear spike — setup active." : status === "WATCHLIST" ? "VIX elevated, watch for further spike." : "VIX below alert level."}`,
      hypothesis: "Extreme implied vol spikes (VIX >30) reflect panic that historically overshoots. Forward equity returns in the 5–20D window after VIX spikes have been above average.",
      trigger: "VIX closes ≥ 30",
      invalidation: "VIX keeps rising above 40 with no stabilization. SPY breaks major support.",
      labTab: "vix",
    });
  }

  // ── Idea 3: AGQ Daily Drop Bounce ──
  if (agqR1 !== null) {
    const sig    = agqR1 < 0 ? clamp(Math.abs(agqR1) / 5 * 100, 0, 100) : 0;
    const regAlg = latestVix !== null && latestVix < 35 ? 70 : latestVix < 50 ? 40 : 15;
    const momC   = agqRsi !== null && agqRsi < 40 ? 85 : agqRsi < 50 ? 55 : 25;
    const oScore = score(sig, regAlg, momC);
    const status = agqR1 <= -3 ? "ACTIVE" : agqR1 <= -1.5 ? "WATCHLIST" : "NO TRADE";
    ideas.push({
      name: "AGQ Daily Drop Bounce",
      asset: "AGQ",
      type: "Short-Term Reversal",
      direction: "LONG AGQ (intraday)",
      score: oScore,
      status,
      signal: sig,
      regime: regAlg,
      momentum: momC,
      note: `AGQ today: ${agqR1>=0?"+":""}${agqR1.toFixed(1)}% (trigger ≤−3%). RSI-14: ${agqRsi ?? "—"}. ${status === "ACTIVE" ? "Bounce setup active — intraday only." : status === "WATCHLIST" ? "Moderate drop — watch if continues." : "No drop trigger."}`,
      hypothesis: "AGQ is 2× silver. Sharp single-day drops often see partial intraday recovery due to mean reversion in leveraged instruments. Same-day exit only — no overnight holding.",
      trigger: "AGQ daily close ≤ −3% vs prior close",
      invalidation: "Drop accelerates and holds into close. Broader silver downtrend confirmed.",
      labTab: "momentum",
    });
  }

  // ── Idea 4: SLV/GLD Momentum Divergence ──
  if (slvR20 !== null && gldR20 !== null) {
    const spread = slvR20 - gldR20;
    const sig    = clamp(Math.abs(spread) / 15 * 100, 0, 100);
    const regAlg = gldR20 > 0 ? 70 : 45; // metals broadly rising = setup better
    const momC   = slvR5 !== null && gldR5 !== null ? clamp(((slvR5 - gldR5) + 5) / 10 * 100, 0, 100) : 50;
    const oScore = score(sig, regAlg, momC);
    const status = spread > 5 ? "WATCHLIST" : spread < -5 ? "WATCHLIST" : "NO TRADE";
    ideas.push({
      name: "Silver/Gold Divergence",
      asset: "SLV vs GLD",
      type: "Relative Value",
      direction: spread > 5 ? "LONG SLV" : "LONG GLD",
      score: oScore,
      status,
      signal: sig,
      regime: regAlg,
      momentum: momC,
      note: `SLV 20D: ${slvR20>=0?"+":""}${slvR20.toFixed(1)}% | GLD 20D: ${gldR20>=0?"+":""}${gldR20.toFixed(1)}% | Spread: ${spread>=0?"+":""}${spread.toFixed(1)} pp. ${Math.abs(spread) > 5 ? (spread > 0 ? "Silver outperforming — risk-on metals signal." : "Silver underperforming — defensive metals positioning.") : "Metals moving in sync — no divergence."}`,
      hypothesis: "Silver has higher beta than gold in risk-on environments. Sustained SLV/GLD divergence reveals regime character: wide positive = risk appetite, wide negative = flight to safety in gold.",
      trigger: "|SLV 20D return − GLD 20D return| ≥ 5 percentage points",
      invalidation: "Spread collapses as both metals move together again.",
      labTab: null,
    });
  }

  // ── Idea 5: Miners vs Metal Dislocation ──
  if (ringR20 !== null && gldR20 !== null) {
    const spread = ringR20 - gldR20;
    const isLag  = spread < -5;
    const sig    = isLag ? clamp(Math.abs(spread) / 20 * 100, 0, 100) : 10;
    const regAlg = gldR20 > 0 ? 75 : 40; // gold must be rising for miners to catch up
    const ringR5 = pct5(ringS);
    const momC   = ringR5 !== null ? clamp((ringR5 + 5) / 10 * 100, 0, 100) : 50;
    const oScore = score(sig, regAlg, momC);
    const status = isLag ? "WATCHLIST" : "NO TRADE";
    ideas.push({
      name: "Miners vs Metal Dislocation",
      asset: "RING vs GLD",
      type: "Hard Assets / Catch-up",
      direction: "LONG RING",
      score: oScore,
      status,
      signal: sig,
      regime: regAlg,
      momentum: momC,
      note: `RING 20D: ${ringR20>=0?"+":""}${ringR20.toFixed(1)}% | GLD 20D: ${gldR20>=0?"+":""}${gldR20.toFixed(1)}% | Gap: ${spread>=0?"+":""}${spread.toFixed(1)} pp. ${isLag ? "Miners lagging gold — potential catch-up if gold holds." : "Miners tracking gold — no dislocation."}`,
      hypothesis: "Gold miners (RING) should have positive operating leverage to gold price. When miners materially lag the metal, it signals either margin pressure or temporary dislocation — creating a catch-up opportunity if gold sustains.",
      trigger: "RING 20D return lags GLD 20D return by >5 pp while gold is in uptrend",
      invalidation: "Gold price reverses. Miner margins deteriorate (cost inflation, labor issues).",
      labTab: null,
    });
  }

  // ── Idea 6: SPY/VIX Regime Quality ──
  if (spyNow !== null && spy20High !== null && latestVix !== null) {
    const nearHigh = spyNow >= spy20High * 0.99;
    const vixElev  = latestVix >= 20;
    const sig    = nearHigh && vixElev ? 80 : nearHigh && !vixElev ? 30 : 20;
    const regAlg = vixElev ? 70 : 30;
    const momC   = spyR5 !== null && spyR5 > 0 ? 70 : 40;
    const oScore = score(sig, regAlg, momC);
    const status = nearHigh && vixElev ? "WATCHLIST" : "NO TRADE";
    ideas.push({
      name: "SPY Fragile Rally Monitor",
      asset: "SPY / VIX",
      type: "Regime / Risk Monitor",
      direction: nearHigh && vixElev ? "REDUCE RISK" : "HOLD",
      score: oScore,
      status,
      signal: sig,
      regime: regAlg,
      momentum: momC,
      note: `SPY ${spyNow !== null && spy20High ? ((spyNow/spy20High-1)*100).toFixed(1)+"% vs 20D high" : "—"} | VIX ${latestVix.toFixed(1)}. ${nearHigh && vixElev ? "Fragile: rally with elevated vol — quality is low." : nearHigh ? "Quality rally: SPY high + VIX normalized." : "SPY not at highs — no fragility concern."}`,
      hypothesis: "SPY near 20D high with VIX still elevated indicates the market is pricing upside but not pricing in a vol-normalized environment. These rallies statistically have weaker follow-through.",
      trigger: "SPY within 1% of 20D high while VIX ≥ 20",
      invalidation: "VIX drops below 15 confirming risk-on sentiment. Or SPY breaks down from current levels.",
      labTab: null,
    });
  }

  // Sort by score descending
  ideas.sort((a, b) => b.score - a.score);

  const scorePillCls = (s) => s >= 70 ? "lab-stat__value--positive" : s >= 45 ? "" : "lab-stat__value--muted";
  const statusStyle  = (s) => s === "ACTIVE" ? "color:var(--positive);font-weight:600" : s === "WATCHLIST" ? "color:#fbbf24;font-weight:600" : "color:var(--text-muted)";

  const rows = ideas.map((idea) => `
    <tr>
      <td>
        <div style="font-weight:500;font-size:0.82rem">${escapeHtml(idea.name)}</div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:1px">${escapeHtml(idea.asset)} · ${escapeHtml(idea.type)}</div>
      </td>
      <td class="right"><strong class="${scorePillCls(idea.score)}" style="font-size:1rem">${idea.score}</strong></td>
      <td style="${statusStyle(idea.status)};font-size:0.75rem">${escapeHtml(idea.status)}</td>
      <td style="font-size:0.72rem;color:var(--text-secondary)">${idea.direction !== "HOLD" && idea.direction !== "REDUCE RISK" ? escapeHtml(idea.direction) : `<span style="color:var(--text-muted)">${escapeHtml(idea.direction)}</span>`}</td>
      <td style="font-size:0.72rem;color:var(--text-muted);max-width:320px;line-height:1.4">${escapeHtml(idea.note)}</td>
      ${idea.labTab ? `<td><button type="button" class="trigger-tab" data-lab-strategy="${escapeHtml(idea.labTab)}" style="font-size:0.65rem;padding:2px 7px">Backtest →</button></td>` : "<td></td>"}
    </tr>
  `).join("");

  const topIdea = ideas[0];
  const topNoteHtml = topIdea ? `
    <div class="verdict-bar ${topIdea.score >= 70 ? "verdict-no" : topIdea.score >= 45 ? "verdict-mixed" : "verdict-neutral"}" style="margin-bottom:0.75rem">
      <strong>Top opportunity:</strong> ${escapeHtml(topIdea.name)} — score ${topIdea.score}/100 — ${escapeHtml(topIdea.note)}
    </div>
  ` : "";

  // Score methodology legend
  const scoreLegend = `
    <p class="lab-block-sub" style="margin-top:0.5rem">
      <strong>Score formula:</strong> 40% Signal Strength (proximity to trigger) + 30% Regime Alignment (is macro favorable?) + 30% Momentum Confirmation (is price action supporting?).
      Max 100. ≥70 = high conviction, 45–70 = moderate, &lt;45 = watch only.
    </p>
  `;

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="scout-section-label">Alpha Research</p>
          <h2>Idea Pipeline</h2>
          <p class="panel-subtitle">All active trade ideas ranked by live Opportunity Score. Score = signal strength + regime + momentum. Updated every model refresh.</p>
        </div>
      </div>
      ${topNoteHtml}
      <div class="table-wrap">
        <table class="lab-trade-table">
          <thead>
            <tr>
              <th>Idea</th>
              <th class="right" title="Score = 40% Signal + 30% Regime + 30% Momentum, 0–100">Score /100</th>
              <th>Status</th>
              <th>Direction</th>
              <th>Current reading</th>
              <th>Lab</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${scoreLegend}
    </section>
  `;
}

function renderScoutWatchlist(model) {
  const customPairChips = (state.scout.customPairs || [])
    .map((pair) => `<span class="status-pill status-pill--muted">${escapeHtml(pair.left)} / ${escapeHtml(pair.right)}</span>`)
    .join("");

  const watchlistItems = model.watchlist.length
    ? model.watchlist
        .map(
          (item) => `
            <article class="scout-watchlist-item">
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                <p>${escapeHtml(item.kind)} | ${escapeHtml(item.status)}</p>
              </div>
              <button type="button" class="button button--ghost button--small" data-scout-remove-watchlist-id="${escapeHtml(item.id)}">Remove</button>
            </article>
          `
        )
        .join("")
    : '<p class="panel-subtitle" style="margin:0">No saved items yet.</p>';

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="scout-section-label">Research Queue</p>
          <h2>Watchlist</h2>
        </div>
      </div>
      <div class="scout-watchlist-layout">
        <form id="scout-custom-pair-form" class="scout-pair-form">
          <div style="display:flex;gap:0.75rem;align-items:flex-end;flex-wrap:wrap;">
            <label style="display:flex;flex-direction:column;gap:0.3rem;font-size:0.72rem;">
              <span style="color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;font-size:0.62rem;">Left leg</span>
              <input name="left" type="text" placeholder="RING" maxlength="16" style="width:90px;" />
            </label>
            <label style="display:flex;flex-direction:column;gap:0.3rem;font-size:0.72rem;">
              <span style="color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;font-size:0.62rem;">Right leg</span>
              <input name="right" type="text" placeholder="GLD" maxlength="16" style="width:90px;" />
            </label>
            <button type="submit" class="button button--primary button--small">Track Pair</button>
          </div>
          ${customPairChips ? `<div class="scout-custom-pairs" style="margin-top:0.6rem;">${customPairChips}</div>` : ""}
        </form>
        <div class="scout-watchlist-list">${watchlistItems}</div>
      </div>
    </section>
  `;
}

function renderScoutScorePill(label, value) {
  return `
    <div class="scout-score-pill">
      <span>${escapeHtml(label)}</span>
      <strong>${Math.round(value)}</strong>
    </div>
  `;
}

function formatMacroValue(value, unit) {
  if (unit === "%") return `${Number(value || 0).toFixed(2)}%`;
  if (unit === "bp") return `${Number(value || 0).toFixed(0)} bp`;
  return formatNumber(value);
}

function formatMacroDelta(value, unit) {
  if (unit === "%") return `${value >= 0 ? "+" : ""}${Number(value || 0).toFixed(2)} pts`;
  if (unit === "bp") return `${value >= 0 ? "+" : ""}${Number(value || 0).toFixed(0)} bp`;
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}

function resolveStrategyName(strategyId) {
  return syncUiState.scoutModel?.library?.find((item) => item.id === strategyId)?.name || strategyId;
}

function getScoutStatusClass(status) {
  if (status === "live") return "status-pill--success";
  if (status === "delayed") return "status-pill--warning";
  if (status === "research-only") return "status-pill--error";
  return "status-pill--muted";
}

function describeScoutDataSources(model) {
  const datasetMeta = model?.macroResearch?.datasetMeta || {};
  const fredSources = Object.values(datasetMeta.fredSeriesSources || {});
  const yahooLabel = model?.dataStatus === "live" ? "Yahoo Finance prices are live." : "Yahoo Finance prices are not fully live.";

  if (!fredSources.length) {
    return `${yahooLabel} FRED source metadata is unavailable for this snapshot.`;
  }

  const allFredApi = fredSources.every((source) => source === "fredapi");
  const anyFallback = fredSources.some((source) => String(source).startsWith("csv-fallback"));

  if (allFredApi) {
    return `${yahooLabel} FRED macro series are loading through fredapi.`;
  }

  if (anyFallback && datasetMeta.fredKeyConfigured) {
    return `${yahooLabel} FRED key is present, but one or more macro series fell back to public CSV for this snapshot.`;
  }

  if (anyFallback) {
    return `${yahooLabel} FRED macro series are using public CSV fallback because no API key was detected at runtime.`;
  }

  return `${yahooLabel} FRED macro source mix: ${fredSources.join(", ")}.`;
}

function buildPortfolioHistorySeries(context) {
  const valuationEngine = runtime?.services?.valuationEngine;
  const returnEngine = runtime?.services?.returnEngine;
  if (!valuationEngine) {
    return buildSnapshotCheckpointSeries();
  }

  const sortedTransactions = [...context.transactions].filter((transaction) => transaction.date);
  if (!sortedTransactions.length) {
    return buildSnapshotCheckpointSeries();
  }

  const valuation = valuationEngine.compute({
    transactions: context.transactions,
    valuationDate: getActiveValuationDate(context.transactions, context.statement),
    currentPrices: context.prices,
    historicalPrices: state.marketData.assetPriceHistory || {},
    priceAnchors: buildSnapshotPriceAnchors(),
  });

  syncUiState.lastValuation = valuation;
  const returnSeries = returnEngine?.computeFromDailySeries?.(valuation.dailySeries)?.dailyReturns || [];
  const returnsByDate = new Map(returnSeries.map((point) => [point.date, point]));
  console.debug("[Incrementum][valuation]", {
    valuationDate: valuation.dailySeries[valuation.dailySeries.length - 1]?.date || null,
    nav: valuation.nav,
    cashBalance: valuation.cashBalance,
    marketValue: valuation.portfolioMarketValue,
    cumulativeExternalFlows: valuation.cumulativeExternalFlows || 0,
    bridgeMismatches: valuation.bridgeMismatches || [],
    positions: valuation.positions?.map((position) => ({
      ticker: position.ticker,
      shares: position.shares,
      price: position.price,
      priceSource: position.priceSource,
      marketValue: position.marketValue,
    })) || [],
    missingPrices: valuation.missingPrices || [],
  });

  return valuation.dailySeries.map((point) => ({
    date: point.date,
    portfolioValue: point.nav,
    netContributions: point.cumulativeExternalFlows,
    externalFlowForDay: point.externalFlowForDay,
    cashBalance: point.cashBalance,
    marketValue: point.portfolioMarketValue,
    pnlForDay: point.pnlForDay,
    totalPnL: point.totalPnL,
    dailyReturn: returnsByDate.get(point.date)?.dailyReturn ?? null,
    cumulativeReturn: returnsByDate.get(point.date)?.cumulativeReturn ?? null,
    source: "Ledger NAV",
  }));
}

function buildSnapshotCheckpointSeries() {
  return [...state.importedSnapshots]
    .filter((snapshot) => snapshot.statementPeriodEndDate)
    .sort((left, right) => left.statementPeriodEndDate.localeCompare(right.statementPeriodEndDate))
    .filter((snapshot, index, list) => index === 0 || list[index - 1].statementPeriodEndDate !== snapshot.statementPeriodEndDate)
    .map((snapshot) => ({
      date: snapshot.statementPeriodEndDate,
      portfolioValue: roundNumber(snapshot.summary.portfolioValue),
      netContributions: roundNumber(snapshot.summary.netContributions ?? snapshot.summary.netInvestedCapital),
      totalPnL: roundNumber(snapshot.summary.totalPnL),
      source: "Snapshot Checkpoint",
    }));
}

function buildSnapshotPriceAnchors() {
  const anchorMap = new Map();

  state.importedSnapshots.forEach((snapshot) => {
    const anchorDate = snapshot.statementPeriodEndDate;
    const positions = snapshot.statement?.openPositions || [];
    if (!anchorDate) return;

    positions.forEach((position) => {
      if (!anchorMap.has(position.ticker)) {
        anchorMap.set(position.ticker, []);
      }
      anchorMap.get(position.ticker).push({
        date: anchorDate,
        price: roundNumber(position.currentPrice),
      });
    });
  });

  anchorMap.forEach((anchors) => anchors.sort((left, right) => left.date.localeCompare(right.date)));
  return anchorMap;
}


function getWindowStartDate(windowId, endDate, inceptionDate) {
  if (!endDate) return "";
  const [year, month, day] = endDate.split("-").map(Number);
  if (!year || !month || !day) return "";

  if (windowId === "MTD") return `${year}-${String(month).padStart(2, "0")}-01`;
  if (windowId === "YTD") return `${year}-01-01`;
  if (windowId === "3M") return shiftDateIso(endDate, -90);
  if (windowId === "6M") return shiftDateIso(endDate, -180);
  if (windowId === "ITD") return inceptionDate || "";
  return "";
}

function shiftDateIso(dateString, dayOffset) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function findHistoryWindowPoints(historySeries, startDate, endDate) {
  if (!startDate || !endDate) return { startPoint: null, endPoint: null };
  const series = [...historySeries].sort((left, right) => left.date.localeCompare(right.date));
  const endPoint = [...series].reverse().find((point) => point.date <= endDate) || series[series.length - 1] || null;
  const startPoint =
    [...series].reverse().find((point) => point.date <= startDate) ||
    series.find((point) => point.date >= startDate) ||
    null;
  return { startPoint, endPoint };
}

function calculateHistoryWindowReturn(startPoint, endPoint) {
  if (!startPoint || !endPoint || startPoint.date >= endPoint.date) return null;
  if (startPoint.cumulativeReturn === null || endPoint.cumulativeReturn === null) return null;
  return roundNumber((1 + endPoint.cumulativeReturn) / (1 + startPoint.cumulativeReturn) - 1);
}

function getBenchmarkDefinition(benchmarkId, preferences) {
  const map = {
    SPX: {
      label: "SPX / S&P 500",
      type: "series",
      series: state.marketData.benchmarkHistory.SPX || [],
    },
    SOFR: {
      label: "SOFR",
      type: "annualRate",
      annualRate: preferences.sofrRate,
    },
    HURDLE: {
      label: "USD + 8% Hurdle",
      type: "annualRate",
      annualRate: preferences.hurdleRate,
    },
  };
  return map[benchmarkId];
}

function calculateBenchmarkReturn(benchmarkId, startDate, endDate, preferences) {
  const normalizedSeries = buildNormalizedBenchmarkSeries(benchmarkId, startDate, endDate, preferences);
  if (!normalizedSeries.points.length) return null;
  return roundNumber((normalizedSeries.points[normalizedSeries.points.length - 1].normalizedValue || 1) - 1);
}

function buildNormalizedBenchmarkSeries(benchmarkId, startDate, endDate, preferences) {
  const definition = getBenchmarkDefinition(benchmarkId, preferences);
  const expectedPointCount = startDate && endDate ? differenceInDays(startDate, endDate) + 1 : 0;
  if (!definition || !startDate || !endDate) {
    return {
      label: definition?.label || benchmarkId,
      points: [],
      baseDate: "",
      missingPoints: 0,
    };
  }

  if (definition.type === "annualRate") {
    const days = differenceInDays(startDate, endDate);
    if (days <= 0) {
      return {
        label: definition.label,
        points: [],
        baseDate: "",
        missingPoints: 0,
      };
    }

    const points = [];
    for (let index = 0; index <= days; index += 1) {
      const date = shiftDateIso(startDate, index);
      points.push({
        date,
        normalizedValue: roundNumber((1 + definition.annualRate) ** (index / 365)),
        source: "annual-rate",
      });
    }

    return {
      label: definition.label,
      points,
      baseDate: startDate,
      missingPoints: 0,
    };
  }

  if (definition.type === "series") {
    const series = Array.isArray(definition.series) ? definition.series : [];
    const sortedSeries = [...series]
      .filter((point) => point?.date && Number(point?.value))
      .sort((left, right) => left.date.localeCompare(right.date));

    if (!sortedSeries.length) {
      return {
        label: definition.label,
        points: [],
        baseDate: "",
        missingPoints: expectedPointCount || 1,
      };
    }

    const basePoint =
      [...sortedSeries].reverse().find((point) => point.date <= startDate) ||
      sortedSeries.find((point) => point.date >= startDate) ||
      null;
    const endPoint = [...sortedSeries].reverse().find((point) => point.date <= endDate) || null;

    if (!basePoint || !endPoint || basePoint.date > endPoint.date || !basePoint.value || !endPoint.value) {
      return {
        label: definition.label,
        points: [],
        baseDate: basePoint?.date || "",
        missingPoints: expectedPointCount || 1,
      };
    }

    const points = sortedSeries
      .filter((point) => point.date >= basePoint.date && point.date <= endPoint.date)
      .map((point) => ({
        date: point.date,
        normalizedValue: roundNumber(point.value / basePoint.value),
        source: "series",
      }));

    return {
      label: definition.label,
      points,
      baseDate: basePoint.date,
      missingPoints: Math.max(0, expectedPointCount - points.length),
    };
  }

  return {
    label: definition.label,
    points: [],
    baseDate: "",
    missingPoints: 1,
  };
}

function differenceInDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

function buildBenchmarkWindowRows(historySeries, preferences) {
  const endDate = historySeries[historySeries.length - 1]?.date || "";
  const inceptionDate = historySeries[0]?.date || "";
  const windows = [
    { id: "MTD", label: "Month-to-Date" },
    { id: "YTD", label: "Year-to-Date" },
    { id: "3M", label: "Last 3 Months" },
    { id: "6M", label: "Last 6 Months" },
    { id: "ITD", label: "Since Inception" },
  ];

  const rows = windows.map((windowDef) => {
    const startDate = getWindowStartDate(windowDef.id, endDate, inceptionDate);
    const { startPoint, endPoint } = findHistoryWindowPoints(historySeries, startDate, endDate);
    const portfolioReturn = calculateHistoryWindowReturn(startPoint, endPoint);
    const primarySeries = buildNormalizedBenchmarkSeries(preferences.primaryBenchmark, startDate, endDate, preferences);
    const sofrSeries = buildNormalizedBenchmarkSeries("SOFR", startDate, endDate, preferences);
    const hurdleSeries = buildNormalizedBenchmarkSeries("HURDLE", startDate, endDate, preferences);
    const primaryReturn = primarySeries.points.length ? roundNumber(primarySeries.points[primarySeries.points.length - 1].normalizedValue - 1) : null;
    const sofrReturn = sofrSeries.points.length ? roundNumber(sofrSeries.points[sofrSeries.points.length - 1].normalizedValue - 1) : null;
    const hurdleReturn = hurdleSeries.points.length ? roundNumber(hurdleSeries.points[hurdleSeries.points.length - 1].normalizedValue - 1) : null;

    return {
      windowId: windowDef.id,
      label: windowDef.label,
      startDate,
      endDate,
      portfolioReturn,
      primaryReturn,
      primaryBaseDate: primarySeries.baseDate,
      primaryPointCount: primarySeries.points.length,
      primaryMissingPoints: primarySeries.missingPoints,
      excessReturn: portfolioReturn !== null && primaryReturn !== null ? roundNumber(portfolioReturn - primaryReturn) : null,
      sofrReturn,
      hurdleReturn,
    };
  });

  const itdRow = rows.find((row) => row.windowId === "ITD") || rows[rows.length - 1] || null;
  syncUiState.lastBenchmarkDiagnostics = {
    label: getBenchmarkDefinition(preferences.primaryBenchmark, preferences)?.label || preferences.primaryBenchmark,
    baseDate: itdRow?.primaryBaseDate || "",
    pointCount: itdRow?.primaryPointCount || 0,
    missingPoints: itdRow?.primaryMissingPoints || 0,
  };
  console.debug("[Incrementum][benchmark]", {
    benchmark: preferences.primaryBenchmark,
    baseDate: syncUiState.lastBenchmarkDiagnostics.baseDate,
    pointCount: syncUiState.lastBenchmarkDiagnostics.pointCount,
    missingPoints: syncUiState.lastBenchmarkDiagnostics.missingPoints,
    rows,
  });

  return rows;
}

function renderBenchmarkComparison(rows) {
  if (!elements.benchmarkComparisonBody) return;

  if (!rows.length) {
    elements.benchmarkComparisonBody.innerHTML = buildEmptyRow("Benchmark comparison will appear once enough history is available.", 6);
    return;
  }

  elements.benchmarkComparisonBody.innerHTML = rows
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        <td class="numeric-cell ${getValueClass(row.portfolioReturn)}">${formatNullablePercent(row.portfolioReturn)}</td>
        <td class="numeric-cell ${getValueClass(row.primaryReturn)}">${formatNullablePercent(row.primaryReturn)}</td>
        <td class="numeric-cell ${getValueClass(row.excessReturn)}">${formatNullablePercent(row.excessReturn)}</td>
        <td class="numeric-cell ${getValueClass(row.sofrReturn)}">${formatNullablePercent(row.sofrReturn)}</td>
        <td class="numeric-cell ${getValueClass(row.hurdleReturn)}">${formatNullablePercent(row.hurdleReturn)}</td>
      </tr>
    `)
    .join("");
}

function renderHistory(historySeries) {
  const missingPriceCount = syncUiState.lastValuation?.missingPrices?.length || 0;
  const pricedDays = syncUiState.lastValuation?.dailySeries?.filter((point) => point.pricingStatus === "fully-priced").length || 0;
  const estimatedDays = syncUiState.lastValuation?.dailySeries?.filter((point) => point.pricingStatus === "estimated").length || 0;
  const missingDays = syncUiState.lastValuation?.dailySeries?.filter((point) => point.pricingStatus === "missing").length || 0;
  if (elements.historyStatus) {
    elements.historyStatus.textContent = historySeries.length > 1
      ? `Portfolio NAV reconstructed from the transaction ledger. Fully priced days: ${pricedDays}. Estimated days: ${estimatedDays}. Missing-price days: ${missingDays}.${missingPriceCount ? ` Price fallback events: ${missingPriceCount}.` : ""}`
      : "Portfolio NAV history needs transaction history to build. Statement snapshots are used only as fallback checkpoints.";
  }

  if (elements.historyBody) {
    if (!historySeries.length) {
      elements.historyBody.innerHTML = buildEmptyRow("History will appear once transaction history and at least one valuation input are available.", 5);
    } else {
      elements.historyBody.innerHTML = [...historySeries]
        .reverse()
        .map((point) => `
          <tr>
            <td>${escapeHtml(point.date)}</td>
            <td class="numeric-cell">${formatCurrency(point.portfolioValue)}</td>
            <td class="numeric-cell">${formatCurrency(point.netContributions)}</td>
            <td class="numeric-cell ${getValueClass(point.totalPnL)}">${formatCurrency(point.totalPnL)}</td>
            <td>${escapeHtml(point.source)}</td>
          </tr>
        `)
        .join("");
    }
  }

  if (!elements.historyChart) return;
  if (historySeries.length < 2) {
    elements.historyChart.innerHTML = '<div class="history-chart__empty">Add transaction history and valuation inputs to draw the equity curve.</div>';
    return;
  }

  const values = historySeries.map((point) => point.portfolioValue);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const width = 520;
  const height = 144;
  const padding = 10;
  const points = historySeries.map((point, index) => {
    const x = padding + (index / (historySeries.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.portfolioValue - minValue) / range) * (height - padding * 2);
    return { x: roundNumber(x), y: roundNumber(y), label: point.date, value: point.portfolioValue };
  });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const fillPoints = [`${points[0].x},${height - padding}`, ...points.map((point) => `${point.x},${point.y}`), `${points[points.length - 1].x},${height - padding}`].join(" ");

  elements.historyChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Portfolio value history">
      <polygon class="history-chart__fill" points="${fillPoints}"></polygon>
      <polyline class="history-chart__line" points="${linePoints}"></polyline>
      ${points
        .map(
          (point) => `<circle class="history-chart__point" cx="${point.x}" cy="${point.y}" r="3">
            <title>${escapeHtml(point.label)}: ${escapeHtml(formatCurrency(point.value))}</title>
          </circle>`
        )
        .join("")}
    </svg>
  `;
}

function exportWorkbook({ context, analytics, summary, historySeries, benchmarkRows }) {
  const workbookName = `incrementum-dashboard-${(summary.valuationDate || new Date().toISOString().slice(0, 10)).replace(/-/g, "")}.xlsx`;
  const sheets = [
    {
      name: "Dashboard Summary",
      rows: [
        ["Metric", "Value"],
        ["Committed Capital", formatCurrency(summary.committedCapital)],
        ["Net Contributions", formatCurrency(summary.netContributions)],
        ["Net Invested Capital", formatCurrency(summary.netInvestedCapital)],
        ["Cash Balance", formatCurrency(summary.cash)],
        ["Current Portfolio Value", formatCurrency(summary.portfolioValue)],
        ["Total P&L", formatCurrency(summary.totalPnL)],
        ["Realized P&L", formatCurrency(summary.realizedPnL)],
        ["Unrealized P&L", formatCurrency(summary.unrealizedPnL)],
        ["Mark-to-Market P&L", formatCurrency(summary.markToMarketPnL)],
        ["Net Contribution Return", summary.netContributionReturnLabel],
        ["IRR", summary.irrLabel],
        ["TWR", summary.twrLabel],
        ["YTD", summary.ytdLabel],
        ["ITD", summary.itdLabel],
        ["Valuation Date", summary.valuationDate || "-"],
        ["Data Source", context.mode === "snapshot" ? "Imported Snapshot" : "Manual Mode"],
      ],
    },
    {
      name: "Portfolio Positions",
      rows: [
        ["Ticker", "Shares", "Average Cost", "Current Price", "Market Value", "Cost Basis", "Weight (MV)", "Weight (Cost)", "Unrealized P&L", "Return %"],
        ...analytics.holdings.map((holding) => [
          getDisplayTicker(holding.ticker),
          holding.ticker === "CASH" ? "-" : formatNumber(holding.shares),
          formatCurrency(holding.averageCost),
          formatCurrency(holding.currentPrice),
          formatCurrency(holding.marketValue),
          formatCurrency(holding.totalCostBasis),
          formatPercent(holding.portfolioWeight),
          formatPercent(holding.costWeight),
          formatCurrency(holding.unrealizedPnL),
          formatPercent(holding.returnPct),
        ]),
      ],
    },
    {
      name: "Transactions",
      rows: [
        ["Date", "Type", "Ticker", "Quantity", "Price", "Amount", "Currency", "Cash Impact", "Notes"],
        ...context.transactions.map((transaction) => [
          transaction.date,
          transaction.type,
          transaction.ticker || "-",
          TRADE_TYPES.has(transaction.type) ? formatNumber(transaction.quantity) : "-",
          TRADE_TYPES.has(transaction.type) ? formatCurrencyWithCode(transaction.price, transaction.currency) : "-",
          formatCurrencyWithCode(transaction.amount, transaction.currency),
          transaction.currency,
          formatSignedCurrencyWithCode(transaction.cashImpact, transaction.currency),
          transaction.notes || "-",
        ]),
      ],
    },
    {
      name: "Performance by Asset",
      rows: [
        ["Ticker", "Realized P&L", "Unrealized P&L", "Total P&L", "Market Value", "Return %"],
        ...analytics.assetPerformance.map((asset) => [
          asset.ticker,
          formatCurrency(asset.realizedPnL),
          formatCurrency(asset.unrealizedPnL),
          formatCurrency(asset.totalPnL),
          formatCurrency(asset.marketValue),
          formatPercent(asset.returnPct),
        ]),
      ],
    },
    {
      name: "Benchmark Comparison",
      rows: [
        ["Window", "Portfolio", getBenchmarkDefinition(state.preferences.primaryBenchmark, state.preferences)?.label || "Primary", "Excess", "SOFR", "USD + 8%"],
        ...benchmarkRows.map((row) => [
          row.label,
          formatNullablePercent(row.portfolioReturn),
          formatNullablePercent(row.primaryReturn),
          formatNullablePercent(row.excessReturn),
          formatNullablePercent(row.sofrReturn),
          formatNullablePercent(row.hurdleReturn),
        ]),
      ],
    },
    {
      name: "Snapshot History",
      rows: [
        ["Date", "Portfolio Value", "Net Contributions", "Total P&L", "Source"],
        ...historySeries.map((point) => [
          point.date,
          formatCurrency(point.portfolioValue),
          formatCurrency(point.netContributions),
          formatCurrency(point.totalPnL),
          point.source,
        ]),
      ],
    },
  ];

  const blob = buildXlsxBlob(sheets);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = workbookName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildXlsxBlob(sheets) {
  const encoder = new TextEncoder();
  const files = [];
  const workbookSheets = sheets.map((sheet, index) => ({
    ...sheet,
    safeName: sanitizeSheetName(sheet.name, index),
    path: `xl/worksheets/sheet${index + 1}.xml`,
    relId: `rId${index + 1}`,
  }));

  files.push({ path: "[Content_Types].xml", data: encoder.encode(buildContentTypesXml(workbookSheets.length)) });
  files.push({ path: "_rels/.rels", data: encoder.encode(buildRootRelsXml()) });
  files.push({ path: "docProps/app.xml", data: encoder.encode(buildAppXml(workbookSheets.map((sheet) => sheet.safeName))) });
  files.push({ path: "docProps/core.xml", data: encoder.encode(buildCoreXml()) });
  files.push({ path: "xl/workbook.xml", data: encoder.encode(buildWorkbookXml(workbookSheets)) });
  files.push({ path: "xl/_rels/workbook.xml.rels", data: encoder.encode(buildWorkbookRelsXml(workbookSheets.length)) });
  files.push({ path: "xl/styles.xml", data: encoder.encode(buildStylesXml()) });
  workbookSheets.forEach((sheet) => {
    files.push({ path: sheet.path, data: encoder.encode(buildWorksheetXml(sheet.rows)) });
  });

  return buildZipBlob(files);
}

function sanitizeSheetName(name, index) {
  const safe = String(name || `Sheet ${index + 1}`).replace(/[\\/*?:[\]]/g, "").slice(0, 31).trim();
  return safe || `Sheet${index + 1}`;
}

function buildContentTypesXml(sheetCount) {
  const worksheetOverrides = Array.from({ length: sheetCount }, (_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${worksheetOverrides}
</Types>`;
}

function buildRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function buildAppXml(sheetNames) {
  const titles = sheetNames.map((name) => `<vt:lpstr>${escapeXml(name)}</vt:lpstr>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Incrementum Dashboard</Application>
  <TitlesOfParts>
    <vt:vector size="${sheetNames.length}" baseType="lpstr">${titles}</vt:vector>
  </TitlesOfParts>
</Properties>`;
}

function buildCoreXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Incrementum Dashboard</dc:creator>
  <cp:lastModifiedBy>Incrementum Dashboard</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function buildWorkbookXml(sheets) {
  const sheetXml = sheets
    .map((sheet, index) => `<sheet name="${escapeXml(sheet.safeName)}" sheetId="${index + 1}" r:id="${sheet.relId}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetXml}</sheets>
</workbook>`;
}

function buildWorkbookRelsXml(sheetCount) {
  const worksheetRels = Array.from(
    { length: sheetCount },
    (_, index) =>
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${worksheetRels}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
</styleSheet>`;
}

function buildWorksheetXml(rows) {
  const maxColumns = Math.max(...rows.map((row) => row.length), 1);
  const cols = Array.from({ length: maxColumns }, (_, index) => `<col min="${index + 1}" max="${index + 1}" width="${index === 0 ? 24 : 18}" customWidth="1"/>`).join("");
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => buildCellXml(columnIndex + 1, rowIndex + 1, value, rowIndex === 0 ? 1 : 0))
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${cols}</cols>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

function buildCellXml(columnIndex, rowIndex, value, styleIndex = 0) {
  const reference = `${columnNumberToName(columnIndex)}${rowIndex}`;
  const cellValue = escapeXml(String(value ?? ""));
  return `<c r="${reference}" t="inlineStr" s="${styleIndex}"><is><t>${cellValue}</t></is></c>`;
}

function columnNumberToName(columnNumber) {
  let dividend = columnNumber;
  let columnName = "";
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return columnName;
}

function buildZipBlob(files) {
  const localFileParts = [];
  const centralDirectoryParts = [];
  let offset = 0;

  files.forEach((file) => {
    const fileNameBytes = new TextEncoder().encode(file.path);
    const data = file.data;
    const crc = crc32(data);
    const localHeader = buildZipLocalHeader(fileNameBytes, crc, data.length);
    localFileParts.push(localHeader, fileNameBytes, data);

    const centralHeader = buildZipCentralHeader(fileNameBytes, crc, data.length, offset);
    centralDirectoryParts.push(centralHeader, fileNameBytes);

    offset += localHeader.length + fileNameBytes.length + data.length;
  });

  const centralDirectorySize = centralDirectoryParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = buildZipEndRecord(files.length, centralDirectorySize, offset);

  return new Blob([...localFileParts, ...centralDirectoryParts, endRecord], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function buildZipLocalHeader(fileNameBytes, crc, size) {
  const buffer = new ArrayBuffer(30);
  const view = new DataView(buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, fileNameBytes.length, true);
  view.setUint16(28, 0, true);
  return new Uint8Array(buffer);
}

function buildZipCentralHeader(fileNameBytes, crc, size, offset) {
  const buffer = new ArrayBuffer(46);
  const view = new DataView(buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, fileNameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);
  return new Uint8Array(buffer);
}

function buildZipEndRecord(fileCount, centralDirectorySize, centralDirectoryOffset) {
  const buffer = new ArrayBuffer(22);
  const view = new DataView(buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);
  return new Uint8Array(buffer);
}

function crc32(bytes) {
  let crc = -1;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[index]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function filterTransactions(transactions) {
  const typeFilter = elements.filterType.value;
  const tickerFilter = elements.filterTicker.value.trim().toUpperCase();
  const searchFilter = elements.filterSearch.value.trim().toLowerCase();
  const fromDate = elements.filterDateFrom.value;
  const toDate = elements.filterDateTo.value;

  return transactions.filter((transaction) => {
    if (typeFilter && transaction.type !== typeFilter) return false;
    if (tickerFilter && !transaction.ticker.includes(tickerFilter)) return false;
    if (searchFilter) {
      const haystack = `${transaction.ticker} ${transaction.notes}`.toLowerCase();
      if (!haystack.includes(searchFilter)) return false;
    }
    if (fromDate && transaction.date < fromDate) return false;
    if (toDate && transaction.date > toDate) return false;
    return true;
  });
}

function calculatePortfolioAnalytics(transactions, prices, statement) {
  const assetMap = new Map();
  let tradeRealizedPnL = 0;
  let otherReturnPnL = 0;
  const sortedTransactions = [...transactions].sort((left, right) => left.date.localeCompare(right.date));

  for (const transaction of sortedTransactions) {
    const bucketKey = transaction.ticker || "";
    if (!assetMap.has(bucketKey) && bucketKey) {
      assetMap.set(bucketKey, {
        ticker: bucketKey,
        shares: 0,
        totalCostBasis: 0,
        realizedPnL: 0,
        incomeExpensePnL: 0,
        grossInvested: 0,
        currency: transaction.currency || "USD",
      });
    }

    if (TRADE_TYPES.has(transaction.type)) {
      if (!bucketKey) continue;
      const asset = assetMap.get(bucketKey);
      const tradeCashMagnitude = Math.abs(transaction.cashImpact);

      if (transaction.type === "BUY") {
        asset.shares += transaction.quantity;
        asset.totalCostBasis += tradeCashMagnitude;
        asset.grossInvested += tradeCashMagnitude;
      } else {
        if (asset.shares <= 0) continue;
        const averageCost = asset.totalCostBasis / asset.shares;
        const sharesToRemove = Math.min(transaction.quantity, asset.shares);
        const removedCostBasis = averageCost * sharesToRemove;
        const saleNetProceeds = tradeCashMagnitude;
        const realizedPiece = saleNetProceeds - removedCostBasis;
        asset.realizedPnL += realizedPiece;
        tradeRealizedPnL += realizedPiece;
        asset.shares -= sharesToRemove;
        asset.totalCostBasis -= removedCostBasis;
      }
      continue;
    }

    if (["DIVIDEND", "INTEREST", "FEE", "TAX", "INCOME"].includes(transaction.type)) {
      otherReturnPnL += transaction.cashImpact;
    }

    if (["DIVIDEND", "INTEREST", "FEE", "TAX", "INCOME"].includes(transaction.type) && bucketKey) {
      const asset = assetMap.get(bucketKey) || {
        ticker: bucketKey,
        shares: 0,
        totalCostBasis: 0,
        realizedPnL: 0,
        incomeExpensePnL: 0,
        grossInvested: 0,
        currency: transaction.currency || "USD",
      };
      asset.incomeExpensePnL += transaction.cashImpact;
      assetMap.set(bucketKey, asset);
    }
  }

  const ledgerAssetPerformance = [...assetMap.values()].map((asset) => {
    const priceEntry = prices[asset.ticker] || { price: 0, currency: asset.currency };
    const currentPrice = Number(priceEntry.price || 0);
    const averageCost = asset.shares > 0 ? asset.totalCostBasis / asset.shares : 0;
    const marketValue = asset.shares * currentPrice;
    const unrealizedPnL = marketValue - asset.totalCostBasis;
    const totalPnL = asset.realizedPnL + unrealizedPnL + asset.incomeExpensePnL;
    const returnBase = asset.grossInvested > 0 ? asset.grossInvested : asset.totalCostBasis;
    const returnPct = returnBase > 0 ? (totalPnL / returnBase) * 100 : 0;

    return {
      ticker: asset.ticker,
      shares: roundNumber(asset.shares),
      averageCost: roundNumber(averageCost),
      totalCostBasis: roundNumber(asset.totalCostBasis),
      currentPrice: roundNumber(currentPrice),
      marketValue: roundNumber(marketValue),
      realizedPnL: roundNumber(asset.realizedPnL + asset.incomeExpensePnL),
      tradeRealizedPnL: roundNumber(asset.realizedPnL),
      unrealizedPnL: roundNumber(unrealizedPnL),
      totalPnL: roundNumber(totalPnL),
      returnPct: roundNumber(returnPct),
    };
  });

  const statementOpenPositions = Array.isArray(statement?.openPositions) ? statement.openPositions : [];
  const statementPerformance = Array.isArray(statement?.performanceByAsset) ? statement.performanceByAsset : [];
  const statementOpenPositionMap = new Map(statementOpenPositions.map((position) => [position.ticker, position]));
  const statementPerformanceMap = new Map(statementPerformance.map((asset) => [asset.ticker, asset]));
  const openHoldingsSource = statementOpenPositions.length
    ? statementOpenPositions.map((position) => ({
        ticker: position.ticker,
        shares: roundNumber(position.shares),
        averageCost: roundNumber(position.averageCost),
        totalCostBasis: roundNumber(position.totalCostBasis),
        currentPrice: roundNumber(position.currentPrice),
        marketValue: roundNumber(position.marketValue),
        realizedPnL: roundNumber(statementPerformanceMap.get(position.ticker)?.realizedPnL || 0),
        unrealizedPnL: roundNumber(position.unrealizedPnL),
        totalPnL: roundNumber((statementPerformanceMap.get(position.ticker)?.realizedPnL || 0) + position.unrealizedPnL),
        returnPct: roundNumber(
          position.totalCostBasis > 0
            ? (((statementPerformanceMap.get(position.ticker)?.totalPnL || position.unrealizedPnL) / position.totalCostBasis) * 100)
            : 0
        ),
        isStatementPrice: true,
      }))
    : ledgerAssetPerformance.filter((asset) => asset.shares > 0.0000001).map((asset) => ({ ...asset, isStatementPrice: false }));

  const cash = statement?.netAssetValue?.cash ?? calculateCashBalance(transactions);
  const stockValue = statement?.netAssetValue?.stockValue ?? openHoldingsSource.reduce((sum, holding) => sum + holding.marketValue, 0);
  const deployedCapital = statement?.openPositionsTotals?.costBasis ?? openHoldingsSource.reduce((sum, holding) => sum + holding.totalCostBasis, 0);
  const portfolioValue = statement?.changeInNav?.endingValue ?? statement?.netAssetValue?.endingValue ?? roundNumber(stockValue + cash);
  const allocationBase = roundNumber(openHoldingsSource.reduce((sum, holding) => sum + holding.marketValue, 0) + cash);
  const costBaseForWeights = deployedCapital + Math.max(cash, 0);

  const holdings = openHoldingsSource
    .filter((holding) => holding.shares > 0.0000001)
    .map((holding) => ({
      ...holding,
      portfolioWeight: allocationBase !== 0 ? roundNumber((holding.marketValue / allocationBase) * 100) : 0,
      costWeight: costBaseForWeights > 0 ? roundNumber((holding.totalCostBasis / costBaseForWeights) * 100) : 0,
    }))
    .sort((left, right) => right.marketValue - left.marketValue);

  const holdingsWithCash = [...holdings];
  if (statement || Math.abs(cash) > 0.0000001) {
    holdingsWithCash.push({
      ticker: "CASH",
      shares: roundNumber(cash),
      averageCost: 1,
      totalCostBasis: roundNumber(Math.max(cash, 0)),
      currentPrice: 1,
      marketValue: roundNumber(cash),
      realizedPnL: 0,
      unrealizedPnL: 0,
      totalPnL: 0,
      returnPct: 0,
      isStatementPrice: true,
      portfolioWeight: allocationBase !== 0 ? roundNumber((cash / allocationBase) * 100) : 0,
      costWeight: costBaseForWeights > 0 ? roundNumber((Math.max(cash, 0) / costBaseForWeights) * 100) : 0,
    });
  }
  holdingsWithCash.sort((left, right) => right.marketValue - left.marketValue);
  const positionsForAllocation = holdingsWithCash.filter((position) => Math.abs(position.marketValue) > 0.0000001);

  const assetTickers = new Set([
    ...ledgerAssetPerformance.map((asset) => asset.ticker),
    ...statementPerformance.map((asset) => asset.ticker),
    ...statementOpenPositions.map((position) => position.ticker),
  ]);

  const assetPerformance = [...assetTickers]
    .filter(Boolean)
    .map((ticker) => {
      const ledgerAsset = ledgerAssetPerformance.find((asset) => asset.ticker === ticker);
      const statementAsset = statementPerformanceMap.get(ticker);
      const statementPosition = statementOpenPositionMap.get(ticker);
      const realizedPnL = statementAsset ? statementAsset.realizedPnL : ledgerAsset?.realizedPnL || 0;
      const unrealizedPnL = statementAsset
        ? statementAsset.unrealizedPnL
        : statementPosition?.unrealizedPnL || ledgerAsset?.unrealizedPnL || 0;
      const totalPnL = statementAsset ? statementAsset.totalPnL : ledgerAsset?.totalPnL || realizedPnL + unrealizedPnL;
      const marketValue = statementPosition ? statementPosition.marketValue : ledgerAsset?.marketValue || 0;
      const returnBase = statementPosition?.totalCostBasis || ledgerAsset?.totalCostBasis || ledgerAsset?.grossInvested || 0;

      return {
        ticker,
        realizedPnL: roundNumber(realizedPnL),
        unrealizedPnL: roundNumber(unrealizedPnL),
        totalPnL: roundNumber(totalPnL),
        marketValue: roundNumber(marketValue),
        returnPct: returnBase > 0 ? roundNumber((totalPnL / returnBase) * 100) : 0,
      };
    })
    .sort((left, right) => right.totalPnL - left.totalPnL);

  return {
    assetPerformance,
    holdings: holdingsWithCash,
    openHoldings: holdings,
    positionsForAllocation,
    cash: roundNumber(cash),
    deployedCapital: roundNumber(deployedCapital),
    portfolioValue: roundNumber(portfolioValue),
    stockValue: roundNumber(stockValue),
    tradeRealizedPnL: roundNumber(tradeRealizedPnL),
    otherReturnPnL: roundNumber(otherReturnPnL),
  };
}

function calculateCashBalance(transactions) {
  return roundNumber(transactions.reduce((sum, transaction) => sum + transaction.cashImpact, 0));
}

function getActiveValuationDate(transactions, statement) {
  if (statement?.statementInfo?.endDate) {
    return statement.statementInfo.endDate;
  }

  const transactionDates = [...transactions]
    .map((transaction) => transaction.date)
    .filter(Boolean)
    .sort();
  const latestTransactionDate = transactionDates[transactionDates.length - 1];

  return latestTransactionDate || new Date().toISOString().slice(0, 10);
}

function getPortfolioInceptionDate(transactions) {
  return [...transactions]
    .map((transaction) => transaction.date)
    .filter(Boolean)
    .sort()[0] || "";
}

function calculatePointInTimePortfolioState(transactions, cutoffDate) {
  const assetMap = new Map();
  let cash = 0;
  const sortedTransactions = [...transactions]
    .filter((transaction) => transaction.date && transaction.date < cutoffDate)
    .sort((left, right) => left.date.localeCompare(right.date));

  for (const transaction of sortedTransactions) {
    cash += transaction.cashImpact;

    if (!TRADE_TYPES.has(transaction.type) || !transaction.ticker) continue;

    if (!assetMap.has(transaction.ticker)) {
      assetMap.set(transaction.ticker, {
        shares: 0,
        totalCostBasis: 0,
      });
    }

    const asset = assetMap.get(transaction.ticker);
    const tradeCashMagnitude = Math.abs(transaction.cashImpact);

    if (transaction.type === "BUY") {
      asset.shares += transaction.quantity;
      asset.totalCostBasis += tradeCashMagnitude;
      continue;
    }

    if (asset.shares <= 0) continue;
    const sharesToRemove = Math.min(transaction.quantity, asset.shares);
    const averageCost = asset.totalCostBasis / asset.shares;
    const removedCostBasis = averageCost * sharesToRemove;
    asset.shares -= sharesToRemove;
    asset.totalCostBasis -= removedCostBasis;
  }

  const holdingsValue = [...assetMap.values()]
    .filter((asset) => asset.shares > 0.0000001)
    .reduce((sum, asset) => sum + asset.totalCostBasis, 0);

  return {
    cash: roundNumber(cash),
    holdingsValue: roundNumber(holdingsValue),
    portfolioValue: roundNumber(cash + holdingsValue),
  };
}

function calculateModifiedDietzReturn({ startDate, endDate, beginningValue, endingValue, cashFlows }) {
  if (!startDate || !endDate) return null;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const totalDays = (end - start) / (1000 * 60 * 60 * 24);

  if (!Number.isFinite(totalDays) || totalDays <= 0) return null;

  const periodCashFlows = (cashFlows || []).filter((flow) => flow.date && flow.date >= startDate && flow.date <= endDate && flow.amount !== 0);
  const netCashFlows = periodCashFlows.reduce((sum, flow) => sum + flow.amount, 0);
  const weightedCashFlows = periodCashFlows.reduce((sum, flow) => {
    const flowDate = new Date(`${flow.date}T00:00:00`);
    const elapsedDays = (flowDate - start) / (1000 * 60 * 60 * 24);
    const weight = 1 - elapsedDays / totalDays;
    return sum + weight * flow.amount;
  }, 0);

  const denominator = beginningValue + weightedCashFlows;
  if (Math.abs(denominator) < 0.0000001) return null;

  const numerator = endingValue - beginningValue - netCashFlows;
  return roundNumber(numerator / denominator);
}

function buildExternalReturnCashFlows(transactions) {
  return transactions
    .filter((transaction) => ["DEPOSIT", "WITHDRAWAL"].includes(transaction.type) && transaction.date)
    .map((transaction) => ({
      date: transaction.date,
      amount: transaction.type === "DEPOSIT" ? Math.abs(transaction.amount) : -Math.abs(transaction.amount),
    }));
}

function calculateSummary(transactions, analytics, statement) {
  const totalDeposits = transactions.filter((transaction) => transaction.type === "DEPOSIT").reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalWithdrawals = transactions.filter((transaction) => transaction.type === "WITHDRAWAL").reduce((sum, transaction) => sum + transaction.amount, 0);
  const committedCapital = totalDeposits;
  const netContributions = statement?.changeInNav?.depositsWithdrawals ?? totalDeposits - totalWithdrawals;
  const netInvestedCapital = analytics.deployedCapital;
  const realizedPnL = statement?.performanceTotals?.realizedPnL ?? analytics.tradeRealizedPnL;
  const unrealizedPnL = statement?.performanceTotals?.unrealizedPnL ?? analytics.openHoldings.reduce((sum, holding) => sum + holding.unrealizedPnL, 0);
  const totalPnL = statement?.performanceTotals?.totalPnL ?? realizedPnL + unrealizedPnL + analytics.otherReturnPnL;
  const valuationDate = getActiveValuationDate(transactions, statement);
  const inceptionDate = getPortfolioInceptionDate(transactions);
  const irrValue = calculatePortfolioXirr(
    transactions,
    analytics.portfolioValue,
    valuationDate
  );
  const externalCashFlows = buildExternalReturnCashFlows(transactions);
  const ytdStartDate = valuationDate ? `${valuationDate.slice(0, 4)}-01-01` : "";
  const ytdOpeningState = ytdStartDate ? calculatePointInTimePortfolioState(transactions, ytdStartDate) : null;
  const ytdValue =
    ytdStartDate && valuationDate > ytdStartDate
      ? calculateModifiedDietzReturn({
          startDate: ytdStartDate,
          endDate: valuationDate,
          beginningValue: ytdOpeningState?.portfolioValue || 0,
          endingValue: analytics.portfolioValue,
          cashFlows: externalCashFlows,
        })
      : null;
  const itdValue =
    inceptionDate && valuationDate > inceptionDate
      ? calculateModifiedDietzReturn({
          startDate: inceptionDate,
          endDate: valuationDate,
          beginningValue: 0,
          endingValue: analytics.portfolioValue,
          cashFlows: externalCashFlows,
        })
      : null;
  const netContributionReturn = netContributions > 0 ? roundNumber(analytics.portfolioValue / netContributions - 1) : null;
  syncUiState.returnTrust = null;
  const reconciliationRows = statement
    ? [
        buildReconciliationRow("Net Contributions", netContributions, statement.changeInNav?.depositsWithdrawals ?? netContributions),
        buildReconciliationRow("Cash", analytics.cash, statement.netAssetValue?.cash ?? analytics.cash),
        buildReconciliationRow("Portfolio Value", analytics.portfolioValue, statement.changeInNav?.endingValue ?? analytics.portfolioValue),
        buildReconciliationRow("Realized P&L", realizedPnL, statement.performanceTotals?.realizedPnL ?? realizedPnL),
        buildReconciliationRow("Unrealized P&L", unrealizedPnL, statement.performanceTotals?.unrealizedPnL ?? unrealizedPnL),
        buildReconciliationRow("Total P&L", totalPnL, statement.performanceTotals?.totalPnL ?? totalPnL),
      ]
    : [];

  return {
    committedCapital: roundNumber(committedCapital),
    totalDeposits: roundNumber(totalDeposits),
    totalWithdrawals: roundNumber(totalWithdrawals),
    netContributions: roundNumber(netContributions),
    netInvestedCapital: roundNumber(netInvestedCapital),
    portfolioValue: analytics.portfolioValue,
    cash: analytics.cash,
    deployedCapital: analytics.deployedCapital,
    realizedPnL: roundNumber(realizedPnL),
    unrealizedPnL: roundNumber(unrealizedPnL),
    totalPnL: roundNumber(totalPnL),
    markToMarketPnL: roundNumber(statement?.changeInNav?.markToMarket ?? totalPnL),
    unrealizedReturnPct: analytics.deployedCapital > 0 ? roundNumber((unrealizedPnL / analytics.deployedCapital) * 100) : 0,
    cashShareOfPortfolio: analytics.portfolioValue > 0 ? roundNumber((analytics.cash / analytics.portfolioValue) * 100) : 0,
    deployedShareOfPortfolio: analytics.portfolioValue > 0 ? roundNumber((analytics.deployedCapital / analytics.portfolioValue) * 100) : 0,
    positionCount: analytics.positionsForAllocation.filter((position) => position.ticker !== "CASH").length + (Math.abs(analytics.cash) > 0.0000001 ? 1 : 0),
    irrLabel: irrValue === null ? "Insufficient Data" : formatPercent(irrValue * 100),
    twrLabel:
      statement?.netAssetValue?.timeWeightedReturn !== undefined && statement?.netAssetValue?.timeWeightedReturn !== null
        ? formatPercent(statement.netAssetValue.timeWeightedReturn)
        : "Insufficient Data",
    ytdLabel: ytdValue === null ? "Insufficient Data" : formatPercent(ytdValue * 100),
    itdLabel: itdValue === null ? "Insufficient Data" : formatPercent(itdValue * 100),
    netContributionReturnLabel: netContributionReturn === null ? "Insufficient Data" : formatPercent(netContributionReturn * 100),
    cashShareLabel:
      analytics.portfolioValue > 0 ? `${formatPercent((analytics.cash / analytics.portfolioValue) * 100)} of portfolio` : "Insufficient Data",
    deployedShareLabel:
      analytics.portfolioValue > 0
        ? `${formatPercent((analytics.deployedCapital / analytics.portfolioValue) * 100)} of portfolio`
        : "Insufficient Data",
    irrValue,
    ytdValue,
    itdValue,
    netContributionReturn,
    valuationDate,
    inceptionDate,
    reconciliationRows,
  };
}

function ensureTickerPriceEntry(ticker, currency) {
  if (!ticker || ticker === "CASH") return;
  if (!state.manual.prices[ticker]) {
    state.manual.prices[ticker] = { price: 0, currency: currency || "USD", source: "manual" };
  }
}

function buildReconciliationRow(label, appValue, ibkrValue) {
  return {
    label,
    appValue: roundNumber(appValue),
    ibkrValue: roundNumber(ibkrValue),
    difference: roundNumber(appValue - ibkrValue),
  };
}

function calculatePortfolioXirr(transactions, terminalValue, terminalDate) {
  const cashFlows = buildIrrCashFlows(transactions, terminalValue, terminalDate);
  if (cashFlows.length < 2) return null;

  const hasPositive = cashFlows.some((flow) => flow.amount > 0);
  const hasNegative = cashFlows.some((flow) => flow.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  return solveXirr(cashFlows);
}

function buildIrrCashFlows(transactions, terminalValue, terminalDate) {
  const cashFlows = transactions
    .filter((transaction) => ["DEPOSIT", "WITHDRAWAL"].includes(transaction.type) && transaction.date)
    .map((transaction) => ({
      date: transaction.date,
      amount: roundNumber(getIrrCashFlowAmount(transaction)),
    }))
    .filter((flow) => flow.amount !== 0);

  if (terminalDate && terminalValue > 0) {
    cashFlows.push({
      date: terminalDate,
      amount: roundNumber(terminalValue),
    });
  }

  return cashFlows.sort((left, right) => left.date.localeCompare(right.date));
}

function getIrrCashFlowAmount(transaction) {
  if (transaction.type === "DEPOSIT") return -Math.abs(transaction.amount);
  if (transaction.type === "WITHDRAWAL") return Math.abs(transaction.amount);
  return 0;
}

function solveXirr(cashFlows) {
  const normalizedFlows = cashFlows.map((flow) => ({
    amount: Number(flow.amount),
    date: new Date(`${flow.date}T00:00:00`),
  }));
  const baseDate = normalizedFlows[0].date;
  const years = normalizedFlows.map((flow) => (flow.date - baseDate) / (1000 * 60 * 60 * 24 * 365));

  const xnpv = (rate) =>
    normalizedFlows.reduce((sum, flow, index) => sum + flow.amount / (1 + rate) ** years[index], 0);

  const derivative = (rate) =>
    normalizedFlows.reduce((sum, flow, index) => {
      if (years[index] === 0) return sum;
      return sum - (years[index] * flow.amount) / (1 + rate) ** (years[index] + 1);
    }, 0);

  let rate = 0.1;
  for (let index = 0; index < 60; index += 1) {
    const value = xnpv(rate);
    const slope = derivative(rate);
    if (!Number.isFinite(value) || !Number.isFinite(slope) || Math.abs(slope) < 1e-12) break;
    const nextRate = rate - value / slope;
    if (!Number.isFinite(nextRate) || nextRate <= -0.9999) break;
    if (Math.abs(nextRate - rate) < 1e-9) return roundNumber(nextRate);
    rate = nextRate;
  }

  let low = -0.9999;
  let high = 10;
  let lowValue = xnpv(low);
  let highValue = xnpv(high);

  for (let index = 0; index < 100 && lowValue * highValue > 0; index += 1) {
    high *= 2;
    highValue = xnpv(high);
    if (high > 1000) return null;
  }

  for (let index = 0; index < 200; index += 1) {
    const mid = (low + high) / 2;
    const midValue = xnpv(mid);
    if (!Number.isFinite(midValue)) return null;
    if (Math.abs(midValue) < 1e-9) return roundNumber(mid);

    if (lowValue * midValue <= 0) {
      high = mid;
      highValue = midValue;
    } else {
      low = mid;
      lowValue = midValue;
    }
  }

  return roundNumber((low + high) / 2);
}

function isValidTransaction(transaction) {
  if (!transaction.date || !transaction.type || !transaction.currency || transaction.fxRate <= 0) return false;
  if (TRADE_TYPES.has(transaction.type)) return Boolean(transaction.ticker && transaction.quantity > 0 && transaction.price > 0);
  if (AMOUNT_TYPES.has(transaction.type)) return transaction.amount > 0;
  return false;
}

function importIbkrActivityCsv(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) {
    return emptyImportResult("The CSV file appears to be empty.");
  }

  const sectionParsers = {
    Trades: parseIbkrTradesSection,
    "Deposits & Withdrawals": parseIbkrDepositsSection,
    Dividends: parseIbkrDividendsSection,
    Interest: parseIbkrInterestSection,
    "Transaction Fees": parseIbkrTransactionFeesSection,
    "Withholding Tax": parseIbkrWithholdingTaxSection,
  };

  const sections = groupIbkrSections(rows);
  const statement = buildIbkrStatementSnapshot(sections);
  const transactions = [];
  const counts = { trades: 0, deposits: 0, withdrawals: 0, dividends: 0, interest: 0, fees: 0, tax: 0, income: 0 };
  let skippedRows = 0;
  const sectionsDetected = new Set();
  const statementSections = [
    "Statement",
    "Open Positions",
    "Net Asset Value",
    "Change in NAV",
    "Realized & Unrealized Performance Summary",
    "Mark-to-Market Performance Summary",
  ];

  statementSections.forEach((sectionName) => {
    if (sections.get(sectionName)?.length) {
      sectionsDetected.add(sectionName);
    }
  });

  for (const [sectionName, parser] of Object.entries(sectionParsers)) {
    const sectionRows = sections.get(sectionName) || [];
    if (!sectionRows.length) continue;

    sectionsDetected.add(sectionName);
    const parsed = parser(sectionRows);
    parsed.transactions.forEach((transaction) => transactions.push(transaction));
    skippedRows += parsed.skippedRows;

    Object.keys(parsed.counts).forEach((key) => {
      counts[key] = (counts[key] || 0) + parsed.counts[key];
    });
  }

  if (!transactions.length) {
    return emptyImportResult("No supported IBKR rows were imported. Use an Interactive Brokers Activity Statement CSV export.", sectionsDetected, counts, skippedRows, statement);
  }

  return {
    transactions,
    statement,
    counts,
    skippedRows,
    sectionsDetected,
    message: "",
  };
}

function emptyImportResult(message, sectionsDetected = new Set(), counts = {}, skippedRows = 0, statement = null) {
  return {
    transactions: [],
    statement,
    counts: { trades: 0, deposits: 0, withdrawals: 0, dividends: 0, interest: 0, fees: 0, tax: 0, income: 0, ...counts },
    skippedRows,
    sectionsDetected,
    message,
  };
}

function buildIbkrStatementSnapshot(sections) {
  const statementInfo = parseIbkrStatementSection(sections.get("Statement") || []);
  const fxRates = parseIbkrFxRates(sections.get("Mark-to-Market Performance Summary") || []);
  const openPositions = parseIbkrOpenPositionsSection(sections.get("Open Positions") || [], fxRates);
  const netAssetValue = parseIbkrNetAssetValueSection(sections.get("Net Asset Value") || []);
  const changeInNav = parseIbkrChangeInNavSection(sections.get("Change in NAV") || []);
  const performance = parseIbkrRealizedUnrealizedSection(sections.get("Realized & Unrealized Performance Summary") || []);

  return normalizeStatementSnapshot({
    statementInfo,
    fxRates,
    openPositions: openPositions.positions,
    openPositionsTotals: openPositions.totals,
    netAssetValue,
    changeInNav,
    performanceTotals: performance.totals,
    performanceByAsset: performance.assets,
  });
}

function parseIbkrStatementSection(rows) {
  const statementInfo = {};
  let header = [];

  for (const row of rows) {
    const kind = String(row[1] || "").trim();
    if (kind === "Header") {
      header = row.slice(2).map(normalizeHeader);
      continue;
    }

    if (kind !== "Data") continue;
    const record = buildRecord(header, row.slice(2));
    const fieldName = String(record["field name"] || "").trim();
    const fieldValue = String(record["field value"] || "").trim();

    if (fieldName === "Period") {
      statementInfo.periodLabel = fieldValue;
      statementInfo.endDate = extractStatementPeriodEndDate(fieldValue);
    }
  }

  return statementInfo;
}

function parseIbkrFxRates(rows) {
  const fxRates = { USD: 1 };
  let header = [];

  for (const row of rows) {
    const kind = String(row[1] || "").trim();
    if (kind === "Header") {
      header = row.slice(2).map(normalizeHeader);
      continue;
    }

    if (kind !== "Data") continue;
    const record = buildRecord(header, row.slice(2));
    if (String(record["asset category"] || "").trim() !== "Forex") continue;

    const currency = String(record.symbol || "").trim().toUpperCase();
    const currentPrice = sanitizeNumber(record["current price"]);
    if (currency && currentPrice) {
      fxRates[currency] = currentPrice;
    }
  }

  return fxRates;
}

function parseIbkrOpenPositionsSection(rows, fxRates) {
  const positions = [];
  let header = [];
  let latestUsdTotals = null;

  for (const row of rows) {
    const kind = String(row[1] || "").trim();
    if (kind === "Header") {
      header = row.slice(2).map(normalizeHeader);
      continue;
    }

    if (kind === "Data" && String(row[2] || "").trim() === "Summary" && String(row[3] || "").trim() === "Stocks") {
      const record = buildRecord(header, row.slice(2));
      const currency = String(record.currency || "USD").trim().toUpperCase();
      const fxRate = fxRates[currency] || 1;
      const shares = sanitizeNumber(record.quantity);
      const localCostBasis = sanitizeNumber(record["cost basis"]);
      const localClosePrice = sanitizeNumber(record["close price"]);
      const localValue = sanitizeNumber(record.value);
      const localUnrealized = sanitizeSignedNumber(record["unrealized p/l"]);

      positions.push({
        ticker: String(record.symbol || "").trim().toUpperCase(),
        currency,
        fxRate: roundNumber(fxRate),
        shares: roundNumber(shares),
        averageCost: roundNumber(shares > 0 ? (localCostBasis * fxRate) / shares : 0),
        totalCostBasis: roundNumber(localCostBasis * fxRate),
        currentPrice: roundNumber(localClosePrice * fxRate),
        marketValue: roundNumber(localValue * fxRate),
        unrealizedPnL: roundNumber(localUnrealized * fxRate),
      });
      continue;
    }

    if (kind === "Total" && String(row[3] || "").trim() === "Stocks" && String(row[4] || "").trim() === "USD") {
      const record = buildRecord(header, row.slice(2));
      latestUsdTotals = {
        costBasis: roundNumber(sanitizeNumber(record["cost basis"])),
        marketValue: roundNumber(sanitizeNumber(record.value)),
        unrealizedPnL: roundNumber(sanitizeSignedNumber(record["unrealized p/l"])),
      };
    }
  }

  const totals =
    latestUsdTotals || {
      costBasis: roundNumber(positions.reduce((sum, position) => sum + position.totalCostBasis, 0)),
      marketValue: roundNumber(positions.reduce((sum, position) => sum + position.marketValue, 0)),
      unrealizedPnL: roundNumber(positions.reduce((sum, position) => sum + position.unrealizedPnL, 0)),
    };

  return {
    positions: positions.filter((position) => position.ticker && position.shares > 0.0000001),
    totals,
  };
}

function parseIbkrNetAssetValueSection(rows) {
  const netAssetValue = {};
  let mode = "";
  let header = [];

  for (const row of rows) {
    const kind = String(row[1] || "").trim();
    if (kind === "Header") {
      header = row.slice(2).map(normalizeHeader);
      mode = header[0] === "asset class" ? "asset-class" : header[0] === "time weighted rate of return" ? "twr" : "";
      continue;
    }

    if (kind !== "Data") continue;

    if (mode === "asset-class") {
      const record = buildRecord(header, row.slice(2));
      const assetClass = String(record["asset class"] || "").trim();
      const currentTotal = sanitizeSignedNumber(record["current total"]);

      if (assetClass === "Cash") netAssetValue.cash = roundNumber(currentTotal);
      if (assetClass === "Stock") netAssetValue.stockValue = roundNumber(currentTotal);
      if (assetClass === "Interest Accruals") netAssetValue.interestAccruals = roundNumber(currentTotal);
      if (assetClass === "Total") netAssetValue.endingValue = roundNumber(currentTotal);
      continue;
    }

    if (mode === "twr") {
      const twrRaw = String(row[2] || "").replace("%", "").trim();
      const twrValue = Number(twrRaw);
      if (Number.isFinite(twrValue)) {
        netAssetValue.timeWeightedReturn = roundNumber(twrValue);
      }
    }
  }

  return netAssetValue;
}

function parseIbkrChangeInNavSection(rows) {
  const result = {};
  let header = [];

  for (const row of rows) {
    const kind = String(row[1] || "").trim();
    if (kind === "Header") {
      header = row.slice(2).map(normalizeHeader);
      continue;
    }

    if (kind !== "Data") continue;

    const record = buildRecord(header, row.slice(2));
    const fieldName = String(record["field name"] || "").trim();
    const fieldValue = sanitizeSignedNumber(record["field value"]);

    if (!fieldName) continue;
    if (fieldName === "Deposits & Withdrawals") result.depositsWithdrawals = roundNumber(fieldValue);
    if (fieldName === "Mark-to-Market") result.markToMarket = roundNumber(fieldValue);
    if (fieldName === "Ending Value") result.endingValue = roundNumber(fieldValue);
  }

  return result;
}

function parseIbkrRealizedUnrealizedSection(rows) {
  const assets = [];
  const totals = {};
  let header = [];

  for (const row of rows) {
    const kind = String(row[1] || "").trim();
    if (kind === "Header") {
      header = row.slice(2).map(normalizeHeader);
      continue;
    }

    if (kind !== "Data") continue;
    const record = buildRecord(header, row.slice(2));
    const assetCategory = String(record["asset category"] || "").trim();
    const symbol = String(record.symbol || "").trim().toUpperCase();
    const realizedTotal = sanitizeSignedNumber(record["realized total"]);
    const unrealizedTotal = sanitizeSignedNumber(record["unrealized total"]);
    const total = sanitizeSignedNumber(record.total);

    if (assetCategory === "Stocks" && symbol) {
      assets.push({
        ticker: symbol,
        realizedPnL: roundNumber(realizedTotal),
        unrealizedPnL: roundNumber(unrealizedTotal),
        totalPnL: roundNumber(total),
      });
      continue;
    }

    if (assetCategory === "Total (All Assets)") {
      totals.realizedPnL = roundNumber(realizedTotal);
      totals.unrealizedPnL = roundNumber(unrealizedTotal);
      totals.totalPnL = roundNumber(total);
    }
  }

  return { assets, totals };
}

function groupIbkrSections(rows) {
  const sections = new Map();

  for (const row of rows) {
    const sectionName = String(row[0] || "").trim();
    if (!sectionName) continue;
    if (!sections.has(sectionName)) {
      sections.set(sectionName, []);
    }
    sections.get(sectionName).push(row);
  }

  return sections;
}

function parseIbkrTradesSection(rows) {
  const result = { transactions: [], skippedRows: 0, counts: { trades: 0 } };
  let header = [];

  for (const row of rows) {
    const kind = String(row[1] || "").trim();
    if (kind === "Header") {
      header = row.slice(2).map(normalizeHeader);
      continue;
    }

    if (kind !== "Data" || String(row[2] || "").trim() !== "Order") continue;
    if (String(row[3] || "").trim() !== "Stocks") continue;

    const record = buildRecord(header, row.slice(2));
    const date = normalizeDate(record["date/time"]);
    const ticker = String(record.symbol || "").trim().toUpperCase();
    const quantityRaw = sanitizeSignedNumber(record.quantity);
    const price = sanitizeNumber(record["t. price"]);
    const proceeds = sanitizeSignedNumber(record.proceeds);
    const commission = sanitizeSignedNumber(record["comm/fee"] || record["comm in usd"]);
    const currency = String(record.currency || "USD").trim().toUpperCase();

    if (!date || !ticker || !quantityRaw || !price) {
      result.skippedRows += 1;
      continue;
    }

    const type = quantityRaw > 0 ? "BUY" : "SELL";
    const quantity = Math.abs(quantityRaw);
    const signedCashImpact = roundNumber(proceeds + commission);

    const transaction = normalizeTransaction({
      id: buildImportId(date, type, ticker, quantity, price, Math.abs(signedCashImpact), "IBKR Trades"),
      date,
      type,
      ticker,
      quantity,
      price,
      fxRate: 1,
      currency,
      amount: Math.abs(signedCashImpact),
      cashImpact: signedCashImpact,
      notes: "Imported from IBKR Trades",
      sourceSection: "Trades",
    });

    if (!isValidTransaction(transaction)) {
      result.skippedRows += 1;
      continue;
    }

    result.transactions.push(transaction);
    result.counts.trades += 1;
  }

  return result;
}

function parseIbkrDepositsSection(rows) {
  const result = { transactions: [], skippedRows: 0, counts: { deposits: 0, withdrawals: 0 } };
  let header = [];

  for (const row of rows) {
    const kind = String(row[1] || "").trim();
    if (kind === "Header") {
      header = row.slice(2).map(normalizeHeader);
      continue;
    }

    if (kind !== "Data") continue;
    if (String(row[2] || "").trim() === "Total") continue;

    const record = buildRecord(header, row.slice(2));
    const date = normalizeDate(record["settle date"]);
    const amountRaw = sanitizeSignedNumber(record.amount);
    const currency = String(record.currency || "USD").trim().toUpperCase();

    if (!date || !amountRaw) {
      result.skippedRows += 1;
      continue;
    }

    const type = amountRaw >= 0 ? "DEPOSIT" : "WITHDRAWAL";
    result.transactions.push(
      normalizeTransaction({
        id: buildImportId(date, type, "", 0, 0, Math.abs(amountRaw), "IBKR Deposits & Withdrawals"),
        date,
        type,
        ticker: "",
        quantity: 0,
        price: 0,
        fxRate: 1,
        currency,
        amount: Math.abs(amountRaw),
        cashImpact: amountRaw,
        notes: String(record.description || "Imported from IBKR Deposits & Withdrawals").trim(),
        sourceSection: "Deposits & Withdrawals",
      })
    );

    if (type === "DEPOSIT") result.counts.deposits += 1;
    else result.counts.withdrawals += 1;
  }

  return result;
}

function parseIbkrDividendsSection(rows) {
  const result = { transactions: [], skippedRows: 0, counts: { dividends: 0 } };
  let header = [];

  for (const row of rows) {
    const kind = String(row[1] || "").trim();
    if (kind === "Header") {
      header = row.slice(2).map(normalizeHeader);
      continue;
    }

    if (kind !== "Data") continue;
    const lead = String(row[2] || "").trim();
    if (lead === "Total" || lead.startsWith("Total")) continue;

    const record = buildRecord(header, row.slice(2));
    const date = normalizeDate(record.date);
    const amountRaw = sanitizeSignedNumber(record.amount);
    const description = String(record.description || "Imported from IBKR Dividends").trim();
    const ticker = extractTickerFromDescription(description);
    const currency = String(record.currency || "USD").trim().toUpperCase();

    if (!date || !amountRaw) {
      result.skippedRows += 1;
      continue;
    }

    result.transactions.push(
      normalizeTransaction({
        id: buildImportId(date, "DIVIDEND", ticker, 0, 0, Math.abs(amountRaw), description),
        date,
        type: "DIVIDEND",
        ticker,
        quantity: 0,
        price: 0,
        fxRate: 1,
        currency,
        amount: Math.abs(amountRaw),
        cashImpact: amountRaw,
        notes: description,
        sourceSection: "Dividends",
      })
    );
    result.counts.dividends += 1;
  }

  return result;
}

function parseIbkrInterestSection(rows) {
  const result = { transactions: [], skippedRows: 0, counts: { interest: 0 } };
  let header = [];

  for (const row of rows) {
    const kind = String(row[1] || "").trim();
    if (kind === "Header") {
      header = row.slice(2).map(normalizeHeader);
      continue;
    }

    if (kind !== "Data") continue;
    const lead = String(row[2] || "").trim();
    if (lead === "Total" || lead.startsWith("Total")) continue;

    const record = buildRecord(header, row.slice(2));
    const date = normalizeDate(record.date);
    const amountRaw = sanitizeSignedNumber(record.amount);
    const description = String(record.description || "Imported from IBKR Interest").trim();
    const currency = String(record.currency || "USD").trim().toUpperCase();

    if (!date || !amountRaw) {
      result.skippedRows += 1;
      continue;
    }

    result.transactions.push(
      normalizeTransaction({
        id: buildImportId(date, "INTEREST", "", 0, 0, Math.abs(amountRaw), description),
        date,
        type: "INTEREST",
        ticker: "",
        quantity: 0,
        price: 0,
        fxRate: 1,
        currency,
        amount: Math.abs(amountRaw),
        cashImpact: amountRaw,
        notes: description,
        sourceSection: "Interest",
      })
    );
    result.counts.interest += 1;
  }

  return result;
}

function parseIbkrTransactionFeesSection(rows) {
  const result = { transactions: [], skippedRows: 0, counts: { fees: 0 } };
  let header = [];

  for (const row of rows) {
    const kind = String(row[1] || "").trim();
    if (kind === "Header") {
      header = row.slice(2).map(normalizeHeader);
      continue;
    }

    if (kind !== "Data") continue;
    const lead = String(row[2] || "").trim();
    if (lead === "Total" || lead.startsWith("Total")) continue;

    const record = buildRecord(header, row.slice(2));
    const date = normalizeDate(record["date/time"]);
    const amountRaw = sanitizeSignedNumber(record.amount);
    const ticker = String(record.symbol || "").trim().toUpperCase();
    const currency = String(record.currency || "USD").trim().toUpperCase();
    const description = String(record.description || "Imported from IBKR Transaction Fees").trim();

    if (!date || !amountRaw) {
      result.skippedRows += 1;
      continue;
    }

    result.transactions.push(
      normalizeTransaction({
        id: buildImportId(date, "FEE", ticker, 0, 0, Math.abs(amountRaw), description),
        date,
        type: "FEE",
        ticker,
        quantity: 0,
        price: 0,
        fxRate: 1,
        currency,
        amount: Math.abs(amountRaw),
        cashImpact: amountRaw,
        notes: description,
        sourceSection: "Transaction Fees",
      })
    );
    result.counts.fees += 1;
  }

  return result;
}

function parseIbkrWithholdingTaxSection(rows) {
  const result = { transactions: [], skippedRows: 0, counts: { tax: 0 } };
  let header = [];

  for (const row of rows) {
    const kind = String(row[1] || "").trim();
    if (kind === "Header") {
      header = row.slice(2).map(normalizeHeader);
      continue;
    }

    if (kind !== "Data") continue;
    const lead = String(row[2] || "").trim();
    if (lead === "Total" || lead.startsWith("Total")) continue;

    const record = buildRecord(header, row.slice(2));
    const date = normalizeDate(record.date);
    const amountRaw = sanitizeSignedNumber(record.amount);
    const description = String(record.description || "Imported from IBKR Withholding Tax").trim();
    const ticker = extractTickerFromDescription(description);
    const currency = String(record.currency || "USD").trim().toUpperCase();

    if (!date || !amountRaw) {
      result.skippedRows += 1;
      continue;
    }

    result.transactions.push(
      normalizeTransaction({
        id: buildImportId(date, "TAX", ticker, 0, 0, Math.abs(amountRaw), description),
        date,
        type: "TAX",
        ticker,
        quantity: 0,
        price: 0,
        fxRate: 1,
        currency,
        amount: Math.abs(amountRaw),
        cashImpact: amountRaw,
        notes: description,
        sourceSection: "Withholding Tax",
      })
    );
    result.counts.tax += 1;
  }

  return result;
}

function buildRecord(header, values) {
  const record = {};
  header.forEach((key, index) => {
    if (key) record[key] = values[index];
  });
  return record;
}

function extractTickerFromDescription(description) {
  const match = String(description || "").trim().match(/^([A-Z0-9.\- ]+?)\s*\(/);
  return match ? match[1].trim().toUpperCase() : "";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((currentRow) => currentRow.some((value) => String(value || "").trim() !== ""));
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  const directIso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (directIso) {
    return `${directIso[1]}-${directIso[2]}-${directIso[3]}`;
  }

  const slashUs = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashUs) {
    return `${slashUs[3]}-${slashUs[1].padStart(2, "0")}-${slashUs[2].padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

function extractStatementPeriodEndDate(periodLabel) {
  const text = String(periodLabel || "").trim();
  if (!text) return "";

  const parts = text.split(" - ");
  if (parts.length !== 2) return "";
  return normalizeDate(parts[1]);
}

function buildImportId(date, type, ticker, quantity, price, amount, notes) {
  return ["import", date, type, ticker || "-", quantity || 0, price || 0, amount || 0, notes || ""].join("|");
}

function setImportStatus(message, tone, details = [], meta = "") {
  if (!elements.importStatus) {
    console.warn(`Import status: ${message}`);
    return;
  }

  if (elements.importStatusSummary) {
    elements.importStatusSummary.textContent = message;
  } else {
    elements.importStatus.textContent = message;
  }

  if (elements.importStatusMeta) {
    elements.importStatusMeta.textContent = meta;
    elements.importStatusMeta.classList.toggle("is-hidden", !meta);
  }

  if (elements.importStatusDetails && elements.importStatusDetailsBody) {
    const hasDetails = Array.isArray(details) && details.length > 0;
    elements.importStatusDetails.open = false;
    elements.importStatusDetails.classList.toggle("is-hidden", !hasDetails);
    elements.importStatusDetailsBody.innerHTML = hasDetails
      ? details.map((detail) => `<div>${escapeHtml(detail)}</div>`).join("")
      : "";
  }

  const toneMap = {
    success: "#3dd68c",
    warning: "#ffcc66",
    error: "#ff6b7a",
    neutral: "var(--border)",
  };
  elements.importStatus.style.borderColor = toneMap[tone] || "var(--border)";
}

function setElementText(element, text) {
  if (!element) return;
  element.textContent = text;
}

function setElementClassName(element, className) {
  if (!element) return;
  element.className = className;
}

function toggleClass(element, className, force) {
  if (!element) return;
  element.classList.toggle(className, force);
}

function sanitizeNumber(value) {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .replace(/\$/g, "")
    .trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? roundNumber(parsed) : 0;
}

function sanitizeSignedNumber(value) {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .replace(/\$/g, "")
    .replace(/\(/g, "-")
    .replace(/\)/g, "")
    .trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? roundNumber(parsed) : 0;
}

function roundNumber(value) {
  return Number(Number(value || 0).toFixed(4));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatCurrencyWithCode(value, currencyCode = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${Number(value || 0).toFixed(2)} ${currencyCode || "USD"}`;
  }
}

function formatSignedCurrency(value) {
  const numeric = Number(value || 0);
  const formatted = formatCurrency(Math.abs(numeric));
  if (numeric > 0) return `+${formatted}`;
  if (numeric < 0) return `-${formatted}`;
  return formatted;
}

function formatSignedCurrencyWithCode(value, currencyCode = "USD") {
  const numeric = Number(value || 0);
  const formatted = formatCurrencyWithCode(Math.abs(numeric), currencyCode);
  if (numeric > 0) return `+${formatted}`;
  if (numeric < 0) return `-${formatted}`;
  return formatted;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function formatNullablePercent(value) {
  return value === null || value === undefined ? "Insufficient Data" : formatPercent(value * 100);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(String(value));
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(value) {
  if (!value) return "just now";
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "just now";
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function getDisplayTicker(ticker) {
  return ticker === "CASH" ? "Cash Balance" : ticker;
}

function getValueClass(value) {
  if (value > 0) return "value-positive";
  if (value < 0) return "value-negative";
  return "";
}

function buildEmptyRow(message, colspan) {
  return `<tr><td colspan="${colspan}"><div class="empty-state">${escapeHtml(message)}</div></td></tr>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
