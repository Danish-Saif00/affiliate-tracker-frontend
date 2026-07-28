import { type FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { BrandMark } from '../../components/brand/brand-mark';
import { MaterialIcon } from '../../components/icons/material-icon';
import { useAuth } from '../../features/auth/use-auth';
import { useApiHealth } from '../../features/system/use-api-health';

type LoginLocationState = {
  from?: unknown;
  authError?: unknown;
};

function readLoginLocationState(value: unknown): LoginLocationState {
  return typeof value === 'object' && value !== null ? (value as LoginLocationState) : {};
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const health = useApiHealth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationState = readLoginLocationState(location.state);
  const requestedPath =
    typeof locationState.from === 'string' && locationState.from.startsWith('/')
      ? locationState.from
      : '/dashboard';
  const routeError =
    typeof locationState.authError === 'string' ? locationState.authError : null;
  const displayedError = error ?? routeError ?? auth.error;

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const root = document.documentElement;
      root.style.setProperty('--pointer-x', `${(event.clientX / window.innerWidth) * 24}px`);
      root.style.setProperty('--pointer-y', `${(event.clientY / window.innerHeight) * 24}px`);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Enter both your email address and password.');
      return;
    }

    setSubmitting(true);

    try {
      await auth.signIn({
        email,
        password,
        rememberSession: rememberMe,
      });
      navigate(requestedPath, { replace: true });
    } catch (signInError: unknown) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : 'Sign in failed. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-orb login-orb--violet" />
      <div className="login-orb login-orb--orange" />

      <section className="login-card glass-panel specular-panel" aria-labelledby="login-title">
        <h1 className="sr-only" id="login-title">Sign in to Publisher Tracker</h1>
        <div className="login-card__brand">
          <BrandMark />
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email Address</label>
            <div className="glass-input">
              <MaterialIcon name="mail" />
              <input
                autoComplete="email"
                id="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                required
                type="email"
                value={email}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <div className="glass-input">
              <MaterialIcon name="lock" />
              <input
                autoComplete="current-password"
                id="password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                type="password"
                value={password}
              />
            </div>
          </div>

          <div className="login-options">
            <label className="glass-checkbox">
              <input
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                type="checkbox"
              />
              <span className="glass-checkbox__control">
                <MaterialIcon name="check" />
              </span>
              <span>Remember me</span>
            </label>

            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          {displayedError !== null && (
            <div className="form-error" role="alert">
              <MaterialIcon name="error" />
              <span>{displayedError}</span>
            </div>
          )}

          <button className="primary-gradient-button" disabled={submitting} type="submit">
            {submitting ? <MaterialIcon className="spin" name="progress_activity" /> : 'Sign In'}
          </button>
        </form>

        <p className="login-card__access">
          Don&apos;t have an account? <a href="mailto:admin@publisher-tracker.local">Request Access</a>
        </p>
      </section>

      <div className="login-system-status" aria-live="polite">
        <span className={`status-dot ${health.isSuccess ? 'status-dot--live' : 'status-dot--offline'}`} />
        <span>{health.isLoading ? 'Checking System' : health.isSuccess ? 'System Nominal' : 'API Offline'}</span>
        <span className="login-system-status__divider" />
        <span>Secure Login</span>
      </div>
    </main>
  );
}
