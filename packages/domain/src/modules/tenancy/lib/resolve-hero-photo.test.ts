import { describe, expect, it } from 'vitest';
import type { Tenant } from '../entities/tenant.entity';
import { resolveHeroPhoto } from './resolve-hero-photo';

function buildTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 't1',
    tenantId: 't1',
    nome: 'Loja Maçônica Verdadeira Luz nº 06',
    numero: '6',
    potencia: 'GLEG',
    dominio: null,
    subdominio: 'vl6',
    endereco: null,
    telefone: null,
    whatsapp: null,
    site: null,
    email: 'contato@vl6.org.br',
    modulosHabilitados: [],
    comunidadeHeroFotoUrl: null,
    comunidadeHeroFotoPosicao: null,
    heroPhotos: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('resolveHeroPhoto', () => {
  it('retorna null quando a página não tem foto configurada', () => {
    expect(resolveHeroPhoto(buildTenant(), 'dashboard')).toBeNull();
  });

  it('retorna a foto configurada em heroPhotos[pageKey]', () => {
    const tenant = buildTenant({
      heroPhotos: { dashboard: { url: 'https://exemplo.com/foto.jpg', posicao: 30 } },
    });
    expect(resolveHeroPhoto(tenant, 'dashboard')).toEqual({
      url: 'https://exemplo.com/foto.jpg',
      posicao: 30,
    });
  });

  it('cai pro campo legado comunidadeHeroFotoUrl quando pageKey é comunidade e heroPhotos.comunidade está vazio', () => {
    const tenant = buildTenant({
      comunidadeHeroFotoUrl: 'https://exemplo.com/templo.jpg',
      comunidadeHeroFotoPosicao: 70,
    });
    expect(resolveHeroPhoto(tenant, 'comunidade')).toEqual({
      url: 'https://exemplo.com/templo.jpg',
      posicao: 70,
    });
  });

  it('não crasha quando o documento da Loja não tem heroPhotos (Tenant cadastrado antes deste campo existir)', () => {
    // Reproduz o bug de produção: documentos do Firestore anteriores a este
    // campo não têm a chave `heroPhotos` (undefined, não `{}`).
    const tenant = { ...buildTenant(), heroPhotos: undefined } as unknown as Tenant;
    expect(resolveHeroPhoto(tenant, 'dashboard')).toBeNull();
    expect(resolveHeroPhoto(tenant, 'paramaconicas')).toBeNull();
  });
});
