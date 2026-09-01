import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ConflictError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  SequentialIdGenerator,
  InMemoryMemberRepository,
  InMemoryArtTemplateRepository,
  InMemoryPublicationRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { ArtTemplate } from '../entities/art-template.entity';
import { CreatePublicationFromBirthdayUseCase } from './create-publication-from-birthday.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['communication:manage'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'João Cordeiro',
    fotoUrl: 'https://example.com/foto.jpg',
    email: null,
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: new Date('1970-03-15'),
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: null,
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'ativo',
    lojaId: 'loja-1',
    potencia: 'GLEG',
    profissao: null,
    empresa: null,
    estadoCivil: null,
    conjugeNome: null,
    conjugeDataNascimento: null,
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildTemplate(overrides: Partial<ArtTemplate> = {}): ArtTemplate {
  return {
    id: 'template-1',
    tenantId: 't1',
    name: 'Aniversário',
    type: 'birthday',
    version: 1,
    backgroundUrl: 'https://example.com/bg.png',
    backgroundWidth: 1080,
    backgroundHeight: 1350,
    outputFormats: ['feed'],
    fields: [],
    active: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function setup() {
  const memberRepository = new InMemoryMemberRepository();
  const artTemplateRepository = new InMemoryArtTemplateRepository();
  const publicationRepository = new InMemoryPublicationRepository();
  const useCase = new CreatePublicationFromBirthdayUseCase({
    memberRepository,
    artTemplateRepository,
    publicationRepository,
    clock: new FixedClock(),
    idGenerator: new SequentialIdGenerator(),
  });
  return { memberRepository, artTemplateRepository, publicationRepository, useCase };
}

describe('CreatePublicationFromBirthdayUseCase', () => {
  it('bloqueia sem autorização de divulgação externa', async () => {
    const { memberRepository, artTemplateRepository, useCase } = setup();
    await memberRepository.create(buildMember({ autorizaDivulgacaoExterna: false }));
    await artTemplateRepository.create(buildTemplate());

    const result = await useCase.execute(ctx, 'member-1', 'template-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(ConflictError);
  });

  it('bloqueia sem data de nascimento cadastrada', async () => {
    const { memberRepository, artTemplateRepository, useCase } = setup();
    await memberRepository.create(buildMember({ dataNascimento: null }));
    await artTemplateRepository.create(buildTemplate());

    const result = await useCase.execute(ctx, 'member-1', 'template-1');

    expect(result.ok).toBe(false);
  });

  it('gera a publicação só com os dados autorizados, com autorização e data', async () => {
    const { memberRepository, artTemplateRepository, useCase } = setup();
    await memberRepository.create(buildMember());
    await artTemplateRepository.create(buildTemplate());

    const result = await useCase.execute(ctx, 'member-1', 'template-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sourceType).toBe('member');
      expect(result.value.fields.memberName).toBe('João Cordeiro');
      expect(result.value.fields.day).toBe('15');
      expect(result.value.fields.month).toBe('03');
      expect(result.value.publicacaoStatus).toBe('draft');
      expect(result.value.fields.cim).toBeUndefined();
    }
  });

  it('é idempotente pro mesmo Irmão no mesmo dia', async () => {
    const { memberRepository, artTemplateRepository, useCase } = setup();
    await memberRepository.create(buildMember());
    await artTemplateRepository.create(buildTemplate());

    const first = await useCase.execute(ctx, 'member-1', 'template-1');
    const second = await useCase.execute(ctx, 'member-1', 'template-1');

    expect(first.ok && second.ok && first.value.id === second.value.id).toBe(true);
  });

  it('retorna NotFoundError pra Irmão inexistente', async () => {
    const { artTemplateRepository, useCase } = setup();
    await artTemplateRepository.create(buildTemplate());

    const result = await useCase.execute(ctx, 'member-inexistente', 'template-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
