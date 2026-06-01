// Per-user namespace for browser-local learn state.

const AUTH_STORAGE_KEY = 'digital_academy_auth';

export function currentUserScope(): string {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const id = parsed?.user?.id;
      if (id) return String(id);
    }
  } catch {
    /* ignore malformed auth state */
  }
  return 'anon';
}
