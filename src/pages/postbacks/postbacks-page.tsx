import { type FormEvent, useMemo, useState } from "react";
import { useAppliedFilters } from "../../features/filters/use-applied-filters";

import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import { useNetworkAccounts } from "../../features/tracking-networks/use-tracking-networks";
import {
  buildProviderPostbackSetup,
  type ProviderPostbackSetup,
} from "../../features/tracking-networks/provider-postback-setup";
import type { NetworkPostbackEndpointStatus } from "../../features/control-plane/control-plane.types";
import { usePostbackEndpoints } from "../../features/control-plane/use-control-plane";
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

export function PostbacksPage() {
  const accounts = useNetworkAccounts();
  const activeAccounts = useMemo(
    () => accounts.accounts.filter((account) => account.status === "active"),
    [accounts.accounts],
  );
  const [networkAccountId, setNetworkAccountId] = useState("");
  const [status, setStatus] = useState<NetworkPostbackEndpointStatus | "all">(
    "all",
  );
  const [generated, setGenerated] = useState<ProviderPostbackSetup | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const draftFilters = useMemo(
    () => ({ status }),
    [status],
  );
  const { appliedFilters, applyFilters } =
    useAppliedFilters(draftFilters);
  const endpoints = usePostbackEndpoints(
    networkAccountId.length === 0 ? null : networkAccountId,
    appliedFilters.status === "all"
      ? undefined
      : appliedFilters.status,
  );


  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerated(null);
    setFeedback(null);
    setActionError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await endpoints.createEndpoint({
        name: String(formData.get("name") ?? ""),
        status: String(formData.get("status") ?? "active") as
          "active" | "paused",
      });
      setGenerated(buildProviderPostbackSetup(result));
      setFeedback(
        `${result.endpoint.name} was created. Copy the endpoint key now.`,
      );
      form.reset();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The postback endpoint could not be created.",
      );
    }
  }

  async function handleUpdate(
    endpointId: string,
    nextStatus: NetworkPostbackEndpointStatus,
  ) {
    setGenerated(null);
    setFeedback(null);
    setActionError(null);

    try {
      await endpoints.updateEndpoint({ endpointId, status: nextStatus });
      setFeedback(`Postback endpoint status changed to ${nextStatus}.`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The postback endpoint could not be updated.",
      );
    }
  }

  async function handleRotate(endpointId: string) {
    if (
      !window.confirm(
        "Rotate this postback key? The previous key will stop working immediately.",
      )
    ) {
      return;
    }

    setGenerated(null);
    setFeedback(null);
    setActionError(null);

    try {
      const result = await endpoints.rotateKey(endpointId);
      setGenerated(buildProviderPostbackSetup(result));
      setFeedback("The endpoint key was rotated. Copy the new value now.");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The endpoint key could not be rotated.",
      );
    }
  }

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(`${label} copied.`);
    } catch {
      setActionError(`The browser could not copy the ${label.toLowerCase()}.`);
    }
  }

  if (!endpoints.permissions.canViewOperations) {
    return (
      <ControlAccessDenied
        message="Postback configuration is limited to Company Admins and Managers."
        title="Postbacks unavailable"
      />
    );
  }

  if (accounts.status === "loading") {
    return <ControlLoading label="network accounts" />;
  }

  return (
    <div className="control-page">
      <ControlModuleHeader
        description={
          <>
            Create provider-specific conversion ingress endpoints for{" "}
            <strong>{endpoints.companyName}</strong>. Endpoint keys are
            displayed once.
          </>
        }
        eyebrow="Conversion Ingress"
        icon="webhook"
        stats={[
          { label: "Accounts", value: activeAccounts.length },
          { label: "Endpoints", value: endpoints.endpoints.length },
          {
            label: "Active",
            value: endpoints.endpoints.filter(
              (endpoint) => endpoint.status === "active",
            ).length,
          },
        ]}
        title="Postback Endpoints"
      />

      <ControlFeedback
        error={actionError ?? endpoints.error ?? accounts.error}
        message={feedback}
      />

      {generated !== null && (
        <div className="control-secret-banner">
          <MaterialIcon name="key" />
          <div>
            <strong>{generated.providerName} postback setup</strong>
            <code>{generated.endpointKey}</code>
            <small>
              Effective click parameter: {generated.effectiveTrackingParameter}
            </small>
            {generated.templateUrl === null ? (
              <small>
                Configure the Provider integration profile to generate a
                provider-ready template.
              </small>
            ) : (
              <code>{generated.templateUrl}</code>
            )}
          </div>
          <button
            className="control-secondary-button"
            onClick={() =>
              void copyValue(generated.baseUrl, "Base postback URL")
            }
            type="button"
          >
            <MaterialIcon name="link" />
            Copy base URL
          </button>
          {generated.templateUrl !== null && (
            <button
              className="control-secondary-button"
              onClick={() =>
                void copyValue(
                  generated.templateUrl ?? "",
                  "Provider postback template",
                )
              }
              type="button"
            >
              <MaterialIcon name="file_copy" />
              Copy provider template
            </button>
          )}
        </div>
      )}

      <div className="control-layout-grid">
        <GlassPanel as="section" className="control-side-card">
          <ControlCardHeading
            description="Select an active account before managing its endpoints."
            eyebrow="Account Scope"
            title="Postback configuration"
          />
          <div className="control-form">
            <label>
              <span>Network account</span>
              <select
                onChange={(event) => {
                  setNetworkAccountId(event.target.value);
                  setGenerated(null);
                }}
                value={networkAccountId}
              >
                <option value="">Select account</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.providerName}
                  </option>
                ))}
              </select>
            </label>
            {endpoints.permissions.canManage && networkAccountId.length > 0 && (
              <form
                className="control-form control-form--nested"
                onSubmit={(event) => void handleCreate(event)}
              >
                <label>
                  <span>Endpoint name</span>
                  <input
                    name="name"
                    placeholder="Primary conversion endpoint"
                    required
                  />
                </label>
                <label>
                  <span>Initial status</span>
                  <select defaultValue="active" name="status">
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </label>
                <button
                  className="primary-gradient-button"
                  disabled={endpoints.isMutating}
                  type="submit"
                >
                  <MaterialIcon name="add_circle" />
                  Create endpoint
                </button>
              </form>
            )}
            <div className="control-info-note">
              <MaterialIcon name="shield_lock" />
              <span>
                Provider credentials are never rendered here. Use the generated
                endpoint key in the provider dashboard.
              </span>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel
          as="section"
          className="control-main-card control-directory-surface"
        >
          <div className="control-directory-actions">
            <RefreshButton
              disabled={endpoints.isMutating || networkAccountId.length === 0}
              onClick={() => void endpoints.refresh()}
            />
          </div>

          <div className="control-filter-bar">
            <div className="control-filter-spacer" />
            <select
              onChange={(event) =>
                setStatus(
                  event.target.value as NetworkPostbackEndpointStatus | "all",
                )
              }
              value={status}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {networkAccountId.length === 0 ? (
            <ControlEmpty
              icon="account_tree"
              message="Choose a network account to view its conversion endpoints."
              title="No account selected"
            />
          ) : endpoints.status === "loading" ? (
            <ControlLoading label="postback endpoints" />
          ) : endpoints.endpoints.length === 0 ? (
            <ControlEmpty
              icon="webhook_off"
              message="Create an endpoint to receive provider conversions."
              title="No postback endpoints"
            />
          ) : (
            <div className="control-record-list">
              {endpoints.endpoints.map((endpoint) => (
                <article className="control-record" key={endpoint.id}>
                  <div className="control-record__summary control-record__summary--static">
                    <span className="control-record-icon">
                      <MaterialIcon name="webhook" />
                    </span>
                    <span>
                      <strong>{endpoint.name}</strong>
                      <small>
                        Key ending {endpoint.endpointKeyLast4} · Updated{" "}
                        {formatDateTime(endpoint.updatedAt)}
                      </small>
                    </span>
                    <ControlStatus status={endpoint.status} />
                  </div>
                  {endpoints.permissions.canManage &&
                    endpoint.status !== "archived" && (
                      <div className="control-action-row">
                        <select
                          disabled={endpoints.isMutating}
                          onChange={(event) =>
                            void handleUpdate(
                              endpoint.id,
                              event.target
                                .value as NetworkPostbackEndpointStatus,
                            )
                          }
                          value={endpoint.status}
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="archived">Archived</option>
                        </select>
                        <button
                          className="control-secondary-button"
                          disabled={endpoints.isMutating}
                          onClick={() => void handleRotate(endpoint.id)}
                          type="button"
                        >
                          <MaterialIcon name="key" />
                          Rotate key
                        </button>
                      </div>
                    )}
                </article>
              ))}
            </div>
          )}
        </GlassPanel>
                <div className="filter-apply-actions">
            <button
              className="primary-gradient-button primary-gradient-button--compact filter-apply-button"
              onClick={applyFilters}
              type="button"
            >
              Apply Filters
            </button>
          </div></div>
    </div>
  );
}
