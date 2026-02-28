import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/login",
            name: "login",
            component: () => import("../views/LoginView.vue"),
            meta: { guest: true },
        },
        {
            path: "/register",
            name: "register",
            component: () => import("../views/RegisterView.vue"),
            meta: { guest: true },
        },
        {
            path: "/",
            name: "dashboard",
            component: () => import("../views/DashboardView.vue"),
            meta: { auth: true },
        },
        {
            path: "/sites",
            name: "sites",
            component: () => import("../views/SitesView.vue"),
            meta: { auth: true },
        },
        {
            path: "/tokens",
            name: "tokens",
            component: () => import("../views/TokensView.vue"),
            meta: { auth: true },
        },
        {
            path: "/domains",
            name: "domains",
            component: () => import("../views/DomainsView.vue"),
            meta: { auth: true },
        },
    ],
});

router.beforeEach((to, _from, next) => {
    const auth = useAuthStore();

    if (to.meta.auth && !auth.isAuthenticated) {
        next({ name: "login" });
    } else if (to.meta.guest && auth.isAuthenticated) {
        next({ name: "dashboard" });
    } else {
        next();
    }
});

export { router };
