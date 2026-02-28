<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-logo">
        <h1>🚇 Tunnel</h1>
        <p>Faça login para gerenciar seus túneis</p>
      </div>

      <div v-if="auth.error" class="alert alert-error">
        ⚠️ {{ auth.error }}
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input
            v-model="email"
            type="email"
            class="form-input"
            placeholder="seu@email.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Senha</label>
          <input
            v-model="password"
            type="password"
            class="form-input"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary"
          :disabled="auth.loading"
          style="width: 100%; justify-content: center; margin-top: 8px"
        >
          {{ auth.loading ? "Entrando..." : "Entrar" }}
        </button>
      </form>

      <div class="auth-footer">
        Não tem conta? <router-link to="/register">Criar conta</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const email = ref("");
const password = ref("");

async function handleLogin() {
  const success = await auth.login(email.value, password.value);
  if (success) router.push("/");
}
</script>
