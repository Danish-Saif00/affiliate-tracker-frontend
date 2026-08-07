import {
  useMemo,
  useState,
} from 'react';

import { useAppliedFilters } from '../../features/filters/use-applied-filters';
import { MaterialIcon } from '../../components/icons/material-icon';
import { GlassPanel } from '../../components/ui/glass-panel';
import { useCatalogOperations } from '../../features/catalog/use-catalog';
import type { OperationalDevice } from '../../features/final-operations/final-operations.types';
import { useSessionLogs } from '../../features/final-operations/use-final-operations';
import { CatalogPagination } from '../control-plane/catalog-page-ui';
import {
  formatDateTime,
  formatLabel,
  shortId,
} from '../control-plane/control-plane-formatters';
import {
  ControlAccessDenied,
  ControlEmpty,
  ControlFeedback,
  ControlLoading,
  ControlModuleHeader,
  RefreshButton,
} from '../control-plane/control-plane-ui';

const PAGE_SIZE = 25;

function startOfRange(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function endOfToday(): string {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function privacyHash(value: string): string {
  return value.length <= 18
    ? value
    : `${value.slice(0, 10)}…${value.slice(-6)}`;
}

export function SessionsPage() {
  const catalog = useCatalogOperations();
  const [rangeDays, setRangeDays] = useState(30);
  const [search, setSearch] = useState('');
  const [ownerMembershipId, setOwnerMembershipId] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [device, setDevice] = useState<OperationalDevice | ''>('');
  const [page, setPage] = useState(1);
  const draftFilters = useMemo(
    () => ({
      from: startOfRange(rangeDays),
      to: endOfToday(),
      ...(search.trim().length > 0 ? { search: search.trim() } : {}),
      ...(ownerMembershipId.length > 0 ? { ownerMembershipId } : {}),
      ...(countryCode.trim().length > 0
        ? { countryCode: countryCode.trim().toUpperCase() }
        : {}),
      ...(device !== '' ? { device } : {}),
      limit: 500,
    }),
    [
      countryCode,
      device,
      ownerMembershipId,
      rangeDays,
      search,
    ],
  );
    const { appliedFilters, applyFilters } =
    useAppliedFilters(draftFilters, () => setPage(1));
  const logs = useSessionLogs(appliedFilters);

  if (logs.status === 'loading' || logs.status === 'idle') {
    return <ControlLoading label="session logs" />;
  }

  if (logs.status === 'forbidden') {
    return (
      <ControlAccessDenied
        message="Your account cannot view sessions for the selected company."
        title="Sessions unavailable"
      />
    );
  }

  const pageCount = Math.max(
    1,
    Math.ceil(logs.sessions.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, pageCount);
  const visibleRows = logs.sessions.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="control-page final-operations-page">
      <ControlModuleHeader
        description={
          <>
            Review visitor sessions derived from captured clicks for{' '}
            <strong>{logs.companyName}</strong>.
          </>
        }
        eyebrow="Visitor Intelligence"
        icon="history"
        stats={[
          { label: 'Sessions', value: logs.sessions.length },
          {
            label: 'Clicks',
            value: logs.sessions.reduce(
              (total, session) => total + session.clickCount,
              0,
            ),
          },
          {
            label: 'Publishers',
            value: new Set(
              logs.sessions.map((session) => session.ownerMembershipId),
            ).size,
          },
        ]}
        title="Sessions Log"
      />

      <ControlFeedback error={logs.error ?? catalog.error} message={null} />

      <GlassPanel
        as="section"
        className="control-main-card control-main-card--full control-directory-surface"
      >
        <div className="control-directory-actions">
          <RefreshButton
            disabled={logs.isRefreshing}
            onClick={() => void logs.refresh()}
          />
        </div>

        <div className="final-filter-grid">
          <label className="final-search-field">
            <MaterialIcon name="search" />
            <input
              onChange={(event) => {
                setSearch(event.currentTarget.value);

              }}
              placeholder="Search visitor or publisher"
              value={search}
            />
          </label>
          <label>
            <span>Range</span>
            <select
              onChange={(event) => {
                setRangeDays(Number(event.currentTarget.value));

              }}
              value={rangeDays}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 365 days</option>
            </select>
          </label>
          <label>
            <span>Publisher</span>
            <select
              onChange={(event) => {
                setOwnerMembershipId(event.currentTarget.value);

              }}
              value={ownerMembershipId}
            >
              <option value="">All publishers</option>
              {(catalog.snapshot?.publishers ?? []).map((publisher) => (
                <option
                  key={publisher.membershipId}
                  value={publisher.membershipId}
                >
                  {publisher.displayName ?? publisher.email ?? 'Publisher'}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Country</span>
            <input
              maxLength={2}
              onChange={(event) => {
                setCountryCode(event.currentTarget.value.toUpperCase());

              }}
              placeholder="US"
              value={countryCode}
            />
          </label>
          <label>
            <span>Device</span>
            <select
              onChange={(event) => {
                setDevice(
                  event.currentTarget.value as OperationalDevice | '',
                );

              }}
              value={device}
            >
              <option value="">All devices</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
              <option value="other">Other</option>
            </select>
          </label>
                  <div className="filter-apply-actions">
            <button
              className="primary-gradient-button primary-gradient-button--compact filter-apply-button"
              onClick={applyFilters}
              type="button"
            >
              <MaterialIcon name="filter_alt" />
              Apply Filters
            </button>
          </div></div>

        {logs.sessions.length === 0 ? (
          <ControlEmpty
            icon="history"
            message="Sessions will appear when tracking links receive traffic."
            title="No session records"
          />
        ) : (
          <>
            <div className="control-table-wrap">
              <table className="control-table final-log-table">
                <thead>
                  <tr>
                    <th>Session ID</th>
                    <th>Publisher</th>
                    <th>Publisher ID</th>
                    <th>IP privacy hash</th>
                    <th>Country</th>
                    <th>Device</th>
                    <th>Browser</th>
                    <th>Clicks</th>
                    <th>First seen</th>
                    <th>Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((session) => (
                    <tr key={session.visitorId}>
                      <td><strong>{shortId(session.visitorId)}</strong></td>
                      <td>{session.publisherName}</td>
                      <td>{shortId(session.ownerMembershipId)}</td>
                      <td title={session.ipHash}>{privacyHash(session.ipHash)}</td>
                      <td>{session.countryCode ?? 'Not captured'}</td>
                      <td>{formatLabel(session.device)}</td>
                      <td>{session.browser}</td>
                      <td><strong>{session.clickCount}</strong></td>
                      <td>{formatDateTime(session.firstSeenAt)}</td>
                      <td>{formatDateTime(session.lastSeenAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CatalogPagination
              onPage={setPage}
              page={safePage}
              pageCount={pageCount}
            />
          </>
        )}
      </GlassPanel>
    </div>
  );
}
