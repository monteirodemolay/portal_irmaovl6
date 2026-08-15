import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 44, fontSize: 9, fontFamily: 'Helvetica' },
  tenant: {
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: { fontSize: 15, textAlign: 'center', marginBottom: 2 },
  subtitle: { fontSize: 8, color: '#666666', textAlign: 'center', marginBottom: 14 },
  headerRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #333333',
    paddingBottom: 4,
    marginBottom: 2,
  },
  row: { flexDirection: 'row', borderBottom: '0.5pt solid #dddddd', paddingVertical: 4 },
  headerCell: { paddingHorizontal: 4, fontFamily: 'Helvetica-Bold' },
  cell: { paddingHorizontal: 4 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 7,
    color: '#999999',
    textAlign: 'center',
  },
});

export interface MemberReportPdfDocumentProps {
  tenantNome: string;
  filtrosResumo: string;
  geradoEm: string;
  totalShown: number;
  columns: { key: string; label: string }[];
  rows: { id: string; values: string[] }[];
}

/**
 * Substitui o PDF de texto corrido do `pdfkit` — tabela de verdade, com o
 * cabeçalho das colunas repetido em toda página (`fixed`) e numeração de
 * página no rodapé. `@react-pdf/renderer` monta o PDF via layout próprio
 * (sem Chromium/Puppeteer) — mesma cautela do incidente `pdfjs-dist` no
 * Vercel: nada de binário nativo aqui.
 */
export function MemberReportPdfDocument({
  tenantNome,
  filtrosResumo,
  geradoEm,
  totalShown,
  columns,
  rows,
}: MemberReportPdfDocumentProps) {
  const columnWidth = `${100 / columns.length}%`;

  return (
    <Document title="Relatório de Irmãos">
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <Text style={styles.tenant}>{tenantNome}</Text>
        <Text style={styles.title}>Relatório de Irmãos</Text>
        <Text style={styles.subtitle}>
          {filtrosResumo} · Gerado em {geradoEm} · {totalShown} registro(s)
        </Text>

        <View style={styles.headerRow} fixed>
          {columns.map((column) => (
            <Text key={column.key} style={[styles.headerCell, { width: columnWidth }]}>
              {column.label}
            </Text>
          ))}
        </View>

        {rows.map((row) => (
          <View key={row.id} style={styles.row} wrap={false}>
            {row.values.map((value, index) => (
              <Text key={index} style={[styles.cell, { width: columnWidth }]}>
                {value}
              </Text>
            ))}
          </View>
        ))}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
