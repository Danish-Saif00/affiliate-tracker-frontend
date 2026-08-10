import { useState } from 'react';

import { MaterialIcon } from '../../components/icons/material-icon';
import { useAuth } from '../auth/use-auth';
import { resetCompany, resetTracker } from './factory-reset-api';
import type { FactoryResetReport, FactoryResetScope } from './factory-reset.types';

import './factory-reset.css';

export interface FactoryResetDangerPanelProps {
  readonly scope: FactoryResetScope;
  readonly companyId?: string;
  readonly companyName?: string;
  readonly onCompleted?: () => void | Promise<void>;
}

function createSuccessMessage(report: FactoryResetReport): string {
  if (report.completed) {
    return `Reset completed. ${report.deletedRecords} database records, ${report.externalResourcesPurged} managed external domain resource(s), ${report.storageObjectsPurged} user-owned Storage object(s), and ${report.authUsersPurged} tenant authentication account(s) were purged.`;
  }

  return `Database reset completed. Pending cleanup: ${report.externalResourcesPending} managed external domain resource(s), ${report.storageObjectsPending} Storage object(s), and ${report.authUsersPending} authentication account(s). Running the reset again safely retries pending cleanup.`;
}

export function FactoryResetDangerPanel({
  scope,
  companyId,
  companyName,
  onCompleted,
}: FactoryResetDangerPanelProps) {
  const auth = useAuth();
  const phrase = scope === 'tracker' ? 'RESET TRACKER' : 'RESET COMPANY';
  const title = scope === 'tracker' ? 'Factory Reset Tracker' : 'Reset Company Data';
  const [confirmation, setConfirmation] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const accessToken = auth.session?.access_token;
  const ready =
    confirmation === phrase &&
    accessToken !== undefined &&
    (scope === 'tracker' || companyId !== undefined);

  async function handleReset() {
    if (!ready || accessToken === undefined) {
      return;
    }

    const warning =
      scope === 'tracker'
        ? 'This permanently removes every company and all tenant data, including Company Admins, Managers, Publishers, Offers, managed Domains, user-owned Storage objects, Networks, Tracking Links, Clicks, Conversions, reports, settings, and tenant authentication accounts. Platform Super Admin login(s) and global billing-plan references are preserved. Continue?'
        : `This permanently removes the operational data, managed domain resources, reset-scoped user-owned Storage objects, and child accounts for ${companyName ?? 'this company'}. The company, your current Company Admin login, and the company subscription are preserved. Continue?`;

    if (!window.confirm(warning)) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsResetting(true);

    try {
      let report: FactoryResetReport;

      if (scope === 'tracker') {
        report = await resetTracker(accessToken, confirmation);
      } else {
        if (companyId === undefined) {
          throw new Error('A company must be selected before resetting company data.');
        }

        report = await resetCompany(accessToken, companyId, confirmation);
      }

      setMessage(createSuccessMessage(report));
      setConfirmation('');

      if (onCompleted !== undefined) {
        await onCompleted();
      }

      window.setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (resetError: unknown) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'The factory reset could not be completed.',
      );
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <section className="factory-reset-danger-panel">
      <div className="factory-reset-danger-panel__heading">
        <span className="factory-reset-danger-panel__icon">
          <MaterialIcon name="warning" filled />
        </span>
        <div>
          <span className="factory-reset-danger-panel__eyebrow">Danger Zone</span>
          <h2>{title}</h2>
          <p>
            {scope === 'tracker'
              ? 'Remove every tenant workspace and every tenant-owned record while keeping Platform Super Admin access.'
              : 'Return this company to a fresh operational state while keeping this company, your Company Admin login, and its subscription.'}
          </p>
        </div>
      </div>

      <div className="factory-reset-danger-panel__warning">
        <MaterialIcon name="delete_forever" />
        <span>
          This is a physical purge. Normal history-preserving Delete behavior is not used
          by this maintenance action.
        </span>
      </div>

      <label className="factory-reset-danger-panel__field">
        <span>
          Type <strong>{phrase}</strong> to enable reset
        </span>
        <input
          autoComplete="off"
          disabled={isResetting}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={phrase}
          spellCheck={false}
          value={confirmation}
        />
      </label>

      {error !== null && (
        <div className="factory-reset-danger-panel__feedback is-error" role="alert">
          <MaterialIcon name="error" />
          <span>{error}</span>
        </div>
      )}

      {message !== null && (
        <div className="factory-reset-danger-panel__feedback is-success" role="status">
          <MaterialIcon name="check_circle" />
          <span>{message}</span>
        </div>
      )}

      <button
        className="factory-reset-danger-panel__button"
        disabled={!ready || isResetting}
        onClick={() => void handleReset()}
        type="button"
      >
        <MaterialIcon name={isResetting ? 'progress_activity' : 'restart_alt'} />
        {isResetting ? 'Resettingâ€¦' : title}
      </button>
    </section>
  );
}
