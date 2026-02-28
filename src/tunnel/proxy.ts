import { activeTunnels, customDomainToSubdomain, sendTunnelRequest } from "./server";
import { nanoid } from "nanoid";

const BASE_DOMAIN = process.env.BASE_DOMAIN || "localhost:3000";

// ─── Reverse Proxy Handler ──────────────────────────
export async function handleProxyRequest(
    req: Request,
    hostname: string
): Promise<Response | null> {
    // 1. Try resolving by custom domain first (full hostname match)
    let subdomain = customDomainToSubdomain.get(hostname);

    // 2. Fallback to subdomain extraction
    if (!subdomain) {
        // e.g., "myapp.tunnel.example.com" → "myapp"
        subdomain = hostname.split(".")[0];
    }

    // Check if there's an active tunnel for this subdomain
    const connection = activeTunnels.get(subdomain || "");
    if (!connection) {
        return null; // Not a tunnel request
    }

    try {
        const requestId = nanoid(16);
        const url = new URL(req.url);

        // Read body if present
        let body: string | undefined;
        if (req.method !== "GET" && req.method !== "HEAD") {
            body = await req.text();
        }

        // Build headers object
        const headers: Record<string, string> = {};
        req.headers.forEach((value, key) => {
            headers[key] = value;
        });

        // Send through tunnel
        const tunnelResponse = await sendTunnelRequest(subdomain, {
            id: requestId,
            method: req.method,
            url: url.pathname + url.search,
            headers,
            body,
        });

        // Build response
        const responseHeaders = new Headers(tunnelResponse.headers || {});
        responseHeaders.set("X-Tunnel-Proxy", "true");
        responseHeaders.set("X-Tunnel-Subdomain", subdomain);

        return new Response(tunnelResponse.body || null, {
            status: tunnelResponse.status,
            headers: responseHeaders,
        });
    } catch (error: any) {
        console.error(`Proxy error for ${subdomain}:`, error.message);
        return new Response(
            JSON.stringify({
                error: "Tunnel Error",
                message:
                    error.message === "Tunnel request timeout"
                        ? "The local application did not respond in time"
                        : "Failed to reach the local application",
            }),
            {
                status: 502,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

// ─── Get Tunnel URL ──────────────────────────────────
export function getTunnelUrl(subdomain: string): string {
    const protocol = BASE_DOMAIN.includes("localhost") ? "http" : "https";
    return `${protocol}://${subdomain}.${BASE_DOMAIN}`;
}
