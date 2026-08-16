import { createServerContainer } from '@vl6/infra';
import { ARCHIVE_CONTRIBUTION_STATUS_LABELS, ARCHIVE_CONTRIBUTION_TYPE_LABELS } from '@vl6/shared';
import { Badge } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { ArchiveContributionForm } from '@/modules/archive/components/archive-contribution-form';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export default async function ArchiveContributePage() {
  const session = await requireSession();
  const container = createServerContainer();
  const contributions = await container.useCases.listMyArchiveContributions.execute(
    session.authContext,
  );

  return (
    <div className="flex flex-col gap-8">
      <AcervoPageHeader title="Contribuir" backHref="/acervo" />

      <div>
        <p className="text-muted max-w-xl text-sm leading-6">
          Tem um documento, foto, vídeo ou memória sobre a história da Loja? Envie aqui — um
          Administrador vai analisar antes de qualquer coisa aparecer publicamente no Acervo.
        </p>
        <div className="mt-6">
          <ArchiveContributionForm />
        </div>
      </div>

      <section aria-labelledby="my-contributions-title">
        <h2 id="my-contributions-title" className="font-display text-lg font-semibold">
          Minhas contribuições
        </h2>
        {contributions.length === 0 ? (
          <p className="text-muted mt-2 text-sm">Você ainda não enviou nenhuma contribuição.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {contributions.map((contribution) => (
              <li
                key={contribution.id}
                className="border-border bg-surface rounded-[13px] border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-accent text-[10px] font-semibold uppercase tracking-wider">
                    {ARCHIVE_CONTRIBUTION_TYPE_LABELS[contribution.tipo]}
                  </span>
                  <Badge
                    variant={
                      contribution.moderacaoStatus === 'aprovada'
                        ? 'success'
                        : contribution.moderacaoStatus === 'rejeitada'
                          ? 'destructive'
                          : 'warning'
                    }
                  >
                    {ARCHIVE_CONTRIBUTION_STATUS_LABELS[contribution.moderacaoStatus]}
                  </Badge>
                </div>
                <h3 className="font-display mt-2 font-semibold">{contribution.titulo}</h3>
                <p className="text-muted mt-1 text-sm leading-5">{contribution.descricao}</p>
                {contribution.moderacaoStatus === 'rejeitada' && contribution.motivoRejeicao && (
                  <p className="mt-2 text-sm text-red-700">
                    <strong>Motivo:</strong> {contribution.motivoRejeicao}
                  </p>
                )}
                <p className="text-muted mt-2 text-xs">
                  Enviado em {formatDate(contribution.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
