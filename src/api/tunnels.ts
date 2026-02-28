import { db } from "../db";
import { tunnels, authTokens } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { activeTunnels } from "../tunnel/server";

// ─── List Tunnels ────────────────────────────────────
export async function handleListTunnels(
    _req: Request,
    userId: number
): Promise<Response> {
    const result = db
        .select({
            id: tunnels.id,
            subdomain: tunnels.subdomain,
            customDomain: tunnels.customDomain,
            localPort: tunnels.localPort,
            status: tunnels.status,
            connectedAt: tunnels.connectedAt,
            disconnectedAt: tunnels.disconnectedAt,
            tokenName: authTokens.name,
        })
        .from(tunnels)
        .leftJoin(authTokens, eq(tunnels.tokenId, authTokens.id))
        .where(eq(tunnels.userId, userId))
        .orderBy(desc(tunnels.connectedAt))
        .all();

    return Response.json({ tunnels: result });
}

// ─── Disconnect Tunnel ───────────────────────────────
export async function handleDisconnectTunnel(
    _req: Request,
    userId: number,
    tunnelId: number
): Promise<Response> {
    const tunnel = db
        .select()
        .from(tunnels)
        .where(and(eq(tunnels.id, tunnelId), eq(tunnels.userId, userId)))
        .get();

    if (!tunnel) {
        return Response.json({ error: "Tunnel not found" }, { status: 404 });
    }

    // Close WebSocket if active
    const activeWs = activeTunnels.get(tunnel.subdomain);
    if (activeWs) {
        activeWs.ws.close(1000, "Disconnected by user");
        activeTunnels.delete(tunnel.subdomain);
    }

    db.update(tunnels)
        .set({
            status: "disconnected",
            disconnectedAt: new Date().toISOString(),
        })
        .where(eq(tunnels.id, tunnelId))
        .run();

    return Response.json({ message: "Tunnel disconnected" });
}

// ─── Get Stats ───────────────────────────────────────
export async function handleGetStats(
    _req: Request,
    userId: number
): Promise<Response> {
    const allTunnels = db
        .select()
        .from(tunnels)
        .where(eq(tunnels.userId, userId))
        .all();

    const activeCount = allTunnels.filter(
        (t) => t.status === "connected"
    ).length;
    const totalCount = allTunnels.length;

    const tokens = db
        .select()
        .from(authTokens)
        .where(eq(authTokens.userId, userId))
        .all();

    const activeTokens = tokens.filter((t) => !t.revokedAt).length;

    return Response.json({
        stats: {
            activeTunnels: activeCount,
            totalTunnels: totalCount,
            activeTokens,
            totalTokens: tokens.length,
        },
    });
}
