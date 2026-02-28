<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <h1>
          <span>🚇</span>
          <span>Tunnel</span>
        </h1>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="sidebar-link"
          :class="{ active: isActive(item.to) }"
        >
          <span class="icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">
            {{ auth.user?.name?.charAt(0)?.toUpperCase() || "?" }}
          </div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">{{ auth.user?.name || "..." }}</div>
            <div class="sidebar-user-email">{{ auth.user?.email || "..." }}</div>
          </div>
        </div>
        <button class="logout-btn" style="margin-top: 12px" @click="handleLogout">
          🚪 Sair
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const navItems = [
  { to: "/", icon: "📊", label: "Dashboard" },
  { to: "/sites", icon: "📡", label: "Sites" },
  { to: "/tokens", icon: "🔑", label: "Tokens" },
  { to: "/domains", icon: "🌐", label: "Domínios" },
];

function isActive(path: string) {
  return route.path === path;
}

function handleLogout() {
  auth.logout();
  router.push("/login");
}
</script>
