import { useMemo, useState } from 'react';
import { useAppliedFilters } from '../../features/filters/use-applied-filters';

import { GlassPanel } from '../../components/ui/glass-panel';
import { useOperations } from '../../features/control-plane/use-control-plane';
import { formatDateTime, formatLabel, shortId } from '../control-plane/control-plane-formatters';
import {
  ControlAccessDenied,
  ControlEmpty,
  ControlFeedback,
  ControlLoading,
  ControlModuleHeader,
  RefreshButton,
} from '../control-plane/control-plane-ui';

export function OperationsPage() {
  const [eventName, setEventName] = useState('');
  const [entityType, setEntityType] = useState('');
  const draftFilters = useMemo(
    () => ({
      ...(eventName.trim().length > 0 ? { eventName: eventName.trim() } : {}),
      ...(entityType.trim().length > 0 ? { entityType: entityType.trim() } : {}),
      limit: 100,
    }),
    [entityType, eventName],
  );
  const { appliedFilters, applyFilters } =
    useAppliedFilters(draftFilters);
  const operations = useOperations(appliedFilters);

  if (operations.status === 'loading' || operations.status === 'idle') {
    return <ControlLoading label="operations" />;
  }

  if (operations.status === 'forbidden') {
    return <ControlAccessDenied message="Operational logs are available to Platform, Company Admin, and Manager roles." title="Operations access restricted" />;
  }

  const entityTypes = Array.from(new Set(operations.events.map((event) => event.entityType))).sort();
  const eventNames = Array.from(new Set(operations.events.map((event) => event.eventName))).sort();

  return (
    <div className="control-page">
      <ControlModuleHeader
        description={<>Inspect audit and operational changes for <strong>{operations.companyName}</strong>.</>}
        eyebrow="Operational Ledger"
        icon="monitor_heart"
        stats={[
          { label: 'Events', value: operations.events.length },
          { label: 'Event Types', value: eventNames.length },
          { label: 'Entities', value: entityTypes.length },
        ]}
        title="Operations"
      />
      <ControlFeedback error={operations.error} message={null} />

      <GlassPanel
        as="section"
        className="control-main-card control-main-card--full control-directory-surface"
      >
        <div className="control-directory-actions">
          <RefreshButton disabled={false} onClick={() => void operations.refresh()} />
        </div>
        <div className="control-filter-bar control-filter-bar--three">
          <input onChange={(event) => setEventName(event.target.value)} placeholder="Filter event name" value={eventName} />
          <input onChange={(event) => setEntityType(event.target.value)} placeholder="Filter entity type" value={entityType} />
          <button className="secondary-button" onClick={() => { setEventName(''); setEntityType(''); }} type="button">Clear filters</button>
                  <div className="filter-apply-actions">
            <button
              className="primary-gradient-button primary-gradient-button--compact filter-apply-button"
              onClick={applyFilters}
              type="button"
            >
              Apply Filters
            </button>
          </div></div>

        {operations.events.length === 0 ? (
          <ControlEmpty icon="history" message="No operational events match the current filters." title="No events" />
        ) : (
          <div className="control-table-wrap">
            <table className="control-table control-table--wide">
              <thead><tr><th>Time</th><th>Event</th><th>Entity</th><th>Actor</th><th>Request</th></tr></thead>
              <tbody>
                {operations.events.map((event) => (
                  <tr key={event.id}>
                    <td>{formatDateTime(event.createdAt)}</td>
                    <td><strong>{formatLabel(event.eventName)}</strong><small className="control-cell-subtitle">{event.eventName}</small></td>
                    <td>{formatLabel(event.entityType)}{event.entityId ? <small className="control-cell-subtitle">{shortId(event.entityId)}</small> : null}</td>
                    <td>{event.actorUserId ? shortId(event.actorUserId) : 'System'}</td>
                    <td>{event.requestId ? shortId(event.requestId) : 'Not recorded'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
