import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../../shared/result';
import {
  FakeHasher,
  FixedClock,
  InMemoryLegalDocumentAcceptanceRepository,
  InMemoryLegalDocumentVersionRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { LegalDocumentVersion } from '../entities/legal-document-version.entity';
import { RecordLegalAcceptanceUseCase } from './record-legal-acceptance.use-case';

function buildVersion(overrides: Partial<LegalDocumentVersion> = {}): LegalDocumentVersion {
  return {
    id: 'v-1',
    tenantId: 't1',
    documento: 'termos_uso',
    versao: '1.0.0',
    classificacao: 'mudanca_institucional',
    motivo: 'Publicação inicial.',
    impacto: 'alto',
    itensAlterados: ['Publicação inicial'],
    exigeNovoAceite: true,
    conteudoMarkdown: '# Termos de Uso\n\nConteúdo de teste.',
    diffResumo: null,
    autor: 'admin-1',
    responsavel: 'Diretoria VL6',
    publicadoEm: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildUseCase() {
  const legalDocumentVersionRepository = new InMemoryLegalDocumentVersionRepository();
  const legalDocumentAcceptanceRepository = new InMemoryLegalDocumentAcceptanceRepository();
  const useCase = new RecordLegalAcceptanceUseCase({
    legalDocumentVersionRepository,
    legalDocumentAcceptanceRepository,
    hasher: new FakeHasher(),
    clock: new FixedClock(new Date('2026-09-22T10:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, legalDocumentVersionRepository, legalDocumentAcceptanceRepository };
}

describe('RecordLegalAcceptanceUseCase', () => {
  it('registra o aceite com hash, IP e user-agent', async () => {
    const { useCase, legalDocumentVersionRepository, legalDocumentAcceptanceRepository } =
      buildUseCase();
    await legalDocumentVersionRepository.append(buildVersion());

    const result = await useCase.execute({
      tenantId: 't1',
      userId: 'user-1',
      documento: 'termos_uso',
      versao: '1.0.0',
      ip: '203.0.113.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.versaoAceita).toBe('1.0.0');
    expect(result.value.ip).toBe('203.0.113.1');
    expect(result.value.hashVersao).toBe(
      new FakeHasher().sha256Hex(buildVersion().conteudoMarkdown),
    );
    expect(result.value.origem).toBe('self_service');

    const stored = await legalDocumentAcceptanceRepository.listByUser('t1', 'user-1');
    expect(stored).toHaveLength(1);
  });

  it('registra origem "migracao_pre_existente" quando informado — nunca fabrica IP/user-agent', async () => {
    const { useCase, legalDocumentVersionRepository } = buildUseCase();
    await legalDocumentVersionRepository.append(buildVersion());

    const result = await useCase.execute({
      tenantId: 't1',
      userId: 'user-1',
      documento: 'termos_uso',
      versao: '1.0.0',
      ip: null,
      userAgent: null,
      origem: 'migracao_pre_existente',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.origem).toBe('migracao_pre_existente');
    expect(result.value.ip).toBeNull();
    expect(result.value.userAgent).toBeNull();
  });

  it('funciona sem AuthContext — chamável antes de existir sessão (fluxo de reivindicação)', async () => {
    const { useCase, legalDocumentVersionRepository } = buildUseCase();
    await legalDocumentVersionRepository.append(buildVersion());

    // Nenhuma verificação de permissão deve ocorrer aqui — só passar os dados já basta.
    const result = await useCase.execute({
      tenantId: 't1',
      userId: 'recém-criado',
      documento: 'termos_uso',
      versao: '1.0.0',
      ip: null,
      userAgent: null,
    });

    expect(result.ok).toBe(true);
  });

  it('rejeita aceite de uma versão que não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({
      tenantId: 't1',
      userId: 'user-1',
      documento: 'termos_uso',
      versao: '9.9.9',
      ip: null,
      userAgent: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('cada novo aceite gera um registro novo — nunca sobrescreve o anterior', async () => {
    const { useCase, legalDocumentVersionRepository, legalDocumentAcceptanceRepository } =
      buildUseCase();
    await legalDocumentVersionRepository.append(buildVersion());
    await legalDocumentVersionRepository.append(buildVersion({ id: 'v-2', versao: '1.1.0' }));

    await useCase.execute({
      tenantId: 't1',
      userId: 'user-1',
      documento: 'termos_uso',
      versao: '1.0.0',
      ip: null,
      userAgent: null,
    });
    await useCase.execute({
      tenantId: 't1',
      userId: 'user-1',
      documento: 'termos_uso',
      versao: '1.1.0',
      ip: null,
      userAgent: null,
    });

    const stored = await legalDocumentAcceptanceRepository.listByUser('t1', 'user-1');
    expect(stored).toHaveLength(2);
  });
});
