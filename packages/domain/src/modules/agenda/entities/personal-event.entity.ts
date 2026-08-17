import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Compromisso privado do próprio Irmão — nunca visível a administradores ou
 * outros Irmãos (ownership por `userId`, sem gate de RBAC de recurso, mesmo
 * padrão de `LibraryFavorite`/`NotificationPreference`).
 */
export interface PersonalEvent extends BaseEntity {
  userId: string;
  titulo: string;
  descricao: string | null;
  local: string | null;
  dataInicio: Date;
  dataFim: Date;
  /** Minutos de antecedência do lembrete (0|15|30|60|1440…); `null` = sem lembrete. */
  lembreteMinutosAntes: number | null;
  /** Intenção do usuário — o efeito real só existe com `GoogleCalendarConnection` ativa. */
  sincronizarComGoogle: boolean;
  /** Preenchido pelo use case de sincronização; `null` até então. */
  googleEventId: string | null;
}
