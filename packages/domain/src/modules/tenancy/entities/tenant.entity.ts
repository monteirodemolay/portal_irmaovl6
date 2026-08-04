import type { BaseEntity } from '../../../shared/base-entity';

export interface Address {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  cep: string;
}

/**
 * Representa uma Loja instalada na plataforma. `id === tenantId` sempre —
 * ver docs/architecture/03-modelo-dados.md.
 */
export interface Tenant extends BaseEntity {
  nome: string;
  numero: string;
  potencia: string;
  dominio: string | null;
  subdominio: string;
  endereco: Address | null;
  telefone: string | null;
  whatsapp: string | null;
  site: string | null;
  email: string;
  modulosHabilitados: string[];
}
