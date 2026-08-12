import {
  type FormEvent,
  useMemo,
  useState,
} from 'react';
import {
  MaterialIcon,
} from '../../components/icons/material-icon';
import type {
  CompanyProxyConfiguration,
  CompanyProxyConfigurationStatus,
  CompanyProxyEnforcementMode,
  CompanyProxyFailureBehavior,
  CompanyProxyProviderCode,
  UpdateCompanyProxyConfigurationInput,
} from '../../features/proxy/proxy.types';
import {
  useProxyConfiguration,
} from '../../features/proxy/use-proxy';
import {
  useTenantAdministration,
} from '../../features/tenant-administration/use-tenant-administration';
import {
  formatDateTime,
} from '../control-plane/control-plane-formatters';

import './proxy-customization-panel.css';
const providerLabels:
  Readonly<
    Record<
      CompanyProxyProviderCode,
      string
    >
  > = {
    ipqualityscore:
      'IPQualityScore',
    proxycheck:
      'ProxyCheck',
  };
function readBoundedInteger(
  value: FormDataEntryValue | null,
  fieldName: string,
  minimum: number,
  maximum: number,
): number {
  const normalized =
    String(value ?? '').trim();
  if (normalized.length === 0) {
    throw new Error(
      fieldName + ' is required.',
    );
  }
  const parsed =
    Number(normalized);
  if (
    !Number.isInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    throw new Error(
      fieldName +
        ' must be a whole number between ' +
        String(minimum) +
        ' and ' +
        String(maximum) +
        '.',
    );
  }
  return parsed;
}
function ProxyConfigurationEditor({
  configuration,
  companyName,
  canManage,
  isMutating,
  apiError,
  save,
}: {
  configuration:
    CompanyProxyConfiguration | null;
  companyName: string;
  canManage: boolean;
  isMutating: boolean;
  apiError: string | null;
  save: (
    input:
      UpdateCompanyProxyConfigurationInput,
  ) => Promise<CompanyProxyConfiguration>;
}) {
  const tenant =
    useTenantAdministration({
      search: '',
      role: '',
      membershipStatus: 'active',
      userStatus: 'active',
    });
  const eligibleMembers =
    useMemo(
      () =>
        tenant.directory.items.filter(
          (member) =>
            member.membershipStatus ===
              'active' &&
            member.userStatus ===
              'active' &&
            (
              member.role ===
                'manager' ||
              member.role ===
                'publisher'
            ),
        ),
      [tenant.directory.items],
    );
  const [providerCode, setProviderCode] =
    useState<CompanyProxyProviderCode>(
      configuration?.providerCode ??
        'ipqualityscore',
    );
  const [status, setStatus] =
    useState<CompanyProxyConfigurationStatus>(
      configuration?.status ??
        'disabled',
    );
  const [
    enforcementMode,
    setEnforcementMode,
  ] =
    useState<CompanyProxyEnforcementMode>(
      configuration?.enforcementMode ??
        'monitor',
    );
  const [
    failureBehavior,
    setFailureBehavior,
  ] =
    useState<CompanyProxyFailureBehavior>(
      configuration?.failureBehavior ??
        'flag',
    );
  const [detectProxy, setDetectProxy] =
    useState(
      configuration?.detectProxy ??
        true,
    );
  const [detectVpn, setDetectVpn] =
    useState(
      configuration?.detectVpn ??
        true,
    );
  const [detectTor, setDetectTor] =
    useState(
      configuration?.detectTor ??
        true,
    );
  const [
    bypassMembershipIds,
    setBypassMembershipIds,
  ] =
    useState<readonly string[]>(
      configuration
        ?.bypassOwnerMembershipIds ??
        [],
    );
  const [feedback, setFeedback] =
    useState<string | null>(null);
  const [actionError, setActionError] =
    useState<string | null>(null);
  function toggleBypassMembership(
    membershipId: string,
    checked: boolean,
  ): void {
    setBypassMembershipIds(
      (current) => {
        if (checked) {
          return current.includes(
            membershipId,
          )
            ? current
            : [
                ...current,
                membershipId,
              ];
        }
        return current.filter(
          (item) =>
            item !== membershipId,
        );
      },
    );
  }
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setFeedback(null);
    setActionError(null);
    const data =
      new FormData(
        event.currentTarget,
      );
    const apiKey =
      String(
        data.get('apiKey') ?? '',
      ).trim();
    if (
      configuration === null &&
      apiKey.length < 4
    ) {
      setActionError(
        'Enter the provider API key before creating the configuration.',
      );
      return;
    }
    if (
      configuration !== null &&
      providerCode !==
        configuration.providerCode &&
      apiKey.length < 4
    ) {
      setActionError(
        'Enter a new API key when changing the provider.',
      );
      return;
    }
    if (
      status === 'active' &&
      !detectProxy &&
      !detectVpn &&
      !detectTor
    ) {
      setActionError(
        'Enable at least one Proxy, VPN, or Tor detection signal.',
      );
      return;
    }
    try {
      const saved =
        await save({
          providerCode,
          ...(apiKey.length > 0
            ? { apiKey }
            : {}),
          status,
          enforcementMode,
          riskThreshold:
            readBoundedInteger(
              data.get(
                'riskThreshold',
              ),
              'Risk threshold',
              0,
              100,
            ),
          requestTimeoutMs:
            readBoundedInteger(
              data.get(
                'requestTimeoutMs',
              ),
              'Request timeout',
              250,
              5000,
            ),
          cacheTtlSeconds:
            readBoundedInteger(
              data.get(
                'cacheTtlSeconds',
              ),
              'Cache duration',
              60,
              86400,
            ),
          failureBehavior,
          detectProxy,
          detectVpn,
          detectTor,
          bypassOwnerMembershipIds:
            bypassMembershipIds,
        });
      setFeedback(
        'Proxy configuration for ' +
          companyName +
          ' was saved. Encrypted key ending in ' +
          saved.apiKeyLast4 +
          '.',
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Proxy configuration could not be saved.',
      );
    }
  }
  const visibleError =
    actionError ??
    apiError ??
    tenant.error;
  const savedKeyLabel =
    configuration?.hasApiKey === true
      ? '???? ' +
        configuration.apiKeyLast4
      : 'Not configured';
  return (
    <div className="proxy-customize-panel">
      <section className="customize-neumorphic-panel link-customize-hero">
        <div>
          <span className="customize-eyebrow">
            Traffic Protection
          </span>
          <h2>
            Proxy and VPN detection
          </h2>
          <p>
            Configure a company-level IP-risk
            provider without exposing provider
            credentials to browser responses.
          </p>
        </div>
        <div className="link-customize-domain">
          <span>Provider</span>
          <strong>
            {providerLabels[
              providerCode
            ]}
          </strong>
        </div>
      </section>
      {(visibleError !== null ||
        feedback !== null) && (
        <div
          className={
            visibleError !== null
              ? 'link-customize-feedback is-error'
              : 'link-customize-feedback is-success'
          }
          role={
            visibleError !== null
              ? 'alert'
              : 'status'
          }
        >
          <MaterialIcon
            name={
              visibleError !== null
                ? 'error'
                : 'check_circle'
            }
          />
          <span>
            {visibleError ??
              feedback}
          </span>
        </div>
      )}
      <div className="link-customize-grid">
        <section className="link-customize-card">
          <span className="link-customize-eyebrow">
            Provider configuration
          </span>
          <h3>
            Detection policy
          </h3>
          <p>
            Provider credentials are encrypted
            by the backend before database
            storage.
          </p>
          <form
            className="link-customize-form"
            onSubmit={(event) =>
              void handleSubmit(event)
            }
          >
            <label className="link-customize-field">
              <span>
                Proxy detection provider
              </span>
              <select
                disabled={
                  !canManage ||
                  isMutating
                }
                onChange={(event) =>
                  setProviderCode(
                    event.target
                      .value as
                      CompanyProxyProviderCode,
                  )
                }
                value={providerCode}
              >
                <option value="ipqualityscore">
                  IPQualityScore
                </option>
                <option value="proxycheck">
                  ProxyCheck
                </option>
              </select>
            </label>
            <label className="link-customize-field">
              <span>
                Provider API key
              </span>
              <input
                autoComplete="new-password"
                disabled={
                  !canManage ||
                  isMutating
                }
                name="apiKey"
                placeholder={
                  configuration === null
                    ? 'Enter provider API key'
                    : 'Leave blank to keep ' +
                      savedKeyLabel
                }
                type="password"
              />
              <small>
                Existing secret:
                {' '}
                {savedKeyLabel}
              </small>
            </label>
            <div className="customize-form-grid">
              <label className="link-customize-field">
                <span>Status</span>
                <select
                  disabled={
                    !canManage ||
                    isMutating
                  }
                  onChange={(event) =>
                    setStatus(
                      event.target
                        .value as
                        CompanyProxyConfigurationStatus,
                    )
                  }
                  value={status}
                >
                  <option value="disabled">
                    Disabled
                  </option>
                  <option value="active">
                    Active
                  </option>
                </select>
              </label>
              <label className="link-customize-field">
                <span>
                  Enforcement mode
                </span>
                <select
                  disabled={
                    !canManage ||
                    isMutating
                  }
                  onChange={(event) =>
                    setEnforcementMode(
                      event.target
                        .value as
                        CompanyProxyEnforcementMode,
                    )
                  }
                  value={
                    enforcementMode
                  }
                >
                  <option value="monitor">
                    Monitor only
                  </option>
                  <option value="enforce">
                    Enforce decisions
                  </option>
                </select>
              </label>
            </div>
            <div className="customize-form-grid">
              <label className="link-customize-field">
                <span>
                  Risk threshold
                </span>
                <input
                  defaultValue={
                    configuration
                      ?.riskThreshold ??
                    75
                  }
                  disabled={
                    !canManage ||
                    isMutating
                  }
                  max="100"
                  min="0"
                  name="riskThreshold"
                  required
                  type="number"
                />
              </label>
              <label className="link-customize-field">
                <span>
                  Request timeout
                  (milliseconds)
                </span>
                <input
                  defaultValue={
                    configuration
                      ?.requestTimeoutMs ??
                    1500
                  }
                  disabled={
                    !canManage ||
                    isMutating
                  }
                  max="5000"
                  min="250"
                  name="requestTimeoutMs"
                  required
                  type="number"
                />
              </label>
            </div>
            <div className="customize-form-grid">
              <label className="link-customize-field">
                <span>
                  Cache duration
                  (seconds)
                </span>
                <input
                  defaultValue={
                    configuration
                      ?.cacheTtlSeconds ??
                    3600
                  }
                  disabled={
                    !canManage ||
                    isMutating
                  }
                  max="86400"
                  min="60"
                  name="cacheTtlSeconds"
                  required
                  type="number"
                />
              </label>
              <label className="link-customize-field">
                <span>
                  Provider failure policy
                </span>
                <select
                  disabled={
                    !canManage ||
                    isMutating
                  }
                  onChange={(event) =>
                    setFailureBehavior(
                      event.target
                        .value as
                        CompanyProxyFailureBehavior,
                    )
                  }
                  value={
                    failureBehavior
                  }
                >
                  <option value="allow">
                    Allow click
                  </option>
                  <option value="flag">
                    Flag for review
                  </option>
                  <option value="block">
                    Block click
                  </option>
                </select>
              </label>
            </div>
            <div className="link-customize-field">
              <span>
                Detection signals
              </span>
              <div className="link-platform-grid">
                <label className="link-platform-option">
                  <input
                    checked={
                      detectProxy
                    }
                    disabled={
                      !canManage ||
                      isMutating
                    }
                    onChange={(event) =>
                      setDetectProxy(
                        event.target
                          .checked,
                      )
                    }
                    type="checkbox"
                  />
                  <MaterialIcon name="shield" />
                  <span>Proxy</span>
                </label>
                <label className="link-platform-option">
                  <input
                    checked={detectVpn}
                    disabled={
                      !canManage ||
                      isMutating
                    }
                    onChange={(event) =>
                      setDetectVpn(
                        event.target
                          .checked,
                      )
                    }
                    type="checkbox"
                  />
                  <MaterialIcon name="vpn_lock" />
                  <span>VPN</span>
                </label>
                <label className="link-platform-option">
                  <input
                    checked={detectTor}
                    disabled={
                      !canManage ||
                      isMutating
                    }
                    onChange={(event) =>
                      setDetectTor(
                        event.target
                          .checked,
                      )
                    }
                    type="checkbox"
                  />
                  <MaterialIcon name="hub" />
                  <span>Tor</span>
                </label>
              </div>
            </div>
            {canManage && (
              <button
                className="link-customize-save"
                disabled={isMutating}
                type="submit"
              >
                <MaterialIcon name="save" />
                {isMutating
                  ? 'Saving...'
                  : 'Save proxy settings'}
              </button>
            )}
          </form>
        </section>
        <section className="link-customize-card">
          <span className="link-customize-eyebrow">
            Bypass rules
          </span>
          <h3>
            Manager and Publisher bypass
          </h3>
          <p>
            Selected tracking-link owners skip
            the external provider lookup.
          </p>
          {tenant.status ===
          'loading' ? (
            <div className="customize-form-note">
              <MaterialIcon
                className="spin"
                name="progress_activity"
              />
              Loading eligible members...
            </div>
          ) : eligibleMembers.length ===
            0 ? (
            <div className="customize-form-note">
              <MaterialIcon name="group_off" />
              No active Manager or Publisher
              memberships are available.
            </div>
          ) : (
            <div className="link-platform-grid">
              {eligibleMembers.map(
                (member) => (
                  <label
                    className="link-platform-option"
                    key={
                      member.membershipId
                    }
                  >
                    <input
                      checked={
                        bypassMembershipIds.includes(
                          member.membershipId,
                        )
                      }
                      disabled={
                        !canManage ||
                        isMutating
                      }
                      onChange={(event) =>
                        toggleBypassMembership(
                          member.membershipId,
                          event.target
                            .checked,
                        )
                      }
                      type="checkbox"
                    />
                    <MaterialIcon
                      name={
                        member.role ===
                        'manager'
                          ? 'manage_accounts'
                          : 'person'
                      }
                    />
                    <span>
                      {member.displayName ??
                        member.email ??
                        member.userId.slice(
                          0,
                          12,
                        )}
                    </span>
                  </label>
                ),
              )}
            </div>
          )}
          <div className="link-preview-list">
            <div className="link-preview-item">
              <span>
                Current configuration
              </span>
              <div className="link-preview-value">
                <code>
                  {configuration === null
                    ? 'Not configured'
                    : configuration.status +
                      ' / ' +
                      configuration
                        .enforcementMode}
                </code>
              </div>
            </div>
            <div className="link-preview-item">
              <span>
                Saved API key
              </span>
              <div className="link-preview-value">
                <code>
                  {savedKeyLabel}
                </code>
              </div>
            </div>
            <div className="link-preview-item">
              <span>
                Last updated
              </span>
              <div className="link-preview-value">
                <code>
                  {configuration === null
                    ? 'Not saved'
                    : formatDateTime(
                        configuration
                          .updatedAt,
                      )}
                </code>
              </div>
            </div>
          </div>
          <p className="customize-form-note">
            <MaterialIcon name="info" />
            Secure configuration storage is active. The tracker uses the saved provider configuration during live redirect checks. For security, the raw API key is not returned to the browser after Save; only its masked ending is shown.
          </p>
        </section>
      </div>
    </div>
  );
}
export function ProxyCustomizationPanel() {
  const proxy =
    useProxyConfiguration();
  if (
    proxy.status === 'loading' ||
    proxy.status === 'idle'
  ) {
    return (
      <section className="customize-neumorphic-panel customize-pending-panel">
        <div className="customize-pending-icon">
          <MaterialIcon
            className="spin"
            name="progress_activity"
          />
        </div>
        <div>
          <span className="customize-eyebrow">
            Loading configuration
          </span>
          <h2>
            Proxy configuration
          </h2>
          <p>
            Reading the encrypted company
            Proxy settings.
          </p>
        </div>
      </section>
    );
  }
  if (
    proxy.status === 'forbidden'
  ) {
    return (
      <section className="customize-neumorphic-panel customize-pending-panel">
        <div className="customize-pending-icon">
          <MaterialIcon name="lock" />
        </div>
        <div>
          <span className="customize-eyebrow">
            Restricted configuration
          </span>
          <h2>
            Proxy configuration
          </h2>
          <p>
            Platform Super Admin or Company
            Admin access is required.
          </p>
        </div>
      </section>
    );
  }
  return (
    <ProxyConfigurationEditor
      apiError={proxy.error}
      canManage={
        proxy.permissions.canManage
      }
      companyName={
        proxy.companyName
      }
      configuration={
        proxy.configuration
      }
      isMutating={
        proxy.isMutating
      }
      key={
        proxy.configuration
          ?.updatedAt ??
        'proxy-empty'
      }
      save={
        proxy.updateConfiguration
      }
    />
  );
}
