import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── Users ───────────────────────────────────────────
export const users = sqliteTable("users", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: text("created_at")
        .notNull()
        .$defaultFn(() => new Date().toISOString()),
});

// ─── Auth Tokens (used by Swift client) ───────────────
export const authTokens = sqliteTable("auth_tokens", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    name: text("name").notNull(),
    lastUsedAt: text("last_used_at"),
    createdAt: text("created_at")
        .notNull()
        .$defaultFn(() => new Date().toISOString()),
    revokedAt: text("revoked_at"),
});

// ─── Active Tunnels ──────────────────────────────────
export const tunnels = sqliteTable("tunnels", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    tokenId: integer("token_id")
        .notNull()
        .references(() => authTokens.id, { onDelete: "cascade" }),
    subdomain: text("subdomain").notNull().unique(),
    customDomain: text("custom_domain"),
    localPort: integer("local_port").notNull(),
    status: text("status").notNull().default("connected"), // connected | disconnected
    connectedAt: text("connected_at")
        .notNull()
        .$defaultFn(() => new Date().toISOString()),
    disconnectedAt: text("disconnected_at"),
});

// ─── Custom Domains ──────────────────────────────────
export const domains = sqliteTable("domains", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    domain: text("domain").notNull().unique(),
    sslStatus: text("ssl_status").notNull().default("pending"), // pending | active | error
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    verificationToken: text("verification_token"),
    createdAt: text("created_at")
        .notNull()
        .$defaultFn(() => new Date().toISOString()),
});

// ─── Types ───────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuthToken = typeof authTokens.$inferSelect;
export type NewAuthToken = typeof authTokens.$inferInsert;
export type Tunnel = typeof tunnels.$inferSelect;
export type Domain = typeof domains.$inferSelect;
