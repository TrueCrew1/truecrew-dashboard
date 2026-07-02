import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadEnv, type Plugin, type ViteDevServer } from "vite";

const API_PREFIX = "/api/";

interface RouteMatch {
  handlerPath: string;
  params: Record<string, string>;
}

interface HandlerModule {
  default: (req: VercelRequest, res: VercelResponse) => Promise<unknown> | unknown;
  config?: {
    api?: {
      bodyParser?: boolean;
    };
  };
}

function applyLocalEnv(mode: string): void {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function resolveApiRoute(apiRoot: string, pathname: string): RouteMatch | null {
  if (!pathname.startsWith(API_PREFIX)) {
    return null;
  }

  const subPath = pathname.slice(API_PREFIX.length).replace(/\/$/, "");
  const segments = subPath ? subPath.split("/") : [];

  if (segments.length > 0) {
    const staticPath = path.join(apiRoot, ...segments) + ".ts";
    if (fs.existsSync(staticPath)) {
      return { handlerPath: staticPath, params: {} };
    }
  }

  const indexPath = path.join(apiRoot, ...segments, "index.ts");
  if (fs.existsSync(indexPath)) {
    return { handlerPath: indexPath, params: {} };
  }

  if (segments.length >= 2) {
    const parentDir = path.join(apiRoot, ...segments.slice(0, -1));
    const dynamicSegment = segments[segments.length - 1];

    if (fs.existsSync(parentDir)) {
      for (const file of fs.readdirSync(parentDir)) {
        const match = file.match(/^\[(.+)\]\.ts$/);
        if (match) {
          return {
            handlerPath: path.join(parentDir, file),
            params: { [match[1]]: dynamicSegment },
          };
        }
      }
    }
  }

  return null;
}

async function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function createReadableRequest(
  req: IncomingMessage,
  body: Buffer,
): IncomingMessage {
  const stream = Readable.from(body);
  const readableReq = Object.assign(stream, {
    headers: req.headers,
    method: req.method,
    url: req.url,
    httpVersion: req.httpVersion,
    httpVersionMajor: req.httpVersionMajor,
    httpVersionMinor: req.httpVersionMinor,
    socket: req.socket,
  }) as IncomingMessage;

  return readableReq;
}

function createVercelResponse(res: ServerResponse): VercelResponse {
  let statusCode = 200;

  const vercelRes = {
    status(code: number) {
      statusCode = code;
      return vercelRes;
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      res.setHeader(name, value);
      return vercelRes;
    },
    json(body: unknown) {
      if (!res.headersSent) {
        res.statusCode = statusCode;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(body));
      }
      return vercelRes;
    },
    send(body: unknown) {
      if (!res.headersSent) {
        res.statusCode = statusCode;
        if (typeof body === "object" && body !== null && !Buffer.isBuffer(body)) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(body));
        } else {
          res.end(body as string | Buffer);
        }
      }
      return vercelRes;
    },
    end(data?: string | Buffer) {
      if (!res.headersSent) {
        res.statusCode = statusCode;
        res.end(data);
      }
      return vercelRes;
    },
  } as VercelResponse;

  return vercelRes;
}

function createVercelRequest(
  req: IncomingMessage,
  query: Record<string, string | string[]>,
  body?: unknown,
): VercelRequest {
  const vercelReq = req as VercelRequest;
  vercelReq.query = query;
  if (body !== undefined) {
    vercelReq.body = body;
  }
  return vercelReq;
}

async function handleApiRequest(
  server: ViteDevServer,
  apiRoot: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const route = resolveApiRoute(apiRoot, url.pathname);
  if (!route) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "API route not found" }));
    return true;
  }

  const moduleUrl = `${route.handlerPath}?t=${Date.now()}`;
  const handlerModule = (await server.ssrLoadModule(moduleUrl)) as HandlerModule;
  const handler = handlerModule.default;

  if (typeof handler !== "function") {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "API handler is not a function" }));
    return true;
  }

  const query: Record<string, string | string[]> = {};
  for (const [key, value] of url.searchParams.entries()) {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      query[key] = [existing, value];
    }
  }
  for (const [key, value] of Object.entries(route.params)) {
    query[key] = value;
  }

  const bodyParserEnabled = handlerModule.config?.api?.bodyParser !== false;
  const rawBody = await readRequestBody(req);
  const requestForHandler = createReadableRequest(req, rawBody);

  let parsedBody: unknown;
  if (bodyParserEnabled && rawBody.length > 0) {
    const contentType = req.headers["content-type"] ?? "";
    if (contentType.includes("application/json")) {
      try {
        parsedBody = JSON.parse(rawBody.toString("utf8"));
      } catch {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
        return true;
      }
    } else {
      parsedBody = rawBody.toString("utf8");
    }
  }

  const vercelReq = createVercelRequest(requestForHandler, query, parsedBody);
  const vercelRes = createVercelResponse(res);

  await handler(vercelReq, vercelRes);
  return true;
}

export function apiDevPlugin(): Plugin {
  const apiRoot = path.resolve(process.cwd(), "api");

  return {
    name: "truecrew-api-dev",
    apply: "serve",
    configureServer(server) {
      applyLocalEnv(server.config.mode);

      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url ? new URL(req.url, "http://localhost").pathname : "";
        if (!pathname.startsWith(API_PREFIX)) {
          return next();
        }

        try {
          await handleApiRequest(server, apiRoot, req, res);
        } catch (error) {
          console.error("[api-dev] handler failed", error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(
              JSON.stringify({
                ok: false,
                error: error instanceof Error ? error.message : "Internal server error",
              }),
            );
          }
        }
      });
    },
  };
}
