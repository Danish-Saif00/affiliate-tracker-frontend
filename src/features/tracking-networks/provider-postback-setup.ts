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

function joinApiPath(path: string): string {
  if (!path.startsWith("/postbacks/") || /[\r\n]/u.test(path)) {
    throw new Error("The API returned an invalid postback setup path.");
  }

  return `${environment.apiOrigin.replace(/\/$/u, "")}${path}`;
}

export function buildProviderPostbackSetup(
  secret: NetworkPostbackEndpointSecret,
): ProviderPostbackSetup {
  return {
    endpointName: secret.endpoint.name,
    endpointKey: secret.endpointKey,
    providerName: secret.setup.providerName,
    providerCode: secret.setup.providerCode,
    effectiveTrackingParameter: secret.setup.effectiveTrackingParameter,
    baseUrl: joinApiPath(secret.setup.basePath),
    templateUrl:
      secret.setup.templatePath === null
        ? null
        : joinApiPath(secret.setup.templatePath),
    integrationConfigured: secret.setup.integrationConfigured,
  };
}
