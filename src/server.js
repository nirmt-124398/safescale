import { createApp } from "./app.js";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

const app = createApp();

try {
  await app.listen({ port, host });
  app.log.info(`SafeScale proxy listening on ${host}:${port}`);
} catch (error) {
  app.log.error(error, "Failed to start server");
  process.exit(1);
}
