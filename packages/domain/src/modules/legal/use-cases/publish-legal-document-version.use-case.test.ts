import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ConflictError, ForbiddenError } from '../../../shared/result';
import {
  InMemoryAuditLogRepository,
  InMemoryLegalDocumentVersionRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { PublishLegalDocumentVersionUseCase } from './publish-legal-document-version.use-case';

/** Avança 1 minuto a cada chamada — necessário aqui porque `listByDocumento` ordena por `publicadoEm desc`, e testar "nunca sobrescreve" exige duas publicações com timestamps diferentes. */
class AdvancingClock implements IClock {
  private current = new Date('2026-09-22T00:00:00Z').getTime();
  now(): Date {
    const date = new Date(this.current);
    this.current += 60_000;
    return date;
  }
}

const adminCtx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r-admin',
  permissions: ['legalDocument:manage'],
};

const noPermCtx: AuthContext = {
  uid: 'membro-1',
  tenantId: 't1',
  roleId: 'r-membro',
  permissions: ['legalDocument:read'],
};

function buildInput(
  overrides: Partial<Parameters<PublishLegalDocumentVersionUseCase['execute']>[1]> = {},
) {
  return {
    documento: 'politica_privacidade' as const,
    versao: '1.0.0',
    classificacao: 'mudanca_institucional' as const,
    motivo: 'Publicação inicial.',
    impacto: 'alto' as const,
    itensAlterados: ['Publicação inicial completa'],
    exigeNovoAceite: true,
    conteudoMarkdown: '# Política de Privacidade\n\nConteúdo de teste.',
    diffResumo: null,
    responsavel: 'Diretoria VL6',
    ...overrides,
  };
}

function buildUseCase() {
  const legalDocumentVersionRepository = new InMemoryLegalDocumentVersionRepository();
  const auditLogRepository = new InMemoryAuditLogRepository();
  const useCase = new PublishLegalDocumentVersionUseCase({
    legalDocumentVersionRepository,
    auditLogRepository,
    clock: new AdvancingClock(),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, legalDocumentVersionRepository, auditLogRepository };
}

describe('PublishLegalDocumentVersionUseCase', () => {
  it('publica a primeira versão de um documento', async () => {
    const { useCase, legalDocumentVersionRepository } = buildUseCase();

    const result = await useCase.execute(adminCtx, buildInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.versao).toBe('1.0.0');
    expect(result.value.autor).toBe('admin-1');

    const historico = await legalDocumentVersionRepository.listByDocumento(
      't1',
      'politica_privacidade',
    );
    expect(historico).toHaveLength(1);
  });

  it('nunca sobrescreve — publicar de novo cria um segundo registro no histórico', async () => {
    const { useCase, legalDocumentVersionRepository } = buildUseCase();
    await useCase.execute(adminCtx, buildInput());

    const result = await useCase.execute(adminCtx, buildInput({ versao: '1.1.0' }));

    expect(result.ok).toBe(true);
    const historico = await legalDocumentVersionRepository.listByDocumento(
      't1',
      'politica_privacidade',
    );
    expect(historico).toHaveLength(2);
    expect(historico[0]!.versao).toBe('1.1.0');
    expect(historico[1]!.versao).toBe('1.0.0');
  });

  it('rejeita publicar uma versão já existente para o mesmo documento', async () => {
    const { useCase } = buildUseCase();
    await useCase.execute(adminCtx, buildInput());

    const result = await useCase.execute(adminCtx, buildInput());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ConflictError);
  });

  it('rejeita quem não tem legalDocument:manage', async () => {
    const { useCase } = buildUseCase();
    await expect(useCase.execute(noPermCtx, buildInput())).rejects.toThrow(ForbiddenError);
  });

  it('grava uma entrada de auditoria ao publicar', async () => {
    const { useCase, auditLogRepository } = buildUseCase();
    await useCase.execute(adminCtx, buildInput());

    const page = await auditLogRepository.search({ tenantId: 't1' }, { limit: 10 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]!.acao).toBe('legal_document_version_published');
  });
});
