import { type FormEvent, useMemo, useState } from 'react';

import { MaterialIcon } from '../../components/icons/material-icon';
import { GlassPanel } from '../../components/ui/glass-panel';
import { useNetworkAccounts } from '../../features/tracking-networks/use-tracking-networks';
import type {
  DuplicateProtectionLockMode,
  DuplicateProtectionRuleStatus,
  FraudRiskLevel,
} from '../../features/control-plane/control-plane.types';
import { useFraudReview, useOffers } from '../../features/control-plane/use-control-plane';
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
  formatLabel,
  shortId,
} from '../control-plane/control-plane-formatters';

export function FraudReviewPage() {
  const [networkAccountId, setNetworkAccountId] = useState('');
  const [offerId, setOfferId] = useState('');
  const [risk, setRisk] = useState<FraudRiskLevel | 'all'>('all');
  const [decision, setDecision] = useState<'accepted' | 'duplicate' | 'all'>('all');
  const [lockMode, setLockMode] = useState<DuplicateProtectionLockMode>('duration');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fraud = useFraudReview({
    ...(networkAccountId.length > 0 ? { networkAccountId } : {}),
    ...(offerId.length > 0 ? { offerId } : {}),
    ...(risk !== 'all' ? { fraudRiskLevel: risk } : {}),
    ...(decision !== 'all' ? { duplicateDecision: decision } : {}),
    limit: 200,
  });
  const accounts = useNetworkAccounts();
  const offers = useOffers();
  const activeAccounts = useMemo(
    () => accounts.accounts.filter((account) => account.status === 'active'),
    [accounts.accounts],
  );
  const availableOffers = useMemo(
    () =>
      offers.offers.filter(
        (offer) =>
          offer.status !== 'archived' &&
          (networkAccountId.length === 0 || offer.networkAccountId === networkAccountId),
      ),
    [networkAccountId, offers.offers],
  );

  async function handleCreateRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setActionError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedOfferId = String(formData.get('offerId') ?? '').trim();
    const durationValue = String(formData.get('lockDurationSeconds') ?? '').trim();
    const sessionValue = String(formData.get('sessionWindowSeconds') ?? '').trim();
    const lockUntilValue = String(formData.get('lockUntil') ?? '').trim();
    const offerExpiryValue = String(formData.get('offerExpiryAt') ?? '').trim();

    try {
      const rule = await fraud.createRule({
        networkAccountId: String(formData.get('networkAccountId') ?? ''),
        offerId: selectedOfferId.length === 0 ? null : selectedOfferId,
        name: String(formData.get('name') ?? ''),
        lockMode,
        sessionWindowSeconds:
          sessionValue.length === 0 ? null : Number.parseInt(sessionValue, 10),
        lockDurationSeconds:
          durationValue.length === 0 ? null : Number.parseInt(durationValue, 10),
        lockUntil:
          lockUntilValue.length === 0 ? null : new Date(lockUntilValue).toISOString(),
        offerExpiryAt:
          offerExpiryValue.length === 0 ? null : new Date(offerExpiryValue).toISOString(),
        matchVisitorId: formData.get('matchVisitorId') === 'on',
        matchIpAndUserAgent: formData.get('matchIpAndUserAgent') === 'on',
        rapidRepeatWindowSeconds: Number.parseInt(
          String(formData.get('rapidRepeatWindowSeconds') ?? '60'),
          10,
        ),
        rapidRepeatThreshold: Number.parseInt(
          String(formData.get('rapidRepeatThreshold') ?? '5'),
          10,
        ),
        status: String(formData.get('status') ?? 'active') as 'active' | 'paused',
      });
      form.reset();
      setLockMode('duration');
      setFeedback(`${rule.name} was added to duplicate protection.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The duplicate rule could not be created.');
    }
  }

  async function handleRuleStatus(ruleId: string, status: DuplicateProtectionRuleStatus) {
    setFeedback(null);
    setActionError(null);

    try {
      await fraud.updateRule({ ruleId, status });
      setFeedback(`Duplicate rule status changed to ${status}.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The duplicate rule could not be updated.');
    }
  }

  if (fraud.status === 'forbidden') {
    return (
      <ControlAccessDenied
        message="Fraud review is limited to Platform Super Admins, Company Admins and Managers."
        title="Fraud review unavailable"
      />
    );
  }

  if (fraud.status === 'loading' || fraud.status === 'idle') {
    return <ControlLoading label="fraud review" />;
  }

  return (
    <div className="control-page">
      <ControlModuleHeader
        description={
          <>
            Configure duplicate locks and inspect high-risk traffic for{' '}
            <strong>{fraud.companyName}</strong>.
          </>
        }
        eyebrow="Traffic Integrity"
        icon="gpp_bad"
        stats={[
          { label: 'Rules', value: fraud.rules.length },
          { label: 'Traffic', value: fraud.clicks.length },
          {
            label: 'High Risk',
            value: fraud.clicks.filter((click) => click.fraudRiskLevel === 'high').length,
          },
        ]}
        title="Fraud & Duplicate Review"
      />

      <ControlFeedback error={actionError ?? fraud.error} message={feedback} />

      <div className="control-layout-grid">
        {fraud.permissions.canManage && (
          <GlassPanel as="section" className="control-side-card">
            <ControlCardHeading
              description="Choose how repeat traffic should be locked and attributed."
              eyebrow="Duplicate Policy"
              title="Add protection rule"
            />
            <form className="control-form" onSubmit={(event) => void handleCreateRule(event)}>
              <label>
                <span>Network account</span>
                <select name="networkAccountId" required>
                  <option value="">Select account</option>
                  {activeAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} · {account.providerName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Offer scope</span>
                <select name="offerId">
                  <option value="">All account offers</option>
                  {offers.offers.map((offer) => (
                    <option key={offer.id} value={offer.id}>{offer.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Rule name</span>
                <input name="name" placeholder="30-day visitor lock" required />
              </label>
              <label>
                <span>Lock mode</span>
                <select
                  name="lockMode"
                  onChange={(event) =>
                    setLockMode(event.target.value as DuplicateProtectionLockMode)
                  }
                  value={lockMode}
                >
                  <option value="session">Session</option>
                  <option value="duration">Duration</option>
                  <option value="until_date">Until date</option>
                  <option value="until_offer_expiry">Until offer expiry</option>
                  <option value="permanent">Permanent</option>
                </select>
              </label>
              {lockMode === 'duration' && (
                <label>
                  <span>Lock duration seconds</span>
                  <input min="1" name="lockDurationSeconds" placeholder="2592000" required type="number" />
                </label>
              )}
              {lockMode === 'session' && (
                <label>
                  <span>Session window seconds</span>
                  <input min="1" name="sessionWindowSeconds" placeholder="1800" required type="number" />
                </label>
              )}
              {lockMode === 'until_date' && (
                <label>
                  <span>Lock until</span>
                  <input name="lockUntil" required type="datetime-local" />
                </label>
              )}
              {lockMode === 'until_offer_expiry' && (
                <label>
                  <span>Offer expires at</span>
                  <input name="offerExpiryAt" required type="datetime-local" />
                </label>
              )}
              <div className="control-check-grid">
                <label>
                  <input defaultChecked name="matchVisitorId" type="checkbox" />
                  Match visitor ID
                </label>
                <label>
                  <input defaultChecked name="matchIpAndUserAgent" type="checkbox" />
                  Match IP + user agent
                </label>
              </div>
              <label>
                <span>Rapid-repeat window seconds</span>
                <input defaultValue="60" min="1" name="rapidRepeatWindowSeconds" type="number" />
              </label>
              <label>
                <span>Rapid-repeat threshold</span>
                <input defaultValue="5" min="2" name="rapidRepeatThreshold" type="number" />
              </label>
              <label>
                <span>Initial status</span>
                <select defaultValue="active" name="status">
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </label>
              <button className="primary-gradient-button" disabled={fraud.isMutating} type="submit">
                <MaterialIcon name="add_moderator" />
                Add rule
              </button>
            </form>
          </GlassPanel>
        )}

        <GlassPanel
          as="section"
          className={`control-main-card control-directory-surface ${fraud.permissions.canManage ? '' : 'control-main-card--full'}`}
        >
          <ControlCardHeading
            action={
              <RefreshButton disabled={fraud.isMutating} onClick={() => void fraud.refresh()} />
            }
            description={`${fraud.rules.length} duplicate-protection rules.`}
            eyebrow="Policy Registry"
            title="Duplicate rules"
          />
          {fraud.rules.length === 0 ? (
            <ControlEmpty
              icon="policy"
              message="Create a rule to begin duplicate classification."
              title="No duplicate rules"
            />
          ) : (
            <div className="control-record-list">
              {fraud.rules.map((rule) => (
                <article className="control-record" key={rule.id}>
                  <div className="control-record__summary control-record__summary--static">
                    <span className="control-record-icon"><MaterialIcon name="policy" /></span>
                    <span>
                      <strong>{rule.name}</strong>
                      <small>
                        {rule.networkAccountName} · {rule.offerName ?? 'All offers'} · {formatLabel(rule.lockMode)}
                      </small>
                    </span>
                    <ControlStatus status={rule.status} />
                  </div>
                  <div className="control-meta-grid control-meta-grid--three">
                    <div><span>Rapid threshold</span><strong>{rule.rapidRepeatThreshold}</strong></div>
                    <div><span>Visitor match</span><strong>{rule.matchVisitorId ? 'Enabled' : 'Disabled'}</strong></div>
                    <div><span>IP + UA</span><strong>{rule.matchIpAndUserAgent ? 'Enabled' : 'Disabled'}</strong></div>
                  </div>
                  {fraud.permissions.canManage && rule.status !== 'archived' && (
                    <div className="control-action-row">
                      <select
                        disabled={fraud.isMutating}
                        onChange={(event) =>
                          void handleRuleStatus(
                            rule.id,
                            event.target.value as DuplicateProtectionRuleStatus,
                          )
                        }
                        value={rule.status}
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </GlassPanel>

        <GlassPanel
          as="section"
          className="control-main-card control-main-card--full control-directory-surface"
        >
          <ControlCardHeading
            description={`${fraud.clicks.length} traffic records match the current risk filters.`}
            eyebrow="Investigation Queue"
            title="Traffic and flagged clicks"
          />
          <div className="control-filter-bar control-filter-bar--four">
            <select
              onChange={(event) => {
                setNetworkAccountId(event.target.value);
                setOfferId('');
              }}
              value={networkAccountId}
            >
              <option value="">All accounts</option>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
            <select onChange={(event) => setOfferId(event.target.value)} value={offerId}>
              <option value="">All offers</option>
              {availableOffers.map((offer) => (
                <option key={offer.id} value={offer.id}>{offer.name}</option>
              ))}
            </select>
            <select
              onChange={(event) => setRisk(event.target.value as FraudRiskLevel | 'all')}
              value={risk}
            >
              <option value="all">All risk levels</option>
              <option value="high">High risk</option>
              <option value="medium">Medium risk</option>
              <option value="low">Low risk</option>
            </select>
            <select
              onChange={(event) =>
                setDecision(event.target.value as 'accepted' | 'duplicate' | 'all')
              }
              value={decision}
            >
              <option value="all">All decisions</option>
              <option value="duplicate">Duplicate</option>
              <option value="accepted">Accepted</option>
            </select>
          </div>

          {fraud.clicks.length === 0 ? (
            <ControlEmpty
              icon="verified_user"
              message="No traffic currently matches the selected investigation filters."
              title="No flagged clicks"
            />
          ) : (
            <div className="control-table-wrap">
              <table className="control-table control-table--wide">
                <thead>
                  <tr>
                    <th>Click</th>
                    <th>Risk</th>
                    <th>Decision</th>
                    <th>Signals</th>
                    <th>Attribution</th>
                    <th>Captured</th>
                  </tr>
                </thead>
                <tbody>
                  {fraud.clicks.map((click) => (
                    <tr key={click.id}>
                      <td>{shortId(click.publicClickId)}</td>
                      <td><ControlStatus status={click.fraudRiskLevel} /></td>
                      <td><ControlStatus status={click.duplicateDecision} /></td>
                      <td>{click.fraudSignals.join(', ') || 'None'}</td>
                      <td>{click.attributionEligible ? 'Eligible' : 'Blocked'}</td>
                      <td>{formatDateTime(click.capturedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
