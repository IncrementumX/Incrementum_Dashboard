const STORAGE_KEY = "incrementum-dashboard-state-v5";
const ACTIVE_TAB_KEY = "incrementum-dashboard-active-tab";
const LEGACY_STORAGE_KEYS = ["incrementum-dashboard-state-v3", "incrementum-dashboard-state-v2", "incrementum-dashboard-state-v1"];

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

const defaultState = {
  manual: {
    prices: {},
    transactions: [],
  },
  importedSnapshots: [],
  activeSnapshotId: null,
};

let state = loadState();

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
  holdingsBody: document.getElementById("holdings-body"),
  topPositionsBody: document.getElementById("top-positions-body"),
  allocationList: document.getElementById("allocation-list"),
  headerPositions: document.getElementById("header-positions"),
  headerNetInvested: document.getElementById("header-net-invested"),
  headerPortfolioValue: document.getElementById("header-portfolio-value"),
  summaryPortfolioValue: document.getElementById("summary-portfolio-value"),
  summaryCash: document.getElementById("summary-cash"),
  summaryNetInvested: document.getElementById("summary-net-invested"),
  summaryNetInvestedCard: document.getElementById("summary-net-invested-card"),
  summaryDeployedCapital: document.getElementById("summary-deployed-capital"),
  summaryDeployedCapitalCard: document.getElementById("summary-deployed-capital-card"),
  summaryUnrealizedPnl: document.getElementById("summary-unrealized-pnl"),
  summaryUnrealizedReturn: document.getElementById("summary-unrealized-return"),
  summaryPositionCount: document.getElementById("summary-position-count"),
  summaryTotalDeposits: document.getElementById("summary-total-deposits"),
  summaryTotalWithdrawals: document.getElementById("summary-total-withdrawals"),
  returnsNetInvested: document.getElementById("returns-net-invested"),
  returnsPortfolioValue: document.getElementById("returns-portfolio-value"),
  returnsRealizedPnl: document.getElementById("returns-realized-pnl"),
  returnsUnrealizedPnl: document.getElementById("returns-unrealized-pnl"),
  returnsTotalPnl: document.getElementById("returns-total-pnl"),
  returnsMtmPnl: document.getElementById("returns-mtm-pnl"),
  returnsIrr: document.getElementById("returns-irr"),
  returnsTwr: document.getElementById("returns-twr"),
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
renderFilterOptions();
renderApp();

function loadState() {
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
      const migrated = migrateLegacyState(parsed);
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
    const activeSnapshotId = importedSnapshots.some((snapshot) => snapshot.id === rawState?.activeSnapshotId) ? rawState.activeSnapshotId : null;

    return {
      manual: {
        prices: stripLegacySeedPrices(manualPrices, manualTransactions),
        transactions: stripLegacySeedTransactions(manualTransactions),
      },
      importedSnapshots,
      activeSnapshotId: activeSnapshotId || importedSnapshots[0]?.id || null,
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
    };
  }

  return {
    manual: {
      prices: cleanedPrices,
      transactions: cleanedTransactions,
    },
    importedSnapshots: [],
    activeSnapshotId: null,
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
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

  elements.holdingsBody.addEventListener("change", (event) => {
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
      }
      saveState();
      renderApp();
    });
  }

  if (elements.useManualModeButton) {
    elements.useManualModeButton.addEventListener("click", () => {
      state.activeSnapshotId = null;
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
        setImportStatus(result.message, "warning");
        return;
      }

      const importedSnapshot = createImportedSnapshot({
        fileName: file.name,
        transactions: [...result.transactions].sort((left, right) => left.date.localeCompare(right.date)),
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
          `Rows skipped: ${result.skippedRows}`,
        ]
      );
    } catch (error) {
      setImportStatus(`The file could not be imported. ${error instanceof Error ? error.message : "Unknown parsing error."}`, "error");
    }
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

function renderFilterOptions() {
  elements.filterType.innerHTML = ['<option value="">All types</option>']
    .concat(ALL_TRANSACTION_TYPES.map((type) => `<option value="${type}">${type}</option>`))
    .join("");
}

function renderApp() {
  const context = getCurrentContext();
  const analytics = calculatePortfolioAnalytics(context.transactions, context.prices, context.statement);
  const summary = calculateSummary(context.transactions, analytics, context.statement);
  const filteredTransactions = filterTransactions(context.transactions);

  renderTransactions(filteredTransactions, context.mode);
  renderHoldings(analytics.holdings);
  renderDashboard(analytics.positionsForAllocation, summary);
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

function renderHoldings(holdings) {
  if (!holdings.length) {
    elements.holdingsBody.innerHTML = buildEmptyRow("Your portfolio is empty. Import IBKR data or add transactions manually.", 7);
    return;
  }

  elements.holdingsBody.innerHTML = holdings
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
          <td class="ticker-cell">${escapeHtml(getDisplayTicker(holding.ticker))}</td>
          <td>${holding.ticker === "CASH" ? "-" : formatNumber(holding.shares)}</td>
          <td>${formatCurrency(holding.averageCost)}</td>
          <td>${priceCell}</td>
          <td>${formatCurrency(holding.marketValue)}</td>
          <td>${formatPercent(holding.portfolioWeight)}</td>
          <td>${formatPercent(holding.costWeight)}</td>
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
      : "Manual mode is active. Dashboard, Holdings, and Summary Returns are using the live manual ledger.";
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
        <tr>
          <td>
            <div>${escapeHtml(snapshot.fileName)}</div>
            <div class="table-badges">${badges.join("")}</div>
          </td>
          <td>${escapeHtml(snapshot.statementPeriodEndDate || "-")}</td>
          <td>${formatDateTime(snapshot.importedAt)}</td>
          <td>${formatCurrency(snapshot.summary.portfolioValue)}</td>
          <td>${formatCurrency(snapshot.summary.cash)}</td>
          <td>${formatCurrency(snapshot.summary.netInvestedCapital)}</td>
          <td>
            <div class="table-actions">
              <button class="button ${snapshot.id === state.activeSnapshotId ? "button--secondary" : "button--primary"} button--small" data-activate-snapshot-id="${snapshot.id}" type="button">
                ${snapshot.id === state.activeSnapshotId ? "Active" : "Activate"}
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
  setElementText(elements.headerNetInvested, formatCurrency(summary.netInvestedCapital));
  setElementText(elements.headerPortfolioValue, formatCurrency(summary.portfolioValue));
  setElementText(elements.summaryPortfolioValue, formatCurrency(summary.portfolioValue));
  setElementText(elements.summaryCash, formatCurrency(summary.cash));
  setElementText(elements.summaryNetInvested, formatCurrency(summary.netInvestedCapital));
  setElementText(elements.summaryNetInvestedCard, formatCurrency(summary.netInvestedCapital));
  setElementText(elements.summaryDeployedCapital, formatCurrency(summary.deployedCapital));
  setElementText(elements.summaryDeployedCapitalCard, formatCurrency(summary.deployedCapital));
  setElementText(elements.summaryTotalDeposits, formatCurrency(summary.totalDeposits));
  setElementText(elements.summaryTotalWithdrawals, formatCurrency(summary.totalWithdrawals));
  setElementText(elements.summaryUnrealizedPnl, formatCurrency(summary.unrealizedPnL));
  setElementClassName(elements.summaryUnrealizedPnl, `panel-value ${getValueClass(summary.unrealizedPnL)}`.trim());
  setElementText(elements.summaryUnrealizedReturn, formatPercent(summary.unrealizedReturnPct));
  setElementClassName(elements.summaryUnrealizedReturn, `panel-value ${getValueClass(summary.unrealizedReturnPct)}`.trim());
  setElementText(elements.summaryPositionCount, String(summary.positionCount));

  if (!positionsForAllocation.length) {
    elements.allocationList.innerHTML = `<div class="empty-state">Allocation will appear once you add transactions or import your IBKR statement.</div>`;
    elements.topPositionsBody.innerHTML = buildEmptyRow("Top positions will appear here.", 5);
    return;
  }

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

  elements.topPositionsBody.innerHTML = positionsForAllocation
    .slice(0, 5)
    .map((position) => `
      <tr>
        <td class="ticker-cell">
          <div class="top-position-ticker">
            <strong>${escapeHtml(getDisplayTicker(position.ticker))}</strong>
            <span class="top-position-meta">${position.ticker === "CASH" ? "Cash holding" : `${formatNumber(position.shares)} share(s)`}</span>
          </div>
        </td>
        <td class="numeric-cell">${position.ticker === "CASH" ? "-" : formatNumber(position.shares)}</td>
        <td class="numeric-cell">${formatCurrency(position.marketValue)}</td>
        <td class="numeric-cell">${formatPercent(position.portfolioWeight)}</td>
        <td class="numeric-cell ${getValueClass(position.unrealizedPnL)}">${formatCurrency(position.unrealizedPnL)}</td>
      </tr>
    `)
    .join("");
}

function renderSummaryReturns(summary, assetPerformance) {
  elements.returnsNetInvested.textContent = formatCurrency(summary.netInvestedCapital);
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

  if (elements.reconciliationStatus) {
    if (!summary.reconciliationRows.length) {
      elements.reconciliationStatus.textContent = "No reconciliation data available.";
    } else {
      const mismatchCount = summary.reconciliationRows.filter((row) => Math.abs(row.difference) >= 0.01).length;
      elements.reconciliationStatus.textContent =
        mismatchCount === 0 ? "Reconciled with IBKR." : `${mismatchCount} mismatch detected.`;
    }
  }

  if (elements.reconciliationDetails) {
    elements.reconciliationDetails.classList.toggle("is-hidden", !summary.reconciliationRows.length);
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

function calculateSummary(transactions, analytics, statement) {
  const totalDeposits = transactions.filter((transaction) => transaction.type === "DEPOSIT").reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalWithdrawals = transactions.filter((transaction) => transaction.type === "WITHDRAWAL").reduce((sum, transaction) => sum + transaction.amount, 0);
  const netInvestedCapital = statement?.changeInNav?.depositsWithdrawals ?? totalDeposits - totalWithdrawals;
  const realizedPnL = statement?.performanceTotals?.realizedPnL ?? analytics.tradeRealizedPnL;
  const unrealizedPnL = statement?.performanceTotals?.unrealizedPnL ?? analytics.openHoldings.reduce((sum, holding) => sum + holding.unrealizedPnL, 0);
  const totalPnL = statement?.performanceTotals?.totalPnL ?? realizedPnL + unrealizedPnL + analytics.otherReturnPnL;
  const irrValue = calculatePortfolioXirr(
    transactions,
    analytics.portfolioValue,
    statement?.statementInfo?.endDate || new Date().toISOString().slice(0, 10)
  );
  const reconciliationRows = statement
    ? [
        buildReconciliationRow("Net Invested Capital", netInvestedCapital, statement.changeInNav?.depositsWithdrawals ?? netInvestedCapital),
        buildReconciliationRow("Cash", analytics.cash, statement.netAssetValue?.cash ?? analytics.cash),
        buildReconciliationRow("Portfolio Value", analytics.portfolioValue, statement.changeInNav?.endingValue ?? analytics.portfolioValue),
        buildReconciliationRow("Realized P&L", realizedPnL, statement.performanceTotals?.realizedPnL ?? realizedPnL),
        buildReconciliationRow("Unrealized P&L", unrealizedPnL, statement.performanceTotals?.unrealizedPnL ?? unrealizedPnL),
        buildReconciliationRow("Total P&L", totalPnL, statement.performanceTotals?.totalPnL ?? totalPnL),
      ]
    : [];

  return {
    totalDeposits: roundNumber(totalDeposits),
    totalWithdrawals: roundNumber(totalWithdrawals),
    netInvestedCapital: roundNumber(netInvestedCapital),
    portfolioValue: analytics.portfolioValue,
    cash: analytics.cash,
    deployedCapital: analytics.deployedCapital,
    realizedPnL: roundNumber(realizedPnL),
    unrealizedPnL: roundNumber(unrealizedPnL),
    totalPnL: roundNumber(totalPnL),
    markToMarketPnL: roundNumber(statement?.changeInNav?.markToMarket ?? totalPnL),
    unrealizedReturnPct: analytics.deployedCapital > 0 ? roundNumber((unrealizedPnL / analytics.deployedCapital) * 100) : 0,
    positionCount: analytics.positionsForAllocation.filter((position) => position.ticker !== "CASH").length + (Math.abs(analytics.cash) > 0.0000001 ? 1 : 0),
    irrLabel: irrValue === null ? "Insufficient Data" : formatPercent(irrValue * 100),
    twrLabel:
      statement?.netAssetValue?.timeWeightedReturn !== undefined && statement?.netAssetValue?.timeWeightedReturn !== null
        ? formatPercent(statement.netAssetValue.timeWeightedReturn)
        : "Pending",
    irrValue,
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

function setImportStatus(message, tone, details = []) {
  if (!elements.importStatus) {
    console.warn(`Import status: ${message}`);
    return;
  }

  if (elements.importStatusSummary) {
    elements.importStatusSummary.textContent = message;
  } else {
    elements.importStatus.textContent = message;
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

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
