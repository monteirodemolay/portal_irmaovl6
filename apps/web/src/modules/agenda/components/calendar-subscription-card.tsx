import { headers } from 'next/headers';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { getOrCreateCalendarFeedToken } from '@/lib/agenda/calendar-feed-token';
import { rotateCalendarFeedTokenAction } from '../actions/calendar-feed-actions';

function resolveOrigin(host: string): string {
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  return `${isLocal ? 'http' : 'https'}://${host}`;
}

/**
 * Assinatura contínua da Agenda Central. O token é um segredo individual:
 * quem possuir a URL consegue ler o feed, por isso ele nunca é exposto em
 * listagens públicas e pode ser revogado/rotacionado pelo próprio Irmão.
 */
export async function CalendarSubscriptionCard() {
  const session = await requireSession();
  const headerList = await headers();
  const host = headerList.get('host') ?? '';
  if (!host) return null;

  const token = await getOrCreateCalendarFeedToken(
    session.authContext.tenantId,
    session.authContext.uid,
  );
  const httpsUrl = `${resolveOrigin(host)}/api/agenda/feed/${token}`;
  const webcalUrl = httpsUrl.replace(/^https?:/, 'webcal:');

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Apple, Outlook e outros calendários</CardTitle>
        <p className="text-muted text-xs">
          Assine uma vez e receba automaticamente as atualizações da Agenda VL6 e dos seus
          compromissos pessoais.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button asChild variant="accent" size="sm" className="w-full justify-start">
          <a href={webcalUrl}>Assinar calendário</a>
        </Button>
        <Button asChild variant="outline" size="sm" className="w-full justify-start">
          <a href={httpsUrl} target="_blank" rel="noopener noreferrer">
            Abrir feed .ics
          </a>
        </Button>
        <form action={rotateCalendarFeedTokenAction}>
          <Button type="submit" variant="ghost" size="sm" className="w-full text-xs">
            Revogar link atual e gerar outro
          </Button>
        </form>
        <p className="text-muted text-[11px]">
          O endereço é pessoal. Se ele for compartilhado por engano, use a opção acima para
          invalidá-lo imediatamente.
        </p>
      </CardContent>
    </Card>
  );
}
