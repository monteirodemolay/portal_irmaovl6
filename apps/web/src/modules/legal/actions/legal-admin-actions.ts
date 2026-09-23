'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { publishLegalDocumentVersionSchema } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { LEGAL_DOCUMENT_TITLES } from '@/lib/legal/document-slug';
import { notifyAllActiveUsers } from '@/modules/notification/lib/notify-all-active-users';

export interface PublishLegalDocumentVersionActionState {
  error: string | null;
}

/**
 * Publica uma nova versão da Política de Privacidade ou dos Termos de Uso
 * a partir do formulário de edição em Configurações do Administrador →
 * Termos e Privacidade. Depois de publicar com sucesso, dispara notificação
 * a todos os usuários ativos quando `exigeNovoAceite` — mesmo padrão de
 * `content-actions.ts` (a notificação nasce na camada de Server Action, não
 * dentro do Use Case de domínio).
 */
export async function publishLegalDocumentVersionAction(
  _prevState: PublishLegalDocumentVersionActionState,
  formData: FormData,
): Promise<PublishLegalDocumentVersionActionState> {
  const session = await requireSession();

  const itensAlterados = String(formData.get('itensAlterados') ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const diffResumoRaw = String(formData.get('diffResumo') ?? '').trim();

  const parsed = publishLegalDocumentVersionSchema.safeParse({
    documento: formData.get('documento'),
    versao: formData.get('versao'),
    classificacao: formData.get('classificacao'),
    motivo: formData.get('motivo'),
    impacto: formData.get('impacto'),
    itensAlterados,
    exigeNovoAceite: formData.get('exigeNovoAceite') === 'on',
    conteudoMarkdown: formData.get('conteudoMarkdown'),
    diffResumo: diffResumoRaw.length > 0 ? diffResumoRaw : null,
    responsavel: formData.get('responsavel'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.publishLegalDocumentVersion.execute(
    session.authContext,
    parsed.data,
  );

  if (!result.ok) {
    return { error: result.error.message };
  }

  if (parsed.data.exigeNovoAceite) {
    await notifyAllActiveUsers(container, session.authContext.tenantId, {
      tipo: 'system',
      titulo: `${LEGAL_DOCUMENT_TITLES[parsed.data.documento]} atualizado(a)`,
      mensagem:
        parsed.data.diffResumo ??
        `Uma nova versão (v${parsed.data.versao}) foi publicada e requer seu aceite.`,
      link: '/irmaos/configuracoes/termos-e-privacidade',
      priority: 'urgent',
      requiresAcknowledgement: true,
      dedupeKey: (userId) => `legal-${parsed.data.documento}-${parsed.data.versao}-${userId}`,
    });
  }

  revalidatePath('/admin/configuracoes/termos-e-privacidade');
  revalidatePath('/irmaos/configuracoes/termos-e-privacidade');
  redirect('/admin/configuracoes/termos-e-privacidade');
}
