import { useMemo, useState } from "react";
import { Link } from "react-router";

import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import { useCompany } from "../../features/companies/use-company";
import { usePublisherOffers } from "../../features/publisher-workspace/use-publisher-offers";
import { useReportingDashboard } from "../../features/reporting/use-reporting-dashboard";
import type {
  ReportingMonetaryTotal,
  ReportingPerformanceRow,
} from "../../features/reporting/reporting.types";
import {
  ControlEmpty,
  ControlFeedback,
} from "../control-plane/control-plane-ui";

function dateInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function initialFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return dateInputValue(date);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function conversionRate(conversions: number, clicks: number): string {
  return clicks === 0
    ? "0.00%"
    : `${((conversions / clicks) * 100).toFixed(2)}%`;
}

function currencyFractionDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

function formatMoney(amountMinor: number, currency: string): string {
  const amount = amountMinor / 10 ** currencyFractionDigits(currency);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: Math.abs(amount) >= 100_000 ? "compact" : "standard",
      maximumFractionDigits: Math.abs(amount) >= 100_000 ? 1 : undefined,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatPayout(totals: readonly ReportingMonetaryTotal[]): string {
  const total = totals[0];

  if (total === undefined) {
    return "—";
  }

  return totals.length === 1
    ? formatMoney(total.payoutAmountMinor, total.currency)
    : `${totals.length} currencies`;
}

function OfferPerformanceTable({
  rows,
}: {
  rows: readonly ReportingPerformanceRow[];
}) {
  return (
    <GlassPanel as="section" className="dashboard-report-card">
      <div className="dashboard-card-heading">
        <div>
          <span>My performance</span>
          <h2>Offer results</h2>
        </div>
        <Link to="/reports/offers">View report</Link>
      </div>

      {rows.length === 0 ? (
        <ControlEmpty
          icon="table_rows"
          message="Clicks and conversions will appear after your tracking links receive traffic."
          title="No performance data"
        />
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Offer</th>
                <th>Clicks</th>
                <th>Conversions</th>
                <th>Approved</th>
                <th>Payout</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((row) => (
                <tr key={row.dimensionId}>
                  <td>
                    <strong>{row.dimensionName}</strong>
                  </td>
                  <td>{formatCompact(row.clicks)}</td>
                  <td>{formatCompact(row.conversions)}</td>
                  <td>{formatCompact(row.approvedConversions)}</td>
                  <td>{formatPayout(row.monetaryTotals)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassPanel>
  );
}

export function PublisherDashboard() {
  const company = useCompany();
  const publisherOffers = usePublisherOffers();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(() => dateInputValue(new Date()));
  const reportingFilters = useMemo(
    () => ({
      from: `${from}T00:00:00.000Z`,
      to: `${to}T23:59:59.999Z`,
    }),
    [from, to],
  );
  const reporting = useReportingDashboard(reportingFilters);

  if (company.status === "loading") {
    return (
      <GlassPanel as="section" className="dashboard-loading-state">
        <MaterialIcon className="spin" name="progress_activity" />
        <h1>Loading Publisher workspace</h1>
      </GlassPanel>
    );
  }

  if (company.activeCompany === null) {
    return (
      <GlassPanel as="section" className="dashboard-setup-state">
        <MaterialIcon name="dashboard" />
        <h1>Select a company</h1>
        <p>Your Publisher workspace requires an active company context.</p>
      </GlassPanel>
    );
  }

  if (publisherOffers.status === "forbidden") {
    return (
      <GlassPanel as="section" className="dashboard-setup-state">
        <MaterialIcon name="dashboard" />
        <h1>Publisher access unavailable</h1>
        <p>An active Publisher membership is required for this workspace.</p>
      </GlassPanel>
    );
  }

  if (
    reporting.isLoading ||
    publisherOffers.status === "loading" ||
    reporting.dashboard === null
  ) {
    return (
      <GlassPanel as="section" className="dashboard-loading-state">
        <MaterialIcon className="spin" name="progress_activity" />
        <h1>Loading Publisher dashboard</h1>
      </GlassPanel>
    );
  }

  const dashboard = reporting.dashboard;
  const metrics = [
    {
      label: "Clicks",
      value: formatCompact(dashboard.totals.clicks),
      icon: "ads_click",
      context: "Your attributed traffic",
      path: "/reports/offers",
    },
    {
      label: "Conversions",
      value: formatCompact(dashboard.totals.conversions),
      icon: "sync_alt",
      context: `${conversionRate(
        dashboard.totals.conversions,
        dashboard.totals.clicks,
      )} conversion rate`,
      path: "/reports/offers",
    },
    {
      label: "Approved",
      value: formatCompact(dashboard.totals.approvedConversions),
      icon: "verified",
      context: "Approved conversions",
      path: "/reports/offers",
    },
    {
      label: "Payout",
      value: formatPayout(dashboard.totals.monetaryTotals),
      icon: "payments",
      context: "Approved Publisher payout",
      path: "/reports/offers",
    },
    {
      label: "Assigned Offers",
      value: formatCompact(publisherOffers.offers.length),
      icon: "local_offer",
      context: "Active Offers available to you",
      path: "/offers/manage",
    },
  ] as const;

  return (
    <div className="page-stack dashboard-page publisher-dashboard">
      <header className="company-dashboard-heading">
        <div>
          <span className="eyebrow-chip">
            <MaterialIcon name="dashboard" />
            Publisher Dashboard
          </span>
          <h1>{company.activeCompany.name}</h1>
          <p>
            Review only your assigned Offers, traffic, conversions, and payout.
          </p>
        </div>

        <div className="dashboard-date-filter dashboard-date-filter--compact">
          <label>
            <span>From</span>
            <input
              max={to}
              onChange={(event) => setFrom(event.currentTarget.value)}
              type="date"
              value={from}
            />
          </label>
          <label>
            <span>To</span>
            <input
              min={from}
              onChange={(event) => setTo(event.currentTarget.value)}
              type="date"
              value={to}
            />
          </label>
          <button
            className="control-icon-button"
            disabled={publisherOffers.isRefreshing}
            onClick={() =>
              void Promise.all([reporting.refresh(), publisherOffers.refresh()])
            }
            title="Refresh Publisher dashboard"
            type="button"
          >
            <MaterialIcon name="refresh" />
          </button>
        </div>
      </header>

      <ControlFeedback
        error={reporting.error ?? publisherOffers.error}
        message={null}
      />

      <section
        aria-label="Publisher dashboard metrics"
        className="dashboard-catalog-metrics publisher-dashboard__metrics"
      >
        {metrics.map((metric) => (
          <Link
            className="dashboard-metric-link"
            key={metric.label}
            to={metric.path}
          >
            <GlassPanel as="article" className="dashboard-catalog-metric">
              <span className="dashboard-catalog-metric__icon">
                <MaterialIcon name={metric.icon} />
              </span>
              <div>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.context}</small>
              </div>
              <MaterialIcon
                className="dashboard-metric-link__arrow"
                name="arrow_forward"
              />
            </GlassPanel>
          </Link>
        ))}
      </section>

      <div className="dashboard-report-grid publisher-dashboard__content">
        <OfferPerformanceTable rows={dashboard.offers} />

        <GlassPanel as="section" className="dashboard-report-card">
          <div className="dashboard-card-heading">
            <div>
              <span>Publisher workspace</span>
              <h2>Assigned Offers</h2>
            </div>
            <Link to="/offers/manage">View all</Link>
          </div>

          {publisherOffers.offers.length === 0 ? (
            <ControlEmpty
              icon="local_offer"
              message="Your Manager has not assigned an active Offer yet."
              title="No assigned Offers"
            />
          ) : (
            <div className="publisher-dashboard__offer-list">
              {publisherOffers.offers.slice(0, 6).map((offer) => (
                <article key={offer.id}>
                  <div>
                    <span>Offer #{offer.publicId}</span>
                    <strong>{offer.name}</strong>
                    <small>
                      {offer.trackingDomainHostname ??
                        "Tracking Domain assigned when the link is created"}
                    </small>
                  </div>
                  <Link
                    aria-label={`Create or review tracking links for ${offer.name}`}
                    to="/tracking-links"
                  >
                    <MaterialIcon name="link" />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
