export interface BookCatalogSuggestion {
  titulo?: string;
  autor?: string;
  sinopse?: string;
  codigoBarras?: string;
  isbn?: string;
}

export function normalizeBookCode(value: string): string {
  return value.toUpperCase().replace(/[^0-9X]/g, '');
}

export function isValidIsbn(value: string): boolean {
  const code = normalizeBookCode(value);
  if (code.length === 10) {
    const sum = [...code].reduce((total, char, index) => {
      const digit = char === 'X' && index === 9 ? 10 : Number(char);
      return total + digit * (10 - index);
    }, 0);
    return !Number.isNaN(sum) && sum % 11 === 0;
  }
  if (code.length === 13) {
    if (!code.startsWith('978') && !code.startsWith('979')) return false;
    const sum = [...code.slice(0, 12)].reduce(
      (total, char, index) => total + Number(char) * (index % 2 === 0 ? 1 : 3),
      0,
    );
    return (10 - (sum % 10)) % 10 === Number(code[12]);
  }
  return false;
}

export function isValidIssn(value: string): boolean {
  const code = normalizeBookCode(value);
  if (code.length !== 8) return false;
  const sum = [...code.slice(0, 7)].reduce(
    (total, char, index) => total + Number(char) * (8 - index),
    0,
  );
  const remainder = sum % 11;
  const check = remainder === 0 ? 0 : 11 - remainder;
  return code[7] === (check === 10 ? 'X' : String(check));
}

export function isValidGtin(value: string): boolean {
  const code = normalizeBookCode(value);
  if (![8, 12, 13, 14].includes(code.length) || !/^\d+$/.test(code)) return false;
  const body = code.slice(0, -1);
  const sum = [...body]
    .reverse()
    .reduce((total, char, index) => total + Number(char) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(code.at(-1));
}

export function extractBarcodeCandidate(text: string): string | undefined {
  const matches = text.match(/(?:\d[\s-]*){8,14}/g) ?? [];
  return matches.map(normalizeBookCode).find(isValidGtin);
}

function cleanOcrLine(line: string): string {
  return line
    .replace(/^[\s|()[\]{}.,:;_-]+|[\s|()[\]{}.,:;_-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeHeading(line: string): boolean {
  const letters = line.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) ?? [];
  if (letters.length < 2) return false;
  const uppercase = letters.filter((letter) => letter === letter.toUpperCase()).length;
  return uppercase / letters.length >= 0.82;
}

export function extractCoverSuggestion(text: string): Pick<BookCatalogSuggestion, 'titulo' | 'autor'> {
  const lines = text
    .split(/\r?\n/)
    .map(cleanOcrLine)
    .filter((line) => line.length >= 2 && line.length <= 80 && !/^\d+$/.test(line))
    .slice(0, 12);
  if (lines.length === 0) return {};

  const headings = lines.filter(looksLikeHeading);
  const firstLongHeading = headings.findIndex((line) => line.length > 28);
  const possibleAuthorLines = (firstLongHeading > 0 ? headings.slice(0, firstLongHeading) : headings)
    .filter((line) => line.split(' ').length <= 3 && line.length <= 28)
    .slice(0, 2);
  const autor = possibleAuthorLines.join(' ').trim() || undefined;

  const titleLines = headings
    .filter((line) => !possibleAuthorLines.includes(line))
    .filter((line) => line.length <= 28)
    .slice(-5);
  const titulo = titleLines.join(' ').replace(/\s+/g, ' ').trim() || undefined;
  return { titulo, autor };
}

export function extractSynopsisSuggestion(text: string): string | undefined {
  const paragraphs = text
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((paragraph) => {
      const normalized = paragraph.toLocaleLowerCase('pt-BR');
      if (/wall street journal|grupo editorial|promo livros|isbn|código de barras/.test(normalized))
        return false;
      if ((paragraph.match(/\d/g) ?? []).length > paragraph.length * 0.35) return false;
      return paragraph.length >= 70;
    });
  return paragraphs.length ? paragraphs.join('\n\n').slice(0, 4000) : undefined;
}
