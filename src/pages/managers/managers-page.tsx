import { type FormEvent, useMemo, useState } from "react";
import { ManagedUserCreateForm } from "../../components/managed-users/managed-user-credential-forms";
import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import type { CompanyMembershipStatus } from "../../features/auth/auth.types";
import type {
  CatalogOffer,
  UpdateCatalogOfferInput,
} from "../../features/catalog/catalog.types";
import { useCatalogOperations } from "../../features/catalog/use-catalog";
import { useCompany } from "../../features/companies/use-company";
import { useAppliedFilters } from "../../features/filters/use-applied-filters";
import type {
  CompanyDirectoryUser,
  DirectoryFilters,
} from "../../features/tenant-administration/tenant-administration.types";
import { useTenantAdministration } from "../../features/tenant-administration/use-tenant-administration";
import { MultiSelectDropdown } from "../control-plane/catalog-page-ui";
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const MINIMUM_PASSWORD_LENGTH = 12;
const MAXIMUM_PASSWORD_LENGTH = 128;

export type ManagersPageMode = "add" | "manage";

type ManagerEditForm = {
  displayName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  offerIds: readonly string[];
};

function managerLabel(manager: CompanyDirectoryUser): string {
  return manager.displayName ?? manager.email ?? manager.userId.slice(0, 8);
}

function buildOfferAssignmentUpdate(
  offer: CatalogOffer,
  managerMembershipId: string,
  assigned: boolean,
): UpdateCatalogOfferInput | null {
  if (offer.trackingDomainId === null || offer.status === "archived") {
    return null;
  }

  const currentIds = [...offer.managerMembershipIds];
  const nextIds = assigned
    ? Array.from(new Set([...currentIds, managerMembershipId]))
    : currentIds.filter((membershipId) => membershipId !== managerMembershipId);

  return {
    offerId: offer.id,
    networkAccountId: offer.networkAccountId,
    externalOfferId: offer.externalOfferId,
    name: offer.name,
    description: offer.description,
    status: offer.status,
    trackingDomainId: offer.trackingDomainId,
    promotionalTextTemplate: offer.promotionalTextTemplate,
    countries: offer.countries,
    devices: offer.devices,
    desktopUrl: offer.desktopUrl,
    androidUrl: offer.androidUrl,
    iosUrl: offer.iosUrl,
    redirectType: offer.redirectType,
    referrerMode: offer.referrerMode,
    defaultPayoutAmountMinor: offer.defaultPayoutAmountMinor,
    payoutCurrency: offer.payoutCurrency,
    timezone: offer.timezone,
    activeDays: offer.activeDays,
    activeStartTime: offer.activeStartTime,
    activeEndTime: offer.activeEndTime,
    proxyEnabled: offer.proxyEnabled,
    expiresAt: offer.expiresAt,
    duplicateAllowed: offer.duplicateAllowed,
    managerMembershipIds: nextIds,
  };
}

export function ManagersPage({ mode }: { mode: ManagersPageMode }) {
  const company = useCompany();
  const [search, setSearch] = useState("");
  const [membershipStatus, setMembershipStatus] =
    useState<CompanyMembershipStatus | "">("active");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<CompanyDirectoryUser | null>(null);
  const [editForm, setEditForm] = useState<ManagerEditForm | null>(null);

  const draftFilters = useMemo<DirectoryFilters>(
    () => ({
      search,
      role: "manager",
      membershipStatus,
      userStatus: "active",
    }),
    [membershipStatus, search],
  );
  const { appliedFilters, applyFilters } = useAppliedFilters(draftFilters);
  const tenant = useTenantAdministration(appliedFilters);
  const catalog = useCatalogOperations();
  const editableOffers = useMemo(
    () =>
      (catalog.snapshot?.offers ?? []).filter(
        (offer) => offer.status !== "archived" && offer.trackingDomainId !== null,
      ),
    [catalog.snapshot],
  );
  const isMutating = tenant.isMutating || catalog.isMutating;

  function resetFeedback(): void {
    setFeedback(null);
    setActionError(null);
  }

  async function createManager(input: {
    email: string;
    password: string;
  }): Promise<void> {
    resetFeedback();
    try {
      const manager = await tenant.createManagedUser(input);
      setFeedback(
        `${manager.email ?? input.email} was created as an active Manager.`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "The Manager could not be created.";
      setActionError(message);
      throw error;
    }
  }

  function startManagerEdit(manager: CompanyDirectoryUser): void {
    resetFeedback();
    setEditTarget(manager);
    setEditForm({
      displayName: manager.displayName ?? "",
      email: manager.email ?? "",
      password: "",
      passwordConfirmation: "",
      offerIds: editableOffers
        .filter((offer) =>
          offer.managerMembershipIds.includes(manager.membershipId),
        )
        .map((offer) => offer.id),
    });
  }

  function cancelManagerEdit(): void {
    setEditTarget(null);
    setEditForm(null);
  }

  async function saveManagerEdit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (editTarget === null || editForm === null) {
      return;
    }

    resetFeedback();
    const email = editForm.email.trim().toLowerCase();
    const displayName = editForm.displayName.trim();
    const password = editForm.password;

    if (!EMAIL_PATTERN.test(email)) {
      setActionError("Enter a valid Manager email address.");
      return;
    }

    if (password.length > 0) {
      if (
        password.length < MINIMUM_PASSWORD_LENGTH ||
        password.length > MAXIMUM_PASSWORD_LENGTH
      ) {
        setActionError(
          `Use a password with ${String(MINIMUM_PASSWORD_LENGTH)} to ${String(
            MAXIMUM_PASSWORD_LENGTH,
          )} characters.`,
        );
        return;
      }

      if (password !== editForm.passwordConfirmation) {
        setActionError("Password confirmation does not match.");
        return;
      }
    }

    try {
      const target = editTarget;
      const selectedOfferIds = new Set(editForm.offerIds);
      const offerSnapshot = [...editableOffers];

      await tenant.updateManagedUser({
        userId: target.userId,
        email,
        displayName,
        ...(password.length > 0 ? { password } : {}),
      });

      if (target.membershipStatus === "active") {
        for (const offer of offerSnapshot) {
          const currentlyAssigned = offer.managerMembershipIds.includes(
            target.membershipId,
          );
          const shouldBeAssigned = selectedOfferIds.has(offer.id);

          if (currentlyAssigned === shouldBeAssigned) {
            continue;
          }

          const update = buildOfferAssignmentUpdate(
            offer,
            target.membershipId,
            shouldBeAssigned,
          );

          if (update !== null) {
            await catalog.updateOffer(update);
          }
        }
      }

      setFeedback(
        `${displayName.length > 0 ? displayName : email} was updated successfully.`,
      );
      cancelManagerEdit();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The Manager details or Offer assignments could not be updated.",
      );
    }
  }

  async function updateManagerStatus(
    manager: CompanyDirectoryUser,
    status: CompanyMembershipStatus,
  ): Promise<void> {
    if (status === "revoked") {
      const confirmed = window.confirm(
        `Delete ${managerLabel(manager)}? This permanently removes the Manager and every active Publisher/User created by this Manager from operational access. Historical clicks, conversions, assignments, and reports remain available as Deleted history. This cannot be restored.`,
      );

      if (!confirmed) {
        return;
      }
    }

    resetFeedback();
    try {
      await tenant.updateMembership({
        membershipId: manager.membershipId,
        role: "manager",
        status,
      });
      setFeedback(
        status === "revoked"
          ? `${managerLabel(manager)} and the Manager's active child Users were deleted. Historical reporting is preserved.`
          : `${managerLabel(manager)} is now ${status}.`,
      );

      if (status === "revoked" && editTarget?.membershipId === manager.membershipId) {
        cancelManagerEdit();
      }
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The Manager membership could not be updated.",
      );
    }
  }

  if (company.activeCompany === null) {
    return (
      <ControlAccessDenied
        message="Select an active company before managing Managers."
        title="Company context required"
      />
    );
  }

  if (tenant.status === "loading") {
    return <ControlLoading label="Managers" />;
  }

  return (
    <div className="page-stack company-admin-managers-page">
      <ControlModuleHeader
        description={
          mode === "add"
            ? `Create a Manager for ${company.activeCompany.name} with an administrator-set email and password.`
            : `Manage Manager identity, credentials, Offer access, and lifecycle for ${company.activeCompany.name}.`
        }
        eyebrow="Company Team"
        icon="supervisor_account"
        stats={[
          { label: "Managers", value: tenant.directory.items.length },
          {
            label: "Active",
            value: tenant.directory.items.filter(
              (manager) => manager.membershipStatus === "active",
            ).length,
          },
          {
            label: "Suspended",
            value: tenant.directory.items.filter(
              (manager) => manager.membershipStatus === "suspended",
            ).length,
          },
        ]}
        title={mode === "add" ? "Add Manager" : "Manage Managers"}
      />
      <ControlFeedback
        error={actionError ?? tenant.error ?? catalog.error}
        message={feedback}
      />
      {mode === "add" ? (
        <GlassPanel as="section" className="control-card manager-invite-card">
          <ControlCardHeading
            eyebrow="Direct Credentials"
            title="Create a Manager"
            description="The account becomes active immediately. No invitation or password-setup email is sent."
          />
          <ManagedUserCreateForm
            disabled={tenant.isMutating}
            onCreate={createManager}
            roleLabel="Manager"
          />
        </GlassPanel>
      ) : (
        <>
          {editTarget !== null && editForm !== null && (
            <GlassPanel
              as="section"
              className="control-card manager-invite-card manager-edit-card"
            >
              <ControlCardHeading
                eyebrow="Manager Editor"
                title={`Edit ${managerLabel(editTarget)}`}
                description="Change the Manager name or email, optionally set a new password, and assign or unassign active Offers. Passwords are write-only and never displayed."
              />
              <form
                className="control-form account-form manager-edit-form"
                onSubmit={(event) => void saveManagerEdit(event)}
              >
                <div className="catalog-form-grid catalog-form-grid--two">
                  <label>
                    <span>Name</span>
                    <input
                      disabled={isMutating}
                      maxLength={160}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          displayName: event.currentTarget.value,
                        })
                      }
                      placeholder="Manager name"
                      value={editForm.displayName}
                    />
                  </label>
                  <label>
                    <span>Email</span>
                    <input
                      autoComplete="email"
                      disabled={isMutating}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          email: event.currentTarget.value,
                        })
                      }
                      required
                      type="email"
                      value={editForm.email}
                    />
                  </label>
                  <label>
                    <span>New password (optional)</span>
                    <input
                      autoComplete="new-password"
                      disabled={isMutating}
                      maxLength={MAXIMUM_PASSWORD_LENGTH}
                      minLength={MINIMUM_PASSWORD_LENGTH}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          password: event.currentTarget.value,
                        })
                      }
                      type="password"
                      value={editForm.password}
                    />
                  </label>
                  <label>
                    <span>Confirm new password</span>
                    <input
                      autoComplete="new-password"
                      disabled={isMutating}
                      maxLength={MAXIMUM_PASSWORD_LENGTH}
                      minLength={MINIMUM_PASSWORD_LENGTH}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          passwordConfirmation: event.currentTarget.value,
                        })
                      }
                      type="password"
                      value={editForm.passwordConfirmation}
                    />
                  </label>
                  <div className="catalog-field catalog-field--wide">
                    <span>Assigned Offers</span>
                    <MultiSelectDropdown
                      ariaLabel="Assign active Offers to Manager"
                      disabled={
                        isMutating || editTarget.membershipStatus !== "active"
                      }
                      emptyMessage="No active or paused Offers with a tracking Domain are available."
                      onChange={(offerIds) =>
                        setEditForm({ ...editForm, offerIds })
                      }
                      options={editableOffers.map(
                        (offer) =>
                          [
                            offer.id,
                            `${offer.name} · Offer #${String(offer.publicId)}`,
                          ] as const,
                      )}
                      placeholder="Select Manager Offers"
                      searchPlaceholder="Search Offers"
                      values={editForm.offerIds}
                    />
                    <small>
                      {editTarget.membershipStatus === "active"
                        ? "Saving updates assignment-specific tracking access using the existing Offer assignment flow."
                        : "Offer assignments can only be changed while this Manager is Active."}
                    </small>
                  </div>
                </div>
                <div className="manager-row-actions">
                  <button
                    className="primary-gradient-button primary-gradient-button--compact"
                    disabled={isMutating}
                    type="submit"
                  >
                    <MaterialIcon name="save" />
                    Save Manager
                  </button>
                  <button
                    disabled={isMutating}
                    onClick={cancelManagerEdit}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </GlassPanel>
          )}
          <GlassPanel
            as="section"
            className="control-card manager-directory-card control-directory-surface"
          >
            <div className="control-directory-actions">
              <RefreshButton
                disabled={tenant.isMutating}
                onClick={() => void tenant.refresh()}
              />
            </div>
            <div className="manager-filter-row">
              <label>
                <MaterialIcon name="search" />
                <input
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  placeholder="Search Managers"
                  value={search}
                />
              </label>
              <select
                onChange={(event) =>
                  setMembershipStatus(
                    event.currentTarget.value as CompanyMembershipStatus | "",
                  )
                }
                value={membershipStatus}
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="revoked">Deleted</option>
              </select>
              <div className="filter-apply-actions">
                <button
                  className="primary-gradient-button primary-gradient-button--compact filter-apply-button"
                  onClick={applyFilters}
                  type="button"
                >
                  Apply Filters
                </button>
              </div>
            </div>
            {tenant.directory.items.length === 0 ? (
              <ControlEmpty
                icon="supervisor_account"
                message="Create the first Manager or change the filters."
                title="No Managers found"
              />
            ) : (
              <div className="responsive-table">
                <table>
                  <thead>
                    <tr>
                      <th>Manager</th>
                      <th>Email</th>
                      <th>Membership</th>
                      <th>Account</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenant.directory.items.map((manager) => (
                      <tr key={manager.membershipId}>
                        <td>
                          <strong>{managerLabel(manager)}</strong>
                          <small>{manager.membershipId.slice(0, 8)}</small>
                        </td>
                        <td>{manager.email ?? "No email"}</td>
                        <td>
                          <ControlStatus status={manager.membershipStatus} />
                        </td>
                        <td>
                          <ControlStatus status={manager.userStatus} />
                        </td>
                        <td>{formatDateTime(manager.joinedAt)}</td>
                        <td>
                          <div className="manager-row-actions">
                            {manager.membershipStatus !== "revoked" && (
                              <button
                                disabled={isMutating}
                                onClick={() => startManagerEdit(manager)}
                                title="Edit Manager"
                                type="button"
                              >
                                <MaterialIcon name="edit" />
                              </button>
                            )}
                            {manager.membershipStatus === "suspended" && (
                              <button
                                disabled={isMutating}
                                onClick={() =>
                                  void updateManagerStatus(manager, "active")
                                }
                                title="Activate Manager"
                                type="button"
                              >
                                <MaterialIcon name="play_arrow" />
                              </button>
                            )}
                            {manager.membershipStatus === "active" && (
                              <button
                                disabled={isMutating}
                                onClick={() =>
                                  void updateManagerStatus(manager, "suspended")
                                }
                                title="Suspend Manager"
                                type="button"
                              >
                                <MaterialIcon name="pause" />
                              </button>
                            )}
                            {manager.membershipStatus !== "revoked" && (
                              <button
                                disabled={isMutating}
                                onClick={() =>
                                  void updateManagerStatus(manager, "revoked")
                                }
                                title="Delete Manager"
                                type="button"
                              >
                                <MaterialIcon name="delete" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassPanel>
        </>
      )}
    </div>
  );
}
