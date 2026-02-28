<template>
  <AppLayout>
    <div class="page-header">
      <h2>Dashboard</h2>
      <p>Visão geral dos seus túneis e tokens</p>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🚇</div>
        <div class="stat-value">{{ store.stats.activeTunnels }}</div>
        <div class="stat-label">Túneis Ativos</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-value">{{ store.stats.totalTunnels }}</div>
        <div class="stat-label">Total de Túneis</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔑</div>
        <div class="stat-value">{{ store.stats.activeTokens }}</div>
        <div class="stat-label">Tokens Ativos</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🌐</div>
        <div class="stat-value">{{ domains.length }}</div>
        <div class="stat-label">Domínios</div>
      </div>
    </div>

    <!-- Active Tunnels -->
    <div class="card" style="margin-bottom: 24px">
      <div class="card-header">
        <h3 class="card-title">🟢 Túneis Ativos</h3>
        <router-link to="/sites" class="btn btn-secondary btn-sm">Ver todos</router-link>
      </div>

      <div v-if="activeTunnels.length === 0" class="empty-state" style="padding: 30px">
        <p style="color: var(--text-tertiary)">Nenhum túnel ativo no momento</p>
      </div>

      <div v-else class="tunnels-grid">
        <div
          v-for="tunnel in activeTunnels"
          :key="tunnel.id"
          class="tunnel-card connected"
        >
          <div class="tunnel-card-header">
            <span class="tunnel-card-domain">{{ tunnel.subdomain }}.tunnel.dev</span>
            <span class="badge badge-active">
              <span class="status-dot active"></span>
              Ativo
            </span>
          </div>
          <div class="tunnel-card-info">
            <div class="tunnel-info-item">
              <span class="tunnel-info-label">Porta Local</span>
              <span class="tunnel-info-value">:{{ tunnel.localPort }}</span>
            </div>
            <div class="tunnel-info-item">
              <span class="tunnel-info-label">Token</span>
              <span class="tunnel-info-value">{{ tunnel.tokenName || 'N/A' }}</span>
            </div>
            <div class="tunnel-info-item">
              <span class="tunnel-info-label">Conectado em</span>
              <span class="tunnel-info-value">{{ formatDate(tunnel.connectedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">⚡ Ações Rápidas</h3>
      </div>
      <div style="display: flex; gap: 12px; flex-wrap: wrap">
        <router-link to="/tokens" class="btn btn-primary">
          🔑 Gerar Token
        </router-link>
        <router-link to="/domains" class="btn btn-secondary">
          🌐 Adicionar Domínio
        </router-link>
        <router-link to="/sites" class="btn btn-secondary">
          📡 Ver Sites
        </router-link>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useTunnelStore } from "../stores/tunnels";
import AppLayout from "../components/AppLayout.vue";

const store = useTunnelStore();

const activeTunnels = computed(() =>
  store.tunnels.filter((t) => t.status === "connected")
);

const domains = computed(() => store.domains);

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

onMounted(async () => {
  await Promise.all([
    store.fetchStats(),
    store.fetchTunnels(),
    store.fetchDomains(),
  ]);
});
</script>
