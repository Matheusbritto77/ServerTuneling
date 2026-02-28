<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-logo">
        <h1>🚇 Tunnel</h1>
        <p>Crie sua conta para começar</p>
      </div>

      <div v-if="auth.error" class="alert alert-error">
        ⚠️ {{ auth.error }}
      </div>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label class="form-label">Nome</label>
          <input
            v-model="name"
            type="text"
            class="form-input"
            placeholder="Seu nome"
            required
          />
        </div>

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
            placeholder="Mínimo 8 caracteres"
            required
            minlength="8"
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Confirmar Senha</label>
          <input
            v-model="confirmPassword"
            type="password"
            class="form-input"
            placeholder="Repita a senha"
            required
            autocomplete="new-password"
          />
          <p v-if="passwordMismatch" class="form-error">As senhas não coincidem</p>
        </div>

        <button
          type="submit"
          class="btn btn-primary"
          :disabled="auth.loading || passwordMismatch"
          style="width: 100%; justify-content: center; margin-top: 8px"
        >
          {{ auth.loading ? "Criando conta..." : "Criar Conta" }}
        </button>
      </form>

      <div class="auth-footer">
        Já tem conta? <router-link to="/login">Fazer login</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");

const passwordMismatch = computed(() => {
  return confirmPassword.value.length > 0 && password.value !== confirmPassword.value;
});

async function handleRegister() {
  if (password.value !== confirmPassword.value) return;
  const success = await auth.register(email.value, password.value, name.value);
  if (success) router.push("/");
}
</script>
