import {
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
import { useUserAgentLogs } from '../../features/final-operations/use-final-operations';
import { CatalogPagination } from '../control-plane/catalog-page-ui';
import {
  formatDateTime,
  formatLabel,
} from '../control-plane/control-plane-formatters';
import {
  ControlAccessDenied,
  ControlCardHeading,
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

export function UserAgentsPage() {
  const catalog = useCatalogOperations();
  const [rangeDays, setRangeDays] = useState(30);
  const [search, setSearch] = useState('');
  const [offerId, setOfferId] = useState('');
  const [networkAccountId, setNetworkAccountId] = useState('');
  const [ownerMembershipId, setOwnerMembershipId] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [device, setDevice] = useState<OperationalDevice | ''>('');
  const [status, setStatus] = useState<OperationalReviewStatus | ''>('');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const filters = useMemo(
    () => ({
      from: startOfRange(rangeDays),
      to: endOfToday(),
      ...(search.trim().length > 0 ? { search: search.trim() } : {}),
      ...(offerId.length > 0 ? { offerId } : {}),
      ...(networkAccountId.length > 0 ? { networkAccountId } : {}),
      ...(ownerMembershipId.length > 0 ? { ownerMembershipId } : {}),
      ...(countryCode.trim().length > 0
        ? { countryCode: countryCode.trim().toUpperCase() }
        : {}),
      ...(device !== '' ? { device } : {}),
      ...(status !== '' ? { status } : {}),
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
  const logs = useUserAgentLogs(filters);

  if (logs.status === 'loading' || logs.status === 'idle') {
    return <ControlLoading label="user-agent logs" />;
  }

  if (logs.status === 'forbidden') {
    return (
      <ControlAccessDenied
        message="Your account cannot view user-agent logs for the selected company."
        title="User agents unavailable"
      />
    );
  }

  async function handleCopy(userAgent: string | null): Promise<void> {
    if (userAgent === null) {
      setCopyMessage('This record does not contain a captured user agent.');
      return;
    }

    try {
      await navigator.clipboard.writeText(userAgent);
      setCopyMessage('User agent copied to the clipboard.');
    } catch {
      setCopyMessage('The browser could not copy this user agent.');
    }
  }

  const pageCount = Math.max(
    1,
    Math.ceil(logs.userAgents.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, pageCount);
  const visibleRows = logs.userAgents.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="control-page final-operations-page">
      <ControlModuleHeader
        description={
          <>
            Review aggregated browser signatures for{' '}
            <strong>{logs.companyName}</strong>.
          </>
        }
        eyebrow="Client Intelligence"
        icon="text_snippet"
        stats={[
          { label: 'Signatures', value: logs.userAgents.length },
          {
            label: 'Clicks',
            value: logs.userAgents.reduce(
              (total, item) => total + item.clickCount,
              0,
            ),
          },
          {
            label: 'Browsers',
            value: new Set(logs.userAgents.map((item) => item.browser)).size,
          },
        ]}
        title="User Agents Log"
      />

      <ControlFeedback
        error={logs.error ?? catalog.error}
        message={copyMessage}
      />

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
          description={`${logs.userAgents.length} aggregated user-agent signature(s) match the filters.`}
          eyebrow="User-Agent Directory"
          title="Captured client signatures"
        />

        <div className="final-filter-grid final-filter-grid--logs">
          <label className="final-search-field">
            <MaterialIcon name="search" />
            <input
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
              placeholder="Search user agent"
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
          <label>
            <span>Status</span>
            <select
              onChange={(event) => {
                setStatus(
                  event.currentTarget.value as
                    | OperationalReviewStatus
                    | '',
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
        </div>

        {logs.userAgents.length === 0 ? (
          <ControlEmpty
            icon="text_snippet"
            message="User-agent aggregates appear after tracking traffic is captured."
            title="No user-agent records"
          />
        ) : (
          <>
            <div className="control-table-wrap">
              <table className="control-table final-user-agent-table">
                <thead>
                  <tr>
                    <th>User agent</th>
                    <th>Device</th>
                    <th>Browser</th>
                    <th>Clicks</th>
                    <th>Last seen</th>
                    <th aria-label="Copy" />
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((item) => (
                    <tr key={item.userAgentHash}>
                      <td>
                        <strong
                          className="final-user-agent-text"
                          title={item.userAgent ?? 'Not captured'}
                        >
                          {item.userAgent ?? 'Not captured'}
                        </strong>
                        <small>{item.userAgentHash}</small>
                      </td>
                      <td>{formatLabel(item.device)}</td>
                      <td>{item.browser}</td>
                      <td><strong>{item.clickCount}</strong></td>
                      <td>{formatDateTime(item.lastSeenAt)}</td>
                      <td>
                        <button
                          aria-label="Copy user agent"
                          className="final-copy-button"
                          disabled={item.userAgent === null}
                          onClick={() => void handleCopy(item.userAgent)}
                          type="button"
                        >
                          <MaterialIcon name="content_copy" />
                        </button>
                      </td>
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
