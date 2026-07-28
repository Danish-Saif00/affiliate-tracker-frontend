import { useMemo, useState } from "react";

import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import type {
  OperationalDevice,
  OperationalReviewStatus,
} from "../../features/final-operations/final-operations.types";
import { useClickLogs } from "../../features/final-operations/use-final-operations";
import { usePublisherOffers } from "../../features/publisher-workspace/use-publisher-offers";
import { CatalogPagination } from "../control-plane/catalog-page-ui";
import {
  formatDateTime,
  formatLabel,
  shortId,
} from "../control-plane/control-plane-formatters";
import {
  ControlAccessDenied,
  ControlCardHeading,
  ControlEmpty,
  ControlFeedback,
  ControlLoading,
  ControlModuleHeader,
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

export function PublisherClicksPage() {
  const offers = usePublisherOffers();
  const [rangeDays, setRangeDays] = useState(30);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OperationalReviewStatus | "">("");
  const [offerId, setOfferId] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [device, setDevice] = useState<OperationalDevice | "">("");
  const [page, setPage] = useState(1);
  const filters = useMemo(
    () => ({
      from: startOfRange(rangeDays),
      to: endOfToday(),
      ...(search.trim().length > 0 ? { search: search.trim() } : {}),
      ...(status !== "" ? { status } : {}),
      ...(offerId.length > 0 ? { offerId } : {}),
      ...(countryCode.trim().length > 0
        ? { countryCode: countryCode.trim().toUpperCase() }
        : {}),
      ...(device !== "" ? { device } : {}),
      limit: 500,
    }),
    [countryCode, device, offerId, rangeDays, search, status],
  );
  const logs = useClickLogs(filters);

  if (
    logs.status === "loading" ||
    logs.status === "idle" ||
    offers.status === "loading" ||
    offers.status === "idle"
  ) {
    return <ControlLoading label="Publisher click logs" />;
  }

  if (logs.status === "forbidden" || offers.status === "forbidden") {
    return (
      <ControlAccessDenied
        message="An active Publisher membership is required to view click logs."
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
            Review traffic generated only by your Publisher links in{" "}
            <strong>{logs.companyName}</strong>.
          </>
        }
        eyebrow="My Traffic"
        icon="ads_click"
        stats={[
          { label: "Visible", value: logs.clicks.length },
          {
            label: "Approved",
            value: logs.clicks.filter((click) => click.status === "approved")
              .length,
          },
          {
            label: "Rejected",
            value: logs.clicks.filter((click) => click.status === "rejected")
              .length,
          },
        ]}
        title="My Clicks"
      />

      <ControlFeedback error={logs.error ?? offers.error} message={null} />

      <GlassPanel
        as="section"
        className="control-main-card control-main-card--full"
      >
        <ControlCardHeading
          action={
            <RefreshButton
              disabled={logs.isRefreshing}
              onClick={() =>
                void Promise.all([logs.refresh(), offers.refresh()])
              }
            />
          }
          description={`${logs.clicks.length} click(s) match the current filters.`}
          eyebrow="Publisher Click Directory"
          title="Attributed clicks"
        />

        <div className="final-filter-grid final-filter-grid--logs">
          <label className="final-search-field">
            <MaterialIcon name="search" />
            <input
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
              placeholder="Search click or Offer"
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

        {logs.clicks.length === 0 ? (
          <ControlEmpty
            icon="ads_click"
            message="Clicks will appear after one of your active tracking links receives traffic."
            title="No click records"
          />
        ) : (
          <>
            <div className="control-table-wrap">
              <table className="control-table final-log-table">
                <thead>
                  <tr>
                    <th>Click</th>
                    <th>Offer</th>
                    <th>Domain</th>
                    <th>Location</th>
                    <th>Device</th>
                    <th>Status</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((click) => (
                    <tr key={click.id}>
                      <td>
                        <strong>{shortId(click.publicClickId)}</strong>
                      </td>
                      <td>{click.offerName}</td>
                      <td>{click.trackingDomainName}</td>
                      <td>{click.countryCode ?? "Not captured"}</td>
                      <td>
                        <strong>{formatLabel(click.device)}</strong>
                        <small>{click.browser}</small>
                      </td>
                      <td>
                        <ControlStatus status={click.status} />
                      </td>
                      <td>{formatDateTime(click.capturedAt)}</td>
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
