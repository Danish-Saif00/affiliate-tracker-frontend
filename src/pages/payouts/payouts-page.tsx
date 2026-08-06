import { type FormEvent, useMemo, useState } from 'react';

import { MaterialIcon } from '../../components/icons/material-icon';
import { GlassPanel } from '../../components/ui/glass-panel';
import { useTenantAdministration } from '../../features/tenant-administration/use-tenant-administration';
import type { PayoutMode } from '../../features/control-plane/control-plane.types';
import { usePayoutProfiles } from '../../features/control-plane/use-control-plane';
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
import {
  formatDateTime,
  formatMinorAmount,
  parseMajorAmountToMinor,
} from '../control-plane/control-plane-formatters';

export function PayoutsPage() {
  const payouts = usePayoutProfiles();
  const tenant = useTenantAdministration({
    search: '',
    role: '',
    membershipStatus: '',
    userStatus: '',
  });
  const [memberId, setMemberId] = useState('');
  const [mode, setMode] = useState<PayoutMode>('fixed_member');
  const [currency, setCurrency] = useState('USD');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const eligibleMembers = useMemo(
    () =>
      tenant.directory.items.filter(
        (member) =>
          member.membershipStatus === 'active' &&
          member.userStatus === 'active' &&
          (member.role === 'manager' || member.role === 'publisher'),
      ),
    [tenant.directory.items],
  );

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setActionError(null);
    const formData = new FormData(event.currentTarget);
    const selectedCurrency = String(formData.get('currency') ?? 'USD').toUpperCase();
    const amount = String(formData.get('fixedAmount') ?? '');

    try {
      const profile = await payouts.upsertProfile({
        membershipId: String(formData.get('membershipId') ?? ''),
        mode: String(formData.get('mode') ?? 'fixed_member') as PayoutMode,
        fixedPayoutAmountMinor:
          mode === 'fixed_member'
            ? parseMajorAmountToMinor(amount, selectedCurrency)
            : null,
        payoutCurrency: mode === 'fixed_member' ? selectedCurrency : null,
      });
      setFeedback(`Payout profile for ${profile.role} ${profile.userId.slice(0, 8)} was saved.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The payout profile could not be saved.');
    }
  }

  if (payouts.status === 'forbidden') {
    return (
      <ControlAccessDenied
        message="Your current role does not have access to payout information."
        title="Payouts unavailable"
      />
    );
  }

  if (payouts.status === 'loading' || payouts.status === 'idle') {
    return <ControlLoading label="payout profiles" />;
  }

  return (
    <div className="control-page">
      <ControlModuleHeader
        description={
          <>
            Configure member-level payout rules and review resolved financial terms for{' '}
            <strong>{payouts.companyName}</strong>.
          </>
        }
        eyebrow="Financial Controls"
        icon="account_balance_wallet"
        stats={[
          { label: 'Profiles', value: payouts.profiles.length },
          {
            label: 'Fixed',
            value: payouts.profiles.filter((profile) => profile.mode === 'fixed_member').length,
          },
          {
            label: 'Per Offer',
            value: payouts.profiles.filter((profile) => profile.mode === 'per_offer').length,
          },
        ]}
        title="Payout Profiles"
      />

      <ControlFeedback error={actionError ?? payouts.error} message={feedback} />

      <div className="control-layout-grid">
        {payouts.permissions.canManageOffers && (
          <GlassPanel as="section" className="control-side-card">
            <ControlCardHeading
              description="A payout profile is required before a member receives an offer assignment."
              eyebrow="Member Terms"
              title="Configure payout"
            />
            <form className="control-form" onSubmit={(event) => void handleSave(event)}>
              <label>
                <span>Manager or publisher</span>
                <select
                  name="membershipId"
                  onChange={(event) => setMemberId(event.target.value)}
                  required
                  value={memberId}
                >
                  <option value="">Select member</option>
                  {eligibleMembers.map((member) => (
                    <option key={member.membershipId} value={member.membershipId}>
                      {member.displayName ?? member.email ?? member.userId.slice(0, 8)} · {member.role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Payout mode</span>
                <select
                  name="mode"
                  onChange={(event) => setMode(event.target.value as PayoutMode)}
                  value={mode}
                >
                  <option value="fixed_member">Fixed member</option>
                  <option value="per_offer">Per offer</option>
                </select>
              </label>
              <label>
                <span>Currency</span>
                <input
                  disabled={mode === 'per_offer'}
                  maxLength={3}
                  name="currency"
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                  required={mode === 'fixed_member'}
                  value={currency}
                />
              </label>
              <label>
                <span>Fixed payout amount</span>
                <input
                  disabled={mode === 'per_offer'}
                  min="0"
                  name="fixedAmount"
                  placeholder="25.00"
                  required={mode === 'fixed_member'}
                  step="0.01"
                  type="number"
                />
              </label>
              <button className="primary-gradient-button" disabled={payouts.isMutating} type="submit">
                <MaterialIcon name="save" />
                Save payout profile
              </button>
            </form>
          </GlassPanel>
        )}

        <GlassPanel
          as="section"
          className={`control-main-card control-directory-surface ${payouts.permissions.canManageOffers ? '' : 'control-main-card--full'}`}
        >
          <div className="control-directory-actions">
            <RefreshButton
              disabled={payouts.isMutating}
              onClick={() => void payouts.refresh()}
            />
          </div>
          <div className="control-record-list">
            {payouts.profiles.length === 0 ? (
              <ControlEmpty
                icon="account_balance_wallet"
                message="Create a profile before assigning an offer to this member."
                title="No payout profiles"
              />
            ) : (
              payouts.profiles.map((profile) => {
                const member = tenant.directory.items.find(
                  (item) => item.membershipId === profile.membershipId,
                );

                return (
                  <article className="control-record" key={profile.id}>
                    <div className="control-record__summary control-record__summary--static">
                      <span className="control-record-icon">
                        <MaterialIcon name="payments" />
                      </span>
                      <span>
                        <strong>
                          {member?.displayName ?? member?.email ?? profile.userId.slice(0, 12)}
                        </strong>
                        <small>
                          {profile.role} · Updated {formatDateTime(profile.updatedAt)}
                        </small>
                      </span>
                      <ControlStatus status={profile.mode} />
                    </div>
                    <div className="control-meta-grid control-meta-grid--three">
                      <div>
                        <span>Membership</span>
                        <ControlStatus status={profile.membershipStatus} />
                      </div>
                      <div>
                        <span>Base payout</span>
                        <strong>
                          {profile.mode === 'fixed_member'
                            ? formatMinorAmount(
                                profile.fixedPayoutAmountMinor,
                                profile.payoutCurrency,
                              )
                            : 'Defined per assignment'}
                        </strong>
                      </div>
                      <div>
                        <span>Member ID</span>
                        <strong>{profile.membershipId.slice(0, 12)}</strong>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
