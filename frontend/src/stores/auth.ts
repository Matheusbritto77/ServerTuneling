import { defineStore } from "pinia";
import { ref, computed } from "vue";

const API_BASE = "/api";

interface User {
    id: number;
    email: string;
    name: string;
}

export const useAuthStore = defineStore("auth", () => {
    const token = ref<string | null>(localStorage.getItem("tunnel_token"));
    const user = ref<User | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const isAuthenticated = computed(() => !!token.value);

    function setAuth(jwt: string, userData: User) {
        token.value = jwt;
        user.value = userData;
        localStorage.setItem("tunnel_token", jwt);
        error.value = null;
    }

    function clearAuth() {
        token.value = null;
        user.value = null;
        localStorage.removeItem("tunnel_token");
    }

    async function login(email: string, password: string) {
        loading.value = true;
        error.value = null;
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Login failed");
            setAuth(data.token, data.user);
            return true;
        } catch (e: any) {
            error.value = e.message;
            return false;
        } finally {
            loading.value = false;
        }
    }

    async function register(email: string, password: string, name: string) {
        loading.value = true;
        error.value = null;
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Registration failed");
            setAuth(data.token, data.user);
            return true;
        } catch (e: any) {
            error.value = e.message;
            return false;
        } finally {
            loading.value = false;
        }
    }

    async function fetchUser() {
        if (!token.value) return;
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${token.value}` },
            });
            if (!res.ok) {
                clearAuth();
                return;
            }
            const data = await res.json();
            user.value = data.user;
        } catch {
            clearAuth();
        }
    }

    function logout() {
        clearAuth();
    }

    // Helper for authenticated requests
    function authHeaders(): Record<string, string> {
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.value}`,
        };
    }

    return {
        token,
        user,
        loading,
        error,
        isAuthenticated,
        login,
        register,
        fetchUser,
        logout,
        authHeaders,
    };
});
