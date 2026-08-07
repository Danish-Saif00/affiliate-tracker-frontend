import {
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import { useAppliedFilters } from '../../features/filters/use-applied-filters';
import { MaterialIcon } from '../../components/icons/material-icon';
import { GlassPanel } from '../../components/ui/glass-panel';
import { useCatalogOperations } from '../../features/catalog/use-catalog';
import type {
  OperationalDevice,
  OperationalReviewStatus,
} from '../../features/final-operations/final-operations.types';
import { useConversionLogs } from '../../features/final-operations/use-final-operations';
import { CatalogPagination } from '../control-plane/catalog-page-ui';
import {
  formatDateTime,
  formatLabel,
  formatMinorAmount,
  parseMajorAmountToMinor,
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

export function ConversionsPage() {
  const catalog = useCatalogOperations();
  const [rangeDays, setRangeDays] = useState(30);
  const [search, setSearch] = useState('');
  const [reviewStatus, setReviewStatus] =
    useState<OperationalReviewStatus | ''>('');
  const [conversionStatus, setConversionStatus] = useState<
    'pending' | 'approved' | 'rejected' | 'reversed' | ''
  >('');
  const [offerId, setOfferId] = useState('');
  const [networkAccountId, setNetworkAccountId] = useState('');
  const [ownerMembershipId, setOwnerMembershipId] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [device, setDevice] = useState<OperationalDevice | ''>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const draftFilters = useMemo(
    () => ({
      from: startOfRange(rangeDays),
      to: endOfToday(),
      ...(search.trim().length > 0 ? { search: search.trim() } : {}),
      ...(reviewStatus !== '' ? { status: reviewStatus } : {}),
      ...(conversionStatus !== '' ? { conversionStatus } : {}),
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
      conversionStatus,
      countryCode,
      device,
      networkAccountId,
      offerId,
      ownerMembershipId,
      rangeDays,
      reviewStatus,
      search,
    ],
  );
    const { appliedFilters, applyFilters } =
    useAppliedFilters(draftFilters);
  const logs = useConversionLogs(appliedFilters);

  if (logs.status === 'loading' || logs.status === 'idle') {
    return <ControlLoading label="conversion logs" />;
  }

  if (logs.status === 'forbidden') {
    return (
      <ControlAccessDenied
        message="Your account cannot view conversions for the selected company."
        title="Conversions unavailable"
      />
    );
  }

  async function handleManualConversion(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setFeedback(null);
    setActionError(null);
    logs.resetCreateError();

    try {
      const form = event.currentTarget;
      const data = new FormData(form);
      const publicClickId = String(data.get('publicClickId') ?? '').trim();
      const status = String(data.get('status') ?? 'approved') as
        | 'pending'
        | 'approved'
        | 'rejected';
      const revenueText = String(data.get('revenueAmount') ?? '').trim();
      const revenueCurrency = String(
        data.get('revenueCurrency') ?? 'USD',
      ).trim().toUpperCase();
      const revenueAmountMinor =
        revenueText.length === 0
          ? null
          : parseMajorAmountToMinor(revenueText, revenueCurrency);

      if (revenueText.length > 0 && revenueAmountMinor === null) {
        throw new Error('Enter a valid non-negative revenue amount.');
      }

      const conversion = await logs.createManualConversion({
        publicClickId,
        status,
        ...(revenueAmountMinor !== null
          ? {
              revenueAmountMinor,
              revenueCurrency,
            }
          : {}),
      });

      form.reset();
      setFeedback(
        `Manual conversion ${shortId(conversion.publicConversionId)} was created.`,
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'The manual conversion could not be created.',
      );
    }
  }

  const pageCount = Math.max(
    1,
    Math.ceil(logs.conversions.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, pageCount);
  const visibleRows = logs.conversions.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="control-page final-operations-page">
      <ControlModuleHeader
        description={
          <>
            Review provider and authorized manual conversions for{' '}
            <strong>{logs.companyName}</strong>.
          </>
        }
        eyebrow="Conversion Operations"
        icon="sync_alt"
        stats={[
          { label: 'Visible', value: logs.conversions.length },
          {
            label: 'Approved',
            value: logs.conversions.filter(
              (conversion) => conversion.status === 'approved',
            ).length,
          },
          {
            label: 'Manual',
            value: logs.conversions.filter(
              (conversion) => conversion.source === 'manual',
            ).length,
          },
        ]}
        title="Conversions Log"
      />

      <ControlFeedback
        error={actionError ?? logs.error ?? catalog.error}
        message={feedback}
      />

      {logs.permissions.canViewOperations && (
        <GlassPanel
          as="section"
          className="control-main-card control-main-card--full"
        >
          <ControlCardHeading
            description="Create a conversion only from an eligible existing Publisher Tracker click."
            eyebrow="Manual Conversion"
            title="Add conversion by Click ID"
          />
          <form
            className="final-manual-conversion-form"
            onSubmit={(event) => void handleManualConversion(event)}
          >
            <label>
              <span>Click ID</span>
              <input
                name="publicClickId"
                pattern="clk_[a-f0-9]{32}"
                placeholder="clk_..."
                required
              />
            </label>
            <label>
              <span>Status</span>
              <select defaultValue="approved" name="status">
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label>
              <span>Revenue</span>
              <input
                min="0"
                name="revenueAmount"
                placeholder="Optional"
                step="0.01"
                type="number"
              />
            </label>
            <label>
              <span>Currency</span>
              <input
                defaultValue="USD"
                maxLength={3}
                name="revenueCurrency"
              />
            </label>
            <button
              className="primary-gradient-button"
              disabled={logs.isCreating}
              type="submit"
            >
              <MaterialIcon
                className={logs.isCreating ? 'spin' : undefined}
                name={logs.isCreating ? 'progress_activity' : 'add'}
              />
              {logs.isCreating ? 'Adding…' : 'Add conversion'}
            </button>
          </form>
        </GlassPanel>
      )}

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

        <div className="final-filter-grid final-filter-grid--logs">
          <label className="final-search-field">
            <MaterialIcon name="search" />
            <input
              onChange={(event) => {
                setSearch(event.currentTarget.value);

              }}
              placeholder="Search conversion, click, offer or publisher"
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
            <span>Review</span>
            <select
              onChange={(event) => {
                setReviewStatus(
                  event.currentTarget.value as
                    | OperationalReviewStatus
                    | '',
                );

              }}
              value={reviewStatus}
            >
              <option value="">All review states</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="unchecked">Unchecked</option>
            </select>
          </label>
          <label>
            <span>Conversion status</span>
            <select
              onChange={(event) => {
                setConversionStatus(
                  event.currentTarget.value as
                    | 'pending'
                    | 'approved'
                    | 'rejected'
                    | 'reversed'
                    | '',
                );

              }}
              value={conversionStatus}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="reversed">Reversed</option>
            </select>
          </label>
          <label>
            <span>Offer</span>
            <select
              onChange={(event) => {
                setOfferId(event.currentTarget.value);

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
              onClick={() => {
                applyFilters();
                setPage(1);
              }}
              type="button"
            >
              <MaterialIcon name="filter_alt" />
              Apply Filters
            </button>
          </div></div>

        {logs.conversions.length === 0 ? (
          <ControlEmpty
            icon="receipt_long"
            message="Conversions appear after a provider postback or authorized manual entry."
            title="No conversion records"
          />
        ) : (
          <>
            <div className="control-table-wrap">
              <table className="control-table final-log-table">
                <thead>
                  <tr>
                    <th>Conversion</th>
                    <th>Click</th>
                    <th>Offer</th>
                    <th>Domain</th>
                    <th>Network</th>
                    <th>Publisher</th>
                    <th>Device</th>
                    <th>Revenue</th>
                    <th>Payout</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Converted</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((conversion) => (
                    <tr key={conversion.id}>
                      <td>
                        <strong>{shortId(conversion.publicConversionId)}</strong>
                        <small>{formatLabel(conversion.reviewStatus)}</small>
                      </td>
                      <td>{shortId(conversion.publicClickId)}</td>
                      <td>{conversion.offerName}</td>
                      <td>{conversion.trackingDomainName}</td>
                      <td>{conversion.networkAccountName}</td>
                      <td>{conversion.publisherName}</td>
                      <td>
                        <strong>{formatLabel(conversion.device)}</strong>
                        <small>
                          {conversion.countryCode ?? 'Unknown'} · {conversion.browser}
                        </small>
                      </td>
                      <td>
                        {conversion.revenueAmountMinor === null ||
                        conversion.revenueCurrency === null
                          ? 'Not reported'
                          : formatMinorAmount(
                              conversion.revenueAmountMinor,
                              conversion.revenueCurrency,
                            )}
                      </td>
                      <td>
                        {formatMinorAmount(
                          conversion.payoutAmountMinor,
                          conversion.payoutCurrency,
                        )}
                      </td>
                      <td>{formatLabel(conversion.source)}</td>
                      <td><ControlStatus status={conversion.status} /></td>
                      <td>{formatDateTime(conversion.convertedAt)}</td>
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
