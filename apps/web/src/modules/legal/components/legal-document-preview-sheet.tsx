'use client';

import Link from 'next/link';
import {
  ResponsivePreviewSheet,
  ResponsivePreviewSheetBody,
  ResponsivePreviewSheetContent,
  ResponsivePreviewSheetDescription,
  ResponsivePreviewSheetHeader,
  ResponsivePreviewSheetTitle,
  ResponsivePreviewSheetTrigger,
} from '@vl6/ui';
import { LegalDocumentText } from './legal-document-text';

/**
 * "Ler texto completo" abre o Markdown já carregado pela página (sem nova
 * navegação nem requisição) num painel sobreposto — drawer no celular,
 * modal centralizado no computador. `slug` mantém um link de apoio pra
 * `/termos/[documento]`, a mesma página pública usada antes de existir
 * sessão (cadastro/reivindicação de conta), que continua existindo.
 */
export function LegalDocumentPreviewSheet({
  titulo,
  versao,
  publicadoEm,
  markdown,
  slug,
}: {
  titulo: string;
  versao: string;
  publicadoEm: Date;
  markdown: string;
  slug: string;
}) {
  return (
    <ResponsivePreviewSheet>
      <ResponsivePreviewSheetTrigger className="text-accent text-xs font-medium hover:underline">
        Ler texto completo
      </ResponsivePreviewSheetTrigger>
      <ResponsivePreviewSheetContent>
        <ResponsivePreviewSheetHeader>
          <ResponsivePreviewSheetTitle>{titulo}</ResponsivePreviewSheetTitle>
          <ResponsivePreviewSheetDescription>
            Versão {versao} · vigente desde {publicadoEm.toLocaleDateString('pt-BR')}
          </ResponsivePreviewSheetDescription>
        </ResponsivePreviewSheetHeader>
        <ResponsivePreviewSheetBody>
          <LegalDocumentText markdown={markdown} />
          <Link
            href={`/termos/${slug}`}
            target="_blank"
            className="text-accent mt-6 inline-block text-xs font-medium hover:underline"
          >
            Abrir em uma página própria
          </Link>
        </ResponsivePreviewSheetBody>
      </ResponsivePreviewSheetContent>
    </ResponsivePreviewSheet>
  );
}
