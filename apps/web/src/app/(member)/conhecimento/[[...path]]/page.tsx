import { notFound } from 'next/navigation';
import { KnowledgeMember } from '@/modules/knowledge/components/knowledge-member';
import { getKnowledgeMemberData, getLibraryReferences } from '@/modules/knowledge/lib/server';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Conhecimento VL6' };
export default async function KnowledgePage({ params }: { params: Promise<{ path?: string[] }> }) {
  const path = (await params).path ?? [];
  if (
    path.length > 3 ||
    ![
      '',
      'formacoes',
      'rapido',
      'minha-jornada',
      'atividades',
      'progresso',
      'formacao',
      'aula',
      'resultado',
      'certificado',
    ].includes(path[0] ?? '')
  )
    notFound();
  const data = await getKnowledgeMemberData();
  if (['formacao', 'aula', 'resultado', 'certificado'].includes(path[0] ?? '')) {
    const c = data.courses.find((c) => c.id === path[1]);
    if (!c) notFound();
    if (
      ['aula', 'resultado'].includes(path[0]!) &&
      !c.content.modules.some((m) => m.lessons.some((l) => l.id === path[2]))
    )
      notFound();
  }
  const ids = data.courses.flatMap((c) => [
    ...c.content.libraryItemIds,
    ...c.content.modules.flatMap((m) => m.lessons.flatMap((l) => l.libraryItemIds)),
  ]);
  const books = await getLibraryReferences(ids);
  return <KnowledgeMember data={data} path={path} books={books} />;
}
