import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  InMemoryLegalDocumentAcceptanceRepository,
  InMemoryLegalDocumentVersionRepository,
} from '../../../test/fakes';
import type { LegalDocumentAcceptance } from '../entities/legal-document-acceptance.entity';
import type { LegalDocumentVersion } from '../entities/legal-document-version.entity';
import { GetLegalAcceptanceStatusUseCase } from './get-legal-acceptance-status.use-case';

const ctx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r-membro',
  permissions: ['legalDocument:read'],
};

function buildVersion(overrides: Partial<LegalDocumentVersion> = {}): LegalDocumentVersion {
  return {
    id: 'v-1',
    tenantId: 't1',
    documento: 'termos_uso',
    versao: '1.0.0',
    classificacao: 'mudanca_institucional',
    motivo: 'Publicação inicial.',
    impacto: 'alto',
    itensAlterados: [],
    exigeNovoAceite: true,
    conteudoMarkdown: 'conteúdo',
    diffResumo: null,
    autor: 'admin-1',
    responsavel: 'Diretoria VL6',
    publicadoEm: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildAcceptance(
  overrides: Partial<LegalDocumentAcceptance> = {},
): LegalDocumentAcceptance {
  return {
    id: 'a-1',
    tenantId: 't1',
    userId: 'user-1',
    documento: 'termos_uso',
    versaoAceita: '1.0.0',
    aceitoEm: new Date('2026-01-02T00:00:00Z'),
    ip: null,
    userAgent: null,
    hashVersao: 'hash',
    origem: 'self_service',
    ...overrides,
  };
}

function buildUseCase() {
  const legalDocumentVersionRepository = new InMemoryLegalDocumentVersionRepository();
  const legalDocumentAcceptanceRepository = new InMemoryLegalDocumentAcceptanceRepository();
  const useCase = new GetLegalAcceptanceStatusUseCase({
    legalDocumentVersionRepository,
    legalDocumentAcceptanceRepository,
  });
  return { useCase, legalDocumentVersionRepository, legalDocumentAcceptanceRepository };
}

describe('GetLegalAcceptanceStatusUseCase', () => {
  it('marca como pendente quando não há nenhum aceite e a versão vigente exige aceite', async () => {
    const { useCase, legalDocumentVersionRepository } = buildUseCase();
    await legalDocumentVersionRepository.append(buildVersion());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const termos = result.value.find((s) => s.documento === 'termos_uso');
    expect(termos?.pendente).toBe(true);
    expect(termos?.versaoAceita).toBeNull();
  });

  it('não marca como pendente quando o aceite já é da versão vigente', async () => {
    const { useCase, legalDocumentVersionRepository, legalDocumentAcceptanceRepository } =
      buildUseCase();
    await legalDocumentVersionRepository.append(buildVersion());
    await legalDocumentAcceptanceRepository.append(buildAcceptance());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const termos = result.value.find((s) => s.documento === 'termos_uso');
    expect(termos?.pendente).toBe(false);
    expect(termos?.versaoAceita).toBe('1.0.0');
  });

  it('marca como pendente quando existe versão mais nova que exige novo aceite', async () => {
    const { useCase, legalDocumentVersionRepository, legalDocumentAcceptanceRepository } =
      buildUseCase();
    await legalDocumentVersionRepository.append(buildVersion());
    await legalDocumentAcceptanceRepository.append(buildAcceptance());
    await legalDocumentVersionRepository.append(
      buildVersion({ id: 'v-2', versao: '1.1.0', publicadoEm: new Date('2026-02-01T00:00:00Z') }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const termos = result.value.find((s) => s.documento === 'termos_uso');
    expect(termos?.pendente).toBe(true);
    expect(termos?.versaoVigente).toBe('1.1.0');
    expect(termos?.versaoAceita).toBe('1.0.0');
  });

  it('não marca como pendente quando a nova versão não exige novo aceite', async () => {
    const { useCase, legalDocumentVersionRepository, legalDocumentAcceptanceRepository } =
      buildUseCase();
    await legalDocumentVersionRepository.append(buildVersion());
    await legalDocumentAcceptanceRepository.append(buildAcceptance());
    await legalDocumentVersionRepository.append(
      buildVersion({
        id: 'v-2',
        versao: '1.1.0',
        exigeNovoAceite: false,
        publicadoEm: new Date('2026-02-01T00:00:00Z'),
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const termos = result.value.find((s) => s.documento === 'termos_uso');
    expect(termos?.pendente).toBe(false);
  });

  it('não fica pendente quando nenhuma versão foi publicada ainda', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.every((s) => !s.pendente)).toBe(true);
  });
});
