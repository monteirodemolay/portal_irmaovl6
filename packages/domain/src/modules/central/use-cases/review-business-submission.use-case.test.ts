import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryMemberCentralProfileRepository } from '../../../test/fakes';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';
import { ReviewBusinessSubmissionUseCase } from './review-business-submission.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['memberCentral:manage'],
};

function buildProfile(overrides: Partial<MemberCentralProfile> = {}): MemberCentralProfile {
  return {
    id: 'profile-1',
    tenantId: 't1',
    memberId: 'member-1',
    apresentacao: null,
    interesses: null,
    cidadeExibicao: null,
    areaAtuacao: null,
    areaAtuacaoOutra: null,
    formacao: null,
    resumoProfissional: null,
    negocios: [
      {
        id: 'negocio-1',
        nomeEmpresa: 'Engenharia & Campo',
        segmento: null,
        cargo: null,
        descricao: null,
        cidade: null,
        telefoneComercial: null,
        siteUrl: null,
        status: 'pending_review',
        updatedAt: new Date('2026-01-01'),
      },
    ],
    competencias: [],
    servicos: [],
    lojasVisitadas: null,
    interessesMaconicos: null,
    externalLinks: {
      whatsapp: null,
      instagram: null,
      facebook: null,
      linkedin: null,
      lattes: null,
      site: null,
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const memberCentralProfileRepository = new InMemoryMemberCentralProfileRepository();
  const clock = new FixedClock(new Date('2026-02-01T00:00:00Z'));
  const useCase = new ReviewBusinessSubmissionUseCase({ memberCentralProfileRepository, clock });
  return { useCase, memberCentralProfileRepository };
}

describe('ReviewBusinessSubmissionUseCase', () => {
  it('aprova: negócio vira published', async () => {
    const { useCase, memberCentralProfileRepository } = buildUseCase();
    await memberCentralProfileRepository.create(buildProfile());

    const result = await useCase.execute(ctx, 'member-1', 'negocio-1', 'approve');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.negocios[0]?.status).toBe('published');
    expect(result.value.negocios[0]?.updatedAt).toEqual(new Date('2026-02-01T00:00:00Z'));
  });

  it('rejeita: negócio volta pra draft (não fica travado)', async () => {
    const { useCase, memberCentralProfileRepository } = buildUseCase();
    await memberCentralProfileRepository.create(buildProfile());

    const result = await useCase.execute(ctx, 'member-1', 'negocio-1', 'reject');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.negocios[0]?.status).toBe('draft');
  });

  it('suspende: negócio publicado vira suspended', async () => {
    const { useCase, memberCentralProfileRepository } = buildUseCase();
    await memberCentralProfileRepository.create(
      buildProfile({
        negocios: [
          {
            id: 'negocio-1',
            nomeEmpresa: 'Engenharia & Campo',
            segmento: null,
            cargo: null,
            descricao: null,
            cidade: null,
            telefoneComercial: null,
            siteUrl: null,
            status: 'published',
            updatedAt: new Date('2026-01-01'),
          },
        ],
      }),
    );

    const result = await useCase.execute(ctx, 'member-1', 'negocio-1', 'suspend');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.negocios[0]?.status).toBe('suspended');
  });

  it('erro quando o negócio não existe', async () => {
    const { useCase, memberCentralProfileRepository } = buildUseCase();
    await memberCentralProfileRepository.create(buildProfile());

    const result = await useCase.execute(ctx, 'member-1', 'negocio-inexistente', 'approve');

    expect(result.ok).toBe(false);
  });
});
