'use client';

import Link from 'next/link';
import type { UpcomingAnniversaryEntry } from '@vl6/domain';
import {
  Card,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Gift,
} from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { anniversaryHeadline } from '../lib/anniversary-labels';
import { DashboardSectionHeading } from './dashboard-section-heading';

/**
 * `memberId` é sempre o Irmão dono do registro (mesmo em aniversário de
 * cônjuge/filho, ver `ListUpcomingAnniversariesUseCase`), então toda linha
 * pode apontar pro perfil dele em `/irmaos/[memberId]` — mesma permissão
 * `memberDirectory:read` que já gate essa rota (`clickable`, herdado de
 * `showDirectoryLink` do painel).
 */
function AnniversaryRow({
  entry,
  clickable,
}: {
  entry: UpcomingAnniversaryEntry;
  clickable: boolean;
}) {
  const content = (
    <>
      <MemberAvatar fotoUrl={entry.fotoUrl} nome={entry.nomeCompleto} className="h-10 w-10" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{entry.nomeCompleto}</p>
        <p className="text-muted text-xs">{anniversaryHeadline(entry)}</p>
      </div>
    </>
  );

  if (!clickable) {
    return <li className="flex items-center gap-3">{content}</li>;
  }

  return (
    <li>
      <Link
        href={`/irmaos/${entry.memberId}`}
        className="hover:bg-background -m-1 flex items-center gap-3 rounded-md p-1 transition-colors"
      >
        {content}
      </Link>
    </li>
  );
}

/**
 * Painel "Esta semana na Loja" — dado cadastral (iniciação/elevação/
 * exaltação/nascimento), não da Central VL6, por isso aparece pra qualquer
 * Irmão autenticado, mesmo quem nunca publicou nada no diretório.
 *
 * "Ver diretório completo" abre um drawer lateral com a lista inteira da
 * semana (mesmos itens já sorteados do mais próximo pro mais distante por
 * `ListUpcomingAnniversariesUseCase`) num visual maior, em vez de navegar
 * pra fora do painel.
 */
export function AnniversariesPanel({
  entries,
  showDirectoryLink,
}: {
  entries: UpcomingAnniversaryEntry[];
  showDirectoryLink: boolean;
}) {
  if (entries.length === 0) return null;

  return (
    <Card className="border-accent/40 flex flex-col gap-4 p-5 shadow-none">
      <DashboardSectionHeading
        icon={Gift}
        title="Esta semana na Loja"
        action={
          showDirectoryLink ? (
            <Drawer>
              <DrawerTrigger className="text-accent shrink-0 text-xs font-medium hover:underline">
                Ver diretório completo
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Esta semana na Loja</DrawerTitle>
                  <p className="text-muted text-sm">
                    Datas e aniversários dos próximos 7 dias, do mais próximo pro mais distante.
                  </p>
                </DrawerHeader>
                <DrawerBody>
                  <ul className="flex flex-col gap-4">
                    {entries.map((entry) => (
                      <AnniversaryRow
                        key={`${entry.memberId}-${entry.kind}`}
                        entry={entry}
                        clickable={showDirectoryLink}
                      />
                    ))}
                  </ul>
                </DrawerBody>
              </DrawerContent>
            </Drawer>
          ) : undefined
        }
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <AnniversaryRow
            key={`${entry.memberId}-${entry.kind}`}
            entry={entry}
            clickable={showDirectoryLink}
          />
        ))}
      </ul>
    </Card>
  );
}
