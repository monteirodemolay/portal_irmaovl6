/**
 * Publica a versão 1.0.0 da Política de Privacidade e dos Termos de Uso a
 * partir das minutas em `docs/legal/02-politica-privacidade.md` e
 * `docs/legal/03-termos-de-uso.md` — passo único de bootstrap; versões
 * seguintes são publicadas pela Administração (uma UI dedicada ainda não
 * existe — ver docs/legal/04-sistema-de-versionamento.md §7).
 *
 * IMPORTANTE: as minutas ainda têm trechos marcados `[A VALIDAR]`, que
 * dependem de revisão jurídica e de decisões institucionais (comarca do
 * foro, nome do encarregado de dados, prazos de retenção). Rodar este
 * script publica o texto tal como está no arquivo, `[A VALIDAR]` incluído
 * — revise as minutas ANTES de rodar isto em produção.
 *
 * Uso:
 *   FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=... \
 *   TENANT_ID=... ADMIN_UID=... RESPONSAVEL="Diretoria VL6" \
 *   pnpm tsx scripts/seed-legal-documents.ts
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AuthContext, LegalDocumentKey } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';

// Resolvido a partir deste arquivo, não de `process.cwd()` — o script
// funciona igual rodando de `scripts/` (`pnpm seed-legal-documents`) ou da
// raiz do monorepo (`pnpm tsx scripts/seed-legal-documents.ts`).
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DOCS: Record<LegalDocumentKey, string> = {
  politica_privacidade: 'docs/legal/02-politica-privacidade.md',
  termos_uso: 'docs/legal/03-termos-de-uso.md',
};

async function main() {
  const tenantId = process.env.TENANT_ID;
  const adminUid = process.env.ADMIN_UID;
  const responsavel = process.env.RESPONSAVEL ?? 'Diretoria VL6';
  if (!tenantId || !adminUid) {
    console.error(
      'Uso: TENANT_ID=... ADMIN_UID=... [RESPONSAVEL="Diretoria VL6"] pnpm tsx scripts/seed-legal-documents.ts',
    );
    process.exit(1);
  }

  const container = createServerContainer();
  const ctx: AuthContext = {
    uid: adminUid,
    tenantId,
    roleId: 'seed-script',
    permissions: ['legalDocument:manage'],
  };

  for (const [documento, relativePath] of Object.entries(DOCS) as [LegalDocumentKey, string][]) {
    const existing = await container.repositories.legalDocumentVersion.findCurrent(
      tenantId,
      documento,
    );
    if (existing) {
      console.log(`${documento}: já existe versão vigente (v${existing.versao}) — pulando.`);
      continue;
    }

    const conteudoMarkdown = await readFile(path.join(REPO_ROOT, relativePath), 'utf-8');

    const result = await container.useCases.publishLegalDocumentVersion.execute(ctx, {
      documento,
      versao: '1.0.0',
      classificacao: 'mudanca_institucional',
      motivo: 'Publicação inicial do documento junto ao lançamento do sistema de versionamento.',
      impacto: 'alto',
      itensAlterados: ['Publicação inicial completa'],
      exigeNovoAceite: true,
      conteudoMarkdown,
      diffResumo: null,
      responsavel,
    });

    if (!result.ok) {
      console.error(`Falha ao publicar ${documento}:`, result.error.message);
      process.exit(1);
    }
    console.log(`${documento}: versão ${result.value.versao} publicada (id ${result.value.id}).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
