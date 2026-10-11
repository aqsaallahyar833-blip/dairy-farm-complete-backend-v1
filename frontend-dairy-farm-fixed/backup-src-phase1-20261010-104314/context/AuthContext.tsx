import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  authApi,
  clearToken,
  isAuthenticated,
  setUnauthorizedHandler,
  type AuthenticatedUser,
} from '../services/api/apiClient';

/**
 * Authentication and farm context for the whole application.
 *
 * DESIGN RULES (deliberate):
 *  - The identity ALWAYS comes from GET /api/auth/me. The login response is
 *    never trusted on its own; it only proves the credentials were accepted.
 *  - There is NO default/fake user. Until /api/auth/me succeeds, `user` is
 *    null and the shell shows the sign-in screen. The Dashboard is never
 *    rendered before that resolves.
 *  - `farmId` comes from the authenticated identity. It is NEVER hardcoded.
 *  - Storage is delegated entirely to the existing API client (in-memory plus
 *    sessionStorage). This context stores no credentials itself.
 */
export interface AuthContextValue {
  user: AuthenticatedUser | null;
  /** True while the initial /api/auth/me probe is in flight. */
  loading: boolean;
  isAuthenticated: boolean;
  /** Farm scope for every farm-scoped request. Null until authenticated. */
  farmId: number | null;
  /** Farm display name from the server, or null when not signed in. */
  farmName: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  /** Generic, non-enumerating message for a rejected sign-in. */
  loginError: string | null;
  clearLoginError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Never reveal whether the account exists, matching the server's own policy. */
const GENERIC_LOGIN_FAILURE = 'Invalid username or password.';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Guards against a duplicate sign-out when a 401 handler and an explicit
  // logout race each other, and against setting state after unmount.
  const clearingRef = useRef(false);

  const applySignedOut = useCallback(() => {
    if (clearingRef.current) return;
    clearingRef.current = true;
    clearToken();
    setUser(null);
    setLoginError(null);
    // Released on a microtask so a later 401 can still clear state again.
    Promise.resolve().then(() => {
      clearingRef.current = false;
    });
  }, []);

  const confirmIdentity = useCallback(async (): Promise<AuthenticatedUser | null> => {
    const me = await authApi.me();
    if (!me.success || !me.data) {
      applySignedOut();
      return null;
    }
    clearingRef.current = false;
    setUser(me.data);
    return me.data;
  }, [applySignedOut]);

  // Startup: if the API client already holds a token (page refresh), confirm it
  // with /api/auth/me before showing the application.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isAuthenticated()) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      const me = await authApi.me();
      if (cancelled) return;
      if (me.success && me.data) {
        setUser(me.data);
      } else {
        clearToken();
        setUser(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Any 401 from any request anywhere in the app drops us back to sign-in.
  // The API client already cleared the token before calling this.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      applySignedOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [applySignedOut]);

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      setLoginError(null);
      const result = await authApi.login(username.trim(), password);

      if (!result.success || !result.data) {
        // Stay on the login screen. No user, no farm, no mock data.
        setUser(null);
        setLoginError(GENERIC_LOGIN_FAILURE);
        return false;
      }

      // The login response only proves the credentials were accepted. The
      // identity is confirmed against /api/auth/me, which is the single
      // source of truth for `user` and `farmId`.
      const identity = await confirmIdentity();
      if (!identity) {
        setLoginError(GENERIC_LOGIN_FAILURE);
        return false;
      }
      return true;
    },
    [confirmIdentity]
  );

  const logout = useCallback(() => {
    authApi.logout();
    applySignedOut();
  }, [applySignedOut]);

  const clearLoginError = useCallback(() => setLoginError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      farmId: user?.farmId ?? null,
      farmName: user?.farmName ?? null,
      login,
      logout,
      loginError,
      clearLoginError,
    }),
    [user, loading, login, logout, loginError, clearLoginError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }
  return ctx;
}