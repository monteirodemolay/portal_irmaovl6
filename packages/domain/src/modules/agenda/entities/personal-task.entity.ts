import type { BaseEntity } from '../../../shared/base-entity';

/** Item de checklist pessoal ("Minhas tarefas" na Minha Agenda) — não vinculado a nenhum evento específico. */
export interface PersonalTask extends BaseEntity {
  userId: string;
  titulo: string;
  concluida: boolean;
}
