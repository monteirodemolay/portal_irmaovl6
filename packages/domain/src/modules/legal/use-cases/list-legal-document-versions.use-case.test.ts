import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryLegalDocumentVersionRepository } from '../../../test/fakes';
import type { LegalDocumentVersion } from '../entities/legal-document-version.entity';
import { ListLegalDocumentVersionsUseCase } from './list-legal-document-versions.use-case';

function buildVersion(overrides: Partial<LegalDocumentVersion> = {}): LegalDocumentVersion {
  return {
    id: 'v1',
    tenantId: 't1',
    documento: 'termos_uso',
    versao: '1.0.0',
    classificacao: 'nova_funcionalidade',
    motivo: 'Publicação inicial',
    impacto: 'baixo',
    itensAlterados: [],
    exigeNovoAceite: false,
    conteudoMarkdown: '# Termos de Uso',
    diffResumo: null,
    autor: 'admin-1',
    responsavel: 'Diretoria VL6',
    publicadoEm: new Date('2026-01-01'),
    ...overrides,
  };
}

function buildUseCase() {
  const legalDocumentVersionRepository = new InMemoryLegalDocumentVersionRepository();
  const useCase = new ListLegalDocumentVersionsUseCase({ legalDocumentVersionRepository });
  return { useCase, legalDocumentVersionRepository };
}

describe('ListLegalDocumentVersionsUseCase', () => {
  it('lista as versões de um documento sem exigir nenhuma permissão', async () => {
    // Regressão: até uma sessão sem `legalDocument:read` (papel ainda não
    // sincronizado em `/admin/pessoas/permissoes`) precisa conseguir ler
    // isto — é a página pra qual o gate de reaceite obrigatório redireciona
    // todo Irmão, e o mesmo conteúdo já é 100% público em `/termos/[documento]`.
    const { useCase, legalDocumentVersionRepository } = buildUseCase();
    await legalDocumentVersionRepository.append(buildVersion());

    const ctxSemPermissaoNenhuma: AuthContext = {
      uid: 'user-1',
      tenantId: 't1',
      roleId: 'r1',
      permissions: [],
    };

    const result = await useCase.execute(ctxSemPermissaoNenhuma, 'termos_uso');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]?.versao).toBe('1.0.0');
  });

  it('filtra por documento e por tenant', async () => {
    const { useCase, legalDocumentVersionRepository } = buildUseCase();
    await legalDocumentVersionRepository.append(
      buildVersion({ id: 'v1', documento: 'termos_uso' }),
    );
    await legalDocumentVersionRepository.append(
      buildVersion({ id: 'v2', documento: 'politica_privacidade' }),
    );
    await legalDocumentVersionRepository.append(buildVersion({ id: 'v3', tenantId: 't2' }));

    const ctx: AuthContext = { uid: 'user-1', tenantId: 't1', roleId: 'r1', permissions: [] };
    const result = await useCase.execute(ctx, 'termos_uso');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((v) => v.id)).toEqual(['v1']);
  });
});
