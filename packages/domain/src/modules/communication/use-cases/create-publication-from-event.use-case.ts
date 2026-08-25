import { BRAZIL_TIME_ZONE } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { Publication } from '../entities/publication.entity';
import type { IArtTemplateRepository } from '../repositories/art-template.repository';
import type { IPublicationRepository } from '../repositories/publication.repository';

export interface CreatePublicationFromEventDeps {
  publicationRepository: IPublicationRepository;
  artTemplateRepository: IArtTemplateRepository;
  eventRepository: IEventRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

const SESSION_DEGREE_LABELS: Record<string, string> = {
  aprendiz: 'Grau Aprendiz',
  companheiro: 'Grau Companheiro',
  mestre: 'Grau Mestre',
  magna: 'Sessão Magna',
  publica: 'Sessão Pública',
};

/**
 * "Gerar arte" a partir de um Evento da Agenda — busca o registro existente
 * pelo `eventId` (nunca redigita dado, regra indispensável do pacote de
 * Comunicação) e pré-preenche os campos "bem conhecidos" que o editor
 * visual de modelos usa por convenção (`sessionName`, `date`, `time`,
 * `degree`, `location`) — um modelo de Sessão só precisa nomear seus campos
 * com essas chaves pra ganhar o preenchimento automático.
 *
 * Idempotente por evento: reabrir "Gerar arte" pro mesmo Evento retoma o
 * rascunho já existente em vez de criar um segundo, mesmo padrão de
 * `EventStep.onResumeDraft` da Central de Publicação do Acervo.
 */
export class CreatePublicationFromEventUseCase {
  constructor(private readonly deps: CreatePublicationFromEventDeps) {}

  async execute(
    ctx: AuthContext,
    eventId: string,
    templateId: string,
  ): Promise<Result<Publication>> {
    requirePermission(ctx, 'communication:manage');

    const event = await this.deps.eventRepository.findById(eventId);
    if (!event || event.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Event', eventId));
    }

    const template = await this.deps.artTemplateRepository.findById(templateId);
    if (!template || template.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArtTemplate', templateId));
    }

    const scheduledForDay = event.dataInicio.toISOString().slice(0, 10);
    const existing = await this.deps.publicationRepository.findBySource(
      ctx.tenantId,
      'agenda_event',
      eventId,
      scheduledForDay,
    );
    if (existing) return ok(existing);

    const now = this.deps.clock.now();
    const publication: Publication = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      templateId,
      sourceType: 'agenda_event',
      sourceId: eventId,
      title: event.titulo,
      fields: {
        sessionName: event.titulo,
        date: new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeZone: BRAZIL_TIME_ZONE,
        }).format(event.dataInicio),
        time: new Intl.DateTimeFormat('pt-BR', {
          timeStyle: 'short',
          timeZone: BRAZIL_TIME_ZONE,
        }).format(event.dataInicio),
        degree: event.grau ? (SESSION_DEGREE_LABELS[event.grau] ?? event.grau) : '',
        location: event.local,
      },
      caption: null,
      whatsappText: null,
      channels: [],
      scheduledFor: event.dataInicio,
      publicacaoStatus: 'draft',
      approvedBy: null,
      approvedAt: null,
      publishedBy: null,
      publishedAt: null,
      assets: [],
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };

    await this.deps.publicationRepository.create(publication);
    return ok(publication);
  }
}
