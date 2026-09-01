import type { Member } from '@vl6/domain';
import { MEMBER_SITUATION_STATUS_LABELS } from '@vl6/shared';
import { MARITAL_STATUS_LABELS } from '@/lib/membership/marital-status-label';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';

function formatDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat('pt-BR').format(new Date(date)) : '—';
}

export interface MemberReportColumnDef {
  key: string;
  label: string;
  defaultSelected: boolean;
  getValue: (member: Member) => string;
}

/**
 * Fonte única de colunas do relatório de Irmãos — usada tanto pelo checkbox
 * picker (client, só `key`/`label`/`defaultSelected`) quanto pela Server
 * Action de prévia e pela rota de export (server, usam `getValue` também).
 * Nenhum campo aqui depende de outra entidade (cargo atual, papel de
 * acesso) — só o que já está direto no `Member`.
 */
export const MEMBER_REPORT_COLUMNS: MemberReportColumnDef[] = [
  { key: 'nome', label: 'Nome', defaultSelected: true, getValue: (m) => m.nomeCompleto },
  { key: 'cim', label: 'CIM', defaultSelected: true, getValue: (m) => m.cim ?? '—' },
  {
    key: 'grau',
    label: 'Grau',
    defaultSelected: true,
    getValue: (m) => MEMBER_DEGREE_LABELS[m.grau],
  },
  {
    key: 'situacao',
    label: 'Situação',
    defaultSelected: true,
    getValue: (m) => MEMBER_SITUATION_STATUS_LABELS[m.situacao],
  },
  { key: 'email', label: 'E-mail', defaultSelected: true, getValue: (m) => m.email ?? '—' },
  {
    key: 'telefone',
    label: 'Telefone',
    defaultSelected: false,
    getValue: (m) => m.telefone ?? '—',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    defaultSelected: false,
    getValue: (m) => m.whatsapp ?? '—',
  },
  {
    key: 'cidade',
    label: 'Cidade',
    defaultSelected: true,
    getValue: (m) => m.endereco?.cidade ?? '—',
  },
  {
    key: 'profissao',
    label: 'Profissão',
    defaultSelected: false,
    getValue: (m) => m.profissao ?? '—',
  },
  { key: 'empresa', label: 'Empresa', defaultSelected: false, getValue: (m) => m.empresa ?? '—' },
  {
    key: 'estadoCivil',
    label: 'Estado civil',
    defaultSelected: false,
    getValue: (m) => (m.estadoCivil ? MARITAL_STATUS_LABELS[m.estadoCivil] : '—'),
  },
  {
    key: 'dataNascimento',
    label: 'Data de nascimento',
    defaultSelected: false,
    getValue: (m) => formatDate(m.dataNascimento),
  },
  {
    key: 'dataIniciacao',
    label: 'Data de iniciação',
    defaultSelected: false,
    getValue: (m) => formatDate(m.dataIniciacao),
  },
  {
    key: 'dataElevacao',
    label: 'Data de elevação',
    defaultSelected: false,
    getValue: (m) => formatDate(m.dataElevacao),
  },
  {
    key: 'dataExaltacao',
    label: 'Data de exaltação',
    defaultSelected: false,
    getValue: (m) => formatDate(m.dataExaltacao),
  },
];

export const MEMBER_REPORT_DEFAULT_COLUMN_KEYS = MEMBER_REPORT_COLUMNS.filter(
  (c) => c.defaultSelected,
).map((c) => c.key);

/** Mesmo teto que a rota de export já usava — reaproveitado pela prévia também, pra prévia e download baterem exatamente. */
export const MEMBER_REPORT_MAX_ROWS = 1000;

export function resolveMemberReportColumns(keys: string[]): MemberReportColumnDef[] {
  const selected = MEMBER_REPORT_COLUMNS.filter((c) => keys.includes(c.key));
  return selected.length > 0 ? selected : MEMBER_REPORT_COLUMNS.filter((c) => c.defaultSelected);
}
