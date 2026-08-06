import { type FormEvent, useMemo, useState } from "react";

import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import { useCompany } from "../../features/companies/use-company";
import type {
  NetworkProvider,
  NetworkProviderIntegrationInput,
  NetworkProviderStatus,
} from "../../features/tracking-networks/tracking-networks.types";
import { useNetworkProviders } from "../../features/tracking-networks/use-tracking-networks";
import { formatTrackingDate } from "../tracking-networks/tracking-network-formatters";
import {
  ModuleAccessState,
  ModuleFeedback,
  ModuleLoadingState,
  StatusPill,
} from "../tracking-networks/tracking-network-ui";

const CODE_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/u;

function normalizeOptionalUrl(value: string): string | null {
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

function validateOptionalUrl(value: string): boolean {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return true;
  }

  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function ProviderEditor({
  provider,
  disabled,
  editable,
  onUpdate,
}: {
  provider: NetworkProvider;
  disabled: boolean;
  editable: boolean;
  onUpdate: (
    provider: NetworkProvider,
    input: {
      name: string;
      websiteUrl: string | null;
      documentationUrl: string | null;
      status: NetworkProviderStatus;
      integration: NetworkProviderIntegrationInput;
    },
  ) => Promise<void>;
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name");
    const websiteUrl = formData.get("websiteUrl");
    const documentationUrl = formData.get("documentationUrl");
    const status = formData.get("status");
    const defaultTrackingParameter = formData.get("defaultTrackingParameter");
    const postbackClickIdToken = formData.get("postbackClickIdToken");
    const postbackConversionIdToken = formData.get("postbackConversionIdToken");
    const postbackRevenueAmountToken = formData.get(
      "postbackRevenueAmountToken",
    );
    const postbackRevenueCurrencyToken = formData.get(
      "postbackRevenueCurrencyToken",
    );
    const postbackConversionStatus = formData.get("postbackConversionStatus");

    if (
      typeof name !== "string" ||
      typeof websiteUrl !== "string" ||
      typeof documentationUrl !== "string" ||
      typeof defaultTrackingParameter !== "string" ||
      typeof postbackClickIdToken !== "string" ||
      typeof postbackConversionIdToken !== "string" ||
      typeof postbackRevenueAmountToken !== "string" ||
      typeof postbackRevenueCurrencyToken !== "string" ||
      (postbackConversionStatus !== "pending" &&
        postbackConversionStatus !== "approved") ||
      (status !== "active" && status !== "archived")
    ) {
      return;
    }

    await onUpdate(provider, {
      name,
      websiteUrl: normalizeOptionalUrl(websiteUrl),
      documentationUrl: normalizeOptionalUrl(documentationUrl),
      status,
      integration: {
        defaultTrackingParameter: normalizeOptionalUrl(
          defaultTrackingParameter,
        ),
        postbackClickIdToken: normalizeOptionalUrl(postbackClickIdToken),
        postbackConversionIdToken: normalizeOptionalUrl(
          postbackConversionIdToken,
        ),
        postbackRevenueAmountToken: normalizeOptionalUrl(
          postbackRevenueAmountToken,
        ),
        postbackRevenueCurrencyToken: normalizeOptionalUrl(
          postbackRevenueCurrencyToken,
        ),
        postbackConversionStatus,
      },
    });
  }

  return (
    <article className="tracking-record-card tracking-provider-card">
      <div className="tracking-record-card__heading">
        <div className="tracking-record-icon">
          <MaterialIcon name="hub" />
        </div>
        <div>
          <div className="tracking-title-line">
            <strong>{provider.name}</strong>
            <code className="tracking-code-badge">{provider.code}</code>
          </div>
          <span>
            Created {formatTrackingDate(provider.createdAt)} · Updated{" "}
            {formatTrackingDate(provider.updatedAt)}
          </span>
        </div>
        <StatusPill status={provider.status} />
      </div>

      {!editable ? (
        <div className="tracking-record-meta tracking-record-meta--two">
          <div>
            <span>Website</span>
            {provider.websiteUrl === null ? (
              <strong>Not configured</strong>
            ) : (
              <a href={provider.websiteUrl} rel="noreferrer" target="_blank">
                {provider.websiteUrl}
              </a>
            )}
          </div>
          <div>
            <span>Documentation</span>
            {provider.documentationUrl === null ? (
              <strong>Not configured</strong>
            ) : (
              <a
                href={provider.documentationUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open provider docs
              </a>
            )}
          </div>
          <div>
            <span>Tracking and global postback</span>
            <strong>
              {provider.integration.configured
                ? "Integration configured"
                : "Integration incomplete"}
            </strong>
          </div>
          <div>
            <span>Default click-ID parameter</span>
            <code>
              {provider.integration.defaultTrackingParameter ??
                "click_id fallback"}
            </code>
          </div>
          <div>
            <span>Click-ID macro/token</span>
            <code>
              {provider.integration.postbackClickIdToken ?? "Not configured"}
            </code>
          </div>
          <div>
            <span>Conversion-ID macro/token</span>
            <code>
              {provider.integration.postbackConversionIdToken ??
                "Not configured"}
            </code>
          </div>
          <div>
            <span>Revenue mapping</span>
            <code>
              {provider.integration.postbackRevenueAmountToken === null
                ? "Not configured"
                : `${provider.integration.postbackRevenueAmountToken} / ${provider.integration.postbackRevenueCurrencyToken ?? ""}`}
            </code>
          </div>
          <div>
            <span>Initial conversion status</span>
            <strong>{provider.integration.postbackConversionStatus}</strong>
          </div>
        </div>
      ) : (
        <form
          className="tracking-provider-form"
          key={`${provider.id}:${provider.updatedAt}`}
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label>
            <span>Provider name</span>
            <input
              defaultValue={provider.name}
              disabled={disabled}
              name="name"
            />
          </label>
          <label>
            <span>Website URL</span>
            <input
              defaultValue={provider.websiteUrl ?? ""}
              disabled={disabled}
              name="websiteUrl"
              placeholder="https://provider.example"
              type="url"
            />
          </label>
          <label>
            <span>Documentation URL</span>
            <input
              defaultValue={provider.documentationUrl ?? ""}
              disabled={disabled}
              name="documentationUrl"
              placeholder="https://docs.provider.example"
              type="url"
            />
          </label>
          <div className="tracking-record-meta">
            <strong>Tracking and Global Postback</strong>
          </div>
          <label>
            <span>Default Provider click-ID parameter</span>
            <input
              defaultValue={provider.integration.defaultTrackingParameter ?? ""}
              disabled={disabled}
              name="defaultTrackingParameter"
              placeholder="click_id"
            />
          </label>
          <label>
            <span>Provider click-ID macro/token</span>
            <input
              defaultValue={provider.integration.postbackClickIdToken ?? ""}
              disabled={disabled}
              name="postbackClickIdToken"
              placeholder="{SUB1}"
            />
          </label>
          <label>
            <span>Provider conversion-ID macro/token</span>
            <input
              defaultValue={
                provider.integration.postbackConversionIdToken ?? ""
              }
              disabled={disabled}
              name="postbackConversionIdToken"
              placeholder="{CONVERSION_ID}"
            />
          </label>
          <label>
            <span>Revenue amount macro/token</span>
            <input
              defaultValue={
                provider.integration.postbackRevenueAmountToken ?? ""
              }
              disabled={disabled}
              name="postbackRevenueAmountToken"
            />
          </label>
          <label>
            <span>Revenue currency macro/token</span>
            <input
              defaultValue={
                provider.integration.postbackRevenueCurrencyToken ?? ""
              }
              disabled={disabled}
              name="postbackRevenueCurrencyToken"
            />
          </label>
          <label>
            <span>Initial conversion status</span>
            <select
              defaultValue={provider.integration.postbackConversionStatus}
              disabled={disabled}
              name="postbackConversionStatus"
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </label>
          <label>
            <span>Status</span>
            <select
              defaultValue={provider.status}
              disabled={disabled}
              name="status"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <button
            className="tracking-secondary-button"
            disabled={disabled}
            type="submit"
          >
            <MaterialIcon name="save" />
            Save provider
          </button>
        </form>
      )}
    </article>
  );
}

export function NetworkProvidersPage() {
  const company = useCompany();
  const providers = useNetworkProviders();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<NetworkProviderStatus | "all">("all");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [documentationUrl, setDocumentationUrl] = useState("");
  const [defaultTrackingParameter, setDefaultTrackingParameter] = useState("");
  const [postbackClickIdToken, setPostbackClickIdToken] = useState("");
  const [postbackConversionIdToken, setPostbackConversionIdToken] =
    useState("");
  const [postbackRevenueAmountToken, setPostbackRevenueAmountToken] =
    useState("");
  const [postbackRevenueCurrencyToken, setPostbackRevenueCurrencyToken] =
    useState("");
  const [postbackConversionStatus, setPostbackConversionStatus] = useState<
    "pending" | "approved"
  >("approved");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredProviders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return providers.providers.filter((provider) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        provider.name.toLowerCase().includes(normalizedSearch) ||
        provider.code.includes(normalizedSearch);
      const matchesStatus = status === "all" || provider.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [providers.providers, search, status]);

  const activeCount = useMemo(
    () =>
      providers.providers.filter((provider) => provider.status === "active")
        .length,
    [providers.providers],
  );

  function resetFeedback() {
    setFeedback(null);
    setActionError(null);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    const normalizedCode = code.trim().toLowerCase();
    const normalizedName = name.trim();

    if (!CODE_PATTERN.test(normalizedCode) || normalizedCode.length < 2) {
      setActionError(
        "Provider code must use lowercase letters, numbers, and underscores.",
      );
      return;
    }

    if (normalizedName.length < 2) {
      setActionError("Provider name must contain at least two characters.");
      return;
    }

    if (
      !validateOptionalUrl(websiteUrl) ||
      !validateOptionalUrl(documentationUrl)
    ) {
      setActionError("Provider links must be valid HTTP or HTTPS URLs.");
      return;
    }

    try {
      await providers.createProvider({
        code: normalizedCode,
        name: normalizedName,
        websiteUrl: normalizeOptionalUrl(websiteUrl),
        documentationUrl: normalizeOptionalUrl(documentationUrl),
        integration: {
          defaultTrackingParameter: normalizeOptionalUrl(
            defaultTrackingParameter,
          ),
          postbackClickIdToken: normalizeOptionalUrl(postbackClickIdToken),
          postbackConversionIdToken: normalizeOptionalUrl(
            postbackConversionIdToken,
          ),
          postbackRevenueAmountToken: normalizeOptionalUrl(
            postbackRevenueAmountToken,
          ),
          postbackRevenueCurrencyToken: normalizeOptionalUrl(
            postbackRevenueCurrencyToken,
          ),
          postbackConversionStatus,
        },
      });
      setCode("");
      setName("");
      setWebsiteUrl("");
      setDocumentationUrl("");
      setDefaultTrackingParameter("");
      setPostbackClickIdToken("");
      setPostbackConversionIdToken("");
      setPostbackRevenueAmountToken("");
      setPostbackRevenueCurrencyToken("");
      setPostbackConversionStatus("approved");
      setFeedback(
        `${normalizedName} was added to ${company.activeCompany?.name ?? "this company"}.`,
      );
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The network provider could not be created.",
      );
    }
  }

  async function handleUpdate(
    provider: NetworkProvider,
    input: {
      name: string;
      websiteUrl: string | null;
      documentationUrl: string | null;
      status: NetworkProviderStatus;
      integration: NetworkProviderIntegrationInput;
    },
  ) {
    resetFeedback();
    const normalizedName = input.name.trim();

    if (normalizedName.length < 2) {
      setActionError("Provider name must contain at least two characters.");
      return;
    }

    if (
      !validateOptionalUrl(input.websiteUrl ?? "") ||
      !validateOptionalUrl(input.documentationUrl ?? "")
    ) {
      setActionError("Provider links must be valid HTTP or HTTPS URLs.");
      return;
    }

    const changed =
      normalizedName !== provider.name ||
      input.websiteUrl !== provider.websiteUrl ||
      input.documentationUrl !== provider.documentationUrl ||
      input.status !== provider.status ||
      input.integration.defaultTrackingParameter !==
        provider.integration.defaultTrackingParameter ||
      input.integration.postbackClickIdToken !==
        provider.integration.postbackClickIdToken ||
      input.integration.postbackConversionIdToken !==
        provider.integration.postbackConversionIdToken ||
      input.integration.postbackRevenueAmountToken !==
        provider.integration.postbackRevenueAmountToken ||
      input.integration.postbackRevenueCurrencyToken !==
        provider.integration.postbackRevenueCurrencyToken ||
      input.integration.postbackConversionStatus !==
        provider.integration.postbackConversionStatus;

    if (!changed) {
      setActionError("The provider configuration has not changed.");
      return;
    }

    try {
      await providers.updateProvider({
        providerId: provider.id,
        name: normalizedName,
        websiteUrl: input.websiteUrl,
        documentationUrl: input.documentationUrl,
        status: input.status,
        integration: input.integration,
      });
      setFeedback(`${normalizedName} was updated successfully.`);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The network provider could not be updated.",
      );
    }
  }

  if (providers.status === "forbidden") {
    return (
      <ModuleAccessState icon="lock" title="Network providers are restricted">
        Only Company Admins and Managers can access their company provider
        directory.
      </ModuleAccessState>
    );
  }

  if (company.activeCompany === null) {
    return (
      <ModuleAccessState
        icon="domain_disabled"
        title="Select an active company"
      >
        The provider directory requires an active company context.
      </ModuleAccessState>
    );
  }

  if (providers.status === "loading") {
    return <ModuleLoadingState label="network providers" />;
  }

  return (
    <div className="tracking-module-page page-stack">
      <GlassPanel
        as="section"
        className="page-heading-panel tracking-heading-panel"
      >
        <div>
          <span className="eyebrow-chip">
            <MaterialIcon name="hub" filled />
            Company Integrations
          </span>
          <h1>Network Providers</h1>
          <p>
            Manage providers owned exclusively by {company.activeCompany.name}.
            Other companies and Platform Super Admins cannot access them.
          </p>
        </div>
        <div className="tracking-heading-stats">
          <div>
            <span>Total</span>
            <strong>{providers.providers.length}</strong>
          </div>
          <div>
            <span>Active</span>
            <strong>{activeCount}</strong>
          </div>
          <div>
            <span>Scope</span>
            <strong>Company</strong>
          </div>
        </div>
      </GlassPanel>

      <ModuleFeedback
        error={actionError ?? providers.error}
        message={feedback}
      />

      <div className="tracking-module-grid">
        {providers.permissions.canManage && (
          <GlassPanel as="section" className="tracking-create-card">
            <div className="tracking-section-heading">
              <div>
                <span className="eyebrow-chip">Company Provider</span>
                <h2>Add provider</h2>
                <p>
                  Create a provider available only to this company&apos;s
                  networks.
                </p>
              </div>
              <MaterialIcon name="add_business" />
            </div>

            <form
              className="tracking-form"
              onSubmit={(event) => void handleCreate(event)}
            >
              <label>
                <span>Provider code</span>
                <input
                  disabled={providers.isMutating}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="example_network"
                  spellCheck={false}
                  value={code}
                />
              </label>
              <label>
                <span>Provider name</span>
                <input
                  disabled={providers.isMutating}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Example Network"
                  value={name}
                />
              </label>
              <label>
                <span>Website URL</span>
                <input
                  disabled={providers.isMutating}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="https://provider.example"
                  type="url"
                  value={websiteUrl}
                />
              </label>
              <label>
                <span>Documentation URL</span>
                <input
                  disabled={providers.isMutating}
                  onChange={(event) => setDocumentationUrl(event.target.value)}
                  placeholder="https://docs.provider.example"
                  type="url"
                  value={documentationUrl}
                />
              </label>
              <label>
                <span>Default Provider click-ID parameter</span>
                <input
                  disabled={providers.isMutating}
                  onChange={(event) =>
                    setDefaultTrackingParameter(event.target.value)
                  }
                  placeholder="click_id"
                  value={defaultTrackingParameter}
                />
              </label>
              <label>
                <span>Provider click-ID macro/token</span>
                <input
                  disabled={providers.isMutating}
                  onChange={(event) =>
                    setPostbackClickIdToken(event.target.value)
                  }
                  placeholder="{SUB1}"
                  value={postbackClickIdToken}
                />
              </label>
              <label>
                <span>Provider conversion-ID macro/token</span>
                <input
                  disabled={providers.isMutating}
                  onChange={(event) =>
                    setPostbackConversionIdToken(event.target.value)
                  }
                  placeholder="{CONVERSION_ID}"
                  value={postbackConversionIdToken}
                />
              </label>
              <label>
                <span>Revenue amount macro/token</span>
                <input
                  disabled={providers.isMutating}
                  onChange={(event) =>
                    setPostbackRevenueAmountToken(event.target.value)
                  }
                  value={postbackRevenueAmountToken}
                />
              </label>
              <label>
                <span>Revenue currency macro/token</span>
                <input
                  disabled={providers.isMutating}
                  onChange={(event) =>
                    setPostbackRevenueCurrencyToken(event.target.value)
                  }
                  value={postbackRevenueCurrencyToken}
                />
              </label>
              <label>
                <span>Initial conversion status</span>
                <select
                  disabled={providers.isMutating}
                  onChange={(event) =>
                    setPostbackConversionStatus(
                      event.target.value as "pending" | "approved",
                    )
                  }
                  value={postbackConversionStatus}
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </label>
              <button
                className="tracking-primary-button tracking-primary-button--wide"
                disabled={providers.isMutating}
                type="submit"
              >
                <MaterialIcon name="add_circle" />
                Add provider
              </button>
            </form>
          </GlassPanel>
        )}

        <GlassPanel
          as="section"
          className={
            providers.permissions.canManage
              ? "tracking-list-card control-directory-surface"
              : "tracking-list-card tracking-list-card--full control-directory-surface"
          }
        >
          <div className="control-directory-actions">
            <button
              aria-label="Refresh network providers"
              className="icon-button"
              disabled={providers.isMutating}
              onClick={() => void providers.refresh()}
              type="button"
            >
              <MaterialIcon name="refresh" />
            </button>
          </div>

          <div className="tracking-filter-bar">
            <div className="tracking-input-with-icon">
              <MaterialIcon name="search" />
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search provider or code"
                value={search}
              />
            </div>
            <select
              aria-label="Filter network providers by status"
              onChange={(event) =>
                setStatus(event.target.value as NetworkProviderStatus | "all")
              }
              value={status}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {providers.status === "error" && filteredProviders.length === 0 ? (
            <div className="tracking-empty-state tracking-empty-state--error">
              <MaterialIcon name="cloud_off" />
              <strong>Provider directory could not be loaded</strong>
              <span>{providers.error}</span>
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="tracking-empty-state">
              <MaterialIcon name="hub" />
              <strong>No matching providers</strong>
              <span>Add a provider or change the current filters.</span>
            </div>
          ) : (
            <div className="tracking-record-list">
              {filteredProviders.map((provider) => (
                <ProviderEditor
                  disabled={providers.isMutating}
                  editable={providers.permissions.canManage}
                  key={provider.id}
                  onUpdate={handleUpdate}
                  provider={provider}
                />
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
