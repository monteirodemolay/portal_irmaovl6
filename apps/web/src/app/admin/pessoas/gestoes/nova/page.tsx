import { requirePagePermission } from '@/lib/auth/require-permission';
import { BoardTermForm } from '@/modules/governance/components/board-term-form';

export default async function NewBoardTermPage() {
  await requirePagePermission('boardTerm:manage');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Nova Gestão</h1>
      <BoardTermForm />
    </div>
  );
}
