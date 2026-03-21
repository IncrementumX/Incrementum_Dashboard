export function createRuntimeConfig(env = {}) {
  return {
    app: {
      name: "Incrementum Dashboard",
      environment: env.APP_ENV || "local",
    },
    supabase: {
      url: env.SUPABASE_URL || "",
      anonKey: env.SUPABASE_ANON_KEY || "",
      projectRef: env.SUPABASE_PROJECT_REF || "",
    },
    backend: {
      baseUrl: env.BACKEND_BASE_URL || "",
      edgeFunctionsBaseUrl: env.EDGE_FUNCTIONS_BASE_URL || "",
    },
    marketData: {
      primaryProvider: env.MARKET_DATA_PRIMARY || "polygon",
      fallbackProvider: env.MARKET_DATA_FALLBACK || "stooq",
      cacheTtlSeconds: Number(env.MARKET_DATA_CACHE_TTL || 3600),
    },
    sharing: {
      publicBaseUrl: env.PUBLIC_BASE_URL || "",
      sharePathPrefix: env.SHARE_PATH_PREFIX || "share",
    },
  };
}
