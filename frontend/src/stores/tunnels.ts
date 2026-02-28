import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "./auth";

const API_BASE = "/api";

interface TunnelToken {
    id: number;
    name: string;
    token: string;
    tokenPreview: string;
    lastUsedAt: string | null;
    createdAt: string;
    revokedAt: string | null;
}

interface Tunnel {
    id: number;
    subdomain: string;
    customDomain: string | null;
    localPort: number;
    status: string;
    connectedAt: string;
    disconnectedAt: string | null;
    tokenName: string | null;
}

interface Domain {
    id: number;
    domain: string;
    sslStatus: string;
    verified: boolean;
    verificationToken: string | null;
    createdAt: string;
}

interface Stats {
    activeTunnels: number;
    totalTunnels: number;
    activeTokens: number;
    totalTokens: number;
}

export const useTunnelStore = defineStore("tunnels", () => {
    const tokens = ref<TunnelToken[]>([]);
    const tunnels = ref<Tunnel[]>([]);
    const domains = ref<Domain[]>([]);
    const stats = ref<Stats>({ activeTunnels: 0, totalTunnels: 0, activeTokens: 0, totalTokens: 0 });
    const loading = ref(false);
    const lastCreatedToken = ref<string | null>(null);

    function headers() {
        return useAuthStore().authHeaders();
    }

    // ─── Tokens ────────────────────────────────
    async function fetchTokens() {
        loading.value = true;
        try {
            const res = await fetch(`${API_BASE}/tokens`, { headers: headers() });
            const data = await res.json();
            if (res.ok) tokens.value = data.tokens;
        } finally {
            loading.value = false;
        }
    }

    async function createToken(name: string) {
        const res = await fetch(`${API_BASE}/tokens`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (res.ok) {
            lastCreatedToken.value = data.token.token;
            await fetchTokens();
            return data.token;
        }
        throw new Error(data.error);
    }

    async function revokeToken(id: number) {
        await fetch(`${API_BASE}/tokens/${id}`, {
            method: "DELETE",
            headers: headers(),
        });
        await fetchTokens();
    }

    // ─── Tunnels ───────────────────────────────
    async function fetchTunnels() {
        loading.value = true;
        try {
            const res = await fetch(`${API_BASE}/tunnels`, { headers: headers() });
            const data = await res.json();
            if (res.ok) tunnels.value = data.tunnels;
        } finally {
            loading.value = false;
        }
    }

    async function disconnectTunnel(id: number) {
        await fetch(`${API_BASE}/tunnels/${id}`, {
            method: "DELETE",
            headers: headers(),
        });
        await fetchTunnels();
    }

    // ─── Domains ───────────────────────────────
    async function fetchDomains() {
        loading.value = true;
        try {
            const res = await fetch(`${API_BASE}/domains`, { headers: headers() });
            const data = await res.json();
            if (res.ok) domains.value = data.domains;
        } finally {
            loading.value = false;
        }
    }

    async function addDomain(domain: string) {
        const res = await fetch(`${API_BASE}/domains`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ domain }),
        });
        const data = await res.json();
        if (res.ok) {
            await fetchDomains();
            return data;
        }
        throw new Error(data.error);
    }

    async function deleteDomain(id: number) {
        await fetch(`${API_BASE}/domains/${id}`, {
            method: "DELETE",
            headers: headers(),
        });
        await fetchDomains();
    }

    async function verifyDomain(id: number) {
        const res = await fetch(`${API_BASE}/domains/${id}/verify`, {
            method: "POST",
            headers: headers(),
        });
        const data = await res.json();
        if (res.ok) {
            await fetchDomains();
            return data;
        }
        throw new Error(data.error);
    }

    // ─── Stats ─────────────────────────────────
    async function fetchStats() {
        try {
            const res = await fetch(`${API_BASE}/stats`, { headers: headers() });
            const data = await res.json();
            if (res.ok) stats.value = data.stats;
        } catch {
            // ignore
        }
    }

    return {
        tokens,
        tunnels,
        domains,
        stats,
        loading,
        lastCreatedToken,
        fetchTokens,
        createToken,
        revokeToken,
        fetchTunnels,
        disconnectTunnel,
        fetchDomains,
        addDomain,
        deleteDomain,
        verifyDomain,
        fetchStats,
    };
});
