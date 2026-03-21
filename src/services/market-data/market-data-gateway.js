export function createMarketDataGateway({ config, apiClient }) {
  return {
    async getLatestPrices(symbols = []) {
      if (!apiClient.isConfigured()) {
        return {
          source: "local-placeholder",
          freshness: "unknown",
          prices: {},
          missing: symbols,
        };
      }

      return apiClient.request("/market-data/latest", {
        method: "POST",
        body: JSON.stringify({
          symbols,
          primaryProvider: config.marketData.primaryProvider,
          fallbackProvider: config.marketData.fallbackProvider,
        }),
      });
    },
    async getHistoricalPrices(symbols = [], startDate, endDate) {
      if (!apiClient.isConfigured()) {
        return {
          source: "local-placeholder",
          prices: {},
          missing: symbols,
          startDate,
          endDate,
        };
      }

      return apiClient.request("/market-data/historical", {
        method: "POST",
        body: JSON.stringify({
          symbols,
          startDate,
          endDate,
          primaryProvider: config.marketData.primaryProvider,
          fallbackProvider: config.marketData.fallbackProvider,
        }),
      });
    },
  };
}
