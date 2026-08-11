import { useState } from 'react';

import { MaterialIcon } from '../../components/icons/material-icon';
import { useAuth } from '../auth/use-auth';
import { resetCompany, resetTracker } from './factory-reset-api';
import type {
  FactoryResetReport,
  FactoryResetScope,
} from './factory-reset.types';

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
  const phrase =
    scope === 'tracker'
      ? 'RESET TRACKER'
      : 'RESET COMPANY';
  const title =
    scope === 'tracker'
      ? 'Factory Reset Tracker'
      : 'Factory Reset Company';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const accessToken = auth.session?.access_token;
  const ready =
    confirmation.trim() === phrase &&
    accessToken !== undefined &&
    (scope === 'tracker' || companyId !== undefined);

  function openDialog(): void {
    setConfirmation('');
    setError(null);
    setMessage(null);
    setDialogOpen(true);
  }

  function closeDialog(): void {
    if (isResetting) {
      return;
    }

    setConfirmation('');
    setError(null);
    setDialogOpen(false);
  }

  async function handleReset(): Promise<void> {
    if (!ready || accessToken === undefined) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsResetting(true);

    try {
      let report: FactoryResetReport;

      if (scope === 'tracker') {
        report = await resetTracker(
          accessToken,
          confirmation.trim(),
        );
      } else {
        if (companyId === undefined) {
          throw new Error(
            'A company must be selected before resetting company data.',
          );
        }

        report = await resetCompany(
          accessToken,
          companyId,
          confirmation.trim(),
        );
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

  const description =
    scope === 'tracker'
      ? 'Erase every Company and every tracker-owned record, including Billing history and Billing plan data. Only Platform Super Admin login identity is preserved.'
      : 'Return ' +
        (companyName?.trim() || 'this Company') +
        ' to a clean state. The Company shell and your current Company Admin login are preserved so you can sign back in; subscription, invoices, and operational data are erased.';

  return (
    <section className="factory-reset-danger-panel">
      <div className="factory-reset-danger-panel__summary">
        <div className="factory-reset-danger-panel__heading">
          <span className="factory-reset-danger-panel__icon">
            <MaterialIcon
              name="warning"
              filled
            />
          </span>
          <div className="factory-reset-danger-panel__content">
            <span className="factory-reset-danger-panel__eyebrow">
              Danger Zone
            </span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>

        <button
          className="factory-reset-danger-panel__button"
          disabled={
            isResetting ||
            accessToken === undefined ||
            (scope === 'company' &&
              companyId === undefined)
          }
          onClick={openDialog}
          type="button"
        >
          <MaterialIcon name="restart_alt" />
          {title}
        </button>
      </div>

      {message !== null && (
        <div
          className="factory-reset-danger-panel__feedback is-success"
          role="status"
        >
          <MaterialIcon name="check_circle" />
          <span>{message}</span>
        </div>
      )}

      {dialogOpen && (
        <div
          className="factory-reset-modal"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              closeDialog();
            }
          }}
          role="presentation"
        >
          <div
            aria-describedby="factory-reset-modal-description"
            aria-labelledby="factory-reset-modal-title"
            aria-modal="true"
            className="factory-reset-modal__dialog"
            role="dialog"
          >
            <div className="factory-reset-modal__header">
              <span className="factory-reset-modal__danger-icon">
                <MaterialIcon
                  name="delete_forever"
                  filled
                />
              </span>
              <div>
                <span className="factory-reset-danger-panel__eyebrow">
                  Permanent action
                </span>
                <h2 id="factory-reset-modal-title">
                  {title}
                </h2>
              </div>
            </div>

            <p
              className="factory-reset-modal__description"
              id="factory-reset-modal-description"
            >
              {description}
            </p>

                        <div className="factory-reset-modal__instruction">
              <MaterialIcon name="info" />
              <span>
                Opening this window does not delete anything. Type
                <strong> {phrase}</strong> and then click
                <strong> OK, reset now</strong> to execute the reset.
              </span>
            </div>
<div className="factory-reset-modal__warning">
              <MaterialIcon name="shield_lock" />
              <span>
                This is a physical purge and cannot be undone.
                Normal history-preserving Delete behavior is not
                used by this maintenance action.
              </span>
            </div>

            <label className="factory-reset-modal__field">
              <span>
                Type <strong>{phrase}</strong> to continue
              </span>
              <input
                autoComplete="off"
                autoFocus
                disabled={isResetting}
                onChange={(event) =>
                  setConfirmation(event.target.value)
                }
                placeholder={`Type ${phrase} here`}
                spellCheck={false}
                value={confirmation}
              />
            </label>

            {error !== null && (
              <div
                className="factory-reset-danger-panel__feedback is-error"
                role="alert"
              >
                <MaterialIcon name="error" />
                <span>{error}</span>
              </div>
            )}

            <div className="factory-reset-modal__actions">
              <button
                className="factory-reset-modal__cancel"
                disabled={isResetting}
                onClick={closeDialog}
                type="button"
              >
                Cancel
              </button>
              <button
                className="factory-reset-danger-panel__button factory-reset-danger-panel__button--confirm"
                disabled={!ready || isResetting}
                onClick={() => void handleReset()}
                type="button"
              >
                <MaterialIcon
                  name={
                    isResetting
                      ? 'progress_activity'
                      : 'delete_forever'
                  }
                />
                {isResetting
                  ? 'Resetting...'
                  : ready
                    ? 'OK, reset now'
                    : `Type ${phrase} first`}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
