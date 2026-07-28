import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import {
  type FormEvent,
  useState,
} from 'react';
import {
  queryClient,
} from '../../app/query-client';
import {
  MaterialIcon,
} from '../../components/icons/material-icon';
import {
  useAuth,
} from '../../features/auth/use-auth';
import {
  useCompany,
} from '../../features/companies/use-company';
import {
  authenticatedApiRequest,
  isRecord,
  readNullableString,
  readRequiredNumber,
  readRequiredString,
} from '../../lib/api-client';
import {
  formatDateTime,
} from '../control-plane/control-plane-formatters';
import './smtp-customization-panel.css';
type SmtpSecureMode =
  | 'plain'
  | 'starttls'
  | 'tls';
type SmtpStatus =
  | 'active'
  | 'disabled';
type SmtpTestStatus =
  | 'pending'
  | 'sent'
  | 'failed';
type SmtpConfiguration = {
  host: string;
  port: number;
  secureMode: SmtpSecureMode;
  username: string;
  senderEmail: string;
  senderName: string;
  replyToEmail: string | null;
  status: SmtpStatus;
  hasPassword: boolean;
  passwordUpdatedAt: string;
  lastTestedAt: string | null;
  lastTestStatus: SmtpTestStatus | null;
  updatedAt: string;
};
type UpdateSmtpInput = {
  host: string;
  port: number;
  secureMode: SmtpSecureMode;
  username: string;
  password?: string;
  senderEmail: string;
  senderName: string;
  replyToEmail: string | null;
  status: SmtpStatus;
};
type SmtpTestResult = {
  recipientEmail: string;
  completedAt: string;
};
const BREVO_HOST =
  'smtp-relay.brevo.com';
function readDataProperty(
  payload: unknown,
  propertyName: string,
): unknown {
  if (
    !isRecord(payload) ||
    !isRecord(payload.data)
  ) {
    throw new Error(
      'The API returned an invalid SMTP response.',
    );
  }
  return payload.data[propertyName];
}
function readBoolean(
  value: unknown,
  fieldName: string,
): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(
      `The API returned an invalid ${fieldName}.`,
    );
  }
  return value;
}
function readSecureMode(
  value: unknown,
): SmtpSecureMode {
  if (
    value === 'plain' ||
    value === 'starttls' ||
    value === 'tls'
  ) {
    return value;
  }
  throw new Error(
    'The API returned an invalid SMTP security mode.',
  );
}
function readStatus(
  value: unknown,
): SmtpStatus {
  if (
    value === 'active' ||
    value === 'disabled'
  ) {
    return value;
  }
  throw new Error(
    'The API returned an invalid SMTP status.',
  );
}
function readTestStatus(
  value: unknown,
): SmtpTestStatus | null {
  if (value === null) {
    return null;
  }
  if (
    value === 'pending' ||
    value === 'sent' ||
    value === 'failed'
  ) {
    return value;
  }
  throw new Error(
    'The API returned an invalid SMTP test status.',
  );
}
function parseConfiguration(
  value: unknown,
): SmtpConfiguration {
  if (!isRecord(value)) {
    throw new Error(
      'The API returned an invalid SMTP configuration.',
    );
  }
  const port =
    readRequiredNumber(
      value.port,
      'SMTP port',
    );
  if (!Number.isInteger(port)) {
    throw new Error(
      'The API returned an invalid SMTP port.',
    );
  }
  return {
    host:
      readRequiredString(
        value.host,
        'SMTP host',
      ),
    port,
    secureMode:
      readSecureMode(
        value.secureMode,
      ),
    username:
      readRequiredString(
        value.username,
        'SMTP username',
      ),
    senderEmail:
      readRequiredString(
        value.senderEmail,
        'SMTP sender email',
      ),
    senderName:
      readRequiredString(
        value.senderName,
        'SMTP sender name',
      ),
    replyToEmail:
      readNullableString(
        value.replyToEmail,
        'SMTP reply-to email',
      ),
    status:
      readStatus(
        value.status,
      ),
    hasPassword:
      readBoolean(
        value.hasPassword,
        'SMTP password state',
      ),
    passwordUpdatedAt:
      readRequiredString(
        value.passwordUpdatedAt,
        'SMTP password update time',
      ),
    lastTestedAt:
      readNullableString(
        value.lastTestedAt,
        'SMTP last test time',
      ),
    lastTestStatus:
      readTestStatus(
        value.lastTestStatus,
      ),
    updatedAt:
      readRequiredString(
        value.updatedAt,
        'SMTP update time',
      ),
  };
}
async function fetchConfiguration(
  accessToken: string,
  companyId: string,
  signal?: AbortSignal,
): Promise<SmtpConfiguration | null> {
  const payload =
    await authenticatedApiRequest(
      accessToken,
      `/companies/${companyId}/smtp`,
      {
        companyId,
        ...(signal !== undefined
          ? {
              signal,
            }
          : {}),
      },
    );
  const value =
    readDataProperty(
      payload,
      'smtpConfiguration',
    );
  return value === null
    ? null
    : parseConfiguration(
        value,
      );
}
async function saveConfiguration(
  accessToken: string,
  companyId: string,
  input: UpdateSmtpInput,
): Promise<SmtpConfiguration> {
  const payload =
    await authenticatedApiRequest(
      accessToken,
      `/companies/${companyId}/smtp`,
      {
        method: 'PUT',
        companyId,
        body: input,
      },
    );
  return parseConfiguration(
    readDataProperty(
      payload,
      'smtpConfiguration',
    ),
  );
}
async function sendTestEmail(
  accessToken: string,
  companyId: string,
  recipientEmail: string,
): Promise<SmtpTestResult> {
  const payload =
    await authenticatedApiRequest(
      accessToken,
      `/companies/${companyId}/smtp/test`,
      {
        method: 'POST',
        companyId,
        body: {
          recipientEmail,
        },
      },
    );
  const result =
    readDataProperty(
      payload,
      'result',
    );
  if (!isRecord(result)) {
    throw new Error(
      'The API returned an invalid SMTP test result.',
    );
  }
  const status =
    readRequiredString(
      result.status,
      'SMTP test status',
    );
  if (status !== 'sent') {
    throw new Error(
      'The SMTP test was not completed.',
    );
  }
  return {
    recipientEmail:
      readRequiredString(
        result.recipientEmail,
        'SMTP test recipient',
      ),
    completedAt:
      readRequiredString(
        result.completedAt,
        'SMTP test completion time',
      ),
  };
}
function readPort(
  value: string,
): number {
  const port =
    Number(value);
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      'SMTP port must be between 1 and 65535.',
    );
  }
  return port;
}
function nullableEmail(
  value: string,
): string | null {
  const normalized =
    value.trim().toLowerCase();
  return normalized.length === 0
    ? null
    : normalized;
}
function displayStatus(
  value: string | null,
): string {
  if (value === null) {
    return 'Not tested';
  }
  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/gu,
      (character) =>
        character.toUpperCase(),
    );
}
function errorMessage(
  error: unknown,
): string | null {
  if (error === null) {
    return null;
  }
  return error instanceof Error
    ? error.message
    : 'SMTP operation failed.';
}
function SmtpEditor({
  companyName,
  configuration,
  isSaving,
  isTesting,
  save,
  test,
}: {
  companyName: string;
  configuration:
    SmtpConfiguration | null;
  isSaving: boolean;
  isTesting: boolean;
  save: (
    input: UpdateSmtpInput,
  ) => Promise<SmtpConfiguration>;
  test: (
    recipientEmail: string,
  ) => Promise<SmtpTestResult>;
}) {
  const [
    host,
    setHost,
  ] =
    useState(
      configuration?.host ??
        BREVO_HOST,
    );
  const [
    port,
    setPort,
  ] =
    useState(
      String(
        configuration?.port ??
          587,
      ),
    );
  const [
    secureMode,
    setSecureMode,
  ] =
    useState<SmtpSecureMode>(
      configuration?.secureMode ??
        'starttls',
    );
  const [
    username,
    setUsername,
  ] =
    useState(
      configuration?.username ??
        '',
    );
  const [
    password,
    setPassword,
  ] =
    useState('');
  const [
    senderEmail,
    setSenderEmail,
  ] =
    useState(
      configuration?.senderEmail ??
        '',
    );
  const [
    senderName,
    setSenderName,
  ] =
    useState(
      configuration?.senderName ??
        companyName,
    );
  const [
    replyToEmail,
    setReplyToEmail,
  ] =
    useState(
      configuration?.replyToEmail ??
        '',
    );
  const [
    status,
    setStatus,
  ] =
    useState<SmtpStatus>(
      configuration?.status ??
        'disabled',
    );
  const [
    testEmail,
    setTestEmail,
  ] =
    useState(
      configuration?.senderEmail ??
        '',
    );
  const [
    feedback,
    setFeedback,
  ] =
    useState<string | null>(
      null,
    );
  const [
    actionError,
    setActionError,
  ] =
    useState<string | null>(
      null,
    );
  function applyBrevoPreset(): void {
    setHost(BREVO_HOST);
    setPort('587');
    setSecureMode(
      'starttls',
    );
    setStatus('active');
    setActionError(null);
    setFeedback(
      'Brevo preset applied. Enter the Brevo SMTP login and SMTP key before saving.',
    );
  }
  async function handleSave(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setFeedback(null);
    setActionError(null);
    try {
      const normalizedPassword =
        password.trim();
      if (
        configuration === null &&
        normalizedPassword.length ===
          0
      ) {
        throw new Error(
          'SMTP key or password is required for the first save.',
        );
      }
      const saved =
        await save({
          host:
            host.trim(),
          port:
            readPort(port),
          secureMode,
          username:
            username.trim(),
          ...(normalizedPassword.length >
          0
            ? {
                password:
                  normalizedPassword,
              }
            : {}),
          senderEmail:
            senderEmail
              .trim()
              .toLowerCase(),
          senderName:
            senderName.trim(),
          replyToEmail:
            nullableEmail(
              replyToEmail,
            ),
          status,
        });
      setPassword('');
      setFeedback(
        `SMTP configuration saved for ${saved.senderEmail}. The password remains encrypted and hidden.`,
      );
    } catch (
      error: unknown
    ) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'SMTP configuration could not be saved.',
      );
    }
  }
  async function handleTest(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setFeedback(null);
    setActionError(null);
    try {
      const recipientEmail =
        testEmail
          .trim()
          .toLowerCase();
      if (
        recipientEmail.length ===
        0
      ) {
        throw new Error(
          'Enter a test recipient email.',
        );
      }
      const result =
        await test(
          recipientEmail,
        );
      setFeedback(
        `Test email sent to ${result.recipientEmail} at ${formatDateTime(
          result.completedAt,
        )}.`,
      );
    } catch (
      error: unknown
    ) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'SMTP test email could not be sent.',
      );
    }
  }
  return (
    <div className="smtp-customize-shell">
      <section className="customize-neumorphic-panel smtp-customize-hero">
        <div>
          <span className="customize-eyebrow">
            Transactional email
          </span>
          <h2>
            SMTP and Brevo delivery
          </h2>
          <p>
            Configure encrypted company email
            delivery, sender identity, connection
            security and live test messages.
          </p>
        </div>
        <button
          className="smtp-brevo-button"
          onClick={
            applyBrevoPreset
          }
          type="button"
        >
          <MaterialIcon name="bolt" />
          Apply Brevo preset
        </button>
      </section>
      {(feedback !== null ||
        actionError !==
          null) && (
        <div
          className={
            actionError !==
            null
              ? 'smtp-feedback smtp-feedback--error'
              : 'smtp-feedback smtp-feedback--success'
          }
        >
          <MaterialIcon
            name={
              actionError !==
              null
                ? 'error'
                : 'check_circle'
            }
          />
          <span>
            {actionError ??
              feedback}
          </span>
        </div>
      )}
      <div className="smtp-customize-grid">
        <form
          className="customize-neumorphic-panel smtp-config-card"
          onSubmit={(event) =>
            void handleSave(
              event,
            )
          }
        >
          <div className="smtp-card-heading">
            <div>
              <span>
                Connection
              </span>
              <h3>
                SMTP credentials
              </h3>
            </div>
            <span
              className={
                status === 'active'
                  ? 'smtp-state smtp-state--active'
                  : 'smtp-state'
              }
            >
              {status}
            </span>
          </div>
          <div className="smtp-form-grid">
            <label className="smtp-field smtp-field--wide">
              <span>
                SMTP host
              </span>
              <input
                autoComplete="off"
                onChange={(event) =>
                  setHost(
                    event.target.value,
                  )
                }
                placeholder={BREVO_HOST}
                required
                value={host}
              />
            </label>
            <label className="smtp-field">
              <span>Port</span>
              <input
                max="65535"
                min="1"
                onChange={(event) =>
                  setPort(
                    event.target.value,
                  )
                }
                required
                type="number"
                value={port}
              />
            </label>
            <label className="smtp-field">
              <span>
                Security
              </span>
              <select
                onChange={(event) =>
                  setSecureMode(
                    event.target
                      .value as
                      SmtpSecureMode,
                  )
                }
                value={secureMode}
              >
                <option value="starttls">
                  STARTTLS
                </option>
                <option value="tls">
                  TLS
                </option>
                <option value="plain">
                  Plain
                </option>
              </select>
            </label>
            <label className="smtp-field smtp-field--wide">
              <span>
                SMTP login / username
              </span>
              <input
                autoComplete="username"
                onChange={(event) =>
                  setUsername(
                    event.target.value,
                  )
                }
                placeholder="Brevo SMTP login"
                required
                value={username}
              />
            </label>
            <label className="smtp-field smtp-field--wide">
              <span>
                SMTP key / password
              </span>
              <input
                autoComplete="new-password"
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder={
                  configuration?.hasPassword ===
                  true
                    ? 'Leave blank to keep the encrypted password'
                    : 'Required for the first save'
                }
                required={
                  configuration === null ||
                  !configuration.hasPassword
                }
                type="password"
                value={password}
              />
              <small>
                The credential is sent only when
                changed and is never returned to the
                browser.
              </small>
            </label>
            <label className="smtp-field">
              <span>
                Sender name
              </span>
              <input
                onChange={(event) =>
                  setSenderName(
                    event.target.value,
                  )
                }
                required
                value={senderName}
              />
            </label>
            <label className="smtp-field">
              <span>
                Sender email
              </span>
              <input
                onChange={(event) =>
                  setSenderEmail(
                    event.target.value,
                  )
                }
                placeholder="no-reply@example.com"
                required
                type="email"
                value={senderEmail}
              />
            </label>
            <label className="smtp-field">
              <span>
                Reply-to email
              </span>
              <input
                onChange={(event) =>
                  setReplyToEmail(
                    event.target.value,
                  )
                }
                placeholder="support@example.com"
                type="email"
                value={replyToEmail}
              />
            </label>
            <label className="smtp-field">
              <span>
                Delivery status
              </span>
              <select
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as
                      SmtpStatus,
                  )
                }
                value={status}
              >
                <option value="active">
                  Active
                </option>
                <option value="disabled">
                  Disabled
                </option>
              </select>
            </label>
          </div>
          <button
            className="primary-gradient-button"
            disabled={isSaving}
            type="submit"
          >
            <MaterialIcon name="save" />
            {isSaving
              ? 'Saving...'
              : 'Save SMTP settings'}
          </button>
        </form>
        <div className="smtp-side-stack">
          <section className="customize-neumorphic-panel smtp-status-card">
            <div className="smtp-card-heading">
              <div>
                <span>
                  Security
                </span>
                <h3>
                  Credential status
                </h3>
              </div>
              <MaterialIcon name="encrypted" />
            </div>
            <dl className="smtp-detail-list">
              <div>
                <dt>Password</dt>
                <dd>
                  {configuration?.hasPassword ===
                  true
                    ? 'Encrypted and stored'
                    : 'Not configured'}
                </dd>
              </div>
              <div>
                <dt>
                  Password updated
                </dt>
                <dd>
                  {configuration === null
                    ? 'Not available'
                    : formatDateTime(
                        configuration
                          .passwordUpdatedAt,
                      )}
                </dd>
              </div>
              <div>
                <dt>Last test</dt>
                <dd>
                  {configuration?.lastTestedAt ===
                  null ||
                  configuration === null
                    ? 'Not tested'
                    : formatDateTime(
                        configuration
                          .lastTestedAt,
                      )}
                </dd>
              </div>
              <div>
                <dt>
                  Test result
                </dt>
                <dd>
                  {displayStatus(
                    configuration?.lastTestStatus ??
                    null,
                  )}
                </dd>
              </div>
            </dl>
          </section>
          <form
            className="customize-neumorphic-panel smtp-test-card"
            onSubmit={(event) =>
              void handleTest(
                event,
              )
            }
          >
            <div className="smtp-card-heading">
              <div>
                <span>
                  Verification
                </span>
                <h3>
                  Send test email
                </h3>
              </div>
              <MaterialIcon name="outgoing_mail" />
            </div>
            <p>
              Save and activate the configuration,
              then send a real SMTP test message.
            </p>
            <label className="smtp-field">
              <span>
                Recipient email
              </span>
              <input
                onChange={(event) =>
                  setTestEmail(
                    event.target.value,
                  )
                }
                placeholder="you@example.com"
                required
                type="email"
                value={testEmail}
              />
            </label>
            <button
              className="smtp-secondary-button"
              disabled={
                isTesting ||
                configuration === null ||
                configuration.status !==
                  'active'
              }
              type="submit"
            >
              <MaterialIcon name="send" />
              {isTesting
                ? 'Sending...'
                : 'Send test email'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
export function SmtpCustomizationPanel() {
  const auth =
    useAuth();
  const company =
    useCompany();
  const accessToken =
    auth.session?.access_token ??
    null;
  const companyId =
    company.activeCompanyId;
  const membership =
    auth.identity?.authorization
      .companyMembership ??
    null;
  const canManage =
    auth.identity?.authorization
      .platformRole ===
      'platform_super_admin' ||
    (
      membership?.role ===
        'company_admin' &&
      membership.status ===
        'active'
    );
  const queryEnabled =
    canManage &&
    accessToken !== null &&
    companyId !== null;
  const query =
    useQuery<SmtpConfiguration | null>({
      queryKey: [
        'company-scoped',
        'smtp',
        companyId,
      ],
      enabled:
        queryEnabled,
      queryFn: ({ signal }) => {
        if (
          accessToken === null ||
          companyId === null
        ) {
          throw new Error(
            'An authenticated company context is required.',
          );
        }
        return fetchConfiguration(
          accessToken,
          companyId,
          signal,
        );
      },
    });
  const saveMutation =
    useMutation<
      SmtpConfiguration,
      Error,
      UpdateSmtpInput
    >({
      mutationFn: (input) => {
        if (
          accessToken === null ||
          companyId === null ||
          !canManage
        ) {
          throw new Error(
            'Company administrator access is required.',
          );
        }
        return saveConfiguration(
          accessToken,
          companyId,
          input,
        );
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            'company-scoped',
            'smtp',
            companyId,
          ],
        });
      },
    });
  const testMutation =
    useMutation<
      SmtpTestResult,
      Error,
      string
    >({
      mutationFn: (
        recipientEmail,
      ) => {
        if (
          accessToken === null ||
          companyId === null ||
          !canManage
        ) {
          throw new Error(
            'Company administrator access is required.',
          );
        }
        return sendTestEmail(
          accessToken,
          companyId,
          recipientEmail,
        );
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            'company-scoped',
            'smtp',
            companyId,
          ],
        });
      },
    });
  if (!canManage) {
    return (
      <section className="customize-neumorphic-panel smtp-system-state">
        <MaterialIcon name="lock" />
        <div>
          <strong>
            SMTP access restricted
          </strong>
          <span>
            Platform Super Admin or active Company
            Admin access is required.
          </span>
        </div>
      </section>
    );
  }
  if (
    accessToken === null ||
    companyId === null
  ) {
    return (
      <section className="customize-neumorphic-panel smtp-system-state smtp-system-state--error">
        <MaterialIcon name="domain_disabled" />
        <div>
          <strong>
            Select a company
          </strong>
          <span>
            An authenticated company context is
            required.
          </span>
        </div>
      </section>
    );
  }
  if (query.isLoading) {
    return (
      <section className="customize-neumorphic-panel smtp-system-state">
        <MaterialIcon
          className="spin"
          name="progress_activity"
        />
        <div>
          <strong>
            Loading SMTP configuration
          </strong>
          <span>
            Reading encrypted company delivery
            settings.
          </span>
        </div>
      </section>
    );
  }
  if (
    query.isError &&
    query.data === undefined
  ) {
    return (
      <section className="customize-neumorphic-panel smtp-system-state smtp-system-state--error">
        <MaterialIcon name="cloud_off" />
        <div>
          <strong>
            SMTP configuration could not be loaded
          </strong>
          <span>
            {errorMessage(
              query.error,
            )}
          </span>
        </div>
        <button
          onClick={() =>
            void query.refetch()
          }
          type="button"
        >
          Retry
        </button>
      </section>
    );
  }
  return (
    <SmtpEditor
      companyName={
        company.activeCompany?.name ??
        'Selected company'
      }
      configuration={
        query.data ??
        null
      }
      isSaving={
        saveMutation.isPending
      }
      isTesting={
        testMutation.isPending
      }
      key={
        query.data?.updatedAt ??
        'smtp-empty'
      }
      save={
        saveMutation.mutateAsync
      }
      test={
        testMutation.mutateAsync
      }
    />
  );
}
