import { createBackendApiClient } from "../services/backend/api-client.js";
import { createSupabaseClient } from "../services/backend/supabase-client.js";
import { createValuationEngine } from "../engines/valuation-engine.js";
import { createReturnEngine } from "../engines/return-engine.js";
import { createHybridStateRepository } from "../services/persistence/hybrid-state-repository.js";
import { createUiContextService } from "../services/persistence/ui-context-service.js";
import { createMarketDataGateway } from "../services/market-data/market-data-gateway.js";
import { createShareLinkService } from "../services/sharing/share-link-service.js";

export function createIncrementumRuntime({ config, location }) {
  const supabase = createSupabaseClient(config);
  const apiClient = createBackendApiClient(config);
  const stateRepository = createHybridStateRepository({ supabase });
  const uiContextService = createUiContextService({ stateRepository, location });
  const marketDataGateway = createMarketDataGateway({ config, apiClient });
  const shareLinkService = createShareLinkService({ config, location, apiClient, uiContextService });
  const valuationEngine = createValuationEngine();
  const returnEngine = createReturnEngine();

  return {
    config,
    services: {
      supabase,
      apiClient,
      stateRepository,
      uiContextService,
      marketDataGateway,
      shareLinkService,
      valuationEngine,
      returnEngine,
    },
    async initialize() {
      this.preloadedAppState = await stateRepository.loadAppState("incrementum-dashboard-state-v6").catch(() => null);
      await shareLinkService.initialize();
      await uiContextService.initialize();
      this.preloadedUiContext = uiContextService.getAll();
    },
  };
}
