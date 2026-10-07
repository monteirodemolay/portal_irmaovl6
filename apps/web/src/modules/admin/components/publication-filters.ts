interface DatedEditorialItem {
  id: string;
  title: string;
  type: string;
  status: string;
  publishedAt: string | null;
  happenedAt: string | null;
  scheduledAt: string | null;
  createdAt?: string | null;
}
export function editorialDate(item: DatedEditorialItem): string | null {
  return (
    [item.publishedAt, item.happenedAt, item.scheduledAt, item.createdAt].find(
      (value): value is string =>
        Boolean(value) && Number.isFinite(Date.parse(value!)),
    ) ?? null
  );
}
export function filterEditorialItems<T extends DatedEditorialItem>(
  items: T[],
  filters: {
    query: string;
    type: string;
    status: string;
    year: string;
    order: string;
  },
): T[] {
  const yearOf = (value: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
    }).format(new Date(value));
  const timestamp = (item: T) => {
    const value = editorialDate(item);
    return value ? Date.parse(value) : null;
  };
  return items
    .filter((item) => {
      const value = editorialDate(item);
      return (
        item.title
          .toLocaleLowerCase("pt-BR")
          .includes(filters.query.trim().toLocaleLowerCase("pt-BR")) &&
        (filters.type === "Todos" || item.type === filters.type) &&
        (filters.status === "Todos" || item.status === filters.status) &&
        (filters.year === "Todos" ||
          Boolean(value && yearOf(value) === filters.year))
      );
    })
    .sort((a, b) => {
      const first = timestamp(a),
        second = timestamp(b);
      if (first === null && second !== null) return 1;
      if (second === null && first !== null) return -1;
      const difference = first !== null && second !== null ? second - first : 0;
      return (
        (filters.order === "oldest" ? -difference : difference) ||
        a.title.localeCompare(b.title, "pt-BR") ||
        a.id.localeCompare(b.id)
      );
    });
}
