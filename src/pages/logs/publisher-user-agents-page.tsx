import { useMemo, useState } from "react";

import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import type {
  OperationalDevice,
  OperationalReviewStatus,
} from "../../features/final-operations/final-operations.types";
import { useUserAgentLogs } from "../../features/final-operations/use-final-operations";
import { usePublisherOffers } from "../../features/publisher-workspace/use-publisher-offers";
import { CatalogPagination } from "../control-plane/catalog-page-ui";
import {
  formatDateTime,
  formatLabel,
} from "../control-plane/control-plane-formatters";
import {
  ControlAccessDenied,
  ControlEmpty,
  ControlFeedback,
  ControlLoading,
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

export function PublisherUserAgentsPage() {
  const offers = usePublisherOffers();
  const [rangeDays, setRangeDays] = useState(30);
  const [search, setSearch] = useState("");
  const [offerId, setOfferId] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [device, setDevice] = useState<OperationalDevice | "">("");
  const [status, setStatus] = useState<OperationalReviewStatus | "">("");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const filters = useMemo(
    () => ({
      from: startOfRange(rangeDays),
      to: endOfToday(),
      ...(search.trim().length > 0 ? { search: search.trim() } : {}),
      ...(offerId.length > 0 ? { offerId } : {}),
      ...(countryCode.trim().length > 0
        ? { countryCode: countryCode.trim().toUpperCase() }
        : {}),
      ...(device !== "" ? { device } : {}),
      ...(status !== "" ? { status } : {}),
      limit: 500,
    }),
    [countryCode, device, offerId, rangeDays, search, status],
  );
  const logs = useUserAgentLogs(filters);

  if (
    logs.status === "loading" ||
    logs.status === "idle" ||
    offers.status === "loading" ||
    offers.status === "idle"
  ) {
    return <ControlLoading label="Publisher user-agent logs" />;
  }

  if (logs.status === "forbidden" || offers.status === "forbidden") {
    return (
      <ControlAccessDenied
        message="An active Publisher membership is required to view user-agent logs."
        title="User agents unavailable"
      />
    );
  }

  async function handleCopy(userAgent: string | null): Promise<void> {
    if (userAgent === null) {
      setCopyMessage("This record does not contain a captured user agent.");
      return;
    }

    try {
      await navigator.clipboard.writeText(userAgent);
      setCopyMessage("User agent copied to the clipboard.");
    } catch {
      setCopyMessage("The browser could not copy this user agent.");
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
      <ControlFeedback
        error={logs.error ?? offers.error}
        message={copyMessage}
      />

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
                  event.currentTarget.value as OperationalDevice | "",
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
            <span>Review</span>
            <select
              onChange={(event) => {
                setStatus(
                  event.currentTarget.value as
                    | OperationalReviewStatus
                    | "",
                );
                setPage(1);
              }}
              value={status}
            >
              <option value="">All review states</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="unchecked">Unchecked</option>
            </select>
          </label>
        </div>

        {logs.userAgents.length === 0 ? (
          <ControlEmpty
            icon="text_snippet"
            message="User-agent aggregates appear after your tracking links receive traffic."
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
                          title={item.userAgent ?? "Not captured"}
                        >
                          {item.userAgent ?? "Not captured"}
                        </strong>
                        <small>{item.userAgentHash}</small>
                      </td>
                      <td>{formatLabel(item.device)}</td>
                      <td>{item.browser}</td>
                      <td>
                        <strong>{item.clickCount}</strong>
                      </td>
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
