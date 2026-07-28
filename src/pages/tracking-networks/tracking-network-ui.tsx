
import type { ReactNode } from 'react';
import { MaterialIcon } from '../../components/icons/material-icon';
import { GlassPanel } from '../../components/ui/glass-panel';
import { formatTrackingLabel } from './tracking-network-formatters';
export function ModuleFeedback({
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
          ? 'tracking-feedback tracking-feedback--success'
          : 'tracking-feedback tracking-feedback--error'
      }
    >
      <MaterialIcon
        name={
          error === null
            ? 'check_circle'
            : 'error'
        }
      />
      <span>{text}</span>
    </div>
  );
}
export function ModuleAccessState({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <GlassPanel
      as="section"
      className="tracking-access-state"
    >
      <MaterialIcon name={icon} />
      <h1>{title}</h1>
      <p>{children}</p>
    </GlassPanel>
  );
}
export function ModuleLoadingState({
  label,
}: {
  label: string;
}) {
  return (
    <GlassPanel
      as="section"
      className="tracking-access-state"
    >
      <MaterialIcon
        className="tracking-spin"
        name="progress_activity"
      />
      <h1>Loading {label}</h1>
      <p>
        Publisher Tracker is synchronizing the latest
        company configuration.
      </p>
    </GlassPanel>
  );
}
export function StatusPill({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={`tracking-status tracking-status--${status.replaceAll(
        '_',
        '-',
      )}`}
    >
      {formatTrackingLabel(status)}
    </span>
  );
}
