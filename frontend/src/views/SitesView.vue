<template>
  <AppLayout>
    <div class="page-header">
      <h2>Sites</h2>
      <p>Gerencie seus túneis e aplicações expostas</p>
    </div>

    <div v-if="store.loading" class="empty-state">
      <p>Carregando...</p>
    </div>

    <div v-else-if="store.tunnels.length === 0" class="empty-state">
      <div class="icon">📡</div>
      <h3>Nenhum site exposto</h3>
      <p>
        Conecte o app Swift com um Auth Token para começar a expor suas
        aplicações locais para a internet.
      </p>
      <router-link to="/tokens" class="btn btn-primary" style="margin-top: 8px">
        🔑 Gerar Token
      </router-link>
    </div>

    <div v-else class="tunnels-grid">
      <div
        v-for="tunnel in store.tunnels"
        :key="tunnel.id"
        class="tunnel-card"
        :class="{ connected: tunnel.status === 'connected' }"
      >
        <div class="tunnel-card-header">
          <span class="tunnel-card-domain">
            {{ tunnel.subdomain }}.tunnel.dev
          </span>
          <span
            class="badge"
            :class="tunnel.status === 'connected' ? 'badge-active' : 'badge-inactive'"
          >
            <span
              class="status-dot"
              :class="tunnel.status === 'connected' ? 'active' : 'inactive'"
            ></span>
            {{ tunnel.status === "connected" ? "Ativo" : "Desconectado" }}
          </span>
        </div>

        <div class="tunnel-card-info">
          <div class="tunnel-info-item">
            <span class="tunnel-info-label">Porta Local</span>
            <span class="tunnel-info-value">localhost:{{ tunnel.localPort }}</span>
          </div>
          <div class="tunnel-info-item">
            <span class="tunnel-info-label">Token</span>
            <span class="tunnel-info-value">{{ tunnel.tokenName || "N/A" }}</span>
          </div>
          <div class="tunnel-info-item">
            <span class="tunnel-info-label">Conectado em</span>
            <span class="tunnel-info-value">{{ formatDate(tunnel.connectedAt) }}</span>
          </div>
          <div v-if="tunnel.customDomain" class="tunnel-info-item">
            <span class="tunnel-info-label">Domínio Custom</span>
            <span class="tunnel-info-value">{{ tunnel.customDomain }}</span>
          </div>
        </div>

        <div style="margin-top: 16px; display: flex; gap: 8px">
          <a
            v-if="tunnel.status === 'connected'"
            :href="`http://${tunnel.subdomain}.tunnel.dev`"
            target="_blank"
            class="btn btn-secondary btn-sm"
          >
            🔗 Abrir
          </a>
          <button
            v-if="tunnel.status === 'connected'"
            @click="handleDisconnect(tunnel.id)"
            class="btn btn-danger btn-sm"
          >
            ✕ Desconectar
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useTunnelStore } from "../stores/tunnels";
import AppLayout from "../components/AppLayout.vue";

const store = useTunnelStore();

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function handleDisconnect(id: number) {
  if (confirm("Deseja desconectar este túnel?")) {
    await store.disconnectTunnel(id);
  }
}

onMounted(() => store.fetchTunnels());
</script>
