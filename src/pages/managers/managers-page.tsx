import { useMemo, useState } from "react";

import {
  ManagedUserCreateForm,
  ManagedUserPasswordResetForm,
} from "../../components/managed-users/managed-user-credential-forms";
import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import type { CompanyMembershipStatus } from "../../features/auth/auth.types";
import { useCompany } from "../../features/companies/use-company";
import type {
  CompanyDirectoryUser,
  DirectoryFilters,
} from "../../features/tenant-administration/tenant-administration.types";
import { useTenantAdministration } from "../../features/tenant-administration/use-tenant-administration";
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

export type ManagersPageMode = "add" | "manage";

function managerLabel(manager: CompanyDirectoryUser): string {
  return manager.displayName ?? manager.email ?? manager.userId.slice(0, 8);
}

export function ManagersPage({ mode }: { mode: ManagersPageMode }) {
  const company = useCompany();
  const [search, setSearch] = useState("");
  const [membershipStatus, setMembershipStatus] = useState<
    CompanyMembershipStatus | ""
  >("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [passwordTarget, setPasswordTarget] =
    useState<CompanyDirectoryUser | null>(null);
  const filters = useMemo<DirectoryFilters>(
    () => ({
      search,
      role: "manager",
      membershipStatus,
      userStatus: "",
    }),
    [membershipStatus, search],
  );
  const tenant = useTenantAdministration(filters);

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

  async function resetManagerPassword(password: string): Promise<void> {
    if (passwordTarget === null) {
      return;
    }

    resetFeedback();

    try {
      await tenant.resetManagedUserPassword({
        userId: passwordTarget.userId,
        password,
      });
      setFeedback(
        `Password reset completed for ${managerLabel(passwordTarget)}.`,
      );
      setPasswordTarget(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "The Manager password could not be reset.";
      setActionError(message);
      throw error;
    }
  }

  async function updateManagerStatus(
    manager: CompanyDirectoryUser,
    status: CompanyMembershipStatus,
  ): Promise<void> {
    resetFeedback();

    try {
      await tenant.updateMembership({
        membershipId: manager.membershipId,
        role: "manager",
        status,
      });
      setFeedback(`${managerLabel(manager)} is now ${status}.`);
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
            : `Manage Manager access and credentials for ${company.activeCompany.name}.`
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

      <ControlFeedback error={actionError ?? tenant.error} message={feedback} />

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
          {passwordTarget !== null && (
            <GlassPanel
              as="section"
              className="control-card manager-invite-card"
            >
              <ControlCardHeading
                eyebrow="Administrator Reset"
                title="Reset Manager password"
                description="Only a new password can be set; the existing password is never visible."
              />
              <ManagedUserPasswordResetForm
                disabled={tenant.isMutating}
                onCancel={() => setPasswordTarget(null)}
                onReset={resetManagerPassword}
                targetLabel={managerLabel(passwordTarget)}
              />
            </GlassPanel>
          )}

          <GlassPanel
            as="section"
            className="control-card manager-directory-card control-directory-surface"
          >
            <ControlCardHeading
              action={
                <RefreshButton
                  disabled={tenant.isMutating}
                  onClick={() => void tenant.refresh()}
                />
              }
              eyebrow="Manager Directory"
              title="Company Managers"
              description="Company Admins can reset credentials and activate, suspend, or revoke Manager memberships."
            />

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
                <option value="revoked">Revoked</option>
              </select>
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
                            <button
                              disabled={tenant.isMutating}
                              onClick={() => setPasswordTarget(manager)}
                              title="Reset Manager password"
                              type="button"
                            >
                              <MaterialIcon name="password" />
                            </button>
                            {manager.membershipStatus !== "active" && (
                              <button
                                disabled={tenant.isMutating}
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
                                disabled={tenant.isMutating}
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
                                disabled={tenant.isMutating}
                                onClick={() =>
                                  void updateManagerStatus(manager, "revoked")
                                }
                                title="Revoke Manager"
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
