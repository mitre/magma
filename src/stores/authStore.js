import { defineStore } from "pinia";
import router from "../router";

export const useAuthStore = defineStore({
  id: "auth",
  state: () => ({
    isUserAuthenticated: false,
    returnUrl: null,
  }),
  actions: {
    async login(username, password, $api) {
      try {
        const fd = new FormData();
        fd.append("username", username.value);
        fd.append("password", password.value);
        await $api.post("/enter", fd);

        this.isUserAuthenticated = true;
        router.push({ name: this.returnUrl || "home" });
      } catch (error) {
        if (error.response.status == 401) {
          throw "Incorrect username or password";
        }
        console.log(error);
        throw "The server encountered an error";
      }
    },
    async getAuthStatus($api) {
      try {
        await $api.head("/api/v2/config/main");
        return true;
      } catch (error) {
        return false;
      }
    },
    async logout($api) {
      try {
        await $api.post("/logout");
        this.isUserAuthenticated = false;
        router.push({ name: "login" });
      } catch (error) {
        console.log(error);
      }
    },
  },
});
