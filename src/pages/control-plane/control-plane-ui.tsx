import type { ReactNode } from 'react';

import { MaterialIcon } from '../../components/icons/material-icon';
import { GlassPanel } from '../../components/ui/glass-panel';

import { formatLabel } from './control-plane-formatters';

export function ControlModuleHeader({
  eyebrow,
  icon,
  title,
  description,
  stats,
}: {
  eyebrow: string;
  icon: string;
  title: string;
  description: ReactNode;
  stats: readonly { label: string; value: ReactNode }[];
}) {
  return (
    <GlassPanel as="section" className="control-heading-panel">
      <div className="control-heading-copy">
        <span className="eyebrow-chip">
          <MaterialIcon name={icon} />
          {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="control-heading-stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

export function ControlFeedback({
  error,
  message,
}: {
  error: string | null;
  message: string | null;
}) {
  const text = error ?? message;

  if (text === null) {
    return null;
  }

  return (
    <div
      className={
        error === null
          ? 'control-feedback control-feedback--success'
          : 'control-feedback control-feedback--error'
      }
    >
      <MaterialIcon name={error === null ? 'check_circle' : 'error'} />
      <span>{text}</span>
    </div>
  );
}

export function ControlStatus({ status }: { status: string }) {
  return (
    <span className={`control-status control-status--${status.replaceAll('_', '-')}`}>
      {formatLabel(status)}
    </span>
  );
}

export function ControlEmpty({
  icon,
  title,
  message,
}: {
  icon: string;
  title: string;
  message: string;
}) {
  return (
    <div className="control-empty-state">
      <MaterialIcon name={icon} />
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

export function ControlLoading({ label }: { label: string }) {
  return (
    <GlassPanel as="section" className="control-access-state">
      <MaterialIcon className="tracking-spin" name="progress_activity" />
      <h1>Loading {label}</h1>
      <p>Publisher Tracker is synchronizing the latest company data.</p>
    </GlassPanel>
  );
}

export function ControlAccessDenied({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <GlassPanel as="section" className="control-access-state">
      <MaterialIcon name="lock" />
      <h1>{title}</h1>
      <p>{message}</p>
    </GlassPanel>
  );
}

export function ControlCardHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="control-card-heading">
      <div>
        {eyebrow !== undefined && <span>{eyebrow}</span>}
        <h2>{title}</h2>
        {description !== undefined && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function RefreshButton({
  disabled,
  onClick,
  label = 'Refresh',
}: {
  disabled: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      aria-label={label}
      className="control-icon-button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <MaterialIcon name="refresh" />
    </button>
  );
}
