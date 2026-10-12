import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ADMIN_TOOLS } from './admin-tool-directory';
import {
  PORTAL_NOT_ADMIN_FED,
  PORTAL_SURFACES,
  resolveSurfaceCounts,
  surfaceStatus,
} from './portal-surfaces';

const APP_DIR = fileURLToPath(new URL('../../../app', import.meta.url));
const MEMBER_DIR = join(APP_DIR, '(member)');

const memberSections = readdirSync(MEMBER_DIR).filter((name) =>
  statSync(join(MEMBER_DIR, name)).isDirectory(),
);

describe('Alinhamento Portal × Administração', () => {
  it('toda seção do Portal tem uma tela de alimentação ou uma justificativa', () => {
    const covered = new Set(
      PORTAL_SURFACES.map((surface) => surface.publicHref.split('/')[1]).filter(Boolean),
    );
    covered.add('dashboard');
    const uncovered = memberSections.filter(
      (section) => !covered.has(section) && !(section in PORTAL_NOT_ADMIN_FED),
    );
    expect(uncovered).toEqual([]);
  });

  it('não justifica como "sem Administração" uma seção que já está mapeada', () => {
    const covered = new Set(PORTAL_SURFACES.map((surface) => surface.publicHref.split('/')[1]));
    const contradictory = Object.keys(PORTAL_NOT_ADMIN_FED).filter((key) => covered.has(key));
    expect(contradictory).toEqual([]);
  });

  it('as justificativas apontam para pastas que existem', () => {
    const stale = Object.keys(PORTAL_NOT_ADMIN_FED).filter(
      (key) => !memberSections.includes(key),
    );
    expect(stale).toEqual([]);
  });

  it('toda tela de alimentação está no registro da Administração', () => {
    const registered = new Set(ADMIN_TOOLS.map((tool) => tool.href));
    const missing = PORTAL_SURFACES.filter((surface) => !registered.has(surface.feedHref)).map(
      (surface) => `${surface.key} → ${surface.feedHref}`,
    );
    expect(missing).toEqual([]);
  });

  it('toda rota pública mapeada existe', () => {
    const missing = PORTAL_SURFACES.map((surface) => surface.publicHref).filter((href) => {
      const segments = href.split('/').filter(Boolean);
      return (
        !existsSync(join(MEMBER_DIR, ...segments, 'page.tsx')) &&
        !existsSync(join(MEMBER_DIR, ...segments, '[[...path]]', 'page.tsx'))
      );
    });
    expect(missing).toEqual([]);
  });

  it('chaves e rotas públicas não se repetem', () => {
    const keys = PORTAL_SURFACES.map((surface) => surface.key);
    const hrefs = PORTAL_SURFACES.map((surface) => surface.publicHref);
    expect(keys.length).toBe(new Set(keys).size);
    expect(hrefs.length).toBe(new Set(hrefs).size);
  });
});

describe('Contagens do mapa', () => {
  const metrics = new Map<string, number | null>([
    ['news', 12],
    ['drafts', 3],
    ['archive', 100],
    ['archivePublished', 90],
    ['broken', null],
  ]);
  const surface = (key: string) => PORTAL_SURFACES.find((item) => item.key === key)!;

  it('lê visível e oculto direto das métricas', () => {
    expect(resolveSurfaceCounts(surface('noticias'), metrics)).toEqual({ visible: 12, hidden: 3 });
  });

  it('deriva o oculto por diferença quando só há total e publicado', () => {
    expect(resolveSurfaceCounts(surface('acervo'), metrics)).toEqual({ visible: 90, hidden: 10 });
  });

  it('não inventa zero quando a consulta falhou', () => {
    const counts = resolveSurfaceCounts(surface('acervo'), new Map([['archive', null]]));
    expect(counts).toEqual({ visible: null, hidden: null });
  });

  it('descreve o estado por texto', () => {
    expect(surfaceStatus(surface('noticias'), { visible: 12, hidden: 3 }, true).label).toBe(
      '3 aguardando publicação',
    );
    expect(surfaceStatus(surface('noticias'), { visible: 12, hidden: 0 }, true).label).toBe(
      'Em dia',
    );
    expect(surfaceStatus(surface('noticias'), { visible: 12, hidden: 0 }, false).label).toBe(
      'Sem acesso para alimentar',
    );
    expect(surfaceStatus(surface('linha-do-tempo'), { visible: null, hidden: null }, true).label).toBe(
      'Automático',
    );
    expect(surfaceStatus(surface('honra'), { visible: null, hidden: null }, true).label).toBe(
      'Lacuna conhecida',
    );
  });
});
