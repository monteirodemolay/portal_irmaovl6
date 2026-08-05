import { createServerContainer } from '@vl6/infra';
import { Card, CardContent, CardTitle, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';

export default async function UsefulLinksPage() {
  const session = await requirePagePermission('link:read');

  const container = createServerContainer();
  const links = await container.useCases.listActiveLinks.execute(session.authContext);

  const byCategory = new Map<string, typeof links>();
  for (const link of links) {
    const bucket = byCategory.get(link.categoria) ?? [];
    bucket.push(link);
    byCategory.set(link.categoria, bucket);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Links Úteis</h1>

      {links.length === 0 ? (
        <EmptyState title="Nenhum link cadastrado ainda" />
      ) : (
        [...byCategory.entries()].map(([categoria, categoryLinks]) => (
          <div key={categoria} className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold">{categoria}</h2>
            <div className="grid grid-cols-2 gap-3">
              {categoryLinks.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer">
                  <Card className="hover:border-accent transition-colors">
                    <CardContent className="p-4">
                      <CardTitle className="text-base">{link.titulo}</CardTitle>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
