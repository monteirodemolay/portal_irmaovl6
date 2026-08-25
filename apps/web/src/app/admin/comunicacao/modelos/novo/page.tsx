import { requirePagePermission } from '@/lib/auth/require-permission';
import { createArtTemplateAction } from '@/modules/communication/actions/communication-actions';
import { TemplateFieldEditor } from '@/modules/communication/components/template-field-editor';

export default async function NewArtTemplatePage() {
  await requirePagePermission('communication:manage');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Novo modelo de arte</h1>
        <p className="text-muted text-sm">
          Envie a imagem de fundo e arraste sobre ela cada campo que deve ficar disponível pra
          preencher depois. A imagem em si nunca é alterada.
        </p>
      </div>

      <TemplateFieldEditor
        mode="create"
        action={createArtTemplateAction}
        initial={{
          name: '',
          type: 'session',
          backgroundUrl: null,
          outputFormats: ['feed'],
          fields: [],
          active: true,
        }}
      />
    </div>
  );
}
