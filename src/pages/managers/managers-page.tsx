import { type FormEvent, useMemo, useState } from 'react';

import { MaterialIcon } from '../../components/icons/material-icon';
import { GlassPanel } from '../../components/ui/glass-panel';
import type { CompanyMembershipStatus } from '../../features/auth/auth.types';
import { useCompany } from '../../features/companies/use-company';
import type {
  CompanyDirectoryUser,
  CompanyInvitation,
  DirectoryFilters,
} from '../../features/tenant-administration/tenant-administration.types';
import { useTenantAdministration } from '../../features/tenant-administration/use-tenant-administration';
import {
  ControlAccessDenied,
  ControlCardHeading,
  ControlEmpty,
  ControlFeedback,
  ControlLoading,
  ControlModuleHeader,
  ControlStatus,
  RefreshButton,
} from '../control-plane/control-plane-ui';
import { formatDateTime } from '../control-plane/control-plane-formatters';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export type ManagersPageMode = 'add' | 'manage';

function managerLabel(manager: CompanyDirectoryUser): string {
  return manager.displayName ?? manager.email ?? manager.userId.slice(0, 8);
}

export function ManagersPage({ mode }: { mode: ManagersPageMode }) {
  const company = useCompany();
  const [search, setSearch] = useState('');
  const [membershipStatus, setMembershipStatus] =
    useState<CompanyMembershipStatus | ''>('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const filters = useMemo<DirectoryFilters>(
    () => ({
      search,
      role: 'manager',
      membershipStatus,
      userStatus: '',
    }),
    [membershipStatus, search],
  );
  const tenant = useTenantAdministration(filters);
  const managerInvitations = useMemo(
    () => tenant.invitations.filter((invitation) => invitation.role === 'manager'),
    [tenant.invitations],
  );
  const pendingInvitations = managerInvitations.filter(
    (invitation) => invitation.status === 'pending',
  );

  function resetFeedback(): void {
    setFeedback(null);
    setActionError(null);
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    resetFeedback();
    const email = inviteEmail.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
      setActionError('Enter a valid Manager email address.');
      return;
    }

    try {
      await tenant.createInvitation({
        email,
        role: 'manager',
      });
      setInviteEmail('');
      setFeedback(`Manager invitation queued for ${email}.`);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : 'The Manager invitation could not be created.',
      );
    }
  }

  async function handleInvitationAction(
    invitation: CompanyInvitation,
    action: 'resend' | 'revoke',
  ): Promise<void> {
    resetFeedback();

    try {
      if (action === 'resend') {
        await tenant.resendInvitation({ invitationId: invitation.id });
        setFeedback(`A fresh Manager invitation was queued for ${invitation.email}.`);
      } else {
        await tenant.revokeInvitation({ invitationId: invitation.id });
        setFeedback(`The Manager invitation for ${invitation.email} was revoked.`);
      }
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : `The invitation could not be ${action}ed.`,
      );
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
        role: 'manager',
        status,
      });
      setFeedback(`${managerLabel(manager)} is now ${status}.`);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : 'The Manager membership could not be updated.',
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

  if (tenant.status === 'loading') {
    return <ControlLoading label="Managers" />;
  }

  return (
    <div className="page-stack company-admin-managers-page">
      <ControlModuleHeader
        description={
          mode === 'add'
            ? `Invite a Manager to ${company.activeCompany.name}. Company Admins cannot create Publishers or other Company Admins.`
            : `Manage Manager access for ${company.activeCompany.name}.`
        }
        eyebrow="Company Team"
        icon="supervisor_account"
        stats={[
          { label: 'Managers', value: tenant.directory.items.length },
          {
            label: 'Active',
            value: tenant.directory.items.filter(
              (manager) => manager.membershipStatus === 'active',
            ).length,
          },
          { label: 'Pending', value: pendingInvitations.length },
        ]}
        title={mode === 'add' ? 'Add Manager' : 'Manage Managers'}
      />

      <ControlFeedback error={actionError ?? tenant.error} message={feedback} />

      {mode === 'add' ? (
        <GlassPanel as="section" className="control-card manager-invite-card">
          <ControlCardHeading
            eyebrow="Secure Invitation"
            title="Invite a Manager"
            description="Supabase creates the secure account link and Brevo delivers it asynchronously."
          />
          <form className="manager-invite-form" onSubmit={(event) => void handleInvite(event)}>
            <label>
              <span>Manager email</span>
              <input
                autoComplete="email"
                disabled={tenant.isMutating}
                onChange={(event) => setInviteEmail(event.currentTarget.value)}
                placeholder="manager@example.com"
                required
                type="email"
                value={inviteEmail}
              />
            </label>
            <label>
              <span>Role</span>
              <select disabled value="manager">
                <option value="manager">Manager</option>
              </select>
            </label>
            <button
              className="primary-gradient-button primary-gradient-button--compact"
              disabled={tenant.isMutating}
              type="submit"
            >
              <MaterialIcon name="person_add" />
              Send Manager invitation
            </button>
          </form>

          {pendingInvitations.length > 0 && (
            <div className="manager-pending-list">
              <h3>Pending Manager invitations</h3>
              {pendingInvitations.map((invitation) => (
                <article key={invitation.id}>
                  <div>
                    <strong>{invitation.email}</strong>
                    <small>Expires {formatDateTime(invitation.expiresAt)}</small>
                  </div>
                  <div>
                    <button
                      className="control-secondary-button"
                      disabled={tenant.isMutating}
                      onClick={() => void handleInvitationAction(invitation, 'resend')}
                      type="button"
                    >
                      Resend
                    </button>
                    <button
                      className="control-danger-button"
                      disabled={tenant.isMutating}
                      onClick={() => void handleInvitationAction(invitation, 'revoke')}
                      type="button"
                    >
                      Revoke
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </GlassPanel>
      ) : (
        <GlassPanel as="section" className="control-card manager-directory-card">
          <ControlCardHeading
            action={
              <RefreshButton
                disabled={tenant.isMutating}
                onClick={() => void tenant.refresh()}
              />
            }
            eyebrow="Manager Directory"
            title="Company Managers"
            description="Company Admins can activate, suspend, or revoke Manager memberships only."
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
                  event.currentTarget.value as CompanyMembershipStatus | '',
                )
              }
              value={membershipStatus}
            >
              <option value="">All statuses</option>
              <option value="invited">Invited</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          {tenant.directory.items.length === 0 ? (
            <ControlEmpty
              icon="supervisor_account"
              message="Invite the first Manager or change the filters."
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
                      <td>{manager.email ?? 'No email'}</td>
                      <td><ControlStatus status={manager.membershipStatus} /></td>
                      <td><ControlStatus status={manager.userStatus} /></td>
                      <td>{formatDateTime(manager.joinedAt)}</td>
                      <td>
                        <div className="manager-row-actions">
                          {manager.membershipStatus !== 'active' && (
                            <button
                              disabled={tenant.isMutating}
                              onClick={() => void updateManagerStatus(manager, 'active')}
                              title="Activate Manager"
                              type="button"
                            >
                              <MaterialIcon name="play_arrow" />
                            </button>
                          )}
                          {manager.membershipStatus === 'active' && (
                            <button
                              disabled={tenant.isMutating}
                              onClick={() => void updateManagerStatus(manager, 'suspended')}
                              title="Suspend Manager"
                              type="button"
                            >
                              <MaterialIcon name="pause" />
                            </button>
                          )}
                          {manager.membershipStatus !== 'revoked' && (
                            <button
                              disabled={tenant.isMutating}
                              onClick={() => void updateManagerStatus(manager, 'revoked')}
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
      )}
    </div>
  );
}
