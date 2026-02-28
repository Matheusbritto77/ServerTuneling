import { db } from "../db";
import { authTokens, tunnels } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

// ─── List Tokens ─────────────────────────────────────
export async function handleListTokens(
    _req: Request,
    userId: number
): Promise<Response> {
    const tokens = db
        .select({
            id: authTokens.id,
            name: authTokens.name,
            token: authTokens.token,
            lastUsedAt: authTokens.lastUsedAt,
            createdAt: authTokens.createdAt,
            revokedAt: authTokens.revokedAt,
        })
        .from(authTokens)
        .where(eq(authTokens.userId, userId))
        .all();

    // Mask tokens (show first 8 chars + last 4)
    const masked = tokens.map((t) => ({
        ...t,
        tokenPreview:
            t.token.substring(0, 8) + "..." + t.token.substring(t.token.length - 4),
    }));

    return Response.json({ tokens: masked });
}

// ─── Create Token ────────────────────────────────────
export async function handleCreateToken(
    req: Request,
    userId: number
): Promise<Response> {
    try {
        const body = await req.json();
        const { name } = body;

        if (!name) {
            return Response.json(
                { error: "Token name is required" },
                { status: 400 }
            );
        }

        const token = `tnl_${nanoid(48)}`;

        const result = db
            .insert(authTokens)
            .values({
                userId,
                token,
                name,
            })
            .returning()
            .get();

        return Response.json({
            token: {
                id: result.id,
                name: result.name,
                token: result.token, // Full token shown only on creation
                createdAt: result.createdAt,
            },
        });
    } catch (error: any) {
        console.error("Create token error:", error);
        return Response.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// ─── Revoke Token ────────────────────────────────────
export async function handleRevokeToken(
    _req: Request,
    userId: number,
    tokenId: number
): Promise<Response> {
    const token = db
        .select()
        .from(authTokens)
        .where(and(eq(authTokens.id, tokenId), eq(authTokens.userId, userId)))
        .get();

    if (!token) {
        return Response.json({ error: "Token not found" }, { status: 404 });
    }

    // Disconnect any active tunnels using this token
    db.update(tunnels)
        .set({ status: "disconnected", disconnectedAt: new Date().toISOString() })
        .where(
            and(eq(tunnels.tokenId, tokenId), eq(tunnels.status, "connected"))
        )
        .run();

    // Revoke the token
    db.update(authTokens)
        .set({ revokedAt: new Date().toISOString() })
        .where(eq(authTokens.id, tokenId))
        .run();

    return Response.json({ message: "Token revoked successfully" });
}
