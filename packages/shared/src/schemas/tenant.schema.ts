import { z } from 'zod';

const DOMAIN_REGEX =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
export const domainSchema = z.string().regex(DOMAIN_REGEX);

export const requestDomainVerificationSchema = z.object({ domain: domainSchema });
export type RequestDomainVerificationInput = z.infer<typeof requestDomainVerificationSchema>;

export const addressSchema = z.object({
  logradouro: z.string().min(1),
  numero: z.string().min(1),
  bairro: z.string().min(1),
  cidade: z.string().min(1),
  estado: z.string().min(2).max(2),
  pais: z.string().min(1),
  cep: z.string().min(1),
});

export const createTenantSchema = z.object({
  nome: z.string().min(3).max(150),
  numero: z.string().min(1).max(10),
  potencia: z.string().min(1).max(150),
  dominio: domainSchema.nullable(),
  subdominio: z
    .string()
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i)
    .min(2)
    .max(63),
  endereco: addressSchema.nullable(),
  telefone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  site: z.string().url().nullable(),
  email: z.string().email(),
  modulosHabilitados: z.array(z.string()).default([]),
});
export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const tenantBrandingSchema = z.object({
  corPrimaria: z.string().regex(/^#[0-9a-f]{6}$/i),
  corSecundaria: z.string().regex(/^#[0-9a-f]{6}$/i),
  corDestaque: z.string().regex(/^#[0-9a-f]{6}$/i),
  corFundo: z.string().regex(/^#[0-9a-f]{6}$/i),
  tipografia: z.string().min(1),
  raioBorda: z.number().int().min(0).max(32),
  modoEscuroHabilitado: z.boolean(),
  brasaoUrl: z.string().url().nullable(),
  logotipoUrl: z.string().url().nullable(),
  faviconUrl: z.string().url().nullable(),
});
export type TenantBrandingInput = z.infer<typeof tenantBrandingSchema>;

/** Seed padrão aplicado a todo novo tenant — ver docs/architecture/09-design-system.md §9.2. */
export const DEFAULT_TENANT_BRANDING: TenantBrandingInput = {
  corPrimaria: '#061C36',
  corSecundaria: '#041223',
  corDestaque: '#D4AF37',
  corFundo: '#F5F7FA',
  tipografia: 'system-ui',
  raioBorda: 16,
  modoEscuroHabilitado: true,
  brasaoUrl: null,
  logotipoUrl: null,
  faviconUrl: null,
};
