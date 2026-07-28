import { useLocation } from 'react-router';

import { GlassPanel } from '../../components/ui/glass-panel';
import { MaterialIcon } from '../../components/icons/material-icon';

const pageTitles: Record<string, string> = {
  '/companies': 'Companies',
  '/billing': 'Billing',
  '/tenant-administration': 'Tenant Administration',
  '/tracking-domains': 'Tracking Domains',
  '/network-providers': 'Network Providers',
  '/network-accounts': 'Network Accounts',
  '/offers': 'Offers',
  '/tracking-links': 'Tracking Links',
  '/payouts': 'Payouts',
  '/conversions': 'Conversions',
  '/postbacks': 'Postbacks',
  '/fraud-review': 'Fraud Review',
  '/reports': 'Reports',
  '/operations': 'Operations',
  '/settings': 'Settings',
};

export function ModulePlaceholderPage() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? 'Publisher Tracker';

  return (
    <div className="page-stack">
      <GlassPanel className="module-placeholder">
        <span className="eyebrow-chip"><MaterialIcon name="construction" />Implementation Queue</span>
        <h1>{title}</h1>
        <p>This route is wired and ready. Its exact Stitch screen will be converted in the next module phase.</p>
      </GlassPanel>
    </div>
  );
}
