import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@vl6/ui';
import { hasPermission } from '@vl6/domain';
import type { PermissionKey } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

interface DashboardTileDef {
  label: string;
  permission: PermissionKey;
  href: string;
  load: (tenantId: string) => Promise<number>;
}

/**
 * Números reais (nunca inventados/placeholder) — cada tile só aparece se a
 * sessão tem a permissão granular correspondente, e só então a contagem é
 * carregada (evita leitura desnecessária do Firestore pra quem não veria o
 * número mesmo). Consultas usam `count()` agregado no servidor (ver
 * `countByTenant`/`countPublishedByTenant`/`countUpcomingByTenant` nos
 * repositórios), nunca listar tudo pra contar no app.
 */
function buildTileDefs(container: ReturnType<typeof createServerContainer>): DashboardTileDef[] {
  return [
    {
      label: 'Irmãos cadastrados',
      permission: 'member:read',
      href: '/admin/pessoas/irmaos',
      load: (tenantId) => container.repositories.member.countByTenant(tenantId),
    },
    {
      label: 'Avisos publicados',
      permission: 'announcement:read',
      href: '/admin/conteudo/avisos',
      load: (tenantId) => container.repositories.announcement.countPublishedByTenant(tenantId),
    },
    {
      label: 'Próximos eventos',
      permission: 'event:read',
      href: '/admin/conteudo/agenda',
      load: (tenantId) => container.repositories.event.countUpcomingByTenant(tenantId, new Date()),
    },
    {
      label: 'Documentos no Acervo',
      permission: 'file:read',
      href: '/admin/acervo/arquivos',
      load: (tenantId) => container.repositories.fileAsset.countByTenant(tenantId),
    },
    {
      label: 'Itens na Biblioteca',
      permission: 'libraryItem:read',
      href: '/admin/acervo/biblioteca',
      load: (tenantId) => container.repositories.libraryItem.countByTenant(tenantId),
    },
    {
      label: 'Álbuns de fotos',
      permission: 'gallery:read',
      href: '/admin/acervo/galeria',
      load: (tenantId) => container.repositories.galleryAlbum.countByTenant(tenantId),
    },
    {
      label: 'Itens no Acervo VL6',
      permission: 'archiveItem:read',
      href: '/admin/acervo/publicar',
      load: (tenantId) => container.repositories.archiveItem.countByTenant(tenantId),
    },
    {
      label: 'Fotos/vídeos/documentos no Acervo VL6',
      permission: 'archiveMedia:read',
      href: '/admin/acervo/metricas',
      load: (tenantId) => container.repositories.archiveMedia.countPublishedByTenant(tenantId),
    },
  ];
}

export default async function AdminDashboardPage() {
  const [session, current] = await Promise.all([requireSession(), getCurrentTenant()]);
  const container = createServerContainer();

  const visibleTiles = buildTileDefs(container).filter((tile) =>
    hasPermission(session.authContext, tile.permission),
  );
  const counts = await Promise.all(
    visibleTiles.map((tile) => tile.load(session.authContext.tenantId)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Painel</h1>
        <p className="text-muted">{current?.tenant.nome}</p>
      </div>

      {visibleTiles.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {visibleTiles.map((tile, index) => (
            <a
              key={tile.label}
              href={tile.href}
              className="border-border bg-surface hover:border-primary rounded-2xl border p-5 transition-colors"
            >
              <p className="text-muted text-sm">{tile.label}</p>
              <p className="font-display mt-1 text-3xl font-semibold">{counts[index]}</p>
            </a>
          ))}
        </div>
      )}

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Sessão atual</CardTitle>
          <CardDescription>{session.user.email}</CardDescription>
        </CardHeader>
        <CardContent className="text-muted text-sm">
          Use o menu à esquerda para gerenciar Pessoas & Loja, Conteúdo, Acervo VL6 e Configurações.
        </CardContent>
      </Card>
    </div>
  );
}
