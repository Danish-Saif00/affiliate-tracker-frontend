import { type FormEvent, useMemo, useState } from "react";

import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import { useTenantAdministration } from "../../features/tenant-administration/use-tenant-administration";
import { useTrackingDomains } from "../../features/tracking-networks/use-tracking-networks";
import type {
  CompanyLinkIdentifierMode,
  CompanyRestrictedSharePlatform,
  TrackingLink,
  TrackingLinkStatus,
} from "../../features/control-plane/control-plane.types";
import {
  useCustomization,
  useOffers,
  useTrackingLinks,
} from "../../features/control-plane/use-control-plane";
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

function TrackingLinkEditor({
  link,
  disabled,
  canEdit,
  canDeletePermanently,
  linkIdentifierMode,
  plainTextSharingEnabled,
  restrictedSharePlatforms,
  onCopy,
  onUpdate,
  onClone,
  onArchive,
  onDelete,
}: {
  link: TrackingLink;
  disabled: boolean;
  canEdit: boolean;
  canDeletePermanently: boolean;
  linkIdentifierMode: CompanyLinkIdentifierMode;
  plainTextSharingEnabled: boolean;
  restrictedSharePlatforms: readonly CompanyRestrictedSharePlatform[];
  onCopy: (value: string, label: string) => Promise<void>;
  onUpdate: (input: {
    linkId: string;
    customSlug: string | null;
    destinationUrl: string;
    queryParameters: Readonly<Record<string, string>>;
    status: Exclude<TrackingLinkStatus, "archived">;
  }) => Promise<void>;
  onClone: (linkId: string) => Promise<void>;
  onArchive: (linkId: string) => Promise<void>;
  onDelete: (linkId: string) => Promise<void>;
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
      destinationUrl: String(formData.get("destinationUrl") ?? ""),
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
            {link.ownerRole} · {link.hostname} ·{" "}
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

      <div className="control-meta-grid control-meta-grid--three">
        <div>
          <span>Offer</span>
          <strong>{link.offerCode}</strong>
        </div>
        <div>
          <span>Owner</span>
          <strong>{link.ownerUserId.slice(0, 12)}</strong>
        </div>
        <div>
          <span>Tracking code</span>
          <strong>{link.trackingCode.slice(0, 14)}</strong>
        </div>
        <div>
          <span>Source</span>
          <strong>
            {link.source === "manual" ? "Manual" : "Assignment generated"}
          </strong>
        </div>
      </div>

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

      {canEdit && (
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
          {canDeletePermanently &&
            link.status === "archived" &&
            link.source === "manual" && (
              <button
                className="control-danger-button"
                disabled={disabled}
                onClick={() => void onDelete(link.id)}
                type="button"
              >
                <MaterialIcon name="delete" />
                Delete permanently
              </button>
            )}
        </div>
      )}

      {canEdit && link.status !== "archived" && (
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
            <span>Destination URL</span>
            <input
              defaultValue={link.destinationUrl}
              disabled={disabled}
              name="destinationUrl"
              required
              type="url"
            />
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
export function TrackingLinksPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TrackingLinkStatus | "all">("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const links = useTrackingLinks(status === "all" ? {} : { status });
  const offers = useOffers({ status: "active" });
  const domains = useTrackingDomains();
  const customization = useCustomization();
  const defaultLinkQueryParameters =
    customization.customization?.defaultLinkQueryParameters ?? {};
  const defaultQueryParameterText = formatQueryParameters(
    defaultLinkQueryParameters,
  );
  const linkIdentifierMode =
    customization.customization?.linkIdentifierMode ?? "slug_or_code";
  const plainTextSharingEnabled =
    customization.customization?.plainTextSharingEnabled ?? true;
  const restrictedSharePlatforms =
    customization.customization?.restrictedSharePlatforms ??
    (["snapchat", "instagram", "facebook"] as const);
  const tenant = useTenantAdministration({
    search: "",
    role: "",
    membershipStatus: "",
    userStatus: "",
  });
  const activeDomains = useMemo(
    () => domains.domains.filter((domain) => domain.status === "active"),
    [domains.domains],
  );
  const eligibleOwners = useMemo(
    () =>
      tenant.directory.items.filter(
        (member) =>
          member.membershipStatus === "active" &&
          member.userStatus === "active" &&
          (member.role === "manager" || member.role === "publisher"),
      ),
    [tenant.directory.items],
  );
  const filteredLinks = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return links.links.filter(
      (link) =>
        normalized.length === 0 ||
        link.offerName.toLowerCase().includes(normalized) ||
        link.offerCode.toLowerCase().includes(normalized) ||
        link.hostname.toLowerCase().includes(normalized) ||
        link.trackingCode.toLowerCase().includes(normalized),
    );
  }, [links.links, search]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setActionError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const ownerMembershipId = String(
      formData.get("ownerMembershipId") ?? "",
    ).trim();
    const customSlug = String(formData.get("customSlug") ?? "").trim();
    const destinationUrl = String(formData.get("destinationUrl") ?? "").trim();

    try {
      const enteredQueryParameters = parseQueryParameterLines(
        String(formData.get("queryParameters") ?? ""),
      );
      const created = await links.createLink({
        offerId: String(formData.get("offerId") ?? ""),
        trackingDomainId: String(formData.get("trackingDomainId") ?? ""),
        ...(ownerMembershipId.length > 0 ? { ownerMembershipId } : {}),
        ...(customSlug.length > 0 ? { customSlug } : {}),
        ...(destinationUrl.length > 0 ? { destinationUrl } : {}),
        queryParameters: {
          ...defaultLinkQueryParameters,
          ...enteredQueryParameters,
        },
        status: String(formData.get("status") ?? "active") as
          "draft" | "active",
      });
      form.reset();
      setFeedback(`Tracking link for ${created.offerName} was created.`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The tracking link could not be created.",
      );
    }
  }

  async function handleUpdate(input: Parameters<typeof links.updateLink>[0]) {
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

  async function handleDelete(linkId: string) {
    if (
      !window.confirm(
        "Permanently delete this archived manual tracking link? This cannot be undone.",
      )
    ) {
      return;
    }

    setFeedback(null);
    setActionError(null);

    try {
      await links.deleteLink(linkId);
      setFeedback("The archived manual tracking link was permanently deleted.");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The tracking link could not be permanently deleted.",
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

  if (links.status === "forbidden") {
    return (
      <ControlAccessDenied
        message="Your current role does not have access to tracking links."
        title="Tracking links unavailable"
      />
    );
  }

  if (links.status === "loading" || links.status === "idle") {
    return <ControlLoading label="tracking links" />;
  }

  return (
    <div className="control-page">
      <ControlModuleHeader
        description={
          <>
            Generate publisher-safe redirect URLs with controlled attribution
            parameters for <strong>{links.companyName}</strong>.
          </>
        }
        eyebrow="Attribution Routing"
        icon="link"
        stats={[
          { label: "Total", value: links.links.length },
          {
            label: "Active",
            value: links.links.filter((link) => link.status === "active")
              .length,
          },
          { label: "Domains", value: activeDomains.length },
        ]}
        title="Tracking Links"
      />

      <ControlFeedback
        error={
          actionError ?? links.error ?? domains.error ?? customization.error
        }
        message={feedback}
      />

      <div className="control-layout-grid">
        {links.permissions.canManageTracking && (
          <GlassPanel as="section" className="control-side-card">
            <ControlCardHeading
              description="Active offers require an assignment and an active tracking domain."
              eyebrow="Link Builder"
              title="Create tracking link"
            />
            <form
              className="control-form"
              onSubmit={(event) => void handleCreate(event)}
            >
              <label>
                <span>Active offer</span>
                <select name="offerId" required>
                  <option value="">Select offer</option>
                  {offers.offers.map((offer) => (
                    <option key={offer.id} value={offer.id}>
                      {offer.name} · {offer.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Active tracking domain</span>
                <select name="trackingDomainId" required>
                  <option value="">Select domain</option>
                  {activeDomains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.hostname}
                    </option>
                  ))}
                </select>
              </label>
              {links.permissions.canManage && (
                <label>
                  <span>Owner</span>
                  <select name="ownerMembershipId" required>
                    <option value="">Select assigned member</option>
                    {eligibleOwners.map((member) => (
                      <option
                        key={member.membershipId}
                        value={member.membershipId}
                      >
                        {member.displayName ??
                          member.email ??
                          member.userId.slice(0, 8)}{" "}
                        · {member.role}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                <span>Custom slug</span>
                <input
                  name="customSlug"
                  placeholder="summer-campaign"
                  spellCheck={false}
                />
              </label>
              <label>
                <span>Destination override</span>
                <input
                  name="destinationUrl"
                  placeholder="Optional offer override"
                  type="url"
                />
              </label>
              <label>
                <span>Query parameters</span>
                <textarea
                  defaultValue={defaultQueryParameterText}
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
                  activeDomains.length === 0 ||
                  offers.offers.length === 0
                }
                type="submit"
              >
                <MaterialIcon name="add_link" />
                Create link
              </button>
              {activeDomains.length === 0 && (
                <div className="control-info-note">
                  <MaterialIcon name="dns" />
                  <span>
                    Verify and activate a tracking domain before creating a live
                    link.
                  </span>
                </div>
              )}
            </form>
          </GlassPanel>
        )}

        <GlassPanel
          as="section"
          className={`control-main-card control-directory-surface ${links.permissions.canManageTracking ? "" : "control-main-card--full"}`}
        >
          <div className="control-directory-actions">
            <RefreshButton
              disabled={links.isMutating}
              onClick={() => void links.refresh()}
            />
          </div>
          <div className="control-filter-bar">
            <label>
              <MaterialIcon name="search" />
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search offer, hostname or code"
                value={search}
              />
            </label>
            <select
              onChange={(event) =>
                setStatus(event.target.value as TrackingLinkStatus | "all")
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
                <TrackingLinkEditor
                  canDeletePermanently={links.permissions.canManage}
                  canEdit={
                    links.permissions.canManage ||
                    links.membershipId === link.ownerMembershipId
                  }
                  disabled={links.isMutating}
                  key={link.id}
                  link={link}
                  linkIdentifierMode={linkIdentifierMode}
                  onArchive={handleArchive}
                  onClone={handleClone}
                  onCopy={handleCopy}
                  onDelete={handleDelete}
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
