import { useMemo, useState } from "react";

import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import type {
  OperationalDevice,
  OperationalReviewStatus,
} from "../../features/final-operations/final-operations.types";
import { useConversionLogs } from "../../features/final-operations/use-final-operations";
import { usePublisherOffers } from "../../features/publisher-workspace/use-publisher-offers";
import { CatalogPagination } from "../control-plane/catalog-page-ui";
import {
  formatDateTime,
  formatLabel,
  formatMinorAmount,
  shortId,
} from "../control-plane/control-plane-formatters";
import {
  ControlAccessDenied,
  ControlEmpty,
  ControlFeedback,
  ControlLoading,
  ControlStatus,
  RefreshButton,
} from "../control-plane/control-plane-ui";

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

export function PublisherConversionsPage() {
  const offers = usePublisherOffers();
  const [rangeDays, setRangeDays] = useState(30);
  const [search, setSearch] = useState("");
  const [reviewStatus, setReviewStatus] = useState<
    OperationalReviewStatus | ""
  >("");
  const [conversionStatus, setConversionStatus] = useState<
    "pending" | "approved" | "rejected" | "reversed" | ""
  >("");
  const [offerId, setOfferId] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [device, setDevice] = useState<OperationalDevice | "">("");
  const [page, setPage] = useState(1);
  const filters = useMemo(
    () => ({
      from: startOfRange(rangeDays),
      to: endOfToday(),
      ...(search.trim().length > 0 ? { search: search.trim() } : {}),
      ...(reviewStatus !== "" ? { status: reviewStatus } : {}),
      ...(conversionStatus !== "" ? { conversionStatus } : {}),
      ...(offerId.length > 0 ? { offerId } : {}),
      ...(countryCode.trim().length > 0
        ? { countryCode: countryCode.trim().toUpperCase() }
        : {}),
      ...(device !== "" ? { device } : {}),
      limit: 500,
    }),
    [
      conversionStatus,
      countryCode,
      device,
      offerId,
      rangeDays,
      reviewStatus,
      search,
    ],
  );
  const logs = useConversionLogs(filters);

  if (
    logs.status === "loading" ||
    logs.status === "idle" ||
    offers.status === "loading" ||
    offers.status === "idle"
  ) {
    return <ControlLoading label="Publisher conversion logs" />;
  }

  if (logs.status === "forbidden" || offers.status === "forbidden") {
    return (
      <ControlAccessDenied
        message="An active Publisher membership is required to view conversions."
        title="Conversions unavailable"
      />
    );
  }

  const pageCount = Math.max(1, Math.ceil(logs.conversions.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleRows = logs.conversions.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="control-page final-operations-page">
      <ControlFeedback error={logs.error ?? offers.error} message={null} />

      <GlassPanel
        as="section"
        className="control-main-card control-main-card--full control-directory-surface"
      >
        <div className="control-directory-actions">
          <RefreshButton
            disabled={logs.isRefreshing}
            onClick={() =>
              void Promise.all([logs.refresh(), offers.refresh()])
            }
          />
        </div>

        <div className="final-filter-grid final-filter-grid--logs">
          <label className="final-search-field">
            <MaterialIcon name="search" />
            <input
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
              placeholder="Search conversion, click or Offer"
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
            <span>Assigned Offer</span>
            <select
              onChange={(event) => {
                setOfferId(event.currentTarget.value);
                setPage(1);
              }}
              value={offerId}
            >
              <option value="">All assigned Offers</option>
              {offers.offers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Review</span>
            <select
              onChange={(event) => {
                setReviewStatus(
                  event.currentTarget.value as OperationalReviewStatus | "",
                );
                setPage(1);
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
                    "pending" | "approved" | "rejected" | "reversed" | "",
                );
                setPage(1);
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
                setDevice(event.currentTarget.value as OperationalDevice | "");
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

        {logs.conversions.length === 0 ? (
          <ControlEmpty
            icon="receipt_long"
            message="Conversions appear after your Publisher traffic converts."
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
                    <th>Device</th>
                    <th>Payout</th>
                    <th>Status</th>
                    <th>Converted</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((conversion) => (
                    <tr key={conversion.id}>
                      <td>
                        <strong>
                          {shortId(conversion.publicConversionId)}
                        </strong>
                        <small>{formatLabel(conversion.reviewStatus)}</small>
                      </td>
                      <td>{shortId(conversion.publicClickId)}</td>
                      <td>{conversion.offerName}</td>
                      <td>{conversion.trackingDomainName}</td>
                      <td>
                        <strong>{formatLabel(conversion.device)}</strong>
                        <small>
                          {conversion.countryCode ?? "Unknown"} ·{" "}
                          {conversion.browser}
                        </small>
                      </td>
                      <td>
                        {formatMinorAmount(
                          conversion.payoutAmountMinor,
                          conversion.payoutCurrency,
                        )}
                      </td>
                      <td>
                        <ControlStatus status={conversion.status} />
                      </td>
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
