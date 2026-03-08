import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";
import { resolveApiKey } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

// ─── Session Auth (for dashboard/web) ─────────────────────────────

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

// ─── API Key Auth (for external API access) ───────────────────────

/**
 * Creates a procedure that requires a valid API key with at least
 * the given permission level.
 *
 * Permission levels:
 *   1 = Read
 *   2 = Read & Write
 *   3 = Admin
 *
 * Uses an ephemeral pg.Client per call — no persistent Pool.
 */
export function apiKeyProcedure(minPermission: number = 1) {
  return publicProcedure.use(
    o.middleware(async ({ context, next }) => {
      const databaseUrl = (context as any).databaseUrl as string | undefined;
      if (!databaseUrl) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Database URL not configured in context",
        });
      }

      const apiKey = await resolveApiKey(context.headers, databaseUrl);

      if (!apiKey) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Valid API key required. Pass Authorization: Bearer sk_...",
        });
      }

      if (apiKey.permission < minPermission) {
        const labels: Record<number, string> = {
          1: "read",
          2: "read & write",
          3: "admin",
        };
        throw new ORPCError("FORBIDDEN", {
          message: `This operation requires "${labels[minPermission] ?? minPermission}" permission.`,
        });
      }

      return next({
        context: {
          apiKey,
          projectId: apiKey.projectId,
        },
      });
    }),
  );
}
