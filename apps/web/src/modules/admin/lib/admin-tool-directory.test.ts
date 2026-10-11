import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ADMIN_AREAS,
  ADMIN_CHILD_ROUTES,
  ADMIN_HUB_ROUTES,
  ADMIN_REDIRECT_ROUTES,
  ADMIN_TOOLS,
  ADMIN_UPLOAD_DESTINATIONS,
} from './admin-tool-directory';

const APP_DIR = fileURLToPath(new URL('../../../app', import.meta.url));
const ADMIN_DIR = join(APP_DIR, 'admin');

function listPages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listPages(path);
    return name === 'page.tsx' ? [path] : [];
  });
}

function routeOf(pagePath: string): string {
  const rel = relative(APP_DIR, pagePath).split(sep).slice(0, -1).join('/');
  return `/${rel}`;
}

function pageFile(route: string): string {
  return join(APP_DIR, ...route.split('/').filter(Boolean), 'page.tsx');
}

/** Rotas sem segmentos dinâmicos (`[id]`), paralelos (`@drawer`) ou de grupo. */
const staticRoutes = listPages(ADMIN_DIR)
  .map(routeOf)
  .filter((route) => !/[[@(]/.test(route));

const registered = new Set(ADMIN_TOOLS.map((tool) => tool.href));
const children = new Map(ADMIN_CHILD_ROUTES.map((child) => [child.href, child.parent]));

describe('Central de Administração: nenhuma tela sem entrada', () => {
  it('toda tela estática de /admin tem um ponto de entrada conhecido', () => {
    const orphans = staticRoutes.filter(
      (route) =>
        !registered.has(route) &&
        !children.has(route) &&
        !ADMIN_REDIRECT_ROUTES.includes(route) &&
        !ADMIN_HUB_ROUTES.includes(route),
    );
    expect(orphans).toEqual([]);
  });

  it('toda ferramenta registrada aponta para uma tela que existe', () => {
    const catchAllKnowledge = existsSync(join(ADMIN_DIR, 'conhecimento', '[[...path]]', 'page.tsx'));
    const missing = ADMIN_TOOLS.map((tool) => tool.href).filter(
      (href) =>
        !existsSync(pageFile(href)) && !(catchAllKnowledge && href.startsWith('/admin/conhecimento')),
    );
    expect(missing).toEqual([]);
  });

  it('não registra a mesma tela duas vezes', () => {
    const hrefs = ADMIN_TOOLS.map((tool) => tool.href);
    expect(hrefs.length).toBe(new Set(hrefs).size);
  });

  it('cada tela de criação é aberta a partir da sua tela-mãe', () => {
    for (const { href, parent } of ADMIN_CHILD_ROUTES) {
      expect(existsSync(pageFile(href)), href).toBe(true);
      const parentSource = readFileSync(pageFile(parent), 'utf8');
      const lastSegment = href.split('/').pop()!;
      expect(parentSource.includes(href) || parentSource.includes(`/${lastSegment}`), href).toBe(true);
    }
  });

  it('endereços antigos e raízes de área continuam redirecionando', () => {
    for (const route of ADMIN_REDIRECT_ROUTES) {
      const source = readFileSync(pageFile(route), 'utf8');
      expect(/redirect/i.test(source), route).toBe(true);
    }
  });

  it('ferramentas avançadas sempre têm seção; ferramentas de rotina pertencem a uma área existente', () => {
    for (const tool of ADMIN_TOOLS) {
      expect(ADMIN_AREAS[tool.area], tool.href).toBeDefined();
      if (tool.tier === 'avancado') expect(tool.section, tool.href).toBeDefined();
    }
  });

  it('cada área com casca própria tem ao menos uma aba', () => {
    for (const area of ['acontecimentos', 'pessoas', 'acervo', 'sistema'] as const) {
      expect(ADMIN_TOOLS.some((tool) => tool.area === area && tool.tab)).toBe(true);
    }
  });

  it('destinos de envio apontam para telas existentes', () => {
    for (const destination of ADMIN_UPLOAD_DESTINATIONS) {
      expect(existsSync(pageFile(destination.href)), destination.href).toBe(true);
    }
  });

  it('as telas de importação já utilizadas não voltam ao menu', () => {
    const hrefs = [...registered];
    expect(hrefs.some((href) => /importar/.test(href))).toBe(false);
    expect(staticRoutes.some((route) => /importar/.test(route))).toBe(false);
  });
});
