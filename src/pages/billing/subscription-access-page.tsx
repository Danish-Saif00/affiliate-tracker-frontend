import { useState } from 'react';
import { Link } from 'react-router';

import { MaterialIcon } from '../../components/icons/material-icon';
import { GlassPanel } from '../../components/ui/glass-panel';
import { useAuth } from '../../features/auth/use-auth';
import { useCompany } from '../../features/companies/use-company';

function restrictionTitle(code: string): string {
  switch (code) {
    case 'COMPANY_SUBSCRIPTION_REQUIRED':
      return 'Subscription required';
    case 'COMPANY_SUBSCRIPTION_NOT_STARTED':
      return 'Subscription has not started';
    default:
      return 'Company subscription expired';
  }
}

export function SubscriptionAccessPage() {
  const auth = useAuth();
  const company = useCompany();
  const [retrying, setRetrying] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const restriction = company.accessRestriction;

  async function handleRetry() {
    setRetrying(true);
    setActionError(null);

    try {
      await company.retryCompanyAccess();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Subscription access is still unavailable.',
      );
    } finally {
      setRetrying(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await auth.signOut();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : 'Sign out could not be completed.',
      );
      setSigningOut(false);
    }
  }

  return (
    <div className="subscription-access-page">
      <GlassPanel as="section" className="subscription-access-card">
        <span className="subscription-access-card__icon">
          <MaterialIcon name="lock_clock" />
        </span>
        <span className="eyebrow-chip">Company Access</span>
        <h1>{restrictionTitle(restriction?.code ?? '')}</h1>
        <p>
          <strong>{company.activeCompany?.name ?? 'This company'}</strong> cannot access
          Publisher Tracker business modules until its subscription is renewed by the
          Platform Super Admin.
        </p>
        <div className="subscription-access-message">
          <MaterialIcon name="info" />
          <span>
            {restriction?.message ??
              'Company subscription access is currently unavailable.'}
          </span>
        </div>
        {actionError !== null && (
          <div className="form-error" role="alert">
            <MaterialIcon name="error" />
            <span>{actionError}</span>
          </div>
        )}
        <div className="subscription-access-actions">
          <button
            className="primary-gradient-button"
            disabled={retrying}
            onClick={() => void handleRetry()}
            type="button"
          >
            <MaterialIcon
              {...(retrying ? { className: 'spin' } : {})}
              name={retrying ? 'progress_activity' : 'refresh'}
            />
            {retrying ? 'Checking access…' : 'Check renewed access'}
          </button>
          <Link className="glass-button" to="/account">
            <MaterialIcon name="manage_accounts" />
            Open account
          </Link>
          <button
            className="glass-button"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            type="button"
          >
            <MaterialIcon name="logout" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}
