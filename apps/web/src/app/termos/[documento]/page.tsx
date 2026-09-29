import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { resolveLegalDocumentKey, LEGAL_DOCUMENT_TITLES } from '@/lib/legal/document-slug';
import { LegalDocumentText } from '@/modules/legal/components/legal-document-text';

/**
 * Leitura pública (sem login) da versão vigente de um documento legal — link
 * usado no cadastro/reivindicação de conta (antes de existir sessão) e no
 * rodapé/área "Termos e Privacidade". Nunca protegida pelo middleware (não
 * está em `PROTECTED_PREFIXES`), de propósito: quem ainda não tem conta
 * também precisa poder ler antes de aceitar.
 */
export default async function PublicLegalDocumentPage({
  params,
}: {
  params: Promise<{ documento: string }>;
}) {
  const { documento: slug } = await params;
  const documento = resolveLegalDocumentKey(slug);
  if (!documento) {
    notFound();
  }

  const current = await getCurrentTenant();
  if (!current) {
    notFound();
  }

  const container = createServerContainer();
  const version = await container.repositories.legalDocumentVersion.findCurrent(
    current.tenant.id,
    documento,
  );

  return (
    <main className="bg-background flex min-h-screen justify-center p-6">
      <div className="border-accent/25 bg-surface/95 w-full max-w-2xl rounded-[26px] border p-8 shadow-md sm:p-10">
        <p className="text-accent text-xs font-semibold uppercase tracking-wide">
          {current.tenant.nome}
        </p>
        <h1 className="font-display mt-1 text-2xl font-medium">
          {LEGAL_DOCUMENT_TITLES[documento]}
        </h1>

        {version ? (
          <>
            <p className="text-muted mt-1 text-xs">
              Versão {version.versao} · vigente desde{' '}
              {version.publicadoEm.toLocaleDateString('pt-BR')}
            </p>
            <div className="bg-border my-6 h-px" />
            <LegalDocumentText markdown={version.conteudoMarkdown} />
          </>
        ) : (
          <p className="text-muted mt-6 text-sm">
            Este documento ainda não foi publicado nesta Loja. Fale com a Secretaria.
          </p>
        )}

        <div className="bg-border my-6 h-px" />
        <p className="text-center text-sm">
          <Link href="/reivindicar" className="text-accent font-medium hover:underline">
            Voltar
          </Link>
        </p>
      </div>
    </main>
  );
}
