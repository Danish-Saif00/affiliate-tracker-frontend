import type { NetworkPostbackEndpointSecret } from "../control-plane/control-plane.types";
import { environment } from "../../lib/environment";

export type ProviderPostbackSetup = {
  endpointName: string;
  endpointKey: string;
  providerName: string;
  providerCode: string;
  effectiveTrackingParameter: string;
  baseUrl: string;
  templateUrl: string | null;
  integrationConfigured: boolean;
};

function normalizePostbackOrigin(origin: string): string {
  const normalized = origin.trim().replace(/\/$/u, "");
  if (
    /[\r\n]/u.test(normalized) ||
    !/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/u.test(
      normalized,
    )
  ) {
    throw new Error(
      "The selected Postback domain is invalid.",
    );
  }
  return normalized;
}
function joinApiPath(
  path: string,
  origin = environment.apiOrigin,
): string {
  if (!path.startsWith("/postbacks/") || /[\r\n]/u.test(path)) {
    throw new Error("The API returned an invalid postback setup path.");
  }

  return `${normalizePostbackOrigin(origin)}${path}`;
}

export function buildProviderPostbackSetup(
  secret: NetworkPostbackEndpointSecret,
  publicOrigin?: string,
): ProviderPostbackSetup {
  return {
    endpointName: secret.endpoint.name,
    endpointKey: secret.endpointKey,
    providerName: secret.setup.providerName,
    providerCode: secret.setup.providerCode,
    effectiveTrackingParameter: secret.setup.effectiveTrackingParameter,
    baseUrl: joinApiPath(
      secret.setup.basePath,
      publicOrigin,
    ),
    templateUrl:
      secret.setup.templatePath === null
        ? null
        : joinApiPath(
            secret.setup.templatePath,
            publicOrigin,
          ),
    integrationConfigured: secret.setup.integrationConfigured,
  };
}
