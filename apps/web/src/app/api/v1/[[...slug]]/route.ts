import { appRouter } from "@memlib/api/routers/index";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

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

async function handler(req: Request) {
  // REST API uses API key auth — no session needed.
  // API key resolution happens lazily inside apiKeyProcedure.
  const context = {
    session: null,
    headers: req.headers,
    databaseUrl: process.env.DATABASE_URL,
  };

  const result = await apiHandler.handle(req, {
    prefix: "/api/v1",
    context,
  });

  if (result.matched) {
    return new Response(result.response.body, result.response);
  }

  return new Response("Not found", { status: 404 });
}

export { handler as GET, handler as POST, handler as DELETE };
