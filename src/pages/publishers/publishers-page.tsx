import { type FormEvent, useMemo, useState } from "react";

import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import { TIMEZONE_OPTIONS } from "../../features/catalog/catalog-options";
import type {
  CatalogPayoutType,
  CatalogPublisher,
} from "../../features/catalog/catalog.types";
import { useCatalogOperations } from "../../features/catalog/use-catalog";
import type { CompanyMembershipStatus } from "../../features/auth/auth.types";
import { useTenantAdministration } from "../../features/tenant-administration/use-tenant-administration";
import {
  CatalogPagination,
  CatalogToolbar,
  MultiSelectDropdown,
  RowActions,
  ToggleField,
} from "../control-plane/catalog-page-ui";
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
import { formatDateTime } from "../control-plane/control-plane-formatters";

const PAGE_SIZE = 10;

type PublisherFormState = {
  timezone: string;
  payoutType: CatalogPayoutType;
  fixedPayoutAmountMinor: string;
  payoutCurrency: string;
  postbackUrl: string;
  emailNotificationsEnabled: boolean;
  assignedOfferIds: readonly string[];
};

function formFromPublisher(publisher: CatalogPublisher): PublisherFormState {
  return {
    timezone: publisher.timezone,
    payoutType: publisher.payoutType,
    fixedPayoutAmountMinor:
      publisher.fixedPayoutAmountMinor === null
        ? ""
        : publisher.fixedPayoutAmountMinor.toString(),
    payoutCurrency: publisher.payoutCurrency ?? "",
    postbackUrl: publisher.postbackUrl ?? "",
    emailNotificationsEnabled: publisher.emailNotificationsEnabled,
    assignedOfferIds: publisher.assignedOfferIds,
  };
}

function publisherPayoutLabel(publisher: CatalogPublisher): string {
  if (publisher.payoutType === "per_offer") {
    return "Per offer";
  }

  if (
    publisher.fixedPayoutAmountMinor === null ||
    publisher.payoutCurrency === null
  ) {
    return "Fixed payout incomplete";
  }

  return `${publisher.payoutCurrency} ${publisher.fixedPayoutAmountMinor} minor`;
}

export function PublishersPage() {
  const catalog = useCatalogOperations();
  const tenant = useTenantAdministration({
    search: "",
    role: "publisher",
    membershipStatus: "",
    userStatus: "",
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PublisherFormState>({
    timezone: "UTC",
    payoutType: "per_offer",
    fixedPayoutAmountMinor: "",
    payoutCurrency: "",
    postbackUrl: "",
    emailNotificationsEnabled: true,
    assignedOfferIds: [],
  });
  const [search, setSearch] = useState("");
  const [membershipStatus, setMembershipStatus] = useState("all");
  const [createdAfter, setCreatedAfter] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const snapshot = catalog.snapshot;

  const pendingInvitations = useMemo(
    () =>
      tenant.invitations.filter(
        (invitation) =>
          invitation.role === "publisher" && invitation.status === "pending",
      ),
    [tenant.invitations],
  );

  const offerOptions = useMemo(
    () =>
      (snapshot?.offers ?? [])
        .filter((offer) => offer.status !== "archived")
        .map(
          (offer) =>
            [
              offer.id,
              `${offer.name} (${offer.code}) · ${offer.status}`,
            ] as const,
        ),
    [snapshot],
  );

  const filteredPublishers = useMemo(() => {
    const items = snapshot?.publishers ?? [];
    const needle = search.trim().toLowerCase();

    return items.filter((publisher) => {
      const label =
        `${publisher.displayName ?? ""} ${publisher.email ?? ""}`.toLowerCase();
      const matchesCreatedAfter =
        createdAfter.length === 0 ||
        new Date(publisher.createdAt).getTime() >=
          new Date(`${createdAfter}T00:00:00`).getTime();

      return (
        (needle.length === 0 || label.includes(needle)) &&
        (membershipStatus === "all" ||
          publisher.membershipStatus === membershipStatus) &&
        matchesCreatedAfter
      );
    });
  }, [createdAfter, membershipStatus, search, snapshot]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredPublishers.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredPublishers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function resetFeedback(): void {
    setMessage(null);
    setActionError(null);
  }

  async function handleInvite(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    resetFeedback();

    try {
      await tenant.createInvitation({
        email: inviteEmail,
        role: "publisher",
      });
      setMessage(`Publisher invitation was queued for ${inviteEmail.trim()}.`);
      setInviteEmail("");
      await Promise.all([catalog.refresh(), tenant.refresh()]);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The Publisher invitation could not be created.",
      );
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (editingId === null) {
      return;
    }

    resetFeedback();

    const fixedPayoutAmountMinor =
      form.payoutType === "fixed_member"
        ? Number(form.fixedPayoutAmountMinor)
        : null;
    const payoutCurrency =
      form.payoutType === "fixed_member"
        ? form.payoutCurrency.trim().toUpperCase()
        : null;

    if (
      form.payoutType === "fixed_member" &&
      (fixedPayoutAmountMinor === null ||
        payoutCurrency === null ||
        !Number.isSafeInteger(fixedPayoutAmountMinor) ||
        fixedPayoutAmountMinor < 1 ||
        payoutCurrency.length !== 3)
    ) {
      setActionError(
        "Fixed payout requires a positive minor-unit amount and a three-letter currency.",
      );
      return;
    }

    try {
      await catalog.updatePublisher({
        membershipId: editingId,
        timezone: form.timezone,
        payoutType: form.payoutType,
        fixedPayoutAmountMinor,
        payoutCurrency,
        postbackUrl: form.postbackUrl.trim() || null,
        emailNotificationsEnabled: form.emailNotificationsEnabled,
        assignedOfferIds: form.assignedOfferIds,
      });
      setMessage("Publisher configuration and Offer assignments were updated.");
      setEditingId(null);
      await Promise.all([catalog.refresh(), tenant.refresh()]);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The Publisher could not be updated.",
      );
    }
  }

  async function updatePublisherStatus(
    publisher: CatalogPublisher,
    status: CompanyMembershipStatus,
  ): Promise<void> {
    resetFeedback();

    try {
      if (
        publisher.assignedOfferIds.length > 0 &&
        (status === "suspended" || status === "revoked")
      ) {
        await catalog.updatePublisher({
          membershipId: publisher.membershipId,
          timezone: publisher.timezone,
          payoutType: publisher.payoutType,
          fixedPayoutAmountMinor: publisher.fixedPayoutAmountMinor,
          payoutCurrency: publisher.payoutCurrency,
          postbackUrl: publisher.postbackUrl,
          emailNotificationsEnabled: publisher.emailNotificationsEnabled,
          assignedOfferIds: [],
        });
      }

      await tenant.updateMembership({
        membershipId: publisher.membershipId,
        role: "publisher",
        status,
      });

      const action =
        publisher.membershipStatus === "revoked" && status === "suspended"
          ? "restored to suspended"
          : status;

      setMessage(
        `${publisher.displayName ?? publisher.email ?? "Publisher"} was ${action}.`,
      );
      setEditingId(null);
      await Promise.all([catalog.refresh(), tenant.refresh()]);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The Publisher status could not be updated.",
      );
    }
  }

  function editPublisher(publisher: CatalogPublisher): void {
    resetFeedback();
    setEditingId(publisher.membershipId);
    setForm(formFromPublisher(publisher));
    document
      .querySelector(".publisher-editor-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!catalog.permissions.canReadCatalog) {
    return (
      <ControlAccessDenied
        message="Manager or Company Administrator access is required."
        title="Publisher access unavailable"
      />
    );
  }

  if (catalog.isLoading || snapshot === null || tenant.status === "loading") {
    return <ControlLoading label="Publishers" />;
  }

  return (
    <div className="page-stack catalog-page">
      <ControlModuleHeader
        description="Invite Publishers, control their lifecycle, configure payout rules, and assign one or more Offers from the current Manager scope."
        eyebrow="Publisher Governance"
        icon="group"
        stats={[
          {
            label: "Active",
            value: snapshot.publishers.filter(
              (publisher) => publisher.membershipStatus === "active",
            ).length,
          },
          { label: "Pending", value: pendingInvitations.length },
          {
            label: "Offer links",
            value: snapshot.publishers.reduce(
              (total, publisher) => total + publisher.offerCount,
              0,
            ),
          },
        ]}
        title="Publishers"
      />

      <ControlFeedback
        error={actionError ?? catalog.error ?? tenant.error}
        message={message}
      />

      {catalog.permissions.canManagePublishers && (
        <div className="catalog-two-column">
          <GlassPanel
            as="section"
            className="control-card publisher-editor-panel"
          >
            <ControlCardHeading
              description="The Publisher sets a password through the one-time invitation link."
              eyebrow="Add Publisher"
              title="Send a secure invitation"
            />
            <form
              className="catalog-form"
              onSubmit={(event) => void handleInvite(event)}
            >
              <label>
                <span>Email</span>
                <input
                  autoComplete="email"
                  disabled={tenant.isMutating}
                  onChange={(event) =>
                    setInviteEmail(event.currentTarget.value)
                  }
                  placeholder="publisher@example.com"
                  required
                  type="email"
                  value={inviteEmail}
                />
              </label>
              <div className="catalog-security-note">
                <MaterialIcon name="verified_user" />
                <span>
                  Invitation is committed first, encrypted in the outbox, and
                  delivered asynchronously by Brevo.
                </span>
              </div>
              <button
                className="primary-gradient-button primary-gradient-button--compact"
                disabled={tenant.isMutating}
                type="submit"
              >
                <MaterialIcon name="send" />
                Invite Publisher
              </button>
            </form>
          </GlassPanel>

          <GlassPanel as="section" className="control-card">
            <ControlCardHeading
              description="Resend or revoke invitations without creating duplicate users."
              eyebrow="Pending Invitations"
              title="Awaiting acceptance"
            />
            {pendingInvitations.length === 0 ? (
              <ControlEmpty
                icon="mail"
                message="New Publisher invitations will appear here."
                title="No pending invitations"
              />
            ) : (
              <div className="catalog-compact-list">
                {pendingInvitations.map((invitation) => (
                  <article key={invitation.id}>
                    <div>
                      <strong>{invitation.email}</strong>
                      <span>
                        Delivery: {invitation.deliveryStatus} · Expires{" "}
                        {formatDateTime(invitation.expiresAt)}
                      </span>
                    </div>
                    <RowActions>
                      <button
                        aria-label={`Resend invitation to ${invitation.email}`}
                        disabled={tenant.isMutating}
                        onClick={() =>
                          void tenant.resendInvitation({
                            invitationId: invitation.id,
                          })
                        }
                        title="Resend"
                        type="button"
                      >
                        <MaterialIcon name="refresh" />
                      </button>
                      <button
                        aria-label={`Revoke invitation to ${invitation.email}`}
                        disabled={tenant.isMutating}
                        onClick={() =>
                          void tenant.revokeInvitation({
                            invitationId: invitation.id,
                          })
                        }
                        title="Revoke"
                        type="button"
                      >
                        <MaterialIcon name="delete" />
                      </button>
                    </RowActions>
                  </article>
                ))}
              </div>
            )}
          </GlassPanel>
        </div>
      )}

      {editingId !== null && (
        <GlassPanel
          as="section"
          className="control-card publisher-editor-panel"
        >
          <ControlCardHeading
            eyebrow="Publisher Configuration"
            title="Update settings and assigned Offers"
          />
          <form
            className="catalog-form"
            onSubmit={(event) => void handleSave(event)}
          >
            <div className="catalog-form-grid catalog-form-grid--three">
              <label>
                <span>Timezone</span>
                <select
                  disabled={catalog.isMutating}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      timezone: event.currentTarget.value,
                    })
                  }
                  value={form.timezone}
                >
                  {TIMEZONE_OPTIONS.map((timezone) => (
                    <option key={timezone}>{timezone}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Payout type</span>
                <select
                  disabled={catalog.isMutating}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      payoutType: event.currentTarget
                        .value as CatalogPayoutType,
                      fixedPayoutAmountMinor: "",
                      payoutCurrency: "",
                    })
                  }
                  value={form.payoutType}
                >
                  <option value="per_offer">Per offer</option>
                  <option value="fixed_member">Fixed member payout</option>
                </select>
              </label>

              <label className="catalog-field--wide">
                <span>Postback URL</span>
                <input
                  disabled={catalog.isMutating}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      postbackUrl: event.currentTarget.value,
                    })
                  }
                  type="url"
                  value={form.postbackUrl}
                />
              </label>
            </div>

            {form.payoutType === "fixed_member" && (
              <div className="catalog-form-grid">
                <label>
                  <span>Fixed payout amount (minor units)</span>
                  <input
                    disabled={catalog.isMutating}
                    min="1"
                    onChange={(event) =>
                      setForm({
                        ...form,
                        fixedPayoutAmountMinor: event.currentTarget.value,
                      })
                    }
                    required
                    step="1"
                    type="number"
                    value={form.fixedPayoutAmountMinor}
                  />
                </label>
                <label>
                  <span>Currency</span>
                  <input
                    disabled={catalog.isMutating}
                    maxLength={3}
                    minLength={3}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        payoutCurrency: event.currentTarget.value.toUpperCase(),
                      })
                    }
                    placeholder="USD"
                    required
                    value={form.payoutCurrency}
                  />
                </label>
              </div>
            )}

            <label>
              <span>Assigned Offers</span>
              <MultiSelectDropdown
                ariaLabel="Assigned Offers"
                disabled={catalog.isMutating}
                emptyMessage="No Offers are assigned to this Manager."
                onChange={(assignedOfferIds) =>
                  setForm({ ...form, assignedOfferIds })
                }
                options={offerOptions}
                placeholder="Select one or more Offers"
                searchPlaceholder="Search assigned Offers"
                values={form.assignedOfferIds}
              />
            </label>

            {form.payoutType === "per_offer" && (
              <div className="catalog-security-note">
                <MaterialIcon name="payments" />
                <span>
                  Each selected Offer uses its configured default payout. Offers
                  without a default payout cannot be assigned.
                </span>
              </div>
            )}

            <ToggleField
              checked={form.emailNotificationsEnabled}
              disabled={catalog.isMutating}
              label="Email notifications"
              onChange={(emailNotificationsEnabled) =>
                setForm({ ...form, emailNotificationsEnabled })
              }
            />

            <div className="catalog-form-actions">
              <button
                className="control-secondary-button"
                disabled={catalog.isMutating}
                onClick={() => setEditingId(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="primary-gradient-button primary-gradient-button--compact"
                disabled={catalog.isMutating}
                type="submit"
              >
                <MaterialIcon name="save" />
                Save Publisher
              </button>
            </div>
          </form>
        </GlassPanel>
      )}

      <GlassPanel as="section" className="control-card catalog-table-panel">
        <ControlCardHeading
          action={
            <RefreshButton
              disabled={catalog.isRefreshing || tenant.isMutating}
              onClick={() =>
                void Promise.all([catalog.refresh(), tenant.refresh()])
              }
            />
          }
          description="Manage settings, Offer coverage, suspension, revocation, and safe restoration."
          eyebrow="Publisher Directory"
          title="Managed Publishers"
        />

        <CatalogToolbar
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          search={search}
        >
          <select
            onChange={(event) => {
              setMembershipStatus(event.currentTarget.value);
              setPage(1);
            }}
            value={membershipStatus}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="revoked">Revoked</option>
          </select>
          <input
            aria-label="Publishers added after"
            onChange={(event) => {
              setCreatedAfter(event.currentTarget.value);
              setPage(1);
            }}
            type="date"
            value={createdAfter}
          />
        </CatalogToolbar>

        {pageRows.length === 0 ? (
          <ControlEmpty
            icon="group"
            message="Invite a Publisher or change the filters."
            title="No Publishers found"
          />
        ) : (
          <div className="responsive-table catalog-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Publisher</th>
                  <th>Email</th>
                  <th>Offers</th>
                  <th>Timezone</th>
                  <th>Payout</th>
                  <th>Notifications</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((publisher) => (
                  <tr key={publisher.membershipId}>
                    <td>
                      <strong>{publisher.displayName ?? "Publisher"}</strong>
                      <small>Publisher #{publisher.publicId}</small>
                    </td>
                    <td>{publisher.email ?? "Unavailable"}</td>
                    <td>{publisher.offerCount}</td>
                    <td>{publisher.timezone}</td>
                    <td>{publisherPayoutLabel(publisher)}</td>
                    <td>
                      {publisher.emailNotificationsEnabled
                        ? "Enabled"
                        : "Disabled"}
                    </td>
                    <td>
                      <ControlStatus status={publisher.membershipStatus} />
                    </td>
                    <td>
                      {publisher.joinedAt === null
                        ? "Not joined"
                        : formatDateTime(publisher.joinedAt)}
                    </td>
                    <td>
                      <RowActions>
                        {catalog.permissions.canManagePublishers &&
                          publisher.membershipStatus !== "revoked" && (
                            <button
                              aria-label={`Edit ${publisher.email ?? "Publisher"}`}
                              disabled={catalog.isMutating || tenant.isMutating}
                              onClick={() => editPublisher(publisher)}
                              title="Edit Publisher"
                              type="button"
                            >
                              <MaterialIcon name="edit" />
                            </button>
                          )}

                        {catalog.permissions.canManagePublishers &&
                          publisher.membershipStatus === "active" && (
                            <button
                              aria-label={`Suspend ${publisher.email ?? "Publisher"}`}
                              disabled={catalog.isMutating || tenant.isMutating}
                              onClick={() =>
                                void updatePublisherStatus(
                                  publisher,
                                  "suspended",
                                )
                              }
                              title="Suspend Publisher"
                              type="button"
                            >
                              <MaterialIcon name="pause" />
                            </button>
                          )}

                        {catalog.permissions.canManagePublishers &&
                          publisher.membershipStatus === "suspended" && (
                            <button
                              aria-label={`Activate ${publisher.email ?? "Publisher"}`}
                              disabled={catalog.isMutating || tenant.isMutating}
                              onClick={() =>
                                void updatePublisherStatus(publisher, "active")
                              }
                              title="Activate Publisher"
                              type="button"
                            >
                              <MaterialIcon name="refresh" />
                            </button>
                          )}

                        {catalog.permissions.canManagePublishers &&
                          publisher.membershipStatus !== "revoked" && (
                            <button
                              aria-label={`Revoke ${publisher.email ?? "Publisher"}`}
                              disabled={catalog.isMutating || tenant.isMutating}
                              onClick={() =>
                                void updatePublisherStatus(publisher, "revoked")
                              }
                              title="Delete / revoke Publisher"
                              type="button"
                            >
                              <MaterialIcon name="delete" />
                            </button>
                          )}

                        {catalog.permissions.canManagePublishers &&
                          publisher.membershipStatus === "revoked" && (
                            <button
                              aria-label={`Restore ${publisher.email ?? "Publisher"}`}
                              disabled={catalog.isMutating || tenant.isMutating}
                              onClick={() =>
                                void updatePublisherStatus(
                                  publisher,
                                  "suspended",
                                )
                              }
                              title="Restore Publisher to suspended"
                              type="button"
                            >
                              <MaterialIcon name="refresh" />
                            </button>
                          )}
                      </RowActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <CatalogPagination
          onPage={setPage}
          page={safePage}
          pageCount={pageCount}
        />
      </GlassPanel>
    </div>
  );
}
