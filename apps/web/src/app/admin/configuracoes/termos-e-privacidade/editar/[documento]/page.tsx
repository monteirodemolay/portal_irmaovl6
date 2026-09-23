import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { ArrowLeft } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { resolveLegalDocumentKey, LEGAL_DOCUMENT_TITLES } from '@/lib/legal/document-slug';
import { PublishLegalDocumentVersionForm } from '@/modules/legal/components/publish-legal-document-version-form';

/** Incrementa o PATCH da versão vigente (ex.: "1.0.0" -> "1.0.1"); "1.0.0" se ainda não houver versão publicada. */
function suggestNextVersion(current: string | null): string {
  if (!current) return '1.0.0';
  const match = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return current;
  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

/**
 * Edição/correção do texto da Política de Privacidade ou dos Termos de Uso
 * — publica uma nova versão a partir do texto vigente (append-only, nunca
 * sobrescreve). Complementa a visão de aceites em
 * `/admin/configuracoes/termos-e-privacidade`.
 */
export default async function EditLegalDocumentPage({
  params,
}: {
  params: Promise<{ documento: string }>;
}) {
  const session = await requirePagePermission('legalDocument:manage');
  const { documento: slug } = await params;
  const documento = resolveLegalDocumentKey(slug);
  if (!documento) {
    notFound();
  }

  const container = createServerContainer();
  const result = await container.useCases.listLegalDocumentVersions.execute(
    session.authContext,
    documento,
  );
  const historico = result.ok ? result.value : [];
  const vigente = historico[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/configuracoes/termos-e-privacidade"
          className="text-muted hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft size={14} /> Voltar
        </Link>
        <h1 className="font-display mt-2 text-2xl font-semibold">
          Editar {LEGAL_DOCUMENT_TITLES[documento]}
        </h1>
        <p className="text-muted text-sm">
          {vigente
            ? `Versão vigente: v${vigente.versao}, publicada em ${vigente.publicadoEm.toLocaleDateString('pt-BR')}.`
            : 'Nenhuma versão publicada ainda — esta será a primeira.'}{' '}
          Publicar aqui cria uma nova versão; a anterior é preservada no histórico.
        </p>
      </div>

      <PublishLegalDocumentVersionForm
        documento={documento}
        proximaVersaoSugerida={suggestNextVersion(vigente?.versao ?? null)}
        conteudoAtual={vigente?.conteudoMarkdown ?? ''}
        responsavelPadrao={vigente?.responsavel ?? 'Diretoria VL6'}
      />
    </div>
  );
}
