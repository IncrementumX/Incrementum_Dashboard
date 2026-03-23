const STORAGE_KEY = "incrementum-dashboard-state-v6";
const ACTIVE_TAB_KEY = "incrementum-dashboard-active-tab";
const runtime = window.IncrementumRuntime || null;
const stateRepository = runtime?.services?.stateRepository || null;
const uiContextService = runtime?.services?.uiContextService || null;
const shareLinkService = runtime?.services?.shareLinkService || null;
const repositoryStatus = stateRepository?.getStatus?.() || null;
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
};

let state = applyRuntimeContext(loadState());
const syncUiState = {
  status: "idle",
  restored: Boolean(runtime?.preloadedAppState),
  lastSavedAt: stateRepository?.getStatus?.()?.lastSavedAt || null,
  lastValuation: null,
  lastImportReport: null,
  returnTrust: null,
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
};

setupTabs();
setupTransactionForm();
setupImport();
setupFilters();
setupPreferences();
setupExport();
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

      setImportStatus(
        "IBKR statement imported successfully.",
        "success",
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
  const historySeries = buildPortfolioHistorySeries(context);

  renderSyncStatus();
  renderDebugPanel();
  renderTransactions(filteredTransactions, context.mode);
  renderPortfolioPositions(analytics.holdings);
  renderDashboard(analytics.positionsForAllocation, summary, historySeries);
  renderSummaryReturns(summary, analytics.assetPerformance);
  renderStatementHistory();
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

function renderDashboard(positionsForAllocation, summary, historySeries) {
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
  setElementText(elements.summaryIrr, summary.mtdLabel);
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

  renderHistory(historySeries);
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
  elements.returnsIrr.textContent = summary.mtdLabel;
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
  const valuationEngine = runtime?.services?.valuationEngine;
  const valuation = valuationEngine?.compute?.({
    transactions,
    valuationDate: getActiveValuationDate(transactions, statement),
    currentPrices: prices,
    historicalPrices: state.marketData.assetPriceHistory || {},
    priceAnchors: buildSnapshotPriceAnchors(),
  }) || null;
  if (valuation) {
    syncUiState.lastValuation = valuation;
  }

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
      incomeExpensePnL: roundNumber(asset.incomeExpensePnL),
      grossInvested: roundNumber(asset.grossInvested),
      unrealizedPnL: roundNumber(unrealizedPnL),
      totalPnL: roundNumber(totalPnL),
      returnPct: roundNumber(returnPct),
    };
  });

  const statementOpenPositions = Array.isArray(statement?.openPositions) ? statement.openPositions : [];
  const statementPerformance = Array.isArray(statement?.performanceByAsset) ? statement.performanceByAsset : [];
  const statementOpenPositionMap = new Map(statementOpenPositions.map((position) => [position.ticker, position]));
  const statementPerformanceMap = new Map(statementPerformance.map((asset) => [asset.ticker, asset]));
  const valuationPositionMap = new Map((valuation?.positions || []).map((position) => [position.ticker, position]));
  const openHoldingsSource = (valuation?.positions || [])
    .filter((position) => position.shares > 0.0000001)
    .map((position) => {
      const ledgerAsset = ledgerAssetPerformance.find((asset) => asset.ticker === position.ticker);
      const statementPosition = statementOpenPositionMap.get(position.ticker);
      const statementAsset = statementPerformanceMap.get(position.ticker);
      const unrealizedPnL = position.marketValue - position.totalCostBasis;
      const realizedPnL = statementAsset ? statementAsset.realizedPnL : ledgerAsset?.realizedPnL || 0;
      const totalPnL = realizedPnL + unrealizedPnL + (ledgerAsset?.incomeExpensePnL || 0);

      return {
        ticker: position.ticker,
        shares: roundNumber(position.shares),
        averageCost: roundNumber(position.shares > 0 ? position.totalCostBasis / position.shares : 0),
        totalCostBasis: roundNumber(position.totalCostBasis),
        currentPrice: roundNumber(position.price),
        marketValue: roundNumber(position.marketValue),
        realizedPnL: roundNumber(realizedPnL),
        unrealizedPnL: roundNumber(unrealizedPnL),
        totalPnL: roundNumber(statementAsset ? statementAsset.totalPnL : totalPnL),
        returnPct: roundNumber(position.totalCostBasis > 0 ? (unrealizedPnL / position.totalCostBasis) * 100 : 0),
        isStatementPrice: position.priceSource === "snapshot-anchor" || Boolean(statementPosition),
        priceSource: position.priceSource,
      };
    });

  const cash = valuation ? valuation.cashBalance : calculateCashBalance(transactions);
  const stockValue = valuation ? valuation.portfolioMarketValue : openHoldingsSource.reduce((sum, holding) => sum + holding.marketValue, 0);
  const deployedCapital = valuation
    ? roundNumber((valuation.positions || []).reduce((sum, holding) => sum + holding.totalCostBasis, 0))
    : openHoldingsSource.reduce((sum, holding) => sum + holding.totalCostBasis, 0);
  const portfolioValue = valuation ? valuation.nav : roundNumber(stockValue + cash);
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
    ...(valuation?.positions || []).map((position) => position.ticker),
  ]);

  const assetPerformance = [...assetTickers]
    .filter(Boolean)
    .map((ticker) => {
      const ledgerAsset = ledgerAssetPerformance.find((asset) => asset.ticker === ticker);
      const statementAsset = statementPerformanceMap.get(ticker);
      const statementPosition = statementOpenPositionMap.get(ticker);
      const valuationPosition = valuationPositionMap.get(ticker);
      const realizedPnL = statementAsset ? statementAsset.realizedPnL : ledgerAsset?.realizedPnL || 0;
      const unrealizedPnL = statementAsset
        ? statementAsset.unrealizedPnL
        : statementPosition?.unrealizedPnL || (valuationPosition ? valuationPosition.marketValue - valuationPosition.totalCostBasis : ledgerAsset?.unrealizedPnL) || 0;
      const totalPnL = statementAsset ? statementAsset.totalPnL : ledgerAsset?.totalPnL || realizedPnL + unrealizedPnL;
      const marketValue = valuationPosition?.marketValue ?? statementPosition?.marketValue ?? ledgerAsset?.marketValue ?? 0;
      const returnBase = valuationPosition?.totalCostBasis ?? statementPosition?.totalCostBasis ?? ledgerAsset?.totalCostBasis ?? ledgerAsset?.grossInvested ?? 0;

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
    valuation,
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

function buildReturnHistoryFromValuation(valuation) {
  const returnEngine = runtime?.services?.returnEngine;
  const dailySeries = valuation?.dailySeries || [];
  const dailyReturns = returnEngine?.computeFromDailySeries?.(dailySeries)?.dailyReturns || [];
  return dailySeries.map((point, index) => ({
    ...point,
    dailyReturn: dailyReturns[index]?.dailyReturn ?? null,
    cumulativeReturn: dailyReturns[index]?.cumulativeReturn ?? null,
  }));
}

function calculateTrustedReturnWindow(windowId, valuation) {
  const history = buildReturnHistoryFromValuation(valuation);
  if (!history.length) {
    return { value: null, trust: "Unavailable", reason: "No NAV history." };
  }

  const latestPoint = history[history.length - 1];
  const valuationDate = latestPoint.date;
  if (!valuationDate) {
    return { value: null, trust: "Unavailable", reason: "No valuation date." };
  }

  if (windowId === "ITD") {
    const firstPoint = history[0];
    const windowPoints = history.slice(1);
    if (firstPoint.pricingStatus !== "fully-priced") {
      return { value: null, trust: "Unavailable", reason: "Inception NAV is not fully priced." };
    }
    if (windowPoints.some((point) => point.pricingStatus !== "fully-priced" || point.dailyReturn === null)) {
      return { value: null, trust: "Insufficient clean history", reason: "Inception window contains estimated or missing prices." };
    }
    const value = windowPoints.reduce((compound, point) => compound * (1 + point.dailyReturn), 1) - 1;
    return { value: roundNumber(value), trust: "Trusted", reason: "Ledger-derived from fully priced NAV history." };
  }

  const periodStart = windowId === "MTD" ? `${valuationDate.slice(0, 7)}-01` : `${valuationDate.slice(0, 4)}-01-01`;
  const anchorDate = shiftDateIso(periodStart, -1);
  const anchorPoint = [...history].reverse().find((point) => point.date <= anchorDate) || null;
  if (!anchorPoint) {
    return { value: null, trust: "Unavailable", reason: `No completed NAV before ${periodStart}.` };
  }

  const windowPoints = history.filter((point) => point.date > anchorPoint.date);
  if (!windowPoints.length) {
    return { value: null, trust: "Unavailable", reason: "No completed NAV inside the selected window." };
  }

  if (windowPoints.some((point) => point.pricingStatus !== "fully-priced" || point.dailyReturn === null)) {
    return { value: null, trust: "Insufficient clean history", reason: `${windowId} contains estimated or missing price days.` };
  }

  const value = windowPoints.reduce((compound, point) => compound * (1 + point.dailyReturn), 1) - 1;
  return { value: roundNumber(value), trust: "Trusted", reason: "Ledger-derived from fully priced NAV history." };
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
  const mtdWindow = calculateTrustedReturnWindow("MTD", analytics.valuation);
  const ytdWindow = calculateTrustedReturnWindow("YTD", analytics.valuation);
  const itdWindow = calculateTrustedReturnWindow("ITD", analytics.valuation);
  const netContributionReturn = netContributions > 0 ? roundNumber(analytics.portfolioValue / netContributions - 1) : null;
  syncUiState.returnTrust = {
    mtd: mtdWindow.trust,
    ytd: ytdWindow.trust,
    itd: itdWindow.trust,
    mtdReason: mtdWindow.reason,
    ytdReason: ytdWindow.reason,
    itdReason: itdWindow.reason,
  };
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
    irrLabel: "Unavailable",
    twrLabel: "Unavailable",
    mtdLabel: mtdWindow.value === null ? mtdWindow.trust : formatPercent(mtdWindow.value * 100),
    ytdLabel: ytdWindow.value === null ? ytdWindow.trust : formatPercent(ytdWindow.value * 100),
    itdLabel: itdWindow.value === null ? itdWindow.trust : formatPercent(itdWindow.value * 100),
    netContributionReturnLabel: netContributionReturn === null ? "Insufficient Data" : formatPercent(netContributionReturn * 100),
    cashShareLabel:
      analytics.portfolioValue > 0 ? `${formatPercent((analytics.cash / analytics.portfolioValue) * 100)} of portfolio` : "Insufficient Data",
    deployedShareLabel:
      analytics.portfolioValue > 0
        ? `${formatPercent((analytics.deployedCapital / analytics.portfolioValue) * 100)} of portfolio`
        : "Insufficient Data",
    irrValue: null,
    mtdValue: mtdWindow.value,
    ytdValue: ytdWindow.value,
    itdValue: itdWindow.value,
    mtdTrust: mtdWindow.trust,
    ytdTrust: ytdWindow.trust,
    itdTrust: itdWindow.trust,
    mtdReason: mtdWindow.reason,
    ytdReason: ytdWindow.reason,
    itdReason: itdWindow.reason,
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
