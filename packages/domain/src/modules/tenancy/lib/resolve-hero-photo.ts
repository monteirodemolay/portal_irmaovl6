import type { Tenant } from '../entities/tenant.entity';

export interface HeroPhoto {
  url: string;
  posicao: number;
}

/**
 * Foto de fundo do `PageHero` de uma página, dado o `Tenant`. Cai de volta
 * pro campo legado `comunidadeHeroFotoUrl`/`comunidadeHeroFotoPosicao`
 * quando `pageKey === 'comunidade'` e a Loja ainda não tem nada em
 * `heroPhotos.comunidade` — sem isso, a foto do Templo que já estava
 * configurada em `/irmaos` antes do `PageHero` existir sumiria da tela sem
 * nenhuma migração de dado ter rodado.
 */
export function resolveHeroPhoto(tenant: Tenant, pageKey: string): HeroPhoto | null {
  const configured = tenant.heroPhotos[pageKey];
  if (configured) return configured;

  if (pageKey === 'comunidade' && tenant.comunidadeHeroFotoUrl) {
    return { url: tenant.comunidadeHeroFotoUrl, posicao: tenant.comunidadeHeroFotoPosicao ?? 50 };
  }

  return null;
}
