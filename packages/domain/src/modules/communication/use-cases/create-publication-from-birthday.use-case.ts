import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { Publication } from '../entities/publication.entity';
import type { IArtTemplateRepository } from '../repositories/art-template.repository';
import type { IPublicationRepository } from '../repositories/publication.repository';

export interface CreatePublicationFromBirthdayDeps {
  publicationRepository: IPublicationRepository;
  artTemplateRepository: IArtTemplateRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Gera o rascunho de aniversário de um Irmão — só copia pra `Publication`
 * exatamente os dados que o pacote de Comunicação autoriza (nome, foto,
 * dia/mês de nascimento) e NUNCA roda sem
 * `Member.autorizaDivulgacaoExterna === true` (critério de aceite nº 12):
 * dado sensível desnecessário (CIM, endereço, telefone etc.) não é copiado.
 * Chamado pelo cron diário (geração automática) e, manualmente, por um
 * Administrador que queira antecipar uma arte específica.
 */
export class CreatePublicationFromBirthdayUseCase {
  constructor(private readonly deps: CreatePublicationFromBirthdayDeps) {}

  async execute(
    ctx: AuthContext,
    memberId: string,
    templateId: string,
  ): Promise<Result<Publication>> {
    requirePermission(ctx, 'communication:manage');

    const member = await this.deps.memberRepository.findById(memberId);
    if (!member || member.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Member', memberId));
    }
    if (!member.autorizaDivulgacaoExterna) {
      return err(
        new ConflictError(
          'Este Irmão não autorizou divulgação externa de aniversário. Nenhuma arte pode ser gerada.',
        ),
      );
    }
    if (!member.dataNascimento) {
      return err(new ConflictError('Este Irmão não tem data de nascimento cadastrada.'));
    }

    const template = await this.deps.artTemplateRepository.findById(templateId);
    if (!template || template.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArtTemplate', templateId));
    }

    const now = this.deps.clock.now();
    const scheduledForDay = now.toISOString().slice(0, 10);
    const existing = await this.deps.publicationRepository.findBySource(
      ctx.tenantId,
      'member',
      memberId,
      scheduledForDay,
    );
    if (existing) return ok(existing);

    const publication: Publication = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      templateId,
      sourceType: 'member',
      sourceId: memberId,
      title: `Aniversário — ${member.nomeCompleto}`,
      fields: {
        memberName: member.nomeCompleto,
        memberPhotoUrl: member.fotoUrl ?? '',
        day: String(member.dataNascimento.getDate()).padStart(2, '0'),
        month: String(member.dataNascimento.getMonth() + 1).padStart(2, '0'),
      },
      caption: null,
      whatsappText: null,
      channels: [],
      scheduledFor: now,
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
