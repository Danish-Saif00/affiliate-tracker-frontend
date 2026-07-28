import {
  type FormEvent,
  useEffect,
  useState,
} from 'react';
import { MaterialIcon } from '../../components/icons/material-icon';
import type {
  CompanyLinkIdentifierMode,
  CompanyRestrictedSharePlatform,
} from '../../features/control-plane/control-plane.types';
import { useCustomization } from '../../features/control-plane/use-control-plane';
import { useTrackingDomains } from '../../features/tracking-networks/use-tracking-networks';
const PLATFORM_OPTIONS:
  readonly {
    id: CompanyRestrictedSharePlatform;
    label: string;
    icon: string;
  }[] = [
    {
      id: 'snapchat',
      label: 'Snapchat',
      icon: 'chat_bubble',
    },
    {
      id: 'instagram',
      label: 'Instagram',
      icon: 'photo_camera',
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: 'public',
    },
  ];
function formatQueryParameters(
  value: Readonly<Record<string, string>>,
): string {
  return Object.entries(value)
    .map(([key, item]) => `${key}=${item}`)
    .join('\n');
}
function parseQueryParameters(
  value: string,
): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  const lines = value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length > 25) {
    throw new Error(
      'A maximum of 25 default query parameters is allowed.',
    );
  }
  for (const line of lines) {
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      throw new Error(
        `Invalid query parameter "${line}". Use key=value format.`,
      );
    }
    const key = line
      .slice(0, separatorIndex)
      .trim();
    const item = line
      .slice(separatorIndex + 1)
      .trim();
    if (key.length === 0) {
      throw new Error(
        'Each default query parameter requires a key.',
      );
    }
    if (Object.hasOwn(result, key)) {
      throw new Error(
        `The query parameter "${key}" is duplicated.`,
      );
    }
    result[key] = item;
  }
  return result;
}
function buildNormalPreview(
  hostname: string,
  identifierMode: CompanyLinkIdentifierMode,
  queryParameters: Readonly<Record<string, string>>,
): string {
  const identifier =
    identifierMode === 'tracking_code'
      ? 'trk_7c9e2a4f'
      : 'summer-campaign';
  const url = new URL(
    `https://${hostname}/r/${identifier}`,
  );
  for (
    const [key, value] of
    Object.entries(queryParameters)
  ) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
function buildPlainTextPreview(
  normalUrl: string,
): string {
  const url = new URL(normalUrl);
  const hostname = url.hostname.replaceAll(
    '.',
    '[.]',
  );
  return `${hostname}${url.pathname}${url.search}`;
}
function togglePlatform(
  current: readonly CompanyRestrictedSharePlatform[],
  platform: CompanyRestrictedSharePlatform,
  checked: boolean,
): readonly CompanyRestrictedSharePlatform[] {
  if (checked) {
    return current.includes(platform)
      ? current
      : [...current, platform];
  }
  return current.filter(
    (item) => item !== platform,
  );
}
export function LinkCustomizationPanel() {
  const settings = useCustomization();
  const domains = useTrackingDomains();
  const [identifierMode, setIdentifierMode] =
    useState<CompanyLinkIdentifierMode>(
      settings.customization
        ?.linkIdentifierMode ??
        'slug_or_code',
    );
  const [
    plainTextSharingEnabled,
    setPlainTextSharingEnabled,
  ] = useState(
    settings.customization
      ?.plainTextSharingEnabled ??
      true,
  );
  const [
    restrictedPlatforms,
    setRestrictedPlatforms,
  ] = useState<
    readonly CompanyRestrictedSharePlatform[]
  >(
    settings.customization
      ?.restrictedSharePlatforms ??
      [
        'snapchat',
        'instagram',
        'facebook',
      ],
  );
  const [
    queryParameterText,
    setQueryParameterText,
  ] = useState(
    formatQueryParameters(
      settings.customization
        ?.defaultLinkQueryParameters ??
        {},
    ),
  );
  const [feedback, setFeedback] =
    useState<string | null>(null);
  const [actionError, setActionError] =
    useState<string | null>(null);
  useEffect(() => {
    const customization =
      settings.customization;
    const timer = window.setTimeout(() => {
      setIdentifierMode(
        customization?.linkIdentifierMode ??
          'slug_or_code',
      );
      setPlainTextSharingEnabled(
        customization
          ?.plainTextSharingEnabled ??
          true,
      );
      setRestrictedPlatforms(
        customization
          ?.restrictedSharePlatforms ??
          [
            'snapchat',
            'instagram',
            'facebook',
          ],
      );
      setQueryParameterText(
        formatQueryParameters(
          customization
            ?.defaultLinkQueryParameters ??
            {},
        ),
      );
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [settings.customization]);
  const primaryDomain =
    domains.domains.find(
      (domain) =>
        domain.status === 'active' &&
        domain.isPrimary,
    ) ??
    domains.domains.find(
      (domain) =>
        domain.status === 'active',
    ) ??
    null;
  const previewHostname =
    primaryDomain?.hostname ??
    'track.example.com';
  let previewParameters:
    Readonly<Record<string, string>> = {};
  let previewParameterError:
    string | null = null;
  try {
    previewParameters =
      parseQueryParameters(
        queryParameterText,
      );
  } catch (error) {
    previewParameterError =
      error instanceof Error
        ? error.message
        : 'The query parameters are invalid.';
  }
  const normalPreview =
    buildNormalPreview(
      previewHostname,
      identifierMode,
      previewParameters,
    );
  const plainTextPreview =
    buildPlainTextPreview(
      normalPreview,
    );
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFeedback(null);
    setActionError(null);
    try {
      const defaultLinkQueryParameters =
        parseQueryParameters(
          queryParameterText,
        );
      await settings.updateCustomization({
        linkIdentifierMode:
          identifierMode,
        plainTextSharingEnabled,
        restrictedSharePlatforms:
          restrictedPlatforms,
        defaultLinkQueryParameters,
      });
      setFeedback(
        'Link configuration was saved.',
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Link configuration could not be saved.',
      );
    }
  }
  async function handleCopy(
    value: string,
    label: string,
  ) {
    setFeedback(null);
    setActionError(null);
    try {
      await navigator.clipboard.writeText(
        value,
      );
      setFeedback(
        `${label} copied to the clipboard.`,
      );
    } catch {
      setActionError(
        `${label} could not be copied.`,
      );
    }
  }
  if (
    settings.status === 'loading' ||
    settings.status === 'idle'
  ) {
    return (
      <section className="link-customize-state">
        <MaterialIcon
          className="spin"
          name="progress_activity"
        />
        <strong>
          Loading link configuration
        </strong>
      </section>
    );
  }
  if (settings.status === 'forbidden') {
    return (
      <section className="link-customize-state">
        <MaterialIcon name="lock" />
        <strong>
          Link configuration is restricted
        </strong>
      </section>
    );
  }
  return (
    <div className="link-customize-panel">
      <style>{`
        .link-customize-panel {
          --link-text: #172033;
          --link-muted: #687287;
          --link-accent: #6f5cf5;
          display: grid;
          gap: 18px;
          color: var(--link-text);
        }
        .link-customize-heading,
        .link-customize-card,
        .link-customize-state {
          border: 1px solid
            rgba(255, 255, 255, 0.86);
          border-radius: 24px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.94),
              rgba(232, 238, 247, 0.84)
            );
          box-shadow:
            12px 12px 28px
              rgba(154, 165, 184, 0.22),
            -10px -10px 26px
              rgba(255, 255, 255, 0.88);
        }
        .link-customize-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 24px;
        }
        .link-customize-heading h2 {
          margin: 5px 0;
        }
        .link-customize-heading p {
          margin: 0;
          color: var(--link-muted);
          line-height: 1.55;
        }
        .link-customize-eyebrow {
          color: var(--link-accent);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .link-customize-domain {
          display: grid;
          min-width: 200px;
          gap: 4px;
          padding: 13px 16px;
          border-radius: 16px;
          background: #eef3f8;
          box-shadow:
            inset 3px 3px 8px
              rgba(174, 185, 202, 0.24),
            inset -3px -3px 8px
              rgba(255, 255, 255, 0.9);
        }
        .link-customize-domain span {
          color: var(--link-muted);
          font-size: 0.7rem;
        }
        .link-customize-domain strong {
          overflow-wrap: anywhere;
        }
        .link-customize-feedback {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 13px 16px;
          border-radius: 15px;
          font-weight: 700;
        }
        .link-customize-feedback.is-success {
          color: #166534;
          background:
            rgba(34, 197, 94, 0.11);
        }
        .link-customize-feedback.is-error {
          color: #b42318;
          background:
            rgba(239, 68, 68, 0.1);
        }
        .link-customize-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.15fr)
            minmax(300px, 0.85fr);
          gap: 18px;
        }
        .link-customize-card {
          padding: 22px;
        }
        .link-customize-card h3 {
          margin: 5px 0;
          font-size: 1.15rem;
        }
        .link-customize-card > p {
          margin: 0 0 18px;
          color: var(--link-muted);
          line-height: 1.55;
        }
        .link-customize-form {
          display: grid;
          gap: 16px;
        }
        .link-customize-field {
          display: grid;
          gap: 7px;
        }
        .link-customize-field > span {
          color: #4e586d;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .link-customize-field select,
        .link-customize-field textarea {
          width: 100%;
          padding: 11px 13px;
          border: 1px solid
            rgba(107, 118, 141, 0.12);
          border-radius: 14px;
          outline: none;
          color: var(--link-text);
          background: #eef3f8;
          box-shadow:
            inset 4px 4px 9px
              rgba(174, 185, 202, 0.24),
            inset -4px -4px 9px
              rgba(255, 255, 255, 0.92);
        }
        .link-customize-field select {
          min-height: 46px;
        }
        .link-customize-field textarea {
          min-height: 120px;
          resize: vertical;
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            monospace;
        }
        .link-customize-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 14px;
          border-radius: 15px;
          background:
            rgba(111, 92, 245, 0.06);
        }
        .link-customize-toggle div {
          display: grid;
          gap: 4px;
        }
        .link-customize-toggle strong {
          font-size: 0.84rem;
        }
        .link-customize-toggle small {
          color: var(--link-muted);
          line-height: 1.4;
        }
        .link-customize-toggle input {
          width: 20px;
          height: 20px;
          accent-color: var(--link-accent);
        }
        .link-platform-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .link-platform-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border-radius: 14px;
          background: #eef3f8;
          box-shadow:
            5px 5px 12px
              rgba(163, 174, 193, 0.22),
            -5px -5px 12px
              rgba(255, 255, 255, 0.88);
          cursor: pointer;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .link-platform-option input {
          accent-color: var(--link-accent);
        }
        .link-customize-save {
          display: inline-flex;
          width: fit-content;
          min-height: 45px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 19px;
          border: 0;
          border-radius: 14px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #7865f7,
              #5945dc
            );
          box-shadow:
            7px 7px 16px
              rgba(99, 80, 220, 0.24);
          cursor: pointer;
          font-weight: 800;
        }
        .link-customize-save:disabled {
          cursor: wait;
          opacity: 0.6;
        }
        .link-preview-list {
          display: grid;
          gap: 14px;
        }
        .link-preview-item {
          display: grid;
          gap: 8px;
          padding: 15px;
          border-radius: 16px;
          background: #eef3f8;
          box-shadow:
            inset 3px 3px 8px
              rgba(174, 185, 202, 0.22),
            inset -3px -3px 8px
              rgba(255, 255, 255, 0.9);
        }
        .link-preview-item > span {
          color: var(--link-muted);
          font-size: 0.72rem;
          font-weight: 700;
        }
        .link-preview-value {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .link-preview-value code {
          min-width: 0;
          overflow-wrap: anywhere;
          color: #493cb5;
          line-height: 1.55;
        }
        .link-preview-value button {
          display: grid;
          width: 40px;
          height: 40px;
          flex: 0 0 auto;
          place-items: center;
          border: 0;
          border-radius: 12px;
          color: var(--link-accent);
          background: #edf2f8;
          box-shadow:
            5px 5px 12px
              rgba(163, 174, 193, 0.22),
            -5px -5px 12px
              rgba(255, 255, 255, 0.88);
          cursor: pointer;
        }
        .link-customize-note {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 16px;
          padding: 14px;
          border-radius: 15px;
          color: var(--link-muted);
          background:
            rgba(111, 92, 245, 0.07);
          line-height: 1.55;
        }
        .link-customize-state {
          display: grid;
          min-height: 220px;
          place-items: center;
          align-content: center;
          gap: 9px;
          padding: 24px;
        }
        .link-customize-state
        .material-symbols-outlined {
          color: var(--link-accent);
          font-size: 34px;
        }
        @media (max-width: 950px) {
          .link-customize-heading {
            align-items: flex-start;
            flex-direction: column;
          }
          .link-customize-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 680px) {
          .link-platform-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <section className="link-customize-heading">
        <div>
          <span className="link-customize-eyebrow">
            Link configuration
          </span>
          <h2>Tracking and sharing structure</h2>
          <p>
            Configure how generated links are
            displayed, copied, and prepared for
            social sharing.
          </p>
        </div>
        <div className="link-customize-domain">
          <span>Preview domain</span>
          <strong>{previewHostname}</strong>
        </div>
      </section>
      {(actionError ??
        settings.error ??
        feedback) !== null && (
        <div
          className={
            actionError !== null ||
            settings.error !== null
              ? 'link-customize-feedback is-error'
              : 'link-customize-feedback is-success'
          }
          role={
            actionError !== null ||
            settings.error !== null
              ? 'alert'
              : 'status'
          }
        >
          <MaterialIcon
            name={
              actionError !== null ||
              settings.error !== null
                ? 'error'
                : 'check_circle'
            }
          />
          <span>
            {actionError ??
              settings.error ??
              feedback}
          </span>
        </div>
      )}
      <div className="link-customize-grid">
        <section className="link-customize-card">
          <span className="link-customize-eyebrow">
            Configuration
          </span>
          <h3>Link defaults</h3>
          <p>
            These values define the company-level
            link presentation and sharing defaults.
          </p>
          <form
            className="link-customize-form"
            onSubmit={(event) =>
              void handleSubmit(event)
            }
          >
            <label className="link-customize-field">
              <span>Link identifier structure</span>
              <select
                disabled={
                  !settings.permissions.canCustomize ||
                  settings.isMutating
                }
                onChange={(event) =>
                  setIdentifierMode(
                    event.target.value as
                      CompanyLinkIdentifierMode,
                  )
                }
                value={identifierMode}
              >
                <option value="slug_or_code">
                  Prefer custom slug, otherwise tracking code
                </option>
                <option value="tracking_code">
                  Always use tracking code
                </option>
              </select>
            </label>
            <label className="link-customize-toggle">
              <div>
                <strong>
                  Plain-text sharing mode
                </strong>
                <small>
                  Generate a deliberately
                  non-clickable copy format.
                </small>
              </div>
              <input
                checked={plainTextSharingEnabled}
                disabled={
                  !settings.permissions.canCustomize ||
                  settings.isMutating
                }
                onChange={(event) =>
                  setPlainTextSharingEnabled(
                    event.target.checked,
                  )
                }
                type="checkbox"
              />
            </label>
            <div className="link-customize-field">
              <span>
                Restricted sharing platforms
              </span>
              <div className="link-platform-grid">
                {PLATFORM_OPTIONS.map(
                  (platform) => (
                    <label
                      className="link-platform-option"
                      key={platform.id}
                    >
                      <input
                        checked={
                          restrictedPlatforms.includes(
                            platform.id,
                          )
                        }
                        disabled={
                          !settings.permissions
                            .canCustomize ||
                          settings.isMutating
                        }
                        onChange={(event) =>
                          setRestrictedPlatforms(
                            (current) =>
                              togglePlatform(
                                current,
                                platform.id,
                                event.target
                                  .checked,
                              ),
                          )
                        }
                        type="checkbox"
                      />
                      <MaterialIcon
                        name={platform.icon}
                      />
                      <span>
                        {platform.label}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </div>
            <label className="link-customize-field">
              <span>
                Default query parameters
              </span>
              <textarea
                disabled={
                  !settings.permissions.canCustomize ||
                  settings.isMutating
                }
                onChange={(event) =>
                  setQueryParameterText(
                    event.target.value,
                  )
                }
                placeholder={`utm_source=publisher\nutm_medium=affiliate`}
                spellCheck={false}
                value={queryParameterText}
              />
            </label>
            {previewParameterError !== null && (
              <div className="link-customize-feedback is-error">
                <MaterialIcon name="error" />
                <span>
                  {previewParameterError}
                </span>
              </div>
            )}
            {settings.permissions.canCustomize && (
              <button
                className="link-customize-save"
                disabled={
                  settings.isMutating ||
                  previewParameterError !== null
                }
                type="submit"
              >
                <MaterialIcon name="save" />
                {settings.isMutating
                  ? 'Saving...'
                  : 'Save link settings'}
              </button>
            )}
          </form>
        </section>
        <section className="link-customize-card">
          <span className="link-customize-eyebrow">
            Live preview
          </span>
          <h3>Copy formats</h3>
          <p>
            Preview updates immediately as the
            configuration changes.
          </p>
          <div className="link-preview-list">
            <div className="link-preview-item">
              <span>Normal tracking URL</span>
              <div className="link-preview-value">
                <code>{normalPreview}</code>
                <button
                  aria-label="Copy normal URL"
                  onClick={() =>
                    void handleCopy(
                      normalPreview,
                      'Normal tracking URL',
                    )
                  }
                  title="Copy normal URL"
                  type="button"
                >
                  <MaterialIcon name="content_copy" />
                </button>
              </div>
            </div>
            <div className="link-preview-item">
              <span>
                Plain-text sharing format
              </span>
              <div className="link-preview-value">
                <code>
                  {plainTextSharingEnabled
                    ? plainTextPreview
                    : 'Plain-text sharing is disabled'}
                </code>
                <button
                  aria-label="Copy plain-text URL"
                  disabled={
                    !plainTextSharingEnabled
                  }
                  onClick={() =>
                    void handleCopy(
                      plainTextPreview,
                      'Plain-text tracking URL',
                    )
                  }
                  title="Copy plain-text URL"
                  type="button"
                >
                  <MaterialIcon name="content_copy" />
                </button>
              </div>
            </div>
          </div>
          <p className="link-customize-note">
            <MaterialIcon name="info" />
            Plain-text mode removes the protocol
            and replaces hostname dots with
            [.] so the copied value is not a
            normal clickable URL. Snapchat,
            Instagram, Facebook, and other apps
            still control their own auto-linking
            behavior.
          </p>
        </section>
      </div>
    </div>
  );
}