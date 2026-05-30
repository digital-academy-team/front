// Per-user namespace for browser-local learn state (progress, video position,
// exercise code, quiz best-scores). Without this, two accounts used in the same
// browser share localStorage keys and their progress bleeds together.
//
// Reads the current user id from the persisted auth state (same key AuthContext
// writes). Falls back to "anon" when logged out.

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
