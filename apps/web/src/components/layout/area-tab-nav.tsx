import { hasPermission, type AuthContext } from '@vl6/domain';
import { ADMIN_AREA_TABS, type AdminAreaKey } from './area-tabs';
import { TabNav, type TabNavItem } from './tab-nav';

export function getAreaTabs(area: AdminAreaKey, authContext: AuthContext): TabNavItem[] {
  return ADMIN_AREA_TABS[area]
    .filter((tab) => tab.permission === null || hasPermission(authContext, tab.permission))
    .map((tab) => ({ href: tab.href, label: tab.label }));
}

export function AreaTabNav({
  area,
  authContext,
}: {
  area: AdminAreaKey;
  authContext: AuthContext;
}) {
  const items = getAreaTabs(area, authContext);
  if (items.length === 0) {
    return null;
  }
  return <TabNav items={items} />;
}
