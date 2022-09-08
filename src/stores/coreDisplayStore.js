import { defineStore } from "pinia";

export const useCoreDisplayStore = defineStore("coreDisplayStore", {
  state: () => {
    return {
      openTabs: [],
      activeTab: "",
    };
  },

  actions: {
    addTab(name, path) {
      const newTab = {
        name: name,
        path: path,
      };
      if (!name || name === "login") {
        return;
      }
      if (
        this.openTabs.map((tab) => tab.name).indexOf(name) === -1 &&
        name !== "home"
      ) {
        this.openTabs.push(newTab);
      }
      this.activeTab = name;
    },
    removeTab(index) {
      this.openTabs.splice(index, 1);
      if (this.openTabs.length === 0) {
        this.activeTab = "";
      }
    },
    removeAllTabs() {
      this.openTabs = [];
      this.activeTab = "";
    },
  },
});
