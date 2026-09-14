export const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/** Select de mês (1-12) pra campos de aniversário só dia/mês (sem ano conhecido). */
export function MonthSelect({
  id,
  name,
  value,
  onChange,
}: {
  id: string;
  name?: string;
  value: number;
  onChange: (mes: number) => void;
}) {
  return (
    <select
      id={id}
      name={name}
      className="border-border bg-surface h-10 w-full rounded-lg border px-3 text-sm"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {MONTH_LABELS.map((label, index) => (
        <option key={label} value={index + 1}>
          {label}
        </option>
      ))}
    </select>
  );
}
