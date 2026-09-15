import { buildApp } from "./app.js";

const PORT = parseInt(process.env.PORT || "8000", 10);
const HOST = process.env.HOST || "0.0.0.0";

async function start() {
  try {
    const app = await buildApp({ logger: true });

    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 Mock Interview Buddy backend running at http://${HOST}:${PORT}`);
    console.log(`📋 API base path: http://${HOST}:${PORT}/api/v1`);
    console.log(`⚡ WebSocket URL: ws://${HOST}:${PORT}/api/v1/sessions/:sessionId/ws`);

    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`Received ${signal}, closing server gracefully...`);
        await app.close();
        process.exit(0);
      });
    }
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
