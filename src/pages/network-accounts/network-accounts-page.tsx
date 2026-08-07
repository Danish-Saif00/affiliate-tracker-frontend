import { type FormEvent, useMemo, useState } from "react";
import { useAppliedFilters } from "../../features/filters/use-applied-filters";

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
  const selectedSoftware = providers.find(
    (provider) => provider.id === form.providerId,
  );

  const inheritedTrackingParameter =
    selectedSoftware?.integration.defaultTrackingParameter ?? "click_id";

  return (
    <form className="catalog-form network-combined-form" onSubmit={onSubmit}>
      <div className="catalog-form-section-heading">
        <MaterialIcon name="account_tree" />
        <div>
          <strong>Network integration</strong>
          <small>
            Keep the visible setup simple while preserving the existing
            tracking and conversion contracts.
          </small>
        </div>
      </div>

      <div className="catalog-form-grid catalog-form-grid--three">
        <label>
          <span>Network name</span>
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
          <span>Software</span>
          <select
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...form,
                providerId: event.currentTarget.value,
                trackingParameter: "",
              })
            }
            required
            value={form.providerId}
          >
            <option value="">Select software</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>

          {selectedSoftware !== undefined && (
            <small>
              {selectedSoftware.integration.configured
                ? "Software click/conversion mapping is configured."
                : "Verify this software's click token before production use."}
            </small>
          )}
        </label>

        <label>
          <span>Click ID parameter</span>
          <input
            autoCapitalize="none"
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...form,
                trackingParameter: event.currentTarget.value,
              })
            }
            placeholder={inheritedTrackingParameter}
            spellCheck={false}
            value={form.trackingParameter}
          />
          <small>
            {form.trackingParameter.trim().length === 0
              ? "Using software default: " + inheritedTrackingParameter
              : "Network override: " + form.trackingParameter.trim()}
          </small>
        </label>

        {mode !== "edit" && (
          <InlineProviderCreator
            onCreated={(providerId) =>
              onChange({
                ...form,
                providerId,
                trackingParameter: "",
              })
            }
          />
        )}
      </div>

      {mode === "edit" && networkAccountId !== null ? (
        <>
          <div className="catalog-form-section-heading catalog-form-section-heading--postback">
            <MaterialIcon name="webhook" />
            <div>
              <strong>Network Postback</strong>
              <small>
                Keep the working secure endpoint lifecycle attached to this
                Network.
              </small>
            </div>
          </div>

          <NetworkPostbackManager
            key={networkAccountId}
            networkAccountId={networkAccountId}
            networkName={form.name}
          />
        </>
      ) : (
        <div className="network-postback-inline network-postback-inline--automatic">
          <MaterialIcon name="webhook" />
          <div>
            <strong>One secure Postback URL</strong>
            <span>
              The existing backend flow will automatically create one secure
              provider-ready endpoint after this Network is saved.
            </span>
          </div>
        </div>
      )}

      <ToggleField
        checked={form.duplicateAllowed}
        disabled={disabled}
        hint="Allow repeated provider-side conversion identifiers for this Network."
        label="Allow duplicate conversions"
        onChange={(duplicateAllowed) =>
          onChange({ ...form, duplicateAllowed })
        }
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

  const draftFilters = useMemo(
    () => ({
      search,
      status,
      providerId,
      createdAfter,
    }),
    [createdAfter, providerId, search, status],
  );
  const { appliedFilters, applyFilters } =
    useAppliedFilters(draftFilters, () => setPage(1));
  const filtered = useMemo(() => {
    if (snapshot === null) {
      return [];
    }

    const needle = appliedFilters.search.trim().toLowerCase();
    return snapshot.networks.filter((network) => {
      const matchesSearch =
        needle.length === 0 ||
        network.name.toLowerCase().includes(needle) ||
        network.providerName.toLowerCase().includes(needle) ||
        network.providerCode.toLowerCase().includes(needle) ||
        network.externalAccountId?.toLowerCase().includes(needle) === true;
      const matchesCreatedAfter =
        appliedFilters.createdAfter.length === 0 ||
        new Date(network.createdAt).getTime() >=
          new Date(`${appliedFilters.createdAfter}T00:00:00`).getTime();

      return (
        matchesSearch &&
        (appliedFilters.status === "all" ||
          network.status === appliedFilters.status) &&
        (appliedFilters.providerId.length === 0 ||
          network.providerId === appliedFilters.providerId) &&
        matchesCreatedAfter
      );
    });
  }, [appliedFilters, snapshot]);

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
            ? "Add a Network with its software and click-ID mapping. One secure Postback URL is generated automatically."
            : "Edit Network integration and manage the existing Postback while preserving lifecycle controls."
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
              <MaterialIcon name="webhook" />
            </span>

            <div>
              <span>Network Postback</span>
              <strong>{createdPostback.networkName} is connected</strong>
              <small>
                Copy this single working provider-ready URL into the Network
                software. The endpoint credential is not shown separately.
              </small>
            </div>

            <button
              aria-label="Dismiss generated Postback URL"
              className="control-secondary-button"
              onClick={() => setCreatedPostback(null)}
              type="button"
            >
              <MaterialIcon name="close" />
              Dismiss
            </button>
          </div>

          <div className="network-postback-result__url">
            <span>Postback URL</span>
            <code>
              {createdPostback.templateUrl ?? createdPostback.baseUrl}
            </code>

            {createdPostback.templateUrl === null && (
              <small>
                The software mapping does not currently provide a complete
                macro template. Verify its click token before using the base
                callback in production.
              </small>
            )}
          </div>

          <div className="network-postback-result__actions">
            <button
              className="primary-gradient-button primary-gradient-button--compact"
              onClick={() =>
                void copyPostbackValue(
                  createdPostback.templateUrl ?? createdPostback.baseUrl,
                  "Postback URL",
                )
              }
              type="button"
            >
              <MaterialIcon name="content_copy" />
              Copy Postback URL
            </button>
          </div>
        </GlassPanel>
      )}
      {catalog.permissions.canManageCatalog && editorVisible && (
        <GlassPanel as="section" className="control-card catalog-editor-panel">
          <ControlCardHeading
            description={
              editorMode === "edit"
                ? "Update the same Network integration and manage its secure Postback."
                : "Choose software and click-ID mapping. One secure Postback URL is generated automatically."
            }
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
        </GlassPanel>
      )}

      {mode === "manage" && (
        <GlassPanel as="section" className="control-card catalog-table-panel control-directory-surface">
          <div className="control-directory-actions">
            <RefreshButton
              disabled={catalog.isRefreshing}
              onClick={() => void catalog.refresh()}
            />
          </div>
          <CatalogToolbar
            onSearch={(value) => {
              setSearch(value);

            }}
            search={search}
          >
            <select
              onChange={(event) => {
                setProviderId(event.currentTarget.value);

              }}
              value={providerId}
            >
              <option value="">All software</option>
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

              }}
              type="date"
              value={createdAfter}
            />

            <div className="filter-apply-actions">
              <button
                className="primary-gradient-button primary-gradient-button--compact filter-apply-button"
                onClick={applyFilters}
                type="button"
              >
                Apply Filters
              </button>
            </div>
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
                    <th>Software</th>
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
                      </td>
                      <td>{network.providerName}</td>
                      <td>{network.offerCount}</td>
                      <td>
                        <code>{network.effectiveTrackingParameter}</code>
                      </td>
                      <td>
                        {network.providerIntegrationConfigured
                          ? "Postback ready"
                          : "Software mapping required"}
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
