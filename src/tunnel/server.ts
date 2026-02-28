import { db } from "../db";
import { authTokens, tunnels, users } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { ServerWebSocket } from "bun";

// ─── Types ───────────────────────────────────────────
export interface TunnelConnection {
    ws: ServerWebSocket<TunnelData>;
    userId: number;
    tokenId: number;
    subdomain: string;
    localPort: number;
    tunnelId: number;
    customDomain: string | null;
}

export interface TunnelData {
    userId: number;
    tokenId: number;
    subdomain: string;
    localPort: number;
    tunnelId: number;
    customDomain: string | null;
    authenticated: boolean;
}

interface TunnelRequest {
    id: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
}

interface TunnelResponse {
    id: string;
    status: number;
    headers: Record<string, string>;
    body?: string;
}

// ─── Active Tunnels Map ──────────────────────────────
export const activeTunnels = new Map<string, TunnelConnection>();
export const customDomainToSubdomain = new Map<string, string>();

// Pending request resolvers
const pendingRequests = new Map<
    string,
    {
        resolve: (res: TunnelResponse) => void;
        timeout: ReturnType<typeof setTimeout>;
    }
>();

// ─── Authenticate Tunnel Token ───────────────────────
function authenticateToken(token: string) {
    const authToken = db
        .select({
            id: authTokens.id,
            userId: authTokens.userId,
            token: authTokens.token,
            revokedAt: authTokens.revokedAt,
        })
        .from(authTokens)
        .where(and(eq(authTokens.token, token), isNull(authTokens.revokedAt)))
        .get();

    if (!authToken) return null;

    // Update last used
    db.update(authTokens)
        .set({ lastUsedAt: new Date().toISOString() })
        .where(eq(authTokens.id, authToken.id))
        .run();

    return authToken;
}

// ─── Handle WebSocket Messages ───────────────────────
export function handleTunnelMessage(
    ws: ServerWebSocket<TunnelData>,
    message: string | Buffer
) {
    const data = ws.data;
    const msgStr = typeof message === "string" ? message : message.toString();

    try {
        const parsed = JSON.parse(msgStr);

        // Authentication message
        if (parsed.type === "auth") {
            const { token, subdomain, localPort, customDomain } = parsed;

            const authToken = authenticateToken(token);
            if (!authToken) {
                ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
                ws.close(1008, "Invalid token");
                return;
            }

            // Check if subdomain is already in use
            if (activeTunnels.has(subdomain)) {
                ws.send(
                    JSON.stringify({
                        type: "error",
                        message: "Subdomain already in use",
                    })
                );
                ws.close(1008, "Subdomain in use");
                return;
            }

            // Create tunnel record
            const tunnel = db
                .insert(tunnels)
                .values({
                    userId: authToken.userId,
                    tokenId: authToken.id,
                    subdomain,
                    localPort,
                    status: "connected",
                })
                .returning()
                .get();

            // Update WebSocket data
            data.userId = authToken.userId;
            data.tokenId = authToken.id;
            data.subdomain = subdomain;
            data.localPort = localPort;
            data.tunnelId = tunnel.id;
            data.customDomain = customDomain || null;
            data.authenticated = true;

            // Store connection
            const connection = {
                ws,
                userId: authToken.userId,
                tokenId: authToken.id,
                subdomain,
                localPort,
                tunnelId: tunnel.id,
                customDomain: customDomain || null,
            };
            activeTunnels.set(subdomain, connection);
            if (customDomain) {
                customDomainToSubdomain.set(customDomain, subdomain);
            }

            ws.send(
                JSON.stringify({
                    type: "authenticated",
                    subdomain,
                    message: `Tunnel active at ${subdomain}${customDomain ? ` and ${customDomain}` : ""}`,
                })
            );

            console.log(`🚇 Tunnel connected: ${subdomain}${customDomain ? ` (${customDomain})` : ""} → localhost:${localPort}`);
            return;
        }

        // Response from client (for proxied requests)
        if (parsed.type === "response") {
            const pending = pendingRequests.get(parsed.id);
            if (pending) {
                clearTimeout(pending.timeout);
                pending.resolve(parsed as TunnelResponse);
                pendingRequests.delete(parsed.id);
            }
            return;
        }

        // Heartbeat
        if (parsed.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
            return;
        }
    } catch (error) {
        console.error("Tunnel message error:", error);
    }
}

// ─── Handle WebSocket Close ──────────────────────────
export function handleTunnelClose(ws: ServerWebSocket<TunnelData>) {
    const { subdomain, tunnelId, authenticated, customDomain } = ws.data;

    if (authenticated && subdomain) {
        activeTunnels.delete(subdomain);
        if (customDomain) {
            customDomainToSubdomain.delete(customDomain);
        }

        // Update tunnel status in DB
        if (tunnelId) {
            db.update(tunnels)
                .set({
                    status: "disconnected",
                    disconnectedAt: new Date().toISOString(),
                })
                .where(eq(tunnels.id, tunnelId))
                .run();
        }

        console.log(`🔌 Tunnel disconnected: ${subdomain}`);
    }
}

// ─── Send Request Through Tunnel ─────────────────────
export function sendTunnelRequest(
    subdomain: string,
    request: TunnelRequest
): Promise<TunnelResponse> {
    return new Promise((resolve, reject) => {
        const connection = activeTunnels.get(subdomain);
        if (!connection) {
            reject(new Error("No active tunnel for this subdomain"));
            return;
        }

        const timeout = setTimeout(() => {
            pendingRequests.delete(request.id);
            reject(new Error("Tunnel request timeout"));
        }, 30000);

        pendingRequests.set(request.id, { resolve, timeout });

        connection.ws.send(
            JSON.stringify({
                type: "request",
                ...request,
            })
        );
    });
}
