import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "../../features/auth/use-auth";
import { useCompany } from "../../features/companies/use-company";
import {
  persistTheme,
  readStoredTheme,
  type ThemeMode,
} from "../../features/theme/theme-storage";
import { SubscriptionAccessPage } from "../../pages/billing/subscription-access-page";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const PLATFORM_ROUTE_PREFIXES = [
  "/dashboard",
  "/companies",
  "/company-admins",
  "/domain-approvals",
  "/billing",
  "/account",
] as const;

const COMPANY_ADMIN_ROUTE_PREFIXES = [
  "/dashboard",
  "/domains",
  "/networks",
  "/network-providers",
  "/offers",
  "/tracking-links",
  "/managers",
  "/reports/networks",
  "/reports/offers",
  "/reports/managers",
  "/logs/clicks",
  "/logs/conversions",
  "/logs/sessions",
  "/logs/user-agents",
  "/postbacks",
  "/settings",
  "/account",
  "/billing",
] as const;

const FILTER_CONTROL_SELECTOR = [
  ".final-filter-grid",
  ".control-filter-bar",
  ".tracking-filter-bar",
  ".manager-filter-row",
  ".catalog-toolbar",
  ".tenant-filter-grid",
  ".custom-domain-toolbar",
].join(", ");

function isPlatformRouteAllowed(pathname: string): boolean {
  return PLATFORM_ROUTE_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isCompanyAdminRouteAllowed(pathname: string): boolean {
  return COMPANY_ADMIN_ROUTE_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function AppShell() {
  const auth = useAuth();
  const company = useCompany();
  const location = useLocation();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [filterOpenPath, setFilterOpenPath] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme());
  const platformAdmin =
    auth.identity?.authorization.platformRole === "platform_super_admin";
  const companyRole =
    auth.identity?.authorization.companyMembership?.status === "active"
      ? auth.identity.authorization.companyMembership.role
      : null;
  const companyAccessRestricted =
    !platformAdmin && company.accessRestriction !== null;
  const showRestriction =
    companyAccessRestricted && location.pathname !== "/account";
  const filterOpen = filterOpenPath === location.pathname;

  useEffect(() => {
    const content = document.querySelector(".app-content");

    if (content === null) {
      return;
    }

    let frame = 0;
    let activeHost: HTMLElement | null = null;

    function resolveFilterHost(): void {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nextHost = showRestriction
          ? null
          : content?.querySelector<HTMLElement>(FILTER_CONTROL_SELECTOR) ?? null;

        if (activeHost !== nextHost) {
          activeHost?.removeAttribute("data-responsive-filter-host");
          activeHost = nextHost;
          activeHost?.setAttribute("data-responsive-filter-host", "true");
        }

        setFilterAvailable(nextHost !== null);
      });
    }

    resolveFilterHost();

    const observer = new MutationObserver(resolveFilterHost);

    observer.observe(content, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      activeHost?.removeAttribute("data-responsive-filter-host");
    };
  }, [location.pathname, showRestriction]);

  useEffect(() => {
    const root = document.documentElement;
    const mobileQuery = window.matchMedia("(max-width: 900px)");

    root.dataset.filterRoute = filterAvailable ? "true" : "false";
    root.dataset.filterDrawerOpen = filterOpen ? "true" : "false";

    if (filterOpen && mobileQuery.matches) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.removeProperty("overflow");
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setFilterOpenPath(null);
      }
    }

    function handleViewportChange(event: MediaQueryListEvent): void {
      if (!event.matches) {
        setFilterOpenPath(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    mobileQuery.addEventListener("change", handleViewportChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      mobileQuery.removeEventListener("change", handleViewportChange);
      document.body.style.removeProperty("overflow");
      delete root.dataset.filterRoute;
      delete root.dataset.filterDrawerOpen;
    };
  }, [filterAvailable, filterOpen]);

  function toggleTheme(): void {
    const nextTheme: ThemeMode = theme === "light" ? "dark" : "light";

    persistTheme(nextTheme);
    setTheme(nextTheme);
  }

  if (platformAdmin && !isPlatformRouteAllowed(location.pathname)) {
    return <Navigate replace to="/dashboard" />;
  }

  if (
    !platformAdmin &&
    companyRole === "company_admin" &&
    !isCompanyAdminRouteAllowed(location.pathname)
  ) {
    return <Navigate replace to="/dashboard" />;
  }

  return (
    <div className="app-shell">
      <div className="ambient-orb ambient-orb--violet" />
      <div className="ambient-orb ambient-orb--blue" />

      <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />
      <Topbar
        filterAvailable={filterAvailable}
        onOpenFilters={() => setFilterOpenPath(location.pathname)}
        onOpenNavigation={() => setNavigationOpen(true)}
        onToggleTheme={toggleTheme}
        theme={theme}
      />

      {filterOpen && (
        <>
          <button
            aria-label="Close filters"
            className="responsive-filter-backdrop"
            onClick={() => setFilterOpenPath(null)}
            type="button"
          />
          <div className="responsive-filter-drawer-header" role="presentation">
            <div>
              <span>Page controls</span>
              <strong>Search & filters</strong>
            </div>
            <button
              aria-label="Close filters"
              className="icon-button responsive-filter-close"
              onClick={() => setFilterOpenPath(null)}
              type="button"
            >
              ×
            </button>
          </div>
        </>
      )}

            {filterAvailable && (
        <button
          aria-label="Open filters"
          className="responsive-filter-fab"
          onClick={() => setFilterOpenPath(location.pathname)}
          title="Filters"
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="22"
            viewBox="0 0 24 24"
            width="22"
          >
            <path
              d="M4 5h16l-6.2 7.1v5.2l-3.6 1.7v-6.9L4 5Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
            />
          </svg>
        </button>
      )}      <main className="app-content">
        {showRestriction ? <SubscriptionAccessPage /> : <Outlet />}
      </main>
    </div>
  );
}
