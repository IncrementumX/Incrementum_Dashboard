export function createLocalStateRepository() {
  return {
    async loadAppState(storageKey) {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    },
    async saveAppState(storageKey, state) {
      localStorage.setItem(storageKey, JSON.stringify(state));
    },
    async removeAppState(storageKey) {
      localStorage.removeItem(storageKey);
    },
    async loadUiState(key) {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    },
    async saveUiState(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
  };
}
