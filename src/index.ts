import { initializeDatabase } from "./db";
import { handleRegister, handleLogin, handleMe } from "./auth/routes";
import { authMiddleware, type JWTPayload } from "./auth/middleware";
import { handleListTokens, handleCreateToken, handleRevokeToken } from "./api/tokens";
import { handleListTunnels, handleDisconnectTunnel, handleGetStats } from "./api/tunnels";
import { handleListDomains, handleAddDomain, handleDeleteDomain, handleVerifyDomain } from "./api/domains";
import { handleTunnelMessage, handleTunnelClose, type TunnelData } from "./tunnel/server";
import { handleProxyRequest } from "./tunnel/proxy";
import { existsSync } from "fs";
import { join, resolve } from "path";

// ─── Initialize ──────────────────────────────────────
initializeDatabase();

const PORT = parseInt(process.env.PORT || "80");
const FRONTEND_DIR = resolve(import.meta.dir, "../frontend/dist");

console.log(`📂 Serving frontend from: ${FRONTEND_DIR}`);

// ─── CORS Headers ────────────────────────────────────
function corsHeaders(): Record<string, string> {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
}

function corsResponse(): Response {
    return new Response(null, { status: 204, headers: corsHeaders() });
}

function withCors(response: Response): Response {
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders()).forEach(([key, value]) => {
        headers.set(key, value);
    });
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

// ─── Route Helpers ───────────────────────────────────
type RouteHandler = (req: Request, userId: number) => Promise<Response>;

async function protectedRoute(req: Request, handler: RouteHandler): Promise<Response> {
    const authResult = await authMiddleware(req);
    if (authResult instanceof Response) return withCors(authResult);
    const payload = authResult as JWTPayload;
    return withCors(await handler(req, parseInt(payload.sub)));
}

async function protectedRouteWithParam(
    req: Request,
    paramId: number,
    handler: (req: Request, userId: number, paramId: number) => Promise<Response>
): Promise<Response> {
    const authResult = await authMiddleware(req);
    if (authResult instanceof Response) return withCors(authResult);
    const payload = authResult as JWTPayload;
    return withCors(await handler(req, parseInt(payload.sub), paramId));
}

// ─── Server ──────────────────────────────────────────
const server = Bun.serve<TunnelData>({
    port: PORT,

    fetch(req, server) {
        const url = new URL(req.url);
        const path = url.pathname;
        const method = req.method;
        const hostname = req.headers.get("host") || "";

        // ─── CORS Preflight ──────────────────────
        if (method === "OPTIONS") {
            return corsResponse();
        }

        // ─── WebSocket Tunnel Upgrade ────────────
        if (path === "/_tunnel/connect") {
            const upgraded = server.upgrade(req, {
                data: {
                    userId: 0,
                    tokenId: 0,
                    subdomain: "",
                    localPort: 0,
                    tunnelId: 0,
                    authenticated: false,
                } as TunnelData,
            });
            if (upgraded) return undefined;
            return withCors(
                new Response("WebSocket upgrade failed", { status: 400 })
            );
        }

        // ─── Proxy Check (subdomain routing) ─────
        // If hostname has a subdomain that matches an active tunnel
        const subdomain = hostname.split(".")[0];
        if (
            subdomain &&
            subdomain !== "localhost" &&
            subdomain !== hostname &&
            !path.startsWith("/api/") &&
            !path.startsWith("/_tunnel/")
        ) {
            return handleProxyRequest(req, hostname).then(
                (res) => res || serveFrontend(path)
            );
        }

        // ─── Auth Routes ─────────────────────────
        if (path === "/api/auth/register" && method === "POST") {
            return handleRegister(req).then(withCors);
        }
        if (path === "/api/auth/login" && method === "POST") {
            return handleLogin(req).then(withCors);
        }
        if (path === "/api/auth/me" && method === "GET") {
            return protectedRoute(req, handleMe);
        }

        // ─── Token Routes ────────────────────────
        if (path === "/api/tokens" && method === "GET") {
            return protectedRoute(req, handleListTokens);
        }
        if (path === "/api/tokens" && method === "POST") {
            return protectedRoute(req, handleCreateToken);
        }
        const tokenMatch = path.match(/^\/api\/tokens\/(\d+)$/);
        if (tokenMatch && method === "DELETE") {
            return protectedRouteWithParam(req, parseInt(tokenMatch[1]), handleRevokeToken);
        }

        // ─── Tunnel Routes ──────────────────────
        if (path === "/api/tunnels" && method === "GET") {
            return protectedRoute(req, handleListTunnels);
        }
        if (path === "/api/stats" && method === "GET") {
            return protectedRoute(req, handleGetStats);
        }
        const tunnelMatch = path.match(/^\/api\/tunnels\/(\d+)$/);
        if (tunnelMatch && method === "DELETE") {
            return protectedRouteWithParam(req, parseInt(tunnelMatch[1]), handleDisconnectTunnel);
        }

        // ─── Domain Routes ──────────────────────
        if (path === "/api/domains" && method === "GET") {
            return protectedRoute(req, handleListDomains);
        }
        if (path === "/api/domains" && method === "POST") {
            return protectedRoute(req, handleAddDomain);
        }
        const domainDeleteMatch = path.match(/^\/api\/domains\/(\d+)$/);
        if (domainDeleteMatch && method === "DELETE") {
            return protectedRouteWithParam(req, parseInt(domainDeleteMatch[1]), handleDeleteDomain);
        }
        const domainVerifyMatch = path.match(/^\/api\/domains\/(\d+)\/verify$/);
        if (domainVerifyMatch && method === "POST") {
            return protectedRouteWithParam(req, parseInt(domainVerifyMatch[1]), handleVerifyDomain);
        }

        // ─── Serve Frontend (SPA) ────────────────
        return serveFrontend(path);
    },

    websocket: {
        open(ws) {
            console.log("🔗 WebSocket connected");
        },
        message(ws, message) {
            handleTunnelMessage(ws, message as string);
        },
        close(ws) {
            handleTunnelClose(ws);
        },
    },
});

// ─── Serve Frontend Static Files ─────────────────────
function serveFrontend(path: string): Response {
    // Try to serve static files from frontend/dist
    const filePath = join(FRONTEND_DIR, path === "/" ? "index.html" : path);

    if (existsSync(filePath)) {
        return new Response(Bun.file(filePath));
    } else {
        console.log(`❌ File not found: ${filePath}`);
    }

    // SPA fallback — serve index.html for any unmatched route
    const indexPath = join(FRONTEND_DIR, "index.html");
    if (existsSync(indexPath)) {
        return new Response(Bun.file(indexPath));
    } else {
        console.log(`❌ Index not found: ${indexPath}`);
        console.log(`📂 FRONTEND_DIR: ${FRONTEND_DIR}`);
    }

    // If frontend not built, return API info
    return withCors(
        Response.json({
            name: "Tunnel Server",
            version: "1.1.0-debug",
            status: "running",
            docs: {
                auth: "POST /api/auth/register, POST /api/auth/login",
                tokens: "GET/POST /api/tokens, DELETE /api/tokens/:id",
                tunnels: "GET /api/tunnels, DELETE /api/tunnels/:id",
                domains: "GET/POST /api/domains, DELETE /api/domains/:id",
                websocket: "WS /_tunnel/connect",
            },
            frontend: existsSync(join(FRONTEND_DIR, "index.html"))
                ? "Serving from dist"
                : "Missing dist/index.html",
            debug: {
                frontendDir: FRONTEND_DIR,
                requestedPath: path,
                cwd: process.cwd(),
            }
        })
    );
}

console.log(`
╔══════════════════════════════════════════════════╗
║           🚇 Tunnel Server v1.0.0               ║
╠══════════════════════════════════════════════════╣
║  HTTP Server:    http://localhost:${PORT}            ║
║  WebSocket:      ws://localhost:${PORT}/_tunnel/connect ║
║  API Docs:       http://localhost:${PORT}/             ║
╚══════════════════════════════════════════════════╝
`);
