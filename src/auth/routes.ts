import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./hash";
import { createToken } from "./middleware";

// ─── Register ────────────────────────────────────────
export async function handleRegister(req: Request): Promise<Response> {
    try {
        const body = await req.json();
        const { email, password, name } = body;

        if (!email || !password || !name) {
            return Response.json(
                { error: "Email, password, and name are required" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return Response.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            );
        }

        // Check if user exists
        const existing = db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .get();

        if (existing) {
            return Response.json(
                { error: "Email already registered" },
                { status: 409 }
            );
        }

        const passwordHash = await hashPassword(password);

        const result = db
            .insert(users)
            .values({
                email,
                name,
                passwordHash,
            })
            .returning()
            .get();

        const jwt = await createToken({
            sub: String(result.id),
            email: result.email,
            name: result.name,
        });

        return Response.json({
            token: jwt,
            user: {
                id: result.id,
                email: result.email,
                name: result.name,
            },
        });
    } catch (error: any) {
        console.error("Register error:", error);
        return Response.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// ─── Login ───────────────────────────────────────────
export async function handleLogin(req: Request): Promise<Response> {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return Response.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        const user = db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .get();

        if (!user) {
            return Response.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
            return Response.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        const jwt = await createToken({
            sub: String(user.id),
            email: user.email,
            name: user.name,
        });

        return Response.json({
            token: jwt,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    } catch (error: any) {
        console.error("Login error:", error);
        return Response.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// ─── Get Current User ────────────────────────────────
export async function handleMe(req: Request, userId: number): Promise<Response> {
    const user = db
        .select({
            id: users.id,
            email: users.email,
            name: users.name,
            createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .get();

    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ user });
}
