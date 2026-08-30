import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryPublicationSettingsRepository } from '../../../test/fakes';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import { SuspendCentralProfileUseCase } from './suspend-central-profile.use-case';

const adminCtx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['memberCentral:manage'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['memberDirectory:read'],
};

function buildSettings(): PublicationSettings {
  return {
    id: 'settings-1',
    tenantId: 't1',
    memberId: 'member-1',
    profilePublished: false, // titular nunca publicou
    blocks: {
      apresentacao: false,
      informacoesPessoais: false,
      profissional: false,
      empresa: false,
      informacoesMaconicas: false,
      competencias: false,
      servicos: false,
      endereco: false,
      memoriaFotografica: false,
    },
    contacts: { telefone: false, whatsapp: false, email: false },
    externalLinks: {
      whatsapp: false,
      instagram: false,
      facebook: false,
      linkedin: false,
      lattes: false,
      site: false,
    },
    suspendedAt: null,
    suspendedBy: null,
    suspendedReason: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
}

function buildUseCase() {
  const publicationSettingsRepository = new InMemoryPublicationSettingsRepository();
  const useCase = new SuspendCentralProfileUseCase({
    publicationSettingsRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, publicationSettingsRepository };
}

describe('SuspendCentralProfileUseCase', () => {
  it('nunca liga profilePublished/blocks — só mexe nos campos de suspensão', async () => {
    const { useCase, publicationSettingsRepository } = buildUseCase();
    await publicationSettingsRepository.create(buildSettings());

    const result = await useCase.execute(adminCtx, 'member-1', 'Conteúdo inadequado');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // "Suspender" quem nunca publicou não pode virar um jeito disfarçado de publicar.
    expect(result.value.profilePublished).toBe(false);
    expect(result.value.blocks.apresentacao).toBe(false);
    expect(result.value.suspendedAt).not.toBeNull();
    expect(result.value.suspendedBy).toBe('admin-1');
    expect(result.value.suspendedReason).toBe('Conteúdo inadequado');
  });

  it('exige motivo não vazio', async () => {
    const { useCase, publicationSettingsRepository } = buildUseCase();
    await publicationSettingsRepository.create(buildSettings());

    const result = await useCase.execute(adminCtx, 'member-1', '   ');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('lança ForbiddenError sem memberCentral:manage', async () => {
    const { useCase, publicationSettingsRepository } = buildUseCase();
    await publicationSettingsRepository.create(buildSettings());

    await expect(useCase.execute(readOnlyCtx, 'member-1', 'motivo')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
