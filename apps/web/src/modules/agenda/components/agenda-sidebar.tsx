import type { GoogleCalendarConnection, PersonalNote, PersonalTask } from '@vl6/domain';
import { PersonalNotesWidget } from './personal-notes-widget';
import { PersonalTasksWidget } from './personal-tasks-widget';
import { QuickAccessQrCode } from './quick-access-qr-card';
import { StoreAgendaQuickCard } from './store-agenda-quick-card';
import { GoogleConnectionCard } from '@/modules/integrations/components/google-connection-card';

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted text-xs font-semibold uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}

export interface AgendaSidebarProps {
  personalTasks: PersonalTask[];
  personalNotes: PersonalNote[];
  googleConnection: GoogleCalendarConnection | null;
}

/** Coluna lateral de "Minha Agenda" — mesmos dados de sempre, só organizados em seções rotuladas. */
export function AgendaSidebar({
  personalTasks,
  personalNotes,
  googleConnection,
}: AgendaSidebarProps) {
  return (
    <div className="flex flex-col gap-6">
      <StoreAgendaQuickCard />

      <SidebarSection label="Tarefas">
        <PersonalTasksWidget tasks={personalTasks} />
      </SidebarSection>

      <SidebarSection label="Anotações">
        <PersonalNotesWidget notes={personalNotes} />
      </SidebarSection>

      <SidebarSection label="Integrações">
        <div className="flex flex-col gap-4">
          <GoogleConnectionCard connection={googleConnection} />
          <QuickAccessQrCode />
        </div>
      </SidebarSection>
    </div>
  );
}
