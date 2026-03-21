const UI_CONTEXT_KEY = "incrementum-dashboard-ui-context";

export function createUiContextService({ stateRepository, location }) {
  let context = {
    activeTab: "dashboard-tab",
    selectedBenchmark: "SPX",
    selectedTimeRange: "ITD",
    selectedCurrency: "USD",
    activePortfolioId: null,
    activeSnapshotId: null,
  };

  return {
    async initialize() {
      const saved = await stateRepository.loadUiState(UI_CONTEXT_KEY);
      if (saved && typeof saved === "object") {
        context = { ...context, ...saved };
      }

      const params = new URLSearchParams(location.search);
      const tab = params.get("tab");
      const snapshot = params.get("snapshot");
      const benchmark = params.get("benchmark");
      if (tab) context.activeTab = tab;
      if (snapshot) context.activeSnapshotId = snapshot;
      if (benchmark) context.selectedBenchmark = benchmark;
    },
    getAll() {
      return { ...context };
    },
    get(key) {
      return context[key];
    },
    async set(key, value) {
      context[key] = value;
      await stateRepository.saveUiState(UI_CONTEXT_KEY, context);
    },
    async merge(nextContext) {
      context = { ...context, ...nextContext };
      await stateRepository.saveUiState(UI_CONTEXT_KEY, context);
    },
  };
}
