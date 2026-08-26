'use client';

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

function AnniversaryRow({ entry }: { entry: UpcomingAnniversaryEntry }) {
  return (
    <li className="flex items-center gap-3">
      <MemberAvatar fotoUrl={entry.fotoUrl} nome={entry.nomeCompleto} className="h-10 w-10" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{entry.nomeCompleto}</p>
        <p className="text-muted text-xs">{anniversaryHeadline(entry)}</p>
      </div>
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
                      <AnniversaryRow key={`${entry.memberId}-${entry.kind}`} entry={entry} />
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
          <AnniversaryRow key={`${entry.memberId}-${entry.kind}`} entry={entry} />
        ))}
      </ul>
    </Card>
  );
}
