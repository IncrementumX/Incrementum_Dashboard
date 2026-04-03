export function createMarketDataGateway({ config, apiClient }) {
  // Only use the backend if a dedicated market-data base URL is configured.
  // Edge Functions base URL is for other services (state, share-links) — not market data.
  const marketDataEnabled = Boolean(config?.backend?.baseUrl);

  const localFallback = (symbols, extra = {}) => ({
    source: "local-placeholder",
    freshness: "unknown",
    prices: {},
    missing: symbols,
    ...extra,
  });

  return {
    async getLatestPrices(symbols = []) {
      if (!marketDataEnabled) return localFallback(symbols);
      try {
        return await apiClient.request("/market-data/latest", {
          method: "POST",
          body: JSON.stringify({
            symbols,
            primaryProvider: config.marketData.primaryProvider,
            fallbackProvider: config.marketData.fallbackProvider,
          }),
        });
      } catch {
        return localFallback(symbols);
      }
    },
    async getHistoricalPrices(symbols = [], startDate, endDate) {
      if (!marketDataEnabled) return localFallback(symbols, { startDate, endDate });
      try {
        return await apiClient.request("/market-data/historical", {
          method: "POST",
          body: JSON.stringify({
            symbols,
            startDate,
            endDate,
            primaryProvider: config.marketData.primaryProvider,
            fallbackProvider: config.marketData.fallbackProvider,
          }),
        });
      } catch {
        return localFallback(symbols, { startDate, endDate });
      }
    },
  };
}
