import {
  type FormEvent,
  useMemo,
  useState,
} from 'react';
import { useAppliedFilters } from '../../features/filters/use-applied-filters';
import { MaterialIcon } from '../../components/icons/material-icon';
import { useCompany } from '../../features/companies/use-company';
import type {
  TrackingDomain,
  TrackingDomainStatus,
} from '../../features/tracking-networks/tracking-networks.types';
import { useTrackingDomains } from '../../features/tracking-networks/use-tracking-networks';
const HOSTNAME_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u;
const STATUS_OPTIONS:
  readonly (TrackingDomainStatus | 'all')[] = [
    'all',
    'pending_verification',
    'active',
    'suspended',
    'archived',
  ];
function formatLabel(value: string): string {
  return value
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(' ');
}
function formatDate(value: string | null): string {
  if (value === null) {
    return 'Not verified';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date);
}
function DomainStatus({
  status,
}: {
  status: TrackingDomainStatus;
}) {
  return (
    <span
      className={
        `custom-domain-status custom-domain-status--${status}`
      }
    >
      {formatLabel(status)}
    </span>
  );
}
function DomainCard({
  domain,
  disabled,
  canManage,
  platformAdmin,
  onCopyToken,
  onSetPrimary,
  onStatus,
  onUpdateHostname,
}: {
  domain: TrackingDomain;
  disabled: boolean;
  canManage: boolean;
  platformAdmin: boolean;
  onCopyToken:
    (domain: TrackingDomain) => Promise<void>;
  onSetPrimary:
    (domain: TrackingDomain) => Promise<void>;
  onStatus: (
    domain: TrackingDomain,
    status:
      | 'active'
      | 'suspended'
      | 'archived',
  ) => Promise<void>;
  onUpdateHostname: (
    domain: TrackingDomain,
    hostname: string,
  ) => Promise<void>;
}) {
  const canEditHostname =
    canManage &&
    domain.status === 'pending_verification';
  const canSetPrimary =
    canManage &&
    domain.status === 'active' &&
    domain.verifiedAt !== null &&
    !domain.isPrimary;
  async function handleHostnameSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const data =
      new FormData(event.currentTarget);
    await onUpdateHostname(
      domain,
      String(data.get('hostname') ?? ''),
    );
  }
  return (
    <article className="custom-domain-card">
      <div className="custom-domain-card__heading">
        <span className="custom-domain-card__icon">
          <MaterialIcon name="dns" />
        </span>
        <div className="custom-domain-card__identity">
          <div>
            <strong>{domain.hostname}</strong>
            {domain.isPrimary && (
              <span className="custom-domain-primary">
                <MaterialIcon
                  filled
                  name="verified"
                />
                Primary
              </span>
            )}
          </div>
          <small>
            Updated {formatDate(domain.updatedAt)}
          </small>
        </div>
        <DomainStatus status={domain.status} />
      </div>
      <div className="custom-domain-meta">
        <div>
          <span>Verification</span>
          <strong>
            {domain.verifiedAt === null
              ? 'DNS verification pending'
              : formatDate(domain.verifiedAt)}
          </strong>
        </div>
        <div>
          <span>Routing</span>
          <strong>
            {domain.isPrimary
              ? 'Primary traffic domain'
              : 'Secondary domain'}
          </strong>
        </div>
        <div>
          <span>Created</span>
          <strong>
            {formatDate(domain.createdAt)}
          </strong>
        </div>
      </div>
      <div className="custom-domain-token">
        <div>
          <span>Ownership verification token</span>
          <code>{domain.verificationToken}</code>
        </div>
        <button
          aria-label="Copy verification token"
          disabled={disabled}
          onClick={() =>
            void onCopyToken(domain)
          }
          title="Copy verification token"
          type="button"
        >
          <MaterialIcon name="content_copy" />
        </button>
      </div>
      {canEditHostname && (
        <form
          className="custom-domain-inline-form"
          key={
            `${domain.id}:${domain.hostname}`
          }
          onSubmit={(event) =>
            void handleHostnameSubmit(event)
          }
        >
          <label>
            <span>Pending hostname</span>
            <input
              defaultValue={domain.hostname}
              disabled={disabled}
              name="hostname"
              spellCheck={false}
            />
          </label>
          <button
            disabled={disabled}
            type="submit"
          >
            <MaterialIcon name="save" />
            Save hostname
          </button>
        </form>
      )}
      <div className="custom-domain-actions">
        {canSetPrimary && (
          <button
            disabled={disabled}
            onClick={() =>
              void onSetPrimary(domain)
            }
            type="button"
          >
            <MaterialIcon name="star" />
            Make primary
          </button>
        )}
        {platformAdmin &&
          domain.status ===
            'pending_verification' && (
            <button
              className="is-primary"
              disabled={disabled}
              onClick={() =>
                void onStatus(
                  domain,
                  'active',
                )
              }
              type="button"
            >
              <MaterialIcon name="verified" />
              Verify and activate
            </button>
          )}
        {platformAdmin &&
          domain.status === 'suspended' && (
            <button
              className="is-primary"
              disabled={disabled}
              onClick={() =>
                void onStatus(
                  domain,
                  'active',
                )
              }
              type="button"
            >
              <MaterialIcon name="play_circle" />
              Reactivate
            </button>
          )}
        {canManage &&
          domain.status === 'active' && (
            <button
              className="is-warning"
              disabled={disabled}
              onClick={() =>
                void onStatus(
                  domain,
                  'suspended',
                )
              }
              type="button"
            >
              <MaterialIcon name="pause_circle" />
              Suspend
            </button>
          )}
        {canManage &&
          domain.status !== 'archived' && (
            <button
              className="is-danger"
              disabled={disabled}
              onClick={() =>
                void onStatus(
                  domain,
                  'archived',
                )
              }
              type="button"
            >
              <MaterialIcon name="archive" />
              Archive
            </button>
          )}
      </div>
    </article>
  );
}
export function TrackingDomainsPanel({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const company = useCompany();
  const tracking = useTrackingDomains();
  const [hostname, setHostname] =
    useState('');
  const [search, setSearch] =
    useState('');
  const [status, setStatus] =
    useState<
      TrackingDomainStatus | 'all'
    >('all');
  const [feedback, setFeedback] =
    useState<string | null>(null);
  const [actionError, setActionError] =
    useState<string | null>(null);
  const draftFilters = useMemo(
    () => ({
      search,
      status,
    }),
    [search, status],
  );
  const { appliedFilters, applyFilters } =
    useAppliedFilters(draftFilters);
  const filteredDomains = useMemo(() => {
    const normalizedSearch =
      appliedFilters.search.trim().toLowerCase();
    return tracking.domains.filter(
      (domain) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          domain.hostname
            .toLowerCase()
            .includes(normalizedSearch);
        const matchesStatus =
          appliedFilters.status === 'all' ||
          domain.status === appliedFilters.status;
        return matchesSearch && matchesStatus;
      },
    );
  }, [appliedFilters, tracking.domains]);
  const activeCount =
    tracking.domains.filter(
      (domain) =>
        domain.status === 'active',
    ).length;
  const pendingCount =
    tracking.domains.filter(
      (domain) =>
        domain.status ===
        'pending_verification',
    ).length;
  const primaryDomain =
    tracking.domains.find(
      (domain) => domain.isPrimary,
    ) ?? null;
  function resetFeedback() {
    setFeedback(null);
    setActionError(null);
  }
  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    resetFeedback();
    const normalizedHostname =
      hostname.trim().toLowerCase();
    if (
      !HOSTNAME_PATTERN.test(
        normalizedHostname,
      )
    ) {
      setActionError(
        'Enter a complete hostname such as track.example.com.',
      );
      return;
    }
    try {
      await tracking.createDomain({
        hostname: normalizedHostname,
      });
      setHostname('');
      setFeedback(
        `${normalizedHostname} was added for DNS verification.`,
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'The tracking domain could not be created.',
      );
    }
  }
  async function handleUpdateHostname(
    domain: TrackingDomain,
    nextHostname: string,
  ) {
    resetFeedback();
    const normalizedHostname =
      nextHostname.trim().toLowerCase();
    if (
      !HOSTNAME_PATTERN.test(
        normalizedHostname,
      )
    ) {
      setActionError(
        'Enter a complete hostname such as track.example.com.',
      );
      return;
    }
    if (
      normalizedHostname === domain.hostname
    ) {
      setActionError(
        'The hostname has not changed.',
      );
      return;
    }
    try {
      await tracking.updateDomain({
        domainId: domain.id,
        hostname: normalizedHostname,
      });
      setFeedback(
        `Hostname changed to ${normalizedHostname}.`,
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'The hostname could not be updated.',
      );
    }
  }
  async function handleSetPrimary(
    domain: TrackingDomain,
  ) {
    resetFeedback();
    try {
      await tracking.updateDomain({
        domainId: domain.id,
        isPrimary: true,
      });
      setFeedback(
        `${domain.hostname} is now the primary tracking domain.`,
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'The primary domain could not be changed.',
      );
    }
  }
  async function handleStatus(
    domain: TrackingDomain,
    nextStatus:
      | 'active'
      | 'suspended'
      | 'archived',
  ) {
    resetFeedback();
    try {
      if (
        nextStatus === 'active' ||
        tracking.permissions.platformAdmin
      ) {
        await tracking.updatePlatformStatus({
          domainId: domain.id,
          status: nextStatus,
        });
      } else {
        await tracking.updateDomain({
          domainId: domain.id,
          status: nextStatus,
        });
      }
      setFeedback(
        `${domain.hostname} is now ${formatLabel(
          nextStatus,
        ).toLowerCase()}.`,
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'The domain status could not be updated.',
      );
    }
  }
  async function handleCopyToken(
    domain: TrackingDomain,
  ) {
    resetFeedback();
    try {
      await navigator.clipboard.writeText(
        domain.verificationToken,
      );
      setFeedback(
        `Verification token copied for ${domain.hostname}.`,
      );
    } catch {
      setActionError(
        'The verification token could not be copied.',
      );
    }
  }
  if (company.activeCompany === null) {
    return (
      <section className="custom-domain-state">
        <MaterialIcon name="domain_disabled" />
        <h2>Select an active company</h2>
        <p>
          Domain management requires an
          active company context.
        </p>
      </section>
    );
  }
  if (tracking.status === 'forbidden') {
    return (
      <section className="custom-domain-state">
        <MaterialIcon name="lock" />
        <h2>Tracking domains are restricted</h2>
        <p>
          Your current role cannot access
          domain configuration.
        </p>
      </section>
    );
  }
  if (
    tracking.status === 'loading' ||
    tracking.status === 'idle'
  ) {
    return (
      <section className="custom-domain-state">
        <MaterialIcon
          className="spin"
          name="progress_activity"
        />
        <h2>Loading tracking domains</h2>
        <p>
          Reading the latest domain
          configuration.
        </p>
      </section>
    );
  }
  return (
    <div
      className={
        embedded
          ? 'custom-domain-panel is-embedded'
          : 'custom-domain-panel is-page'
      }
    >
      <style>{`
        .custom-domain-panel {
          --domain-text: #172033;
          --domain-muted: #69748a;
          --domain-accent: #6f5cf5;
          display: grid;
          gap: 18px;
          color: var(--domain-text);
        }
        .custom-domain-panel.is-page {
          padding: 4px;
        }
        .custom-domain-heading,
        .custom-domain-section,
        .custom-domain-state {
          border: 1px solid
            rgba(255, 255, 255, 0.86);
          border-radius: 24px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.94),
              rgba(232, 238, 247, 0.84)
            );
          box-shadow:
            12px 12px 28px
              rgba(154, 165, 184, 0.22),
            -10px -10px 26px
              rgba(255, 255, 255, 0.88);
        }
        .custom-domain-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 24px;
        }
        .custom-domain-heading h1,
        .custom-domain-heading h2 {
          margin: 5px 0;
        }
        .custom-domain-heading p {
          margin: 0;
          color: var(--domain-muted);
        }
        .custom-domain-eyebrow {
          color: var(--domain-accent);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .custom-domain-stats {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(90px, 1fr));
          gap: 10px;
        }
        .custom-domain-stats div {
          display: grid;
          gap: 3px;
          padding: 12px 14px;
          border-radius: 16px;
          background: #eef3f8;
          box-shadow:
            inset 3px 3px 8px
              rgba(174, 185, 202, 0.24),
            inset -3px -3px 8px
              rgba(255, 255, 255, 0.9);
        }
        .custom-domain-stats span {
          color: var(--domain-muted);
          font-size: 0.7rem;
        }
        .custom-domain-stats strong {
          overflow-wrap: anywhere;
        }
        .custom-domain-feedback {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 13px 16px;
          border-radius: 15px;
          font-weight: 700;
        }
        .custom-domain-feedback.is-success {
          color: #166534;
          background: rgba(34, 197, 94, 0.11);
        }
        .custom-domain-feedback.is-error {
          color: #b42318;
          background: rgba(239, 68, 68, 0.1);
        }
        .custom-domain-layout {
          display: grid;
          grid-template-columns:
            minmax(240px, 0.7fr)
            minmax(0, 1.8fr);
          gap: 18px;
        }
        .custom-domain-section {
          padding: 22px;
        }
        .custom-domain-section-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }
        .custom-domain-section-heading h2 {
          margin: 4px 0;
          font-size: 1.16rem;
        }
        .custom-domain-section-heading p {
          margin: 0;
          color: var(--domain-muted);
          line-height: 1.55;
        }
        .custom-domain-section-heading
        > .material-symbols-outlined {
          color: var(--domain-accent);
          font-size: 28px;
        }
        .custom-domain-form {
          display: grid;
          gap: 14px;
        }
        .custom-domain-form label,
        .custom-domain-inline-form label {
          display: grid;
          gap: 7px;
          color: #4e586d;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .custom-domain-form input,
        .custom-domain-inline-form input,
        .custom-domain-toolbar input,
        .custom-domain-toolbar select {
          width: 100%;
          min-height: 45px;
          padding: 10px 13px;
          border: 1px solid
            rgba(107, 118, 141, 0.12);
          border-radius: 14px;
          outline: none;
          color: var(--domain-text);
          background: #eef3f8;
          box-shadow:
            inset 4px 4px 9px
              rgba(174, 185, 202, 0.24),
            inset -4px -4px 9px
              rgba(255, 255, 255, 0.92);
        }
        .custom-domain-form button,
        .custom-domain-inline-form button,
        .custom-domain-actions button {
          display: inline-flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 15px;
          border: 0;
          border-radius: 13px;
          color: #5445c9;
          background: #edf2f8;
          box-shadow:
            6px 6px 14px
              rgba(163, 174, 193, 0.26),
            -6px -6px 14px
              rgba(255, 255, 255, 0.9);
          cursor: pointer;
          font-weight: 800;
        }
        .custom-domain-form button,
        .custom-domain-actions
        button.is-primary {
          color: white;
          background:
            linear-gradient(
              135deg,
              #7865f7,
              #5945dc
            );
        }
        .custom-domain-actions
        button.is-warning {
          color: #9a6700;
        }
        .custom-domain-actions
        button.is-danger {
          color: #b42318;
        }
        .custom-domain-form button:disabled,
        .custom-domain-inline-form
        button:disabled,
        .custom-domain-actions
        button:disabled {
          cursor: wait;
          opacity: 0.58;
        }
        .custom-domain-note {
          display: flex;
          gap: 8px;
          margin: 0;
          padding: 13px;
          border-radius: 14px;
          color: var(--domain-muted);
          background:
            rgba(111, 92, 245, 0.07);
          line-height: 1.5;
        }
        .custom-domain-toolbar {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr) 180px 44px;
          gap: 10px;
          margin-bottom: 17px;
        }
        .custom-domain-refresh {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border: 0;
          border-radius: 13px;
          color: var(--domain-accent);
          background: #edf2f8;
          box-shadow:
            6px 6px 14px
              rgba(163, 174, 193, 0.24),
            -6px -6px 14px
              rgba(255, 255, 255, 0.9);
          cursor: pointer;
        }
        .custom-domain-list {
          display: grid;
          gap: 14px;
        }
        .custom-domain-card {
          display: grid;
          gap: 15px;
          padding: 18px;
          border: 1px solid
            rgba(255, 255, 255, 0.82);
          border-radius: 19px;
          background:
            rgba(255, 255, 255, 0.72);
          box-shadow:
            8px 8px 20px
              rgba(160, 171, 190, 0.2),
            -7px -7px 18px
              rgba(255, 255, 255, 0.84);
        }
        .custom-domain-card__heading {
          display: grid;
          grid-template-columns:
            auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
        }
        .custom-domain-card__icon {
          display: grid;
          width: 43px;
          height: 43px;
          place-items: center;
          border-radius: 13px;
          color: var(--domain-accent);
          background: #edf2f8;
          box-shadow:
            5px 5px 12px
              rgba(163, 174, 193, 0.24),
            -5px -5px 12px
              rgba(255, 255, 255, 0.9);
        }
        .custom-domain-card__identity {
          min-width: 0;
        }
        .custom-domain-card__identity
        > div {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .custom-domain-card__identity strong {
          overflow-wrap: anywhere;
        }
        .custom-domain-card__identity small {
          display: block;
          margin-top: 3px;
          color: var(--domain-muted);
        }
        .custom-domain-primary,
        .custom-domain-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 0.67rem;
          font-weight: 800;
        }
        .custom-domain-primary {
          color: #5b48da;
          background:
            rgba(111, 92, 245, 0.1);
        }
        .custom-domain-status--active {
          color: #166534;
          background:
            rgba(34, 197, 94, 0.12);
        }
        .custom-domain-status--pending_verification {
          color: #9a6700;
          background:
            rgba(245, 158, 11, 0.12);
        }
        .custom-domain-status--suspended {
          color: #b42318;
          background:
            rgba(239, 68, 68, 0.1);
        }
        .custom-domain-status--archived {
          color: #5d6472;
          background:
            rgba(100, 116, 139, 0.12);
        }
        .custom-domain-meta {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .custom-domain-meta div {
          display: grid;
          gap: 4px;
          padding: 11px 12px;
          border-radius: 13px;
          background: #eef3f8;
          box-shadow:
            inset 3px 3px 7px
              rgba(174, 185, 202, 0.21),
            inset -3px -3px 7px
              rgba(255, 255, 255, 0.88);
        }
        .custom-domain-meta span,
        .custom-domain-token span {
          color: var(--domain-muted);
          font-size: 0.68rem;
        }
        .custom-domain-meta strong {
          font-size: 0.78rem;
        }
        .custom-domain-token {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          border-radius: 14px;
          background:
            rgba(111, 92, 245, 0.06);
        }
        .custom-domain-token div {
          display: grid;
          min-width: 0;
          gap: 5px;
        }
        .custom-domain-token code {
          overflow: hidden;
          color: #4d3fc0;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .custom-domain-token button {
          display: grid;
          width: 39px;
          height: 39px;
          flex: 0 0 auto;
          place-items: center;
          border: 0;
          border-radius: 12px;
          color: var(--domain-accent);
          background: #edf2f8;
          cursor: pointer;
        }
        .custom-domain-inline-form {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr) auto;
          align-items: end;
          gap: 10px;
        }
        .custom-domain-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }
        .custom-domain-empty,
        .custom-domain-state {
          display: grid;
          min-height: 190px;
          place-items: center;
          align-content: center;
          gap: 8px;
          padding: 24px;
          text-align: center;
        }
        .custom-domain-empty {
          border-radius: 17px;
          color: var(--domain-muted);
          background:
            rgba(111, 92, 245, 0.05);
        }
        .custom-domain-empty
        > .material-symbols-outlined,
        .custom-domain-state
        > .material-symbols-outlined {
          color: var(--domain-accent);
          font-size: 34px;
        }
        .custom-domain-empty strong,
        .custom-domain-state h2 {
          margin: 0;
          color: var(--domain-text);
        }
        .custom-domain-empty span,
        .custom-domain-state p {
          margin: 0;
          color: var(--domain-muted);
        }
        @media (max-width: 1000px) {
          .custom-domain-heading {
            align-items: flex-start;
            flex-direction: column;
          }
          .custom-domain-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 680px) {
          .custom-domain-stats,
          .custom-domain-meta {
            grid-template-columns: 1fr;
          }
          .custom-domain-toolbar {
            grid-template-columns: 1fr;
          }
          .custom-domain-refresh {
            width: 100%;
          }
          .custom-domain-card__heading {
            grid-template-columns:
              auto minmax(0, 1fr);
          }
          .custom-domain-card__heading
          > .custom-domain-status {
            grid-column: 1 / -1;
            width: fit-content;
          }
          .custom-domain-inline-form {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <section className="custom-domain-heading">
        <div>
          <span className="custom-domain-eyebrow">
            {embedded
              ? 'Domain configuration'
              : 'Tracking infrastructure'}
          </span>
          {embedded ? (
            <h2>Tracking domains</h2>
          ) : (
            <h1>Tracking domains</h1>
          )}
          <p>
            Configure verified redirect
            hostnames for{' '}
            <strong>
              {company.activeCompany.name}
            </strong>.
          </p>
        </div>
        <div className="custom-domain-stats">
          <div>
            <span>Total</span>
            <strong>
              {tracking.domains.length}
            </strong>
          </div>
          <div>
            <span>Active</span>
            <strong>{activeCount}</strong>
          </div>
          <div>
            <span>Primary</span>
            <strong>
              {primaryDomain?.hostname ??
                'Not selected'}
            </strong>
          </div>
        </div>
      </section>
      {(actionError ??
        tracking.error ??
        feedback) !== null && (
        <div
          className={
            actionError !== null ||
            tracking.error !== null
              ? 'custom-domain-feedback is-error'
              : 'custom-domain-feedback is-success'
          }
          role={
            actionError !== null ||
            tracking.error !== null
              ? 'alert'
              : 'status'
          }
        >
          <MaterialIcon
            name={
              actionError !== null ||
              tracking.error !== null
                ? 'error'
                : 'check_circle'
            }
          />
          <span>
            {actionError ??
              tracking.error ??
              feedback}
          </span>
        </div>
      )}
      <div className="custom-domain-layout">
        {tracking.permissions.canManage && (
          <section className="custom-domain-section">
            <div className="custom-domain-section-heading">
              <div>
                <span className="custom-domain-eyebrow">
                  Domain setup
                </span>
                <h2>Add tracking domain</h2>
                <p>
                  Add the hostname that will
                  receive tracking-link traffic.
                </p>
              </div>
              <MaterialIcon name="domain_add" />
            </div>
            <form
              className="custom-domain-form"
              onSubmit={(event) =>
                void handleCreate(event)
              }
            >
              <label>
                <span>Tracking hostname</span>
                <input
                  disabled={tracking.isMutating}
                  onChange={(event) =>
                    setHostname(
                      event.target.value,
                    )
                  }
                  placeholder="track.example.com"
                  required
                  spellCheck={false}
                  value={hostname}
                />
              </label>
              <p className="custom-domain-note">
                <MaterialIcon name="info" />
                Add the verification token
                shown after creation to your
                DNS provider. Platform Super
                Admin verification is required
                before activation.
              </p>
              <button
                disabled={tracking.isMutating}
                type="submit"
              >
                <MaterialIcon name="add" />
                {tracking.isMutating
                  ? 'Adding domain...'
                  : 'Add domain'}
              </button>
            </form>
            <div
              className="custom-domain-stats"
              style={{ marginTop: '16px' }}
            >
              <div>
                <span>Pending</span>
                <strong>{pendingCount}</strong>
              </div>
              <div>
                <span>Active</span>
                <strong>{activeCount}</strong>
              </div>
              <div>
                <span>Mode</span>
                <strong>
                  {tracking.permissions
                    .platformAdmin
                    ? 'Platform'
                    : 'Company'}
                </strong>
              </div>
            </div>
          </section>
        )}
        <section className="custom-domain-section">
          <div className="custom-domain-section-heading">
            <div>
              <span className="custom-domain-eyebrow">
                Domain directory
              </span>
              <h2>Manage tracking domains</h2>
              <p>
                {filteredDomains.length}{' '}
                domains match the current
                filters.
              </p>
            </div>
          </div>
          <div className="custom-domain-toolbar">
            <input
              aria-label="Search tracking domains"
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search hostname"
              value={search}
            />
            <select
              aria-label="Filter domains by status"
              onChange={(event) =>
                setStatus(
                  event.target.value as
                    | TrackingDomainStatus
                    | 'all',
                )
              }
              value={status}
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option === 'all'
                    ? 'All statuses'
                    : formatLabel(option)}
                </option>
              ))}
            </select>
            <button
              aria-label="Refresh tracking domains"
              className="custom-domain-refresh"
              disabled={tracking.isMutating}
              onClick={() =>
                void tracking.refresh()
              }
              title="Refresh tracking domains"
              type="button"
            >
              <MaterialIcon name="refresh" />
            </button>

            <div className="filter-apply-actions">
              <button
                className="primary-gradient-button primary-gradient-button--compact filter-apply-button"
                onClick={applyFilters}
                type="button"
              >
                Apply Filters
              </button>
            </div>
</div>
          {filteredDomains.length === 0 ? (
            <div className="custom-domain-empty">
              <MaterialIcon name="dns" />
              <strong>
                No matching tracking domains
              </strong>
              <span>
                Add a domain or change the
                current filters.
              </span>
            </div>
          ) : (
            <div className="custom-domain-list">
              {filteredDomains.map(
                (domain) => (
                  <DomainCard
                    canManage={
                      tracking.permissions
                        .canManage
                    }
                    disabled={
                      tracking.isMutating
                    }
                    domain={domain}
                    key={domain.id}
                    onCopyToken={
                      handleCopyToken
                    }
                    onSetPrimary={
                      handleSetPrimary
                    }
                    onStatus={handleStatus}
                    onUpdateHostname={
                      handleUpdateHostname
                    }
                    platformAdmin={
                      tracking.permissions
                        .platformAdmin
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
