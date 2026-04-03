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
  await import("../app.js?v=2");
}

bootstrap().catch((error) => {
  console.error("Incrementum bootstrap failed", error);
  import("../app.js?v=2").catch((secondaryError) => {
    console.error("Incrementum app fallback import failed", secondaryError);
  });
});
