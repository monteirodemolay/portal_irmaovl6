import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { LegalDocumentKey, LegalDocumentVersion } from '@vl6/domain';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { getLegalAcceptanceStatus } from '@/lib/legal/get-legal-acceptance-status';
import { LEGAL_DOCUMENT_SLUGS, LEGAL_DOCUMENT_TITLES } from '@/lib/legal/document-slug';
import { AcceptLegalDocumentCard } from '@/modules/legal/components/accept-legal-document-card';
import { LegalDocumentPreviewSheet } from '@/modules/legal/components/legal-document-preview-sheet';
import { CLASSIFICATION_LABELS, IMPACT_LABELS } from '@/modules/legal/lib/labels';

const DOCUMENTOS: LegalDocumentKey[] = ['politica_privacidade', 'termos_uso'];

/**
 * Área "Termos e Privacidade" do Perfil do Irmão — política vigente,
 * histórico completo de versões, meu aceite (data/hora/versão) e reaceite
 * quando pendente. Também é o destino do gate de reaceite obrigatório em
 * `(member)/layout.tsx` — por isso o layout nunca redireciona pra fora
 * desta própria página, mesmo com pendência (ver comentário lá).
 */
export default async function TermosEPrivacidadePage() {
  const session = await requireSession();
  const container = createServerContainer();

  const [status, ...historicos] = await Promise.all([
    getLegalAcceptanceStatus(session.authContext),
    ...DOCUMENTOS.map((documento) =>
      container.useCases.listLegalDocumentVersions.execute(session.authContext, documento),
    ),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <div>
        <span className="text-accent text-xs font-semibold uppercase tracking-wide">
          Minha conta
        </span>
        <h1 className="font-display text-2xl font-semibold">Termos e Privacidade</h1>
        <p className="text-muted text-sm">
          Política de Privacidade e Termos de Uso vigentes, seu histórico de aceite e o histórico
          completo de versões — nenhuma versão anterior é excluída.
        </p>
      </div>

      {DOCUMENTOS.map((documento, index) => {
        const docStatus = status.find((s) => s.documento === documento) ?? null;
        const historicoResult = historicos[index];
        const historico: LegalDocumentVersion[] = historicoResult?.ok ? historicoResult.value : [];
        const vigente = historico[0] ?? null;

        return (
          <section key={documento} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">
                {LEGAL_DOCUMENT_TITLES[documento]}
              </h2>
              {vigente && (
                <LegalDocumentPreviewSheet
                  titulo={LEGAL_DOCUMENT_TITLES[documento]}
                  versao={vigente.versao}
                  publicadoEm={vigente.publicadoEm}
                  markdown={vigente.conteudoMarkdown}
                  slug={LEGAL_DOCUMENT_SLUGS[documento]}
                />
              )}
            </div>

            {vigente ? (
              <p className="text-muted text-xs">
                Versão vigente: <b className="text-foreground">v{vigente.versao}</b> · publicada em{' '}
                {vigente.publicadoEm.toLocaleDateString('pt-BR')}
              </p>
            ) : (
              <p className="text-muted text-xs">Nenhuma versão publicada ainda.</p>
            )}

            <div className="border-border rounded-lg border p-4 text-sm">
              <p className="text-muted text-xs font-semibold uppercase tracking-wide">Meu aceite</p>
              {docStatus?.versaoAceita ? (
                <p className="mt-1">
                  Versão <b>v{docStatus.versaoAceita}</b> aceita em{' '}
                  {docStatus.aceitoEm?.toLocaleString('pt-BR')}.
                </p>
              ) : (
                <p className="text-muted mt-1">Nenhum aceite registrado ainda.</p>
              )}
            </div>

            {docStatus?.pendente && vigente && (
              <AcceptLegalDocumentCard
                documento={documento}
                versao={vigente.versao}
                diffResumo={vigente.diffResumo}
              />
            )}

            {historico.length > 0 && (
              <details className="text-sm">
                <summary className="text-accent cursor-pointer font-medium">
                  Ver histórico de versões ({historico.length})
                </summary>
                <ul className="mt-3 flex flex-col gap-3">
                  {historico.map((version) => (
                    <li key={version.id} className="border-border border-l-2 pl-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-semibold">v{version.versao}</span>
                        <span className="text-muted">
                          {version.publicadoEm.toLocaleDateString('pt-BR')}
                        </span>
                        <span className="bg-accent/10 text-accent rounded-full px-2 py-0.5 font-medium">
                          {CLASSIFICATION_LABELS[version.classificacao]}
                        </span>
                        <span className="text-muted">{IMPACT_LABELS[version.impacto]}</span>
                      </div>
                      <p className="text-muted mt-1 text-xs">{version.motivo}</p>
                      {version.itensAlterados.length > 0 && (
                        <p className="text-muted mt-1 text-xs">
                          Itens alterados: {version.itensAlterados.join('; ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        );
      })}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
          Central de solicitações
        </h2>
        <p className="text-muted text-sm">
          Para corrigir, exportar ou solicitar a eliminação dos seus dados, fale com a Secretaria da
          Loja. A exclusão da sua conta de acesso pode ser feita diretamente em{' '}
          <Link href="/irmaos/configuracoes" className="text-accent underline">
            Configurações
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
