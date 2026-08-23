import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

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
  title: { fontSize: 16, textAlign: 'center', marginBottom: 2 },
  subtitle: { fontSize: 8, color: '#666666', textAlign: 'center' },
  meta: { fontSize: 8, color: '#666666', textAlign: 'center', marginBottom: 14 },
  description: { fontSize: 9, marginBottom: 14, lineHeight: 1.4 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photoBlock: { marginBottom: 14 },
  photo: { width: '100%', maxHeight: 320, objectFit: 'contain' },
  photoCaption: { fontSize: 8, color: '#444444', marginTop: 3, textAlign: 'center' },
  entryRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #dddddd',
    paddingVertical: 5,
  },
  entryKind: { width: '14%', fontFamily: 'Helvetica-Bold' },
  entryBody: { width: '86%' },
  entryTitle: { fontSize: 9 },
  entryMeta: { fontSize: 7.5, color: '#777777', marginTop: 1 },
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

export interface EventAlbumPdfPhotoEntry {
  id: string;
  kind: 'foto-embutida';
  caption: string | null;
  autor: string | null;
  /** Data URI (`data:image/jpeg;base64,...`) já resolvida no servidor — este componente nunca busca binário. */
  dataUri: string;
}

export interface EventAlbumPdfTextEntry {
  id: string;
  kind: 'foto-reservada' | 'video' | 'audio' | 'documento';
  kindLabel: string;
  titulo: string;
  caption: string | null;
  autor: string | null;
  tamanho: string | null;
  pessoas: string[];
}

export type EventAlbumPdfEntry = EventAlbumPdfPhotoEntry | EventAlbumPdfTextEntry;

export interface EventAlbumPdfDocumentProps {
  tenantNome: string;
  eventoTitulo: string;
  eventoDescricao: string | null;
  local: string;
  dataFormatada: string;
  boardTermNome: string | null;
  geradoEm: string;
  entries: EventAlbumPdfEntry[];
}

function TextEntryRow({ entry }: { entry: EventAlbumPdfTextEntry }) {
  const metaParts = [
    entry.autor ? `Autor: ${entry.autor}` : null,
    entry.tamanho,
    entry.pessoas.length > 0 ? `Identificados: ${entry.pessoas.join(', ')}` : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <View style={styles.entryRow} wrap={false}>
      <Text style={styles.entryKind}>{entry.kindLabel}</Text>
      <View style={styles.entryBody}>
        <Text style={styles.entryTitle}>{entry.caption ?? entry.titulo}</Text>
        {metaParts.length > 0 && <Text style={styles.entryMeta}>{metaParts.join(' · ')}</Text>}
      </View>
    </View>
  );
}

/**
 * Catálogo em PDF do álbum público de um evento (Fase D, docs/architecture/
 * 11-acervo-vl6.md) — pensado para impressão/arquivo físico da Loja.
 * Fotografias com `allowDownload: true` entram como imagem embutida
 * (`dataUri` já resolvido pela rota, nunca buscado aqui); vídeos, áudios,
 * documentos e fotografias reservadas (`allowDownload: false`) entram só
 * como entrada de texto com legenda — nunca embutindo o binário de mídia
 * que a Loja marcou como não baixável, mesma regra de segurança do botão
 * de download individual do álbum.
 */
export function EventAlbumPdfDocument({
  tenantNome,
  eventoTitulo,
  eventoDescricao,
  local,
  dataFormatada,
  boardTermNome,
  geradoEm,
  entries,
}: EventAlbumPdfDocumentProps) {
  const photoEntries = entries.filter(
    (entry): entry is EventAlbumPdfPhotoEntry => entry.kind === 'foto-embutida',
  );
  const textEntries = entries.filter(
    (entry): entry is EventAlbumPdfTextEntry => entry.kind !== 'foto-embutida',
  );

  return (
    <Document title={`Acervo VL6 — ${eventoTitulo}`}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.tenant}>{tenantNome} · Acervo VL6</Text>
        <Text style={styles.title}>{eventoTitulo}</Text>
        <Text style={styles.subtitle}>
          {dataFormatada} · {local}
          {boardTermNome ? ` · ${boardTermNome}` : ''}
        </Text>
        <Text style={styles.meta}>
          Catálogo gerado em {geradoEm} · {entries.length} registro(s)
        </Text>

        {eventoDescricao && <Text style={styles.description}>{eventoDescricao}</Text>}

        {photoEntries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Fotografias</Text>
            {photoEntries.map((entry) => (
              <View key={entry.id} style={styles.photoBlock} wrap={false}>
                <Image src={entry.dataUri} style={styles.photo} />
                {(entry.caption || entry.autor) && (
                  <Text style={styles.photoCaption}>
                    {[entry.caption, entry.autor ? `Foto: ${entry.autor}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}

        {textEntries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Demais registros</Text>
            {textEntries.map((entry) => (
              <TextEntryRow key={entry.id} entry={entry} />
            ))}
          </>
        )}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
