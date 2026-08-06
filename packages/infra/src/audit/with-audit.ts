import {
  RecordAuditEntryUseCase,
  type AuditAction,
  type BaseEntity,
  type IClock,
  type IIdGenerator,
} from '@vl6/domain';
import type { IAuditLogRepository } from '@vl6/domain';

export interface AuditableRepository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  create(entity: T): Promise<void>;
  update(entity: T): Promise<void>;
}

export interface WithAuditDeps {
  auditLogRepository: IAuditLogRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

function determineAction(before: BaseEntity | null, after: BaseEntity): AuditAction {
  if (!before) return 'create';
  const wasDeleted = before.deletedAt !== null;
  const isDeleted = after.deletedAt !== null;
  if (!wasDeleted && isDeleted) return 'delete';
  if (wasDeleted && !isDeleted) return 'restore';
  return 'update';
}

/**
 * Envolve `create`/`update` de um repositório com o registro automático de
 * auditoria — substitui a Cloud Function `onEntityAudited` (trigger
 * genérico em `{collection}/{docId}`, sem plano Blaze não roda). Aplicado
 * uma única vez por repositório em `createServerContainer`, nas mesmas 8
 * coleções que o trigger cobria (`container.ts`), então nenhum caso de uso
 * precisa lembrar de auditar manualmente — igual à ergonomia do trigger,
 * só que como código de aplicação.
 *
 * `update` precisa do valor anterior pra decidir create/update/delete/
 * restore (soft delete é só `deletedAt` mudando via `update`, nunca um
 * método `delete` — docs/architecture §3.1) e pra preencher
 * `valorAnterior`; como o Firestore não dá isso de graça fora de um
 * trigger, um `findById` extra roda antes de cada `update` (custo aceito
 * em troca de não precisar de Cloud Functions).
 *
 * Usa `Proxy` (não spread) pra não perder métodos do repositório original
 * que não sejam `create`/`update` (`findById`, `search`, etc.) — e resolve
 * sempre contra o `target` real, nunca o proxy, pra não quebrar `this`
 * dentro dos métodos originais.
 */
export function withAudit<T extends BaseEntity, R extends AuditableRepository<T>>(
  repository: R,
  entidade: string,
  deps: WithAuditDeps,
): R {
  const recordAuditEntry = new RecordAuditEntryUseCase(deps);

  return new Proxy(repository, {
    get(target, prop, _receiver) {
      if (prop === 'create') {
        return async (entity: T) => {
          await target.create(entity);
          await recordAuditEntry.execute({
            tenantId: entity.tenantId,
            entidade,
            entidadeId: entity.id,
            acao: 'create',
            usuarioId: entity.createdBy,
            ip: null,
            dispositivo: null,
            valorAnterior: null,
            valorNovo: entity,
          });
        };
      }
      if (prop === 'update') {
        return async (entity: T) => {
          const before = await target.findById(entity.id);
          await target.update(entity);
          await recordAuditEntry.execute({
            tenantId: entity.tenantId,
            entidade,
            entidadeId: entity.id,
            acao: determineAction(before, entity),
            usuarioId: entity.updatedBy,
            ip: null,
            dispositivo: null,
            valorAnterior: before,
            valorNovo: entity,
          });
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
