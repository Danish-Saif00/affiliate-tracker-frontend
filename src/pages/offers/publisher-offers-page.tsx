import { useMemo, useState } from "react";
import { Link } from "react-router";

import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import {
  copyOfferShareValue,
  formatOfferCountries,
  formatOfferDevices,
  type OfferShareMode,
} from "../../features/offers/offer-share-content";
import type { PublisherOffer } from "../../features/publisher-workspace/publisher-workspace.types";
import { usePublisherOffers } from "../../features/publisher-workspace/use-publisher-offers";
import {
  ControlEmpty,
  ControlFeedback,
  ControlLoading,
} from "../control-plane/control-plane-ui";

function formatUpdatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPayout(offer: PublisherOffer): string {
  if (offer.payoutAmountMinor === null || offer.payoutCurrency === null) {
    return "Not configured";
  }

  const fractionDigits =
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: offer.payoutCurrency,
    }).resolvedOptions().maximumFractionDigits ?? 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: offer.payoutCurrency,
  }).format(offer.payoutAmountMinor / 10 ** fractionDigits);
}

function formatSchedule(offer: PublisherOffer): string {
  const days = offer.activeDays.join(", ");
  const time =
    offer.activeStartTime === null || offer.activeEndTime === null
      ? "All day"
      : `${offer.activeStartTime.slice(0, 5)}â€“${offer.activeEndTime.slice(0, 5)}`;

  return `Days ${days} Â· ${time} Â· ${offer.timezone}`;
}

export function PublisherOffersPage() {
  const publisherOffers = usePublisherOffers();
  const [search, setSearch] = useState("");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const filteredOffers = useMemo(() => {
    const needle = search.trim().toLowerCase();

    if (needle.length === 0) {
      return publisherOffers.offers;
    }

    return publisherOffers.offers.filter(
      (offer) =>
        offer.name.toLowerCase().includes(needle) ||
        offer.publicId.toString().includes(needle) ||
        offer.countries.some((country) =>
          country.toLowerCase().includes(needle),
        ) ||
        offer.trackingDomainHostname?.toLowerCase().includes(needle) === true,
    );
  }, [publisherOffers.offers, search]);

  async function copyOffer(
    offer: PublisherOffer,
    mode: OfferShareMode,
  ): Promise<void> {
    const value = mode === "text" ? offer.promotionalText : offer.trackingLink;

    setCopyError(null);
    setCopyMessage(null);

    if (value === null) {
      setCopyError(
        mode === "text"
          ? "Promotional text is unavailable until the tracking link is active."
          : "The tracking link is unavailable until the Offer Domain and assignment are active.",
      );
      return;
    }

    try {
      await copyOfferShareValue(value);
      setCopyMessage(
        mode === "text"
          ? "Promotional text copied."
          : "Tracking link copied.",
      );
    } catch (error: unknown) {
      setCopyError(
        error instanceof Error
          ? error.message
          : "The Offer content could not be copied.",
      );
    }
  }

  if (publisherOffers.status === "forbidden") {
    return (
      <GlassPanel as="section" className="dashboard-setup-state">
        <MaterialIcon name="local_offer" />
        <h1>Assigned Offers unavailable</h1>
        <p>An active Publisher membership is required.</p>
      </GlassPanel>
    );
  }

  if (
    publisherOffers.status === "idle" ||
    publisherOffers.status === "loading"
  ) {
    return <ControlLoading label="Assigned Offers" />;
  }

  return (
    <div className="page-stack publisher-offers-page">
      <ControlFeedback
        error={copyError ?? publisherOffers.error}
        message={copyMessage}
      />

      <GlassPanel as="section" className="publisher-offers-toolbar">
        <label>
          <span>Search assigned Offers</span>
          <div className="publisher-offers-toolbar__search">
            <MaterialIcon name="search" />
            <input
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Offer name, public ID, country, or Domain"
              type="search"
              value={search}
            />
          </div>
        </label>
        <div className="publisher-offers-toolbar__actions">
          <div className="publisher-offers-toolbar__count">
            <span>Active assignments</span>
            <strong>{publisherOffers.offers.length}</strong>
          </div>
          <button
            className="control-icon-button"
            disabled={publisherOffers.isRefreshing}
            onClick={() => void publisherOffers.refresh()}
            title="Refresh assigned Offers"
            type="button"
          >
            <MaterialIcon
              className={publisherOffers.isRefreshing ? "spin" : undefined}
              name="refresh"
            />
          </button>
        </div>
      </GlassPanel>

      {filteredOffers.length === 0 ? (
        <GlassPanel as="section" className="control-card">
          <ControlEmpty
            icon="local_offer"
            message={
              publisherOffers.offers.length === 0
                ? "Your Manager has not assigned an active Offer yet."
                : "No assigned Offer matches the current search."
            }
            title={
              publisherOffers.offers.length === 0
                ? "No assigned Offers"
                : "No matching Offers"
            }
          />
        </GlassPanel>
      ) : (
        <section aria-label="Assigned Offers" className="publisher-offer-grid">
          {filteredOffers.map((offer) => {
            return (
              <GlassPanel
                as="article"
                className="publisher-offer-card"
                key={offer.id}
              >
                <details className="offer-collapsible-card">
                  <summary>
                    <div className="publisher-offer-card__summary-layout">
                      <div className="publisher-offer-card__content">
                        <div className="publisher-offer-card__heading-row">
                          <div className="publisher-offer-card__identity">
                            <span>Offer #{offer.publicId}</span>
                            <h2>{offer.name}</h2>
                          </div>

                          <span
                            className={
                              offer.trackingLink === null
                                ? "publisher-offer-card__status publisher-offer-card__status--setup"
                                : "publisher-offer-card__status publisher-offer-card__status--live"
                            }
                          >
                            <MaterialIcon
                              name={
                                offer.trackingLink === null
                                  ? "schedule"
                                  : "check_circle"
                              }
                            />
                            {offer.trackingLink === null
                              ? "Setup pending"
                              : "Ready to promote"}
                          </span>
                        </div>

                        <div className="publisher-offer-card__meta">
                          <span>
                            <MaterialIcon name="payments" />
                            {formatPayout(offer)}
                          </span>
                          <span>
                            <MaterialIcon name="public" />
                            {offer.trackingDomainHostname ?? "Domain unavailable"}
                          </span>
                          <span>
                            <MaterialIcon name="location_on" />
                            {formatOfferCountries(offer.countries)}
                          </span>
                        </div>
                      </div>

                      <div
                        className="publisher-offer-card__quick-actions"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <button
                          className="publisher-offer-card__copy-button"
                          disabled={offer.promotionalText === null}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void copyOffer(offer, "text");
                          }}
                          title="Copy promotional text"
                          type="button"
                        >
                          <MaterialIcon name="text_snippet" />
                          Copy Text
                        </button>
                        <button
                          className="publisher-offer-card__copy-button publisher-offer-card__copy-button--primary"
                          disabled={offer.trackingLink === null}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void copyOffer(offer, "link");
                          }}
                          title={
                            offer.trackingLink === null
                              ? "Tracking link is not available yet"
                              : "Copy tracking link"
                          }
                          type="button"
                        >
                          <MaterialIcon
                            name={
                              offer.trackingLink === null ? "lock" : "link"
                            }
                          />
                          {offer.trackingLink === null
                            ? "Link unavailable"
                            : "Copy Link"}
                        </button>
                      </div>
                    </div>
                    <MaterialIcon
                      className="publisher-offer-card__chevron"
                      name="expand_more"
                    />
                  </summary>

                  <div className="offer-collapsible-card__body">
                    {offer.description !== null && <p>{offer.description}</p>}

                    <dl className="publisher-offer-card__details">
                      <div>
                        <dt>Publisher ID</dt>
                        <dd>{offer.publisherPublicId}</dd>
                      </div>
                      <div>
                        <dt>Countries</dt>
                        <dd>{formatOfferCountries(offer.countries)}</dd>
                      </div>
                      <div>
                        <dt>Devices</dt>
                        <dd>{formatOfferDevices(offer.devices)}</dd>
                      </div>
                      <div>
                        <dt>Tracking Domain</dt>
                        <dd>{offer.trackingDomainHostname ?? "Unavailable"}</dd>
                      </div>
                      <div>
                        <dt>Payout</dt>
                        <dd>{formatPayout(offer)}</dd>
                      </div>
                      <div>
                        <dt>Schedule</dt>
                        <dd>{formatSchedule(offer)}</dd>
                      </div>
                      <div>
                        <dt>Expires</dt>
                        <dd>
                          {offer.expiresAt === null
                            ? "No expiry"
                            : formatUpdatedAt(offer.expiresAt)}
                        </dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>{formatUpdatedAt(offer.updatedAt)}</dd>
                      </div>
                    </dl>

                    <div className="publisher-offer-card__actions">
                      <Link
                        className="control-secondary-button"
                        to="/reports/offers"
                      >
                        <MaterialIcon name="analytics" />
                        View Performance
                      </Link>
                    </div>
                  </div>
                </details>
              </GlassPanel>
            );
          })}
        </section>
      )}
    </div>
  );
}
