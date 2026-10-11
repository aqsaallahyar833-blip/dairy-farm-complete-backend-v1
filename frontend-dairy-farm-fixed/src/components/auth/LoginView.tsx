import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Sign-in screen.
 *
 * This is the ONLY screen rendered before the application shell. It never shows
 * a Dashboard, never seeds a placeholder user, and never falls back to demo
 * data when the backend is unreachable.
 *
 * Credentials are sent to the real POST /api/auth/login through the existing
 * API client. Nothing about them is stored here, and no credential is
 * hard-coded or displayed.
 */
export function LoginView() {
  const { login, loginError, clearLoginError, loading } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // A queued error means focus belongs back on the first field.
  useEffect(() => {
    if (loginError) usernameRef.current?.focus();
  }, [loginError]);

  const visibleError = localError ?? loginError;
  const busy = submitting || loading;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    // Client-side guard only; the server is the real authority and its
    // response is surfaced verbatim.
    if (!username.trim() || !password) {
      setLocalError('Enter your username and password.');
      (username.trim() ? passwordRef : usernameRef).current?.focus();
      return;
    }

    setLocalError(null);
    clearLoginError();
    setSubmitting(true);

    try {
      const ok = await login(username, password);
      if (ok) {
        // The context now holds a server-confirmed identity, so the shell
        // takes over. Clear the plaintext immediately.
        setPassword('');
      } else {
        setPassword('');
        passwordRef.current?.focus();
      }
    } catch {
      // Network-level failure. Still no fake session.
      setLocalError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-emerald-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold">
            D
          </div>
          <h1 className="text-2xl font-semibold text-emerald-950">Dairy Farm Manager</h1>
          <p className="mt-1 text-sm text-emerald-800">Sign in to continue</p>
        </div>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-4">
            <label htmlFor="login-username" className="block text-sm font-medium text-emerald-950 mb-1">
              Username or email
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              ref={usernameRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
              className="w-full rounded-md border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-emerald-50"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="login-password" className="block text-sm font-medium text-emerald-950 mb-1">
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              ref={passwordRef}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className="w-full rounded-md border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-emerald-50"
            />
          </div>

          {visibleError && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {visibleError}
            </div>
          )}

          <button
            id="login-submit"
            name="loginSubmit"
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-emerald-700">
          Access is restricted to authorised farm staff.
        </p>
      </div>
    </div>
  );
}

export default LoginView;