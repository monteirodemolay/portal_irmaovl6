import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { updateArtTemplateAction } from '@/modules/communication/actions/communication-actions';
import { TemplateFieldEditor } from '@/modules/communication/components/template-field-editor';

export default async function EditArtTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission('communication:manage');
  const { id } = await params;

  const container = createServerContainer();
  const template = await container.repositories.artTemplate.findById(id);
  if (!template) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{template.name}</h1>
        <p className="text-muted text-sm">
          Versão {template.version} — reposicionar ou ativar/desativar cria uma nova versão; a
          imagem de fundo não pode ser trocada aqui (cadastre um modelo novo pra isso).
        </p>
      </div>

      <TemplateFieldEditor
        mode="edit"
        action={updateArtTemplateAction.bind(null, template.id)}
        initial={{
          name: template.name,
          type: template.type,
          backgroundUrl: template.backgroundUrl,
          backgroundWidth: template.backgroundWidth,
          backgroundHeight: template.backgroundHeight,
          outputFormats: template.outputFormats,
          fields: template.fields,
          active: template.active,
        }}
      />
    </div>
  );
}
