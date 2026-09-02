import { requirePagePermission } from '@/lib/auth/require-permission';
import { SessionClassificationMigrationRunner } from '@/modules/agenda/components/session-classification-migration-runner';

/**
 * Backfill retroativo da classificação estruturada das Sessões — Tipo/
 * Natureza/Grau dos trabalhos/Acesso, no lugar do título livre e do `grau`
 * conflado (pedido do Administrador). Ação deliberada, disparada
 * manualmente — nunca roda sozinha num deploy. Nunca apaga nem sobrescreve
 * o título/histórico original.
 */
export default async function ClassificacaoMigracaoPage() {
  await requirePagePermission('event:manage');

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold">
          Backfill — Classificação das Sessões
        </h1>
        <p className="text-muted text-sm">
          Analisa cada Sessão já cadastrada e preenche Tipo (Ordinária/Extraordinária/Magna),
          Natureza, Grau dos trabalhos e Acesso a partir do título e do grau antigo — nunca apaga
          nem altera o título original, só preenche os campos novos. Quando o texto não dá segurança
          suficiente pra decidir, o registro fica marcado para revisão manual em vez de receber um
          palpite. Pode ser executado mais de uma vez — só cobre quem ainda não foi classificado.
        </p>
      </div>
      <SessionClassificationMigrationRunner />
    </div>
  );
}
