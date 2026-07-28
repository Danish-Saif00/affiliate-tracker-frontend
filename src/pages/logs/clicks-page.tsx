import {
  Fragment,
  useMemo,
  useState,
} from 'react';

import { MaterialIcon } from '../../components/icons/material-icon';
import { GlassPanel } from '../../components/ui/glass-panel';
import { useCatalogOperations } from '../../features/catalog/use-catalog';
import type {
  OperationalDevice,
  OperationalReviewStatus,
} from '../../features/final-operations/final-operations.types';
import { useClickLogs } from '../../features/final-operations/use-final-operations';
import { CatalogPagination } from '../control-plane/catalog-page-ui';
import {
  formatDateTime,
  formatLabel,
  shortId,
} from '../control-plane/control-plane-formatters';
import {
  ControlAccessDenied,
  ControlCardHeading,
  ControlEmpty,
  ControlFeedback,
  ControlLoading,
  ControlModuleHeader,
  ControlStatus,
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

export function ClicksPage() {
  const catalog = useCatalogOperations();
  const [rangeDays, setRangeDays] = useState(30);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OperationalReviewStatus | ''>('');
  const [offerId, setOfferId] = useState('');
  const [networkAccountId, setNetworkAccountId] = useState('');
  const [ownerMembershipId, setOwnerMembershipId] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [device, setDevice] = useState<OperationalDevice | ''>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const filters = useMemo(
    () => ({
      from: startOfRange(rangeDays),
      to: endOfToday(),
      ...(search.trim().length > 0 ? { search: search.trim() } : {}),
      ...(status !== '' ? { status } : {}),
      ...(offerId.length > 0 ? { offerId } : {}),
      ...(networkAccountId.length > 0 ? { networkAccountId } : {}),
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
      networkAccountId,
      offerId,
      ownerMembershipId,
      rangeDays,
      search,
      status,
    ],
  );
  const logs = useClickLogs(filters);

  if (logs.status === 'loading' || logs.status === 'idle') {
    return <ControlLoading label="click logs" />;
  }

  if (logs.status === 'forbidden') {
    return (
      <ControlAccessDenied
        message="Your account cannot view click logs for the selected company."
        title="Click logs unavailable"
      />
    );
  }

  const pageCount = Math.max(1, Math.ceil(logs.clicks.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleRows = logs.clicks.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="control-page final-operations-page">
      <ControlModuleHeader
        description={
          <>
            Inspect privacy-safe attribution events for{' '}
            <strong>{logs.companyName}</strong>.
          </>
        }
        eyebrow="Traffic Operations"
        icon="ads_click"
        stats={[
          { label: 'Visible', value: logs.clicks.length },
          {
            label: 'Approved',
            value: logs.clicks.filter((click) => click.status === 'approved').length,
          },
          {
            label: 'Rejected',
            value: logs.clicks.filter((click) => click.status === 'rejected').length,
          },
        ]}
        title="Clicks Log"
      />

      <ControlFeedback error={logs.error ?? catalog.error} message={null} />

      <GlassPanel
        as="section"
        className="control-main-card control-main-card--full"
      >
        <ControlCardHeading
          action={
            <RefreshButton
              disabled={logs.isRefreshing}
              onClick={() => void logs.refresh()}
            />
          }
          description={`${logs.clicks.length} captured click(s) match the current filters.`}
          eyebrow="Click Directory"
          title="Captured attribution events"
        />

        <div className="final-filter-grid final-filter-grid--logs">
          <label className="final-search-field">
            <MaterialIcon name="search" />
            <input
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
              placeholder="Search click, offer, network or publisher"
              value={search}
            />
          </label>

          <label>
            <span>Range</span>
            <select
              onChange={(event) => {
                setRangeDays(Number(event.currentTarget.value));
                setPage(1);
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
            <span>Status</span>
            <select
              onChange={(event) => {
                setStatus(
                  event.currentTarget.value as OperationalReviewStatus | '',
                );
                setPage(1);
              }}
              value={status}
            >
              <option value="">All statuses</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="unchecked">Unchecked</option>
            </select>
          </label>

          <label>
            <span>Offer</span>
            <select
              onChange={(event) => {
                setOfferId(event.currentTarget.value);
                setPage(1);
              }}
              value={offerId}
            >
              <option value="">All offers</option>
              {(catalog.snapshot?.offers ?? []).map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Network</span>
            <select
              onChange={(event) => {
                setNetworkAccountId(event.currentTarget.value);
                setPage(1);
              }}
              value={networkAccountId}
            >
              <option value="">All networks</option>
              {(catalog.snapshot?.networks ?? []).map((network) => (
                <option key={network.id} value={network.id}>
                  {network.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Publisher</span>
            <select
              onChange={(event) => {
                setOwnerMembershipId(event.currentTarget.value);
                setPage(1);
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
                setPage(1);
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
                setPage(1);
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
        </div>

        {logs.clicks.length === 0 ? (
          <ControlEmpty
            icon="ads_click"
            message="Clicks will appear after a published tracking link receives traffic."
            title="No click records"
          />
        ) : (
          <>
            <div className="control-table-wrap">
              <table className="control-table final-log-table">
                <thead>
                  <tr>
                    <th aria-label="Details" />
                    <th>Click</th>
                    <th>Offer</th>
                    <th>Domain</th>
                    <th>Network</th>
                    <th>Publisher</th>
                    <th>Location</th>
                    <th>Device</th>
                    <th>Status</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((click) => {
                    const expanded = expandedId === click.id;

                    return (
                      <Fragment key={click.id}>
                        <tr>
                          <td>
                            <button
                              aria-expanded={expanded}
                              aria-label={
                                expanded
                                  ? 'Collapse click details'
                                  : 'Expand click details'
                              }
                              className="final-expand-button"
                              onClick={() => {
                                setExpandedId(expanded ? null : click.id);
                              }}
                              type="button"
                            >
                              <MaterialIcon
                                className={expanded ? 'final-icon-rotated' : ''}
                                name="chevron_right"
                              />
                            </button>
                          </td>
                          <td>
                            <strong>{shortId(click.publicClickId)}</strong>
                            <small>{privacyHash(click.ipHash)}</small>
                          </td>
                          <td>{click.offerName}</td>
                          <td>{click.trackingDomainName}</td>
                          <td>{click.networkAccountName}</td>
                          <td>{click.publisherName}</td>
                          <td>{click.countryCode ?? 'Not captured'}</td>
                          <td>
                            <strong>{formatLabel(click.device)}</strong>
                            <small>{click.browser}</small>
                          </td>
                          <td><ControlStatus status={click.status} /></td>
                          <td>{formatDateTime(click.capturedAt)}</td>
                        </tr>
                        {expanded && (
                          <tr className="final-detail-row">
                            <td colSpan={10}>
                              <div className="final-detail-grid">
                                <div>
                                  <span>Public click ID</span>
                                  <strong>{click.publicClickId}</strong>
                                </div>
                                <div>
                                  <span>Privacy-safe IP hash</span>
                                  <strong>{click.ipHash}</strong>
                                </div>
                                <div>
                                  <span>Duplicate decision</span>
                                  <strong>{formatLabel(click.duplicateDecision)}</strong>
                                </div>
                                <div>
                                  <span>Fraud risk</span>
                                  <strong>{formatLabel(click.fraudRiskLevel)}</strong>
                                </div>
                                <div>
                                  <span>Proxy outcome</span>
                                  <strong>{formatLabel(click.proxyDetectionOutcome)}</strong>
                                </div>
                                <div className="final-detail-grid__wide">
                                  <span>User agent</span>
                                  <strong>{click.userAgent ?? 'Not captured'}</strong>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
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
