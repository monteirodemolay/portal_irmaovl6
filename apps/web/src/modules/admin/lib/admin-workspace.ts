import { hasPermission, type AuthContext, type Role } from '@vl6/domain';
import type { PermissionKey } from '@vl6/shared';
import { isAdminPathAllowed } from '@/lib/auth/is-admin-tier';
import {
  ADMIN_ADVANCED_SECTIONS,
  ADMIN_AREAS,
  ADMIN_TOOLS,
  ADMIN_UPLOAD_DESTINATIONS,
  type AdminAdvancedSection,
  type AdminTool,
  type AdminUploadDestination,
  type AdminWorkspaceArea,
} from './admin-tool-directory';

export interface AdminLink {
  href: string;
  label: string;
  description?: string;
  exact?: boolean;
}

/** Lista vazia de permissões = qualquer sessão administrativa. */
export function canAccessAdminHref(
  href: string,
  permissions: PermissionKey[],
  ctx: AuthContext,
  role: Role | null,
): boolean {
  if (!isAdminPathAllowed(role, href)) return false;
  return permissions.length === 0 || permissions.some((p) => hasPermission(ctx, p));
}

export function canUseAdminTool(tool: AdminTool, ctx: AuthContext, role: Role | null): boolean {
  return canAccessAdminHref(tool.href, tool.permissions, ctx, role);
}

function toLink(tool: AdminTool): AdminLink {
  return { href: tool.href, label: tool.label, description: tool.description, exact: tool.exact };
}

export interface AdminAreaNavigation {
  title: string;
  description: string;
  /** Abas de rotina, na ordem do registro. */
  tabs: AdminLink[];
  /** Rotina que não cabe em aba: aparece em "Mais nesta área". */
  more: AdminLink[];
  /** Quantas ferramentas desta área estão em Administração avançada. */
  advancedCount: number;
}

export function buildAreaNavigation(
  area: AdminWorkspaceArea,
  ctx: AuthContext,
  role: Role | null,
): AdminAreaNavigation {
  const tools = ADMIN_TOOLS.filter(
    (tool) => tool.area === area && canUseAdminTool(tool, ctx, role),
  );
  return {
    title: ADMIN_AREAS[area].title,
    description: ADMIN_AREAS[area].description,
    tabs: tools.filter((tool) => tool.tab).map(toLink),
    more: tools.filter((tool) => !tool.tab && tool.tier === 'rotina').map(toLink),
    advancedCount: tools.filter((tool) => tool.tier === 'avancado' && !tool.tab).length,
  };
}

export interface AdminAdvancedGroup {
  section: AdminAdvancedSection;
  items: (AdminLink & { areaTitle: string })[];
}

export function buildAdvancedGroups(ctx: AuthContext, role: Role | null): AdminAdvancedGroup[] {
  return ADMIN_ADVANCED_SECTIONS.map((section) => ({
    section,
    items: ADMIN_TOOLS.filter(
      (tool) =>
        tool.tier === 'avancado' && tool.section === section && canUseAdminTool(tool, ctx, role),
    ).map((tool) => ({ ...toLink(tool), areaTitle: ADMIN_AREAS[tool.area].title })),
  })).filter((group) => group.items.length > 0);
}

export function visibleUploadDestinations(
  ctx: AuthContext,
  role: Role | null,
): AdminUploadDestination[] {
  return ADMIN_UPLOAD_DESTINATIONS.filter((destination) =>
    canAccessAdminHref(destination.href, destination.permissions, ctx, role),
  );
}
