import { createAuthClient } from "better-auth/react";
import { env } from "@memlib/env/web";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
});
