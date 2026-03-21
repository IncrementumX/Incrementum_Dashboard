export function createBackendStateRepository({ apiClient }) {
  return {
    isConfigured() {
      return apiClient.isConfigured();
    },
    async loadAppState() {
      return apiClient.request("/state/latest", { method: "GET" });
    },
    async saveAppState(_storageKey, state) {
      return apiClient.request("/state/latest", {
        method: "PUT",
        body: JSON.stringify(state),
      });
    },
    async loadUiState() {
      return apiClient.request("/ui-context/latest", { method: "GET" });
    },
    async saveUiState(_key, value) {
      return apiClient.request("/ui-context/latest", {
        method: "PUT",
        body: JSON.stringify(value),
      });
    },
  };
}
