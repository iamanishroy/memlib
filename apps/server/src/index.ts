import { createContext } from "@memz/api/context";
import { appRouter } from "@memz/api/routers/index";
import { auth } from "@memz/auth";
import { env } from "@memz/env/server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

// ── REST API routes (/v1/*) ────────────────────────────────────
// Lightweight context — NO session auth, just pass raw headers.
// API key resolution happens lazily inside apiKeyProcedure.
app.use("/v1/*", async (c) => {
  const context = {
    session: null,
    headers: c.req.raw.headers,
    databaseUrl: env.DATABASE_URL,
  };

  const result = await apiHandler.handle(c.req.raw, {
    prefix: "/v1",
    context,
  });

  if (result.matched) {
    return c.newResponse(result.response.body, result.response);
  }

  return c.notFound();
});

// ── RPC routes (/rpc/*) ────────────────────────────────────────
// Full session context for dashboard/web calls.
app.use("/rpc/*", async (c) => {
  const context = await createContext({ context: c });

  const result = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (result.matched) {
    return c.newResponse(result.response.body, result.response);
  }

  return c.notFound();
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
