export function createBackendApiClient(config) {
  const baseUrl = config.backend.baseUrl || config.backend.edgeFunctionsBaseUrl || "";

  async function request(path, options = {}) {
    if (!baseUrl) {
      throw new Error("Backend base URL is not configured.");
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Backend request failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("application/json") ? response.json() : response.text();
  }

  return {
    isConfigured() {
      return Boolean(baseUrl);
    },
    request,
  };
}
