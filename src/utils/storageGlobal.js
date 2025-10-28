// utils/storageGlobal.js — LocalStorageService reutilizável
export const LocalStorageService = {
  getItem(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("LocalStorageService.getItem error", e);
      return [];
    }
  },
  saveItem(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("LocalStorageService.saveItem error", e);
      return false;
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error("LocalStorageService.removeItem error", e);
      return false;
    }
  },
};