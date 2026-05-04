#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const PORTFOLIO_ID = "8405528d-d6ef-4bbd-b018-6ebd44a3cbfb";
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_ENV_PATH = path.join(ROOT_DIR, "src", "config", "public-env.js");
const STATE_PATH = path.join(ROOT_DIR, "IncrementumOS", "agents_context", "state.md");

const TRANSACTION_COLUMNS = [
  "id",
  "portfolio_id",
  "import_run_id",
  "trade_date",
  "type",
  "ticker",
  "asset_class",
  "quantity",
  "price",
  "fx_rate",
  "currency",
  "amount",
  "cash_impact",
  "notes",
  "source_section",
  "created_at",
].join(", ");

const SNAPSHOT_COLUMNS = [
  "id",
  "portfolio_id",
  "import_run_id",
  "statement_end_date",
  "summary",
  "statement_payload",
  "created_at",
].join(", ");

const DERIVED_NAV_COLUMNS = [
  "portfolio_id",
  "nav_date",
  "portfolio_value",
  "cash_value",
  "invested_value",
  "net_contributions",
  "total_pnl",
  "methodology_version",
  "confidence",
  "derived_at",
].join(", ");

const PRICE_COLUMNS = [
  "symbol",
  "price_date",
  "currency",
  "close_price",
  "source",
  "quality",
  "fetched_at",
].join(", ");

const TRADE_TYPES = new Set(["BUY", "SELL"]);

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});

async function main() {
  const env = await readPublicEnv();
  const { createClient } = await loadSupabaseJs();
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { transactions, snapshots, latestNav } = await fetchPortfolioData(supabase);
  const latestSnapshot = pickLatestSnapshot(snapshots);
  const statement = normalizeStatement(latestSnapshot?.statement_payload?.statement);
  const summary = objectOrEmpty(latestSnapshot?.summary);
  const prices = normalizePrices(latestSnapshot?.statement_payload?.prices);
  const normalizedTransactions = transactions.map(normalizeTransactionRow).filter(Boolean);

  const ledgerPositions = buildLedgerPositions(normalizedTransactions, prices);
  const supplementalPrices = await fetchLatestPrices(supabase, ledgerPositions.map((position) => position.ticker));
  const analytics = buildPortfolioState({
    transactions: normalizedTransactions,
    statement,
    summary,
    prices: { ...prices, ...supplementalPrices },
    latestNav,
  });

  const markdown = renderStateMarkdown(analytics);
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, markdown, "utf8");

  console.log("state.md atualizado em", new Date().toISOString());
}

async function readPublicEnv() {
  const source = await fs.readFile(PUBLIC_ENV_PATH, "utf8");
  const SUPABASE_URL = readEnvValue(source, "SUPABASE_URL");
  const SUPABASE_ANON_KEY = readEnvValue(source, "SUPABASE_ANON_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(`Missing SUPABASE_URL or SUPABASE_ANON_KEY in ${path.relative(ROOT_DIR, PUBLIC_ENV_PATH)}.`);
  }

  return { SUPABASE_URL, SUPABASE_ANON_KEY };
}

function readEnvValue(source, key) {
  const match = source.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
  return match?.[1] || "";
}

async function loadSupabaseJs() {
  try {
    return await import("@supabase/supabase-js");
  } catch (error) {
    const packagePath = path.join(ROOT_DIR, "package.json");
    const hasPackageJson = await fileExists(packagePath);
    const packageNote = hasPackageJson
      ? "Verify @supabase/supabase-js is listed in package.json and installed."
      : "No repo-level package.json was found, so this script cannot verify or install the dependency without touching extra files.";
    throw new Error(`Unable to load @supabase/supabase-js. ${packageNote}`);
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function fetchPortfolioData(supabase) {
  const [transactionsResult, snapshotsResult, latestNavResult] = await Promise.all([
    supabase
      .from("transactions")
      .select(TRANSACTION_COLUMNS)
      .eq("portfolio_id", PORTFOLIO_ID)
      .order("trade_date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("snapshots")
      .select(SNAPSHOT_COLUMNS)
      .eq("portfolio_id", PORTFOLIO_ID)
      .order("created_at", { ascending: false }),
    supabase
      .from("derived_daily_nav")
      .select(DERIVED_NAV_COLUMNS)
      .eq("portfolio_id", PORTFOLIO_ID)
      .order("nav_date", { ascending: false })
      .limit(1),
  ]);

  assertSupabaseOk(transactionsResult, "transactions");
  assertSupabaseOk(snapshotsResult, "snapshots");
  assertSupabaseOk(latestNavResult, "derived_daily_nav");

  return {
    transactions: transactionsResult.data || [],
    snapshots: snapshotsResult.data || [],
    latestNav: latestNavResult.data?.[0] || null,
  };
}

async function fetchLatestPrices(supabase, tickers) {
  const uniqueTickers = [...new Set(tickers.filter(Boolean))];
  if (!uniqueTickers.length) return {};

  const result = await supabase
    .from("price_cache")
    .select(PRICE_COLUMNS)
    .in("symbol", uniqueTickers)
    .order("price_date", { ascending: false });

  assertSupabaseOk(result, "price_cache");

  const prices = {};
  for (const row of result.data || []) {
    const ticker = String(row.symbol || "").trim().toUpperCase();
    if (!ticker || prices[ticker]) continue;
    prices[ticker] = {
      price: toNumber(row.close_price),
      currency: String(row.currency || "USD").trim().toUpperCase(),
      date: row.price_date || "",
      source: row.source || "price_cache",
    };
  }
  return prices;
}

function assertSupabaseOk(result, tableName) {
  if (result.error) {
    throw new Error(`Supabase query failed for ${tableName}: ${result.error.message}`);
  }
}

function pickLatestSnapshot(snapshots) {
  return [...(snapshots || [])].sort((left, right) => {
    const rightDate = getSnapshotSortDate(right);
    const leftDate = getSnapshotSortDate(left);
    return rightDate.localeCompare(leftDate);
  })[0] || null;
}

function getSnapshotSortDate(snapshot) {
  return (
    snapshot?.statement_end_date ||
    snapshot?.statement_payload?.statement?.statementInfo?.endDate ||
    snapshot?.created_at ||
    ""
  );
}

function normalizeStatement(statement) {
  if (!statement || typeof statement !== "object") return {};
  return {
    statementInfo: objectOrEmpty(statement.statementInfo),
    openPositions: Array.isArray(statement.openPositions) ? statement.openPositions : [],
    openPositionsTotals: objectOrEmpty(statement.openPositionsTotals),
    netAssetValue: objectOrEmpty(statement.netAssetValue),
    changeInNav: objectOrEmpty(statement.changeInNav),
    performanceTotals: objectOrEmpty(statement.performanceTotals),
    performanceByAsset: Array.isArray(statement.performanceByAsset) ? statement.performanceByAsset : [],
  };
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizePrices(prices) {
  if (!prices || typeof prices !== "object") return {};

  return Object.fromEntries(
    Object.entries(prices)
      .map(([ticker, entry]) => [
        String(ticker || "").trim().toUpperCase(),
        {
          price: toNumber(entry?.price),
          currency: String(entry?.currency || "USD").trim().toUpperCase(),
          date: entry?.date || "",
          source: entry?.source || "snapshot",
        },
      ])
      .filter(([ticker, entry]) => ticker && entry.price > 0)
  );
}

function normalizeTransactionRow(row) {
  const type = String(row.type || "").trim().toUpperCase();
  if (!type) return null;

  return {
    id: row.id,
    date: row.trade_date || "",
    type,
    ticker: String(row.ticker || "").trim().toUpperCase(),
    assetClass: row.asset_class || null,
    quantity: toNumber(row.quantity),
    price: toNumber(row.price),
    fxRate: toNumber(row.fx_rate || 1) || 1,
    currency: String(row.currency || "USD").trim().toUpperCase(),
    amount: Math.abs(toNumber(row.amount)),
    cashImpact: toNumber(row.cash_impact),
    notes: row.notes || "",
    sourceSection: row.source_section || "",
  };
}

function buildPortfolioState({ transactions, statement, summary, prices, latestNav }) {
  const ledgerPositions = buildLedgerPositions(transactions, prices);
  const statementPositions = normalizeStatementPositions(statement);
  const openPositions = statementPositions.length ? statementPositions : ledgerPositions;
  const cash = firstFinite(
    statement?.netAssetValue?.cash,
    summary?.cash,
    latestNav?.cash_value,
    calculateCashBalance(transactions)
  );
  const positionMarketValue = openPositions.reduce((sum, position) => sum + position.marketValue, 0);
  const nav = firstFinite(
    statement?.changeInNav?.endingValue,
    statement?.netAssetValue?.endingValue,
    summary?.portfolioValue,
    latestNav?.portfolio_value,
    cash + positionMarketValue
  );
  const realizedPnL = firstFinite(
    statement?.performanceTotals?.realizedPnL,
    statement?.performanceTotals?.realizedPnl,
    summary?.realizedPnL,
    calculateRealizedPnL(transactions)
  );
  const grossLongExposure = openPositions.reduce(
    (sum, position) => (position.marketValue > 0 ? sum + position.marketValue : sum),
    0
  );
  const netExposure = openPositions.reduce((sum, position) => sum + position.marketValue, 0);
  const valuationDate = firstString(
    statement?.statementInfo?.endDate,
    latestNav?.nav_date,
    latestTransactionDate(transactions),
    formatDateOnly(new Date())
  );

  return {
    generatedAt: new Date(),
    valuationDate,
    nav: roundNumber(nav),
    cash: roundNumber(cash),
    grossLongExposure: roundNumber(grossLongExposure),
    netExposure: roundNumber(netExposure),
    realizedPnL: roundNumber(realizedPnL),
    positions: openPositions
      .filter((position) => Math.abs(position.marketValue) > 0.0000001 || Math.abs(position.shares) > 0.0000001)
      .map((position) => ({
        ...position,
        navPct: nav !== 0 ? roundNumber((position.marketValue / nav) * 100) : 0,
      }))
      .sort((left, right) => Math.abs(right.marketValue) - Math.abs(left.marketValue)),
  };
}

function normalizeStatementPositions(statement) {
  const performanceByTicker = new Map(
    (statement?.performanceByAsset || []).map((asset) => [
      String(asset.ticker || "").trim().toUpperCase(),
      asset,
    ])
  );

  return (statement?.openPositions || [])
    .map((position) => {
      const ticker = String(position.ticker || "").trim().toUpperCase();
      if (!ticker) return null;
      const performance = performanceByTicker.get(ticker) || {};
      return {
        ticker,
        assetClass: position.assetClass || "STOCK",
        shares: toNumber(position.shares),
        averageCost: toNumber(position.averageCost),
        currentPrice: toNumber(position.currentPrice),
        totalCostBasis: toNumber(position.totalCostBasis),
        marketValue: toNumber(position.marketValue),
        realizedPnL: toNumber(performance.realizedPnL),
        unrealizedPnL: toNumber(position.unrealizedPnL ?? performance.unrealizedPnL),
      };
    })
    .filter(Boolean);
}

function buildLedgerPositions(transactions, prices) {
  const positions = new Map();
  const sortedTransactions = [...transactions]
    .filter((transaction) => transaction.date)
    .sort((left, right) => left.date.localeCompare(right.date));

  for (const transaction of sortedTransactions) {
    if (!TRADE_TYPES.has(transaction.type) || !transaction.ticker) continue;
    if (!positions.has(transaction.ticker)) {
      positions.set(transaction.ticker, {
        ticker: transaction.ticker,
        assetClass: transaction.assetClass || "STOCK",
        shares: 0,
        totalCostBasis: 0,
      });
    }

    const position = positions.get(transaction.ticker);
    const quantity = Math.abs(transaction.quantity);
    const tradeMagnitude = Math.abs(transaction.cashImpact);

    if (transaction.type === "BUY") {
      if (position.shares < 0) {
        const sharesToCover = Math.min(quantity, Math.abs(position.shares));
        const averageCost = Math.abs(position.totalCostBasis / position.shares);
        position.shares += sharesToCover;
        position.totalCostBasis += averageCost * sharesToCover;
        const leftover = quantity - sharesToCover;
        if (leftover > 0) {
          position.shares += leftover;
          position.totalCostBasis += tradeMagnitude * (leftover / quantity);
        }
      } else {
        position.shares += quantity;
        position.totalCostBasis += tradeMagnitude;
      }
      continue;
    }

    if (position.shares > 0) {
      const sharesToSell = Math.min(quantity, position.shares);
      const averageCost = position.totalCostBasis / position.shares;
      position.shares -= sharesToSell;
      position.totalCostBasis -= averageCost * sharesToSell;
      const leftover = quantity - sharesToSell;
      if (leftover > 0) {
        position.shares -= leftover;
        position.totalCostBasis -= tradeMagnitude * (leftover / quantity);
      }
    } else {
      position.shares -= quantity;
      position.totalCostBasis -= tradeMagnitude;
    }
  }

  return [...positions.values()]
    .filter((position) => Math.abs(position.shares) > 0.0000001)
    .map((position) => {
      const price = prices[position.ticker]?.price || 0;
      const marketValue = position.shares * price;
      const averageCost = Math.abs(position.shares) > 0 ? position.totalCostBasis / position.shares : 0;
      return {
        ...position,
        averageCost: roundNumber(averageCost),
        currentPrice: roundNumber(price),
        totalCostBasis: roundNumber(position.totalCostBasis),
        marketValue: roundNumber(marketValue),
        realizedPnL: 0,
        unrealizedPnL: roundNumber(marketValue - position.totalCostBasis),
      };
    });
}

function calculateCashBalance(transactions) {
  return roundNumber(transactions.reduce((sum, transaction) => sum + transaction.cashImpact, 0));
}

function calculateRealizedPnL(transactions) {
  const positions = new Map();
  let realizedPnL = 0;

  for (const transaction of [...transactions].sort((left, right) => left.date.localeCompare(right.date))) {
    if (!TRADE_TYPES.has(transaction.type) || !transaction.ticker) continue;
    if (!positions.has(transaction.ticker)) {
      positions.set(transaction.ticker, { shares: 0, totalCostBasis: 0 });
    }

    const position = positions.get(transaction.ticker);
    const quantity = Math.abs(transaction.quantity);
    const tradeMagnitude = Math.abs(transaction.cashImpact);

    if (transaction.type === "BUY") {
      position.shares += quantity;
      position.totalCostBasis += tradeMagnitude;
      continue;
    }

    if (position.shares <= 0) continue;
    const sharesToRemove = Math.min(quantity, position.shares);
    const averageCost = position.totalCostBasis / position.shares;
    const removedCostBasis = averageCost * sharesToRemove;
    realizedPnL += tradeMagnitude - removedCostBasis;
    position.shares -= sharesToRemove;
    position.totalCostBasis -= removedCostBasis;
  }

  return roundNumber(realizedPnL);
}

function latestTransactionDate(transactions) {
  return transactions
    .map((transaction) => transaction.date)
    .filter(Boolean)
    .sort()
    .at(-1) || "";
}

function renderStateMarkdown(state) {
  const generatedDateTime = formatLocalDateTime(state.generatedAt);
  const generatedDate = formatDateOnly(state.generatedAt);
  const cashPct = state.nav !== 0 ? (state.cash / state.nav) * 100 : 0;
  const grossLongPct = state.nav !== 0 ? (state.grossLongExposure / state.nav) * 100 : 0;
  const netPct = state.nav !== 0 ? (state.netExposure / state.nav) * 100 : 0;
  const rows = state.positions.map(renderPositionRow);
  const positionRows = rows.length ? rows.join("\n") : "";

  return [
    "# Portfolio State — IncrementumOS",
    "",
    `> Gerado por \`tools/export-state.js\` em ${generatedDateTime} (local)`,
    "> Fonte canônica: Supabase (Incrementum Dashboard)",
    "",
    "## Última atualização",
    `\`${state.valuationDate || generatedDate}\``,
    "",
    "## NAV e Exposição",
    `- **NAV:** ${formatCurrency(state.nav)}`,
    `- **Caixa:** ${formatCurrency(state.cash)} (${formatPercent(cashPct)} NAV)`,
    `- **Exposição bruta long:** ${formatCurrency(state.grossLongExposure)} (${formatPercent(grossLongPct)} NAV)`,
    `- **Exposição líquida:** ${formatCurrency(state.netExposure)} (${formatPercent(netPct)} NAV)`,
    "",
    "## Posições Abertas",
    "",
    "| Ticker | Direção | Qtd | Custo médio | MV | % NAV | P&L não-realizado |",
    "|--------|---------|-----|-------------|-----|-------|-------------------|",
    positionRows,
    "",
    "## P&L Realizado (período)",
    `- **Total realizado:** ${formatCurrency(state.realizedPnL)}`,
    "",
    "## Notas",
    "- Shorts e puts entram como linhas separadas",
    "- Datas no formato ISO YYYY-MM-DD",
    "",
  ].join("\n");
}

function renderPositionRow(position) {
  return [
    escapeMarkdown(position.ticker),
    getDirection(position),
    formatQuantity(position.shares),
    formatCurrency(position.averageCost),
    formatCurrency(position.marketValue),
    formatPercent(position.navPct),
    formatCurrency(position.unrealizedPnL),
  ].join(" | ").replace(/^/, "| ").replace(/$/, " |");
}

function getDirection(position) {
  return position.shares < 0 || position.marketValue < 0 ? "Short" : "Long";
}

function escapeMarkdown(value) {
  return String(value || "").replace(/\|/g, "\\|");
}

function firstFinite(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundNumber(value) {
  return Number(Number(value || 0).toFixed(4));
}

function formatCurrency(value) {
  return `US$ ${formatNumber(roundNumber(value), 0, 0)}`;
}

function formatQuantity(value) {
  const number = roundNumber(value);
  return formatNumber(number, 0, Math.abs(number) >= 100 ? 0 : 4);
}

function formatPercent(value) {
  return `${formatNumber(roundNumber(value), 1, 1)}%`;
}

function formatNumber(value, minimumFractionDigits, maximumFractionDigits) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value || 0);
}

function formatLocalDateTime(date) {
  return `${formatDateOnly(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatDateOnly(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}
