import 'server-only';
import type { AuthContext } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import { ARCHIVE_RELATION_NODE_KIND_LABELS, type ArchiveRelationNodeKind } from '@vl6/shared';
import { resolveArchiveItem } from './resolve-archive-item';

export interface ResolvedRelationNode {
  label: string;
  kindLabel: string;
  href: string;
}

/**
 * Resolve um nó da Constelação da Memória (`ArchiveRelation.origemTipo`/
 * `destinoTipo` + ID) para exibição — nunca copia o registro referenciado,
 * só lê o mínimo necessário (título/nome + link). `null` cobre igualmente
 * "não existe mais" e "sem permissão/outro tenant", sem distinguir os
 * casos (mesma cautela de `resolveArchiveItem`).
 */
export async function resolveRelationNode(
  tipo: ArchiveRelationNodeKind,
  id: string,
  authContext: AuthContext,
  container: ServerContainer,
): Promise<ResolvedRelationNode | null> {
  switch (tipo) {
    case 'archiveItem': {
      const item = await resolveArchiveItem(id, authContext, container);
      if (!item) return null;
      return { label: item.titulo, kindLabel: item.kindLabel, href: `/acervo/item/${item.compositeId}` };
    }
    case 'member': {
      const member = await container.repositories.member.findById(id);
      if (!member || member.tenantId !== authContext.tenantId) return null;
      return {
        label: member.nomeCompleto,
        kindLabel: ARCHIVE_RELATION_NODE_KIND_LABELS.member,
        href: `/acervo/pessoas/${member.id}`,
      };
    }
    case 'boardTerm': {
      const term = await container.repositories.boardTerm.findById(id);
      if (!term || term.tenantId !== authContext.tenantId) return null;
      return {
        label: term.nome,
        kindLabel: ARCHIVE_RELATION_NODE_KIND_LABELS.boardTerm,
        href: `/acervo/gestoes/${term.id}`,
      };
    }
    case 'event': {
      const event = await container.repositories.event.findById(id);
      if (!event || event.tenantId !== authContext.tenantId) return null;
      return {
        label: event.titulo,
        kindLabel: ARCHIVE_RELATION_NODE_KIND_LABELS.event,
        href: `/eventos/${event.id}`,
      };
    }
    case 'archiveCollection': {
      const collection = await container.repositories.archiveCollection.findById(id);
      if (!collection || collection.tenantId !== authContext.tenantId) return null;
      return {
        label: collection.titulo,
        kindLabel: ARCHIVE_RELATION_NODE_KIND_LABELS.archiveCollection,
        href: `/acervo/colecoes/${collection.slug}`,
      };
    }
  }
}
