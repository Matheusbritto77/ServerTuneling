<template>
  <AppLayout>
    <div class="page-header">
      <h2>Domínios</h2>
      <p>Gerencie domínios customizados com SSL para seus túneis</p>
    </div>

    <!-- Add Domain -->
    <div class="card" style="margin-bottom: 24px">
      <div class="card-header">
        <h3 class="card-title">Adicionar Domínio</h3>
      </div>
      <form @submit.prevent="handleAdd" style="display: flex; gap: 12px; align-items: flex-end">
        <div class="form-group" style="flex: 1; margin-bottom: 0">
          <label class="form-label">Domínio</label>
          <input
            v-model="domainName"
            type="text"
            class="form-input"
            placeholder="app.seudominio.com"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary">🌐 Adicionar</button>
      </form>

      <!-- Verification Instructions -->
      <div v-if="verifyInstructions" class="alert alert-success" style="margin-top: 16px">
        <div style="flex: 1">
          <strong>Domínio adicionado!</strong>
          <p style="font-size: 0.85rem; margin-top: 4px; color: var(--text-secondary)">
            Adicione o seguinte registro TXT ao DNS do seu domínio:
          </p>
          <div class="token-display" style="margin-top: 8px; flex-direction: column; align-items: flex-start; gap: 4px">
            <div><strong>Tipo:</strong> TXT</div>
            <div><strong>Nome:</strong> {{ verifyInstructions.record.name }}</div>
            <div><strong>Valor:</strong> {{ verifyInstructions.record.value }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Domains Table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Seus Domínios</h3>
      </div>

      <div v-if="store.domains.length === 0" class="empty-state" style="padding: 30px">
        <div class="icon">🌐</div>
        <h3>Nenhum domínio configurado</h3>
        <p>Adicione um domínio customizado para seus túneis acima</p>
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Domínio</th>
            <th>Verificado</th>
            <th>SSL</th>
            <th>Criado em</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="domain in store.domains" :key="domain.id">
            <td>
              <span style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600; color: var(--text-accent)">
                {{ domain.domain }}
              </span>
            </td>
            <td>
              <span
                class="badge"
                :class="domain.verified ? 'badge-active' : 'badge-warning'"
              >
                {{ domain.verified ? "✓ Verificado" : "⏳ Pendente" }}
              </span>
            </td>
            <td>
              <span
                class="badge"
                :class="{
                  'badge-active': domain.sslStatus === 'active',
                  'badge-warning': domain.sslStatus === 'pending',
                  'badge-danger': domain.sslStatus === 'error',
                }"
              >
                {{
                  domain.sslStatus === "active"
                    ? "🔒 Ativo"
                    : domain.sslStatus === "pending"
                    ? "⏳ Pendente"
                    : "❌ Erro"
                }}
              </span>
            </td>
            <td style="color: var(--text-secondary); font-size: 0.85rem">
              {{ formatDate(domain.createdAt) }}
            </td>
            <td>
              <div style="display: flex; gap: 8px">
                <button
                  v-if="!domain.verified"
                  @click="handleVerify(domain.id)"
                  class="btn btn-secondary btn-sm"
                >
                  🔍 Verificar
                </button>
                <button
                  @click="handleDelete(domain.id)"
                  class="btn btn-danger btn-sm"
                >
                  🗑
                </button>
              </div>
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
const domainName = ref("");
const verifyInstructions = ref<any>(null);

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function handleAdd() {
  if (!domainName.value) return;
  try {
    const result = await store.addDomain(domainName.value);
    verifyInstructions.value = result.instructions;
    domainName.value = "";
  } catch (e: any) {
    alert(e.message);
  }
}

async function handleVerify(id: number) {
  try {
    await store.verifyDomain(id);
    alert("Domínio verificado!");
  } catch (e: any) {
    alert(e.message);
  }
}

async function handleDelete(id: number) {
  if (confirm("Tem certeza que deseja remover este domínio?")) {
    await store.deleteDomain(id);
  }
}

onMounted(() => store.fetchDomains());
</script>
