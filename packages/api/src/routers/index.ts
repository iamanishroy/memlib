import type { RouterClient } from "@orpc/server";

import { publicProcedure, o } from "../index";
import { memoryRouter } from "./memory";

export const appRouter = o.router({
  healthCheck: publicProcedure
    .route({ method: "GET", path: "/health" })
    .handler(() => {
      return "OK";
    }),
  memory: o.prefix("/memory").router(memoryRouter),
});

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
