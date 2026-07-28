import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { BrandMark } from '../../components/brand/brand-mark';
import { MaterialIcon } from '../../components/icons/material-icon';
import { AuthLoadingScreen } from '../../features/auth/auth-loading-screen';
import { useAuth } from '../../features/auth/use-auth';

export function UpdatePasswordPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status === 'loading') {
    return <AuthLoadingScreen />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Use a password containing at least 8 characters.');
      return;
    }

    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await auth.updatePassword(password);
      navigate('/dashboard', { replace: true });
    } catch (updateError: unknown) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'The password could not be updated.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-orb login-orb--violet" />
      <div className="login-orb login-orb--orange" />

      <section className="login-card glass-panel specular-panel" aria-labelledby="update-password-title">
        <div className="login-card__brand">
          <BrandMark />
        </div>

        <div className="auth-copy">
          <h1 id="update-password-title">Create a new password</h1>
          <p>Choose a secure password for your Publisher Tracker account.</p>
        </div>

        {auth.session === null ? (
          <div className="auth-success auth-success--warning" role="alert">
            <MaterialIcon name="link_off" />
            <strong>Recovery session unavailable</strong>
            <span>Open the latest recovery link from your email, or request a new one.</span>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="new-password">New Password</label>
              <div className="glass-input">
                <MaterialIcon name="lock_reset" />
                <input
                  autoComplete="new-password"
                  id="new-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="confirm-password">Confirm Password</label>
              <div className="glass-input">
                <MaterialIcon name="verified_user" />
                <input
                  autoComplete="new-password"
                  id="confirm-password"
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                  type="password"
                  value={confirmation}
                />
              </div>
            </div>

            {error !== null && (
              <div className="form-error" role="alert">
                <MaterialIcon name="error" />
                <span>{error}</span>
              </div>
            )}

            <button className="primary-gradient-button" disabled={submitting} type="submit">
              {submitting ? <MaterialIcon className="spin" name="progress_activity" /> : 'Update Password'}
            </button>
          </form>
        )}

        <Link className="back-to-login" to="/login">
          <MaterialIcon name="arrow_back" />
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
