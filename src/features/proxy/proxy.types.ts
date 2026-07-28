export type ProxyModuleLoadStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'forbidden';
export type CompanyProxyProviderCode =
  | 'ipqualityscore'
  | 'proxycheck';
export type CompanyProxyConfigurationStatus =
  | 'active'
  | 'disabled';
export type CompanyProxyEnforcementMode =
  | 'monitor'
  | 'enforce';
export type CompanyProxyFailureBehavior =
  | 'allow'
  | 'flag'
  | 'block';
export type CompanyProxyTestStatus =
  | 'passed'
  | 'failed';
export type CompanyProxyConfiguration = {
  id: string;
  companyId: string;
  providerCode:
    CompanyProxyProviderCode;
  apiKeyLast4: string;
  hasApiKey: boolean;
  status:
    CompanyProxyConfigurationStatus;
  enforcementMode:
    CompanyProxyEnforcementMode;
  riskThreshold: number;
  requestTimeoutMs: number;
  cacheTtlSeconds: number;
  failureBehavior:
    CompanyProxyFailureBehavior;
  detectProxy: boolean;
  detectVpn: boolean;
  detectTor: boolean;
  bypassOwnerMembershipIds:
    readonly string[];
  apiKeyUpdatedAt: string;
  lastTestedAt: string | null;
  lastTestStatus:
    CompanyProxyTestStatus | null;
  lastTestErrorCode: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};
export type UpdateCompanyProxyConfigurationInput = {
  providerCode:
    CompanyProxyProviderCode;
  apiKey?: string;
  status:
    CompanyProxyConfigurationStatus;
  enforcementMode:
    CompanyProxyEnforcementMode;
  riskThreshold: number;
  requestTimeoutMs: number;
  cacheTtlSeconds: number;
  failureBehavior:
    CompanyProxyFailureBehavior;
  detectProxy: boolean;
  detectVpn: boolean;
  detectTor: boolean;
  bypassOwnerMembershipIds:
    readonly string[];
};
