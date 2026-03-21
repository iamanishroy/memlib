import { auth } from "@/lib/auth";
import { appRouter } from "@memlib/api/routers/index";
import { RPCHandler } from "@orpc/server/fetch";
import { onError } from "@orpc/server";
import { headers } from "next/headers";

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

async function handler(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const context = {
    session,
    headers: req.headers,
  };

  const result = await rpcHandler.handle(req, {
    prefix: "/api/rpc",
    context,
  });

  if (result.matched) {
    return new Response(result.response.body, result.response);
  }

  return new Response("Not found", { status: 404 });
}

export { handler as GET, handler as POST };
