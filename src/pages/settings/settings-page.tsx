import { useState, type FormEvent } from 'react';

import { MaterialIcon } from '../../components/icons/material-icon';
import { useAuth } from '../../features/auth/use-auth';
import { useCustomization } from '../../features/control-plane/use-control-plane';
import { TrackingDomainsPanel } from '../tracking-domains/tracking-domains-panel';
import { LinkCustomizationPanel } from './link-customization-panel';
import { ProxyCustomizationPanel } from './proxy-customization-panel';
import { SmtpCustomizationPanel } from './smtp-customization-panel';
import { formatLabel } from '../control-plane/control-plane-formatters';
import {
  ControlAccessDenied,
  ControlFeedback,
  ControlLoading,
  ControlModuleHeader,
} from '../control-plane/control-plane-ui';

function nullableValue(value: FormDataEntryValue | null): string | null {
  const normalized = String(value ?? '').trim();
  return normalized.length === 0 ? null : normalized;
}

type CustomizeTab =
  | 'general'
  | 'domain'
  | 'link'
  | 'proxy'
  | 'smtp';
const customizeTabs: readonly {
  id: CustomizeTab;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    id: 'general',
    label: 'General',
    icon: 'tune',
    description: 'Branding and operational defaults',
  },
  {
    id: 'domain',
    label: 'Domain',
    icon: 'language',
    description: 'Tracking-domain configuration',
  },
  {
    id: 'link',
    label: 'Link',
    icon: 'link',
    description: 'Tracking and sharing structure',
  },
  {
    id: 'proxy',
    label: 'Proxy',
    icon: 'security',
    description: 'Proxy and VPN detection',
  },
  {
    id: 'smtp',
    label: 'SMTP',
    icon: 'mail',
    description: 'Brevo email delivery',
  },
];
export function SettingsPage() {
  const auth = useAuth();
  const settings = useCustomization();
  const [activeTab, setActiveTab] =
    useState<CustomizeTab>('general');
  const [feedback, setFeedback] =
    useState<string | null>(null);
  const [actionError, setActionError] =
    useState<string | null>(null);
  if (
    settings.status === 'loading' ||
    settings.status === 'idle'
  ) {
    return <ControlLoading label="customization" />;
  }
  if (settings.status === 'forbidden') {
    return (
      <ControlAccessDenied
        message="Select an accessible company to view customization settings."
        title="Customize unavailable"
      />
    );
  }
  async function handleGeneralSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFeedback(null);
    setActionError(null);
    try {
      const data =
        new FormData(event.currentTarget);
      await settings.updateCustomization({
        brandName:
          nullableValue(
            data.get('brandName'),
          ),
        tagline:
          nullableValue(
            data.get('tagline'),
          ),
        logoUrl:
          nullableValue(
            data.get('logoUrl'),
          ),
        primaryColor:
          nullableValue(
            data.get('primaryColor'),
          ),
        secondaryColor:
          nullableValue(
            data.get('secondaryColor'),
          ),
        supportEmail:
          nullableValue(
            data.get('supportEmail'),
          ),
        defaultCurrency:
          nullableValue(
            data.get('defaultCurrency'),
          ),
        defaultTimezone:
          nullableValue(
            data.get('defaultTimezone'),
          ),
      });
      setFeedback(
        'General customization settings were saved.',
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'General customization update failed.',
      );
    }
  }
  const membershipRole =
    auth.identity?.authorization
      .companyMembership?.role ?? null;
  const platformRole =
    auth.identity?.authorization
      .platformRole ?? null;
  const customizationKey =
    settings.customization?.updatedAt ??
    'empty';
  return (
    <div className="control-page customize-page">
      <style>{`
        .customize-page {
          --customize-bg: #edf2f7;
          --customize-surface: rgba(255, 255, 255, 0.78);
          --customize-surface-solid: #f7f9fc;
          --customize-text: #172033;
          --customize-muted: #687287;
          --customize-accent: #6f5cf5;
          --customize-border: rgba(111, 92, 245, 0.13);
          color: var(--customize-text);
        }
        .customize-shell {
          padding: 22px;
          border: 1px solid rgba(255, 255, 255, 0.82);
          border-radius: 28px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.92),
              rgba(232, 238, 247, 0.78)
            );
          box-shadow:
            18px 18px 42px rgba(151, 163, 184, 0.28),
            -16px -16px 38px rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(22px);
        }
        .customize-tab-navigation {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 22px;
        }
        .customize-tab-button {
          display: flex;
          min-height: 88px;
          align-items: center;
          gap: 12px;
          padding: 15px;
          border: 1px solid transparent;
          border-radius: 20px;
          color: var(--customize-muted);
          background: #eef3f9;
          box-shadow:
            7px 7px 16px rgba(167, 177, 195, 0.27),
            -7px -7px 16px rgba(255, 255, 255, 0.88);
          cursor: pointer;
          text-align: left;
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            color 160ms ease,
            border-color 160ms ease;
        }
        .customize-tab-button:hover {
          transform: translateY(-2px);
          color: var(--customize-text);
        }
        .customize-tab-button.is-active {
          color: var(--customize-accent);
          border-color: var(--customize-border);
          background:
            linear-gradient(
              145deg,
              #f8faff,
              #e7ecf5
            );
          box-shadow:
            inset 4px 4px 10px rgba(178, 188, 205, 0.3),
            inset -4px -4px 10px rgba(255, 255, 255, 0.92);
        }
        .customize-tab-button .material-symbols-rounded,
        .customize-tab-button .material-icons {
          font-size: 25px;
        }
        .customize-tab-copy {
          display: grid;
          gap: 3px;
        }
        .customize-tab-copy strong {
          font-size: 0.92rem;
          color: inherit;
        }
        .customize-tab-copy small {
          color: var(--customize-muted);
          font-size: 0.7rem;
          line-height: 1.35;
        }
        .customize-general-grid {
          display: grid;
          grid-template-columns:
            minmax(230px, 0.72fr)
            minmax(0, 1.8fr);
          gap: 20px;
        }
        .customize-neumorphic-panel {
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.82);
          border-radius: 24px;
          background: var(--customize-surface);
          box-shadow:
            12px 12px 30px rgba(153, 164, 183, 0.22),
            -10px -10px 26px rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(18px);
        }
        .customize-eyebrow {
          display: block;
          margin-bottom: 7px;
          color: var(--customize-accent);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .customize-neumorphic-panel h2 {
          margin: 0;
          color: var(--customize-text);
          font-size: 1.24rem;
        }
        .customize-neumorphic-panel > p,
        .customize-pending-panel p {
          color: var(--customize-muted);
          line-height: 1.65;
        }
        .customize-summary-list {
          display: grid;
          gap: 10px;
          margin-top: 20px;
        }
        .customize-summary-item {
          display: grid;
          gap: 4px;
          padding: 13px 15px;
          border-radius: 16px;
          background: #eef3f8;
          box-shadow:
            inset 3px 3px 8px rgba(174, 185, 202, 0.25),
            inset -3px -3px 8px rgba(255, 255, 255, 0.9);
        }
        .customize-summary-item span {
          color: var(--customize-muted);
          font-size: 0.72rem;
        }
        .customize-summary-item strong,
        .customize-summary-item code {
          color: var(--customize-text);
          overflow-wrap: anywhere;
        }
        .customize-form {
          display: grid;
          gap: 18px;
          margin-top: 22px;
        }
        .customize-form-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .customize-field {
          display: grid;
          gap: 8px;
        }
        .customize-field span {
          color: #4e586d;
          font-size: 0.79rem;
          font-weight: 700;
        }
        .customize-field input,
        .customize-field textarea,
        .customize-field select {
          width: 100%;
          min-height: 46px;
          padding: 11px 14px;
          border: 1px solid rgba(107, 118, 141, 0.12);
          border-radius: 15px;
          outline: none;
          color: var(--customize-text);
          background: #eef3f8;
          box-shadow:
            inset 4px 4px 10px rgba(174, 185, 202, 0.24),
            inset -4px -4px 10px rgba(255, 255, 255, 0.92);
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease;
        }
        .customize-field textarea {
          min-height: 96px;
          resize: vertical;
        }
        .customize-field input:focus,
        .customize-field textarea:focus,
        .customize-field select:focus {
          border-color: rgba(111, 92, 245, 0.45);
          box-shadow:
            inset 3px 3px 8px rgba(174, 185, 202, 0.22),
            inset -3px -3px 8px rgba(255, 255, 255, 0.95),
            0 0 0 4px rgba(111, 92, 245, 0.09);
        }
        .customize-field input:disabled,
        .customize-field textarea:disabled,
        .customize-field select:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }
        .customize-form-note {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 14px 16px;
          border-radius: 16px;
          color: #5e6677;
          background: rgba(111, 92, 245, 0.07);
        }
        .customize-save-button {
          display: inline-flex;
          width: fit-content;
          min-height: 46px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 20px;
          border: 0;
          border-radius: 15px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #7664f6,
              #5b48de
            );
          box-shadow:
            8px 8px 18px rgba(99, 80, 220, 0.24),
            -5px -5px 14px rgba(255, 255, 255, 0.8);
          cursor: pointer;
          font-weight: 800;
        }
        .customize-save-button:disabled {
          cursor: wait;
          opacity: 0.62;
        }
        .customize-pending-panel {
          display: flex;
          min-height: 280px;
          align-items: center;
          justify-content: center;
          gap: 22px;
        }
        .customize-pending-icon {
          display: grid;
          width: 78px;
          height: 78px;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 22px;
          color: var(--customize-accent);
          background: #edf2f8;
          box-shadow:
            8px 8px 18px rgba(166, 177, 195, 0.28),
            -8px -8px 18px rgba(255, 255, 255, 0.9);
        }
        .customize-pending-icon .material-symbols-rounded,
        .customize-pending-icon .material-icons {
          font-size: 34px;
        }
        .customize-status-pill {
          display: inline-flex;
          margin-top: 7px;
          padding: 7px 11px;
          border-radius: 999px;
          color: #725ff0;
          background: rgba(111, 92, 245, 0.09);
          font-size: 0.72rem;
          font-weight: 800;
        }
        @media (max-width: 1050px) {
          .customize-tab-navigation {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
          .customize-general-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 680px) {
          .customize-shell {
            padding: 14px;
            border-radius: 20px;
          }
          .customize-tab-navigation {
            grid-template-columns: 1fr 1fr;
          }
          .customize-tab-button {
            min-height: 72px;
          }
          .customize-tab-copy small {
            display: none;
          }
          .customize-form-grid {
            grid-template-columns: 1fr;
          }
          .customize-pending-panel {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
      <ControlModuleHeader
        description={
          <>
            Configure branding and platform behavior for{' '}
            <strong>{settings.companyName}</strong>.
          </>
        }
        eyebrow="Super Admin Configuration"
        icon="tune"
        stats={[
          {
            label: 'Access',
            value: platformRole
              ? 'Platform Admin'
              : membershipRole
                ? formatLabel(membershipRole)
                : 'User',
          },
          {
            label: 'Currency',
            value:
              settings.customization
                ?.defaultCurrency ??
              'Not configured',
          },
          {
            label: 'Timezone',
            value:
              settings.customization
                ?.defaultTimezone ??
              'Not configured',
          },
        ]}
        title="Customize"
      />
      <ControlFeedback
        error={
          actionError ??
          settings.error
        }
        message={feedback}
      />
      <div className="customize-shell">
        <nav
          aria-label="Customize sections"
          className="customize-tab-navigation"
        >
          {customizeTabs.map((tab) => (
            <button
              className={
                activeTab === tab.id
                  ? 'customize-tab-button is-active'
                  : 'customize-tab-button'
              }
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setFeedback(null);
                setActionError(null);
              }}
              type="button"
            >
              <MaterialIcon name={tab.icon} />
              <span className="customize-tab-copy">
                <strong>{tab.label}</strong>
                <small>{tab.description}</small>
              </span>
            </button>
          ))}
        </nav>
        {activeTab === 'general' && (
          <div className="customize-general-grid">
            <section className="customize-neumorphic-panel">
              <span className="customize-eyebrow">
                Workspace identity
              </span>
              <h2>General overview</h2>
              <p>
                These defaults control supported
                interfaces, reporting context, and
                company-facing communication.
              </p>
              <div className="customize-summary-list">
                <div className="customize-summary-item">
                  <span>Signed-in email</span>
                  <strong>
                    {auth.user?.email ??
                      'Not available'}
                  </strong>
                </div>
                <div className="customize-summary-item">
                  <span>Platform role</span>
                  <strong>
                    {platformRole
                      ? formatLabel(platformRole)
                      : 'None'}
                  </strong>
                </div>
                <div className="customize-summary-item">
                  <span>Company role</span>
                  <strong>
                    {membershipRole
                      ? formatLabel(membershipRole)
                      : 'Platform context'}
                  </strong>
                </div>
                <div className="customize-summary-item">
                  <span>Selected company</span>
                  <strong>
                    {settings.companyName}
                  </strong>
                </div>
              </div>
              <p className="customize-form-note">
                <MaterialIcon name="shield_lock" />
                Authentication, passwords, and
                sessions remain managed by
                Supabase Auth.
              </p>
            </section>
            <section className="customize-neumorphic-panel">
              <span className="customize-eyebrow">
                General
              </span>
              <h2>Brand and operational defaults</h2>
              <p>
                Configure the primary identity,
                currency, timezone, and support
                details for this company.
              </p>
              <form
                className="customize-form"
                key={customizationKey}
                onSubmit={(event) =>
                  void handleGeneralSubmit(event)
                }
              >
                <div className="customize-form-grid">
                  <label className="customize-field">
                    <span>Brand name</span>
                    <input
                      defaultValue={
                        settings.customization
                          ?.brandName ?? ''
                      }
                      disabled={
                        !settings.permissions
                          .canCustomize
                      }
                      name="brandName"
                      placeholder="Publisher Tracker"
                    />
                  </label>
                  <label className="customize-field">
                    <span>Default currency</span>
                    <input
                      defaultValue={
                        settings.customization
                          ?.defaultCurrency ?? ''
                      }
                      disabled={
                        !settings.permissions
                          .canCustomize
                      }
                      maxLength={3}
                      name="defaultCurrency"
                      placeholder="USD"
                    />
                  </label>
                </div>
                <label className="customize-field">
                  <span>Tagline</span>
                  <textarea
                    defaultValue={
                      settings.customization
                        ?.tagline ?? ''
                    }
                    disabled={
                      !settings.permissions
                        .canCustomize
                    }
                    maxLength={240}
                    name="tagline"
                    placeholder="Track smarter. Grow faster."
                  />
                </label>
                <div className="customize-form-grid">
                  <label className="customize-field">
                    <span>Default timezone</span>
                    <input
                      defaultValue={
                        settings.customization
                          ?.defaultTimezone ?? ''
                      }
                      disabled={
                        !settings.permissions
                          .canCustomize
                      }
                      name="defaultTimezone"
                      placeholder="Asia/Karachi"
                    />
                  </label>
                  <label className="customize-field">
                    <span>Support email</span>
                    <input
                      defaultValue={
                        settings.customization
                          ?.supportEmail ?? ''
                      }
                      disabled={
                        !settings.permissions
                          .canCustomize
                      }
                      name="supportEmail"
                      placeholder="support@example.com"
                      type="email"
                    />
                  </label>
                </div>
                <label className="customize-field">
                  <span>Logo URL</span>
                  <input
                    defaultValue={
                      settings.customization
                        ?.logoUrl ?? ''
                    }
                    disabled={
                      !settings.permissions
                        .canCustomize
                    }
                    name="logoUrl"
                    placeholder="https://cdn.example.com/logo.svg"
                    type="url"
                  />
                </label>
                <div className="customize-form-grid">
                  <label className="customize-field">
                    <span>Primary color</span>
                    <input
                      defaultValue={
                        settings.customization
                          ?.primaryColor ?? ''
                      }
                      disabled={
                        !settings.permissions
                          .canCustomize
                      }
                      name="primaryColor"
                      placeholder="#8B5CF6"
                    />
                  </label>
                  <label className="customize-field">
                    <span>Secondary color</span>
                    <input
                      defaultValue={
                        settings.customization
                          ?.secondaryColor ?? ''
                      }
                      disabled={
                        !settings.permissions
                          .canCustomize
                      }
                      name="secondaryColor"
                      placeholder="#F59E0B"
                    />
                  </label>
                </div>
                {settings.permissions.canCustomize ? (
                  <button
                    className="customize-save-button"
                    disabled={settings.isMutating}
                    type="submit"
                  >
                    <MaterialIcon name="save" />
                    {settings.isMutating
                      ? 'Saving...'
                      : 'Save general settings'}
                  </button>
                ) : (
                  <p className="customize-form-note">
                    <MaterialIcon name="lock" />
                    Authorized company access is
                    required to edit these values.
                  </p>
                )}
              </form>
            </section>
          </div>
        )}
        {activeTab === 'domain' && (
          <TrackingDomainsPanel embedded />
        )}
        {activeTab === 'link' && (
          <LinkCustomizationPanel />
        )}
        {activeTab === 'proxy' && (
          <ProxyCustomizationPanel />
        )}
        {activeTab === 'smtp' && (
          <SmtpCustomizationPanel />
        )}
      </div>
    </div>
  );
}
