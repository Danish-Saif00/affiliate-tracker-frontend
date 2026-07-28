import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';

import type { CompanyRole, PlatformRole } from '../../features/auth/auth.types';
import { useAuth } from '../../features/auth/use-auth';
import { useCompany } from '../../features/companies/use-company';
import {
  canViewNavigationItem,
  resolveNavigationGroups,
  type NavigationItem,
} from '../../routes/navigation';
import { BrandMark } from '../brand/brand-mark';
import { MaterialIcon } from '../icons/material-icon';

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

function routeMatches(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function CollapsibleNavigationItem({
  item,
  pathname,
  platformRole,
  companyRole,
  membershipStatus,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  platformRole: PlatformRole | null;
  companyRole: CompanyRole | null;
  membershipStatus: string | null;
  onNavigate: () => void;
}) {
  const children =
    item.children?.filter((child) =>
      canViewNavigationItem(
        child.audience,
        platformRole,
        companyRole,
        membershipStatus,
      ),
    ) ?? [];
  const activeChild = children.some((child) => routeMatches(pathname, child.path));
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const expanded = manualExpanded ?? activeChild;

  if (children.length === 0) {
    return (
      <NavLink
        className={({ isActive }) =>
          `navigation-link ${isActive ? 'navigation-link--active' : ''}`
        }
        onClick={onNavigate}
        to={item.path}
      >
        <MaterialIcon name={item.icon} />
        <span>{item.label}</span>
      </NavLink>
    );
  }

  return (
    <div className={`navigation-branch ${expanded ? 'navigation-branch--expanded' : ''}`}>
      <button
        aria-expanded={expanded}
        className={`navigation-link navigation-branch__trigger ${
          activeChild ? 'navigation-link--active' : ''
        }`}
        onClick={() => setManualExpanded((current) => !(current ?? activeChild))}
        type="button"
      >
        <MaterialIcon name={item.icon} />
        <span>{item.label}</span>
        <MaterialIcon className="navigation-branch__chevron" name="expand_more" />
      </button>

      {expanded && (
        <div className="navigation-branch__children">
          {children.map((child) => (
            <NavLink
              className={({ isActive }) =>
                `navigation-link navigation-link--child ${
                  isActive ? 'navigation-link--active' : ''
                }`
              }
              key={child.path}
              onClick={onNavigate}
              to={child.path}
            >
              <MaterialIcon name={child.icon} />
              <span>{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const auth = useAuth();
  const company = useCompany();
  const location = useLocation();
  const platformRole = auth.identity?.authorization.platformRole ?? null;
  const membership = auth.identity?.authorization.companyMembership ?? null;
  const companyRole = membership?.role ?? null;
  const membershipStatus = membership?.status ?? null;
  const platformAdmin = platformRole === 'platform_super_admin';
  const companyAccessRestricted =
    !platformAdmin && company.accessRestriction !== null;
  const visibleGroups = companyAccessRestricted
    ? []
    : resolveNavigationGroups(platformRole, companyRole, membershipStatus)
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            canViewNavigationItem(
              item.audience,
              platformRole,
              companyRole,
              membershipStatus,
            ),
          ),
        }))
        .filter((group) => group.items.length > 0);

  return (
    <>
      <button
        aria-label="Close navigation"
        className={`sidebar-backdrop ${open ? 'sidebar-backdrop--visible' : ''}`}
        onClick={onClose}
        type="button"
      />

      <aside className={`app-sidebar glass-panel ${open ? 'app-sidebar--open' : ''}`}>
        <div className="app-sidebar__brand">
          <BrandMark />
          <button
            aria-label="Close navigation"
            className="icon-button app-sidebar__close"
            onClick={onClose}
            type="button"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <nav className="app-sidebar__navigation" aria-label="Primary navigation">
          {companyAccessRestricted && (
            <div className="navigation-group">
              <span className="navigation-group__label">Access</span>
              <div className="subscription-sidebar-note">
                <MaterialIcon name="lock_clock" />
                <span>Company subscription renewal is required.</span>
              </div>
            </div>
          )}

          {visibleGroups.map((group) => (
            <div className="navigation-group" key={group.label}>
              <span className="navigation-group__label">{group.label}</span>
              <div className="navigation-group__items">
                {group.items.map((item) => (
                  <CollapsibleNavigationItem
                    companyRole={companyRole}
                    item={item}
                    key={item.path}
                    membershipStatus={membershipStatus}
                    onNavigate={onClose}
                    pathname={location.pathname}
                    platformRole={platformRole}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
