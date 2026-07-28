import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';

import { BrandMark } from '../../components/brand/brand-mark';
import { MaterialIcon } from '../../components/icons/material-icon';
import { useAuth } from '../../features/auth/use-auth';

export function ForgotPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await auth.requestPasswordReset(email);
      setSubmitted(true);
    } catch (resetError: unknown) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'The recovery request failed. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-orb login-orb--violet" />
      <div className="login-orb login-orb--orange" />

      <section className="login-card glass-panel specular-panel" aria-labelledby="recovery-title">
        <div className="login-card__brand">
          <BrandMark />
        </div>

        <div className="auth-copy">
          <h1 id="recovery-title">Reset your password</h1>
          <p>Enter your account email and we will send a secure recovery link.</p>
        </div>

        {submitted ? (
          <div className="auth-success" role="status">
            <MaterialIcon name="mark_email_read" />
            <strong>Check your email</strong>
            <span>If an account exists for this address, a recovery link has been sent.</span>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="recovery-email">Email Address</label>
              <div className="glass-input">
                <MaterialIcon name="mail" />
                <input
                  autoComplete="email"
                  id="recovery-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  required
                  type="email"
                  value={email}
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
              {submitting ? <MaterialIcon className="spin" name="progress_activity" /> : 'Send Recovery Link'}
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
