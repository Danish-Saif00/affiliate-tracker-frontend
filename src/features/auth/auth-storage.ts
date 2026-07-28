const REMEMBER_SESSION_KEY = 'publisher-tracker:remember-session';

function shouldRememberSession(): boolean {
  return window.localStorage.getItem(REMEMBER_SESSION_KEY) === 'true';
}

function getPrimaryStorage(): Storage {
  return shouldRememberSession() ? window.localStorage : window.sessionStorage;
}

function getSecondaryStorage(): Storage {
  return shouldRememberSession() ? window.sessionStorage : window.localStorage;
}

export function setRememberSession(remember: boolean): void {
  if (remember) {
    window.localStorage.setItem(REMEMBER_SESSION_KEY, 'true');
    return;
  }

  window.localStorage.removeItem(REMEMBER_SESSION_KEY);
}

export function clearRememberSession(): void {
  window.localStorage.removeItem(REMEMBER_SESSION_KEY);
}

export const browserAuthStorage = {
  getItem(key: string): string | null {
    return getPrimaryStorage().getItem(key) ?? getSecondaryStorage().getItem(key);
  },

  setItem(key: string, value: string): void {
    getPrimaryStorage().setItem(key, value);
    getSecondaryStorage().removeItem(key);
  },

  removeItem(key: string): void {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};
