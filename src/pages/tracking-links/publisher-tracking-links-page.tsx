import { type FormEvent, useMemo, useState } from "react";

import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import type {
  CompanyLinkIdentifierMode,
  CompanyRestrictedSharePlatform,
  TrackingLink,
  TrackingLinkStatus,
} from "../../features/control-plane/control-plane.types";
import {
  useCustomization,
  useTrackingLinks,
} from "../../features/control-plane/use-control-plane";
import { usePublisherOffers } from "../../features/publisher-workspace/use-publisher-offers";
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
import {
  formatDateTime,
  formatQueryParameters,
  parseQueryParameterLines,
  plainTextTrackingLinkUrl,
  trackingLinkUrl,
} from "../control-plane/control-plane-formatters";

function PublisherTrackingLinkCard({
  link,
  disabled,
  linkIdentifierMode,
  plainTextSharingEnabled,
  restrictedSharePlatforms,
  onCopy,
  onUpdate,
  onClone,
  onArchive,
}: {
  link: TrackingLink;
  disabled: boolean;
  linkIdentifierMode: CompanyLinkIdentifierMode;
  plainTextSharingEnabled: boolean;
  restrictedSharePlatforms: readonly CompanyRestrictedSharePlatform[];
  onCopy: (value: string, label: string) => Promise<void>;
  onUpdate: (input: {
    readonly linkId: string;
    readonly customSlug: string | null;
    readonly destinationUrl: string;
    readonly queryParameters: Readonly<Record<string, string>>;
    readonly status: Exclude<TrackingLinkStatus, "archived">;
  }) => Promise<void>;
  onClone: (linkId: string) => Promise<void>;
  onArchive: (linkId: string) => Promise<void>;
}) {
  const publicUrl = trackingLinkUrl(
    link.hostname,
    link.trackingCode,
    link.customSlug,
    {
      identifierMode: linkIdentifierMode,
      queryParameters: link.queryParameters,
    },
  );
  const plainTextUrl = plainTextTrackingLinkUrl(publicUrl);
  const plainTextCopyTitle =
    restrictedSharePlatforms.length === 0
      ? "Copy plain-text tracking URL"
      : `Copy plain-text URL for ${restrictedSharePlatforms
          .map(
            (platform) => platform.charAt(0).toUpperCase() + platform.slice(1),
          )
          .join(", ")}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const customSlug = String(formData.get("customSlug") ?? "").trim();

    await onUpdate({
      linkId: link.id,
      customSlug: customSlug.length === 0 ? null : customSlug,
      destinationUrl: link.destinationUrl,
      queryParameters: parseQueryParameterLines(
        String(formData.get("queryParameters") ?? ""),
      ),
      status: String(formData.get("status") ?? link.status) as Exclude<
        TrackingLinkStatus,
        "archived"
      >,
    });
  }

  return (
    <article className="control-record">
      <div className="control-record__summary control-record__summary--static">
        <span className="control-record-icon">
          <MaterialIcon name="link" />
        </span>
        <span>
          <strong>{link.offerName}</strong>
          <small>
            {link.hostname} ·{" "}
            {link.source === "manual" ? "Manual" : "Assignment generated"} ·
            Updated {formatDateTime(link.updatedAt)}
          </small>
        </span>
        <ControlStatus status={link.status} />
      </div>

      <div className="control-url-row">
        <code>{publicUrl}</code>
        <button
          aria-label="Copy tracking URL"
          className="control-icon-button"
          onClick={() => void onCopy(publicUrl, "Tracking URL")}
          title="Copy tracking URL"
          type="button"
        >
          <MaterialIcon name="content_copy" />
        </button>
      </div>

      {plainTextSharingEnabled && (
        <div className="control-url-row">
          <code>{plainTextUrl}</code>
          <button
            aria-label="Copy plain-text tracking URL"
            className="control-icon-button"
            onClick={() => void onCopy(plainTextUrl, "Plain-text tracking URL")}
            title={plainTextCopyTitle}
            type="button"
          >
            <MaterialIcon name="text_snippet" />
          </button>
        </div>
      )}

      {link.source === "publisher_assignment" && link.status !== "archived" && (
        <small>
          Assignment synchronization may update this link&apos;s domain and
          destination. Pausing or archiving the link remains durable.
        </small>
      )}

      {link.source === "publisher_assignment" && link.status === "archived" && (
        <small>
          This assignment-generated link is retained to prevent automatic
          recreation.
        </small>
      )}

      <div className="control-action-row">
        <button
          className="control-secondary-button"
          disabled={disabled}
          onClick={() => void onClone(link.id)}
          type="button"
        >
          <MaterialIcon name="content_copy" />
          Clone
        </button>
        {link.status !== "archived" && (
          <button
            className="control-secondary-button"
            disabled={disabled}
            onClick={() => void onArchive(link.id)}
            type="button"
          >
            <MaterialIcon name="archive" />
            Archive
          </button>
        )}
      </div>

      {link.status !== "archived" && (
        <form
          className="control-inline-editor"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label>
            <span>Custom slug</span>
            <input
              defaultValue={link.customSlug ?? ""}
              disabled={disabled}
              name="customSlug"
            />
          </label>
          <label>
            <span>Status</span>
            <select
              defaultValue={link.status}
              disabled={disabled}
              name="status"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </label>
          <label className="control-field--wide">
            <span>Query parameters</span>
            <textarea
              defaultValue={formatQueryParameters(link.queryParameters)}
              disabled={disabled}
              name="queryParameters"
              placeholder={"utm_source=publisher\nsub1=campaign-a"}
              rows={3}
            />
          </label>
          <button
            className="control-secondary-button"
            disabled={disabled}
            type="submit"
          >
            <MaterialIcon name="save" />
            Save link
          </button>
        </form>
      )}
    </article>
  );
}
export function PublisherTrackingLinksPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TrackingLinkStatus | "all">("all");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const links = useTrackingLinks(status === "all" ? {} : { status });
  const publisherOffers = usePublisherOffers();
  const customization = useCustomization();
  const selectedOffer =
    publisherOffers.offers.find((offer) => offer.id === selectedOfferId) ??
    null;
  const defaultLinkQueryParameters =
    customization.customization?.defaultLinkQueryParameters ?? {};
  const linkIdentifierMode =
    customization.customization?.linkIdentifierMode ?? "slug_or_code";
  const plainTextSharingEnabled =
    customization.customization?.plainTextSharingEnabled ?? true;
  const restrictedSharePlatforms =
    customization.customization?.restrictedSharePlatforms ??
    (["snapchat", "instagram", "facebook"] as const);
  const filteredLinks = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return links.links.filter(
      (link) =>
        normalized.length === 0 ||
        link.offerName.toLowerCase().includes(normalized) ||
        link.hostname.toLowerCase().includes(normalized) ||
        link.trackingCode.toLowerCase().includes(normalized),
    );
  }, [links.links, search]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setActionError(null);

    if (
      selectedOffer === null ||
      selectedOffer.trackingDomainId === null ||
      selectedOffer.trackingDomainHostname === null
    ) {
      setActionError(
        "The selected Offer does not have an active Publisher tracking domain.",
      );
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const customSlug = String(formData.get("customSlug") ?? "").trim();

    try {
      const created = await links.createLink({
        offerId: selectedOffer.id,
        trackingDomainId: selectedOffer.trackingDomainId,
        ...(customSlug.length > 0 ? { customSlug } : {}),
        queryParameters: {
          ...defaultLinkQueryParameters,
          ...parseQueryParameterLines(
            String(formData.get("queryParameters") ?? ""),
          ),
        },
        status: String(formData.get("status") ?? "active") as
          "draft" | "active",
      });

      form.reset();
      setSelectedOfferId("");
      setFeedback(`Tracking link for ${created.offerName} was created.`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The tracking link could not be created.",
      );
    }
  }

  async function handleUpdate(input: {
    readonly linkId: string;
    readonly customSlug: string | null;
    readonly destinationUrl: string;
    readonly queryParameters: Readonly<Record<string, string>>;
    readonly status: Exclude<TrackingLinkStatus, "archived">;
  }) {
    setFeedback(null);
    setActionError(null);

    try {
      const updated = await links.updateLink(input);
      setFeedback(`Tracking link for ${updated.offerName} was updated.`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The tracking link could not be updated.",
      );
    }
  }

  async function handleClone(linkId: string) {
    setFeedback(null);
    setActionError(null);

    try {
      const cloned = await links.cloneLink(linkId);
      setFeedback(
        `Tracking link for ${cloned.offerName} was cloned as a fresh draft.`,
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The tracking link could not be cloned.",
      );
    }
  }

  async function handleArchive(linkId: string) {
    if (!window.confirm("Archive this tracking link?")) {
      return;
    }

    setFeedback(null);
    setActionError(null);

    try {
      const archived = await links.archiveLink(linkId);
      setFeedback(`Tracking link for ${archived.offerName} was archived.`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The tracking link could not be archived.",
      );
    }
  }

  async function handleCopy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setActionError(null);
      setFeedback(`${label} copied to the clipboard.`);
    } catch {
      setActionError(`The browser could not copy the ${label.toLowerCase()}.`);
    }
  }

  if (links.status === "forbidden" || publisherOffers.status === "forbidden") {
    return (
      <ControlAccessDenied
        message="An active Publisher membership is required to manage tracking links."
        title="Tracking links unavailable"
      />
    );
  }

  if (
    links.status === "loading" ||
    links.status === "idle" ||
    publisherOffers.status === "loading" ||
    publisherOffers.status === "idle"
  ) {
    return <ControlLoading label="Publisher tracking links" />;
  }

  const offersWithDomains = publisherOffers.offers.filter(
    (offer) =>
      offer.trackingDomainId !== null && offer.trackingDomainHostname !== null,
  );

  return (
    <div className="control-page">
      <ControlModuleHeader
        description={
          <>
            Create redirect links only for Offers assigned to your Publisher
            account in <strong>{links.companyName}</strong>.
          </>
        }
        eyebrow="Publisher Attribution"
        icon="link"
        stats={[
          { label: "Links", value: links.links.length },
          {
            label: "Active",
            value: links.links.filter((link) => link.status === "active")
              .length,
          },
          { label: "Eligible Offers", value: offersWithDomains.length },
        ]}
        title="My Tracking Links"
      />

      <ControlFeedback
        error={
          actionError ??
          links.error ??
          publisherOffers.error ??
          customization.error
        }
        message={feedback}
      />

      <div className="control-layout-grid">
        {links.permissions.canManageTracking && (
          <GlassPanel as="section" className="control-side-card">
            <ControlCardHeading
              description="The destination and tracking domain are locked to the selected assigned Offer."
              eyebrow="Secure Link Builder"
              title="Create tracking link"
            />
            <form
              className="control-form"
              onSubmit={(event) => void handleCreate(event)}
            >
              <label>
                <span>Assigned Offer</span>
                <select
                  name="offerId"
                  onChange={(event) =>
                    setSelectedOfferId(event.currentTarget.value)
                  }
                  required
                  value={selectedOfferId}
                >
                  <option value="">Select assigned Offer</option>
                  {offersWithDomains.map((offer) => (
                    <option key={offer.id} value={offer.id}>
                      {offer.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Tracking domain</span>
                <input
                  disabled
                  value={
                    selectedOffer?.trackingDomainHostname ??
                    "Select an assigned Offer"
                  }
                />
              </label>
              <label>
                <span>Custom slug</span>
                <input
                  name="customSlug"
                  placeholder="summer-campaign"
                  spellCheck={false}
                />
              </label>
              <label>
                <span>Query parameters</span>
                <textarea
                  defaultValue={formatQueryParameters(
                    defaultLinkQueryParameters,
                  )}
                  key={
                    customization.customization?.updatedAt ?? "link-defaults"
                  }
                  name="queryParameters"
                  placeholder={"utm_source=publisher\nsub1=campaign-a"}
                  rows={4}
                />
              </label>
              <label>
                <span>Initial status</span>
                <select defaultValue="active" name="status">
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              <button
                className="primary-gradient-button"
                disabled={
                  links.isMutating ||
                  selectedOffer?.trackingDomainId === null ||
                  selectedOffer === null
                }
                type="submit"
              >
                <MaterialIcon name="add_link" />
                Create link
              </button>
              {offersWithDomains.length === 0 && (
                <div className="control-info-note">
                  <MaterialIcon name="domain_disabled" />
                  <span>
                    No assigned Offer currently has an active tracking domain.
                  </span>
                </div>
              )}
            </form>
          </GlassPanel>
        )}

        <GlassPanel
          as="section"
          className={`control-main-card control-directory-surface ${
            links.permissions.canManageTracking ? "" : "control-main-card--full"
          }`}
        >
          <ControlCardHeading
            action={
              <RefreshButton
                disabled={links.isMutating}
                onClick={() =>
                  void Promise.all([links.refresh(), publisherOffers.refresh()])
                }
              />
            }
            description={`${filteredLinks.length} matching Publisher link(s).`}
            eyebrow="My Link Directory"
            title="Generated links"
          />
          <div className="control-filter-bar">
            <label>
              <MaterialIcon name="search" />
              <input
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search Offer, hostname or code"
                value={search}
              />
            </label>
            <select
              onChange={(event) =>
                setStatus(
                  event.currentTarget.value as TrackingLinkStatus | "all",
                )
              }
              value={status}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="control-record-list">
            {filteredLinks.length === 0 ? (
              <ControlEmpty
                icon="link_off"
                message="Create a link or change the current filters."
                title="No matching tracking links"
              />
            ) : (
              filteredLinks.map((link) => (
                <PublisherTrackingLinkCard
                  disabled={links.isMutating}
                  key={link.id}
                  link={link}
                  linkIdentifierMode={linkIdentifierMode}
                  onArchive={handleArchive}
                  onClone={handleClone}
                  onCopy={handleCopy}
                  onUpdate={handleUpdate}
                  plainTextSharingEnabled={plainTextSharingEnabled}
                  restrictedSharePlatforms={restrictedSharePlatforms}
                />
              ))
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
