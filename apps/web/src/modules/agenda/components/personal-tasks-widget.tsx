'use client';

import { useActionState, useEffect, useRef, useTransition } from 'react';
import type { PersonalTask } from '@vl6/domain';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  ListChecks,
  Trash2,
} from '@vl6/ui';
import {
  createPersonalTaskAction,
  deletePersonalTaskAction,
  togglePersonalTaskAction,
  type PersonalTaskActionState,
} from '../actions/personal-task-actions';

const EMPTY_STATE: PersonalTaskActionState = { error: null };

export interface PersonalTasksWidgetProps {
  tasks: PersonalTask[];
}

export function PersonalTasksWidget({ tasks }: PersonalTasksWidgetProps) {
  const [state, formAction, isCreating] = useActionState<PersonalTaskActionState, FormData>(
    createPersonalTaskAction,
    EMPTY_STATE,
  );
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error === null) formRef.current?.reset();
  }, [state]);

  const pendingCount = tasks.filter((task) => !task.concluida).length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks size={18} strokeWidth={1.75} />
          Minhas tarefas
        </CardTitle>
        {tasks.length > 0 && (
          <span className="text-muted text-xs">
            {pendingCount} pendente{pendingCount === 1 ? '' : 's'}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form ref={formRef} action={formAction} className="flex gap-2">
          <Input
            name="titulo"
            placeholder="Nova tarefa..."
            maxLength={200}
            required
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={isCreating}>
            +
          </Button>
        </form>
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}

        {tasks.length === 0 ? (
          <p className="text-muted text-sm">Nenhuma tarefa por aqui ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {tasks.map((task) => (
              <li key={task.id} className="group flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0"
                  checked={task.concluida}
                  onChange={() => startTransition(() => togglePersonalTaskAction(task.id))}
                  aria-label={task.concluida ? 'Marcar como pendente' : 'Marcar como concluída'}
                />
                <span
                  className={
                    task.concluida ? 'text-muted flex-1 text-sm line-through' : 'flex-1 text-sm'
                  }
                >
                  {task.titulo}
                </span>
                <button
                  type="button"
                  onClick={() => startTransition(() => deletePersonalTaskAction(task.id))}
                  className="text-muted opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                  aria-label="Excluir tarefa"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
