import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const API_ROOT = path.resolve("api");

type ResolvedRoute = {
  modulePath: string;
  query: Record<string, string | string[] | undefined>;
};

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve(undefined);
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
    req.on("error", reject);
  });
}

function patchResponse(res: ServerResponse): VercelResponse {
  const patched = res as VercelResponse;

  patched.status = function status(code: number) {
    this.statusCode = code;
    return this;
  };

  patched.json = function json(body: unknown) {
    if (!this.headersSent) {
      this.setHeader("Content-Type", "application/json");
    }
    this.end(JSON.stringify(body));
    return this;
  };

  patched.send = function send(body: unknown) {
    if (typeof body === "object" && body !== null) {
      return this.json(body);
    }
    this.end(String(body ?? ""));
    return this;
  };

  return patched;
}

function resolveApiRoute(pathname: string, searchParams: URLSearchParams): ResolvedRoute | null {
  const segments = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const query: Record<string, string | string[] | undefined> = Object.fromEntries(searchParams.entries());

  if (segments.length === 0) {
    return null;
  }

  const directPath = path.join(API_ROOT, ...segments) + ".ts";
  if (fs.existsSync(directPath)) {
    return { modulePath: directPath, query };
  }

  const indexPath = path.join(API_ROOT, ...segments, "index.ts");
  if (fs.existsSync(indexPath)) {
    return { modulePath: indexPath, query };
  }

  const dynamicDir = path.join(API_ROOT, ...segments.slice(0, -1));
  if (!fs.existsSync(dynamicDir)) {
    return null;
  }

  const dynamicValue = segments.at(-1);
  if (!dynamicValue) {
    return null;
  }

  for (const entry of fs.readdirSync(dynamicDir)) {
    const match = entry.match(/^\[(.+)\]\.ts$/);
    if (!match) {
      continue;
    }

    return {
      modulePath: path.join(dynamicDir, entry),
      query: { ...query, [match[1]]: dynamicValue },
    };
  }

  return null;
}

async function handleApiRequest(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "/", `http://${host}`);
  const route = resolveApiRoute(url.pathname, url.searchParams);

  if (!route) {
    return false;
  }

  const moduleId = path.relative(server.config.root, route.modulePath);
  const mod = await server.ssrLoadModule(`/${moduleId.replace(/\\/g, "/")}`);
  const handler = mod.default;

  if (typeof handler !== "function") {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "API handler missing default export" }));
    return true;
  }

  const vercelReq = req as VercelRequest;
  vercelReq.query = route.query;
  if (req.method !== "GET" && req.method !== "HEAD") {
    vercelReq.body = await readBody(req);
  }

  const vercelRes = patchResponse(res);
  await handler(vercelReq, vercelRes);
  return true;
}

export function apiDevPlugin(): Plugin {
  return {
    name: "truecrew-api-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) {
          next();
          return;
        }

        try {
          const handled = await handleApiRequest(server, req, res);
          if (!handled) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: "API route not found" }));
          }
        } catch (error) {
          console.error("[api-dev]", error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: false,
                error: error instanceof Error ? error.message : "API handler failed",
              }),
            );
          }
        }
      });
    },
  };
}
