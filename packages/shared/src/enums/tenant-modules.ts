// Módulos de negócio opcionais que uma Loja pode habilitar no onboarding —
// ver docs/architecture/01-visao-geral.md §1.5 (Bounded Contexts). Tenancy,
// IdentityAccess, Audit e PublicSite ficam de fora: são sempre ativos,
// nunca uma escolha do onboarding.
export const TENANT_MODULE_KEYS = [
  'membership',
  'governance',
  'library',
  'documentManagement',
  'agenda',
  'content',
  'gallery',
  'notification',
] as const;
export type TenantModuleKey = (typeof TENANT_MODULE_KEYS)[number];

export const TENANT_MODULE_LABELS: Record<TenantModuleKey, string> = {
  membership: 'Cadastro de Irmãos',
  governance: 'Gestões / Diretoria / Comissões',
  library: 'Biblioteca',
  documentManagement: 'Arquivos',
  agenda: 'Agenda / Eventos',
  content: 'Avisos e Notícias',
  gallery: 'Galeria',
  notification: 'Notificações internas',
};
