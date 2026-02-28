<template>
  <AppLayout>
    <div class="page-header">
      <h2>Tokens</h2>
      <p>Gerencie seus tokens de autenticação para o app Swift</p>
    </div>

    <!-- Create Token -->
    <div class="card" style="margin-bottom: 24px">
      <div class="card-header">
        <h3 class="card-title">Gerar Novo Token</h3>
      </div>
      <form @submit.prevent="handleCreate" style="display: flex; gap: 12px; align-items: flex-end">
        <div class="form-group" style="flex: 1; margin-bottom: 0">
          <label class="form-label">Nome do Token</label>
          <input
            v-model="tokenName"
            type="text"
            class="form-input"
            placeholder="ex: MacBook Pro, Trabalho, etc"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary">🔑 Gerar</button>
      </form>

      <!-- Show newly created token -->
      <div v-if="store.lastCreatedToken" class="alert alert-success" style="margin-top: 16px">
        <div style="flex: 1">
          <strong>Token criado com sucesso!</strong>
          <p style="font-size: 0.8rem; margin-top: 4px; color: var(--text-secondary)">
            Copie agora — este token não será mostrado novamente.
          </p>
          <div class="token-display" style="margin-top: 8px">
            <span style="flex: 1; word-break: break-all">{{ store.lastCreatedToken }}</span>
            <button @click="copyToken(store.lastCreatedToken!)" class="copy-btn" title="Copiar">
              {{ copied ? "✅" : "📋" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tokens Table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Seus Tokens</h3>
      </div>

      <div v-if="store.tokens.length === 0" class="empty-state" style="padding: 30px">
        <div class="icon">🔑</div>
        <h3>Nenhum token criado</h3>
        <p>Crie um token acima para conectar o app Swift</p>
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Token</th>
            <th>Último Uso</th>
            <th>Criado em</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="token in store.tokens" :key="token.id">
            <td style="font-weight: 600">{{ token.name }}</td>
            <td>
              <code style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-accent)">
                {{ token.tokenPreview }}
              </code>
            </td>
            <td style="color: var(--text-secondary); font-size: 0.85rem">
              {{ token.lastUsedAt ? formatDate(token.lastUsedAt) : "Nunca" }}
            </td>
            <td style="color: var(--text-secondary); font-size: 0.85rem">
              {{ formatDate(token.createdAt) }}
            </td>
            <td>
              <span
                class="badge"
                :class="token.revokedAt ? 'badge-danger' : 'badge-active'"
              >
                {{ token.revokedAt ? "Revogado" : "Ativo" }}
              </span>
            </td>
            <td>
              <button
                v-if="!token.revokedAt"
                @click="handleRevoke(token.id)"
                class="btn btn-danger btn-sm"
              >
                Revogar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useTunnelStore } from "../stores/tunnels";
import AppLayout from "../components/AppLayout.vue";

const store = useTunnelStore();
const tokenName = ref("");
const copied = ref(false);

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function handleCreate() {
  if (!tokenName.value) return;
  try {
    await store.createToken(tokenName.value);
    tokenName.value = "";
  } catch (e: any) {
    alert(e.message);
  }
}

async function handleRevoke(id: number) {
  if (confirm("Tem certeza que deseja revogar este token? Todos os túneis usando ele serão desconectados.")) {
    await store.revokeToken(id);
  }
}

async function copyToken(token: string) {
  try {
    await navigator.clipboard.writeText(token);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    // Fallback
    const el = document.createElement("textarea");
    el.value = token;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  }
}

onMounted(() => store.fetchTokens());
</script>
