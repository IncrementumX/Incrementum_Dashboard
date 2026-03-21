export function createShareLinkService({ config, location, apiClient, uiContextService }) {
  let routeContext = {
    shareToken: null,
    snapshotId: null,
    tab: null,
    benchmark: null,
  };

  return {
    async initialize() {
      const params = new URLSearchParams(location.search);
      routeContext = {
        shareToken: params.get("share"),
        snapshotId: params.get("snapshot"),
        tab: params.get("tab"),
        benchmark: params.get("benchmark"),
      };

      if (routeContext.tab) {
        await uiContextService.set("activeTab", routeContext.tab);
      }
      if (routeContext.benchmark) {
        await uiContextService.set("selectedBenchmark", routeContext.benchmark);
      }
    },
    getRouteContext() {
      return { ...routeContext };
    },
    buildContextLink({ snapshotId, tab, benchmark }) {
      const url = new URL(location.href);
      if (snapshotId) url.searchParams.set("snapshot", snapshotId);
      if (tab) url.searchParams.set("tab", tab);
      if (benchmark) url.searchParams.set("benchmark", benchmark);
      return url.toString();
    },
    async createReadOnlyShare(payload) {
      if (!apiClient.isConfigured()) {
        return {
          mode: "local-placeholder",
          url: this.buildContextLink(payload),
        };
      }

      return apiClient.request("/share-links", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  };
}
