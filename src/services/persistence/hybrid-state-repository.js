import { createLocalStateRepository } from "./local-state-repository.js";
import { createSupabaseStateRepository } from "./supabase-state-repository.js";

export function createHybridStateRepository({ supabase }) {
  const localRepository = createLocalStateRepository();
  const remoteRepository = createSupabaseStateRepository({ supabase });
  const status = {
    mode: remoteRepository.isConfigured() ? "supabase" : "local",
    connectionLabel: remoteRepository.isConfigured() ? "Connected to Supabase" : "Using local fallback",
    portfolioId: null,
    lastLoadSource: "local",
    lastSaveSource: "local",
    lastLoadAt: null,
    lastSavedAt: null,
    lastError: null,
  };

  return {
    async loadAppState(storageKey) {
      if (remoteRepository.isConfigured()) {
        try {
          const remoteState = await remoteRepository.loadAppState(storageKey);
          if (remoteState) {
            await localRepository.saveAppState(storageKey, remoteState);
            status.portfolioId = remoteRepository.getStatus?.()?.portfolioId || status.portfolioId;
            status.lastLoadSource = "supabase";
            status.lastLoadAt = new Date().toISOString();
            status.connectionLabel = "Connected to Supabase";
            status.lastError = null;
            return remoteState;
          }
        } catch (error) {
          status.connectionLabel = "Using local fallback";
          status.lastError = error instanceof Error ? error.message : "Remote load failed";
          console.warn("Falling back to local app state", error);
        }
      }
      status.lastLoadSource = "local";
      status.lastLoadAt = new Date().toISOString();
      return localRepository.loadAppState(storageKey);
    },
    async saveAppState(storageKey, state) {
      await localRepository.saveAppState(storageKey, state);
       status.lastSaveSource = "local";
      if (remoteRepository.isConfigured()) {
        try {
          await remoteRepository.saveAppState(storageKey, state);
          status.portfolioId = remoteRepository.getStatus?.()?.portfolioId || status.portfolioId;
          status.lastSaveSource = "supabase";
          status.lastSavedAt = new Date().toISOString();
          status.connectionLabel = "Connected to Supabase";
          status.lastError = null;
        } catch (error) {
          status.connectionLabel = "Using local fallback";
          status.lastError = error instanceof Error ? error.message : "Remote save failed";
          console.warn("Remote app state save failed", error);
        }
      }
    },
    async removeAppState(storageKey) {
      return localRepository.removeAppState(storageKey);
    },
    async loadUiState(key) {
      if (remoteRepository.isConfigured()) {
        try {
          const remoteUiState = await remoteRepository.loadUiState(key);
          if (remoteUiState) {
            await localRepository.saveUiState(key, remoteUiState);
            status.portfolioId = remoteRepository.getStatus?.()?.portfolioId || status.portfolioId;
            status.lastLoadSource = "supabase";
            status.lastLoadAt = new Date().toISOString();
            status.connectionLabel = "Connected to Supabase";
            status.lastError = null;
            return remoteUiState;
          }
        } catch (error) {
          status.connectionLabel = "Using local fallback";
          status.lastError = error instanceof Error ? error.message : "Remote UI load failed";
          console.warn("Falling back to local UI state", error);
        }
      }
      status.lastLoadSource = "local";
      status.lastLoadAt = new Date().toISOString();
      return localRepository.loadUiState(key);
    },
    async saveUiState(key, value) {
      await localRepository.saveUiState(key, value);
      if (remoteRepository.isConfigured()) {
        try {
          await remoteRepository.saveUiState(key, value);
          status.lastSavedAt = new Date().toISOString();
          status.connectionLabel = "Connected to Supabase";
          status.lastError = null;
        } catch (error) {
          status.connectionLabel = "Using local fallback";
          status.lastError = error instanceof Error ? error.message : "Remote UI save failed";
          console.warn("Remote UI state save failed", error);
        }
      }
    },
    getStatus() {
      return { ...status };
    },
  };
}
