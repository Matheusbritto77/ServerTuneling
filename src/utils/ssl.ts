// SSL helper utilities
// In production, integrate with Let's Encrypt / ACME protocol
// For development, we use plain HTTP

export function getSSLStatus(): { enabled: boolean; provider: string } {
    const sslEnabled = process.env.SSL_ENABLED === "true";
    return {
        enabled: sslEnabled,
        provider: sslEnabled ? "lets-encrypt" : "none",
    };
}

export function generateSelfSignedCert() {
    // Placeholder for self-signed cert generation in dev
    console.log("⚠️  SSL not configured — running in HTTP mode");
}
