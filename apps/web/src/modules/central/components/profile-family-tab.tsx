import Link from 'next/link';
import type { PublicFamiliaLegadoItemDTO, PublicMemberProfileDTO } from '@vl6/domain';
import { FAMILY_DISPLAY_GROUPS, FAMILY_DISPLAY_GROUP_LABELS } from '@vl6/shared';
import { ArrowUpRight, Badge, EmptyState, Heart } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { daysUntilNextOccurrence, Panel } from './profile-shared';

/**
 * Selo curto "Maçom"/"Não é Maçom" — pedido do Administrador pra deixar
 * explícita a condição maçônica de cada familiar na lista, sem precisar
 * inferir a partir de o nome ser clicável ou não.
 */
function MacomBadge({ isMacom }: { isMacom: boolean }) {
  return (
    <Badge
      variant={isMacom ? 'accent' : 'outline'}
      className="shrink-0 rounded-full px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide"
    >
      {isMacom ? 'Maçom' : 'Não é Maçom'}
    </Badge>
  );
}

/**
 * Ordena do aniversário mais próximo de acontecer ao mais longe (pedido do
 * Administrador) — quem não tem `dataNascimento` conhecida (sempre o caso
 * de `kind === 'member'`, nunca exposta aqui por privacidade — mesmo
 * tratamento de `Member.dataNascimento` no resto do perfil público) fica no
 * fim da lista, na ordem em que já vinha.
 */
function sortByNextBirthday(items: PublicFamiliaLegadoItemDTO[]): PublicFamiliaLegadoItemDTO[] {
  return [...items].sort((a, b) => {
    if (!a.dataNascimento && !b.dataNascimento) return 0;
    if (!a.dataNascimento) return 1;
    if (!b.dataNascimento) return -1;
    return daysUntilNextOccurrence(a.dataNascimento) - daysUntilNextOccurrence(b.dataNascimento);
  });
}

/**
 * Aba "Família e Legado" do Perfil único (Fase 2) — antes vivia dentro da
 * coluna principal de `PublicMemberProfileView`, misturada com Apresentação
 * e Memória Fotográfica. Mesmo conteúdo, só isolado numa aba própria (mock-up
 * "Trajetória e Honrarias" prevê exatamente essa separação).
 */
export function ProfileFamilyTab({
  profile,
  canViewAcervo,
}: {
  profile: PublicMemberProfileDTO;
  canViewAcervo: boolean;
}) {
  // Só entra na grade de 2 colunas quando há pelo menos 2 grupos
  // preenchidos — com 1 só, `sm:grid-cols-2` deixava a célula vazia ao
  // lado como espaço morto dentro do próprio card.
  const populatedFamilyGroups = FAMILY_DISPLAY_GROUPS.filter(
    (group) => profile.familia?.[group]?.length,
  );

  if (!profile.familia || populatedFamilyGroups.length === 0) {
    return (
      <EmptyState
        icon={<Heart size={22} />}
        title="Nenhum vínculo familiar registrado"
        description="Família e Legado ainda não tem vínculos visíveis para este Irmão."
      />
    );
  }

  return (
    <Panel kicker="VÍNCULOS" title="Família e Legado">
      <div
        className={
          populatedFamilyGroups.length > 1
            ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
            : 'grid grid-cols-1 gap-3'
        }
      >
        {populatedFamilyGroups.map((group) => (
          <div
            key={group}
            className="border-border bg-background flex flex-col gap-2.5 rounded-xl border p-4"
          >
            <p className="text-muted text-[10px] font-bold uppercase tracking-wide">
              {FAMILY_DISPLAY_GROUP_LABELS[group]}
            </p>
            <ul className="flex flex-col gap-2.5">
              {sortByNextBirthday(profile.familia?.[group] ?? []).map((item) =>
                item.kind === 'member' ? (
                  <li key={item.key}>
                    <Link
                      href={`/irmaos/${item.id}`}
                      className="hover:bg-surface -m-1 flex items-center gap-2.5 rounded-lg p-1 text-sm transition-colors"
                    >
                      <MemberAvatar
                        fotoUrl={item.fotoUrl}
                        nome={item.nomeCompleto}
                        className="h-8 w-8 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="block truncate font-medium hover:underline">
                            {item.nomeCompleto}
                          </span>
                          <MacomBadge isMacom />
                        </span>
                        <span className="text-muted block text-xs">{item.parentesco}</span>
                      </span>
                    </Link>
                  </li>
                ) : (
                  <li key={item.key} className="flex items-center gap-2.5 text-sm">
                    <MemberAvatar
                      fotoUrl={item.fotoUrl}
                      nome={item.nomeCompleto}
                      className="h-8 w-8 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="block truncate font-medium">{item.nomeCompleto}</span>
                        <MacomBadge isMacom={item.isMacom} />
                      </span>
                      <span className="text-muted block text-xs">{item.parentesco}</span>
                    </span>
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>
      {canViewAcervo && (
        <Link
          href={`/irmaos/${profile.memberId}#acervo`}
          className="text-accent mt-4 flex w-fit items-center gap-1 text-xs font-semibold hover:underline"
        >
          Explorar Constelação da Memória
          <ArrowUpRight size={13} strokeWidth={2} />
        </Link>
      )}
    </Panel>
  );
}
