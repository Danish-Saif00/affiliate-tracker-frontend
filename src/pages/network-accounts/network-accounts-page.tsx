import { type FormEvent, useMemo, useState } from "react";

import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import type {
  CatalogNetwork,
  CatalogNetworkStatus,
  CreateCatalogNetworkInput,
} from "../../features/catalog/catalog.types";
import { useCatalogOperations } from "../../features/catalog/use-catalog";
import { usePostbackEndpointCreator } from "../../features/control-plane/use-control-plane";
import { buildProviderPostbackSetup } from "../../features/tracking-networks/provider-postback-setup";
import { InlineProviderCreator } from "./inline-provider-creator";
import { NetworkPostbackManager } from "./network-postback-manager";
import {
  CatalogPagination,
  CatalogToolbar,
  RowActions,
  ToggleField,
} from "../control-plane/catalog-page-ui";
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
import { formatDateTime } from "../control-plane/control-plane-formatters";

const PAGE_SIZE = 10;

export type NetworkAccountsPageMode = "add" | "manage";

type NetworkFormState = {
  providerId: string;
  name: string;
  externalAccountId: string;
  trackingParameter: string;
  postbackUrl: string;
  duplicateAllowed: boolean;
  createPostbackEndpoint: boolean;
  postbackEndpointName: string;
  status: CatalogNetworkStatus;
};

type CreatedPostbackSetup = ReturnType<typeof buildProviderPostbackSetup> & {
  networkName: string;
};

function emptyForm(): NetworkFormState {
  return {
    providerId: "",
    name: "",
    externalAccountId: "",
    trackingParameter: "",
    postbackUrl: "",
    duplicateAllowed: false,
    createPostbackEndpoint: true,
    postbackEndpointName: "",
    status: "active",
  };
}

function formFromNetwork(network: CatalogNetwork): NetworkFormState {
  return {
    providerId: network.providerId,
    name: network.name,
    externalAccountId: network.externalAccountId ?? "",
    trackingParameter: network.trackingParameter ?? "",
    postbackUrl: network.postbackUrl ?? "",
    duplicateAllowed: network.duplicateAllowed,
    createPostbackEndpoint: false,
    postbackEndpointName: `${network.name} Conversions`,
    status: network.status,
  };
}

function NetworkForm({
  form,
  mode,
  providers,
  disabled,
  onChange,
  onSubmit,
  onCancel,
  networkAccountId,
}: {
  form: NetworkFormState;
  mode: "clone" | "create" | "edit";
  providers: readonly {
    id: string;
    code: string;
    name: string;
    integration: {
      defaultTrackingParameter: string | null;
      configured: boolean;
    };
  }[];
  disabled: boolean;
  onChange: (form: NetworkFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  networkAccountId: string | null;
}) {
  const selectedProvider = providers.find(
    (provider) => provider.id === form.providerId,
  );
  const inheritedTrackingParameter =
    selectedProvider?.integration.defaultTrackingParameter ?? "click_id";

  return (
    <form className="catalog-form network-combined-form" onSubmit={onSubmit}>
      <div className="catalog-form-section-heading">
        <MaterialIcon name="account_tree" />
        <div>
          <strong>Network configuration</strong>
          <small>
            Provider account identity and tracking identifier settings.
          </small>
        </div>
      </div>

      <div className="catalog-form-grid catalog-form-grid--three">
        <label>
          <span>Name</span>
          <input
            disabled={disabled}
            maxLength={160}
            onChange={(event) =>
              onChange({ ...form, name: event.currentTarget.value })
            }
            placeholder="Network name"
            required
            value={form.name}
          />
        </label>
        <label>
          <span>Software / provider</span>
          <select
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...form, providerId: event.currentTarget.value })
            }
            required
            value={form.providerId}
          >
            <option value="">Select provider</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </label>

        {mode !== "edit" && <InlineProviderCreator />}
        <label>
          <span>External account ID</span>
          <input
            autoComplete="off"
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...form,
                externalAccountId: event.currentTarget.value,
              })
            }
            placeholder="Optional provider account ID"
            value={form.externalAccountId}
          />
        </label>
        <label>
          <span>Tracking parameter</span>
          <input
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...form,
                trackingParameter: event.currentTarget.value,
              })
            }
            placeholder={`Inherited from Provider: ${inheritedTrackingParameter}`}
            value={form.trackingParameter}
          />
          <small>
            {form.trackingParameter.trim().length === 0
              ? `Inherited from Provider: ${inheritedTrackingParameter}`
              : `Network override: ${form.trackingParameter.trim()}`}
          </small>
        </label>
        {mode === "edit" && (
          <label>
            <span>Status</span>
            <select
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...form,
                  status: event.currentTarget.value as CatalogNetworkStatus,
                })
              }
              value={form.status}
            >
              <option value="active">Active</option>
              <option value="suspended">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        )}
      </div>

      <div className="catalog-form-section-heading catalog-form-section-heading--postback">
        <MaterialIcon name="webhook" />
        <div>
          <strong>Postback configuration</strong>
          <small>
            Postback belongs to this Network and is not managed as a separate
            module.
          </small>
        </div>
      </div>

      {mode !== "edit" ? (
        <div className="network-postback-inline">
          <ToggleField
            checked={form.createPostbackEndpoint}
            disabled={disabled}
            hint="Generate a secure conversion URL immediately after this Network is created."
            label="Create secure postback endpoint"
            onChange={(createPostbackEndpoint) =>
              onChange({ ...form, createPostbackEndpoint })
            }
          />

          {form.createPostbackEndpoint && (
            <div className="catalog-form-grid">
              <label className="catalog-field--wide">
                <span>Endpoint name</span>
                <input
                  disabled={disabled}
                  maxLength={160}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      postbackEndpointName: event.currentTarget.value,
                    })
                  }
                  placeholder={`${form.name.trim() || "Network"} Conversions`}
                  value={form.postbackEndpointName}
                />
                <small>
                  The secure URL and one-time key will appear after Add Network
                  succeeds. You will paste that generated URL into the provider
                  dashboard.
                </small>
              </label>
            </div>
          )}
        </div>
      ) : networkAccountId !== null ? (
        <NetworkPostbackManager
          key={networkAccountId}
          networkAccountId={networkAccountId}
          networkName={form.name}
        />
      ) : null}

      <ToggleField
        checked={form.duplicateAllowed}
        disabled={disabled}
        hint="Allow repeated provider-side conversion identifiers for this Network."
        label="Allow duplicate conversions"
        onChange={(duplicateAllowed) => onChange({ ...form, duplicateAllowed })}
      />

      <div className="catalog-form-actions">
        {onCancel !== undefined && (
          <button
            className="control-secondary-button"
            disabled={disabled}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        )}
        <button
          className="primary-gradient-button primary-gradient-button--compact"
          disabled={disabled}
          type="submit"
        >
          <MaterialIcon
            name={
              mode === "edit"
                ? "save"
                : mode === "clone"
                  ? "content_copy"
                  : "add"
            }
          />
          {mode === "edit"
            ? "Save Network"
            : mode === "clone"
              ? "Clone Network"
              : "Add Network"}
        </button>
      </div>
    </form>
  );
}

export function NetworkAccountsPage({
  mode,
}: {
  mode: NetworkAccountsPageMode;
}) {
  const catalog = useCatalogOperations();
  const postbackCreator = usePostbackEndpointCreator();
  const [form, setForm] = useState<NetworkFormState>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CatalogNetworkStatus | "all">("all");
  const [providerId, setProviderId] = useState("");
  const [createdAfter, setCreatedAfter] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createdPostback, setCreatedPostback] =
    useState<CreatedPostbackSetup | null>(null);
  const snapshot = catalog.snapshot;

  const providers = useMemo(
    () =>
      snapshot?.providers.filter((provider) => provider.status === "active") ??
      [],
    [snapshot],
  );

  const filtered = useMemo(() => {
    if (snapshot === null) {
      return [];
    }

    const needle = search.trim().toLowerCase();
    return snapshot.networks.filter((network) => {
      const matchesSearch =
        needle.length === 0 ||
        network.name.toLowerCase().includes(needle) ||
        network.providerName.toLowerCase().includes(needle) ||
        network.providerCode.toLowerCase().includes(needle) ||
        network.externalAccountId?.toLowerCase().includes(needle) === true;
      const matchesCreatedAfter =
        createdAfter.length === 0 ||
        new Date(network.createdAt).getTime() >=
          new Date(`${createdAfter}T00:00:00`).getTime();

      return (
        matchesSearch &&
        (status === "all" || network.status === status) &&
        (providerId.length === 0 || network.providerId === providerId) &&
        matchesCreatedAfter
      );
    });
  }, [createdAfter, providerId, search, snapshot, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const editorVisible = mode === "add" || editorOpen;
  const editorMode =
    editingId !== null ? "edit" : cloningId !== null ? "clone" : "create";

  function resetFeedback(): void {
    setMessage(null);
    setActionError(null);
  }

  async function copyPostbackValue(
    value: string,
    label: string,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied.`);
      setActionError(null);
    } catch {
      setActionError(`The browser could not copy the ${label.toLowerCase()}.`);
    }
  }

  function createInput(current: NetworkFormState): CreateCatalogNetworkInput {
    return {
      providerId: current.providerId,
      name: current.name,
      externalAccountId: current.externalAccountId.trim() || null,
      trackingParameter: current.trackingParameter.trim() || null,
      postbackUrl: current.postbackUrl.trim() || null,
      duplicateAllowed: current.duplicateAllowed,
    };
  }

  function closeEditor(): void {
    setEditingId(null);
    setCloningId(null);
    setEditorOpen(false);
    setForm(emptyForm());
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    resetFeedback();

    try {
      if (editingId === null) {
        const cloning = cloningId !== null;
        const createdNetwork = cloning
          ? await catalog.cloneNetwork({
              sourceAccountId: cloningId,
              ...createInput(form),
            })
          : await catalog.createNetwork(createInput(form));

        if (form.createPostbackEndpoint) {
          try {
            const endpointName =
              form.postbackEndpointName.trim() ||
              `${createdNetwork.name} Conversions`;
            const result = await postbackCreator.createEndpoint({
              networkAccountId: createdNetwork.id,
              name: endpointName,
              status: "active",
            });

            setCreatedPostback({
              ...buildProviderPostbackSetup(result),
              networkName: createdNetwork.name,
            });
            setMessage(
              cloning
                ? `${createdNetwork.name} was cloned and its fresh secure postback endpoint was created.`
                : `${createdNetwork.name} and its secure postback endpoint were created.`,
            );
          } catch (endpointError: unknown) {
            setCreatedPostback(null);
            setMessage(
              cloning
                ? `${createdNetwork.name} was cloned.`
                : `${createdNetwork.name} was created.`,
            );
            setActionError(
              endpointError instanceof Error
                ? `The Network was saved, but its secure postback endpoint could not be created: ${endpointError.message}`
                : "The Network was saved, but its secure postback endpoint could not be created.",
            );
          }
        } else {
          setCreatedPostback(null);
          setMessage(
            cloning
              ? `${createdNetwork.name} was cloned.`
              : `${createdNetwork.name} was added.`,
          );
        }
      } else {
        await catalog.updateNetwork({
          accountId: editingId,
          providerId: form.providerId,
          name: form.name,
          externalAccountId: form.externalAccountId.trim() || null,
          status: form.status,
          trackingParameter: form.trackingParameter.trim() || null,
          postbackUrl: form.postbackUrl.trim() || null,
          duplicateAllowed: form.duplicateAllowed,
        });
        setMessage(`${form.name.trim()} was updated.`);
      }

      closeEditor();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The Network could not be saved.",
      );
    }
  }

  function editNetwork(network: CatalogNetwork): void {
    resetFeedback();
    setEditingId(network.id);
    setCloningId(null);
    setForm(formFromNetwork(network));
    setEditorOpen(true);
    document.querySelector(".catalog-editor-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function cloneNetwork(network: CatalogNetwork): void {
    const suffix = Date.now().toString(36).slice(-5);

    resetFeedback();
    setEditingId(null);
    setCloningId(network.id);
    setForm({
      ...formFromNetwork(network),
      name: `${network.name} Copy ${suffix}`,
      externalAccountId: "",
      createPostbackEndpoint: true,
      postbackEndpointName: `${network.name} Copy ${suffix} Conversions`,
      status: "active",
    });
    setEditorOpen(true);
    document.querySelector(".catalog-editor-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function updateNetworkStatus(
    network: CatalogNetwork,
    nextStatus: CatalogNetworkStatus,
  ): Promise<void> {
    resetFeedback();

    try {
      await catalog.updateNetwork({
        accountId: network.id,
        providerId: network.providerId,
        name: network.name,
        externalAccountId: network.externalAccountId,
        status: nextStatus,
        trackingParameter: network.trackingParameter,
        postbackUrl: network.postbackUrl,
        duplicateAllowed: network.duplicateAllowed,
      });
      setMessage(
        nextStatus === "active"
          ? `${network.name} is active.`
          : nextStatus === "suspended"
            ? `${network.name} is paused.`
            : `${network.name} was archived.`,
      );
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The Network status could not be updated.",
      );
    }
  }

  async function permanentlyDeleteNetwork(
    network: CatalogNetwork,
  ): Promise<void> {
    const confirmed = window.confirm(
      `Permanently delete ${network.name}? This action cannot be undone and only succeeds when the archived Network has no dependent records.`,
    );

    if (!confirmed) {
      return;
    }

    resetFeedback();

    try {
      await catalog.deleteNetwork({ accountId: network.id });
      setMessage(`${network.name} was permanently deleted.`);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The Network could not be permanently deleted.",
      );
    }
  }

  if (!catalog.permissions.canReadCatalog) {
    return (
      <ControlAccessDenied
        message="Company Administrator access is required."
        title="Network access unavailable"
      />
    );
  }

  if (catalog.isLoading || snapshot === null) {
    return <ControlLoading label="Networks" />;
  }

  return (
    <div className="page-stack catalog-page company-admin-network-page">
      <ControlModuleHeader
        description={
          mode === "add"
            ? "Add a Network and its Postback configuration in one operational form."
            : "Edit, clone, activate, pause, archive, or safely delete company Networks."
        }
        eyebrow="Network Operations"
        icon="account_tree"
        stats={[
          { label: "Total", value: snapshot.summary.networks },
          {
            label: "Active",
            value: snapshot.networks.filter(
              (network) => network.status === "active",
            ).length,
          },
          { label: "Offers", value: snapshot.summary.offers },
        ]}
        title={mode === "add" ? "Add Network" : "Manage Networks"}
      />

      <ControlFeedback
        error={actionError ?? postbackCreator.error ?? catalog.error}
        message={message}
      />

      {createdPostback !== null && (
        <GlassPanel
          as="section"
          className="control-card network-postback-result"
        >
          <div className="network-postback-result__heading">
            <span className="network-postback-result__icon">
              <MaterialIcon name="key" />
            </span>
            <div>
              <span>One-time secure endpoint</span>
              <strong>{createdPostback.networkName} is ready</strong>
              <small>
                Copy this URL now. The endpoint key is only returned when the
                endpoint is created or rotated.
              </small>
            </div>
            <button
              aria-label="Dismiss generated postback details"
              className="control-secondary-button"
              onClick={() => setCreatedPostback(null)}
              type="button"
            >
              <MaterialIcon name="close" />
              Dismiss
            </button>
          </div>

          <div className="network-postback-result__grid">
            <div>
              <span>Endpoint name</span>
              <strong>{createdPostback.endpointName}</strong>
            </div>
            <div>
              <span>Endpoint key</span>
              <code>{createdPostback.endpointKey}</code>
            </div>
          </div>

          <div className="network-postback-result__url">
            <span>{createdPostback.providerName} global postback template</span>
            {createdPostback.templateUrl === null ? (
              <small>
                Configure the Provider integration profile before generating a
                provider-ready template. The secure base URL remains available.
              </small>
            ) : (
              <>
                <code>{createdPostback.templateUrl}</code>
                <small>
                  The template uses the exact Provider macro tokens configured
                  for {createdPostback.providerName}.
                </small>
              </>
            )}
          </div>

          <div className="network-postback-result__actions">
            <button
              className="control-secondary-button"
              onClick={() =>
                void copyPostbackValue(
                  createdPostback.baseUrl,
                  "Base postback URL",
                )
              }
              type="button"
            >
              <MaterialIcon name="link" />
              Copy base URL
            </button>
            {createdPostback.templateUrl !== null && (
              <button
                className="primary-gradient-button primary-gradient-button--compact"
                onClick={() =>
                  void copyPostbackValue(
                    createdPostback.templateUrl ?? "",
                    "Provider postback template",
                  )
                }
                type="button"
              >
                <MaterialIcon name="content_copy" />
                Copy provider template
              </button>
            )}
          </div>
        </GlassPanel>
      )}

      {catalog.permissions.canManageCatalog && editorVisible && (
        <GlassPanel as="section" className="control-card catalog-editor-panel">
          <ControlCardHeading
            description="Network and Postback settings remain attached to one record."
            eyebrow={
              editorMode === "edit"
                ? "Edit Network"
                : editorMode === "clone"
                  ? "Clone Network"
                  : "Add Network"
            }
            title={
              editorMode === "edit"
                ? `Update ${form.name}`
                : editorMode === "clone"
                  ? `Clone ${form.name}`
                  : "Connect a Network"
            }
          />
          {providers.length === 0 ? (
            <ControlEmpty
              icon="hub"
              message="Create or activate a company-owned Network Provider first."
              title="No active providers"
            />
          ) : (
            <NetworkForm
              disabled={catalog.isMutating || postbackCreator.isMutating}
              form={form}
              mode={editorMode}
              onCancel={mode === "manage" ? closeEditor : undefined}
              onChange={setForm}
              networkAccountId={editingId}
              onSubmit={(event) => void handleSubmit(event)}
              providers={providers}
            />
          )}
        </GlassPanel>
      )}

      {mode === "manage" && (
        <GlassPanel as="section" className="control-card catalog-table-panel">
          <ControlCardHeading
            action={
              <RefreshButton
                disabled={catalog.isRefreshing}
                onClick={() => void catalog.refresh()}
              />
            }
            description="Search and control all Networks and their attached Postback configuration."
            eyebrow="Network Directory"
            title="Manage Networks"
          />
          <CatalogToolbar
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            search={search}
          >
            <select
              onChange={(event) => {
                setProviderId(event.currentTarget.value);
                setPage(1);
              }}
              value={providerId}
            >
              <option value="">All providers</option>
              {snapshot.providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            <select
              onChange={(event) => {
                setStatus(
                  event.currentTarget.value as CatalogNetworkStatus | "all",
                );
                setPage(1);
              }}
              value={status}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Paused</option>
              <option value="archived">Archived</option>
            </select>
            <input
              aria-label="Networks added after"
              onChange={(event) => {
                setCreatedAfter(event.currentTarget.value);
                setPage(1);
              }}
              type="date"
              value={createdAfter}
            />
          </CatalogToolbar>

          {pageRows.length === 0 ? (
            <ControlEmpty
              icon="account_tree"
              message="Add a Network or change the filters."
              title="No Networks found"
            />
          ) : (
            <div className="responsive-table catalog-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Network</th>
                    <th>Provider</th>
                    <th>Offers</th>
                    <th>Tracking</th>
                    <th>Postback</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((network) => (
                    <tr key={network.id}>
                      <td>
                        <strong>{network.name}</strong>
                        <small>
                          {network.externalAccountId ?? "No external ID"}
                        </small>
                      </td>
                      <td>
                        {network.providerName}
                        <small>{network.providerCode}</small>
                      </td>
                      <td>{network.offerCount}</td>
                      <td>
                        <code>{network.effectiveTrackingParameter}</code>
                      </td>
                      <td>
                        {network.providerIntegrationConfigured
                          ? "Provider template ready"
                          : "Provider setup required"}
                      </td>
                      <td>
                        <ControlStatus status={network.status} />
                      </td>
                      <td>{formatDateTime(network.createdAt)}</td>
                      <td>
                        <RowActions>
                          {catalog.permissions.canManageCatalog &&
                            network.status !== "archived" && (
                              <button
                                aria-label={`Edit ${network.name}`}
                                onClick={() => editNetwork(network)}
                                title="Edit"
                                type="button"
                              >
                                <MaterialIcon name="edit" />
                              </button>
                            )}
                          {catalog.permissions.canManageCatalog && (
                            <button
                              aria-label={`Clone ${network.name}`}
                              onClick={() => cloneNetwork(network)}
                              title="Clone"
                              type="button"
                            >
                              <MaterialIcon name="content_copy" />
                            </button>
                          )}
                          {catalog.permissions.canManageCatalog &&
                            network.status !== "active" &&
                            network.status !== "archived" && (
                              <button
                                aria-label={`Activate ${network.name}`}
                                onClick={() =>
                                  void updateNetworkStatus(network, "active")
                                }
                                title="Activate"
                                type="button"
                              >
                                <MaterialIcon name="play_arrow" />
                              </button>
                            )}
                          {catalog.permissions.canManageCatalog &&
                            network.status === "active" && (
                              <button
                                aria-label={`Pause ${network.name}`}
                                onClick={() =>
                                  void updateNetworkStatus(network, "suspended")
                                }
                                title="Pause"
                                type="button"
                              >
                                <MaterialIcon name="pause" />
                              </button>
                            )}
                          {catalog.permissions.canManageCatalog &&
                            network.status !== "archived" && (
                              <button
                                aria-label={`Archive ${network.name}`}
                                onClick={() =>
                                  void updateNetworkStatus(network, "archived")
                                }
                                title="Archive Network"
                                type="button"
                              >
                                <MaterialIcon name="archive" />
                              </button>
                            )}
                          {catalog.permissions.canManageCatalog &&
                            network.status === "archived" && (
                              <button
                                aria-label={`Permanently delete ${network.name}`}
                                onClick={() =>
                                  void permanentlyDeleteNetwork(network)
                                }
                                title="Permanently delete unused Network"
                                type="button"
                              >
                                <MaterialIcon name="delete_forever" />
                              </button>
                            )}
                        </RowActions>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <CatalogPagination
            onPage={setPage}
            page={safePage}
            pageCount={pageCount}
          />
        </GlassPanel>
      )}
    </div>
  );
}
