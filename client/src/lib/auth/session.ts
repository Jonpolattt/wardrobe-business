import { useAuthStore, type SessionUser } from '../store/auth-store';

export const USER_FIELDS = 'id email firstName lastName phone photoUrl';

interface AuthPayload {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<boolean> | null = null;

/** Stores the session and schedules a silent refresh one minute before the access token expires. */
export function applySession(payload: AuthPayload) {
  useAuthStore.getState().setSession(payload.accessToken, payload.user);
  if (refreshTimer) clearTimeout(refreshTimer);
  const delay = Math.max((payload.expiresIn - 60) * 1000, 10_000);
  refreshTimer = setTimeout(() => void refreshAccessToken(), delay);
}

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<{ data?: T; errors?: { message: string }[] }> {
  const res = await fetch('/graphql', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

/** Runs `fn` while holding a lock shared by all tabs of this site (Web Locks API), when available. */
function withTabLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('wardrobe-refresh-session', fn) as Promise<T>;
  }
  return fn();
}

/**
 * Exchanges the HttpOnly refresh cookie for a new access token (the server
 * rotates the cookie). Concurrent callers share one request, and tabs refresh
 * one after another so that each of them sends the latest cookie.
 */
export function refreshAccessToken(): Promise<boolean> {
  inFlight ??= (async () => {
    try {
      const query = `mutation RefreshSession { refreshSession { accessToken expiresIn user { ${USER_FIELDS} } } }`;
      let body = await withTabLock(() => graphql<{ refreshSession: AuthPayload }>(query));
      if (!body.data?.refreshSession && body.errors?.[0]?.message === 'SESSION_REVOKED') {
        // Another tab may have rotated the cookie at the same moment: retry once with the current cookie.
        await new Promise((resolve) => setTimeout(resolve, 300));
        body = await withTabLock(() => graphql<{ refreshSession: AuthPayload }>(query));
      }
      if (!body.data?.refreshSession) {
        clearLocalSession();
        return false;
      }
      applySession(body.data.refreshSession);
      return true;
    } catch {
      clearLocalSession();
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export async function signIn(email: string, password: string) {
  const body = await graphql<{ login: AuthPayload }>(
    `mutation Login($input: LoginInput!) { login(input: $input) { accessToken expiresIn user { ${USER_FIELDS} } } }`,
    { input: { email, password } },
  );
  if (!body.data?.login) throw new Error(body.errors?.[0]?.message ?? 'LOGIN_FAILED');
  applySession(body.data.login);
  return body.data.login.user;
}

export async function signOut() {
  try {
    await graphql<{ logout: boolean }>('mutation Logout { logout }');
  } finally {
    clearLocalSession();
  }
}

export function clearLocalSession() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  useAuthStore.getState().clear();
}
