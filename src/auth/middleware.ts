import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "tunnel-app-secret-change-in-production-2024"
);

const JWT_ISSUER = "tunnel-server";
const JWT_EXPIRATION = "7d";

export interface JWTPayload {
    sub: string; // user id
    email: string;
    name: string;
}

export async function createToken(payload: JWTPayload): Promise<string> {
    return await new SignJWT(payload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer(JWT_ISSUER)
        .setExpirationTime(JWT_EXPIRATION)
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET, {
            issuer: JWT_ISSUER,
        });
        return payload as unknown as JWTPayload;
    } catch {
        return null;
    }
}

// ─── Auth Middleware ─────────────────────────────────
export async function authMiddleware(
    req: Request
): Promise<JWTPayload | Response> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return Response.json(
            { error: "Missing or invalid Authorization header" },
            { status: 401 }
        );
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token);

    if (!payload) {
        return Response.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    return payload;
}
