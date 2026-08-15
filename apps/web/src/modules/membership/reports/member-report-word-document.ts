import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

export interface MemberReportWordDocumentInput {
  tenantNome: string;
  filtrosResumo: string;
  geradoEm: string;
  totalShown: number;
  columns: { key: string; label: string }[];
  rows: { id: string; values: string[] }[];
}

/** Espelha `MemberReportPdfDocument` (mesmo cabeçalho + tabela), via `docx` — biblioteca JS pura, sem binário nativo. */
export async function buildMemberReportWordBuffer({
  tenantNome,
  filtrosResumo,
  geradoEm,
  totalShown,
  columns,
  rows,
}: MemberReportWordDocumentInput): Promise<Buffer> {
  const columnWidth = { size: 100 / columns.length, type: WidthType.PERCENTAGE };

  const headerRow = new TableRow({
    tableHeader: true,
    children: columns.map(
      (column) =>
        new TableCell({
          width: columnWidth,
          children: [
            new Paragraph({ children: [new TextRun({ text: column.label, bold: true })] }),
          ],
        }),
    ),
  });

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.values.map(
          (value) => new TableCell({ width: columnWidth, children: [new Paragraph(value)] }),
        ),
      }),
  );

  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({ text: tenantNome.toUpperCase(), size: 16, color: '888888' })],
          }),
          new Paragraph({
            text: 'Relatório de Irmãos',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `${filtrosResumo} · Gerado em ${geradoEm} · ${totalShown} registro(s)`,
                size: 18,
                color: '666666',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
}
