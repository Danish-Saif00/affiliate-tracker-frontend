import { useMemo, useState } from "react";

import {
  ManagedUserCreateForm,
  ManagedUserPasswordResetForm,
} from "../../components/managed-users/managed-user-credential-forms";
import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import { useAuth } from "../../features/auth/use-auth";
import type {
  CompanyMembershipStatus,
  CompanyRole,
} from "../../features/auth/auth.types";
import { useCompany } from "../../features/companies/use-company";
import type {
  CompanyDirectoryUser,
  DirectoryFilters,
  UserStatus,
} from "../../features/tenant-administration/tenant-administration.types";
import { useTenantAdministration } from "../../features/tenant-administration/use-tenant-administration";
import { formatDateTime } from "../control-plane/control-plane-formatters";
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

type TargetRoleConfiguration = {
  role: CompanyRole;
  singularLabel: string;
  pluralLabel: string;
};

function resolveTargetRole(
  platformAdmin: boolean,
  actorRole: CompanyRole | null,
): TargetRoleConfiguration | null {
  if (platformAdmin) {
    return {
      role: "company_admin",
      singularLabel: "Company Admin",
      pluralLabel: "Company Admins",
    };
  }

  if (actorRole === "company_admin") {
    return {
      role: "manager",
      singularLabel: "Manager",
      pluralLabel: "Managers",
    };
  }

  if (actorRole === "manager") {
    return {
      role: "publisher",
      singularLabel: "Publisher",
      pluralLabel: "Publishers",
    };
  }

  return null;
}

function userLabel(user: CompanyDirectoryUser): string {
  return user.displayName ?? user.email ?? user.userId.slice(0, 8);
}

export function TenantAdministrationPage() {
  const auth = useAuth();
  const company = useCompany();
  const platformAdmin =
    auth.identity?.authorization.platformRole === "platform_super_admin";
  const actorRole =
    auth.identity?.authorization.companyMembership?.role ?? null;
  const target = resolveTargetRole(platformAdmin, actorRole);
  const [search, setSearch] = useState("");
  const [membershipStatus, setMembershipStatus] = useState<
    CompanyMembershipStatus | ""
  >("");
  const [userStatus, setUserStatus] = useState<UserStatus | "">("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [passwordTarget, setPasswordTarget] =
    useState<CompanyDirectoryUser | null>(null);

  const filters = useMemo<DirectoryFilters>(
    () => ({
      search,
      role: target?.role ?? "",
      membershipStatus,
      userStatus,
    }),
    [membershipStatus, search, target?.role, userStatus],
  );

  const tenant = useTenantAdministration(filters);

  function resetFeedback(): void {
    setFeedback(null);
    setActionError(null);
  }

  async function createUser(input: {
    email: string;
    password: string;
  }): Promise<void> {
    if (target === null) {
      return;
    }

    resetFeedback();

    try {
      const user = await tenant.createManagedUser(input);
      setFeedback(
        `${user.email ?? input.email} was created as an active ${target.singularLabel}.`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : `The ${target.singularLabel} could not be created.`;
      setActionError(message);
      throw error;
    }
  }

  async function resetPassword(password: string): Promise<void> {
    if (passwordTarget === null) {
      return;
    }

    resetFeedback();

    try {
      await tenant.resetManagedUserPassword({
        userId: passwordTarget.userId,
        password,
      });
      setFeedback(`Password reset completed for ${userLabel(passwordTarget)}.`);
      setPasswordTarget(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "The managed password could not be reset.";
      setActionError(message);
      throw error;
    }
  }

  async function updateManagedStatus(
    user: CompanyDirectoryUser,
    nextStatus: "active" | "suspended" | "revoked",
  ): Promise<void> {
    resetFeedback();

    try {
      if (platformAdmin) {
        if (nextStatus === "revoked") {
          throw new Error(
            "Company Admin accounts can be activated or suspended, not revoked.",
          );
        }

        await tenant.updateUserStatus({
          userId: user.userId,
          status: nextStatus,
        });
      } else {
        await tenant.updateMembership({
          membershipId: user.membershipId,
          role: user.role,
          status: nextStatus,
        });
      }

      setFeedback(`${userLabel(user)} is now ${nextStatus}.`);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The managed user status could not be updated.",
      );
    }
  }

  if (company.activeCompany === null) {
    return (
      <ControlAccessDenied
        message="Select an active company before managing users."
        title="Company context required"
      />
    );
  }

  if (target === null) {
    return (
      <ControlAccessDenied
        message="Your current role cannot create or manage child accounts."
        title="Managed-user access denied"
      />
    );
  }

  if (tenant.status === "loading") {
    return <ControlLoading label={target.pluralLabel} />;
  }

  const activeCount = tenant.directory.items.filter((user) =>
    platformAdmin
      ? user.userStatus === "active"
      : user.membershipStatus === "active",
  ).length;

  return (
    <div className="control-page tenant-administration-page">
      <ControlModuleHeader
        description={`Create and manage ${target.pluralLabel} for ${company.activeCompany.name}. Credentials are set directly by the parent administrator.`}
        eyebrow="Managed Access"
        icon="admin_panel_settings"
        stats={[
          { label: target.pluralLabel, value: tenant.directory.items.length },
          { label: "Active", value: activeCount },
          {
            label: "Suspended",
            value: tenant.directory.items.filter((user) =>
              platformAdmin
                ? user.userStatus === "suspended"
                : user.membershipStatus === "suspended",
            ).length,
          },
        ]}
        title={target.pluralLabel}
      />

      <ControlFeedback error={actionError ?? tenant.error} message={feedback} />

      <div className="tenant-administration-layout">
        <GlassPanel as="section" className="control-card tenant-invite-card">
          <ControlCardHeading
            eyebrow="Direct Credentials"
            title={`Create ${target.singularLabel}`}
            description="Email and password are set immediately. No invitation, verification, or password-setup email is sent."
          />
          <ManagedUserCreateForm
            disabled={tenant.isMutating}
            onCreate={createUser}
            roleLabel={target.singularLabel}
          />
        </GlassPanel>

        {passwordTarget !== null && (
          <GlassPanel as="section" className="control-card tenant-invite-card">
            <ControlCardHeading
              eyebrow="Administrator Reset"
              title={`Reset ${target.singularLabel} password`}
              description="The current password is never readable. This action only overwrites it with a new password."
            />
            <ManagedUserPasswordResetForm
              disabled={tenant.isMutating}
              onCancel={() => setPasswordTarget(null)}
              onReset={resetPassword}
              targetLabel={userLabel(passwordTarget)}
            />
          </GlassPanel>
        )}
      </div>

      <GlassPanel
        as="section"
        className={`control-card tenant-directory-card${
          platformAdmin ? "" : " control-directory-surface"
        }`}
      >
        {platformAdmin ? (
          <ControlCardHeading
            action={
              <RefreshButton
                disabled={tenant.isMutating}
                onClick={() => void tenant.refresh()}
              />
            }
            eyebrow="Directory"
            title={target.pluralLabel}
            description="Passwords are never displayed. Parent administrators can only reset credentials for the role directly beneath them."
          />
        ) : (
          <div className="control-directory-actions">
            <RefreshButton
              disabled={tenant.isMutating}
              onClick={() => void tenant.refresh()}
            />
          </div>
        )}

        <div className="tenant-filter-grid">
          <label>
            <span>Search</span>
            <input
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Search by name, email, or user ID"
              value={search}
            />
          </label>

          {!platformAdmin && (
            <label>
              <span>Membership</span>
              <select
                onChange={(event) =>
                  setMembershipStatus(
                    event.currentTarget.value as CompanyMembershipStatus | "",
                  )
                }
                value={membershipStatus}
              >
                <option value="">All memberships</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="revoked">Revoked</option>
              </select>
            </label>
          )}

          {platformAdmin && (
            <label>
              <span>Account</span>
              <select
                onChange={(event) =>
                  setUserStatus(event.currentTarget.value as UserStatus | "")
                }
                value={userStatus}
              >
                <option value="">All accounts</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
          )}
        </div>

        {tenant.directory.items.length === 0 ? (
          <ControlEmpty
            icon="group"
            message={`Create the first ${target.singularLabel} or change the filters.`}
            title={`No ${target.pluralLabel} found`}
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Membership</th>
                  <th>Account</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenant.directory.items.map((user) => (
                  <tr key={user.membershipId}>
                    <td>
                      <strong>{userLabel(user)}</strong>
                      <small>{user.userId.slice(0, 8)}</small>
                    </td>
                    <td>{user.email ?? "Unavailable"}</td>
                    <td>{user.role.replaceAll("_", " ")}</td>
                    <td>
                      <ControlStatus status={user.membershipStatus} />
                    </td>
                    <td>
                      <ControlStatus status={user.userStatus} />
                    </td>
                    <td>{formatDateTime(user.joinedAt)}</td>
                    <td>
                      <div className="manager-row-actions">
                        <button
                          disabled={tenant.isMutating}
                          onClick={() => setPasswordTarget(user)}
                          title="Reset password"
                          type="button"
                        >
                          <MaterialIcon name="password" />
                        </button>

                        {(platformAdmin
                          ? user.userStatus !== "active"
                          : user.membershipStatus !== "active") && (
                          <button
                            disabled={tenant.isMutating}
                            onClick={() =>
                              void updateManagedStatus(user, "active")
                            }
                            title="Activate user"
                            type="button"
                          >
                            <MaterialIcon name="play_arrow" />
                          </button>
                        )}

                        {(platformAdmin
                          ? user.userStatus === "active"
                          : user.membershipStatus === "active") && (
                          <button
                            disabled={tenant.isMutating}
                            onClick={() =>
                              void updateManagedStatus(user, "suspended")
                            }
                            title="Suspend user"
                            type="button"
                          >
                            <MaterialIcon name="pause" />
                          </button>
                        )}

                        {!platformAdmin &&
                          user.membershipStatus !== "revoked" && (
                            <button
                              disabled={tenant.isMutating}
                              onClick={() =>
                                void updateManagedStatus(user, "revoked")
                              }
                              title="Revoke membership"
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

      {!platformAdmin && (
        <GlassPanel as="section" className="control-card tenant-audit-card">
          <ControlCardHeading
            eyebrow="Audit Trail"
            title="Managed-user security events"
            description="Creation and password reset events record actor, target, role, and request context without recording password values."
          />
          {tenant.audit.items.length === 0 ? (
            <ControlEmpty
              icon="history"
              message="No tenant audit events are available."
              title="No audit events"
            />
          ) : (
            <div className="tenant-audit-list">
              {tenant.audit.items.slice(0, 20).map((event) => (
                <article key={event.id}>
                  <div>
                    <strong>{event.eventName}</strong>
                    <span>{event.entityType}</span>
                  </div>
                  <time>{formatDateTime(event.createdAt)}</time>
                </article>
              ))}
            </div>
          )}
        </GlassPanel>
      )}
    </div>
  );
}
