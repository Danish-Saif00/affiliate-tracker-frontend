import { useMemo } from 'react';
import { Link } from 'react-router';

import { MaterialIcon } from '../../components/icons/material-icon';
import { GlassPanel } from '../../components/ui/glass-panel';
import { useBilling } from '../../features/control-plane/use-control-plane';
import { useCompany } from '../../features/companies/use-company';
import { useAccountProfile } from '../../features/final-operations/use-final-operations';
import { useTenantAdministration } from '../../features/tenant-administration/use-tenant-administration';
import type { DirectoryFilters } from '../../features/tenant-administration/tenant-administration.types';
import { ControlStatus } from '../control-plane/control-plane-ui';
import { formatLabel } from '../control-plane/control-plane-formatters';

export function SuperAdminDashboard() {
  const company = useCompany();
  const filters = useMemo<DirectoryFilters>(
    () => ({
      search: '',
      role: 'company_admin',
      membershipStatus: '',
      userStatus: '',
    }),
    [],
  );
  const tenant = useTenantAdministration(filters);
  const billing = useBilling();
  const account = useAccountProfile();
  const activeCompanies = company.companies.filter(
    (item) => item.status === 'active',
  ).length;
  const subscription = billing.snapshot?.subscription ?? null;
  const cards = [
    {
      label: 'Companies',
      value: company.companies.length.toString(),
      detail: `${activeCompanies} active`,
      icon: 'business',
      path: '/companies',
    },
    {
      label: 'Company Admins',
      value:
        company.activeCompany === null
          ? 'Select company'
          : tenant.directory.items.length.toString(),
      detail:
        company.activeCompany === null
          ? 'Choose a company context'
          : company.activeCompany.name,
      icon: 'admin_panel_settings',
      path: '/company-admins',
    },
    {
      label: 'Subscription',
      value:
        subscription === null ? 'Unassigned' : formatLabel(subscription.status),
      detail:
        billing.snapshot?.access.allowed === true
          ? 'Company access enabled'
          : 'Company access restricted',
      icon: 'payments',
      path: '/billing',
    },
    {
      label: 'My Profile',
      value: account.profile?.displayName ?? 'Platform Super Admin',
      detail: account.profile?.email ?? 'Manage profile and password',
      icon: 'manage_accounts',
      path: '/account',
    },
  ] as const;

  return (
    <div className="page-stack super-admin-dashboard">
      <GlassPanel as="section" className="dashboard-command-bar super-admin-command-bar">
        <div>
          <span className="eyebrow-chip">
            <MaterialIcon name="shield_person" />
            Platform Control
          </span>
          <h1>Super Admin Dashboard</h1>
          <p>
            Manage companies, Company Admin accounts, subscriptions, and your
            personal profile.
          </p>
        </div>
        <ControlStatus status="active" />
      </GlassPanel>

      <section
        aria-label="Super Admin modules"
        className="super-admin-module-grid"
      >
        {cards.map((card) => (
          <Link className="super-admin-module-link" key={card.path} to={card.path}>
            <GlassPanel as="article" className="super-admin-module-card">
              <span className="super-admin-module-card__icon">
                <MaterialIcon name={card.icon} />
              </span>
              <div>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.detail}</small>
              </div>
              <MaterialIcon name="arrow_forward" />
            </GlassPanel>
          </Link>
        ))}
      </section>

      <GlassPanel as="section" className="super-admin-scope-card">
        <MaterialIcon name="verified_user" />
        <div>
          <h2>Restricted platform scope</h2>
          <p>
            This account can create companies, manage only Company Admin
            accounts, control subscriptions, and update its own profile. Catalog,
            tracking, reporting, and publisher operations are not available to the
            Platform Super Admin.
          </p>
        </div>
      </GlassPanel>
    </div>
  );
}
