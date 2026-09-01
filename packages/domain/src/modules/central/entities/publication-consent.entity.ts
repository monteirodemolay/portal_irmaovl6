import type {
  CentralBlockKey,
  CentralContactVisibility,
  CentralExternalLinksVisibility,
} from './publication-settings.entity';

export type ConsentAction = 'grant' | 'revoke';

/**
 * De onde veio este consentimento. `self_service` é o próprio titular
 * ativando/desativando algo no "Meu Espaço" (ver `UpdatePublicationSettingsUseCase`
 * / `WithdrawFromDirectoryUseCase`) — o ato de publicar já É o consentimento,
 * não existe um passo de "registrar" separado. `assisted_admin` é a
 * Administração preenchendo/publicando em nome de um Irmão (Fase 2,
 * cadastro assistido) — aí sim existe um passo explícito de registrar como o
 * aceite foi confirmado (`confirmationChannel`/`note`), porque quem clicou
 * não foi o titular.
 */
export type PublicationConsentSource = 'self_service' | 'assisted_admin';

/**
 * Como a Administração confirmou que o titular realmente autorizou, no
 * fluxo assistido — só faz sentido quando `source === 'assisted_admin'`.
 * `null` no `source === 'self_service'` (o próprio clique já é a prova).
 */
export type ConsentConfirmationChannel =
  'presencial' | 'whatsapp' | 'telefone' | 'email' | 'formulario_impresso';

/**
 * Registro append-only de consentimento — mesma natureza de `AuditLog`
 * (imutável, sem `update`/`delete`, sem soft delete): nunca sobrescreve um
 * aceite anterior, cada mudança de publicação gera um novo registro. É o
 * log jurídico de POR QUE algo está publicado (qual aceite autorizou);
 * `PublicationSettings` é o estado ATUAL (o que está publicado agora).
 * `blocksAuthorized`/campos são exatamente o que o titular selecionou
 * naquele aceite — nunca "autorizo tudo" (docs/architecture, Central VL6).
 *
 * `source`/`recordedBy`/`confirmationChannel`/`note` chegaram na Fase 2
 * (cadastro assistido) — registros gravados antes disso não têm esses
 * campos no Firestore; a camada de leitura (`FirestorePublicationConsentRepository`)
 * aplica defaults seguros (`source: 'self_service'`, `confirmationChannel: null`,
 * `note: null`) pra registros legados, nunca fabricando um aceite retroativo
 * que não existiu.
 */
export interface PublicationConsent {
  readonly id: string;
  readonly tenantId: string;
  readonly memberId: string;
  readonly termoVersao: string;
  readonly acceptedAt: Date;
  readonly action: ConsentAction;
  readonly blocksAuthorized: CentralBlockKey[];
  readonly contactsAuthorized: Array<keyof CentralContactVisibility>;
  readonly externalLinksAuthorized: Array<keyof CentralExternalLinksVisibility>;
  /** Nunca vem de input do client como texto livre — sempre derivado de quem/como a chamada foi feita (ver os Use Cases que gravam isto). */
  readonly source: PublicationConsentSource;
  /** uid de quem registrou este aceite — o titular (self_service) ou o Administrador que confirmou (assisted_admin). */
  readonly recordedBy: string;
  /** Só preenchido quando `source === 'assisted_admin'`. */
  readonly confirmationChannel: ConsentConfirmationChannel | null;
  /** Observação livre da Administração sobre como o aceite foi confirmado — só relevante em `assisted_admin`. */
  readonly note: string | null;
}
