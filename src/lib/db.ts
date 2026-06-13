import { cache } from "react";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Cloudflare Workers run on a stateless, per-request execution model: I/O
// objects (like a Postgres socket) created in one request CANNOT be reused in
// the next one. A module-level singleton therefore ends up reusing a dead
// connection on the second request, and the Worker hangs until it is killed.
//
// The fix (per the OpenNext Cloudflare guide) is a fresh client per request,
// memoized within the request via React's `cache`, with `maxUses: 1` so the
// underlying pg connection is never carried across requests.
const getClient = cache(() => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    maxUses: 1,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
});

// Keep the existing `import { prisma } from "@/lib/db"` call sites working by
// exposing a proxy that resolves to the current request's client on access.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});