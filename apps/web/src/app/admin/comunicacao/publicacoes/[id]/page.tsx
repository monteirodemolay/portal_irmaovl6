import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { PUBLICATION_STATUS_LABELS } from '@vl6/shared';
import { Badge } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { PublicationArtGenerator } from '@/modules/communication/components/publication-art-generator';

// O padrão do plano Hobby (10s) já se mostrou curto pra "Baixar"/"Compartilhar"
// (conversão do canvas + envio ao Vercel Blob + Firestore) numa function
// "fria" — a função é interrompida no meio e o cliente recebe uma resposta
// cortada ("An unexpected response was received from the server."), sem cair
// em nenhum try/catch nosso.
export const maxDuration = 30;

export default async function PublicationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePagePermission('communication:manage');
  const { id } = await params;

  const container = createServerContainer();
  const publication = await container.repositories.publication.findById(id);
  if (!publication || publication.tenantId !== session.authContext.tenantId) notFound();

  const template = await container.repositories.artTemplate.findById(publication.templateId);
  if (!template) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/comunicacao" className="text-muted text-sm hover:underline">
        ← Voltar para a Central de Comunicação
      </Link>

      <div className="flex items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{publication.title}</h1>
          <p className="text-muted text-sm">Modelo: {template.name}</p>
        </div>
        <Badge variant="outline">{PUBLICATION_STATUS_LABELS[publication.publicacaoStatus]}</Badge>
      </div>

      <PublicationArtGenerator publication={publication} template={template} />
    </div>
  );
}
