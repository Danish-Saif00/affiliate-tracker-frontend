import { useState } from "react";

import { MaterialIcon } from "../../components/icons/material-icon";
import type { NetworkPostbackEndpointStatus } from "../../features/control-plane/control-plane.types";
import { usePostbackEndpoints } from "../../features/control-plane/use-control-plane";
import { environment } from "../../lib/environment";
import {
  buildProviderPostbackSetup,
  type ProviderPostbackSetup,
} from "../../features/tracking-networks/provider-postback-setup";
import {
  ControlEmpty,
  ControlFeedback,
  ControlLoading,
  ControlStatus,
  RefreshButton,
} from "../control-plane/control-plane-ui";
import { formatDateTime } from "../control-plane/control-plane-formatters";

function isLoopbackOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);

    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function NetworkPostbackManager({
  networkAccountId,
  networkName,
}: {
  networkAccountId: string;
  networkName: string;
}) {
  const endpoints = usePostbackEndpoints(networkAccountId);
  const endpointName = `${networkName.trim() || "Network"} Conversions`;
  const [generated, setGenerated] = useState<ProviderPostbackSetup | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const localOrigin = isLoopbackOrigin(environment.apiOrigin);
  const hasCurrentEndpoint = endpoints.endpoints.some(
    (endpoint) => endpoint.status !== "archived",
  );

  function resetFeedback(): void {
    setMessage(null);
    setActionError(null);
  }

  async function copyValue(value: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied.`);
      setActionError(null);
    } catch {
      setActionError(`The browser could not copy the ${label.toLowerCase()}.`);
    }
  }

  async function createEndpoint(): Promise<void> {
    if (hasCurrentEndpoint) {
      setActionError("This Network already has a current Postback endpoint.");
      return;
    }

    resetFeedback();

    try {
      const result = await endpoints.createEndpoint({
        name: endpointName.trim() || `${networkName} Conversions`,
        status: "active",
      });

      setGenerated(buildProviderPostbackSetup(result));
      setMessage(
        `${result.endpoint.name} was created. Copy the Postback URL now.`,
      );
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The secure postback endpoint could not be created.",
      );
    }
  }

  async function changeStatus(
    endpointId: string,
    status: NetworkPostbackEndpointStatus,
  ): Promise<void> {
    resetFeedback();
    setGenerated(null);

    try {
      const updated = await endpoints.updateEndpoint({ endpointId, status });
      setMessage(`${updated.name} is now ${status}.`);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The secure postback endpoint status could not be updated.",
      );
    }
  }

  async function rotateKey(endpointId: string): Promise<void> {
    if (
      !window.confirm(
        "Rotate this endpoint key? The previous provider postback URL will stop working immediately.",
      )
    ) {
      return;
    }

    resetFeedback();

    try {
      const result = await endpoints.rotateKey(endpointId);
      setGenerated(buildProviderPostbackSetup(result));
      setMessage(
        `${result.endpoint.name} was rotated. Replace the old provider URL now.`,
      );
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The secure postback endpoint key could not be rotated.",
      );
    }
  }

  return (
    <section className="network-postback-manager">
      <div className="network-postback-manager__heading">
        <div>
          <span>Secure endpoint management</span>
          <strong>Provider conversion callbacks</strong>
          <small>
            Create, activate, pause, archive, or rotate the endpoint connected
            to this Network.
          </small>
        </div>
        <RefreshButton
          disabled={endpoints.status === "loading" || endpoints.isMutating}
          onClick={() => void endpoints.refresh()}
        />
      </div>

      <ControlFeedback
        error={actionError ?? endpoints.error}
        message={message}
      />

      {localOrigin && (
        <div className="network-postback-manager__warning">
          <MaterialIcon name="warning" />
          <div>
            <strong>Local callback URL detected</strong>
            <span>
              URLs generated from {environment.apiOrigin} work only on this
              computer. Deploy the runtime and configure VITE_API_ORIGIN with
              its public HTTPS origin before adding the URL in the Provider
              dashboard.
            </span>
          </div>
        </div>
      )}

      {generated !== null && (
        <div className="network-postback-manager__secret">
          <div className="network-postback-manager__secret-heading">
            <MaterialIcon name="webhook" />
            <div>
              <span>Postback URL ready</span>
              <strong>{generated.endpointName}</strong>
              <small>
                Use the complete provider-ready URL. The endpoint credential is
                not displayed as a separate field.
              </small>
            </div>
            <button
              className="control-secondary-button"
              onClick={() => setGenerated(null)}
              type="button"
            >
              <MaterialIcon name="close" />
              Dismiss
            </button>
          </div>

          <div className="network-postback-manager__template">
            <span>Postback URL</span>
            <code>{generated.templateUrl ?? generated.baseUrl}</code>

            {generated.templateUrl === null && (
              <small>
                The software mapping does not currently provide a complete
                macro template. Verify its click token before production use.
              </small>
            )}
          </div>

          <div className="network-postback-manager__actions">
            <button
              className="primary-gradient-button primary-gradient-button--compact"
              onClick={() =>
                void copyValue(
                  generated.templateUrl ?? generated.baseUrl,
                  "Postback URL",
                )
              }
              type="button"
            >
              <MaterialIcon name="content_copy" />
              Copy Postback URL
            </button>
          </div>
        </div>
      )}
      {endpoints.status === "loading" ? (
        <ControlLoading label="Secure postback endpoints" />
      ) : endpoints.endpoints.length === 0 ? (
        <div className="network-postback-manager__empty">
          <ControlEmpty
            icon="webhook"
            message="Create the first secure conversion endpoint for this Network."
            title="No endpoint configured"
          />
          <div className="network-postback-manager__create">
            <button
              className="primary-gradient-button primary-gradient-button--compact"
              disabled={endpoints.isMutating}
              onClick={() => void createEndpoint()}
              type="button"
            >
              <MaterialIcon name="add_link" />
              Create Postback URL
            </button>
          </div>
        </div>
      ) : (
        <div className="network-postback-manager__list">
          {endpoints.endpoints.map((endpoint) => (
            <article
              className="network-postback-manager__endpoint"
              key={endpoint.id}
            >
              <div className="network-postback-manager__endpoint-main">
                <div>
                  <strong>{endpoint.name}</strong>
                  <span>Secure conversion callback</span>
                </div>
                <ControlStatus status={endpoint.status} />
              </div>

              <div className="network-postback-manager__endpoint-meta">
                <span>Updated {formatDateTime(endpoint.updatedAt)}</span>
                <span>Created {formatDateTime(endpoint.createdAt)}</span>
              </div>

              <div className="network-postback-manager__actions">
                {endpoint.status !== "archived" && (
                  <>
                    <button
                      className="control-secondary-button"
                      disabled={endpoints.isMutating}
                      onClick={() => void rotateKey(endpoint.id)}
                      type="button"
                    >
                      <MaterialIcon name="refresh" />
                      Regenerate URL
                    </button>
                    <button
                      className="control-secondary-button"
                      disabled={endpoints.isMutating}
                      onClick={() =>
                        void changeStatus(
                          endpoint.id,
                          endpoint.status === "active" ? "paused" : "active",
                        )
                      }
                      type="button"
                    >
                      <MaterialIcon
                        name={
                          endpoint.status === "active"
                            ? "pause_circle"
                            : "play_circle"
                        }
                      />
                      {endpoint.status === "active" ? "Pause" : "Activate"}
                    </button>
                    <button
                      className="control-danger-button"
                      disabled={endpoints.isMutating}
                      onClick={() => void changeStatus(endpoint.id, "archived")}
                      type="button"
                    >
                      <MaterialIcon name="archive" />
                      Archive
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}

          {!hasCurrentEndpoint && (
            <div className="network-postback-manager__create network-postback-manager__create--secondary">
              <button
                className="control-secondary-button"
                disabled={endpoints.isMutating}
                onClick={() => void createEndpoint()}
                type="button"
              >
                <MaterialIcon name="add_link" />
                Create Postback URL
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
