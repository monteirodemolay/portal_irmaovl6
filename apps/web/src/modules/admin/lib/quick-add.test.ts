import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AuthContext, Role } from '@vl6/domain';
import { buildQuickAdd } from './quick-add';
const ctx = (permissions: string[]) => ({ tenantId: 't', uid: 'u', permissions }) as unknown as AuthContext;
const admin = { chave: 'admin', sistemico: true, permissoes: [] } as unknown as Role;
const librarian = { chave: 'bibliotecario', sistemico: true, permissoes: [] } as unknown as Role;
const keys = (permissions: string[], role = admin) => buildQuickAdd(ctx(permissions), role).map((o) => o.key);
describe('buildQuickAdd', () => {
  it('exige leitura e criação para evento; notícia pode completar evento existente', () => {
    expect(keys(['event:create', 'news:create'])).toEqual([]);
    expect(keys(['event:read', 'news:create'])).toEqual([]);
    expect(keys(['event:read', 'news:create', 'news:read'])).toEqual(['noticia']);
    expect(keys(['event:read', 'event:create'])).toEqual(['acontecimento']);
  });
  it('administrador completo vê as quatro opções', () => {
    expect(keys(['event:manage', 'announcement:create', 'news:create', 'news:read', 'archiveItem:create'])).toEqual(['acontecimento', 'aviso', 'noticia', 'arquivos']);
  });
  it('manage implica criação e leitura do recurso', () => {
    expect(keys(['event:manage', 'news:manage'])).toEqual(['acontecimento', 'noticia']);
    expect(keys(['announcement:manage'])).toEqual(['aviso']);
  });
  it('preserva aviso avulso sem leitura da Agenda', () => {
    expect(keys(['announcement:create'])).toEqual(['aviso']);
  });
  it('bibliotecário não ganha acesso a comunicação', () => {
    expect(keys(['event:manage', 'news:create', 'announcement:create', 'libraryItem:create'], librarian)).toEqual(['arquivos']);
  });
  it('papel personalizado segue as permissões do destino', () => {
    const custom = { chave: 'editor', sistemico: false, permissoes: ['news:create', 'news:read', 'event:read'] } as unknown as Role;
    expect(keys(['news:create', 'news:read', 'event:read'], custom)).toEqual(['noticia']);
    expect(keys([])).toEqual([]);
  });
  it('destinos existem e comunicação abre seleção, sem criar outro evento', () => {
    const options = buildQuickAdd(ctx(['event:manage', 'announcement:create', 'news:create', 'news:read', 'file:create']), admin);
    expect(options.find((o) => o.key === 'noticia')?.href).toBe('/admin/publicacoes/preparar?conteudo=noticia');
    expect(options.find((o) => o.key === 'aviso')?.href).toBe('/admin/publicacoes/preparar?conteudo=aviso');
    for (const option of options) expect(existsSync(resolve(process.cwd(), 'src/app', (option.href.split('?')[0] ?? '').slice(1), 'page.tsx'))).toBe(true);
  });
});
