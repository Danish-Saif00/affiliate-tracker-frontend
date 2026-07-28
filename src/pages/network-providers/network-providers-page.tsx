import {
  formatTrackingDate,
} from '../tracking-networks/tracking-network-formatters';
import {
  ModuleAccessState,
  ModuleFeedback,
  ModuleLoadingState,
  StatusPill,
} from '../tracking-networks/tracking-network-ui';
import {
  type FormEvent,
  useMemo,
  useState } from 'react';

import { MaterialIcon } from '../../components/icons/material-icon';
import { GlassPanel } from '../../components/ui/glass-panel';
import { useCompany } from '../../features/companies/use-company';
import type {
  NetworkProvider,
  NetworkProviderStatus,
  } from '../../features/tracking-networks/tracking-networks.types';
import { useNetworkProviders } from '../../features/tracking-networks/use-tracking-networks';
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
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function ProviderEditor({
  provider,
  disabled,
  platformAdmin,
  onUpdate,
}: {
  provider: NetworkProvider;
  disabled: boolean;
  platformAdmin: boolean;
  onUpdate: (
    provider: NetworkProvider,
    input: {
      name: string;
      websiteUrl: string | null;
      documentationUrl: string | null;
      status: NetworkProviderStatus;
    },
  ) => Promise<void>;
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name');
    const websiteUrl = formData.get('websiteUrl');
    const documentationUrl = formData.get('documentationUrl');
    const status = formData.get('status');

    if (
      typeof name !== 'string' ||
      typeof websiteUrl !== 'string' ||
      typeof documentationUrl !== 'string' ||
      (status !== 'active' && status !== 'archived')
    ) {
      return;
    }

    await onUpdate(provider, {
      name,
      websiteUrl: normalizeOptionalUrl(websiteUrl),
      documentationUrl: normalizeOptionalUrl(documentationUrl),
      status,
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
            Created {formatTrackingDate(provider.createdAt)} · Updated{' '}
            {formatTrackingDate(provider.updatedAt)}
          </span>
        </div>
        <StatusPill status={provider.status} />
      </div>

      {!platformAdmin ? (
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
              <a href={provider.documentationUrl} rel="noreferrer" target="_blank">
                Open provider docs
              </a>
            )}
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
            <input defaultValue={provider.name} disabled={disabled} name="name" />
          </label>
          <label>
            <span>Website URL</span>
            <input
              defaultValue={provider.websiteUrl ?? ''}
              disabled={disabled}
              name="websiteUrl"
              placeholder="https://provider.example"
              type="url"
            />
          </label>
          <label>
            <span>Documentation URL</span>
            <input
              defaultValue={provider.documentationUrl ?? ''}
              disabled={disabled}
              name="documentationUrl"
              placeholder="https://docs.provider.example"
              type="url"
            />
          </label>
          <label>
            <span>Status</span>
            <select defaultValue={provider.status} disabled={disabled} name="status">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <button className="tracking-secondary-button" disabled={disabled} type="submit">
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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<NetworkProviderStatus | 'all'>('all');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [documentationUrl, setDocumentationUrl] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredProviders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return providers.providers.filter((provider) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        provider.name.toLowerCase().includes(normalizedSearch) ||
        provider.code.includes(normalizedSearch);
      const matchesStatus = status === 'all' || provider.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [providers.providers, search, status]);

  const activeCount = useMemo(
    () => providers.providers.filter((provider) => provider.status === 'active').length,
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
      setActionError('Provider code must use lowercase letters, numbers, and underscores.');
      return;
    }

    if (normalizedName.length < 2) {
      setActionError('Provider name must contain at least two characters.');
      return;
    }

    if (!validateOptionalUrl(websiteUrl) || !validateOptionalUrl(documentationUrl)) {
      setActionError('Provider links must be valid HTTP or HTTPS URLs.');
      return;
    }

    try {
      await providers.createProvider({
        code: normalizedCode,
        name: normalizedName,
        websiteUrl: normalizeOptionalUrl(websiteUrl),
        documentationUrl: normalizeOptionalUrl(documentationUrl),
      });
      setCode('');
      setName('');
      setWebsiteUrl('');
      setDocumentationUrl('');
      setFeedback(`${normalizedName} was added to the provider registry.`);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : 'The network provider could not be created.',
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
    },
  ) {
    resetFeedback();
    const normalizedName = input.name.trim();

    if (normalizedName.length < 2) {
      setActionError('Provider name must contain at least two characters.');
      return;
    }

    if (
      !validateOptionalUrl(input.websiteUrl ?? '') ||
      !validateOptionalUrl(input.documentationUrl ?? '')
    ) {
      setActionError('Provider links must be valid HTTP or HTTPS URLs.');
      return;
    }

    const changed =
      normalizedName !== provider.name ||
      input.websiteUrl !== provider.websiteUrl ||
      input.documentationUrl !== provider.documentationUrl ||
      input.status !== provider.status;

    if (!changed) {
      setActionError('The provider configuration has not changed.');
      return;
    }

    try {
      await providers.updateProvider({
        providerId: provider.id,
        name: normalizedName,
        websiteUrl: input.websiteUrl,
        documentationUrl: input.documentationUrl,
        status: input.status,
      });
      setFeedback(`${normalizedName} was updated successfully.`);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : 'The network provider could not be updated.',
      );
    }
  }

  if (providers.status === 'forbidden') {
    return (
      <ModuleAccessState icon="lock" title="Network providers are restricted">
        Company Admin, Manager, or Platform Super Admin access is required.
      </ModuleAccessState>
    );
  }

  if (!providers.permissions.platformAdmin && company.activeCompany === null) {
    return (
      <ModuleAccessState icon="domain_disabled" title="Select an active company">
        The tenant provider directory requires an active company context.
      </ModuleAccessState>
    );
  }

  if (providers.status === 'loading') {
    return <ModuleLoadingState label="network providers" />;
  }

  return (
    <div className="tracking-module-page page-stack">
      <GlassPanel as="section" className="page-heading-panel tracking-heading-panel">
        <div>
          <span className="eyebrow-chip">
            <MaterialIcon name="hub" filled />
            Integration Catalog
          </span>
          <h1>Network Providers</h1>
          <p>
            {providers.permissions.platformAdmin
              ? 'Maintain the global affiliate-network registry used by every company.'
              : `View providers available to ${company.activeCompany?.name ?? 'this company'}.`}
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
            <span>Mode</span>
            <strong>{providers.permissions.platformAdmin ? 'Platform' : 'Tenant'}</strong>
          </div>
        </div>
      </GlassPanel>

      <ModuleFeedback error={actionError ?? providers.error} message={feedback} />

      <div className="tracking-module-grid">
        {providers.permissions.platformAdmin && (
          <GlassPanel as="section" className="tracking-create-card">
            <div className="tracking-section-heading">
              <div>
                <span className="eyebrow-chip">Platform Registry</span>
                <h2>Add provider</h2>
                <p>Create a reusable provider definition for company accounts.</p>
              </div>
              <MaterialIcon name="add_business" />
            </div>

            <form className="tracking-form" onSubmit={(event) => void handleCreate(event)}>
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
            providers.permissions.platformAdmin
              ? 'tracking-list-card'
              : 'tracking-list-card tracking-list-card--full'
          }
        >
          <div className="tracking-section-heading tracking-section-heading--toolbar">
            <div>
              <span className="eyebrow-chip">Provider Directory</span>
              <h2>Available networks</h2>
              <p>{filteredProviders.length} matching providers.</p>
            </div>
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
            {providers.permissions.platformAdmin && (
              <select
                aria-label="Filter network providers by status"
                onChange={(event) =>
                  setStatus(event.target.value as NetworkProviderStatus | 'all')
                }
                value={status}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            )}
          </div>

          {providers.status === 'error' && filteredProviders.length === 0 ? (
            <div className="tracking-empty-state tracking-empty-state--error">
              <MaterialIcon name="cloud_off" />
              <strong>Provider registry could not be loaded</strong>
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
                  key={provider.id}
                  onUpdate={handleUpdate}
                  platformAdmin={providers.permissions.platformAdmin}
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
