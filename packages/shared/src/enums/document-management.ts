export const FILE_KINDS = ['pdf', 'word', 'excel', 'powerpoint', 'imagem', 'video'] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const FILE_KIND_LABELS: Record<FileKind, string> = {
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
  powerpoint: 'PowerPoint',
  imagem: 'Imagem',
  video: 'Vídeo',
};
