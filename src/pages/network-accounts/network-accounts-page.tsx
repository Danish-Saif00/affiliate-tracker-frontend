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
import type { NetworkProviderIntegrationInput } from "../../features/tracking-networks/tracking-networks.types";
import { useNetworkProviders } from "../../features/tracking-networks/use-tracking-networks";
import { NetworkPostbackManager } from "./network-postback-manager";
import {
  CatalogPagination,
  CatalogToolbar,
  RowActions,
  ToggleField,
} from "../control-plane/catalog-page-ui";
import {
  ControlAccessDenied,
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
  clickIdToken: string;
  postbackUrl: string;
  postbackDomainId: string;
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
    trackingParameter: "click_id",
    clickIdToken: "",
    postbackUrl: "",
    postbackDomainId: "",
    duplicateAllowed: false,
    createPostbackEndpoint: true,
    postbackEndpointName: "",
    status: "active",
  };
}

function formFromNetwork(
  network: CatalogNetwork,
  clickIdToken: string,
): NetworkFormState {
  return {
    providerId: network.providerId,
    name: network.name,
    externalAccountId: network.externalAccountId ?? "",
    trackingParameter:
      network.trackingParameter ?? network.effectiveTrackingParameter,
    clickIdToken,
    postbackUrl: network.postbackUrl ?? "",
    postbackDomainId: "",
    duplicateAllowed: network.duplicateAllowed,
    createPostbackEndpoint: false,
    postbackEndpointName: `${network.name} Conversions`,
    status: network.status,
  };
}

function createInternalProviderIdentity(networkName: string): {
  code: string;
  name: string;
} {
  const normalizedName = networkName.trim();
  const baseCode =
    normalizedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "_")
      .replace(/^_+|_+$/gu, "")
      .slice(0, 48) || "network";
  const suffix =
    `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const code = `${baseCode}_${suffix}`.slice(0, 80).replace(/_+$/gu, "");
  const internalName =
    `${normalizedName.slice(0, 136)} [${suffix}]`.slice(0, 160);

  return {
    code,
    name: internalName,
  };
}

function createProviderIntegration(
  form: NetworkFormState,
  inherited?: NetworkProviderIntegrationInput,
): NetworkProviderIntegrationInput {
  return {
    defaultTrackingParameter: form.trackingParameter.trim(),
    postbackClickIdToken: form.clickIdToken.trim(),
    postbackConversionIdToken:
      inherited?.postbackConversionIdToken ?? null,
    postbackRevenueAmountToken:
      inherited?.postbackRevenueAmountToken ?? null,
    postbackRevenueCurrencyToken:
      inherited?.postbackRevenueCurrencyToken ?? null,
    postbackConversionStatus:
      inherited?.postbackConversionStatus ?? "approved",
  };
}

function NetworkForm({
  form,
  mode,
  disabled,
  onChange,
  onSubmit,
  onCancel,
  networkAccountId,
  domains,
}: {
  form: NetworkFormState;
  mode: "clone" | "create" | "edit";
  disabled: boolean;
  onChange: (form: NetworkFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  networkAccountId: string | null;
  domains: readonly {
    readonly id: string;
    readonly hostname: string;
    readonly status: string;
  }[];
}) {
  return (
    <form className="catalog-form network-combined-form" onSubmit={onSubmit}>

      <div className="catalog-form-grid catalog-form-grid--three">
        <label>
          <span>Network name</span>
          <input
            disabled={disabled}
            maxLength={160}
            onChange={(event) =>
              onChange({ ...form, name: event.currentTarget.value })
            }
            placeholder="D8Ads, ClickAds, Affizer..."
            required
            value={form.name}
          />
        </label>

        <label>
          <span>Click ID parameter</span>
          <input
            autoCapitalize="none"
            disabled={disabled}
            maxLength={120}
            onChange={(event) =>
              onChange({
                ...form,
                trackingParameter: event.currentTarget.value,
              })
            }
            placeholder="click_id"
            required
            spellCheck={false}
            value={form.trackingParameter}
          />
          <small>
            Parameter name only, for example click_id, subid, or s8.
          </small>
        </label>

        <label>
          <span>Click ID token</span>
          <input
            autoCapitalize="none"
            disabled={disabled}
            maxLength={240}
            onChange={(event) =>
              onChange({
                ...form,
                clickIdToken: event.currentTarget.value,
              })
            }
            placeholder="{click_id} or #s8#"
            required
            spellCheck={false}
            value={form.clickIdToken}
          />
          <small>
            Macro/token format is preserved exactly after trimming. Hash-style
            tokens such as #s8# are supported.
          </small>
        </label>
      </div>

      {mode !== "edit" && (
        <label>
          <span>Postback Domain</span>
          <select
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...form,
                postbackDomainId:
                  event.currentTarget.value,
              })
            }
            value={form.postbackDomainId}
          >
            <option value="">
              Default Postback host
            </option>
            {domains
              .filter(
                (domain) =>
                  domain.status === "active",
              )
              .map((domain) => (
                <option
                  key={domain.id}
                  value={domain.id}
                >
                  {domain.hostname}
                </option>
              ))}
          </select>
          <small>
            Optional. Select a tracking domain to use it as
            the public Postback hostname.
          </small>
        </label>
      )}
      {mode === "edit" && networkAccountId !== null ? (
        <>
          <NetworkPostbackManager
            key={networkAccountId}
            networkAccountId={networkAccountId}
            networkName={form.name}
          />
        </>
      ) : (
<></>
      )}

      {mode === "edit" && (
        <ToggleField
          checked={form.duplicateAllowed}
          disabled={disabled}
          hint="Allow repeated provider-side conversion identifiers for this Network."
          label="Allow duplicate conversions"
          onChange={(duplicateAllowed) =>
            onChange({ ...form, duplicateAllowed })
          }
        />
      )}

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
  const providerOperations = useNetworkProviders();
  const postbackCreator = usePostbackEndpointCreator();
  const [form, setForm] = useState<NetworkFormState>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CatalogNetworkStatus | "all">("active");
  const [createdAfter, setCreatedAfter] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createdPostback, setCreatedPostback] =
    useState<CreatedPostbackSetup | null>(null);
  const snapshot = catalog.snapshot;
  const providers = snapshot?.providers ?? [];
  const domains = snapshot?.domains ?? [];

  const draftFilters = useMemo(
    () => ({
      search,
      status,
      createdAfter,
    }),
    [createdAfter, search, status],
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
        network.externalAccountId?.toLowerCase().includes(needle) === true;
      const matchesCreatedAfter =
        appliedFilters.createdAfter.length === 0 ||
        new Date(network.createdAt).getTime() >=
          new Date(`${appliedFilters.createdAfter}T00:00:00`).getTime();
      return (
        matchesSearch &&
        (appliedFilters.status === "all" ||
          network.status === appliedFilters.status) &&
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

  function createInput(
    current: NetworkFormState,
    providerId: string,
  ): CreateCatalogNetworkInput {
    return {
      providerId,
      name: current.name.trim(),
      externalAccountId: current.externalAccountId.trim() || null,
      trackingParameter: current.trackingParameter.trim(),
      postbackUrl: current.postbackUrl.trim() || null,
      duplicateAllowed: current.duplicateAllowed,
    };
  }

  async function createInternalProvider(
    current: NetworkFormState,
    inherited?: NetworkProviderIntegrationInput,
  ) {
    const identity = createInternalProviderIdentity(current.name);

    return providerOperations.createProvider({
      code: identity.code,
      name: identity.name,
      websiteUrl: null,
      documentationUrl: null,
      integration: createProviderIntegration(current, inherited),
    });
  }

  async function archiveInternalProviderBestEffort(
    providerId: string,
  ): Promise<void> {
    try {
      await providerOperations.updateProvider({
        providerId,
        status: "archived",
      });
    } catch {
      // Keep the original Network mutation failure as the user-facing error.
      // An unused hidden provider is safer than deleting or mutating tracking
      // history to compensate for a later failure.
    }
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

    const normalizedName = form.name.trim();
    const clickParameter = form.trackingParameter.trim();
    const clickIdToken = form.clickIdToken.trim();

    if (normalizedName.length < 2 || normalizedName.length > 160) {
      setActionError("Network name must contain between 2 and 160 characters.");
      return;
    }

    if (clickParameter.length === 0) {
      setActionError("Click ID parameter is required.");
      return;
    }

    if (clickIdToken.length === 0) {
      setActionError("Click ID token is required.");
      return;
    }

    try {
      if (editingId === null) {
        const cloning = cloningId !== null;
        const sourceProvider =
          cloning && form.providerId.length > 0
            ? providers.find(
                (provider) => provider.id === form.providerId,
              )
            : undefined;
        const internalProvider = await createInternalProvider(
          form,
          sourceProvider?.integration,
        );

        let createdNetwork: CatalogNetwork;

        try {
          createdNetwork =
            cloning && cloningId !== null
              ? await catalog.cloneNetwork({
                  sourceAccountId: cloningId,
                  ...createInput(form, internalProvider.id),
                })
              : await catalog.createNetwork(
                  createInput(form, internalProvider.id),
                );
        } catch (networkError: unknown) {
          await archiveInternalProviderBestEffort(internalProvider.id);
          throw networkError;
        }

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
            const selectedDomain =
              form.postbackDomainId.length === 0
                ? undefined
                : domains.find(
                    (domain) =>
                      domain.id ===
                        form.postbackDomainId &&
                      domain.status === "active",
                  );
            if (
              form.postbackDomainId.length > 0 &&
              selectedDomain === undefined
            ) {
              throw new Error(
                "The selected Postback domain is no longer active.",
              );
            }
            const postbackSetup =
              buildProviderPostbackSetup(
                result,
                selectedDomain === undefined
                  ? undefined
                  : `https://${selectedDomain.hostname}`,
              );
            if (selectedDomain !== undefined) {
              await catalog.updateNetwork({
                accountId: createdNetwork.id,
                providerId: createdNetwork.providerId,
                name: createdNetwork.name,
                externalAccountId:
                  createdNetwork.externalAccountId,
                status: createdNetwork.status,
                trackingParameter:
                  createdNetwork.trackingParameter,
                postbackUrl:
                  postbackSetup.templateUrl ??
                  postbackSetup.baseUrl,
                duplicateAllowed:
                  createdNetwork.duplicateAllowed,
              });
            }
            setCreatedPostback({
              ...postbackSetup,
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
        const existingProvider = providers.find(
          (provider) => provider.id === form.providerId,
        );
        const mappingChanged =
          existingProvider === undefined ||
          existingProvider.integration.defaultTrackingParameter !==
            clickParameter ||
          existingProvider.integration.postbackClickIdToken !== clickIdToken;

        let providerId = form.providerId;
        let replacementProviderId: string | null = null;

        if (mappingChanged) {
          const replacementProvider = await createInternalProvider(
            form,
            existingProvider?.integration,
          );
          providerId = replacementProvider.id;
          replacementProviderId = replacementProvider.id;
        }

        try {
          await catalog.updateNetwork({
            accountId: editingId,
            providerId,
            name: normalizedName,
            externalAccountId: form.externalAccountId.trim() || null,
            status: form.status,
            trackingParameter: clickParameter,
            postbackUrl: form.postbackUrl.trim() || null,
            duplicateAllowed: form.duplicateAllowed,
          });
        } catch (networkError: unknown) {
          if (replacementProviderId !== null) {
            await archiveInternalProviderBestEffort(replacementProviderId);
          }
          throw networkError;
        }

        setMessage(`${normalizedName} was updated.`);
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
    const provider = providers.find(
      (candidate) => candidate.id === network.providerId,
    );

    resetFeedback();
    setEditingId(network.id);
    setCloningId(null);
    setForm(
      formFromNetwork(
        network,
        provider?.integration.postbackClickIdToken ?? "",
      ),
    );
    setEditorOpen(true);
    document.querySelector(".catalog-editor-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function cloneNetwork(network: CatalogNetwork): void {
    const suffix = Date.now().toString(36).slice(-5);
    const provider = providers.find(
      (candidate) => candidate.id === network.providerId,
    );

    resetFeedback();
    setEditingId(null);
    setCloningId(network.id);
    setForm({
      ...formFromNetwork(
        network,
        provider?.integration.postbackClickIdToken ?? "",
      ),
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

    async function deleteNetwork(network: CatalogNetwork): Promise<void> {
    const confirmed = window.confirm(
      `Delete ${network.name}? The Network and its linked active Offers will disappear from operational panels, while historical clicks/conversions remain available. Deleted Networks cannot be restored.`,
    );

    if (!confirmed) {
      return;
    }

    resetFeedback();
    try {
      await catalog.deleteNetwork({ accountId: network.id });
      setMessage(
        `${network.name} was deleted. Historical reporting is preserved.`,
      );
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : "The Network could not be deleted.",
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
            ? "Add one Network directly with its name, Click ID parameter, and Click ID token. One secure Postback URL is generated automatically."
            : "Manage Networks directly without a separate software-selection step while preserving lifecycle and Postback controls."
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
        error={
          actionError ??
          providerOperations.error ??
          postbackCreator.error ??
          catalog.error
        }
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
                Copy this secure callback URL into the Network when its
                conversion mapping is ready. The endpoint credential is not
                shown separately.
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
                This Network does not currently provide a separate
                conversion-ID macro, so the secure base callback is shown.
                Click and conversion identifiers are not guessed or merged.
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
          <NetworkForm
            disabled={
              catalog.isMutating ||
              providerOperations.isMutating ||
              postbackCreator.isMutating
            }
            form={form}
            mode={editorMode}
            onCancel={mode === "manage" ? closeEditor : undefined}
            onChange={setForm}
            networkAccountId={editingId}
          domains={domains}
            onSubmit={(event) => void handleSubmit(event)}
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
                setStatus(
                  event.currentTarget.value as CatalogNetworkStatus | "all",
                );

              }}
              value={status}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Paused</option>
              <option value="archived">Deleted</option>
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
                      <td>{network.offerCount}</td>
                      <td>
                        <code>{network.effectiveTrackingParameter}</code>
                      </td>
                      <td>
                        {network.providerIntegrationConfigured
                          ? "Postback ready"
                          : "Conversion mapping pending"}
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
                          {catalog.permissions.canManageCatalog &&
                            network.status !== "archived" && (
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
                                aria-label={`Delete ${network.name}`}
                                onClick={() => void deleteNetwork(network)}
                                title="Delete Network"
                                type="button"
                              >
                                <MaterialIcon name="delete" />
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
