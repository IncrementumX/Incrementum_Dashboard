import { createRuntimeConfig } from "./config/runtime-config.js";
import { PUBLIC_ENV } from "./config/public-env.js";
import { createIncrementumRuntime } from "./core/runtime.js";

async function bootstrap() {
  const runtime = createIncrementumRuntime({
    config: createRuntimeConfig({
      ...PUBLIC_ENV,
      ...(window.__INCREMENTUM_ENV__ || {}),
    }),
    location: window.location,
  });

  await runtime.initialize();
  window.IncrementumRuntime = runtime;

  const legacyScript = document.createElement("script");
  legacyScript.src = "./app.js";
  legacyScript.defer = true;
  document.body.appendChild(legacyScript);
}

bootstrap().catch((error) => {
  console.error("Incrementum bootstrap failed", error);
  const fallbackScript = document.createElement("script");
  fallbackScript.src = "./app.js";
  fallbackScript.defer = true;
  document.body.appendChild(fallbackScript);
});
