import { Fragment, type FormEvent, useMemo, useState } from "react";
import { useAppliedFilters } from "../../features/filters/use-applied-filters";

import { MaterialIcon } from "../../components/icons/material-icon";
import { GlassPanel } from "../../components/ui/glass-panel";
import { useCatalogOperations } from "../../features/catalog/use-catalog";
import type {
  TrackingDomain,
  TrackingDomainProvisioningStatus,
  TrackingDomainStatus,
} from "../../features/tracking-networks/tracking-networks.types";
import { useTrackingDomains } from "../../features/tracking-networks/use-tracking-networks";
import {
  CatalogPagination,
  CatalogToolbar,
  RowActions,
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

const PROVISIONING_LABELS: Readonly<
  Record<TrackingDomainProvisioningStatus, string>
> = {
  manual: "Legacy manual",
  ownership_pending: "Ownership pending",
  ownership_verified: "Ownership verified",
  provider_pending: "Provider provisioning",
  dns_pending: "DNS pending",
  tls_pending: "TLS pending",
  active: "Active",
  failed: "Action required",
  disconnected: "Disconnected",
};

export type TrackingDomainsPageMode = "add" | "manage" | "approvals";

function readProvisioningHint(domain: TrackingDomain): string {
  switch (domain.provisioningStatus) {
    case "manual":
      return "This existing domain uses the legacy manual infrastructure workflow.";
    case "ownership_pending":
      return "Publish the TXT ownership record, then run verification.";
    case "ownership_verified":
    case "provider_pending":
      return "Ownership is verified. Provider registration is ready to continue.";
    case "dns_pending":
      return "Publish the CNAME record and remove conflicting A, AAAA, or redirect records.";
    case "tls_pending":
      return "DNS is ready. Provider verification and HTTPS certificate readiness are pending.";
    case "active":
      return "The hostname is verified and ready for generated tracking links.";
    case "failed":
      return (
        domain.lastErrorMessage ??
        "Provisioning needs another verification attempt."
      );
    case "disconnected":
      return "The provider domain is disconnected and this hostname cannot serve tracking links.";
  }
}

function DomainReadiness({ domain }: { domain: TrackingDomain }) {
  return (
    <div className="managed-domain-readiness" aria-label="Domain readiness">
      <span
        className={
          domain.ownershipVerifiedAt === null ? "is-pending" : "is-ready"
        }
        title="Ownership verification"
      >
        <MaterialIcon name="verified_user" />
        TXT
      </span>
      <span
        className={domain.dnsVerifiedAt === null ? "is-pending" : "is-ready"}
        title="DNS verification"
      >
        <MaterialIcon name="dns" />
        DNS
      </span>
      <span
        className={domain.tlsVerifiedAt === null ? "is-pending" : "is-ready"}
        title="TLS verification"
      >
        <MaterialIcon name="lock" />
        TLS
      </span>
    </div>
  );
}

export function TrackingDomainsPage({
  mode,
}: {
  mode: TrackingDomainsPageMode;
}) {
  const approvalMode = mode === "approvals";
  const domains = useTrackingDomains();
  const catalog = useCatalogOperations({ enabled: !approvalMode });
  const [hostname, setHostname] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TrackingDomainStatus | "all">("all");
  const [createdAfter, setCreatedAfter] = useState("");
  const [page, setPage] = useState(1);
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const offerCountByDomain = useMemo(
    () =>
      new Map(
        catalog.snapshot?.domains.map((domain) => [
          domain.id,
          domain.offerCount,
        ]) ?? [],
      ),
    [catalog.snapshot],
  );

  const pendingCount = domains.domains.filter(
    (domain) => domain.status === "pending_verification",
  ).length;
  const activeCount = domains.domains.filter(
    (domain) => domain.status === "active",
  ).length;
  const failedCount = domains.domains.filter(
    (domain) => domain.provisioningStatus === "failed",
  ).length;
  const domainLoadFailed = domains.status === "error";

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
    const needle = appliedFilters.search.trim().toLowerCase();
    const threshold =
      appliedFilters.createdAfter.length === 0
        ? null
        : new Date(`${appliedFilters.createdAfter}T00:00:00`);

    return domains.domains.filter((domain) => {
      const matchesDate =
        threshold === null || new Date(domain.createdAt) >= threshold;

      return (
        (needle.length === 0 ||
          domain.hostname.toLowerCase().includes(needle)) &&
        (appliedFilters.status === "all" ||
          domain.status === appliedFilters.status) &&
        matchesDate
      );
    });
  }, [appliedFilters, domains.domains]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function resetFeedback() {
    setMessage(null);
    setActionError(null);
  }

  async function refreshRelatedData() {
    if (approvalMode) {
      await domains.refresh();
      return;
    }

    await Promise.all([domains.refresh(), catalog.refresh()]);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();

    try {
      const created = await domains.createDomain({ hostname });
      setHostname("");
      setExpandedDomainId(created.id);
      setMessage(
        `${created.hostname} was added. Publish the TXT ownership record shown below, then run Verify & Continue.`,
      );
      await refreshRelatedData();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The domain could not be added.",
      );
    }
  }

  async function handlePrimary(domainId: string) {
    resetFeedback();

    try {
      await domains.updateDomain({ domainId, isPrimary: true });
      setMessage("Primary tracking domain was updated.");
      await refreshRelatedData();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The primary domain could not be updated.",
      );
    }
  }

  async function handleStatus(
    domainId: string,
    nextStatus: "active" | "suspended" | "archived",
  ) {
    resetFeedback();

    try {
      if (domains.permissions.platformAdmin) {
        await domains.updatePlatformStatus({ domainId, status: nextStatus });
      } else {
        await domains.updateDomain({ domainId, status: nextStatus });
      }

      setMessage(
        `Domain status changed to ${nextStatus.replaceAll("_", " ")}.`,
      );
      await refreshRelatedData();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The domain status could not be updated.",
      );
    }
  }

  async function handleAdopt(domain: TrackingDomain) {
    const confirmed = window.confirm(
      `Move ${domain.hostname} into dashboard-managed provider provisioning? The domain will be suspended until ownership, DNS, and TLS verification pass.`,
    );

    if (!confirmed) {
      return;
    }

    resetFeedback();

    try {
      const updated = await domains.adoptDomain({ domainId: domain.id });
      setExpandedDomainId(updated.id);
      setMessage(
        `${updated.hostname} is now dashboard managed. Publish its TXT ownership record, then run Verify & Continue.`,
      );
      await refreshRelatedData();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The legacy domain could not be adopted.",
      );
    }
  }

  async function handleReconcile(domain: TrackingDomain) {
    resetFeedback();

    try {
      const updated = await domains.reconcileDomain({ domainId: domain.id });
      setExpandedDomainId(updated.id);
      setMessage(
        updated.provisioningStatus === "active"
          ? `${updated.hostname} is active and ready for generated tracking links.`
          : `${updated.hostname}: ${readProvisioningHint(updated)}`,
      );
      await refreshRelatedData();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The domain verification workflow could not continue.",
      );
    }
  }

  async function handleDisconnect(domain: TrackingDomain) {
    const confirmed = window.confirm(
      `Disconnect ${domain.hostname} from the infrastructure provider? This is blocked while tracking links still use the domain.`,
    );

    if (!confirmed) {
      return;
    }

    resetFeedback();

    try {
      await domains.disconnectDomain({ domainId: domain.id });
      setMessage(`${domain.hostname} was disconnected and archived.`);
      await refreshRelatedData();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The domain could not be disconnected.",
      );
    }
  }

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied.`);
      setActionError(null);
    } catch {
      setActionError(`${label} could not be copied.`);
    }
  }

  if (approvalMode && !domains.permissions.platformAdmin) {
    return (
      <ControlAccessDenied
        title="Domain approvals unavailable"
        message="Platform Super Admin access is required."
      />
    );
  }

  if (domains.status === "forbidden") {
    return (
      <ControlAccessDenied
        title="Domain access unavailable"
        message="Platform Super Admin, Manager, or Company Administrator access is required."
      />
    );
  }

  if (domains.status === "loading" || (!approvalMode && catalog.isLoading)) {
    return <ControlLoading label="tracking domains" />;
  }

  const showCreatePanel =
    domains.permissions.canManage && (mode === "add" || approvalMode);

  return (
    <div className="page-stack catalog-page managed-domains-page">
      <ControlModuleHeader
        description={
          approvalMode
            ? "Add and provision client tracking hostnames from ownership verification through DNS, TLS, and activation."
            : "Manage branded client hostnames and choose verified domains for offers and generated tracking links."
        }
        eyebrow={approvalMode ? "Platform Governance" : "Domain Setup"}
        icon={approvalMode ? "domain_verification" : "dns"}
        stats={
          approvalMode
            ? [
                {
                  label: "Pending",
                  value: domainLoadFailed ? "—" : pendingCount,
                },
                {
                  label: "Active",
                  value: domainLoadFailed ? "—" : activeCount,
                },
                {
                  label: "Action required",
                  value: domainLoadFailed ? "—" : failedCount,
                },
              ]
            : [
                { label: "Total", value: domains.domains.length },
                { label: "Active", value: activeCount },
                {
                  label: "Primary",
                  value:
                    domains.domains.find((domain) => domain.isPrimary)
                      ?.hostname ?? "Not set",
                },
              ]
        }
        title={
          mode === "add"
            ? "Add Domain"
            : approvalMode
              ? "Managed Domains"
              : "Manage Domains"
        }
      />

      <ControlFeedback
        error={
          actionError ?? domains.error ?? (approvalMode ? null : catalog.error)
        }
        message={message}
      />

      {showCreatePanel && (
        <div
          className={
            approvalMode
              ? "catalog-two-column managed-domains-onboarding"
              : "managed-domains-onboarding"
          }
        >
          <GlassPanel as="section" className="control-card">
            <ControlCardHeading
              eyebrow="Add Managed Domain"
              title="Register a client tracking hostname"
              description="Use a dedicated subdomain such as track.client-domain.com. Root domains are not accepted by this workflow."
            />
            <form
              className="catalog-form"
              onSubmit={(event) => void handleCreate(event)}
            >
              <label>
                <span>Full tracking hostname</span>
                <input
                  autoCapitalize="none"
                  disabled={domains.isMutating}
                  onChange={(event) => setHostname(event.currentTarget.value)}
                  placeholder="track.client-domain.com"
                  required
                  spellCheck={false}
                  value={hostname}
                />
              </label>
              <button
                className="primary-gradient-button primary-gradient-button--compact"
                disabled={domains.isMutating}
                type="submit"
              >
                <MaterialIcon name="add" />
                Add managed domain
              </button>
            </form>
          </GlassPanel>

          {approvalMode && (
            <GlassPanel
              as="section"
              className="control-card dns-instructions-card"
            >
              <ControlCardHeading
                eyebrow="One Dashboard Workflow"
                title="Ownership to active tracking"
              />
              <ol>
                <li>Add the client tracking hostname in Publisher Tracker.</li>
                <li>
                  Publish the unique TXT ownership record shown for that domain.
                </li>
                <li>
                  Run Verify &amp; Continue to register the hostname with the
                  provider.
                </li>
                <li>
                  Publish the exact CNAME target shown in the domain details.
                </li>
                <li>
                  Run verification again until DNS, TLS, and domain status are
                  Active.
                </li>
              </ol>
              <div className="catalog-security-note">
                <MaterialIcon name="security" />
                <span>
                  Provider credentials remain server-side. The client only
                  receives DNS records that belong in their own DNS provider.
                </span>
              </div>
            </GlassPanel>
          )}
        </div>
      )}

      {(mode === "manage" || approvalMode) && (
        <GlassPanel
          as="section"
          className={`control-card catalog-table-panel${
            approvalMode ? "" : " control-directory-surface"
          }`}
        >
          {approvalMode ? (
            <ControlCardHeading
              action={
                <RefreshButton
                  disabled={domains.isMutating}
                  onClick={() => void refreshRelatedData()}
                />
              }
              eyebrow={
                approvalMode ? "Provisioning Directory" : "Domain Directory"
              }
              title={
                approvalMode ? "Manage client tracking domains" : "Manage domains"
              }
              description={
                approvalMode
                  ? "Expand a domain for exact TXT/CNAME records, current provider state, last error, and lifecycle actions."
                  : "Only active verified domains can become primary or be selected by Offer configuration."
              }
            />
          ) : (
            <div className="control-directory-actions">
              <RefreshButton
                disabled={domains.isMutating}
                onClick={() => void refreshRelatedData()}
              />
            </div>
          )}

          {!domainLoadFailed && (
            <CatalogToolbar
              onSearch={(value) => {
                setSearch(value);

              }}
              search={search}
            >
              <select
                onChange={(event) => {
                  setStatus(
                    event.currentTarget.value as TrackingDomainStatus | "all",
                  );

                }}
                value={status}
              >
                <option value="all">All statuses</option>
                <option value="pending_verification">
                  Pending verification
                </option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
              </select>
              <input
                aria-label="Created after"
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
          )}

          {domainLoadFailed ? (
            <ControlEmpty
              icon="error"
              title="Managed domains could not be loaded"
              message="The API request failed. Restore domain-governance access, then use Refresh."
            />
          ) : pageRows.length === 0 ? (
            <ControlEmpty
              icon="dns"
              title="No domains found"
              message="Add a managed hostname or change the filters."
            />
          ) : (
            <div className="responsive-table catalog-table-wrap managed-domains-table">
              <table>
                <thead>
                  <tr>
                    <th>Hostname</th>
                    {!approvalMode && <th>Offers</th>}
                    <th>Provisioning</th>
                    <th>Readiness</th>
                    <th>Primary</th>
                    <th>Added</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((domain) => {
                    const expanded = expandedDomainId === domain.id;
                    const canReconcile =
                      domains.permissions.platformAdmin &&
                      domain.provider === "render" &&
                      domain.provisioningStatus !== "disconnected" &&
                      domain.status !== "archived";

                    return (
                      <Fragment key={domain.id}>
                        <tr>
                          <td>
                            <strong>{domain.hostname}</strong>
                            <small>
                              {domain.provider === "render"
                                ? "Dashboard managed"
                                : "Legacy manual"}
                            </small>
                          </td>
                          {!approvalMode && (
                            <td>{offerCountByDomain.get(domain.id) ?? 0}</td>
                          )}
                          <td>
                            <ControlStatus status={domain.provisioningStatus} />
                            <small>
                              {PROVISIONING_LABELS[domain.provisioningStatus]}
                            </small>
                          </td>
                          <td>
                            {domain.provider === "render" ? (
                              <DomainReadiness domain={domain} />
                            ) : (
                              <ControlStatus status={domain.status} />
                            )}
                          </td>
                          <td>{domain.isPrimary ? "Yes" : "No"}</td>
                          <td>{formatDateTime(domain.createdAt)}</td>
                          <td>
                            <RowActions>
                              <button
                                aria-expanded={expanded}
                                aria-label={`${expanded ? "Hide" : "Show"} ${domain.hostname} settings`}
                                onClick={() =>
                                  setExpandedDomainId(
                                    expanded ? null : domain.id,
                                  )
                                }
                                title={
                                  expanded ? "Hide settings" : "Show settings"
                                }
                                type="button"
                              >
                                <MaterialIcon
                                  name={expanded ? "expand_less" : "settings"}
                                />
                              </button>
                              {domains.permissions.platformAdmin &&
                                domain.provider === "manual" &&
                                domain.status !== "archived" && (
                                  <button
                                    aria-label={`Manage ${domain.hostname} automatically`}
                                    disabled={domains.isMutating}
                                    onClick={() => void handleAdopt(domain)}
                                    title="Move to dashboard management"
                                    type="button"
                                  >
                                    <MaterialIcon name="cloud_sync" />
                                  </button>
                                )}
                              {canReconcile && (
                                <button
                                  aria-label={`Verify and continue ${domain.hostname}`}
                                  disabled={domains.isMutating}
                                  onClick={() => void handleReconcile(domain)}
                                  title="Verify & continue"
                                  type="button"
                                >
                                  <MaterialIcon name="sync" />
                                </button>
                              )}
                              {domains.permissions.canManage &&
                                domain.status === "active" &&
                                !domain.isPrimary && (
                                  <button
                                    aria-label={`Make ${domain.hostname} primary`}
                                    disabled={domains.isMutating}
                                    onClick={() =>
                                      void handlePrimary(domain.id)
                                    }
                                    title="Make primary"
                                    type="button"
                                  >
                                    <MaterialIcon name="star" />
                                  </button>
                                )}
                              {domains.permissions.platformAdmin &&
                                domain.status === "active" && (
                                  <button
                                    aria-label={`Suspend ${domain.hostname}`}
                                    disabled={domains.isMutating}
                                    onClick={() =>
                                      void handleStatus(domain.id, "suspended")
                                    }
                                    title="Suspend"
                                    type="button"
                                  >
                                    <MaterialIcon name="pause" />
                                  </button>
                                )}
                              {domains.permissions.platformAdmin &&
                                domain.provider === "render" &&
                                domain.provisioningStatus !== "disconnected" &&
                                !domain.isPrimary && (
                                  <button
                                    aria-label={`Disconnect ${domain.hostname}`}
                                    disabled={domains.isMutating}
                                    onClick={() =>
                                      void handleDisconnect(domain)
                                    }
                                    title="Disconnect unused domain"
                                    type="button"
                                  >
                                    <MaterialIcon name="link_off" />
                                  </button>
                                )}
                            </RowActions>
                          </td>
                        </tr>

                        {expanded && (
                          <tr className="managed-domain-details-row">
                            <td colSpan={approvalMode ? 6 : 7}>
                              <div className="managed-domain-details">
                                <div className="managed-domain-details__header">
                                  <div>
                                    <strong>
                                      {
                                        PROVISIONING_LABELS[
                                          domain.provisioningStatus
                                        ]
                                      }
                                    </strong>
                                    <p>{readProvisioningHint(domain)}</p>
                                  </div>
                                  <ControlStatus status={domain.status} />
                                </div>

                                {domain.lastErrorMessage !== null && (
                                  <div
                                    className="managed-domain-error"
                                    role="alert"
                                  >
                                    <MaterialIcon name="warning" />
                                    <div>
                                      <strong>
                                        {domain.lastErrorCode ??
                                          "Provisioning error"}
                                      </strong>
                                      <span>{domain.lastErrorMessage}</span>
                                    </div>
                                  </div>
                                )}

                                <div className="managed-domain-record-grid">
                                  <section>
                                    <h4>1. Ownership TXT record</h4>
                                    <div className="managed-domain-record">
                                      <span>Name / Host</span>
                                      <code>{domain.ownershipRecordName}</code>
                                      <button
                                        onClick={() =>
                                          void copyValue(
                                            domain.ownershipRecordName,
                                            "TXT record name",
                                          )
                                        }
                                        title="Copy TXT name"
                                        type="button"
                                      >
                                        <MaterialIcon name="content_copy" />
                                      </button>
                                    </div>
                                    <div className="managed-domain-record">
                                      <span>Value</span>
                                      <code>{domain.ownershipRecordValue}</code>
                                      <button
                                        onClick={() =>
                                          void copyValue(
                                            domain.ownershipRecordValue,
                                            "TXT record value",
                                          )
                                        }
                                        title="Copy TXT value"
                                        type="button"
                                      >
                                        <MaterialIcon name="content_copy" />
                                      </button>
                                    </div>
                                  </section>

                                  <section>
                                    <h4>2. Tracking CNAME record</h4>
                                    {domain.dnsTarget === null ? (
                                      <p className="managed-domain-muted">
                                        The CNAME target becomes available for
                                        dashboard-managed domains after API
                                        automation is configured.
                                      </p>
                                    ) : (
                                      <>
                                        <div className="managed-domain-record">
                                          <span>Type</span>
                                          <code>
                                            {domain.dnsRecordType ?? "CNAME"}
                                          </code>
                                        </div>
                                        <div className="managed-domain-record">
                                          <span>Name / Host</span>
                                          <code>
                                            {domain.dnsRecordName ??
                                              domain.hostname}
                                          </code>
                                          <button
                                            onClick={() =>
                                              void copyValue(
                                                domain.dnsRecordName ??
                                                  domain.hostname,
                                                "CNAME record name",
                                              )
                                            }
                                            title="Copy CNAME name"
                                            type="button"
                                          >
                                            <MaterialIcon name="content_copy" />
                                          </button>
                                        </div>
                                        <div className="managed-domain-record">
                                          <span>Target</span>
                                          <code>{domain.dnsTarget}</code>
                                          <button
                                            onClick={() =>
                                              void copyValue(
                                                domain.dnsTarget ?? "",
                                                "CNAME target",
                                              )
                                            }
                                            title="Copy CNAME target"
                                            type="button"
                                          >
                                            <MaterialIcon name="content_copy" />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </section>
                                </div>

                                <dl className="managed-domain-metadata">
                                  <div>
                                    <dt>Provider</dt>
                                    <dd>{domain.provider}</dd>
                                  </div>
                                  <div>
                                    <dt>Provider verification</dt>
                                    <dd>
                                      {domain.providerVerificationStatus.replaceAll(
                                        "_",
                                        " ",
                                      )}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Last checked</dt>
                                    <dd>
                                      {domain.lastCheckedAt === null
                                        ? "Not checked"
                                        : formatDateTime(domain.lastCheckedAt)}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Active since</dt>
                                    <dd>
                                      {domain.tlsVerifiedAt === null
                                        ? "Not active"
                                        : formatDateTime(domain.tlsVerifiedAt)}
                                    </dd>
                                  </div>
                                </dl>

                                <div className="managed-domain-detail-actions">
                                  {domains.permissions.platformAdmin &&
                                    domain.provider === "manual" &&
                                    domain.status !== "archived" && (
                                      <button
                                        className="primary-gradient-button primary-gradient-button--compact"
                                        disabled={domains.isMutating}
                                        onClick={() => void handleAdopt(domain)}
                                        type="button"
                                      >
                                        <MaterialIcon name="cloud_sync" />
                                        Manage automatically
                                      </button>
                                    )}
                                  {canReconcile && (
                                    <button
                                      className="primary-gradient-button primary-gradient-button--compact"
                                      disabled={domains.isMutating}
                                      onClick={() =>
                                        void handleReconcile(domain)
                                      }
                                      type="button"
                                    >
                                      <MaterialIcon name="sync" />
                                      Verify &amp; Continue
                                    </button>
                                  )}
                                  {domain.status === "active" && (
                                    <a
                                      className="managed-domain-test-link"
                                      href={`https://${domain.hostname}/health`}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      <MaterialIcon name="open_in_new" />
                                      Test HTTPS health
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!domainLoadFailed && (
            <CatalogPagination
              onPage={setPage}
              page={safePage}
              pageCount={pageCount}
            />
          )}
        </GlassPanel>
      )}
    </div>
  );
}
