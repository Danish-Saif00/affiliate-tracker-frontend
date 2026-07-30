import { useState } from "react";

import { MaterialIcon } from "../../components/icons/material-icon";
import type {
  NetworkPostbackEndpointSecret,
  NetworkPostbackEndpointStatus,
} from "../../features/control-plane/control-plane.types";
import { usePostbackEndpoints } from "../../features/control-plane/use-control-plane";
import { environment } from "../../lib/environment";
import {
  ControlEmpty,
  ControlFeedback,
  ControlLoading,
  ControlStatus,
  RefreshButton,
} from "../control-plane/control-plane-ui";
import { formatDateTime } from "../control-plane/control-plane-formatters";

type GeneratedEndpointSetup = {
  endpointName: string;
  endpointKey: string;
  baseUrl: string;
  templateUrl: string;
};

function buildEndpointSetup(
  secret: NetworkPostbackEndpointSecret,
): GeneratedEndpointSetup {
  const baseUrl = `${environment.apiOrigin}/postbacks/${encodeURIComponent(
    secret.endpointKey,
  )}`;
  const templateUrl =
    `${baseUrl}?click_id={CLICK_ID}` +
    "&conversion_id={CONVERSION_ID}" +
    "&idempotency_key={CONVERSION_ID}" +
    "&status=approved";

  return {
    endpointName: secret.endpoint.name,
    endpointKey: secret.endpointKey,
    baseUrl,
    templateUrl,
  };
}

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
  const [endpointName, setEndpointName] = useState(
    `${networkName.trim() || "Network"} Conversions`,
  );
  const [generated, setGenerated] = useState<GeneratedEndpointSetup | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const localOrigin = isLoopbackOrigin(environment.apiOrigin);

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
    resetFeedback();

    try {
      const result = await endpoints.createEndpoint({
        name: endpointName.trim() || `${networkName} Conversions`,
        status: "active",
      });

      setGenerated(buildEndpointSetup(result));
      setMessage(
        `${result.endpoint.name} was created. Copy the new endpoint key now.`,
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
      setGenerated(buildEndpointSetup(result));
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
              its public HTTPS origin before adding the URL in Affizer.
            </span>
          </div>
        </div>
      )}

      {generated !== null && (
        <div className="network-postback-manager__secret">
          <div className="network-postback-manager__secret-heading">
            <MaterialIcon name="key" />
            <div>
              <span>One-time endpoint key</span>
              <strong>{generated.endpointName}</strong>
              <small>
                Copy this now. The full key is not returned again unless you
                rotate it.
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

          <code>{generated.endpointKey}</code>

          <div className="network-postback-manager__template">
            <span>Affizer postback template</span>
            <code>{generated.templateUrl}</code>
            <small>
              Replace {"{CLICK_ID}"} with Affizer Sub1 and both
              {"{CONVERSION_ID}"} values with Affizer Conversion ID or
              Transaction ID.
            </small>
          </div>

          <div className="network-postback-manager__actions">
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
            <button
              className="primary-gradient-button primary-gradient-button--compact"
              onClick={() =>
                void copyValue(generated.templateUrl, "Affizer template")
              }
              type="button"
            >
              <MaterialIcon name="content_copy" />
              Copy Affizer template
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
            <label>
              <span>Endpoint name</span>
              <input
                disabled={endpoints.isMutating}
                maxLength={160}
                onChange={(event) => setEndpointName(event.currentTarget.value)}
                placeholder={`${networkName} Conversions`}
                value={endpointName}
              />
            </label>
            <button
              className="primary-gradient-button primary-gradient-button--compact"
              disabled={endpoints.isMutating}
              onClick={() => void createEndpoint()}
              type="button"
            >
              <MaterialIcon name="add_link" />
              Create Endpoint
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
                  <span>
                    Key ending: <code>{endpoint.endpointKeyLast4}</code>
                  </span>
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
                      <MaterialIcon name="key" />
                      Rotate Key
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

          <div className="network-postback-manager__create network-postback-manager__create--secondary">
            <label>
              <span>Additional endpoint name</span>
              <input
                disabled={endpoints.isMutating}
                maxLength={160}
                onChange={(event) => setEndpointName(event.currentTarget.value)}
                placeholder={`${networkName} Conversions`}
                value={endpointName}
              />
            </label>
            <button
              className="control-secondary-button"
              disabled={endpoints.isMutating}
              onClick={() => void createEndpoint()}
              type="button"
            >
              <MaterialIcon name="add_link" />
              Add Endpoint
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
