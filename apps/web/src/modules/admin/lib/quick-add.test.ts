import { describe, expect, it } from 'vitest';
import type { AuthContext, Role } from '@vl6/domain';
import { buildQuickAdd } from './quick-add';

const ctx = (permissions: string[]) =>
  ({ tenantId: 't', uid: 'u', permissions }) as unknown as AuthContext;
const admin = { chave: 'admin', sistemico: true, permissoes: [] } as unknown as Role;
const librarian = { chave: 'bibliotecario', sistemico: true, permissoes: [] } as unknown as Role;

describe('buildQuickAdd', () => {
  it('oferece só o que o perfil pode criar', () => {
    const keys = buildQuickAdd(ctx(['event:create', 'news:create']), admin).map((o) => o.key);
    expect(keys).toEqual(['acontecimento', 'noticia']);
  });

  it('administrador completo vê as quatro opções, na ordem do dia a dia', () => {
    const all = ctx(['event:create', 'announcement:create', 'news:create', 'archiveItem:create']);
    expect(buildQuickAdd(all, admin).map((o) => o.key)).toEqual([
      'acontecimento',
      'aviso',
      'noticia',
      'arquivos',
    ]);
  });

  it('manage de um recurso vale como criar', () => {
    expect(buildQuickAdd(ctx(['announcement:manage']), admin).map((o) => o.key)).toEqual(['aviso']);
  });

  it('papel restrito não ganha atalho fora do seu território', () => {
    const keys = buildQuickAdd(ctx(['event:create', 'libraryItem:create']), librarian).map(
      (o) => o.key,
    );
    expect(keys).toEqual(['arquivos']);
  });

  it('sem permissão nenhuma, nada é oferecido', () => {
    expect(buildQuickAdd(ctx([]), admin)).toEqual([]);
  });

  it('cada atalho aponta para uma tela existente', () => {
    const all = ctx(['event:create', 'announcement:create', 'news:create', 'file:create']);
    for (const option of buildQuickAdd(all, admin)) expect(option.href).toMatch(/^\/admin\//);
  });
});
